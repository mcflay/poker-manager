/**
 * Tests for the filter profiles API route.
 *
 * Verifies CRUD operations for saved filter configurations.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_FILTERS } from "@/lib/types";

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

const { GET, POST } = await import("@/app/api/filter-profiles/route");

describe("GET /api/filter-profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns profiles with parsed filter JSON", async () => {
    const mockRows = [
      {
        id: "fp1",
        name: "Sunday Grind",
        filters: JSON.stringify({ ...DEFAULT_FILTERS, buyInMin: 50, buyInMax: 200 }),
        is_default: 0,
        sort_order: 0,
        created_at: "2025-01-15T00:00:00Z",
      },
    ];

    mockPrepare.mockReturnValue({
      all: vi.fn().mockReturnValue(mockRows),
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.profiles).toHaveLength(1);
    expect(data.profiles[0].name).toBe("Sunday Grind");
    expect(data.profiles[0].filters.buyInMin).toBe(50);
  });
});

describe("POST /api/filter-profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new filter profile", async () => {
    const mockRun = vi.fn();
    mockPrepare.mockReturnValue({ run: mockRun });

    const filters = { ...DEFAULT_FILTERS, sites: ["ggpoker"], buyInMin: 10 };
    const req = new Request("http://localhost:3000/api/filter-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Micro PKOs", filters }),
    });

    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.profile.name).toBe("Micro PKOs");
    expect(data.profile.filters.sites).toContain("ggpoker");
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when name is missing", async () => {
    const req = new Request("http://localhost:3000/api/filter-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters: DEFAULT_FILTERS }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when filters is missing", async () => {
    const req = new Request("http://localhost:3000/api/filter-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
