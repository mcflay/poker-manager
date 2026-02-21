/**
 * Currency utilities — formatting, conversion, and symbol lookup.
 *
 * Provides pure functions for displaying and converting currency amounts.
 *
 * @module currency
 */

/** Supported currency codes */
export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

/** Currency metadata */
interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

/** Map of currency codes to their info */
const currencies: Record<CurrencyCode, CurrencyInfo> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar" },
  EUR: { code: "EUR", symbol: "\u20AC", name: "Euro" },
  GBP: { code: "GBP", symbol: "\u00A3", name: "British Pound" },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar" },
};

/**
 * Get the symbol for a currency code.
 * Falls back to the code itself if unknown.
 */
export function getCurrencySymbol(code: string): string {
  return (currencies as Record<string, CurrencyInfo>)[code]?.symbol ?? code;
}

/**
 * Get all supported currencies.
 */
export function getSupportedCurrencies(): CurrencyInfo[] {
  return Object.values(currencies);
}

/**
 * Format a number as a currency string.
 *
 * @param amount - The numeric amount
 * @param currency - Currency code (default "USD")
 * @param compact - Use compact notation for large numbers
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  compact: boolean = false
): string {
  const symbol = getCurrencySymbol(currency);
  if (compact && Math.abs(amount) >= 1000) {
    const k = amount / 1000;
    return `${symbol}${k.toFixed(1)}k`;
  }
  const sign = amount < 0 ? "-" : "";
  return `${sign}${symbol}${Math.abs(amount).toFixed(2)}`;
}

/**
 * Convert an amount from one currency to another using provided rates.
 *
 * @param amount - Amount in the source currency
 * @param from - Source currency code
 * @param to - Target currency code
 * @param rates - Map of "FROM-TO" keys to rate values
 * @returns Converted amount, or original if no rate found
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number {
  if (from === to) return amount;

  const key = `${from}-${to}`;
  const rate = rates[key];

  if (rate !== undefined) {
    return amount * rate;
  }

  // Try reverse rate
  const reverseKey = `${to}-${from}`;
  const reverseRate = rates[reverseKey];
  if (reverseRate !== undefined && reverseRate !== 0) {
    return amount / reverseRate;
  }

  // No rate available — return original amount
  return amount;
}
