/**
 * Tests for tournament normalization utility functions.
 *
 * These functions are critical for consistent tournament classification
 * across different data sources (WPT, GGPoker scrapers).
 */

import { describe, it, expect } from "vitest";
import {
  detectSpeed,
  detectStructure,
  detectFormat,
  normalizeGameType,
  generateStableId,
} from "../tournament-utils";

describe("detectSpeed", () => {
  it("detects hyper speed", () => {
    expect(detectSpeed("$5 Hyper Turbo NLHE")).toBe("hyper");
  });

  it("detects turbo speed", () => {
    expect(detectSpeed("$22 Turbo PKO")).toBe("turbo");
  });

  it("detects deep speed from 'deepstack'", () => {
    expect(detectSpeed("$55 Deepstack NLHE")).toBe("deep");
  });

  it("detects deep speed from 'deep stack'", () => {
    expect(detectSpeed("$55 Deep Stack PLO")).toBe("deep");
  });

  it("detects deep speed from 'ultra deep'", () => {
    expect(detectSpeed("$100 Ultra Deep NLHE")).toBe("deep");
  });

  it("defaults to regular when no speed keyword found", () => {
    expect(detectSpeed("Sunday Million NLHE")).toBe("regular");
  });

  it("is case-insensitive", () => {
    expect(detectSpeed("TURBO NLHE $22")).toBe("turbo");
  });

  it("prioritizes hyper over turbo when both present", () => {
    expect(detectSpeed("$5 Hyper Turbo")).toBe("hyper");
  });
});

describe("detectStructure", () => {
  it("detects mystery bounty", () => {
    expect(detectStructure("$100 Mystery Bounty NLHE")).toBe("mystery_bounty");
  });

  it("detects PKO from 'pko'", () => {
    expect(detectStructure("$22 PKO Turbo")).toBe("pko");
  });

  it("detects PKO from 'bounty' (not mystery)", () => {
    expect(detectStructure("$50 Bounty Hunter")).toBe("pko");
  });

  it("detects rebuy", () => {
    expect(detectStructure("$10 Rebuy NLHE")).toBe("rebuy");
  });

  it("detects reentry", () => {
    expect(detectStructure("$55 Re-Entry NLHE")).toBe("reentry");
  });

  it("detects reentry without hyphen", () => {
    expect(detectStructure("$55 Reentry NLHE")).toBe("reentry");
  });

  it("defaults to freezeout", () => {
    expect(detectStructure("Sunday Million NLHE")).toBe("freezeout");
  });

  it("prioritizes mystery bounty over regular bounty", () => {
    expect(detectStructure("$100 Mystery Bounty")).toBe("mystery_bounty");
  });
});

describe("detectFormat", () => {
  it("detects Satellite from tournament type", () => {
    expect(detectFormat("$5 Satellite to Sunday", "Satellite")).toBe("Satellite");
  });

  it("detects Spin&Go", () => {
    expect(detectFormat("$10 Spin & Go", "")).toBe("Spin&Go");
  });

  it("detects Spin&Go from blast", () => {
    expect(detectFormat("$5 Blast", "")).toBe("Spin&Go");
  });

  it("detects SNG", () => {
    expect(detectFormat("$22 SNG Turbo", "")).toBe("SNG");
  });

  it("detects SNG from sit & go", () => {
    expect(detectFormat("$10 Sit & Go", "")).toBe("SNG");
  });

  it("detects SNG from Flip & Go (GGPoker format)", () => {
    expect(detectFormat("$22 Flip & Go", "")).toBe("SNG");
  });

  it("detects SNG from flipngo", () => {
    expect(detectFormat("$10 FlipNGo", "")).toBe("SNG");
  });

  it("defaults to MTT", () => {
    expect(detectFormat("Sunday Million NLHE", "")).toBe("MTT");
  });

  it("satellite type takes precedence over name keywords", () => {
    expect(detectFormat("$5 Spin Satellite", "Satellite")).toBe("Satellite");
  });
});

describe("normalizeGameType", () => {
  it("uppercases provided game type", () => {
    expect(normalizeGameType("nlh", "anything")).toBe("NLH");
  });

  it("detects PLO5", () => {
    expect(normalizeGameType("", "$50 PLO5 Turbo")).toBe("PLO5");
  });

  it("detects PLO6 from 'plo 6'", () => {
    expect(normalizeGameType("", "$50 PLO 6 Card")).toBe("PLO6");
  });

  it("detects PLO from 'omaha'", () => {
    expect(normalizeGameType("", "$22 Omaha Hi-Lo")).toBe("PLO");
  });

  it("detects PLO from 'omaholic' (GGPoker term)", () => {
    expect(normalizeGameType("", "$10 Omaholic")).toBe("PLO");
  });

  it("detects HORSE", () => {
    expect(normalizeGameType("", "$100 HORSE Championship")).toBe("HORSE");
  });

  it("detects Short Deck", () => {
    expect(normalizeGameType("", "$50 Short Deck NLH")).toBe("Short Deck");
  });

  it("defaults to NLHE", () => {
    expect(normalizeGameType("", "Sunday Million")).toBe("NLHE");
  });

  it("uses provided game type even if name has keywords", () => {
    expect(normalizeGameType("PLO", "$50 Omaha HORSE PLO5")).toBe("PLO");
  });
});

describe("generateStableId", () => {
  it("generates deterministic IDs from same inputs", () => {
    const id1 = generateStableId("wptglobal", "Sunday Million", "2025-02-16T18:00:00Z");
    const id2 = generateStableId("wptglobal", "Sunday Million", "2025-02-16T18:00:00Z");
    expect(id1).toBe(id2);
  });

  it("generates different IDs for different tournaments", () => {
    const id1 = generateStableId("wptglobal", "Sunday Million", "2025-02-16T18:00:00Z");
    const id2 = generateStableId("wptglobal", "Sunday Storm", "2025-02-16T18:00:00Z");
    expect(id1).not.toBe(id2);
  });

  it("includes site prefix", () => {
    const id = generateStableId("ggpoker", "Test", "2025-01-01");
    expect(id).toMatch(/^ggpoker_/);
  });

  it("handles empty start time (GGPoker null case)", () => {
    const id = generateStableId("ggpoker", "Test Tournament", "");
    expect(id).toMatch(/^ggpoker_/);
    expect(id.length).toBeGreaterThan(10);
  });

  it("limits ID suffix to 32 characters", () => {
    const id = generateStableId("wpt", "A very long tournament name that exceeds", "2025-01-01T00:00:00Z");
    const suffix = id.replace("wpt_", "");
    expect(suffix.length).toBeLessThanOrEqual(32);
  });
});
