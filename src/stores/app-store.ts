/**
 * Global application state store using Zustand.
 *
 * Manages client-side state that needs to be shared across components:
 * - Filter state for tournament queries
 * - Sidebar visibility
 * - Favorite tournament IDs (optimistic updates)
 * - Last import timestamp (triggers data refresh)
 *
 * @module stores/app-store
 */

import { create } from "zustand";
import { FilterState, DEFAULT_FILTERS } from "@/lib/types";

/** Shape of the global application store */
interface AppStore {
  /** Current filter configuration applied to tournament queries */
  filters: FilterState;
  /** Merge partial filter updates into current filter state */
  setFilters: (filters: Partial<FilterState>) => void;
  /** Reset all filters to defaults (show everything) */
  resetFilters: () => void;

  /** Whether the left sidebar (filter panel) is expanded */
  sidebarOpen: boolean;
  /** Toggle sidebar visibility */
  setSidebarOpen: (open: boolean) => void;

  /** Set of favorited tournament IDs (for client-side highlight) */
  favorites: Set<string>;
  /** Toggle a tournament's favorite status (optimistic update) */
  toggleFavorite: (id: string) => void;
  /** Bulk-set favorites from API response */
  setFavorites: (ids: string[]) => void;

  /** ISO timestamp of the most recent import (null if none) */
  lastImport: string | null;
  /** Record when an import was performed */
  setLastImport: (ts: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  filters: DEFAULT_FILTERS,
  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  favorites: new Set(),
  toggleFavorite: (id) =>
    set((state) => {
      const next = new Set(state.favorites);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { favorites: next };
    }),
  setFavorites: (ids) => set({ favorites: new Set(ids) }),

  lastImport: null,
  setLastImport: (ts) => set({ lastImport: ts }),
}));
