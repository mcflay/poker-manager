/**
 * Summary stat cards for the analytics dashboard.
 *
 * Displays key metrics: tournaments played, total invested, net profit,
 * ROI%, ITM%, average buy-in, best finish, and streaks.
 *
 * @component StatsCards
 */
"use client";

import { AnalyticsSummary } from "@/lib/analytics/calculations";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Target, Trophy, Flame } from "lucide-react";

interface StatsCardsProps {
  summary: AnalyticsSummary;
}

export function StatsCards({ summary }: StatsCardsProps) {
  const cards = [
    {
      label: "Tournaments",
      value: summary.totalTournaments.toString(),
      icon: Target,
    },
    {
      label: "Invested",
      value: `$${summary.totalInvested.toFixed(0)}`,
      sub: `Avg $${summary.avgBuyIn.toFixed(0)}`,
    },
    {
      label: "Net Profit",
      value: `${summary.netProfit >= 0 ? "+" : ""}$${summary.netProfit.toFixed(0)}`,
      color: summary.netProfit >= 0 ? "text-green-400" : "text-red-400",
      icon: summary.netProfit >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: "ROI",
      value: `${summary.roi.toFixed(1)}%`,
      color: summary.roi >= 0 ? "text-green-400" : "text-red-400",
    },
    {
      label: "ITM Rate",
      value: `${summary.itmPercent.toFixed(0)}%`,
      sub: `${summary.itmCount}/${summary.totalTournaments}`,
    },
    {
      label: "Best Finish",
      value: summary.bestFinish ? `#${summary.bestFinish}` : "-",
      icon: Trophy,
    },
    {
      label: "Win Streak",
      value: summary.longestWinStreak.toString(),
      color: "text-green-400",
      icon: Flame,
    },
    {
      label: "Loss Streak",
      value: summary.longestLossStreak.toString(),
      color: "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="p-3 rounded-lg border border-border bg-card"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{card.label}</span>
            {card.icon && <card.icon className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          <p className={cn("text-xl font-bold tabular-nums", card.color)}>
            {card.value}
          </p>
          {card.sub && (
            <p className="text-[10px] text-muted-foreground">{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
