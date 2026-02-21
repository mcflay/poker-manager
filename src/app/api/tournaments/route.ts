/**
 * Tournament listing API route with dynamic filtering.
 *
 * Builds a SQL query dynamically based on query parameters, supporting
 * filtering by site, buy-in range, game type, format, speed, structure,
 * tournament type, status, name search, guarantee minimum, time window,
 * and favorites-only mode.
 *
 * Uses raw SQL (via better-sqlite3) for the dynamic WHERE clause since
 * Drizzle ORM's query builder doesn't support this pattern cleanly.
 * Results are joined with sites, results, and favorites tables.
 *
 * @endpoint GET /api/tournaments
 * @returns {{ tournaments: Tournament[], total: number }}
 */
import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sites = searchParams.getAll("site");
  const buyInMin = searchParams.get("buyInMin");
  const buyInMax = searchParams.get("buyInMax");
  const gameTypes = searchParams.getAll("gameType");
  const formats = searchParams.getAll("format");
  const speeds = searchParams.getAll("speed");
  const structures = searchParams.getAll("structure");
  const tournamentTypes = searchParams.getAll("tournamentType");
  const statuses = searchParams.getAll("status");
  const search = searchParams.get("search") || "";
  const guaranteeMin = searchParams.get("guaranteeMin");
  const timeWindowHours = searchParams.get("timeWindowHours");
  const favoritesOnly = searchParams.get("favoritesOnly") === "true";

  let query = `
    SELECT
      t.*,
      s.name as site_name,
      CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as has_result,
      CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
    FROM tournaments t
    LEFT JOIN sites s ON t.site_id = s.id
    LEFT JOIN results r ON r.tournament_id = t.id
    LEFT JOIN favorites f ON f.tournament_id = t.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (sites.length > 0) {
    query += ` AND t.site_id IN (${sites.map(() => "?").join(",")})`;
    params.push(...sites);
  }
  if (buyInMin !== null) {
    query += " AND t.buy_in >= ?";
    params.push(Number(buyInMin));
  }
  if (buyInMax !== null) {
    query += " AND t.buy_in <= ?";
    params.push(Number(buyInMax));
  }
  if (gameTypes.length > 0) {
    query += ` AND t.game_type IN (${gameTypes.map(() => "?").join(",")})`;
    params.push(...gameTypes);
  }
  if (formats.length > 0) {
    query += ` AND t.format IN (${formats.map(() => "?").join(",")})`;
    params.push(...formats);
  }
  if (speeds.length > 0) {
    query += ` AND t.speed IN (${speeds.map(() => "?").join(",")})`;
    params.push(...speeds);
  }
  if (structures.length > 0) {
    query += ` AND t.structure IN (${structures.map(() => "?").join(",")})`;
    params.push(...structures);
  }
  if (tournamentTypes.length > 0) {
    query += ` AND t.tournament_type IN (${tournamentTypes.map(() => "?").join(",")})`;
    params.push(...tournamentTypes);
  }
  if (statuses.length > 0) {
    query += ` AND t.status IN (${statuses.map(() => "?").join(",")})`;
    params.push(...statuses);
  }
  if (search) {
    query += " AND LOWER(t.name) LIKE ?";
    params.push(`%${search.toLowerCase()}%`);
  }
  if (guaranteeMin !== null) {
    query += " AND t.guarantee >= ?";
    params.push(Number(guaranteeMin));
  }
  if (timeWindowHours !== null) {
    const cutoff = new Date(Date.now() + Number(timeWindowHours) * 3600 * 1000).toISOString();
    query += " AND t.start_time <= ?";
    params.push(cutoff);
  }
  if (favoritesOnly) {
    query += " AND f.id IS NOT NULL";
  }

  query += " ORDER BY t.start_time ASC, t.buy_in ASC LIMIT 2000";

  try {
    const rows = sqlite.prepare(query).all(...params) as Record<string, unknown>[];

    const tournaments = rows.map((row) => ({
      id: row.id,
      siteId: row.site_id,
      siteName: row.site_name,
      name: row.name,
      gameType: row.game_type,
      format: row.format,
      speed: row.speed,
      structure: row.structure,
      tournamentType: row.tournament_type,
      buyIn: row.buy_in,
      rake: row.rake,
      bounty: row.bounty,
      guarantee: row.guarantee,
      maxEntries: row.max_entries,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      totalEntries: row.total_entries,
      prizePool: row.prize_pool,
      currency: row.currency,
      isSeries: Boolean(row.is_series),
      seriesName: row.series_name,
      hasResult: Boolean(row.has_result),
      isFavorite: Boolean(row.is_favorite),
    }));

    return NextResponse.json({ tournaments, total: tournaments.length });
  } catch (err) {
    console.error("Tournament query error:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
