/**
 * StakingCalculator — interactive calculator for staking deal math.
 *
 * Shows real-time calculations for staker investment, payout shares,
 * and player net based on buy-in, percentage sold, and markup.
 */
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  calcStakerInvestment,
  calcStakerPayout,
  calcPlayerNet,
  calcStakerPL,
  calcEffectiveBuyIn,
} from "@/lib/staking/calculations";

export function StakingCalculator() {
  const [buyIn, setBuyIn] = useState(100);
  const [percentSold, setPercentSold] = useState(50);
  const [markup, setMarkup] = useState(1.0);
  const [totalPayout, setTotalPayout] = useState(0);

  const stakerInvestment = calcStakerInvestment(buyIn, percentSold, markup);
  const effectiveBuyIn = calcEffectiveBuyIn(buyIn, percentSold, markup);
  const stakerPayout = calcStakerPayout(totalPayout, percentSold);
  const playerNet = calcPlayerNet(totalPayout, buyIn, percentSold, markup);
  const stakerPL = calcStakerPL(totalPayout, buyIn, percentSold, markup);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Staking Calculator</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="calc-buyin" className="text-xs">Buy-in ($)</Label>
          <Input
            id="calc-buyin"
            type="number"
            value={buyIn}
            onChange={(e) => setBuyIn(parseFloat(e.target.value) || 0)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="calc-percent" className="text-xs">% Sold</Label>
          <Input
            id="calc-percent"
            type="number"
            min="0"
            max="100"
            value={percentSold}
            onChange={(e) => setPercentSold(parseFloat(e.target.value) || 0)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="calc-markup" className="text-xs">Markup</Label>
          <Input
            id="calc-markup"
            type="number"
            step="0.01"
            value={markup}
            onChange={(e) => setMarkup(parseFloat(e.target.value) || 1)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="calc-payout" className="text-xs">Total Payout ($)</Label>
          <Input
            id="calc-payout"
            type="number"
            value={totalPayout}
            onChange={(e) => setTotalPayout(parseFloat(e.target.value) || 0)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-muted/50">
          <p className="text-muted-foreground">Staker Investment</p>
          <p className="font-semibold">${stakerInvestment.toFixed(2)}</p>
        </div>
        <div className="p-2 rounded bg-muted/50">
          <p className="text-muted-foreground">Your Effective Buy-in</p>
          <p className="font-semibold">${effectiveBuyIn.toFixed(2)}</p>
        </div>
        <div className="p-2 rounded bg-muted/50">
          <p className="text-muted-foreground">Staker Payout</p>
          <p className="font-semibold">${stakerPayout.toFixed(2)}</p>
        </div>
        <div className="p-2 rounded bg-muted/50">
          <p className="text-muted-foreground">Staker P&L</p>
          <p className={cn("font-semibold", stakerPL >= 0 ? "text-emerald-500" : "text-red-500")}>
            ${stakerPL.toFixed(2)}
          </p>
        </div>
        <div className="col-span-2 p-2 rounded bg-primary/10 border border-primary/20">
          <p className="text-muted-foreground">Your Net Result</p>
          <p className={cn("font-bold text-base", playerNet >= 0 ? "text-emerald-500" : "text-red-500")}>
            ${playerNet.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
