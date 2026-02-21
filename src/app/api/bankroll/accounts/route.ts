/**
 * Bankroll accounts API — list and create bankroll accounts.
 *
 * Each account represents a bankroll on a specific poker site.
 *
 * @endpoint GET /api/bankroll/accounts → { accounts: BankrollAccount[] }
 * @endpoint POST /api/bankroll/accounts → { account: BankrollAccount }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const query = userId
    ? `SELECT ba.*, s.name as site_name
       FROM bankroll_accounts ba
       LEFT JOIN sites s ON ba.site_id = s.id
       WHERE ba.user_id = ?
       ORDER BY ba.created_at DESC`
    : `SELECT ba.*, s.name as site_name
       FROM bankroll_accounts ba
       LEFT JOIN sites s ON ba.site_id = s.id
       WHERE ba.user_id IS NULL
       ORDER BY ba.created_at DESC`;

  const params = userId ? [userId] : [];
  const rows = sqlite.prepare(query).all(...params) as Record<string, unknown>[];

  const accounts = rows.map((r) => ({
    id: r.id,
    siteId: r.site_id,
    siteName: r.site_name,
    name: r.name,
    currency: r.currency,
    currentBalance: r.current_balance,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { siteId, name, currency, initialBalance } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const id = randomUUID();
  const balance = initialBalance ?? 0;

  sqlite
    .prepare(
      "INSERT INTO bankroll_accounts (id, user_id, site_id, name, currency, current_balance) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(id, userId ?? null, siteId ?? null, name, currency ?? "USD", balance);

  // Create initial deposit transaction if balance > 0
  if (balance > 0) {
    sqlite
      .prepare(
        "INSERT INTO bankroll_transactions (id, account_id, user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(randomUUID(), id, userId ?? null, "deposit", balance, balance, "Initial deposit");
  }

  return NextResponse.json({
    account: { id, siteId, name, currency: currency ?? "USD", currentBalance: balance },
  });
}
