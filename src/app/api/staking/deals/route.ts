/**
 * Staking deals API — list and create staking deals.
 *
 * @endpoint GET /api/staking/deals → { deals }
 * @endpoint POST /api/staking/deals → { deal }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { calcStakerInvestment, calcStakerPayout, calcPlayerNet } from "@/lib/staking/calculations";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const userFilter = userId ? "WHERE sd.player_id = ?" : "WHERE sd.player_id IS NULL";
  const params = userId ? [userId] : [];

  const rows = sqlite
    .prepare(
      `SELECT sd.*, t.name as tournament_name
       FROM staking_deals sd
       LEFT JOIN tournaments t ON sd.tournament_id = t.id
       ${userFilter}
       ORDER BY sd.created_at DESC`
    )
    .all(...params) as Record<string, unknown>[];

  const deals = rows.map((r) => ({
    id: r.id,
    stakerName: r.staker_name,
    resultId: r.result_id,
    tournamentId: r.tournament_id,
    tournamentName: r.tournament_name,
    percentageSold: r.percentage_sold,
    markup: r.markup,
    buyInAmount: r.buy_in_amount,
    stakerInvestment: r.staker_investment,
    stakerPayout: r.staker_payout,
    playerNetAfterStaking: r.player_net_after_staking,
    status: r.status,
    notes: r.notes,
    settledAt: r.settled_at,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ deals });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { stakerName, tournamentId, percentageSold, markup, buyInAmount, notes } =
    await req.json();

  if (!stakerName || !percentageSold || !buyInAmount) {
    return NextResponse.json(
      { error: "stakerName, percentageSold, and buyInAmount are required" },
      { status: 400 }
    );
  }

  const mkup = markup ?? 1.0;
  const stakerInvestment = calcStakerInvestment(buyInAmount, percentageSold, mkup);

  const id = randomUUID();

  sqlite
    .prepare(
      `INSERT INTO staking_deals
       (id, player_id, staker_name, tournament_id, percentage_sold, markup, buy_in_amount, staker_investment, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(id, userId ?? null, stakerName, tournamentId ?? null, percentageSold, mkup, buyInAmount, stakerInvestment, notes ?? null);

  return NextResponse.json({
    deal: {
      id,
      stakerName,
      tournamentId,
      percentageSold,
      markup: mkup,
      buyInAmount,
      stakerInvestment,
      status: "pending",
    },
  });
}
