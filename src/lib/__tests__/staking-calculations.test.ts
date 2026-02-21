/**
 * Tests for staking calculation functions.
 *
 * Verifies investment, payout, and net calculations.
 */
import { describe, it, expect } from "vitest";
import {
  calcStakerInvestment,
  calcStakerPayout,
  calcPlayerNet,
  calcStakerPL,
  calcEffectiveBuyIn,
} from "@/lib/staking/calculations";

describe("staking calculations", () => {
  describe("calcStakerInvestment", () => {
    it("calculates investment without markup", () => {
      expect(calcStakerInvestment(100, 50, 1.0)).toBe(50);
    });

    it("calculates investment with markup", () => {
      expect(calcStakerInvestment(100, 50, 1.1)).toBeCloseTo(55);
    });

    it("handles 0% sold", () => {
      expect(calcStakerInvestment(100, 0, 1.0)).toBe(0);
    });

    it("handles 100% sold", () => {
      expect(calcStakerInvestment(100, 100, 1.0)).toBe(100);
    });
  });

  describe("calcStakerPayout", () => {
    it("calculates payout share", () => {
      expect(calcStakerPayout(1000, 50)).toBe(500);
    });

    it("calculates 0 payout for bust", () => {
      expect(calcStakerPayout(0, 50)).toBe(0);
    });
  });

  describe("calcPlayerNet", () => {
    it("calculates player net on a win", () => {
      // $100 buy-in, 50% sold at 1.0x, $500 payout
      // Staker invests $50, gets $250 back
      // Player: $500 - $100 - $250 + $50 = $200
      expect(calcPlayerNet(500, 100, 50, 1.0)).toBe(200);
    });

    it("calculates player net on a bust", () => {
      // $100 buy-in, 50% sold at 1.0x, $0 payout
      // Staker invests $50, gets $0 back
      // Player: $0 - $100 - $0 + $50 = -$50
      expect(calcPlayerNet(0, 100, 50, 1.0)).toBe(-50);
    });

    it("handles markup", () => {
      // $100 buy-in, 50% sold at 1.1x markup, $0 payout
      // Staker invests $55, gets $0
      // Player: $0 - $100 - $0 + $55 = -$45
      expect(calcPlayerNet(0, 100, 50, 1.1)).toBeCloseTo(-45);
    });
  });

  describe("calcStakerPL", () => {
    it("calculates staker profit on a win", () => {
      // $100 buy-in, 50% at 1.0x, $500 payout
      // Investment: $50, Payout: $250, PL: $200
      expect(calcStakerPL(500, 100, 50, 1.0)).toBe(200);
    });

    it("calculates staker loss on a bust", () => {
      // Investment: $50, Payout: $0, PL: -$50
      expect(calcStakerPL(0, 100, 50, 1.0)).toBe(-50);
    });
  });

  describe("calcEffectiveBuyIn", () => {
    it("calculates effective buy-in", () => {
      // $100 buy-in, 50% sold at 1.0x
      // Effective: $100 - $50 = $50
      expect(calcEffectiveBuyIn(100, 50, 1.0)).toBe(50);
    });

    it("handles markup reducing effective cost", () => {
      // $100 buy-in, 50% sold at 1.1x
      // Effective: $100 - $55 = $45
      expect(calcEffectiveBuyIn(100, 50, 1.1)).toBeCloseTo(45);
    });
  });
});
