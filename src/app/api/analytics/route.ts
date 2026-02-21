/**
 * Analytics API route — aggregated stats, timeline, and breakdown.
 *
 * Returns summary statistics, cumulative P&L timeline, and breakdown
 * by site/game type for the authenticated user's results.
 *
 * @endpoint GET /api/analytics → { summary, timeline, bySite, byGameType }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { computeSummary, computeTimeline, computeBreakdown } from "@/lib/analytics/calculations";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  let query = `
    SELECT
      r.total_invested, r.payout, r.bounties_won, r.net_result,
      r.finish_position, r.total_entries_at_finish, r.played_at,
      t.site_id, t.game_type, t.buy_in as tournament_buy_in,
      s.name as site_name
    FROM results r
    LEFT JOIN tournaments t ON r.tournament_id = t.id
    LEFT JOIN sites s ON t.site_id = s.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (userId) {
    query += " AND r.user_id = ?";
    params.push(userId);
  } else {
    query += " AND r.user_id IS NULL";
  }

  if (dateFrom) {
    query += " AND r.played_at >= ?";
    params.push(dateFrom);
  }
  if (dateTo) {
    query += " AND r.played_at <= ?";
    params.push(dateTo);
  }

  query += " ORDER BY r.played_at ASC";

  try {
    const rows = sqlite.prepare(query).all(...params) as Record<string, unknown>[];

    const results = rows.map((r) => ({
      totalInvested: (r.total_invested as number) ?? 0,
      payout: (r.payout as number) ?? 0,
      bountiesWon: (r.bounties_won as number) ?? 0,
      netResult: (r.net_result as number) ?? 0,
      finishPosition: r.finish_position as number | null,
      totalEntriesAtFinish: r.total_entries_at_finish as number | null,
      playedAt: r.played_at as string | null,
      siteId: r.site_id as string,
      siteName: r.site_name as string,
      gameType: r.game_type as string,
      buyIn: (r.tournament_buy_in as number) ?? 0,
    }));

    const summary = computeSummary(results);
    const timeline = computeTimeline(results);

    const bySite = computeBreakdown(
      results.map((r) => ({ ...r, groupKey: r.siteName || r.siteId || "Unknown" }))
    );

    const byGameType = computeBreakdown(
      results.map((r) => ({ ...r, groupKey: r.gameType || "Unknown" }))
    );

    // Buy-in bracket breakdown
    const byBuyIn = computeBreakdown(
      results.map((r) => ({
        ...r,
        groupKey:
          r.buyIn <= 5 ? "Micro ($0-5)" :
          r.buyIn <= 30 ? "Low ($5-30)" :
          r.buyIn <= 100 ? "Mid ($30-100)" :
          "High ($100+)",
      }))
    );

    return NextResponse.json({ summary, timeline, bySite, byGameType, byBuyIn });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Analytics query failed" }, { status: 500 });
  }
}
