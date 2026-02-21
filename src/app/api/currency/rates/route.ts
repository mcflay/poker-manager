/**
 * Exchange rates API — list and update exchange rates.
 *
 * GET returns all stored exchange rates.
 * POST updates or inserts a specific rate.
 *
 * @endpoint GET /api/currency/rates → { rates }
 * @endpoint POST /api/currency/rates → { rate }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  const rows = sqlite
    .prepare("SELECT * FROM exchange_rates ORDER BY base_currency, target_currency")
    .all() as Record<string, unknown>[];

  const rates = rows.map((r) => ({
    id: r.id,
    baseCurrency: r.base_currency,
    targetCurrency: r.target_currency,
    rate: r.rate,
    source: r.source,
    fetchedAt: r.fetched_at,
  }));

  // Also return as a simple lookup map
  const rateMap: Record<string, number> = {};
  for (const r of rows) {
    rateMap[`${r.base_currency}-${r.target_currency}`] = r.rate as number;
  }

  return NextResponse.json({ rates, rateMap });
}

export async function POST(req: NextRequest) {
  const { baseCurrency, targetCurrency, rate } = await req.json();

  if (!baseCurrency || !targetCurrency || rate === undefined) {
    return NextResponse.json(
      { error: "baseCurrency, targetCurrency, and rate are required" },
      { status: 400 }
    );
  }

  if (baseCurrency === targetCurrency) {
    return NextResponse.json(
      { error: "baseCurrency and targetCurrency must be different" },
      { status: 400 }
    );
  }

  const id = `${baseCurrency.toLowerCase()}-${targetCurrency.toLowerCase()}`;

  sqlite
    .prepare(
      `INSERT INTO exchange_rates (id, base_currency, target_currency, rate, source, fetched_at)
       VALUES (?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP)
       ON CONFLICT(base_currency, target_currency) DO UPDATE SET
         rate = excluded.rate,
         source = 'manual',
         fetched_at = CURRENT_TIMESTAMP`
    )
    .run(id, baseCurrency, targetCurrency, rate);

  return NextResponse.json({
    rate: { id, baseCurrency, targetCurrency, rate, source: "manual" },
  });
}
