/**
 * Tests for the sessions API route.
 *
 * Verifies session creation and listing with aggregated result stats.
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

const { GET, POST } = await import("@/app/api/sessions/route");

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

describe("GET /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sessions with aggregated stats", async () => {
    const mockRows = [
      {
        id: "s1",
        name: "Sunday Grind",
        date: "2025-01-19",
        notes: null,
        user_id: "user-123",
        created_at: "2025-01-19T10:00:00Z",
        result_count: 5,
        total_invested: 500,
        total_payout: 1200,
        net_result: 700,
      },
    ];

    mockPrepare.mockReturnValue({
      all: vi.fn().mockReturnValue(mockRows),
    });

    const req = createRequest("http://localhost:3000/api/sessions");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].name).toBe("Sunday Grind");
    expect(data.sessions[0].resultCount).toBe(5);
    expect(data.sessions[0].netResult).toBe(700);
  });
});

describe("POST /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a session with name and date", async () => {
    const mockRun = vi.fn();
    mockPrepare.mockReturnValue({ run: mockRun });

    const req = createRequest("http://localhost:3000/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Tuesday Grind",
        date: "2025-01-21",
        notes: "Focused on PLO",
      }),
    });

    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.session.name).toBe("Tuesday Grind");
    expect(data.session.date).toBe("2025-01-21");
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when date is missing", async () => {
    const req = createRequest("http://localhost:3000/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No Date" }),
    });

    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("date");
  });
});
