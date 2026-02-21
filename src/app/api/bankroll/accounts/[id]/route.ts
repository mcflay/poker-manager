/**
 * Single bankroll account API — read, update, and delete a bankroll account.
 *
 * @endpoint GET /api/bankroll/accounts/:id → { account }
 * @endpoint PUT /api/bankroll/accounts/:id → { account }
 * @endpoint DELETE /api/bankroll/accounts/:id → { success: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const query = userId
    ? `SELECT ba.*, s.name as site_name FROM bankroll_accounts ba
       LEFT JOIN sites s ON ba.site_id = s.id
       WHERE ba.id = ? AND ba.user_id = ?`
    : `SELECT ba.*, s.name as site_name FROM bankroll_accounts ba
       LEFT JOIN sites s ON ba.site_id = s.id
       WHERE ba.id = ? AND ba.user_id IS NULL`;

  const params_ = userId ? [id, userId] : [id];
  const row = sqlite.prepare(query).get(...params_) as Record<string, unknown> | undefined;

  if (!row) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({
    account: {
      id: row.id,
      siteId: row.site_id,
      siteName: row.site_name,
      name: row.name,
      currency: row.currency,
      currentBalance: row.current_balance,
      createdAt: row.created_at,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  const { name, siteId, currency } = await req.json();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { updates.push("name = ?"); values.push(name); }
  if (siteId !== undefined) { updates.push("site_id = ?"); values.push(siteId); }
  if (currency !== undefined) { updates.push("currency = ?"); values.push(currency); }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const whereClause = userId
    ? "WHERE id = ? AND user_id = ?"
    : "WHERE id = ? AND user_id IS NULL";
  const whereParams = userId ? [id, userId] : [id];

  const result = sqlite
    .prepare(`UPDATE bankroll_accounts SET ${updates.join(", ")} ${whereClause}`)
    .run(...values, ...whereParams);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
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

  const whereClause = userId
    ? "WHERE id = ? AND user_id = ?"
    : "WHERE id = ? AND user_id IS NULL";
  const whereParams = userId ? [id, userId] : [id];

  const result = sqlite
    .prepare(`DELETE FROM bankroll_accounts ${whereClause}`)
    .run(...whereParams);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
