/**
 * Database schema definitions using Drizzle ORM.
 *
 * Defines all SQLite tables for the poker tournament manager.
 * Each table uses TEXT primary keys (UUIDs) and TEXT for timestamps
 * (ISO 8601 strings) since SQLite has no native date type.
 *
 * @module db/schema
 */

import { sqliteTable, text, real, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Poker sites/rooms table.
 *
 * Stores the list of supported poker sites. Seeded with default
 * sites on first DB initialization (WPT Global, PokerStars, GGPoker, etc.)
 */
export const sites = sqliteTable("sites", {
  /** Unique site slug, e.g. "wptglobal", "ggpoker" */
  id: text("id").primaryKey(),
  /** Display name, e.g. "WPT Global" */
  name: text("name").notNull(),
  /** Default currency for this site */
  currency: text("currency").default("USD"),
  /** URL to the site's logo image */
  logoUrl: text("logo_url"),
  /** Whether this site is active and should appear in filters */
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

/**
 * Tournaments table — the core schedule data.
 *
 * Each tournament has a stable ID generated from the site prefix + name + start_time.
 * This enables idempotent imports (ON CONFLICT UPDATE).
 * Indexed on start_time, site_id, buy_in, and status for fast filtering.
 */
export const tournaments = sqliteTable(
  "tournaments",
  {
    /** Stable composite ID: site_prefix + base64url(name + start_time) */
    id: text("id").primaryKey(),
    /** Foreign key to sites table */
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id),
    /** Tournament display name */
    name: text("name").notNull(),
    /** Game type: NLHE, PLO, PLO5, PLO6, HORSE, Short Deck */
    gameType: text("game_type").notNull().default(""),
    /** Tournament format: MTT, SNG, Satellite, Spin&Go */
    format: text("format").notNull().default("MTT"),
    /** Speed: hyper, turbo, regular, deep */
    speed: text("speed").default(""),
    /** Structure: freezeout, reentry, rebuy, pko, mystery_bounty */
    structure: text("structure").default(""),
    /** Tournament type label: Bounty, Satellite, Freeroll, Main Event, etc. */
    tournamentType: text("tournament_type").default(""),
    /** Total buy-in amount in site currency */
    buyIn: real("buy_in").notNull().default(0),
    /** Rake portion of the buy-in */
    rake: real("rake").default(0),
    /** Bounty amount for PKO tournaments */
    bounty: real("bounty").default(0),
    /** Guaranteed prize pool */
    guarantee: real("guarantee").default(0),
    /** Maximum number of entries allowed (null = unlimited) */
    maxEntries: integer("max_entries"),
    /** Tournament start time in ISO 8601 format */
    startTime: text("start_time").notNull(),
    /** Tournament end time (populated when completed) */
    endTime: text("end_time"),
    /** Current status: scheduled, registering, late_reg, running, completed, cancelled */
    status: text("status").default("scheduled"),
    /** Total number of entries/players */
    totalEntries: integer("total_entries"),
    /** Actual prize pool (may differ from guarantee) */
    prizePool: real("prize_pool"),
    /** Currency code for this tournament's buy-in and prize pool */
    currency: text("currency").default("USD"),
    /** Whether this tournament is part of a named series */
    isSeries: integer("is_series", { mode: "boolean" }).default(false),
    /** Series name (e.g., "WCOOP", "WSOP Online") if part of a series */
    seriesName: text("series_name"),
    /** Flexible JSON field for site-specific metadata */
    metadata: text("metadata"),
    /** Record creation timestamp */
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    /** Last update timestamp (refreshed on each import) */
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_tournaments_start").on(table.startTime),
    index("idx_tournaments_site").on(table.siteId),
    index("idx_tournaments_buyin").on(table.buyIn),
    index("idx_tournaments_status").on(table.status),
  ]
);

/**
 * Results table — user's played tournament results.
 *
 * Tracks each tournament the user played, including entries (re-entries),
 * finish position, payouts, and bounties. Linked to a tournament record
 * and optionally grouped into a session.
 */
export const results = sqliteTable("results", {
  id: text("id").primaryKey(),
  /** Foreign key to the tournament that was played */
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournaments.id),
  /** Number of entries (re-entries count) */
  entries: integer("entries").default(1),
  /** Total amount invested: buy_in * entries */
  totalInvested: real("total_invested").notNull(),
  /** Final finish position (1 = winner) */
  finishPosition: integer("finish_position"),
  /** Total field size when the user finished */
  totalEntriesAtFinish: integer("total_entries_at_finish"),
  /** Total payout received */
  payout: real("payout").default(0),
  /** Total bounties won (for PKO tournaments) */
  bountiesWon: real("bounties_won").default(0),
  /** Net result: payout + bounties - total_invested */
  netResult: real("net_result"),
  /** Optional session grouping ID */
  sessionId: text("session_id"),
  /** Free-text notes (key hands, observations) */
  notes: text("notes"),
  /** When the tournament was played (ISO 8601) */
  playedAt: text("played_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Filter profiles table — saved filter combinations.
 *
 * Users can save named filter configurations (e.g., "Sunday Grind",
 * "Low-stakes PKOs") and quickly activate them.
 */
export const filterProfiles = sqliteTable("filter_profiles", {
  id: text("id").primaryKey(),
  /** Display name for this filter profile */
  name: text("name").notNull(),
  /** Serialized FilterState as JSON string */
  filters: text("filters").notNull(),
  /** Whether this profile loads by default on app start */
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  /** Display order for profile list */
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Favorites table — user's favorited/starred tournaments.
 *
 * Tracks which tournaments the user has starred, with optional
 * color coding and notification preferences.
 */
export const favorites = sqliteTable("favorites", {
  id: text("id").primaryKey(),
  /** Foreign key to the favorited tournament */
  tournamentId: text("tournament_id").references(() => tournaments.id),
  /** Pattern to match recurring tournament series by name */
  seriesPattern: text("series_pattern"),
  /** Color code for visual categorization */
  color: text("color"),
  /** Minutes before start to send notification (default 15) */
  notifyBefore: integer("notify_before").default(15),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Sessions table — groups of tournaments played together.
 *
 * Allows grouping multiple tournament results into a single
 * session (e.g., "Sunday Feb 16 Grind") for organized review.
 */
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  /** Optional session name */
  name: text("name"),
  /** Date of the session (YYYY-MM-DD) */
  date: text("date").notNull(),
  /** Free-text session notes */
  notes: text("notes"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Imports table — audit log of data imports.
 *
 * Every import operation (WPT, GGPoker, CSV) is logged here
 * with counts of new, updated, and skipped records for review.
 */
export const imports = sqliteTable("imports", {
  id: text("id").primaryKey(),
  /** Original filename or import identifier */
  filename: text("filename").notNull(),
  /** Source type: 'json', 'csv' */
  sourceType: text("source_type"),
  /** Total records in the imported file */
  recordsTotal: integer("records_total"),
  /** Number of new records inserted */
  recordsNew: integer("records_new"),
  /** Number of existing records updated */
  recordsUpdated: integer("records_updated"),
  /** Number of records skipped (invalid/incomplete) */
  recordsSkipped: integer("records_skipped"),
  /** Saved column mapping configuration (JSON) */
  columnMapping: text("column_mapping"),
  importedAt: text("imported_at").default(sql`CURRENT_TIMESTAMP`),
});
