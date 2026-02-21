/**
 * Tests for analytics calculation functions.
 *
 * Verifies summary stats, streaks, timeline, and breakdown computations.
 */
import { describe, it, expect } from "vitest";
import {
  computeSummary,
  computeStreaks,
  computeTimeline,
  computeBreakdown,
} from "@/lib/analytics/calculations";

const sampleResults = [
  { totalInvested: 100, payout: 500, bountiesWon: 50, netResult: 450, finishPosition: 5, totalEntriesAtFinish: 200, playedAt: "2025-01-10T00:00:00Z" },
  { totalInvested: 100, payout: 0, bountiesWon: 0, netResult: -100, finishPosition: 180, totalEntriesAtFinish: 200, playedAt: "2025-01-10T00:00:00Z" },
  { totalInvested: 50, payout: 200, bountiesWon: 0, netResult: 150, finishPosition: 10, totalEntriesAtFinish: 500, playedAt: "2025-01-11T00:00:00Z" },
  { totalInvested: 50, payout: 0, bountiesWon: 0, netResult: -50, finishPosition: null, totalEntriesAtFinish: null, playedAt: "2025-01-12T00:00:00Z" },
  { totalInvested: 200, payout: 0, bountiesWon: 0, netResult: -200, finishPosition: 300, totalEntriesAtFinish: 300, playedAt: "2025-01-12T00:00:00Z" },
];

describe("computeSummary", () => {
  it("computes correct totals", () => {
    const s = computeSummary(sampleResults);

    expect(s.totalTournaments).toBe(5);
    expect(s.totalInvested).toBe(500);
    expect(s.totalPayout).toBe(700);
    expect(s.totalBounties).toBe(50);
    expect(s.netProfit).toBe(250); // 700 + 50 - 500
  });

  it("computes correct ROI", () => {
    const s = computeSummary(sampleResults);
    expect(s.roi).toBeCloseTo(50, 0); // 250/500 * 100 = 50%
  });

  it("computes ITM correctly", () => {
    const s = computeSummary(sampleResults);
    expect(s.itmCount).toBe(2); // two results with payout > 0
    expect(s.itmPercent).toBeCloseTo(40, 0);
  });

  it("computes avg and best finish", () => {
    const s = computeSummary(sampleResults);
    expect(s.bestFinish).toBe(5);
    // avg of 5, 180, 10, 300 = 123.75
    expect(s.avgFinish).toBeCloseTo(123.75, 0);
  });

  it("handles empty results", () => {
    const s = computeSummary([]);
    expect(s.totalTournaments).toBe(0);
    expect(s.roi).toBe(0);
    expect(s.bestFinish).toBeNull();
  });
});

describe("computeStreaks", () => {
  it("computes win and loss streaks", () => {
    const results = [
      { totalInvested: 100, payout: 200, bountiesWon: 0, netResult: 100 },
      { totalInvested: 100, payout: 300, bountiesWon: 0, netResult: 200 },
      { totalInvested: 100, payout: 150, bountiesWon: 0, netResult: 50 },
      { totalInvested: 100, payout: 0, bountiesWon: 0, netResult: -100 },
      { totalInvested: 100, payout: 0, bountiesWon: 0, netResult: -100 },
    ];

    const { longestWinStreak, longestLossStreak } = computeStreaks(results);
    expect(longestWinStreak).toBe(3);
    expect(longestLossStreak).toBe(2);
  });

  it("handles all wins", () => {
    const results = [
      { totalInvested: 10, payout: 20, bountiesWon: 0, netResult: 10 },
      { totalInvested: 10, payout: 30, bountiesWon: 0, netResult: 20 },
    ];
    const { longestWinStreak, longestLossStreak } = computeStreaks(results);
    expect(longestWinStreak).toBe(2);
    expect(longestLossStreak).toBe(0);
  });
});

describe("computeTimeline", () => {
  it("produces cumulative P&L by date", () => {
    const timeline = computeTimeline(sampleResults);

    expect(timeline.length).toBe(3); // 3 unique dates
    expect(timeline[0].date).toBe("2025-01-10");
    expect(timeline[0].daily).toBe(350); // 450 + (-100)
    expect(timeline[0].cumulative).toBe(350);
    expect(timeline[1].cumulative).toBe(500); // 350 + 150
    expect(timeline[2].cumulative).toBe(250); // 500 + (-50) + (-200)
  });

  it("handles empty results", () => {
    expect(computeTimeline([])).toEqual([]);
  });
});

describe("computeBreakdown", () => {
  it("groups results by key", () => {
    const withKeys = sampleResults.map((r, i) => ({
      ...r,
      groupKey: i < 2 ? "GGPoker" : "PokerStars",
    }));

    const breakdown = computeBreakdown(withKeys);
    expect(breakdown).toHaveLength(2);

    const gg = breakdown.find((b) => b.group === "GGPoker");
    expect(gg?.count).toBe(2);
    expect(gg?.invested).toBe(200);
    expect(gg?.profit).toBe(350); // (500 + 50 + 0) - 200

    const ps = breakdown.find((b) => b.group === "PokerStars");
    expect(ps?.count).toBe(3);
  });
});
