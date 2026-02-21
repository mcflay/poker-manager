/**
 * Tests for the Zustand application store.
 *
 * Verifies that store actions correctly update state,
 * including filters, favorites, sidebar, and import tracking.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../app-store";
import { DEFAULT_FILTERS } from "@/lib/types";

describe("useAppStore", () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useAppStore.setState({
      filters: { ...DEFAULT_FILTERS },
      sidebarOpen: true,
      favorites: new Set(),
      lastImport: null,
    });
  });

  describe("filters", () => {
    it("starts with default filters", () => {
      const state = useAppStore.getState();
      expect(state.filters).toEqual(DEFAULT_FILTERS);
    });

    it("setFilters merges partial updates", () => {
      useAppStore.getState().setFilters({ search: "sunday" });
      expect(useAppStore.getState().filters.search).toBe("sunday");
      // Other filters remain unchanged
      expect(useAppStore.getState().filters.sites).toEqual([]);
    });

    it("setFilters updates multiple fields at once", () => {
      useAppStore.getState().setFilters({
        sites: ["ggpoker"],
        buyInMin: 10,
        buyInMax: 100,
      });
      const { filters } = useAppStore.getState();
      expect(filters.sites).toEqual(["ggpoker"]);
      expect(filters.buyInMin).toBe(10);
      expect(filters.buyInMax).toBe(100);
    });

    it("resetFilters restores defaults", () => {
      useAppStore.getState().setFilters({
        search: "test",
        sites: ["gg"],
        buyInMin: 50,
      });
      useAppStore.getState().resetFilters();
      expect(useAppStore.getState().filters).toEqual(DEFAULT_FILTERS);
    });
  });

  describe("sidebar", () => {
    it("starts open", () => {
      expect(useAppStore.getState().sidebarOpen).toBe(true);
    });

    it("can be toggled closed", () => {
      useAppStore.getState().setSidebarOpen(false);
      expect(useAppStore.getState().sidebarOpen).toBe(false);
    });

    it("can be toggled back open", () => {
      useAppStore.getState().setSidebarOpen(false);
      useAppStore.getState().setSidebarOpen(true);
      expect(useAppStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe("favorites", () => {
    it("starts with empty set", () => {
      expect(useAppStore.getState().favorites.size).toBe(0);
    });

    it("toggleFavorite adds a new favorite", () => {
      useAppStore.getState().toggleFavorite("tour_123");
      expect(useAppStore.getState().favorites.has("tour_123")).toBe(true);
    });

    it("toggleFavorite removes an existing favorite", () => {
      useAppStore.getState().toggleFavorite("tour_123");
      useAppStore.getState().toggleFavorite("tour_123");
      expect(useAppStore.getState().favorites.has("tour_123")).toBe(false);
    });

    it("setFavorites bulk-sets from array", () => {
      useAppStore.getState().setFavorites(["a", "b", "c"]);
      const favs = useAppStore.getState().favorites;
      expect(favs.size).toBe(3);
      expect(favs.has("a")).toBe(true);
      expect(favs.has("b")).toBe(true);
      expect(favs.has("c")).toBe(true);
    });

    it("setFavorites replaces existing favorites", () => {
      useAppStore.getState().setFavorites(["old"]);
      useAppStore.getState().setFavorites(["new1", "new2"]);
      const favs = useAppStore.getState().favorites;
      expect(favs.has("old")).toBe(false);
      expect(favs.size).toBe(2);
    });
  });

  describe("lastImport", () => {
    it("starts as null", () => {
      expect(useAppStore.getState().lastImport).toBeNull();
    });

    it("setLastImport records timestamp", () => {
      const ts = "2025-02-16T18:00:00Z";
      useAppStore.getState().setLastImport(ts);
      expect(useAppStore.getState().lastImport).toBe(ts);
    });
  });
});
