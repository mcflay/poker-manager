/**
 * Tests for the TransactionForm component.
 *
 * Verifies form rendering, validation, and submission.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { TransactionForm } from "@/components/bankroll/TransactionForm";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TransactionForm", () => {
  const defaultProps = {
    accountId: "acct-1",
    type: "deposit" as const,
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ transaction: {} }),
    });
  });

  it("renders deposit form", () => {
    render(<TransactionForm {...defaultProps} />);

    expect(screen.getByText("deposit")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm deposit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("renders withdrawal form", () => {
    render(<TransactionForm {...defaultProps} type="withdrawal" />);

    expect(screen.getByText("withdrawal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm withdrawal/i })).toBeInTheDocument();
  });

  it("calls onCancel when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<TransactionForm {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("submits deposit with amount and description", async () => {
    const user = userEvent.setup();
    render(<TransactionForm {...defaultProps} />);

    await user.type(screen.getByLabelText("Amount"), "50");
    await user.type(screen.getByLabelText("Description"), "Test deposit");
    await user.click(screen.getByRole("button", { name: /confirm deposit/i }));

    expect(mockFetch).toHaveBeenCalledWith("/api/bankroll/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: "acct-1",
        type: "deposit",
        amount: 50,
        description: "Test deposit",
      }),
    });
  });
});
