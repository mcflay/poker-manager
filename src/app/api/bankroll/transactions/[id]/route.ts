/**
 * Single bankroll transaction API — update and delete a transaction.
 *
 * Deleting a transaction reverses its effect on the account balance.
 *
 * @endpoint PUT /api/bankroll/transactions/:id → { success: true }
 * @endpoint DELETE /api/bankroll/transactions/:id → { success: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const { description } = await req.json();

  const whereClause = userId
    ? "WHERE id = ? AND user_id = ?"
    : "WHERE id = ? AND user_id IS NULL";
  const whereParams = userId ? [id, userId] : [id];

  const result = sqlite
    .prepare(`UPDATE bankroll_transactions SET description = ? ${whereClause}`)
    .run(description ?? null, ...whereParams);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  // Find the transaction to reverse its balance effect
  const whereClause = userId
    ? "WHERE id = ? AND user_id = ?"
    : "WHERE id = ? AND user_id IS NULL";
  const whereParams = userId ? [id, userId] : [id];

  const txn = sqlite
    .prepare(`SELECT * FROM bankroll_transactions ${whereClause}`)
    .get(...whereParams) as Record<string, unknown> | undefined;

  if (!txn) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const deleteTxn = sqlite.transaction(() => {
    // Reverse the balance change on the account
    sqlite
      .prepare("UPDATE bankroll_accounts SET current_balance = current_balance - ? WHERE id = ?")
      .run(txn.amount, txn.account_id);

    sqlite
      .prepare(`DELETE FROM bankroll_transactions ${whereClause}`)
      .run(...whereParams);
  });

  deleteTxn();

  return NextResponse.json({ success: true });
}
