/**
 * StakingDealList — displays staking deals in a table.
 */
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

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

interface StakingDealListProps {
  deals: Deal[];
  onSettle: (dealId: string) => void;
  onDelete: (dealId: string) => void;
}

export function StakingDealList({ deals, onSettle, onDelete }: StakingDealListProps) {
  if (deals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No staking deals yet
      </p>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="px-2 py-1.5 font-medium">Staker</th>
            <th className="px-2 py-1.5 font-medium">Buy-in</th>
            <th className="px-2 py-1.5 font-medium">% Sold</th>
            <th className="px-2 py-1.5 font-medium">Markup</th>
            <th className="px-2 py-1.5 font-medium">Investment</th>
            <th className="px-2 py-1.5 font-medium">Status</th>
            <th className="px-2 py-1.5 font-medium">Player Net</th>
            <th className="px-2 py-1.5 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id} className="border-t border-border">
              <td className="px-2 py-1.5 font-medium">{deal.stakerName}</td>
              <td className="px-2 py-1.5 font-mono">${deal.buyInAmount.toFixed(2)}</td>
              <td className="px-2 py-1.5">{deal.percentageSold}%</td>
              <td className="px-2 py-1.5">{deal.markup}x</td>
              <td className="px-2 py-1.5 font-mono">
                ${(deal.stakerInvestment ?? 0).toFixed(2)}
              </td>
              <td className="px-2 py-1.5">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    deal.status === "settled"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber-500/10 text-amber-500"
                  )}
                >
                  {deal.status}
                </span>
              </td>
              <td className="px-2 py-1.5 font-mono">
                {deal.playerNetAfterStaking !== null ? (
                  <span
                    className={cn(
                      deal.playerNetAfterStaking >= 0
                        ? "text-emerald-500"
                        : "text-red-500"
                    )}
                  >
                    ${deal.playerNetAfterStaking.toFixed(2)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-2 py-1.5">
                <div className="flex gap-1">
                  {deal.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-5 text-[10px] px-1.5"
                      onClick={() => onSettle(deal.id)}
                    >
                      Settle
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(deal.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
