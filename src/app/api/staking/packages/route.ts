/**
 * Staking packages API — list and create packages.
 *
 * @endpoint GET /api/staking/packages → { packages }
 * @endpoint POST /api/staking/packages → { package }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const userFilter = userId ? "WHERE player_id = ?" : "WHERE player_id IS NULL";
  const params = userId ? [userId] : [];

  const rows = sqlite
    .prepare(
      `SELECT * FROM staking_packages ${userFilter} ORDER BY created_at DESC`
    )
    .all(...params) as Record<string, unknown>[];

  const packages = rows.map((r) => ({
    id: r.id,
    name: r.name,
    totalPercentageSold: r.total_percentage_sold,
    markup: r.markup,
    status: r.status,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ packages });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { name, totalPercentageSold, markup } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const id = randomUUID();

  sqlite
    .prepare(
      "INSERT INTO staking_packages (id, player_id, name, total_percentage_sold, markup) VALUES (?, ?, ?, ?, ?)"
    )
    .run(id, userId ?? null, name, totalPercentageSold ?? 0, markup ?? 1.0);

  return NextResponse.json({
    package: {
      id,
      name,
      totalPercentageSold: totalPercentageSold ?? 0,
      markup: markup ?? 1.0,
      status: "active",
    },
  });
}
