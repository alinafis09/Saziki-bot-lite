// =============================================================
//  main.js — Core Entry Point
//  WhatsApp Group Management Bot
//  Auth: Pairing Code (no QR, no terminal input)
//  Runtime: Node.js 20 ESM
// =============================================================

// ── Load global config FIRST (sets global.pairingNumber, etc.) ──
import './config.js';

// ── Standard-library & third-party imports ────────────────────
import path, { join } from 'path';
import { fileURLToPath } from 'url';
import {
  readdirSync,
  existsSync,
  readFileSync,
  mkdirSync,
  unlinkSync,
  statSync,
  watch,
} from 'fs';
import fs from 'fs/promises';
import { tmpdir } from 'os';
import os from 'os';

import chalk from 'chalk';
import Pino from 'pino';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import NodeCache from 'node-cache';
import lodash from 'lodash';

// ── ESM __dirname shim (not available natively in ESM) ────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// =============================================================
//  DATABASE SETUP
// =============================================================

const dbAdapter = new JSONFile(global.databaseFile);
global.db        = new Low(dbAdapter, {});   // second arg = default data

/** Reads (or initialises) the JSON database safely. */
async function loadDatabase() {
  await global.db.read();

  // Merge-in any missing top-level keys with safe defaults
  global.db.data = {
    users:     {},
    chats:     {},
    stats:     {},
    msgs:      {},
    sticker:   {},
    settings:  {},
    ...global.db.data,   // real data wins over defaults
  };

  await global.db.write();
  console.log(chalk.greenBright('[DB] Database loaded successfully.'));
}

// =============================================================
//  PLUGIN LOADER
// =============================================================

const pluginDir = join(__dirname, 'plugins');

// Make sure the plugins folder exists so the bot doesn't crash
// on a first run with an empty file-system.
if (!existsSync(pluginDir)) mkdirSync(pluginDir, { recursive: true });

global.plugins = {};

/** Import every .js file inside ./plugins and register it. */
async function loadPlugins() {
  const files = readdirSync(pluginDir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const filePath = join(pluginDir, file);
    try {
      const mod = await import(filePath);
      global.plugins[file] = mod.default ?? mod;
      console.log(chalk.blueBright(`[PLUGIN] Loaded → ${file}`));
    } catch (err) {
      console.error(chalk.redBright(`[PLUGIN] Failed to load '${file}':`), err.message);
    }
  }

  console.log(chalk.greenBright(`[PLUGIN] ${Object.keys(global.plugins).length} plugin(s) ready.`));
}

/**
 * Hot-reload a single plugin file whenever it changes on disk.
 * watch() is called after the initial load so edits during runtime
 * are picked up without a full restart.
 */
async function reloadPlugin(filename) {
  if (!filename.endsWith('.js')) return;

  const filePath = join(pluginDir, filename);

  if (!existsSync(filePath)) {
    console.log(chalk.yellow(`[PLUGIN] Removed → ${filename}`));
    delete global.plugins[filename];
    return;
  }

  try {
    // Cache-bust with a timestamp query so Node re-evaluates the module
    const mod = await import(`${filePath}?t=${Date.now()}`);
    global.plugins[filename] = mod.default ?? mod;
    console.log(chalk.cyanBright(`[PLUGIN] Reloaded → ${filename}`));
  } catch (err) {
    console.error(chalk.redBright(`[PLUGIN] Reload error '${filename}':`), err.message);
  }
}

// =============================================================
//  UTILITY — CLEAN UP SESSIONS & TMP
// =============================================================

/**
 * Delete every file in `dir` except `keepFile`.
 * Used to prune stale Baileys pre-key files while preserving creds.json.
 */
async function clearSessions(dir = global.sessionDir, keepFile = 'creds.json') {
  try {
    const files = await fs.readdir(dir);
    await Promise.all(
      files
        .filter((f) => f !== keepFile)
        .map((f) => fs.unlink(join(dir, f)).catch(() => {}))
    );
    console.log(chalk.cyanBright('[CLEAN] Session files pruned.'));
  } catch (err) {
    console.error('[CLEAN] clearSessions error:', err.message);
  }
}

/** Delete tmp files older than 5 minutes. */
function clearTmp() {
  const dirs    = [tmpdir(), join(__dirname, 'tmp')];
  const maxAge  = 5 * 60 * 1000; // 5 min in ms
  const now     = Date.now();

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      const full = join(dir, file);
      try {
        const st = statSync(full);
        if (st.isFile() && now - st.mtimeMs >= maxAge) unlinkSync(full);
      } catch { /* ignore locked / already-gone files */ }
    }
  }
  console.log(chalk.cyanBright('[CLEAN] Tmp folder cleaned.'));
}

// =============================================================
//  MAIN ASYNC START FUNCTION
//  Wrapping everything in start() avoids top-level await pitfalls
//  that can cause confusing crashes on some Node/Pterodactyl setups.
// =============================================================

async function start() {
  // ── 1. Database ─────────────────────────────────────────────
  await loadDatabase();

  // ── 2. Baileys (dynamic import avoids ESM/CJS edge-cases) ───
  const baileys = await import('@whiskeysockets/baileys');

  // Baileys may export as default or as named exports depending on
  // the installed version — handle both patterns safely.
  const {
    default: baileysDefault,
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    proto,
    jidNormalizedUser,
    Browsers,
  } = baileys.default ?? baileys;

  // ── 3. Sessions folder ──────────────────────────────────────
  if (!existsSync(global.sessionDir)) {
    mkdirSync(global.sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(
    path.resolve(global.sessionDir)
  );

  // ── 4. Recommended Baileys version ──────────────────────────
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(
    chalk.magentaBright(`[BAILEYS] Using WA v${version.join('.')} | Latest: ${isLatest}`)
  );

  // ── 5. Retry cache ──────────────────────────────────────────
  const msgRetryCounterCache = new NodeCache({ stdTTL: 0, useClones: false });

  // ── 6. Quiet logger (Pterodactyl logs can get noisy) ────────
  const logger = Pino({ level: 'silent' });

  // ── 7. Create the WA socket ─────────────────────────────────
  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.ubuntu('Chrome'),   // looks like a regular browser to WA
    printQRInTerminal: false,             // we use pairing code, not QR
    syncFullHistory: false,               // faster start-up
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    keepAliveIntervalMs: 15_000,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 0,
    getMessage: async (key) => {
      // Provide message retry support (required by Baileys)
      return proto.Message.fromObject({});
    },
    msgRetryCounterCache,
  });

  // Expose the socket globally so plugins can use it
  global.conn = sock;

  // ── 8. Pairing Code Request ──────────────────────────────────
  //  Only request a code when the device is NOT already registered.
  //  We read pairingNumber from config.js — no readline, no terminal.
  if (!sock.authState.creds.registered) {
    const rawNumber = String(global.pairingNumber).replace(/\D/g, '');

    if (!rawNumber || !/^\d{7,15}$/.test(rawNumber)) {
      console.error(
        chalk.bgRed(
          '[PAIRING] ❌ Invalid pairingNumber in config.js. ' +
          'Set it to your full international number (digits only). e.g. 212612345678'
        )
      );
      process.exit(1);
    }

    // Baileys needs a short delay before the pairing code can be requested
    await new Promise((r) => setTimeout(r, 3_000));

    try {
      let code = await sock.requestPairingCode(rawNumber);

      // Format as XXXX-XXXX for readability
      code = code?.match(/.{1,4}/g)?.join('-') ?? code;

      console.log(
        chalk.bgBlack(chalk.greenBright(
          `\n╔══════════════════════════════╗\n` +
          `║  🔑  PAIRING CODE            ║\n` +
          `║                              ║\n` +
          `║     ${code.padEnd(24)}  ║\n` +
          `║                              ║\n` +
          `║  Enter this code in:         ║\n` +
          `║  WhatsApp → Linked Devices   ║\n` +
          `╚══════════════════════════════╝\n`
        ))
      );
    } catch (err) {
      console.error(chalk.bgRed(`[PAIRING] ❌ Failed to get pairing code: ${err.message}`));
      process.exit(1);
    }
  }

  // ── 9. Plugin loading & hot-reload watcher ──────────────────
  await loadPlugins();
  watch(pluginDir, (_, filename) => {
    if (filename) reloadPlugin(filename).catch(console.error);
  });

  // ── 10. Persistent DB writes every 10 seconds ───────────────
  setInterval(async () => {
    if (global.db?.data) await global.db.write().catch(console.error);
  }, 10_000);

  // ── 11. Scheduled maintenance tasks ─────────────────────────
  const TWO_HOURS = 2 * 60 * 60 * 1000;

  setInterval(async () => {
    if (!global.conn?.user) return;   // skip if not connected

    if (global.settings.clearSesi) {
      await clearSessions();
    }

    if (global.settings.clearTmp) {
      clearTmp();
    }
  }, TWO_HOURS);

  // ── 12. Connection event handler ────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, isNewLogin } = update;

    if (connection === 'open') {
      console.log(chalk.bgGreen(chalk.black(' ✅ Bot connected to WhatsApp! ')));

      if (global.settings.notifyOnConnect) {
        const ownerJid = `${global.ownerNumber}@s.whatsapp.net`;
        const msg =
          `🤖 *${global.namebot}* is now online!\n\n` +
          `▸ Platform : ${os.platform()} ${os.release()}\n` +
          `▸ Host     : ${os.hostname()}\n` +
          `▸ Time     : ${new Date().toLocaleString()}`;

        sock.sendMessage(ownerJid, { text: msg }).catch(() => {});
      }
    }

    if (connection === 'close') {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut;

      console.log(
        chalk.yellow(
          `[CONN] Connection closed. Code: ${statusCode ?? 'unknown'}. ` +
          `Reconnecting: ${shouldReconnect}`
        )
      );

      if (shouldReconnect) {
        // Small backoff before restarting to avoid hammering the server
        console.log(chalk.yellow('[CONN] Restarting in 5 seconds…'));
        setTimeout(() => start().catch(console.error), 5_000);
      } else {
        console.log(
          chalk.bgRed(
            '[CONN] Logged out from WhatsApp. ' +
            'Delete the sessions folder and restart to re-pair.'
          )
        );
        process.exit(0);
      }
    }
  });

  // ── 13. Save credentials on every update ────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── 14. Message dispatcher ──────────────────────────────────
  //  Hands off every incoming message to any plugin that wants it.
  //  Each plugin exports a handler(sock, message) function.
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;   // ignore empty / status broadcast slots

      for (const [name, plugin] of Object.entries(global.plugins)) {
        try {
          if (typeof plugin?.handler === 'function') {
            await plugin.handler(sock, msg);
          }
        } catch (err) {
          console.error(chalk.redBright(`[DISPATCH] Error in plugin '${name}':`), err.message);
        }
      }
    }
  });

  // ── 15. Group-participant event dispatcher ──────────────────
  sock.ev.on('group-participants.update', async (update) => {
    for (const [name, plugin] of Object.entries(global.plugins)) {
      try {
        if (typeof plugin?.onGroupParticipantsUpdate === 'function') {
          await plugin.onGroupParticipantsUpdate(sock, update);
        }
      } catch (err) {
        console.error(
          chalk.redBright(`[DISPATCH] groupParticipants error in '${name}':`),
          err.message
        );
      }
    }
  });

  console.log(chalk.cyanBright('[MAIN] Event listeners registered. Bot is running.'));
}

// =============================================================
//  GLOBAL ERROR GUARDS
//  Prevents Pterodactyl from killing the process on unhandled
//  promise rejections or uncaught exceptions.
// =============================================================

process.on('uncaughtException', (err) => {
  console.error(chalk.bgRed('[CRASH] Uncaught Exception:'), err);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.bgRed('[CRASH] Unhandled Rejection:'), reason);
});

// ── Kick everything off ─────────────────────────────────────
start().catch((err) => {
  console.error(chalk.bgRed('[FATAL] start() threw an unrecoverable error:'), err);
  process.exit(1);
});
