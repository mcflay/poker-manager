/**
 * Tests for the results API route.
 *
 * Verifies CRUD operations for tournament results:
 * - GET returns results with tournament details
 * - POST creates a result with computed net_result
 * - Validates required fields
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrepare = vi.fn();

vi.mock("@/lib/db", () => ({
  sqlite: {
    prepare: (...args: unknown[]) => mockPrepare(...args),
    exec: vi.fn(),
    pragma: vi.fn(),
  },
  db: {},
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-123" } }),
}));

const { GET, POST } = await import("@/app/api/results/route");

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

describe("GET /api/results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns results scoped to the authenticated user", async () => {
    const mockRows = [
      {
        id: "r1",
        tournament_id: "t1",
        entries: 1,
        total_invested: 100,
        finish_position: 5,
        total_entries_at_finish: 200,
        payout: 500,
        bounties_won: 50,
        net_result: 450,
        session_id: null,
        notes: "Good run",
        played_at: "2025-01-15T00:00:00Z",
        created_at: "2025-01-15T00:00:00Z",
        tournament_name: "Sunday Major",
        site_id: "ggpoker",
        game_type: "NLHE",
        tournament_buy_in: 100,
        tournament_guarantee: 50000,
        tournament_start_time: "2025-01-15T18:00:00Z",
        tournament_currency: "USD",
        site_name: "GGPoker",
      },
    ];

    mockPrepare.mockReturnValue({
      all: vi.fn().mockReturnValue(mockRows),
    });

    const req = createRequest("http://localhost:3000/api/results");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].tournamentName).toBe("Sunday Major");
    expect(data.results[0].netResult).toBe(450);
  });

  it("returns empty array when no results", async () => {
    mockPrepare.mockReturnValue({
      all: vi.fn().mockReturnValue([]),
    });

    const req = createRequest("http://localhost:3000/api/results");
    const res = await GET(req as any);
    const data = await res.json();

    expect(data.results).toHaveLength(0);
  });
});

describe("POST /api/results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a result with computed net_result", async () => {
    const mockRun = vi.fn();
    mockPrepare.mockReturnValue({ run: mockRun });

    const req = createRequest("http://localhost:3000/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournamentId: "t1",
        entries: 2,
        totalInvested: 200,
        finishPosition: 10,
        totalEntriesAtFinish: 500,
        payout: 800,
        bountiesWon: 100,
        notes: "Deep run",
      }),
    });

    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.result.netResult).toBe(700); // 800 + 100 - 200
    expect(data.result.entries).toBe(2);
    expect(data.result.tournamentId).toBe("t1");
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when tournamentId is missing", async () => {
    const req = createRequest("http://localhost:3000/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalInvested: 100 }),
    });

    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("tournamentId");
  });

  it("returns 400 when totalInvested is missing", async () => {
    const req = createRequest("http://localhost:3000/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId: "t1" }),
    });

    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("totalInvested");
  });

  it("defaults payout and bounties to 0 for a bust", async () => {
    const mockRun = vi.fn();
    mockPrepare.mockReturnValue({ run: mockRun });

    const req = createRequest("http://localhost:3000/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournamentId: "t1",
        totalInvested: 50,
      }),
    });

    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.result.payout).toBe(0);
    expect(data.result.bountiesWon).toBe(0);
    expect(data.result.netResult).toBe(-50);
  });
});
