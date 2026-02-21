/**
 * My Schedule page — favorites-only view of upcoming tournaments.
 *
 * Shows only favorited tournaments sorted by start time with
 * color indicators, priority, and countdown timers.
 *
 * @page /schedule
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Tournament, FavoriteInfo } from "@/lib/types";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Spade, ArrowLeft, Star, Clock, RefreshCw } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { toast } from "sonner";

function formatStartTime(iso: string) {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return formatInTimeZone(new Date(iso), tz, "EEE, dd MMM HH:mm");
  } catch {
    return iso;
  }
}

function timeUntil(iso: string): { text: string; urgent: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return { text: "Started", urgent: false };
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { text: `${mins}m`, urgent: mins < 15 };
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return { text: `${hours}h ${rem}m`, urgent: false };
}

const COLOR_MAP: Record<string, string> = {
  yellow: "border-l-yellow-400",
  red: "border-l-red-400",
  green: "border-l-green-400",
  blue: "border-l-blue-400",
  purple: "border-l-purple-400",
  orange: "border-l-orange-400",
};

const STAR_COLOR_MAP: Record<string, string> = {
  yellow: "fill-yellow-400 text-yellow-400",
  red: "fill-red-400 text-red-400",
  green: "fill-green-400 text-green-400",
  blue: "fill-blue-400 text-blue-400",
  purple: "fill-purple-400 text-purple-400",
  orange: "fill-orange-400 text-orange-400",
};

export default function MySchedulePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [favoriteDetails, setFavoriteDetails] = useState<FavoriteInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tourRes, favRes] = await Promise.all([
        fetch("/api/tournaments?favoritesOnly=true"),
        fetch("/api/favorites"),
      ]);

      const tourData = await tourRes.json();
      const favData = await favRes.json();

      setTournaments(tourData.tournaments || []);
      setFavoriteDetails(favData.favoriteDetails || []);
    } catch {
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getFavInfo = (tournamentId: string) =>
    favoriteDetails.find((f) => f.tournamentId === tournamentId);

  // Sort by priority (high first), then start time
  const sorted = [...tournaments].sort((a, b) => {
    const pa = getFavInfo(a.id)?.priority ?? 0;
    const pb = getFavInfo(b.id)?.priority ?? 0;
    if (pb !== pa) return pb - pa;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Link href="/" className="flex items-center gap-2">
          <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
          <Spade className="h-4 w-4 text-primary" />
        </Link>
        <h1 className="text-lg font-bold">My Schedule</h1>
        <Badge variant="outline" className="text-xs">
          {tournaments.length} tournaments
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
          <UserMenu />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Loading schedule…
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
            <Star className="h-8 w-8 opacity-30" />
            <p className="text-sm">No favorites yet</p>
            <p className="text-xs">
              Star tournaments on the{" "}
              <Link href="/" className="text-primary hover:underline">
                schedule page
              </Link>{" "}
              to see them here
            </p>
          </div>
        ) : (
          sorted.map((t) => {
            const fav = getFavInfo(t.id);
            const { text, urgent } = timeUntil(t.startTime);
            const borderColor = COLOR_MAP[fav?.color || "yellow"] || COLOR_MAP.yellow;
            const starColor = STAR_COLOR_MAP[fav?.color || "yellow"] || STAR_COLOR_MAP.yellow;

            return (
              <div
                key={t.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border border-border bg-card border-l-4 transition-colors hover:bg-muted/30",
                  borderColor
                )}
              >
                <Star className={cn("h-4 w-4 mt-0.5 shrink-0", starColor)} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium leading-tight">{t.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.siteName} · {t.gameType} · ${t.buyIn}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-foreground">{formatStartTime(t.startTime)}</p>
                      <p
                        className={cn(
                          "text-xs",
                          urgent ? "text-red-400 font-semibold" : "text-muted-foreground"
                        )}
                      >
                        <Clock className="h-3 w-3 inline mr-0.5" />
                        {text}
                      </p>
                    </div>
                  </div>

                  {fav?.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {fav.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-1.5">
                    {t.guarantee > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        GTD ${t.guarantee >= 1000 ? `${(t.guarantee / 1000).toFixed(0)}K` : t.guarantee}
                      </Badge>
                    )}
                    {fav && fav.priority >= 2 && (
                      <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-400">
                        High Priority
                      </Badge>
                    )}
                    {fav && fav.priority === 1 && (
                      <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-400">
                        Medium
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
