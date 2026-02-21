/**
 * Session manager component.
 *
 * Allows users to create and view playing sessions that group
 * multiple tournament results together. Shows session summary
 * stats (count, invested, net P&L).
 *
 * @component SessionManager
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, CalendarDays, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SessionManagerProps {
  sessions: Session[];
  selectedSessionId?: string;
  onSelect?: (sessionId: string) => void;
  onCreated?: () => void;
}

export function SessionManager({
  sessions,
  selectedSessionId,
  onSelect,
  onCreated,
}: SessionManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setLoading(true);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, date, notes: notes || null }),
      });

      if (!res.ok) throw new Error("Failed to create session");

      toast.success("Session created");
      setShowForm(false);
      setName("");
      setNotes("");
      onCreated?.();
    } catch {
      toast.error("Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-primary" />
          Sessions
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="h-7 px-2 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          New
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-2 p-3 border border-border rounded-md bg-card">
          <div className="space-y-1">
            <Label htmlFor="session-name" className="text-xs">Name</Label>
            <Input
              id="session-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sunday Grind"
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="session-date" className="text-xs">Date</Label>
            <Input
              id="session-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-7 text-xs"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading} className="h-7 text-xs flex-1">
              {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Create
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-1">
        <button
          onClick={() => onSelect?.("")}
          className={cn(
            "w-full text-left px-3 py-2 text-xs rounded-md transition-colors",
            !selectedSessionId
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          All Results
        </button>
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect?.(s.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md transition-colors",
              selectedSessionId === s.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{s.name || s.date}</span>
              {s.resultCount !== undefined && s.resultCount > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {s.resultCount} games
                </span>
              )}
            </div>
            {s.netResult !== undefined && s.netResult !== 0 && (
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  s.netResult >= 0 ? "text-green-400" : "text-red-400"
                )}
              >
                {s.netResult >= 0 ? "+" : ""}${s.netResult.toFixed(2)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
