/**
 * Saved filter profiles dropdown component.
 *
 * Allows users to save, load, and delete named filter configurations.
 * Integrates with the Zustand store to apply/capture filter state.
 *
 * @component SavedProfiles
 */
"use client";

import { useState, useEffect } from "react";
import { useFilters, useSetFilters } from "@/stores/app-store";
import { FilterProfile, FilterState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Save, Trash2, Loader2, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";

export function SavedProfiles() {
  const filters = useFilters();
  const setFilters = useSetFilters();
  const [profiles, setProfiles] = useState<FilterProfile[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/filter-profiles");
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch {}
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);

    try {
      const res = await fetch("/api/filter-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveName, filters }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success(`Profile "${saveName}" saved`);
      setSaveName("");
      setShowSave(false);
      fetchProfiles();
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = (profile: FilterProfile) => {
    setFilters(profile.filters);
    toast.success(`Loaded "${profile.name}"`);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await fetch(`/api/filter-profiles/${id}`, { method: "DELETE" });
      toast.success(`Deleted "${name}"`);
      fetchProfiles();
    } catch {
      toast.error("Failed to delete profile");
    }
  };

  return (
    <div className="space-y-2">
      {/* Profile list */}
      {profiles.length > 0 && (
        <div className="space-y-1">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1 group"
            >
              <button
                onClick={() => handleLoad(p)}
                className="flex-1 text-left text-xs text-muted-foreground hover:text-foreground transition-colors truncate px-2 py-1 rounded hover:bg-muted/50"
              >
                {p.name}
              </button>
              <button
                onClick={() => handleDelete(p.id, p.name)}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-400 transition-all"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Save form */}
      {showSave ? (
        <div className="flex gap-1.5">
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Profile name…"
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={saving || !saveName.trim()}
            className="h-7 px-2"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSave(true)}
          className="h-7 px-2 text-xs w-full justify-start text-muted-foreground"
        >
          <BookmarkPlus className="h-3 w-3 mr-1.5" />
          Save current filters
        </Button>
      )}
    </div>
  );
}
