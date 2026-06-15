// =============================================================
//  config.js — Global Bot Configuration
//  All globals set here are available throughout the entire app.
//  Edit this file before the first run.
// =============================================================

// ── Owner / Identity ─────────────────────────────────────────

/**
 * Your WhatsApp number in international format (digits only).
 * This is the number that will receive the pairing code AND
 * that will be recognised as the bot owner.
 * Example: '212612345678'  (Morocco +212)
 */
global.pairingNumber = '212600000000';

/**
 * The same number used as the owner JID source.
 * The JID is built automatically in main.js — just set the
 * digits here and leave the '@s.whatsapp.net' part to the code.
 */
global.ownerNumber = global.pairingNumber;

// ── Bot Personality ──────────────────────────────────────────

/** Display name shown in connection logs and notification messages. */
global.namebot = 'MyGroupBot';

/** Bot description / tagline (used in .info or help commands). */
global.desc = 'A WhatsApp group management bot built on Baileys.';

// ── Command Prefix ────────────────────────────────────────────

/**
 * Character(s) that trigger commands.
 * Stored as a RegExp-ready string; the actual RegExp is built in main.js.
 * Default  →  ! . / #
 */
global.prefix = '!./#';

// ── API Keys (add your own as needed) ────────────────────────

global.APIs = {
  // 'myapi': 'https://api.example.com'
};

global.APIKeys = {
  // 'https://api.example.com': 'YOUR_KEY_HERE'
};

// ── Feature Flags ─────────────────────────────────────────────

global.settings = {
  /**
   * Auto-clear old session files every 2 hours.
   * Keeps only creds.json, removes stale pre-keys, etc.
   * Recommended: true on Pterodactyl to avoid disk bloat.
   */
  clearSesi: true,

  /**
   * Auto-clean the ./tmp folder every 2 hours.
   * Files older than 5 minutes are deleted.
   */
  clearTmp: true,

  /**
   * Send an online notification to the owner when the bot connects.
   */
  notifyOnConnect: true,
};

// ── Timezone (used for scheduled tasks / timestamps) ──────────
global.timezone = 'Africa/Casablanca'; // Change to your server TZ

// ── Session Folder ────────────────────────────────────────────
global.sessionDir = './sessions';

// ── Database File ─────────────────────────────────────────────
global.databaseFile = './database.json';
