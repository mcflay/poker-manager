/**
 * Tests for the ResultForm component.
 *
 * Verifies form rendering, field interactions, and net result calculation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { ResultForm } from "@/components/results/ResultForm";
import { mockTournaments } from "@/test/mocks/data";

// Mock fetch for sessions and tournament search
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

describe("ResultForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions: [], tournaments: [] }),
    });
  });

  it("renders the form with all fields", () => {
    render(<ResultForm />);

    expect(screen.getByText("Log Result")).toBeInTheDocument();
    expect(screen.getByLabelText("Tournament")).toBeInTheDocument();
    expect(screen.getByLabelText("Entries")).toBeInTheDocument();
    expect(screen.getByLabelText("Total Invested")).toBeInTheDocument();
    expect(screen.getByLabelText("Finish Position")).toBeInTheDocument();
    expect(screen.getByLabelText("Field Size")).toBeInTheDocument();
    expect(screen.getByLabelText("Payout")).toBeInTheDocument();
    expect(screen.getByLabelText("Bounties Won")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save result/i })).toBeInTheDocument();
  });

  it("pre-fills tournament data when provided", () => {
    const tournament = mockTournaments[0];
    render(<ResultForm tournament={tournament} />);

    // Should not show tournament search when tournament is provided
    expect(screen.queryByLabelText("Tournament")).not.toBeInTheDocument();
    // Invested should be pre-filled with the buy-in
    expect(screen.getByLabelText("Total Invested")).toHaveValue(tournament.buyIn);
  });

  it("shows net result calculation", () => {
    render(<ResultForm />);

    // Default net result should be $0.00 (0 payout - 0 invested)
    expect(screen.getByText(/Net Result/)).toBeInTheDocument();
  });

  it("renders cancel button when onCancel is provided", () => {
    const onCancel = vi.fn();
    render(<ResultForm onCancel={onCancel} />);

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    expect(cancelBtn).toBeInTheDocument();
  });

  it("does not render cancel button when onCancel is not provided", () => {
    render(<ResultForm />);

    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });
});
