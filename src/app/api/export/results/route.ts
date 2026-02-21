/**
 * Results export API — export results data as CSV or JSON.
 *
 * @endpoint GET /api/export/results?format=csv → CSV file
 * @endpoint GET /api/export/results?format=json → JSON file
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "csv";

  const userFilter = userId ? "WHERE r.user_id = ?" : "WHERE r.user_id IS NULL";
  const params = userId ? [userId] : [];

  const rows = sqlite
    .prepare(
      `SELECT t.name as tournament_name, s.name as site_name,
              r.entries, r.total_invested, r.finish_position,
              r.total_entries_at_finish as field_size, r.payout,
              r.bounties_won, r.net_result, r.played_at, r.notes
       FROM results r
       LEFT JOIN tournaments t ON r.tournament_id = t.id
       LEFT JOIN sites s ON t.site_id = s.id
       ${userFilter}
       ORDER BY r.played_at DESC`
    )
    .all(...params) as Record<string, unknown>[];

  if (format === "json") {
    return NextResponse.json(rows, {
      headers: {
        "Content-Disposition": "attachment; filename=results.json",
      },
    });
  }

  if (rows.length === 0) {
    return new NextResponse("No data to export", { status: 200 });
  }

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          return str.includes(",") || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ];

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=results.csv",
    },
  });
}
