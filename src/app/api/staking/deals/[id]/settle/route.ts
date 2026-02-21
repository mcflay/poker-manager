/**
 * Settle a staking deal — calculates final payouts and marks as settled.
 *
 * @endpoint POST /api/staking/deals/:id/settle → { deal }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { calcStakerPayout, calcPlayerNet } from "@/lib/staking/calculations";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const { totalPayout } = await req.json();

  if (totalPayout === undefined) {
    return NextResponse.json(
      { error: "totalPayout is required" },
      { status: 400 }
    );
  }

  const userFilter = userId ? "AND player_id = ?" : "AND player_id IS NULL";
  const qParams = userId ? [id, userId] : [id];

  const deal = sqlite
    .prepare(`SELECT * FROM staking_deals WHERE id = ? ${userFilter}`)
    .get(...qParams) as Record<string, unknown> | undefined;

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const percentageSold = deal.percentage_sold as number;
  const markup = deal.markup as number;
  const buyIn = deal.buy_in_amount as number;

  const stakerPayout = calcStakerPayout(totalPayout, percentageSold);
  const playerNet = calcPlayerNet(totalPayout, buyIn, percentageSold, markup);

  sqlite
    .prepare(
      `UPDATE staking_deals SET
        staker_payout = ?,
        player_net_after_staking = ?,
        status = 'settled',
        settled_at = CURRENT_TIMESTAMP
       WHERE id = ? ${userFilter}`
    )
    .run(stakerPayout, playerNet, ...qParams);

  return NextResponse.json({
    deal: {
      id,
      stakerPayout,
      playerNetAfterStaking: playerNet,
      status: "settled",
    },
  });
}
