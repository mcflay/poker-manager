/**
 * Main schedule page — the primary view of the application.
 *
 * Displays a filterable, sortable table of poker tournaments with:
 * - Collapsible sidebar with filter controls
 * - Search bar for tournament name filtering
 * - Auto-refresh every 5 minutes
 * - Favorite toggle with optimistic updates
 * - Import button for loading scraper data
 *
 * All tournament data is fetched from /api/tournaments with query
 * parameters built from the current filter state in Zustand.
 *
 * @page /
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
import { Tournament, FilterState } from "@/lib/types";
import { TournamentTable } from "@/components/tournament-table/TournamentTable";
import { FilterPanel } from "@/components/filter-panel/FilterPanel";
import { ImportButton } from "@/components/import-wizard/ImportButton";
import { UserMenu } from "@/components/auth/UserMenu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Search,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  Spade,
  Clock,
  Trophy,
  CalendarDays,
  BarChart3,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Site {
  id: string;
  name: string;
}

/**
 * Convert the current FilterState into URL query parameters.
 *
 * Multi-value filters (sites, gameTypes, etc.) are appended as
 * repeated query params. Null values are omitted entirely.
 */
function buildQueryString(filters: FilterState): string {
  const params = new URLSearchParams();
  filters.sites.forEach((s) => params.append("site", s));
  if (filters.buyInMin !== null) params.set("buyInMin", String(filters.buyInMin));
  if (filters.buyInMax !== null) params.set("buyInMax", String(filters.buyInMax));
  filters.gameTypes.forEach((g) => params.append("gameType", g));
  filters.formats.forEach((f) => params.append("format", f));
  filters.speeds.forEach((s) => params.append("speed", s));
  filters.structures.forEach((s) => params.append("structure", s));
  filters.tournamentTypes.forEach((t) => params.append("tournamentType", t));
  filters.statuses.forEach((s) => params.append("status", s));
  if (filters.search) params.set("search", filters.search);
  if (filters.guaranteeMin !== null) params.set("guaranteeMin", String(filters.guaranteeMin));
  if (filters.timeWindowHours !== null) params.set("timeWindowHours", String(filters.timeWindowHours));
  if (filters.showFavoritesOnly) params.set("favoritesOnly", "true");
  return params.toString();
}

export default function SchedulePage() {
  const { filters, setFilters, sidebarOpen, setSidebarOpen, favorites, toggleFavorite, setFavorites } =
    useAppStore();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTournaments = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      try {
        const qs = buildQueryString(filters);
        const res = await fetch(`/api/tournaments?${qs}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setTournaments(data.tournaments);
        setLastRefresh(new Date());
      } catch {
        toast.error("Failed to load tournaments");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters]
  );

  // Initial load + filter changes
  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  // Load sites
  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((d) => setSites(d.sites || []))
      .catch(() => {});
  }, []);

  // Load favorites
  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => setFavorites(d.favorites || []))
      .catch(() => {});
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    autoRefreshRef.current = setInterval(() => {
      fetchTournaments(true);
    }, 5 * 60 * 1000);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [fetchTournaments]);

  const handleToggleFavorite = async (id: string) => {
    toggleFavorite(id);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: id }),
      });
      const data = await res.json();
      toast.success(data.favorited ? "Added to favorites" : "Removed from favorites");
    } catch {
      toggleFavorite(id); // revert
      toast.error("Failed to update favorites");
    }
  };

  const upcomingCount = tournaments.filter((t) => {
    const diff = new Date(t.startTime).getTime() - Date.now();
    return diff > 0 && diff < 60 * 60 * 1000;
  }).length;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "shrink-0 border-r border-border bg-card transition-all duration-200 overflow-hidden",
          sidebarOpen ? "w-56" : "w-0"
        )}
      >
        {sidebarOpen && (
          <FilterPanel sites={sites} className="h-full" />
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>

          {/* Logo & Nav */}
          <div className="flex items-center gap-2 mr-2">
            <Spade className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">PokerSchedule</span>
          </div>
          <Link
            href="/results"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Trophy className="h-3.5 w-3.5" />
            Results
          </Link>
          <Link
            href="/schedule"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            My Schedule
          </Link>
          <Link
            href="/analytics"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </Link>
          <Link
            href="/bankroll"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Wallet className="h-3.5 w-3.5" />
            Bankroll
          </Link>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              placeholder="Search tournaments…"
              className="pl-8 h-8 text-sm bg-background"
            />
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{tournaments.length}</span> shown
            </span>
            {upcomingCount > 0 && (
              <Badge variant="outline" className="text-xs border-yellow-500/40 text-yellow-400 gap-1">
                <Clock className="h-3 w-3" />
                {upcomingCount} starting soon
              </Badge>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {lastRefresh && (
              <span className="hidden lg:block text-xs text-muted-foreground">
                {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchTournaments(true)}
              disabled={refreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </Button>
            <ImportButton onImported={() => fetchTournaments(true)} />
            <UserMenu />
          </div>
        </header>

        {/* Table */}
        <main className="flex-1 overflow-auto">
          <TournamentTable
            data={tournaments}
            onToggleFavorite={handleToggleFavorite}
            favSet={favorites}
            isLoading={loading}
          />
        </main>
      </div>
    </div>
  );
}
