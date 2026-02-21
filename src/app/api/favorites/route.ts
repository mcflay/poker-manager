/**
 * Favorites API route — toggle, update, and list favorited tournaments.
 *
 * GET returns favorite data including IDs and extended info (color, priority, category).
 * POST toggles a tournament's favorite status (insert if new, delete if exists).
 * PUT updates an existing favorite's color, priority, notes, or category.
 * Favorites are scoped per-user when authenticated.
 *
 * @endpoint GET /api/favorites → { favorites: string[], favoriteDetails: FavoriteInfo[] }
 * @endpoint POST /api/favorites → { favorited: boolean }
 * @endpoint PUT /api/favorites → { updated: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const query = userId
    ? "SELECT id, tournament_id, color, priority, notes, category FROM favorites WHERE user_id = ?"
    : "SELECT id, tournament_id, color, priority, notes, category FROM favorites WHERE user_id IS NULL";
  const params = userId ? [userId] : [];

  const rows = sqlite.prepare(query).all(...params) as Record<string, unknown>[];

  const favorites = rows.map((r) => r.tournament_id as string);
  const favoriteDetails = rows.map((r) => ({
    id: r.id as string,
    tournamentId: r.tournament_id as string,
    color: r.color as string | null,
    priority: (r.priority as number) ?? 0,
    notes: r.notes as string | null,
    category: r.category as string | null,
  }));

  return NextResponse.json({ favorites, favoriteDetails });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { tournamentId, color, priority, notes, category } = await req.json();

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
      .prepare(
        "INSERT INTO favorites (id, tournament_id, user_id, color, priority, notes, category) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        randomUUID(),
        tournamentId,
        userId ?? null,
        color ?? null,
        priority ?? 0,
        notes ?? null,
        category ?? null
      );
    return NextResponse.json({ favorited: true });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { tournamentId, color, priority, notes, category } = await req.json();

  const whereClause = userId
    ? "tournament_id = ? AND user_id = ?"
    : "tournament_id = ? AND user_id IS NULL";
  const whereParams = userId ? [tournamentId, userId] : [tournamentId];

  const result = sqlite
    .prepare(
      `UPDATE favorites SET color = ?, priority = ?, notes = ?, category = ? WHERE ${whereClause}`
    )
    .run(color ?? null, priority ?? 0, notes ?? null, category ?? null, ...whereParams);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
  }

  return NextResponse.json({ updated: true });
}
