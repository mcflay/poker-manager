/**
 * Global test setup for Vitest.
 *
 * Imports jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.)
 * and configures cleanup after each test.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Automatically unmount and clean up after each test
afterEach(() => {
  cleanup();
});
