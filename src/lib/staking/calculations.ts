/**
 * Staking calculation utilities.
 *
 * Pure functions for computing staker investment, payout shares,
 * and player net after staking adjustments.
 *
 * @module staking/calculations
 */

/**
 * Calculate the staker's investment amount.
 *
 * Investment = buyIn * (percentageSold / 100) * markup
 *
 * @param buyIn - Total buy-in amount
 * @param percentageSold - Percentage sold to staker (0-100)
 * @param markup - Markup multiplier (1.0 = no markup, 1.1 = 10% markup)
 */
export function calcStakerInvestment(
  buyIn: number,
  percentageSold: number,
  markup: number = 1.0
): number {
  return buyIn * (percentageSold / 100) * markup;
}

/**
 * Calculate the staker's payout share from a result.
 *
 * StakerPayout = totalPayout * (percentageSold / 100)
 *
 * @param totalPayout - Total payout from the tournament
 * @param percentageSold - Percentage the staker owns
 */
export function calcStakerPayout(
  totalPayout: number,
  percentageSold: number
): number {
  return totalPayout * (percentageSold / 100);
}

/**
 * Calculate the player's net result after staking.
 *
 * PlayerNet = totalPayout - totalBuyIn - stakerPayout + stakerInvestment
 *
 * The player keeps (100 - percentageSold)% of the winnings,
 * but received the staker's investment to cover part of the buy-in.
 *
 * @param totalPayout - Total payout from tournament
 * @param buyIn - Total buy-in amount
 * @param percentageSold - Percentage sold
 * @param markup - Markup multiplier
 */
export function calcPlayerNet(
  totalPayout: number,
  buyIn: number,
  percentageSold: number,
  markup: number = 1.0
): number {
  const stakerInvestment = calcStakerInvestment(buyIn, percentageSold, markup);
  const stakerPayout = calcStakerPayout(totalPayout, percentageSold);
  return totalPayout - buyIn - stakerPayout + stakerInvestment;
}

/**
 * Calculate the staker's profit/loss on a deal.
 *
 * StakerPL = stakerPayout - stakerInvestment
 */
export function calcStakerPL(
  totalPayout: number,
  buyIn: number,
  percentageSold: number,
  markup: number = 1.0
): number {
  const investment = calcStakerInvestment(buyIn, percentageSold, markup);
  const payout = calcStakerPayout(totalPayout, percentageSold);
  return payout - investment;
}

/**
 * Calculate effective buy-in after staking.
 *
 * Player's effective cost = buyIn - stakerInvestment
 */
export function calcEffectiveBuyIn(
  buyIn: number,
  percentageSold: number,
  markup: number = 1.0
): number {
  return buyIn - calcStakerInvestment(buyIn, percentageSold, markup);
}
