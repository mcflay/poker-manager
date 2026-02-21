/**
 * Tests for JSON export utility.
 *
 * Verifies data-to-JSON conversion and column filtering.
 */
import { describe, it, expect } from "vitest";
import { toJSON } from "@/lib/export/json";

describe("toJSON", () => {
  it("converts data to formatted JSON", () => {
    const data = [{ name: "Test", value: 42 }];
    const json = toJSON(data);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Test");
    expect(parsed[0].value).toBe(42);
  });

  it("filters to specified columns", () => {
    const data = [{ name: "Test", value: 42, extra: "ignore" }];
    const json = toJSON(data, ["name", "value"]);
    const parsed = JSON.parse(json);

    expect(parsed[0]).toHaveProperty("name");
    expect(parsed[0]).toHaveProperty("value");
    expect(parsed[0]).not.toHaveProperty("extra");
  });

  it("handles empty data", () => {
    const json = toJSON([]);
    expect(JSON.parse(json)).toEqual([]);
  });

  it("outputs pretty-printed JSON", () => {
    const data = [{ key: "val" }];
    const json = toJSON(data);
    expect(json).toContain("\n"); // Pretty-printed has newlines
  });
});
