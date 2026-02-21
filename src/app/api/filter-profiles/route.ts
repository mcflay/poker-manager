/**
 * Filter profiles API route — list and create saved filter configurations.
 *
 * GET returns all filter profiles for the current user.
 * POST creates a new filter profile with serialized filter state.
 *
 * @endpoint GET /api/filter-profiles → { profiles: FilterProfile[] }
 * @endpoint POST /api/filter-profiles → { profile: FilterProfile }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const query = userId
    ? "SELECT * FROM filter_profiles WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC"
    : "SELECT * FROM filter_profiles WHERE user_id IS NULL ORDER BY sort_order ASC, created_at DESC";
  const params = userId ? [userId] : [];

  const rows = sqlite.prepare(query).all(...params) as Record<string, unknown>[];

  const profiles = rows.map((row) => ({
    id: row.id,
    name: row.name,
    filters: JSON.parse(row.filters as string),
    isDefault: Boolean(row.is_default),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  try {
    const { name, filters, isDefault } = await req.json();

    if (!name || !filters) {
      return NextResponse.json(
        { error: "name and filters are required" },
        { status: 400 }
      );
    }

    const id = randomUUID();

    // If setting as default, unset any existing default
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
        "INSERT INTO filter_profiles (id, name, filters, is_default, user_id) VALUES (?, ?, ?, ?, ?)"
      )
      .run(id, name, JSON.stringify(filters), isDefault ? 1 : 0, userId ?? null);

    return NextResponse.json({
      profile: { id, name, filters, isDefault: Boolean(isDefault) },
    });
  } catch (err) {
    console.error("Create filter profile error:", err);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}
