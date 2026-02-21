/**
 * Favorites API route — toggle and list favorited tournaments.
 *
 * GET returns an array of favorited tournament IDs for the current user.
 * POST toggles a tournament's favorite status (insert if new, delete if exists).
 * Favorites are scoped per-user when authenticated; anonymous users share a
 * global favorites pool for backward compatibility.
 *
 * @endpoint GET /api/favorites → { favorites: string[] }
 * @endpoint POST /api/favorites → { favorited: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const query = userId
    ? "SELECT tournament_id FROM favorites WHERE user_id = ?"
    : "SELECT tournament_id FROM favorites WHERE user_id IS NULL";
  const params = userId ? [userId] : [];

  const rows = sqlite.prepare(query).all(...params) as { tournament_id: string }[];
  return NextResponse.json({ favorites: rows.map((r) => r.tournament_id) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { tournamentId } = await req.json();

  const whereClause = userId
    ? "tournament_id = ? AND user_id = ?"
    : "tournament_id = ? AND user_id IS NULL";
  const whereParams = userId ? [tournamentId, userId] : [tournamentId];

  const existing = sqlite
    .prepare(`SELECT id FROM favorites WHERE ${whereClause}`)
    .get(...whereParams) as { id: string } | undefined;

  if (existing) {
    sqlite.prepare(`DELETE FROM favorites WHERE ${whereClause}`).run(...whereParams);
    return NextResponse.json({ favorited: false });
  } else {
    sqlite
      .prepare("INSERT INTO favorites (id, tournament_id, user_id) VALUES (?, ?, ?)")
      .run(randomUUID(), tournamentId, userId ?? null);
    return NextResponse.json({ favorited: true });
  }
}
