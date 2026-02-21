/**
 * Single filter profile API route — update or delete.
 *
 * @endpoint PUT /api/filter-profiles/[id] → { profile: FilterProfile }
 * @endpoint DELETE /api/filter-profiles/[id] → { deleted: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
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
    .prepare(`SELECT id FROM filter_profiles WHERE ${whereClause}`)
    .get(...whereParams) as { id: string } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  try {
    const { name, filters, isDefault } = await req.json();

    if (isDefault) {
      const unsetQuery = userId
        ? "UPDATE filter_profiles SET is_default = 0 WHERE user_id = ?"
        : "UPDATE filter_profiles SET is_default = 0 WHERE user_id IS NULL";
      if (userId) {
        sqlite.prepare(unsetQuery).run(userId);
      } else {
        sqlite.prepare(unsetQuery).run();
      }
    }

    sqlite
      .prepare(
        `UPDATE filter_profiles SET
         name = COALESCE(?, name),
         filters = COALESCE(?, filters),
         is_default = ?
         WHERE ${whereClause}`
      )
      .run(
        name ?? null,
        filters ? JSON.stringify(filters) : null,
        isDefault ? 1 : 0,
        ...whereParams
      );

    return NextResponse.json({
      profile: { id, name, filters, isDefault: Boolean(isDefault) },
    });
  } catch (err) {
    console.error("Update filter profile error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
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
    .prepare(`DELETE FROM filter_profiles WHERE ${whereClause}`)
    .run(...whereParams);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
