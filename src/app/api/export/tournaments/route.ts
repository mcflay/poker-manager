/**
 * Tournament export API — export tournament data as CSV or JSON.
 *
 * Supports format query parameter: csv (default) or json.
 *
 * @endpoint GET /api/export/tournaments?format=csv → CSV file
 * @endpoint GET /api/export/tournaments?format=json → JSON file
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "csv";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  let query = `
    SELECT t.name, t.game_type, t.format, t.speed, t.structure,
           t.buy_in, t.rake, t.bounty, t.guarantee, t.start_time,
           t.status, t.currency, s.name as site_name
    FROM tournaments t
    LEFT JOIN sites s ON t.site_id = s.id
    WHERE 1=1
  `;
  const params: string[] = [];

  if (dateFrom) {
    query += " AND t.start_time >= ?";
    params.push(dateFrom);
  }
  if (dateTo) {
    query += " AND t.start_time <= ?";
    params.push(dateTo + "T23:59:59");
  }

  query += " ORDER BY t.start_time ASC";

  const rows = sqlite.prepare(query).all(...params) as Record<string, unknown>[];

  if (format === "json") {
    return NextResponse.json(rows, {
      headers: {
        "Content-Disposition": "attachment; filename=tournaments.json",
      },
    });
  }

  // CSV format
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
      "Content-Disposition": "attachment; filename=tournaments.csv",
    },
  });
}
