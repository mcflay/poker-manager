/**
 * GGPoker tournament import API route.
 *
 * Accepts JSON output from the GGPoker memory scraper and upserts
 * tournament records into the database. Similar to WPT import but
 * handles GGPoker-specific quirks:
 * - start_time may be null (some tournaments lack schedule info)
 * - "Flip & Go" format mapped to SNG
 * - "omaholic" game type mapped to PLO
 *
 * @endpoint POST /api/import/ggpoker
 * @body {ScraperOutput} - JSON with `scraped_at`, `site`, and `tournaments` array
 * @returns {{ success: boolean, summary: ImportSummary }}
 */

import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { randomUUID } from "crypto";
import {
  detectSpeed,
  detectStructure,
  detectFormat,
  normalizeGameType,
  generateStableId,
} from "@/lib/tournament-utils";

/** Shape of a single tournament from the GGPoker scraper output */
interface ScraperTournament {
  name: string;
  start_time: string | null;
  buy_in: number;
  guaranteed: number;
  game_type: string;
  tournament_type: string;
  currency: string;
}

/** Shape of the full GGPoker scraper JSON output */
interface ScraperOutput {
  scraped_at: string;
  site: string;
  tournament_count: number;
  tournaments: ScraperTournament[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScraperOutput;
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

    /** Check if a tournament already exists (for counting new vs updated) */
    const existsStmt = sqlite.prepare("SELECT id FROM tournaments WHERE id = ?");

    /** Wrap all inserts in a transaction for atomicity and performance */
    const importMany = sqlite.transaction((items: ScraperTournament[]) => {
      for (const t of items) {
        if (!t.name) {
          skipped++;
          continue;
        }

        // GGPoker start_time may be null — generate ID from name only if needed
        const stableId = generateStableId("ggpoker", t.name, t.start_time || "");
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
          t.start_time || "",
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
      .run(importId, `ggpoker_scraper_${scraped_at}`, tournaments.length, newCount, updatedCount, skipped);

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
    console.error("GGPoker import error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
