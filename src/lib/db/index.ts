/**
 * Database initialization and connection module.
 *
 * Sets up a SQLite database using better-sqlite3 with Drizzle ORM.
 * The database file is stored at `data/poker.db` relative to the project root.
 *
 * On first connection, all tables are created via `CREATE TABLE IF NOT EXISTS`
 * and default poker sites are seeded. This approach avoids the need for a
 * separate migration step — the app is self-initializing.
 *
 * Pragmas:
 * - WAL mode: enables concurrent readers with a single writer (better performance)
 * - Foreign keys: enforces referential integrity
 *
 * @module db
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

/** Directory containing the SQLite database file */
const DB_DIR = path.join(process.cwd(), "data");

/** Full path to the SQLite database file */
const DB_PATH = path.join(DB_DIR, "poker.db");

// Ensure the data directory exists before opening the DB
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

/** Raw better-sqlite3 connection — used for prepared statements and raw SQL */
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

/** Drizzle ORM instance with typed schema — used for type-safe queries */
export const db = drizzle(sqlite, { schema });
export { sqlite };

/**
 * Initialize database tables and seed default data.
 *
 * All DDL uses `IF NOT EXISTS` so this is safe to run on every app start.
 * Default poker sites are inserted with `INSERT OR IGNORE` for idempotency.
 */
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    logo_url TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    name TEXT NOT NULL,
    game_type TEXT NOT NULL DEFAULT '',
    format TEXT NOT NULL DEFAULT 'MTT',
    speed TEXT DEFAULT '',
    structure TEXT DEFAULT '',
    tournament_type TEXT DEFAULT '',
    buy_in REAL NOT NULL DEFAULT 0,
    rake REAL DEFAULT 0,
    bounty REAL DEFAULT 0,
    guarantee REAL DEFAULT 0,
    max_entries INTEGER,
    start_time TEXT NOT NULL,
    end_time TEXT,
    status TEXT DEFAULT 'scheduled',
    total_entries INTEGER,
    prize_pool REAL,
    currency TEXT DEFAULT 'USD',
    is_series INTEGER DEFAULT 0,
    series_name TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_tournaments_start ON tournaments(start_time);
  CREATE INDEX IF NOT EXISTS idx_tournaments_site ON tournaments(site_id);
  CREATE INDEX IF NOT EXISTS idx_tournaments_buyin ON tournaments(buy_in);
  CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);

  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    entries INTEGER DEFAULT 1,
    total_invested REAL NOT NULL,
    finish_position INTEGER,
    total_entries_at_finish INTEGER,
    payout REAL DEFAULT 0,
    bounties_won REAL DEFAULT 0,
    net_result REAL,
    session_id TEXT,
    notes TEXT,
    played_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS filter_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    filters TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    tournament_id TEXT,
    series_pattern TEXT,
    color TEXT,
    notify_before INTEGER DEFAULT 15,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT,
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS imports (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    source_type TEXT,
    records_total INTEGER,
    records_new INTEGER,
    records_updated INTEGER,
    records_skipped INTEGER,
    column_mapping TEXT,
    imported_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Auth tables for NextAuth.js
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    email_verified TEXT,
    password_hash TEXT,
    image TEXT,
    display_currency TEXT DEFAULT 'USD',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    session_token TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TEXT NOT NULL
  );

  -- Bankroll management tables
  CREATE TABLE IF NOT EXISTS bankroll_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    site_id TEXT REFERENCES sites(id),
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    current_balance REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bankroll_transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES bankroll_accounts(id) ON DELETE CASCADE,
    user_id TEXT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_after REAL NOT NULL,
    related_result_id TEXT,
    description TEXT,
    transacted_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Seed default poker sites (idempotent via INSERT OR IGNORE)
  INSERT OR IGNORE INTO sites (id, name, currency) VALUES ('wptglobal', 'WPT Global', 'USD');
  INSERT OR IGNORE INTO sites (id, name, currency) VALUES ('pokerstars', 'PokerStars', 'USD');
  INSERT OR IGNORE INTO sites (id, name, currency) VALUES ('ggpoker', 'GGPoker', 'USD');
  INSERT OR IGNORE INTO sites (id, name, currency) VALUES ('888poker', '888 Poker', 'USD');
  INSERT OR IGNORE INTO sites (id, name, currency) VALUES ('winamax', 'Winamax', 'EUR');
  INSERT OR IGNORE INTO sites (id, name, currency) VALUES ('acr', 'ACR', 'USD');
`);

/**
 * Add user_id columns to existing tables for multi-user support.
 * Uses try-catch because ALTER TABLE ADD COLUMN fails if column already exists.
 */
const alterStatements = [
  "ALTER TABLE favorites ADD COLUMN user_id TEXT",
  "ALTER TABLE filter_profiles ADD COLUMN user_id TEXT",
  "ALTER TABLE results ADD COLUMN user_id TEXT",
  "ALTER TABLE sessions ADD COLUMN user_id TEXT",
  "ALTER TABLE favorites ADD COLUMN priority INTEGER DEFAULT 0",
  "ALTER TABLE favorites ADD COLUMN notes TEXT",
  "ALTER TABLE favorites ADD COLUMN category TEXT",
];

for (const stmt of alterStatements) {
  try {
    sqlite.exec(stmt);
  } catch {
    // Column already exists — ignore
  }
}
