// =============================================================
//  index.js — Process Supervisor / Launcher
//
//  Responsibility:
//    • Display a startup dashboard (cfonts banner + system table)
//    • Spawn main.js as a child process with IPC
//    • Auto-restart on non-zero exit codes (crash recovery)
//    • Forward stdin lines as IPC messages to the child
//      (used by manual terminal commands, ignored on Pterodactyl
//       where there is no stdin — safe either way)
//
//  This file does NOT contain any WhatsApp / Baileys logic.
//  All WA logic lives in main.js.
// =============================================================

// ── Config must be imported first so global.info is available ──
import './config.js';

import { join, dirname }      from 'path';
import { fileURLToPath }      from 'url';
import { createInterface }    from 'readline';
import { promises as fsp }    from 'fs';
import fs                     from 'fs';
import { spawn }              from 'child_process';

import chalk                  from 'chalk';
import cfont                  from 'cfonts';
import axios                  from 'axios';
import os                     from 'os';
import moment                 from 'moment-timezone';
import yargs                  from 'yargs';
import express                from 'express';
import { sizeFormatter }      from 'human-readable';
import { fetchLatestBaileysVersion } from '@whiskeysockets/baileys';

// ── ESM __dirname shim ────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// =============================================================
//  HELPERS
// =============================================================

/** Human-readable byte formatter (JEDEC: KB, MB, GB…) */
const formatSize = sizeFormatter({
  std:                'JEDEC',
  decimalPlaces:      2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`,
});

/** Count files and sub-folders directly inside a directory. */
function getTotalFoldersAndFiles(folderPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(folderPath, (err, entries) => {
      if (err) return reject(err);

      let folders    = 0;
      let filesCount = 0;

      for (const entry of entries) {
        const stat = fs.statSync(join(folderPath, entry));
        if (stat.isDirectory()) folders++;
        else filesCount++;
      }

      resolve({ folders, files: filesCount });
    });
  });
}

// =============================================================
//  STARTUP BANNER
// =============================================================

cfont.say(global.info.figlet, {
  font:               'simpleBlock',
  align:              'center',
  gradient:           ['yellow', 'cyan', 'red'],
  transitionGradient: true,   // boolean, not a number
});

cfont.say('by ' + global.info.nameown, {
  font:   'tiny',
  align:  'center',
  colors: ['white'],
});

// =============================================================
//  EXPRESS KEEP-ALIVE SERVER
//  Pterodactyl / hosting panels sometimes require an open HTTP
//  port to mark the server as "running".  This tiny Express
//  server satisfies that requirement without interfering with
//  any bot logic.
// =============================================================

const app  = express();
const port = process.env.PORT || 7860;

app.get('/', (_req, res) => res.send(`${global.info.namebot} is running ✅`));

app.listen(port, () => {
  console.log(chalk.green(`⚡ Keep-alive server on port ${port}`));
});

// =============================================================
//  TMP FOLDER GUARD
//  Create ./tmp if it doesn't exist so plugins can write temp
//  files immediately without needing their own mkdir calls.
// =============================================================

const tmpFolder = join(__dirname, 'tmp');
if (!fs.existsSync(tmpFolder)) {
  fs.mkdirSync(tmpFolder, { recursive: true });
  console.log(chalk.green('[INDEX] ./tmp folder created.'));
}

// =============================================================
//  SYSTEM DASHBOARD TABLE
//  Shown once at startup.  Uses a try/catch around the IP fetch
//  so a network failure doesn't prevent the bot from starting.
// =============================================================

async function printDashboard() {
  const packageJsonPath = join(__dirname, 'package.json');
  const pluginsFolder   = join(__dirname, 'plugins');

  // Ensure plugins folder exists before counting
  if (!fs.existsSync(pluginsFolder)) {
    fs.mkdirSync(pluginsFolder, { recursive: true });
  }

  let pluginCount = 0;
  let baileyVer   = 'unknown';
  let publicIP    = 'unavailable';
  let pkgName     = global.info.namebot;
  let pkgVersion  = '1.0.0';
  let pkgDesc     = global.info.description;

  // ── Baileys version ──────────────────────────────────────
  try {
    const { version } = await fetchLatestBaileysVersion();
    baileyVer = version.join('.');
    console.log(
      chalk.bgGreen(chalk.white(`[INDEX] Baileys v${baileyVer} detected.`))
    );
  } catch {
    console.error(chalk.bgRed(chalk.white('[INDEX] Could not fetch Baileys version.')));
  }

  // ── Plugin count ─────────────────────────────────────────
  try {
    const counts = await getTotalFoldersAndFiles(pluginsFolder);
    pluginCount  = counts.files;
  } catch { /* folder empty or not yet created */ }

  // ── package.json ─────────────────────────────────────────
  try {
    const raw = await fsp.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(raw);
    pkgName    = pkg.name    ?? pkgName;
    pkgVersion = pkg.version ?? pkgVersion;
    pkgDesc    = pkg.description ?? pkgDesc;
  } catch (err) {
    console.error(chalk.red(`[INDEX] Cannot read package.json: ${err.message}`));
  }

  // ── Public IP ────────────────────────────────────────────
  try {
    const { data } = await axios.get('https://api.ipify.org', { timeout: 5000 });
    publicIP = data;
  } catch { /* no internet / blocked — non-fatal */ }

  // ── RAM ──────────────────────────────────────────────────
  const ramTotal = (os.totalmem()  / 1024 ** 3).toFixed(2);
  const ramFree  = (os.freemem()   / 1024 ** 3).toFixed(2);

  console.table({
    '⎔ Dashboard':  ' System ⎔',
    'Name Bot':     pkgName,
    'Version':      pkgVersion,
    'Description':  pkgDesc,
    'OS':           `${os.type()} ${os.release()}`,
    'Memory':       `${ramFree} / ${ramTotal} GB`,
    'IP':           publicIP,
    'Baileys':      `v${baileyVer}`,
    'Owner':        global.info.nomerown,
    'Features':     `${pluginCount} plugin(s)`,
    'Creator':      global.info.nameown,
  });
}

// =============================================================
//  CHILD PROCESS SUPERVISOR
// =============================================================

let isRunning = false;

/**
 * Spawn `main.js` (or any target file) as a supervised child.
 *
 * IPC channel is opened so main.js can send messages like
 *   process.send('reset')
 *   process.send('uptime')
 * and the supervisor reacts accordingly.
 *
 * On Pterodactyl (no terminal): stdin is simply ignored when
 * no human is typing — the rl.on('line') handler is harmless.
 */
async function start(file) {
  if (isRunning) return;
  isRunning = true;

  const targetPath = join(__dirname, file);
  const args       = [targetPath, ...process.argv.slice(2)];

  const child = spawn(process.argv[0], args, {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    // Pass current env so the child inherits NODE_PATH, etc.
    env: process.env,
  });

  // ── IPC messages from main.js ────────────────────────────
  child.on('message', (data) => {
    console.log(chalk.magenta('[IPC] Received:', data));

    switch (data) {
      case 'reset':
        // Gracefully kill the child; the 'exit' handler will restart it
        child.kill();
        break;

      case 'uptime':
        // Reply with the supervisor's own uptime
        child.send(process.uptime());
        break;

      default:
        // Unknown message — log and ignore
        break;
    }
  });

  // ── Child exit handler ───────────────────────────────────
  child.on('exit', (code, signal) => {
    isRunning = false;
    console.error(
      chalk.yellow(`[INDEX] main.js exited — code: ${code ?? 'null'}, signal: ${signal ?? 'none'}`)
    );

    if (code === 0) {
      // Clean exit (intentional shutdown): wait for a file-change
      // before restarting.  On Pterodactyl this path is rarely hit.
      console.log(chalk.cyan('[INDEX] Clean exit detected. Waiting for file change to restart…'));
      fs.watchFile(targetPath, { interval: 1000 }, () => {
        fs.unwatchFile(targetPath);
        start(file);
      });
    } else {
      // Crash / non-zero exit → restart after a brief backoff
      const delay = 3_000;
      console.log(chalk.red(`[INDEX] Crash detected. Restarting in ${delay / 1000}s…`));
      setTimeout(() => start(file), delay);
    }
  });

  // ── Error handler (e.g. ENOENT if node not found) ────────
  child.on('error', (err) => {
    isRunning = false;
    console.error(chalk.bgRed(`[INDEX] Failed to spawn child: ${err.message}`));
    setTimeout(() => start(file), 5_000);
  });

  // ── Forward stdin → child via IPC ────────────────────────
  // Safe to set up even on Pterodactyl: if there's no terminal,
  // readline simply never emits 'line' events.
  const opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());

  if (!opts['test']) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    // Prevent multiple listeners accumulating on restart
    if (rl.listenerCount('line') === 0) {
      rl.on('line', (line) => {
        child.send(line.trim());
      });
    }
  }
}

// =============================================================
//  GLOBAL ERROR GUARDS
//  Prevent the supervisor itself from crashing silently.
// =============================================================

process.on('uncaughtException', (err) => {
  console.error(chalk.bgRed('[INDEX] Uncaught exception in supervisor:'), err);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.bgRed('[INDEX] Unhandled rejection in supervisor:'), reason);
});

// =============================================================
//  BOOT SEQUENCE
// =============================================================

// Print the dashboard first, then launch the bot.
// Both are async so we chain them properly.
await printDashboard();
await start('main.js');
