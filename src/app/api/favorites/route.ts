/**
 * Favorites API route — toggle and list favorited tournaments.
 *
 * GET returns an array of favorited tournament IDs.
 * POST toggles a tournament's favorite status (insert if new, delete if exists).
 *
 * @endpoint GET /api/favorites → { favorites: string[] }
 * @endpoint POST /api/favorites → { favorited: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  const rows = sqlite.prepare("SELECT tournament_id FROM favorites").all() as { tournament_id: string }[];
  return NextResponse.json({ favorites: rows.map((r) => r.tournament_id) });
}

export async function POST(req: NextRequest) {
  const { tournamentId } = await req.json();
  const existing = sqlite
    .prepare("SELECT id FROM favorites WHERE tournament_id = ?")
    .get(tournamentId) as { id: string } | undefined;

  if (existing) {
    sqlite.prepare("DELETE FROM favorites WHERE tournament_id = ?").run(tournamentId);
    return NextResponse.json({ favorited: false });
  } else {
    sqlite
      .prepare("INSERT INTO favorites (id, tournament_id) VALUES (?, ?)")
      .run(randomUUID(), tournamentId);
    return NextResponse.json({ favorited: true });
  }
}
