/**
 * Bankroll transactions API — list and create transactions.
 *
 * Supports deposit, withdrawal, and result-linked transactions.
 * Each transaction updates the account's current_balance.
 *
 * @endpoint GET /api/bankroll/transactions → { transactions }
 * @endpoint POST /api/bankroll/transactions → { transaction }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  let query = `
    SELECT bt.*, ba.name as account_name
    FROM bankroll_transactions bt
    LEFT JOIN bankroll_accounts ba ON bt.account_id = ba.id
    WHERE 1=1
  `;
  const params: string[] = [];

  if (userId) {
    query += " AND bt.user_id = ?";
    params.push(userId);
  } else {
    query += " AND bt.user_id IS NULL";
  }

  if (accountId) {
    query += " AND bt.account_id = ?";
    params.push(accountId);
  }

  query += " ORDER BY bt.transacted_at DESC LIMIT 200";

  const rows = sqlite.prepare(query).all(...params) as Record<string, unknown>[];

  const transactions = rows.map((r) => ({
    id: r.id,
    accountId: r.account_id,
    accountName: r.account_name,
    type: r.type,
    amount: r.amount,
    balanceAfter: r.balance_after,
    relatedResultId: r.related_result_id,
    description: r.description,
    transactedAt: r.transacted_at,
  }));

  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { accountId, type, amount, description, relatedResultId } = await req.json();

  if (!accountId || !type || amount === undefined) {
    return NextResponse.json(
      { error: "accountId, type, and amount are required" },
      { status: 400 }
    );
  }

  if (!["deposit", "withdrawal", "result", "adjustment"].includes(type)) {
    return NextResponse.json(
      { error: "type must be deposit, withdrawal, result, or adjustment" },
      { status: 400 }
    );
  }

  // Get current balance
  const account = sqlite
    .prepare("SELECT current_balance FROM bankroll_accounts WHERE id = ?")
    .get(accountId) as { current_balance: number } | undefined;

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const signedAmount = type === "withdrawal" ? -Math.abs(amount) : amount;
  const balanceAfter = account.current_balance + signedAmount;

  const txnId = randomUUID();

  const txn = sqlite.transaction(() => {
    sqlite
      .prepare(
        "INSERT INTO bankroll_transactions (id, account_id, user_id, type, amount, balance_after, related_result_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(txnId, accountId, userId ?? null, type, signedAmount, balanceAfter, relatedResultId ?? null, description ?? null);

    sqlite
      .prepare("UPDATE bankroll_accounts SET current_balance = ? WHERE id = ?")
      .run(balanceAfter, accountId);
  });

  txn();

  return NextResponse.json({
    transaction: {
      id: txnId,
      accountId,
      type,
      amount: signedAmount,
      balanceAfter,
      description,
    },
  });
}
