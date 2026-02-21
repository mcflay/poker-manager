/**
 * Filter panel component — sidebar for tournament filtering.
 *
 * Provides collapsible sections for each filter dimension:
 * Time Window, Site, Buy-in (with presets), Game Type, Format,
 * Speed, Structure, Tournament Type, Min Guarantee, and Favorites.
 *
 * Filter state is stored in the Zustand app store and applied
 * to the tournament API query on every change.
 *
 * @component FilterPanel
 */
"use client";

import { useFilters, useSetFilters, useResetFilters } from "@/stores/app-store";
import { FilterState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { SavedProfiles } from "./SavedProfiles";

interface Site {
  id: string;
  name: string;
}

interface FilterPanelProps {
  sites: Site[];
  className?: string;
}

const GAME_TYPES = ["NLHE", "PLO", "PLO5", "PLO6", "HORSE", "Short Deck"];
const FORMATS = ["MTT", "SNG", "Satellite", "Spin&Go"];
const SPEEDS = ["hyper", "turbo", "regular", "deep"];
const STRUCTURES = ["freezeout", "reentry", "rebuy", "pko", "mystery_bounty"];
const TOURNAMENT_TYPES = ["Bounty", "Hyper", "Turbo", "Deepstack", "Mystery", "Satellite", "Freeroll", "Super", "Main Event"];
const TIME_WINDOWS = [
  { label: "Next 1h", value: 1 },
  { label: "Next 3h", value: 3 },
  { label: "Next 6h", value: 6 },
  { label: "Next 12h", value: 12 },
  { label: "Next 24h", value: 24 },
  { label: "All", value: null },
];

const BUY_IN_PRESETS = [
  { label: "Micro (<$5)", min: 0, max: 5 },
  { label: "Low ($5–$30)", min: 5, max: 30 },
  { label: "Mid ($30–$100)", min: 30, max: 100 },
  { label: "High ($100+)", min: 100, max: null },
];

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-3 mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-semibold text-foreground mb-2 hover:text-primary transition-colors"
      >
        {title}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && children}
    </div>
  );
}

function MultiCheckbox({
  options,
  selected,
  onToggle,
  labelFn,
}: {
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  labelFn?: (val: string) => string;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <div key={opt} className="flex items-center gap-2">
          <Checkbox
            id={`chk-${opt}`}
            checked={selected.includes(opt)}
            onCheckedChange={() => onToggle(opt)}
            className="h-3.5 w-3.5"
          />
          <Label htmlFor={`chk-${opt}`} className="text-xs text-muted-foreground cursor-pointer capitalize">
            {labelFn ? labelFn(opt) : opt}
          </Label>
        </div>
      ))}
    </div>
  );
}

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

export function FilterPanel({ sites, className }: FilterPanelProps) {
  const filters = useFilters();
  const setFilters = useSetFilters();
  const resetFilters = useResetFilters();

  const activeCount = [
    filters.sites.length > 0,
    filters.buyInMin !== null || filters.buyInMax !== null,
    filters.gameTypes.length > 0,
    filters.formats.length > 0,
    filters.speeds.length > 0,
    filters.structures.length > 0,
    filters.tournamentTypes.length > 0,
    filters.guaranteeMin !== null,
    filters.statuses.length > 0,
    filters.timeWindowHours !== null,
    filters.showFavoritesOnly,
  ].filter(Boolean).length;

  return (
    <aside className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Filters</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              {activeCount}
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0">
        {/* Saved Profiles */}
        <Section title="Saved Profiles" defaultOpen={false}>
          <SavedProfiles />
        </Section>

        {/* Time Window */}
        <Section title="Time Window">
          <div className="flex flex-wrap gap-1.5">
            {TIME_WINDOWS.map((tw) => (
              <button
                key={String(tw.value)}
                onClick={() => setFilters({ timeWindowHours: tw.value })}
                className={cn(
                  "px-2 py-1 text-xs rounded-md border transition-colors",
                  filters.timeWindowHours === tw.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                )}
              >
                {tw.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Sites */}
        {sites.length > 0 && (
          <Section title="Site">
            <MultiCheckbox
              options={sites.map((s) => s.id)}
              selected={filters.sites}
              onToggle={(s) => setFilters({ sites: toggle(filters.sites, s) })}
              labelFn={(id) => sites.find((s) => s.id === id)?.name || id}
            />
          </Section>
        )}

        {/* Buy-in */}
        <Section title="Buy-in">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {BUY_IN_PRESETS.map((p) => {
                const active = filters.buyInMin === p.min && filters.buyInMax === p.max;
                return (
                  <button
                    key={p.label}
                    onClick={() =>
                      active
                        ? setFilters({ buyInMin: null, buyInMax: null })
                        : setFilters({ buyInMin: p.min, buyInMax: p.max })
                    }
                    className={cn(
                      "px-2 py-1 text-xs rounded-md border transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min $"
                value={filters.buyInMin ?? ""}
                onChange={(e) =>
                  setFilters({ buyInMin: e.target.value ? Number(e.target.value) : null })
                }
                className="h-7 text-xs"
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="number"
                placeholder="Max $"
                value={filters.buyInMax ?? ""}
                onChange={(e) =>
                  setFilters({ buyInMax: e.target.value ? Number(e.target.value) : null })
                }
                className="h-7 text-xs"
              />
            </div>
          </div>
        </Section>

        {/* Game Type */}
        <Section title="Game Type">
          <MultiCheckbox
            options={GAME_TYPES}
            selected={filters.gameTypes}
            onToggle={(g) => setFilters({ gameTypes: toggle(filters.gameTypes, g) })}
          />
        </Section>

        {/* Format */}
        <Section title="Format">
          <MultiCheckbox
            options={FORMATS}
            selected={filters.formats}
            onToggle={(f) => setFilters({ formats: toggle(filters.formats, f) })}
          />
        </Section>

        {/* Speed */}
        <Section title="Speed">
          <MultiCheckbox
            options={SPEEDS}
            selected={filters.speeds}
            onToggle={(s) => setFilters({ speeds: toggle(filters.speeds, s) })}
          />
        </Section>

        {/* Structure */}
        <Section title="Structure">
          <MultiCheckbox
            options={STRUCTURES}
            selected={filters.structures}
            onToggle={(s) => setFilters({ structures: toggle(filters.structures, s) })}
            labelFn={(s) => s.replace(/_/g, " ")}
          />
        </Section>

        {/* Tournament Type */}
        <Section title="Type" defaultOpen={false}>
          <MultiCheckbox
            options={TOURNAMENT_TYPES}
            selected={filters.tournamentTypes}
            onToggle={(t) => setFilters({ tournamentTypes: toggle(filters.tournamentTypes, t) })}
          />
        </Section>

        {/* Guarantee */}
        <Section title="Min Guarantee" defaultOpen={false}>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground">$</span>
            <Input
              type="number"
              placeholder="0"
              value={filters.guaranteeMin ?? ""}
              onChange={(e) =>
                setFilters({ guaranteeMin: e.target.value ? Number(e.target.value) : null })
              }
              className="h-7 text-xs"
            />
          </div>
        </Section>

        {/* Favorites */}
        <Section title="My Tournaments" defaultOpen={false}>
          <div className="flex items-center gap-2">
            <Checkbox
              id="fav-only"
              checked={filters.showFavoritesOnly}
              onCheckedChange={(v) => setFilters({ showFavoritesOnly: Boolean(v) })}
            />
            <Label htmlFor="fav-only" className="text-xs text-muted-foreground cursor-pointer">
              Favorites only
            </Label>
          </div>
        </Section>
      </div>
    </aside>
  );
}
