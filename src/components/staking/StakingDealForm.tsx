/**
 * StakingDealForm — form for creating a new staking deal.
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { calcStakerInvestment } from "@/lib/staking/calculations";

interface StakingDealFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function StakingDealForm({ onSuccess, onCancel }: StakingDealFormProps) {
  const [stakerName, setStakerName] = useState("");
  const [buyIn, setBuyIn] = useState("");
  const [percentSold, setPercentSold] = useState("");
  const [markup, setMarkup] = useState("1.0");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const buyInNum = parseFloat(buyIn) || 0;
  const percentNum = parseFloat(percentSold) || 0;
  const markupNum = parseFloat(markup) || 1;
  const stakerInvestment = calcStakerInvestment(buyInNum, percentNum, markupNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stakerName.trim() || !buyIn || !percentSold) {
      toast.error("Fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/staking/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stakerName: stakerName.trim(),
          buyInAmount: buyInNum,
          percentageSold: percentNum,
          markup: markupNum,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Deal created");
      onSuccess();
    } catch {
      toast.error("Failed to create deal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold">New Staking Deal</h3>

      <div>
        <Label htmlFor="staker-name" className="text-xs">Staker Name</Label>
        <Input
          id="staker-name"
          value={stakerName}
          onChange={(e) => setStakerName(e.target.value)}
          placeholder="e.g. John"
          className="h-8 text-sm"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor="deal-buyin" className="text-xs">Buy-in ($)</Label>
          <Input
            id="deal-buyin"
            type="number"
            step="0.01"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="deal-percent" className="text-xs">% Sold</Label>
          <Input
            id="deal-percent"
            type="number"
            min="0"
            max="100"
            value={percentSold}
            onChange={(e) => setPercentSold(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="deal-markup" className="text-xs">Markup</Label>
          <Input
            id="deal-markup"
            type="number"
            step="0.01"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {buyInNum > 0 && percentNum > 0 && (
        <p className="text-xs text-muted-foreground">
          Staker invests: <span className="font-semibold">${stakerInvestment.toFixed(2)}</span>
        </p>
      )}

      <div>
        <Label htmlFor="deal-notes" className="text-xs">Notes</Label>
        <Input
          id="deal-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional…"
          className="h-8 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-8 text-xs" disabled={submitting}>
          {submitting ? "Creating…" : "Create Deal"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
