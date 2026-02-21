/**
 * Results API route — list and create tournament results.
 *
 * GET returns results with joined tournament data, supporting filtering
 * by date range, site, and session. Scoped to the authenticated user.
 * POST creates a new result record with computed net_result.
 *
 * @endpoint GET /api/results → { results: ResultWithTournament[] }
 * @endpoint POST /api/results → { result: Result }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const siteId = searchParams.get("siteId");
  const sessionId = searchParams.get("sessionId");

  let query = `
    SELECT
      r.*,
      t.name as tournament_name,
      t.site_id,
      t.game_type,
      t.buy_in as tournament_buy_in,
      t.guarantee as tournament_guarantee,
      t.start_time as tournament_start_time,
      t.currency as tournament_currency,
      s.name as site_name
    FROM results r
    LEFT JOIN tournaments t ON r.tournament_id = t.id
    LEFT JOIN sites s ON t.site_id = s.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (userId) {
    query += " AND r.user_id = ?";
    params.push(userId);
  } else {
    query += " AND r.user_id IS NULL";
  }

  if (dateFrom) {
    query += " AND r.played_at >= ?";
    params.push(dateFrom);
  }
  if (dateTo) {
    query += " AND r.played_at <= ?";
    params.push(dateTo);
  }
  if (siteId) {
    query += " AND t.site_id = ?";
    params.push(siteId);
  }
  if (sessionId) {
    query += " AND r.session_id = ?";
    params.push(sessionId);
  }

  query += " ORDER BY r.played_at DESC, r.created_at DESC LIMIT 1000";

  try {
    const rows = sqlite.prepare(query).all(...params) as Record<string, unknown>[];

    const results = rows.map((row) => ({
      id: row.id,
      tournamentId: row.tournament_id,
      entries: row.entries,
      totalInvested: row.total_invested,
      finishPosition: row.finish_position,
      totalEntriesAtFinish: row.total_entries_at_finish,
      payout: row.payout,
      bountiesWon: row.bounties_won,
      netResult: row.net_result,
      sessionId: row.session_id,
      notes: row.notes,
      playedAt: row.played_at,
      createdAt: row.created_at,
      tournamentName: row.tournament_name || "Unknown Tournament",
      siteName: row.site_name || "Unknown",
      siteId: row.site_id || "",
      gameType: row.game_type || "",
      buyIn: row.tournament_buy_in ?? 0,
      guarantee: row.tournament_guarantee ?? 0,
      startTime: row.tournament_start_time || "",
      currency: row.tournament_currency || "USD",
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Results query error:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  try {
    const body = await req.json();
    const {
      tournamentId,
      entries = 1,
      totalInvested,
      finishPosition,
      totalEntriesAtFinish,
      payout = 0,
      bountiesWon = 0,
      notes,
      sessionId,
      playedAt,
    } = body;

    if (!tournamentId || totalInvested === undefined) {
      return NextResponse.json(
        { error: "tournamentId and totalInvested are required" },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const netResult = payout + bountiesWon - totalInvested;

    sqlite
      .prepare(
        `INSERT INTO results (id, tournament_id, entries, total_invested, finish_position,
         total_entries_at_finish, payout, bounties_won, net_result, session_id, notes,
         played_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        tournamentId,
        entries,
        totalInvested,
        finishPosition ?? null,
        totalEntriesAtFinish ?? null,
        payout,
        bountiesWon,
        netResult,
        sessionId ?? null,
        notes ?? null,
        playedAt ?? new Date().toISOString(),
        userId ?? null
      );

    return NextResponse.json({
      result: {
        id,
        tournamentId,
        entries,
        totalInvested,
        finishPosition: finishPosition ?? null,
        totalEntriesAtFinish: totalEntriesAtFinish ?? null,
        payout,
        bountiesWon,
        netResult,
        sessionId: sessionId ?? null,
        notes: notes ?? null,
        playedAt: playedAt ?? new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Create result error:", err);
    return NextResponse.json({ error: "Failed to create result" }, { status: 500 });
  }
}
