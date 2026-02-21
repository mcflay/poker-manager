/**
 * Single staking deal API — read, update, and delete.
 *
 * @endpoint GET /api/staking/deals/:id → { deal }
 * @endpoint PUT /api/staking/deals/:id → { success: true }
 * @endpoint DELETE /api/staking/deals/:id → { success: true }
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

  const userFilter = userId ? "AND sd.player_id = ?" : "AND sd.player_id IS NULL";
  const qParams = userId ? [id, userId] : [id];

  const row = sqlite
    .prepare(
      `SELECT sd.*, t.name as tournament_name
       FROM staking_deals sd
       LEFT JOIN tournaments t ON sd.tournament_id = t.id
       WHERE sd.id = ? ${userFilter}`
    )
    .get(...qParams) as Record<string, unknown> | undefined;

  if (!row) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json({
    deal: {
      id: row.id,
      stakerName: row.staker_name,
      tournamentId: row.tournament_id,
      tournamentName: row.tournament_name,
      percentageSold: row.percentage_sold,
      markup: row.markup,
      buyInAmount: row.buy_in_amount,
      stakerInvestment: row.staker_investment,
      stakerPayout: row.staker_payout,
      playerNetAfterStaking: row.player_net_after_staking,
      status: row.status,
      notes: row.notes,
      settledAt: row.settled_at,
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
  const body = await req.json();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.stakerName !== undefined) { updates.push("staker_name = ?"); values.push(body.stakerName); }
  if (body.notes !== undefined) { updates.push("notes = ?"); values.push(body.notes); }
  if (body.status !== undefined) { updates.push("status = ?"); values.push(body.status); }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const userFilter = userId ? "AND player_id = ?" : "AND player_id IS NULL";
  const whereParams = userId ? [id, userId] : [id];

  const result = sqlite
    .prepare(`UPDATE staking_deals SET ${updates.join(", ")} WHERE id = ? ${userFilter}`)
    .run(...values, ...whereParams);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
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

  const userFilter = userId ? "AND player_id = ?" : "AND player_id IS NULL";
  const whereParams = userId ? [id, userId] : [id];

  const result = sqlite
    .prepare(`DELETE FROM staking_deals WHERE id = ? ${userFilter}`)
    .run(...whereParams);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
