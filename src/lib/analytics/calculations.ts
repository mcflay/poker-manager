/**
 * Pure analytics calculation functions.
 *
 * All functions take arrays of result data and return computed statistics.
 * No side effects, no database access — just math.
 *
 * @module analytics/calculations
 */

interface ResultData {
  totalInvested: number;
  payout: number;
  bountiesWon: number;
  netResult: number;
  finishPosition?: number | null;
  totalEntriesAtFinish?: number | null;
  playedAt?: string | null;
}

/** Summary statistics for a set of results */
export interface AnalyticsSummary {
  totalTournaments: number;
  totalInvested: number;
  totalPayout: number;
  totalBounties: number;
  netProfit: number;
  roi: number;
  itmCount: number;
  itmPercent: number;
  avgBuyIn: number;
  avgFinish: number | null;
  bestFinish: number | null;
  longestWinStreak: number;
  longestLossStreak: number;
}

/** Compute summary statistics from an array of results */
export function computeSummary(results: ResultData[]): AnalyticsSummary {
  if (results.length === 0) {
    return {
      totalTournaments: 0,
      totalInvested: 0,
      totalPayout: 0,
      totalBounties: 0,
      netProfit: 0,
      roi: 0,
      itmCount: 0,
      itmPercent: 0,
      avgBuyIn: 0,
      avgFinish: null,
      bestFinish: null,
      longestWinStreak: 0,
      longestLossStreak: 0,
    };
  }

  const totalInvested = results.reduce((s, r) => s + r.totalInvested, 0);
  const totalPayout = results.reduce((s, r) => s + r.payout, 0);
  const totalBounties = results.reduce((s, r) => s + r.bountiesWon, 0);
  const netProfit = totalPayout + totalBounties - totalInvested;
  const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

  const itmCount = results.filter((r) => r.payout > 0).length;
  const itmPercent = (itmCount / results.length) * 100;

  const avgBuyIn = totalInvested / results.length;

  const positions = results
    .filter((r) => r.finishPosition != null)
    .map((r) => r.finishPosition as number);
  const avgFinish = positions.length > 0
    ? positions.reduce((s, p) => s + p, 0) / positions.length
    : null;
  const bestFinish = positions.length > 0 ? Math.min(...positions) : null;

  const { longestWinStreak, longestLossStreak } = computeStreaks(results);

  return {
    totalTournaments: results.length,
    totalInvested,
    totalPayout,
    totalBounties,
    netProfit,
    roi,
    itmCount,
    itmPercent,
    avgBuyIn,
    avgFinish,
    bestFinish,
    longestWinStreak,
    longestLossStreak,
  };
}

/** Compute win/loss streaks from chronological results */
export function computeStreaks(results: ResultData[]): {
  longestWinStreak: number;
  longestLossStreak: number;
} {
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWin = 0;
  let currentLoss = 0;

  for (const r of results) {
    if (r.netResult > 0) {
      currentWin++;
      currentLoss = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWin);
    } else if (r.netResult < 0) {
      currentLoss++;
      currentWin = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLoss);
    } else {
      currentWin = 0;
      currentLoss = 0;
    }
  }

  return { longestWinStreak, longestLossStreak };
}

/** Compute cumulative P&L timeline for charting */
export function computeTimeline(
  results: ResultData[]
): { date: string; cumulative: number; daily: number }[] {
  const sorted = [...results].sort(
    (a, b) => new Date(a.playedAt || "").getTime() - new Date(b.playedAt || "").getTime()
  );

  const byDate = new Map<string, number>();
  for (const r of sorted) {
    const date = r.playedAt?.split("T")[0] || "unknown";
    byDate.set(date, (byDate.get(date) || 0) + r.netResult);
  }

  let cumulative = 0;
  return Array.from(byDate.entries()).map(([date, daily]) => {
    cumulative += daily;
    return { date, cumulative, daily };
  });
}

/** Break down results by a grouping key */
export function computeBreakdown(
  results: (ResultData & { groupKey: string })[]
): { group: string; count: number; invested: number; profit: number; roi: number }[] {
  const groups = new Map<
    string,
    { count: number; invested: number; payout: number; bounties: number }
  >();

  for (const r of results) {
    const g = groups.get(r.groupKey) || { count: 0, invested: 0, payout: 0, bounties: 0 };
    g.count++;
    g.invested += r.totalInvested;
    g.payout += r.payout;
    g.bounties += r.bountiesWon;
    groups.set(r.groupKey, g);
  }

  return Array.from(groups.entries()).map(([group, g]) => {
    const profit = g.payout + g.bounties - g.invested;
    const roi = g.invested > 0 ? (profit / g.invested) * 100 : 0;
    return { group, count: g.count, invested: g.invested, profit, roi };
  });
}
