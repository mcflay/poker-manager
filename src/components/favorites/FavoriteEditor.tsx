/**
 * Favorite editor popover component.
 *
 * Allows editing a favorite's color, priority, and notes inline.
 * Appears as a popover when clicking the star icon in the tournament table.
 *
 * @component FavoriteEditor
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FavoriteInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

const COLORS = [
  { name: "Yellow", value: "yellow", cls: "bg-yellow-400" },
  { name: "Red", value: "red", cls: "bg-red-400" },
  { name: "Green", value: "green", cls: "bg-green-400" },
  { name: "Blue", value: "blue", cls: "bg-blue-400" },
  { name: "Purple", value: "purple", cls: "bg-purple-400" },
  { name: "Orange", value: "orange", cls: "bg-orange-400" },
];

const PRIORITIES = [
  { label: "Low", value: 0 },
  { label: "Medium", value: 1 },
  { label: "High", value: 2 },
];

interface FavoriteEditorProps {
  tournamentId: string;
  favorite?: FavoriteInfo | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function FavoriteEditor({
  tournamentId,
  favorite,
  onClose,
  onUpdated,
}: FavoriteEditorProps) {
  const [color, setColor] = useState(favorite?.color || "yellow");
  const [priority, setPriority] = useState(favorite?.priority ?? 0);
  const [notes, setNotes] = useState(favorite?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId, color, priority, notes: notes || null }),
      });

      if (!res.ok) throw new Error("Failed to update");
      toast.success("Favorite updated");
      onUpdated?.();
      onClose();
    } catch {
      toast.error("Failed to update favorite");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg p-3 space-y-3">
      {/* Color */}
      <div className="space-y-1">
        <Label className="text-xs">Color</Label>
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-transform",
                c.cls,
                color === c.value && "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110"
              )}
            >
              {color === c.value && <Check className="h-3 w-3 text-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div className="space-y-1">
        <Label className="text-xs">Priority</Label>
        <div className="flex gap-1.5">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              onClick={() => setPriority(p.value)}
              className={cn(
                "px-2 py-1 text-xs rounded border transition-colors",
                priority === p.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Reminder…"
          className="h-7 text-xs"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs flex-1">
          {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onClose} className="h-7 text-xs">
          Cancel
        </Button>
      </div>
    </div>
  );
}
