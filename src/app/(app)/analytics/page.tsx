/**
 * Analytics dashboard page.
 *
 * Displays summary stats, cumulative P&L chart, and ROI breakdowns
 * by site, game type, and buy-in bracket. Supports date range filtering.
 *
 * @page /analytics
 */
"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { StatsCards } from "@/components/analytics/StatsCards";

// Lazy-load chart components to avoid loading recharts in the main bundle
const BankrollChart = lazy(() =>
  import("@/components/analytics/BankrollChart").then((m) => ({ default: m.BankrollChart }))
);
const ROIBreakdown = lazy(() =>
  import("@/components/analytics/ROIBreakdown").then((m) => ({ default: m.ROIBreakdown }))
);
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnalyticsSummary } from "@/lib/analytics/calculations";
import { Spade, ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface BreakdownItem {
  group: string;
  count: number;
  invested: number;
  profit: number;
  roi: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  timeline: { date: string; cumulative: number; daily: number }[];
  bySite: BreakdownItem[];
  byGameType: BreakdownItem[];
  byBuyIn: BreakdownItem[];
}

const defaultSummary: AnalyticsSummary = {
  totalTournaments: 0,
  totalInvested: 0,
  totalPayout: 0,
  totalBounties: 0,
  netProfit: 0,
  roi: 0,
  itmCount: 0,
  itmPercent: 0,
  avgBuyIn: 0,
  avgFinish: null,
  bestFinish: null,
  longestWinStreak: 0,
  longestLossStreak: 0,
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    summary: defaultSummary,
    timeline: [],
    bySite: [],
    byGameType: [],
    byBuyIn: [],
  });
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/analytics?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const d = await res.json();
      setData(d);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
          <Spade className="h-4 w-4 text-primary" />
        </Link>
        <BarChart3 className="h-4 w-4 text-primary" />
        <h1 className="text-lg font-bold">Analytics</h1>

        {/* Date filters */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-xs w-36"
            />
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Loading analytics…
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <StatsCards summary={data.summary} />

            {/* Bankroll chart (lazy-loaded with recharts) */}
            <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading chart…</div>}>
              <div className="p-4 rounded-lg border border-border bg-card">
                <h3 className="text-sm font-semibold mb-3">Cumulative P&L</h3>
                <BankrollChart data={data.timeline} />
              </div>

              {/* Breakdowns */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border bg-card">
                  <ROIBreakdown data={data.bySite} title="By Site" />
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <ROIBreakdown data={data.byGameType} title="By Game Type" />
                </div>
              </div>

              {/* Buy-in breakdown */}
              <div className="p-4 rounded-lg border border-border bg-card">
                <ROIBreakdown data={data.byBuyIn} title="By Buy-in Bracket" />
              </div>
            </Suspense>
          </>
        )}
      </main>
    </div>
  );
}
