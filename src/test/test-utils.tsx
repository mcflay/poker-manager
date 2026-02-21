/**
 * Custom render function for React component tests.
 *
 * Wraps the standard React Testing Library render with application
 * providers and resets the Zustand store between tests to prevent
 * state leaking across test cases.
 */

import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";
import { DEFAULT_FILTERS } from "@/lib/types";

/**
 * Reset the Zustand store to its initial state.
 * Call this in beforeEach or at the start of tests that modify store state.
 */
export function resetStore() {
  useAppStore.setState({
    filters: DEFAULT_FILTERS,
    sidebarOpen: true,
    favorites: new Set(),
    lastImport: null,
  });
}

/**
 * Custom render that wraps components with application providers.
 * Currently renders without additional providers since Zustand
 * doesn't need a React context wrapper.
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  resetStore();
  return render(ui, { ...options });
}

// Re-export everything from RTL
export * from "@testing-library/react";

// Override the default render with our custom one
export { customRender as render };
