/**
 * Tests for CSV export utility.
 *
 * Verifies data-to-CSV conversion and column filtering.
 */
import { describe, it, expect } from "vitest";
import { toCSV } from "@/lib/export/csv";

describe("toCSV", () => {
  it("converts objects to CSV with headers", () => {
    const data = [
      { name: "Tournament A", buyIn: 10, site: "GGPoker" },
      { name: "Tournament B", buyIn: 25, site: "WPT" },
    ];
    const csv = toCSV(data);
    const lines = csv.split(/\r?\n/);

    expect(lines[0]).toBe("name,buyIn,site");
    expect(lines[1]).toContain("Tournament A");
    expect(lines[2]).toContain("Tournament B");
  });

  it("filters to specified columns", () => {
    const data = [
      { name: "Test", buyIn: 10, extra: "ignore" },
    ];
    const csv = toCSV(data, ["name", "buyIn"]);
    const lines = csv.split(/\r?\n/);

    expect(lines[0]).toBe("name,buyIn");
    expect(csv).not.toContain("extra");
  });

  it("returns empty string for empty data", () => {
    expect(toCSV([])).toBe("");
  });

  it("handles values with commas by quoting", () => {
    const data = [{ name: "Hello, World", value: 42 }];
    const csv = toCSV(data);
    expect(csv).toContain('"Hello, World"');
  });
});
