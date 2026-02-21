/**
 * Analytics API route — aggregated stats, timeline, and breakdown.
 *
 * Uses SQL aggregates for summary and breakdown computations instead
 * of fetching all rows into JS. Only the timeline (cumulative P&L)
 * and streaks are computed in JS since they require ordered iteration.
 *
 * @endpoint GET /api/analytics → { summary, timeline, bySite, byGameType, byBuyIn }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { computeStreaks, computeTimeline } from "@/lib/analytics/calculations";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  // Build shared WHERE clause
  let whereClause = "WHERE 1=1";
  const params: (string | number)[] = [];

  if (userId) {
    whereClause += " AND r.user_id = ?";
    params.push(userId);
  } else {
    whereClause += " AND r.user_id IS NULL";
  }
  if (dateFrom) {
    whereClause += " AND r.played_at >= ?";
    params.push(dateFrom);
  }
  if (dateTo) {
    whereClause += " AND r.played_at <= ?";
    params.push(dateTo);
  }

  try {
    // ── Summary via SQL aggregates ──
    const summaryRow = sqlite
      .prepare(
        `SELECT
          COUNT(*) as total_tournaments,
          COALESCE(SUM(r.total_invested), 0) as total_invested,
          COALESCE(SUM(r.payout), 0) as total_payout,
          COALESCE(SUM(r.bounties_won), 0) as total_bounties,
          COALESCE(SUM(r.payout + r.bounties_won - r.total_invested), 0) as net_profit,
          SUM(CASE WHEN r.payout > 0 THEN 1 ELSE 0 END) as itm_count,
          AVG(r.total_invested) as avg_buy_in,
          AVG(CASE WHEN r.finish_position IS NOT NULL THEN r.finish_position END) as avg_finish,
          MIN(CASE WHEN r.finish_position IS NOT NULL THEN r.finish_position END) as best_finish
        FROM results r
        ${whereClause}`
      )
      .get(...params) as Record<string, number>;

    const totalTournaments = summaryRow.total_tournaments ?? 0;
    const totalInvested = summaryRow.total_invested ?? 0;
    const netProfit = summaryRow.net_profit ?? 0;

    // ── Streaks + timeline need ordered row iteration ──
    const timelineRows = sqlite
      .prepare(
        `SELECT r.net_result, r.played_at, r.total_invested, r.payout, r.bounties_won
        FROM results r
        ${whereClause}
        ORDER BY r.played_at ASC`
      )
      .all(...params) as { net_result: number; played_at: string; total_invested: number; payout: number; bounties_won: number }[];

    const results = timelineRows.map((r) => ({
      totalInvested: r.total_invested ?? 0,
      payout: r.payout ?? 0,
      bountiesWon: r.bounties_won ?? 0,
      netResult: r.net_result ?? 0,
      playedAt: r.played_at,
    }));

    const { longestWinStreak, longestLossStreak } = computeStreaks(results);
    const timeline = computeTimeline(results);

    const summary = {
      totalTournaments,
      totalInvested,
      totalPayout: summaryRow.total_payout ?? 0,
      totalBounties: summaryRow.total_bounties ?? 0,
      netProfit,
      roi: totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0,
      itmCount: summaryRow.itm_count ?? 0,
      itmPercent: totalTournaments > 0 ? ((summaryRow.itm_count ?? 0) / totalTournaments) * 100 : 0,
      avgBuyIn: summaryRow.avg_buy_in ?? 0,
      avgFinish: summaryRow.avg_finish ?? null,
      bestFinish: summaryRow.best_finish ?? null,
      longestWinStreak,
      longestLossStreak,
    };

    // ── Breakdowns via SQL GROUP BY ──
    const bySite = sqlite
      .prepare(
        `SELECT
          COALESCE(s.name, t.site_id, 'Unknown') as grp,
          COUNT(*) as count,
          COALESCE(SUM(r.total_invested), 0) as invested,
          COALESCE(SUM(r.payout + r.bounties_won - r.total_invested), 0) as profit
        FROM results r
        LEFT JOIN tournaments t ON r.tournament_id = t.id
        LEFT JOIN sites s ON t.site_id = s.id
        ${whereClause}
        GROUP BY grp`
      )
      .all(...params) as { grp: string; count: number; invested: number; profit: number }[];

    const byGameType = sqlite
      .prepare(
        `SELECT
          COALESCE(t.game_type, 'Unknown') as grp,
          COUNT(*) as count,
          COALESCE(SUM(r.total_invested), 0) as invested,
          COALESCE(SUM(r.payout + r.bounties_won - r.total_invested), 0) as profit
        FROM results r
        LEFT JOIN tournaments t ON r.tournament_id = t.id
        ${whereClause}
        GROUP BY grp`
      )
      .all(...params) as { grp: string; count: number; invested: number; profit: number }[];

    const byBuyIn = sqlite
      .prepare(
        `SELECT
          CASE
            WHEN t.buy_in <= 5 THEN 'Micro ($0-5)'
            WHEN t.buy_in <= 30 THEN 'Low ($5-30)'
            WHEN t.buy_in <= 100 THEN 'Mid ($30-100)'
            ELSE 'High ($100+)'
          END as grp,
          COUNT(*) as count,
          COALESCE(SUM(r.total_invested), 0) as invested,
          COALESCE(SUM(r.payout + r.bounties_won - r.total_invested), 0) as profit
        FROM results r
        LEFT JOIN tournaments t ON r.tournament_id = t.id
        ${whereClause}
        GROUP BY grp`
      )
      .all(...params) as { grp: string; count: number; invested: number; profit: number }[];

    const formatBreakdown = (rows: { grp: string; count: number; invested: number; profit: number }[]) =>
      rows.map((r) => ({
        group: r.grp,
        count: r.count,
        invested: r.invested,
        profit: r.profit,
        roi: r.invested > 0 ? (r.profit / r.invested) * 100 : 0,
      }));

    return NextResponse.json({
      summary,
      timeline,
      bySite: formatBreakdown(bySite),
      byGameType: formatBreakdown(byGameType),
      byBuyIn: formatBreakdown(byBuyIn),
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Analytics query failed" }, { status: 500 });
  }
}
