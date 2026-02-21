/**
 * Seed script: imports the latest GGPoker scraper JSON into the database.
 * Usage: node scripts/seed-ggpoker.mjs [path-to-json]
 */
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import Database from "better-sqlite3";
import { randomBytes } from "crypto";

const DB_PATH = resolve("data/poker.db");
const DEFAULT_JSON = resolve("../Scrapers/output");

function randomId() {
  return randomBytes(12).toString("base64url");
}

function detectSpeed(name) {
  const lower = name.toLowerCase();
  if (lower.includes("hyper")) return "hyper";
  if (lower.includes("turbo")) return "turbo";
  if (lower.includes("deepstack") || lower.includes("deep stack") || lower.includes("ultra deep")) return "deep";
  return "regular";
}

function detectStructure(name) {
  const lower = name.toLowerCase();
  if (lower.includes("mystery bounty")) return "mystery_bounty";
  if (lower.includes("pko") || lower.includes("bounty")) return "pko";
  if (lower.includes("rebuy")) return "rebuy";
  if (lower.includes("reentry") || lower.includes("re-entry")) return "reentry";
  return "freezeout";
}

function detectFormat(name, type) {
  if (type === "Satellite") return "Satellite";
  const lower = name.toLowerCase();
  if (lower.includes("spin") || lower.includes("blast")) return "Spin&Go";
  if (lower.includes("sng") || lower.includes("sit & go") || lower.includes("sit and go")) return "SNG";
  if (lower.includes("flip & go") || lower.includes("flipngo")) return "SNG";
  return "MTT";
}

function normalizeGameType(gt, name) {
  if (gt) return gt.toUpperCase();
  const lower = name.toLowerCase();
  if (lower.includes("plo5") || lower.includes("plo 5")) return "PLO5";
  if (lower.includes("plo6") || lower.includes("plo 6")) return "PLO6";
  if (lower.includes("plo") || lower.includes("omaha") || lower.includes("omaholic")) return "PLO";
  if (lower.includes("horse")) return "HORSE";
  if (lower.includes("short deck")) return "Short Deck";
  return "NLHE";
}

// Find JSON file
let jsonPath = process.argv[2];
if (!jsonPath) {
  // Auto-find latest ggpoker_*.json in ../Scrapers/output
  const { readdirSync } = await import("fs");
  try {
    const files = readdirSync(DEFAULT_JSON)
      .filter((f) => f.startsWith("ggpoker_") && f.endsWith(".json"))
      .sort()
      .reverse();
    if (files.length > 0) {
      jsonPath = join(DEFAULT_JSON, files[0]);
    }
  } catch {}
}

if (!jsonPath || !existsSync(jsonPath)) {
  console.error("No GGPoker JSON file found. Run the GGPoker scraper first or pass path as argument.");
  process.exit(1);
}

console.log(`Loading: ${jsonPath}`);
const raw = JSON.parse(readFileSync(jsonPath, "utf8"));
const { tournaments, scraped_at } = raw;
console.log(`Found ${tournaments.length} tournaments scraped at ${scraped_at}`);

// Open DB
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Ensure tables exist
db.exec(`
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
  CREATE TABLE IF NOT EXISTS results (id TEXT PRIMARY KEY, tournament_id TEXT NOT NULL, entries INTEGER DEFAULT 1, total_invested REAL NOT NULL, finish_position INTEGER, total_entries_at_finish INTEGER, payout REAL DEFAULT 0, bounties_won REAL DEFAULT 0, net_result REAL, session_id TEXT, notes TEXT, played_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS filter_profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, filters TEXT NOT NULL, is_default INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS favorites (id TEXT PRIMARY KEY, tournament_id TEXT, series_pattern TEXT, color TEXT, notify_before INTEGER DEFAULT 15, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, name TEXT, date TEXT NOT NULL, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS imports (id TEXT PRIMARY KEY, filename TEXT NOT NULL, source_type TEXT, records_total INTEGER, records_new INTEGER, records_updated INTEGER, records_skipped INTEGER, column_mapping TEXT, imported_at TEXT DEFAULT CURRENT_TIMESTAMP);

  INSERT OR IGNORE INTO sites (id, name, currency) VALUES ('ggpoker', 'GGPoker', 'USD');
`);

const insert = db.prepare(`
  INSERT INTO tournaments (
    id, site_id, name, game_type, format, speed, structure, tournament_type,
    buy_in, rake, bounty, guarantee, start_time, status, currency, updated_at
  ) VALUES (?, 'ggpoker', ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 'scheduled', ?, CURRENT_TIMESTAMP)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    game_type = excluded.game_type,
    speed = excluded.speed,
    structure = excluded.structure,
    tournament_type = excluded.tournament_type,
    buy_in = excluded.buy_in,
    guarantee = excluded.guarantee,
    start_time = excluded.start_time,
    currency = excluded.currency,
    updated_at = CURRENT_TIMESTAMP
`);

const existsStmt = db.prepare("SELECT id FROM tournaments WHERE id = ?");

let newCount = 0, updated = 0, skipped = 0;

const importAll = db.transaction((items) => {
  for (const t of items) {
    if (!t.name) { skipped++; continue; }

    // GGPoker start_time may be null — use empty string for stable ID and DB
    const idSource = t.name + (t.start_time || "");
    const stableId = `ggpoker_${Buffer.from(idSource).toString("base64url").slice(0, 32)}`;
    const existing = existsStmt.get(stableId);

    const gameType = normalizeGameType(t.game_type, t.name);
    const format = detectFormat(t.name, t.tournament_type);
    const speed = detectSpeed(t.name);
    const structure = detectStructure(t.name);

    insert.run(
      stableId, t.name, gameType, format, speed, structure,
      t.tournament_type || "", t.buy_in, t.guaranteed, t.start_time || "", t.currency || "USD"
    );

    if (existing) updated++; else newCount++;
  }
});

importAll(tournaments);

// Log import
const importId = randomId();
db.prepare(`
  INSERT INTO imports (id, filename, source_type, records_total, records_new, records_updated, records_skipped)
  VALUES (?, ?, 'json', ?, ?, ?, ?)
`).run(importId, `ggpoker_scraper_${scraped_at}`, tournaments.length, newCount, updated, skipped);

console.log(`\nImport complete:`);
console.log(`  New:     ${newCount}`);
console.log(`  Updated: ${updated}`);
console.log(`  Skipped: ${skipped}`);
console.log(`  Total:   ${tournaments.length}`);

db.close();
