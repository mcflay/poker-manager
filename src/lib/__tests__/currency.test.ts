/**
 * Tests for currency utility functions.
 *
 * Verifies formatting, symbol lookup, and conversion logic.
 */
import { describe, it, expect } from "vitest";
import {
  getCurrencySymbol,
  formatCurrency,
  convertCurrency,
  getSupportedCurrencies,
} from "@/lib/currency";

describe("currency utilities", () => {
  describe("getCurrencySymbol", () => {
    it("returns $ for USD", () => {
      expect(getCurrencySymbol("USD")).toBe("$");
    });

    it("returns \u20AC for EUR", () => {
      expect(getCurrencySymbol("EUR")).toBe("\u20AC");
    });

    it("returns \u00A3 for GBP", () => {
      expect(getCurrencySymbol("GBP")).toBe("\u00A3");
    });

    it("returns the code itself for unknown currencies", () => {
      expect(getCurrencySymbol("BTC")).toBe("BTC");
    });
  });

  describe("formatCurrency", () => {
    it("formats positive amounts", () => {
      expect(formatCurrency(100, "USD")).toBe("$100.00");
    });

    it("formats negative amounts with sign", () => {
      expect(formatCurrency(-50.5, "USD")).toBe("-$50.50");
    });

    it("formats with EUR symbol", () => {
      expect(formatCurrency(25, "EUR")).toBe("\u20AC25.00");
    });

    it("uses compact notation for large amounts", () => {
      expect(formatCurrency(1500, "USD", true)).toBe("$1.5k");
    });

    it("does not compact small amounts", () => {
      expect(formatCurrency(500, "USD", true)).toBe("$500.00");
    });

    it("defaults to USD", () => {
      expect(formatCurrency(10)).toBe("$10.00");
    });
  });

  describe("convertCurrency", () => {
    const rates: Record<string, number> = {
      "USD-EUR": 0.92,
      "EUR-USD": 1.09,
      "USD-GBP": 0.79,
    };

    it("returns same amount when currencies match", () => {
      expect(convertCurrency(100, "USD", "USD", rates)).toBe(100);
    });

    it("converts using direct rate", () => {
      expect(convertCurrency(100, "USD", "EUR", rates)).toBeCloseTo(92);
    });

    it("converts using reverse rate when direct not available", () => {
      expect(convertCurrency(100, "GBP", "USD", rates)).toBeCloseTo(100 / 0.79);
    });

    it("returns original amount when no rate available", () => {
      expect(convertCurrency(100, "USD", "BTC", rates)).toBe(100);
    });
  });

  describe("getSupportedCurrencies", () => {
    it("returns an array of currencies", () => {
      const currencies = getSupportedCurrencies();
      expect(currencies.length).toBeGreaterThan(0);
      expect(currencies[0]).toHaveProperty("code");
      expect(currencies[0]).toHaveProperty("symbol");
      expect(currencies[0]).toHaveProperty("name");
    });

    it("includes USD", () => {
      const currencies = getSupportedCurrencies();
      expect(currencies.find((c) => c.code === "USD")).toBeDefined();
    });
  });
});
