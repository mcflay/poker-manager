/**
 * Staking management page.
 *
 * Track staking deals, settle outcomes, and use the staking calculator.
 *
 * @page /staking
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { StakingDealForm } from "@/components/staking/StakingDealForm";
import { StakingDealList } from "@/components/staking/StakingDealList";
import { StakingCalculator } from "@/components/staking/StakingCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spade, ArrowLeft, Handshake, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Deal {
  id: string;
  stakerName: string;
  tournamentName: string | null;
  percentageSold: number;
  markup: number;
  buyInAmount: number;
  stakerInvestment: number | null;
  stakerPayout: number | null;
  playerNetAfterStaking: number | null;
  status: string;
  settledAt: string | null;
  createdAt: string;
}

export default function StakingPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [settleDealId, setSettleDealId] = useState<string | null>(null);
  const [settlePayout, setSettlePayout] = useState("");

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/staking/deals");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDeals(data.deals);
    } catch {
      toast.error("Failed to load deals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleSettle = async () => {
    if (!settleDealId) return;
    const payout = parseFloat(settlePayout);
    if (isNaN(payout)) {
      toast.error("Enter a valid payout amount");
      return;
    }

    try {
      const res = await fetch(`/api/staking/deals/${settleDealId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalPayout: payout }),
      });
      if (!res.ok) throw new Error();
      toast.success("Deal settled");
      setSettleDealId(null);
      setSettlePayout("");
      fetchDeals();
    } catch {
      toast.error("Failed to settle deal");
    }
  };

  const handleDelete = async (dealId: string) => {
    if (!confirm("Delete this staking deal?")) return;
    try {
      const res = await fetch(`/api/staking/deals/${dealId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deal deleted");
      fetchDeals();
    } catch {
      toast.error("Failed to delete deal");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
          <Spade className="h-4 w-4 text-primary" />
        </Link>
        <Handshake className="h-4 w-4 text-primary" />
        <h1 className="text-lg font-bold">Staking</h1>
        <div className="ml-auto">
          <UserMenu />
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        <div className="grid md:grid-cols-[1fr_280px] gap-4">
          {/* Left: Deals */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Staking Deals</h2>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowForm(!showForm)}
              >
                <Plus className="h-3 w-3" />
                New Deal
              </Button>
            </div>

            {showForm && (
              <div className="p-3 rounded-lg border border-border bg-card">
                <StakingDealForm
                  onSuccess={() => {
                    setShowForm(false);
                    fetchDeals();
                  }}
                  onCancel={() => setShowForm(false)}
                />
              </div>
            )}

            {/* Settle dialog */}
            {settleDealId && (
              <div className="p-3 rounded-lg border border-border bg-card space-y-2">
                <h3 className="text-sm font-semibold">Settle Deal</h3>
                <div>
                  <Label htmlFor="settle-payout" className="text-xs">Total Payout ($)</Label>
                  <Input
                    id="settle-payout"
                    type="number"
                    step="0.01"
                    value={settlePayout}
                    onChange={(e) => setSettlePayout(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={handleSettle}>
                    Settle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSettleDealId(null);
                      setSettlePayout("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading deals…</p>
            ) : (
              <StakingDealList
                deals={deals}
                onSettle={(id) => setSettleDealId(id)}
                onDelete={handleDelete}
              />
            )}
          </div>

          {/* Right: Calculator */}
          <div className="p-4 rounded-lg border border-border bg-card h-fit">
            <StakingCalculator />
          </div>
        </div>
      </main>
    </div>
  );
}
