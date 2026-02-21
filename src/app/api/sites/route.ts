/**
 * Poker sites API route.
 *
 * Returns all active poker sites for use in the filter panel's
 * site selector. Sites are seeded on DB initialization.
 *
 * @endpoint GET /api/sites
 * @returns {{ sites: Site[] }}
 */
import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

export async function GET() {
  const rows = sqlite.prepare("SELECT * FROM sites WHERE is_active = 1 ORDER BY name").all();
  return NextResponse.json({ sites: rows });
}
