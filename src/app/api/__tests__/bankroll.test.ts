/**
 * Tests for bankroll API routes.
 *
 * Covers accounts CRUD, transactions, and summary endpoint.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "test-user" } }),
}));

// Mock SQLite
const mockPrepare = vi.fn();
const mockTransaction = vi.fn();
vi.mock("@/lib/db", () => ({
  sqlite: {
    prepare: (...args: unknown[]) => mockPrepare(...args),
    transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

describe("Bankroll Accounts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/bankroll/accounts", () => {
    it("returns accounts for the user", async () => {
      const mockRows = [
        {
          id: "acct-1",
          site_id: "site-1",
          site_name: "GGPoker",
          name: "Main Account",
          currency: "USD",
          current_balance: 500,
          created_at: "2025-01-01",
        },
      ];
      mockPrepare.mockReturnValue({
        all: vi.fn().mockReturnValue(mockRows),
      });

      const { GET } = await import("@/app/api/bankroll/accounts/route");
      const res = await GET();
      const data = await res.json();

      expect(data.accounts).toHaveLength(1);
      expect(data.accounts[0]).toEqual({
        id: "acct-1",
        siteId: "site-1",
        siteName: "GGPoker",
        name: "Main Account",
        currency: "USD",
        currentBalance: 500,
        createdAt: "2025-01-01",
      });
    });
  });

  describe("POST /api/bankroll/accounts", () => {
    it("creates an account with initial balance", async () => {
      mockPrepare.mockReturnValue({
        run: vi.fn(),
      });

      const { POST } = await import("@/app/api/bankroll/accounts/route");
      const req = new Request("http://localhost/api/bankroll/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Account", initialBalance: 100 }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.account.name).toBe("Test Account");
      expect(data.account.currentBalance).toBe(100);
      // Should call prepare twice — one for account insert, one for deposit transaction
      expect(mockPrepare).toHaveBeenCalledTimes(2);
    });

    it("rejects when name is missing", async () => {
      const { POST } = await import("@/app/api/bankroll/accounts/route");
      const req = new Request("http://localhost/api/bankroll/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialBalance: 100 }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(400);
    });
  });
});

describe("Bankroll Transactions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/bankroll/transactions", () => {
    it("returns transactions filtered by accountId", async () => {
      const mockRows = [
        {
          id: "txn-1",
          account_id: "acct-1",
          account_name: "Main",
          type: "deposit",
          amount: 100,
          balance_after: 100,
          related_result_id: null,
          description: "Initial",
          transacted_at: "2025-01-01",
        },
      ];
      mockPrepare.mockReturnValue({
        all: vi.fn().mockReturnValue(mockRows),
      });

      const { GET } = await import("@/app/api/bankroll/transactions/route");
      const req = new Request(
        "http://localhost/api/bankroll/transactions?accountId=acct-1"
      );
      const res = await GET(req as any);
      const data = await res.json();

      expect(data.transactions).toHaveLength(1);
      expect(data.transactions[0].type).toBe("deposit");
      expect(data.transactions[0].amount).toBe(100);
    });
  });

  describe("POST /api/bankroll/transactions", () => {
    it("creates a deposit transaction and updates balance", async () => {
      mockPrepare.mockReturnValue({
        get: vi.fn().mockReturnValue({ current_balance: 100 }),
        run: vi.fn(),
      });

      const txnFn = vi.fn().mockImplementation((fn) => {
        fn();
        return fn;
      });
      mockTransaction.mockImplementation((fn) => {
        const wrapped = () => fn();
        return wrapped;
      });

      const { POST } = await import("@/app/api/bankroll/transactions/route");
      const req = new Request("http://localhost/api/bankroll/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "acct-1",
          type: "deposit",
          amount: 50,
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.transaction.amount).toBe(50);
      expect(data.transaction.balanceAfter).toBe(150);
    });

    it("makes withdrawal amount negative", async () => {
      mockPrepare.mockReturnValue({
        get: vi.fn().mockReturnValue({ current_balance: 200 }),
        run: vi.fn(),
      });
      mockTransaction.mockImplementation((fn) => {
        const wrapped = () => fn();
        return wrapped;
      });

      const { POST } = await import("@/app/api/bankroll/transactions/route");
      const req = new Request("http://localhost/api/bankroll/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "acct-1",
          type: "withdrawal",
          amount: 50,
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(data.transaction.amount).toBe(-50);
      expect(data.transaction.balanceAfter).toBe(150);
    });

    it("rejects invalid transaction type", async () => {
      const { POST } = await import("@/app/api/bankroll/transactions/route");
      const req = new Request("http://localhost/api/bankroll/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "acct-1",
          type: "invalid",
          amount: 50,
        }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent account", async () => {
      mockPrepare.mockReturnValue({
        get: vi.fn().mockReturnValue(undefined),
      });

      const { POST } = await import("@/app/api/bankroll/transactions/route");
      const req = new Request("http://localhost/api/bankroll/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "nonexistent",
          type: "deposit",
          amount: 50,
        }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(404);
    });
  });
});

describe("Bankroll Summary API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns aggregate summary", async () => {
    const mockAccounts = [
      { id: "1", name: "GG", currency: "USD", current_balance: 500, site_name: "GGPoker" },
      { id: "2", name: "WPT", currency: "USD", current_balance: 300, site_name: "WPT Global" },
    ];
    const mockStats = {
      total_deposits: 1000,
      total_withdrawals: -200,
      total_results: 50,
      transaction_count: 15,
    };

    let callCount = 0;
    mockPrepare.mockImplementation(() => ({
      all: vi.fn().mockReturnValue(mockAccounts),
      get: vi.fn().mockReturnValue(mockStats),
    }));

    const { GET } = await import("@/app/api/bankroll/summary/route");
    const res = await GET();
    const data = await res.json();

    expect(data.summary.totalBalance).toBe(800);
    expect(data.summary.accountCount).toBe(2);
    expect(data.summary.totalDeposits).toBe(1000);
    expect(data.summary.totalWithdrawals).toBe(200);
  });
});
