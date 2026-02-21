/**
 * Single staking package API — read and update.
 *
 * @endpoint GET /api/staking/packages/:id → { package }
 * @endpoint PUT /api/staking/packages/:id → { success: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const userFilter = userId ? "AND player_id = ?" : "AND player_id IS NULL";
  const qParams = userId ? [id, userId] : [id];

  const row = sqlite
    .prepare(`SELECT * FROM staking_packages WHERE id = ? ${userFilter}`)
    .get(...qParams) as Record<string, unknown> | undefined;

  if (!row) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  return NextResponse.json({
    package: {
      id: row.id,
      name: row.name,
      totalPercentageSold: row.total_percentage_sold,
      markup: row.markup,
      status: row.status,
      createdAt: row.created_at,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  const body = await req.json();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
  if (body.totalPercentageSold !== undefined) { updates.push("total_percentage_sold = ?"); values.push(body.totalPercentageSold); }
  if (body.markup !== undefined) { updates.push("markup = ?"); values.push(body.markup); }
  if (body.status !== undefined) { updates.push("status = ?"); values.push(body.status); }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const userFilter = userId ? "AND player_id = ?" : "AND player_id IS NULL";
  const whereParams = userId ? [id, userId] : [id];

  const result = sqlite
    .prepare(`UPDATE staking_packages SET ${updates.join(", ")} WHERE id = ? ${userFilter}`)
    .run(...values, ...whereParams);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
