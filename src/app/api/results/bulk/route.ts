/**
 * Bulk result import API route.
 *
 * Accepts an array of result objects and inserts them in a transaction.
 * Supports both JSON body and CSV (parsed client-side into JSON).
 * Each result must include a tournamentId and totalInvested.
 *
 * @endpoint POST /api/results/bulk → { imported: number, errors: string[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

interface BulkResultItem {
  tournamentId: string;
  entries?: number;
  totalInvested: number;
  finishPosition?: number | null;
  totalEntriesAtFinish?: number | null;
  payout?: number;
  bountiesWon?: number;
  notes?: string;
  sessionId?: string | null;
  playedAt?: string | null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  try {
    const { results } = await req.json() as { results: BulkResultItem[] };

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: "results array is required and must not be empty" },
        { status: 400 }
      );
    }

    const insert = sqlite.prepare(
      `INSERT INTO results (id, tournament_id, entries, total_invested, finish_position,
       total_entries_at_finish, payout, bounties_won, net_result, session_id, notes,
       played_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    let imported = 0;
    const errors: string[] = [];

    const transaction = sqlite.transaction(() => {
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r.tournamentId || r.totalInvested === undefined) {
          errors.push(`Row ${i + 1}: missing tournamentId or totalInvested`);
          continue;
        }

        const payout = r.payout ?? 0;
        const bountiesWon = r.bountiesWon ?? 0;
        const netResult = payout + bountiesWon - r.totalInvested;

        try {
          insert.run(
            randomUUID(),
            r.tournamentId,
            r.entries ?? 1,
            r.totalInvested,
            r.finishPosition ?? null,
            r.totalEntriesAtFinish ?? null,
            payout,
            bountiesWon,
            netResult,
            r.sessionId ?? null,
            r.notes ?? null,
            r.playedAt ?? new Date().toISOString(),
            userId ?? null
          );
          imported++;
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "insert failed"}`);
        }
      }
    });

    transaction();

    return NextResponse.json({ imported, errors });
  } catch (err) {
    console.error("Bulk import error:", err);
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
  }
}
