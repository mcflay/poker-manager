/**
 * Tests for the StakingCalculator component.
 *
 * Verifies rendering of calculator inputs and output labels.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { StakingCalculator } from "@/components/staking/StakingCalculator";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("StakingCalculator", () => {
  it("renders calculator inputs", () => {
    render(<StakingCalculator />);

    expect(screen.getByText("Staking Calculator")).toBeInTheDocument();
    expect(screen.getByLabelText("Buy-in ($)")).toBeInTheDocument();
    expect(screen.getByLabelText("% Sold")).toBeInTheDocument();
    expect(screen.getByLabelText("Markup")).toBeInTheDocument();
    expect(screen.getByLabelText("Total Payout ($)")).toBeInTheDocument();
  });

  it("shows calculation results", () => {
    render(<StakingCalculator />);

    expect(screen.getByText("Staker Investment")).toBeInTheDocument();
    expect(screen.getByText("Your Effective Buy-in")).toBeInTheDocument();
    expect(screen.getByText("Staker Payout")).toBeInTheDocument();
    expect(screen.getByText("Your Net Result")).toBeInTheDocument();
  });
});
