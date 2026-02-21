/**
 * WPT Global tournament import API route.
 *
 * Accepts JSON output from the WPT Global memory scraper and upserts
 * tournament records into the database. Uses ON CONFLICT to handle
 * repeated imports idempotently — existing tournaments are updated,
 * new ones are inserted, and records without a name/start_time are skipped.
 *
 * @endpoint POST /api/import/wpt
 * @body {WptScraperOutput} - JSON with `scraped_at` timestamp and `tournaments` array
 * @returns {{ success: boolean, summary: ImportSummary }}
 */

import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { randomUUID } from "crypto";
import { WptScraperOutput, WptTournament } from "@/lib/types";
import {
  detectSpeed,
  detectStructure,
  detectFormat,
  normalizeGameType,
  generateStableId,
} from "@/lib/tournament-utils";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WptScraperOutput;
    const { tournaments, scraped_at } = body;

    if (!Array.isArray(tournaments)) {
      return NextResponse.json(
        { error: "Invalid format: missing tournaments array" },
        { status: 400 }
      );
    }

    const importId = randomUUID();
    let newCount = 0;
    let updatedCount = 0;
    let skipped = 0;

    /** Prepared statement for upsert — INSERT or UPDATE on conflict */
    const insertOrUpdate = sqlite.prepare(`
      INSERT INTO tournaments (
        id, site_id, name, game_type, format, speed, structure, tournament_type,
        buy_in, rake, bounty, guarantee, start_time, status, currency, updated_at
      ) VALUES (?, 'wptglobal', ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 'scheduled', ?, CURRENT_TIMESTAMP)
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

    /** Check if a tournament already exists (for counting new vs updated) */
    const existsStmt = sqlite.prepare("SELECT id FROM tournaments WHERE id = ?");

    /** Wrap all inserts in a transaction for atomicity and performance */
    const importMany = sqlite.transaction((items: WptTournament[]) => {
      for (const t of items) {
        if (!t.start_time || !t.name) {
          skipped++;
          continue;
        }

        const stableId = generateStableId("wptglobal", t.name, t.start_time);
        const existing = existsStmt.get(stableId);

        const gameType = normalizeGameType(t.game_type, t.name);
        const format = detectFormat(t.name, t.tournament_type);
        const speed = detectSpeed(t.name);
        const structure = detectStructure(t.name);

        insertOrUpdate.run(
          stableId,
          t.name,
          gameType,
          format,
          speed,
          structure,
          t.tournament_type || "",
          t.buy_in,
          t.guaranteed,
          t.start_time,
          t.currency || "USD"
        );

        if (existing) updatedCount++;
        else newCount++;
      }
    });

    importMany(tournaments);

    /** Log the import for audit trail */
    sqlite
      .prepare(
        `INSERT INTO imports (id, filename, source_type, records_total, records_new, records_updated, records_skipped)
       VALUES (?, ?, 'json', ?, ?, ?, ?)`
      )
      .run(importId, `wpt_scraper_${scraped_at}`, tournaments.length, newCount, updatedCount, skipped);

    return NextResponse.json({
      success: true,
      summary: {
        total: tournaments.length,
        newCount,
        updated: updatedCount,
        skipped,
      },
    });
  } catch (err) {
    console.error("WPT import error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
