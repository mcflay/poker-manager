/**
 * Single result API route — get, update, or delete a specific result.
 *
 * @endpoint GET /api/results/[id] → { result: Result }
 * @endpoint PUT /api/results/[id] → { result: Result }
 * @endpoint DELETE /api/results/[id] → { deleted: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const query = userId
    ? "SELECT * FROM results WHERE id = ? AND user_id = ?"
    : "SELECT * FROM results WHERE id = ? AND user_id IS NULL";
  const queryParams = userId ? [id, userId] : [id];

  const row = sqlite.prepare(query).get(...queryParams) as Record<string, unknown> | undefined;

  if (!row) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  return NextResponse.json({
    result: {
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
    },
  });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const whereClause = userId
    ? "id = ? AND user_id = ?"
    : "id = ? AND user_id IS NULL";
  const whereParams = userId ? [id, userId] : [id];

  const existing = sqlite
    .prepare(`SELECT id FROM results WHERE ${whereClause}`)
    .get(...whereParams) as { id: string } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const {
      entries,
      totalInvested,
      finishPosition,
      totalEntriesAtFinish,
      payout,
      bountiesWon,
      notes,
      sessionId,
      playedAt,
    } = body;

    const netResult = (payout ?? 0) + (bountiesWon ?? 0) - (totalInvested ?? 0);

    sqlite
      .prepare(
        `UPDATE results SET
         entries = COALESCE(?, entries),
         total_invested = COALESCE(?, total_invested),
         finish_position = ?,
         total_entries_at_finish = ?,
         payout = COALESCE(?, payout),
         bounties_won = COALESCE(?, bounties_won),
         net_result = ?,
         session_id = ?,
         notes = ?,
         played_at = COALESCE(?, played_at)
         WHERE ${whereClause}`
      )
      .run(
        entries ?? null,
        totalInvested ?? null,
        finishPosition ?? null,
        totalEntriesAtFinish ?? null,
        payout ?? null,
        bountiesWon ?? null,
        netResult,
        sessionId ?? null,
        notes ?? null,
        playedAt ?? null,
        ...whereParams
      );

    return NextResponse.json({ result: { id, ...body, netResult } });
  } catch (err) {
    console.error("Update result error:", err);
    return NextResponse.json({ error: "Failed to update result" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const whereClause = userId
    ? "id = ? AND user_id = ?"
    : "id = ? AND user_id IS NULL";
  const whereParams = userId ? [id, userId] : [id];

  const result = sqlite
    .prepare(`DELETE FROM results WHERE ${whereClause}`)
    .run(...whereParams);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
