// =============================================================
//  config.js — Global Bot Configuration
//  ✏️  Edit this file before the first run.
//  All globals set here are available in every file via `global.*`
// =============================================================

// ── Bot Identity ──────────────────────────────────────────────

global.info = {
  /**
   * Fancy ASCII title shown in the terminal at startup (via cfonts).
   * Keep it short — long strings wrap badly in small terminals.
   */
  figlet: 'MyBot',

  /** Your public / display name as bot creator */
  nameown: 'NOUREDDINE',

  /**
   * Owner WhatsApp number — DIGITS ONLY, full international format.
   * Morocco example: '212612345678'
   * This number:
   *   • Receives the "bot is online" notification
   *   • Is treated as bot owner (all owner-only commands)
   *   • Is used to request the pairing code (if not already paired)
   */
  nomerown: '212600000000',

  /** Human-readable bot name shown in .info / help menus */
  namebot: 'MyGroupBot',

  /** Short tagline shown in the dashboard table */
  description: 'WhatsApp group management bot built on Baileys.',

  /**
   * WhatsApp channel link shown in the connection notification message.
   * Replace with your own channel URL or leave as ''.
   */
  channel: 'https://whatsapp.com/channel/0029VaXXXXXXXXXXXXXXXX',
};

// ── Pairing & Session ─────────────────────────────────────────

/**
 * Number that will receive the pairing code at startup (when not yet paired).
 * Must match info.nomerown in almost all cases.
 */
global.pairingNumber = global.info.nomerown;

/** Folder where Baileys saves auth / session files */
global.sessionDir = './sessions';

/** Path to the JSON database file */
global.databaseFile = './database.json';

// ── Command Prefix ────────────────────────────────────────────

/**
 * Characters that trigger bot commands.
 * The actual RegExp is built in main.js from this string.
 * Default: !  .  /  #
 */
global.prefix = '!./#';

// ── API Registry (optional) ───────────────────────────────────

global.APIs = {
  // Example: 'myapi': 'https://api.example.com'
};

global.APIKeys = {
  // Example: 'https://api.example.com': 'YOUR_API_KEY'
};

// ── Feature Flags ─────────────────────────────────────────────

global.setting = {
  /**
   * Prune stale Baileys pre-key files every 2 hours.
   * Keeps only creds.json.  Recommended: true on Pterodactyl.
   */
  clearSesi: true,

  /**
   * Delete ./tmp files older than 5 minutes every 2 hours.
   */
  clearTmp: true,

  /**
   * Send a "bot is online" WhatsApp message to the owner on connect.
   */
  notifyOnConnect: true,
};

// ── Timezone ──────────────────────────────────────────────────
global.timezone = 'Africa/Casablanca';

// ── Convenience alias (some legacy plugins use global.namebot) ──
global.namebot = global.info.namebot;
