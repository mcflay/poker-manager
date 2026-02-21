/**
 * Staking summary API — aggregate P&L across all deals.
 *
 * @endpoint GET /api/staking/summary → { summary }
 */
import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const userFilter = userId ? "WHERE player_id = ?" : "WHERE player_id IS NULL";
  const params = userId ? [userId] : [];

  const stats = sqlite
    .prepare(
      `SELECT
         COUNT(*) as total_deals,
         COUNT(CASE WHEN status = 'settled' THEN 1 END) as settled_deals,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_deals,
         COALESCE(SUM(staker_investment), 0) as total_staker_investment,
         COALESCE(SUM(staker_payout), 0) as total_staker_payout,
         COALESCE(SUM(player_net_after_staking), 0) as total_player_net,
         COALESCE(SUM(buy_in_amount), 0) as total_buy_ins,
         COALESCE(AVG(percentage_sold), 0) as avg_percentage_sold
       FROM staking_deals
       ${userFilter}`
    )
    .get(...params) as Record<string, number>;

  return NextResponse.json({
    summary: {
      totalDeals: stats.total_deals,
      settledDeals: stats.settled_deals,
      pendingDeals: stats.pending_deals,
      totalStakerInvestment: stats.total_staker_investment,
      totalStakerPayout: stats.total_staker_payout,
      totalPlayerNet: stats.total_player_net,
      totalBuyIns: stats.total_buy_ins,
      avgPercentageSold: stats.avg_percentage_sold,
    },
  });
}
