/**
 * Single session API route — get, update, or delete a specific session.
 *
 * @endpoint GET /api/sessions/[id] → { session: Session }
 * @endpoint PUT /api/sessions/[id] → { session: Session }
 * @endpoint DELETE /api/sessions/[id] → { deleted: true }
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

  const whereClause = userId ? "s.user_id = ?" : "s.user_id IS NULL";
  const queryParams = userId ? [id, userId] : [id];

  const row = sqlite
    .prepare(
      `SELECT s.*,
         COUNT(r.id) as result_count,
         COALESCE(SUM(r.total_invested), 0) as total_invested,
         COALESCE(SUM(r.payout + r.bounties_won), 0) as total_payout,
         COALESCE(SUM(r.net_result), 0) as net_result
       FROM sessions s
       LEFT JOIN results r ON r.session_id = s.id
       WHERE s.id = ? AND ${whereClause}
       GROUP BY s.id`
    )
    .get(...queryParams) as Record<string, unknown> | undefined;

  if (!row) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    session: {
      id: row.id,
      name: row.name,
      date: row.date,
      notes: row.notes,
      userId: row.user_id,
      createdAt: row.created_at,
      resultCount: row.result_count,
      totalInvested: row.total_invested,
      totalPayout: row.total_payout,
      netResult: row.net_result,
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
    .prepare(`SELECT id FROM sessions WHERE ${whereClause}`)
    .get(...whereParams) as { id: string } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const { name, date, notes } = await req.json();

    sqlite
      .prepare(
        `UPDATE sessions SET
         name = COALESCE(?, name),
         date = COALESCE(?, date),
         notes = ?
         WHERE ${whereClause}`
      )
      .run(name ?? null, date ?? null, notes ?? null, ...whereParams);

    return NextResponse.json({
      session: { id, name, date, notes },
    });
  } catch (err) {
    console.error("Update session error:", err);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
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

  // Unlink results from this session before deleting
  const unlinkWhere = userId
    ? "session_id = ? AND user_id = ?"
    : "session_id = ? AND user_id IS NULL";
  sqlite.prepare(`UPDATE results SET session_id = NULL WHERE ${unlinkWhere}`).run(...whereParams);

  const result = sqlite
    .prepare(`DELETE FROM sessions WHERE ${whereClause}`)
    .run(...whereParams);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
