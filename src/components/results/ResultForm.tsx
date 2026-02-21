/**
 * Result logging form component.
 *
 * Allows users to record a tournament result by selecting a tournament,
 * entering entries, finish position, payout, and bounties. Computes
 * net result automatically. Supports creating new sessions.
 *
 * @component ResultForm
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tournament, Session } from "@/lib/types";
import { Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";

interface ResultFormProps {
  /** Pre-selected tournament (when logging from tournament table) */
  tournament?: Tournament | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function ResultForm({ tournament, onSaved, onCancel }: ResultFormProps) {
  const [tournamentId, setTournamentId] = useState(tournament?.id || "");
  const [tournamentSearch, setTournamentSearch] = useState(tournament?.name || "");
  const [searchResults, setSearchResults] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(
    tournament || null
  );
  const [entries, setEntries] = useState(1);
  const [totalInvested, setTotalInvested] = useState(
    tournament ? tournament.buyIn : 0
  );
  const [finishPosition, setFinishPosition] = useState<number | "">("");
  const [totalEntriesAtFinish, setTotalEntriesAtFinish] = useState<number | "">("");
  const [payout, setPayout] = useState(0);
  const [bountiesWon, setBountiesWon] = useState(0);
  const [notes, setNotes] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  // Load sessions
  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []))
      .catch(() => {});
  }, []);

  // Search tournaments on input
  useEffect(() => {
    if (!tournamentSearch || selectedTournament) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/tournaments?search=${encodeURIComponent(tournamentSearch)}`
        );
        const data = await res.json();
        setSearchResults(data.tournaments?.slice(0, 10) || []);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [tournamentSearch, selectedTournament]);

  // Update totalInvested when entries change
  useEffect(() => {
    if (selectedTournament) {
      setTotalInvested(selectedTournament.buyIn * entries);
    }
  }, [entries, selectedTournament]);

  const netResult = payout + bountiesWon - totalInvested;

  const handleSelectTournament = (t: Tournament) => {
    setSelectedTournament(t);
    setTournamentId(t.id);
    setTournamentSearch(t.name);
    setTotalInvested(t.buyIn * entries);
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId) {
      toast.error("Please select a tournament");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          entries,
          totalInvested,
          finishPosition: finishPosition || null,
          totalEntriesAtFinish: totalEntriesAtFinish || null,
          payout,
          bountiesWon,
          notes: notes || null,
          sessionId: sessionId || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save result");

      toast.success("Result saved");
      onSaved?.();
    } catch {
      toast.error("Failed to save result");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">Log Result</h3>
      </div>

      {/* Tournament Search */}
      {!tournament && (
        <div className="space-y-2">
          <Label htmlFor="tournament-search">Tournament</Label>
          <div className="relative">
            <Input
              id="tournament-search"
              value={tournamentSearch}
              onChange={(e) => {
                setTournamentSearch(e.target.value);
                setSelectedTournament(null);
                setTournamentId("");
              }}
              placeholder="Search for a tournament…"
            />
            {searchResults.length > 0 && !selectedTournament && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTournament(t)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b border-border/50 last:border-0"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground ml-2">
                      ${t.buyIn} · {t.siteName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedTournament && (
            <p className="text-xs text-muted-foreground">
              {selectedTournament.siteName} · ${selectedTournament.buyIn} ·{" "}
              {selectedTournament.gameType}
            </p>
          )}
        </div>
      )}

      {/* Entries & Investment */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="entries">Entries</Label>
          <Input
            id="entries"
            type="number"
            min={1}
            value={entries}
            onChange={(e) => setEntries(Number(e.target.value) || 1)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="invested">Total Invested</Label>
          <Input
            id="invested"
            type="number"
            step="0.01"
            value={totalInvested}
            onChange={(e) => setTotalInvested(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="finish">Finish Position</Label>
          <Input
            id="finish"
            type="number"
            min={1}
            value={finishPosition}
            onChange={(e) =>
              setFinishPosition(e.target.value ? Number(e.target.value) : "")
            }
            placeholder="e.g., 15"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="field-size">Field Size</Label>
          <Input
            id="field-size"
            type="number"
            min={1}
            value={totalEntriesAtFinish}
            onChange={(e) =>
              setTotalEntriesAtFinish(e.target.value ? Number(e.target.value) : "")
            }
            placeholder="e.g., 1000"
          />
        </div>
      </div>

      {/* Payout & Bounties */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="payout">Payout</Label>
          <Input
            id="payout"
            type="number"
            step="0.01"
            min={0}
            value={payout}
            onChange={(e) => setPayout(Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bounties">Bounties Won</Label>
          <Input
            id="bounties"
            type="number"
            step="0.01"
            min={0}
            value={bountiesWon}
            onChange={(e) => setBountiesWon(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Net Result Display */}
      <div className="text-center py-2">
        <span className="text-xs text-muted-foreground">Net Result: </span>
        <span
          className={`text-lg font-bold tabular-nums ${
            netResult > 0
              ? "text-green-400"
              : netResult < 0
              ? "text-red-400"
              : "text-foreground"
          }`}
        >
          {netResult >= 0 ? "+" : ""}${netResult.toFixed(2)}
        </span>
      </div>

      {/* Session */}
      <div className="space-y-1">
        <Label htmlFor="session">Session (optional)</Label>
        <select
          id="session"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">No session</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || s.date}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Key hands, observations…"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading || !tournamentId} className="flex-1">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Result
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
