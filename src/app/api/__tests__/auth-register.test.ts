/**
 * Tests for the user registration API route.
 *
 * Verifies input validation, duplicate email detection, password hashing,
 * and successful user creation.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module before importing the route
const mockPrepare = vi.fn();

vi.mock("@/lib/db", () => ({
  sqlite: {
    prepare: (...args: unknown[]) => mockPrepare(...args),
    exec: vi.fn(),
    pragma: vi.fn(),
  },
  db: {},
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("$2b$12$hashedpassword"),
}));

// Dynamically import the route handler after mocks are set up
const { POST } = await import("@/app/api/auth/register/route");

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when email is missing", async () => {
    const req = createRequest({ password: "secret123" });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Email and password are required");
  });

  it("returns 400 when password is missing", async () => {
    const req = createRequest({ email: "test@example.com" });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Email and password are required");
  });

  it("returns 400 when password is too short", async () => {
    const req = createRequest({ email: "test@example.com", password: "12345" });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Password must be at least 6 characters");
  });

  it("returns 409 when email already exists", async () => {
    mockPrepare.mockReturnValue({
      get: vi.fn().mockReturnValue({ id: "existing-user" }),
      run: vi.fn(),
    });

    const req = createRequest({
      email: "existing@example.com",
      password: "secret123",
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe("An account with this email already exists");
  });

  it("creates a user successfully", async () => {
    const mockRun = vi.fn();
    mockPrepare
      .mockReturnValueOnce({ get: vi.fn().mockReturnValue(undefined) }) // SELECT check
      .mockReturnValueOnce({ run: mockRun }); // INSERT

    const req = createRequest({
      name: "Test User",
      email: "new@example.com",
      password: "secret123",
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user.name).toBe("Test User");
    expect(data.user.email).toBe("new@example.com");
    expect(data.user.id).toBeDefined();
    // Verify the INSERT was called with correct params
    expect(mockRun).toHaveBeenCalledWith(
      expect.any(String), // UUID
      "Test User",
      "new@example.com",
      "$2b$12$hashedpassword"
    );
  });

  it("handles null name gracefully", async () => {
    const mockRun = vi.fn();
    mockPrepare
      .mockReturnValueOnce({ get: vi.fn().mockReturnValue(undefined) })
      .mockReturnValueOnce({ run: mockRun });

    const req = createRequest({
      email: "noname@example.com",
      password: "secret123",
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user.name).toBeNull();
    expect(mockRun).toHaveBeenCalledWith(
      expect.any(String),
      null,
      "noname@example.com",
      "$2b$12$hashedpassword"
    );
  });
});
