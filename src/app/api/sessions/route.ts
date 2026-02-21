/**
 * Sessions API route — list and create playing sessions.
 *
 * A session groups multiple tournament results into a single sitting
 * (e.g., "Sunday Grind Feb 16"). Results are linked via session_id.
 *
 * @endpoint GET /api/sessions → { sessions: Session[] }
 * @endpoint POST /api/sessions → { session: Session }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const query = userId
    ? `SELECT s.*,
         COUNT(r.id) as result_count,
         COALESCE(SUM(r.total_invested), 0) as total_invested,
         COALESCE(SUM(r.payout + r.bounties_won), 0) as total_payout,
         COALESCE(SUM(r.net_result), 0) as net_result
       FROM sessions s
       LEFT JOIN results r ON r.session_id = s.id
       WHERE s.user_id = ?
       GROUP BY s.id
       ORDER BY s.date DESC LIMIT 100`
    : `SELECT s.*,
         COUNT(r.id) as result_count,
         COALESCE(SUM(r.total_invested), 0) as total_invested,
         COALESCE(SUM(r.payout + r.bounties_won), 0) as total_payout,
         COALESCE(SUM(r.net_result), 0) as net_result
       FROM sessions s
       LEFT JOIN results r ON r.session_id = s.id
       WHERE s.user_id IS NULL
       GROUP BY s.id
       ORDER BY s.date DESC LIMIT 100`;

  const params = userId ? [userId] : [];

  try {
    const rows = sqlite.prepare(query).all(...params) as Record<string, unknown>[];

    const sessions = rows.map((row) => ({
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
    }));

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("Sessions query error:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  try {
    const { name, date, notes } = await req.json();

    if (!date) {
      return NextResponse.json(
        { error: "date is required" },
        { status: 400 }
      );
    }

    const id = randomUUID();

    sqlite
      .prepare("INSERT INTO sessions (id, name, date, notes, user_id) VALUES (?, ?, ?, ?, ?)")
      .run(id, name ?? null, date, notes ?? null, userId ?? null);

    return NextResponse.json({
      session: { id, name: name ?? null, date, notes: notes ?? null, userId },
    });
  } catch (err) {
    console.error("Create session error:", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
