/**
 * Bankroll summary API — aggregate stats across all accounts.
 *
 * Returns total balance, deposit/withdrawal totals, and per-account breakdown.
 *
 * @endpoint GET /api/bankroll/summary → { summary }
 */
import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const userFilter = userId ? "WHERE user_id = ?" : "WHERE user_id IS NULL";
  const params = userId ? [userId] : [];

  // Per-account balances
  const accounts = sqlite
    .prepare(
      `SELECT ba.id, ba.name, ba.currency, ba.current_balance, s.name as site_name
       FROM bankroll_accounts ba
       LEFT JOIN sites s ON ba.site_id = s.id
       ${userFilter}
       ORDER BY ba.created_at DESC`
    )
    .all(...params) as Record<string, unknown>[];

  // Aggregate transaction stats
  const txnStats = sqlite
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposits,
         COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawals,
         COALESCE(SUM(CASE WHEN type = 'result' THEN amount ELSE 0 END), 0) as total_results,
         COUNT(*) as transaction_count
       FROM bankroll_transactions
       ${userFilter}`
    )
    .get(...params) as Record<string, number>;

  const totalBalance = accounts.reduce(
    (sum, a) => sum + (a.current_balance as number),
    0
  );

  return NextResponse.json({
    summary: {
      totalBalance,
      totalDeposits: txnStats.total_deposits,
      totalWithdrawals: Math.abs(txnStats.total_withdrawals),
      totalResults: txnStats.total_results,
      transactionCount: txnStats.transaction_count,
      accountCount: accounts.length,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        siteName: a.site_name,
        currency: a.currency,
        currentBalance: a.current_balance,
      })),
    },
  });
}
