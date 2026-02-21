/**
 * Shared tournament normalization utilities.
 *
 * These functions detect tournament properties (speed, structure, format, game type)
 * from the tournament name string. They are used by both WPT and GGPoker import
 * routes to consistently classify tournaments across data sources.
 *
 * @module tournament-utils
 */

/**
 * Detect tournament speed from the tournament name.
 *
 * Checks for keywords like "hyper", "turbo", "deep" in the name.
 * Defaults to "regular" if no speed keyword is found.
 *
 * @param name - The tournament name string to analyze
 * @returns The detected speed: "hyper" | "turbo" | "deep" | "regular"
 */
export function detectSpeed(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("hyper")) return "hyper";
  if (lower.includes("turbo")) return "turbo";
  if (
    lower.includes("deepstack") ||
    lower.includes("deep stack") ||
    lower.includes("ultra deep") ||
    lower.includes("deep")
  )
    return "deep";
  return "regular";
}

/**
 * Detect tournament structure from the tournament name.
 *
 * Identifies the tournament's buy-in/re-entry structure:
 * - "mystery_bounty" for Mystery Bounty tournaments
 * - "pko" for Progressive Knockout / Bounty tournaments
 * - "rebuy" for rebuy tournaments
 * - "reentry" for re-entry tournaments
 * - "freezeout" as default (no rebuys or re-entries)
 *
 * @param name - The tournament name string to analyze
 * @returns The detected structure type
 */
export function detectStructure(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("mystery bounty")) return "mystery_bounty";
  if (lower.includes("pko") || lower.includes("bounty")) return "pko";
  if (lower.includes("rebuy")) return "rebuy";
  if (lower.includes("reentry") || lower.includes("re-entry")) return "reentry";
  return "freezeout";
}

/**
 * Detect tournament format from the name and tournament type.
 *
 * Determines the tournament format:
 * - "Satellite" if the tournament_type is "Satellite"
 * - "Spin&Go" for spin/blast style tournaments
 * - "SNG" for sit-and-go, flip & go formats
 * - "MTT" as default (multi-table tournament)
 *
 * @param name - The tournament name string to analyze
 * @param type - The tournament_type field from the data source
 * @returns The detected format
 */
export function detectFormat(name: string, type: string): string {
  if (type === "Satellite") return "Satellite";
  const lower = name.toLowerCase();
  if (lower.includes("spin") || lower.includes("blast")) return "Spin&Go";
  if (
    lower.includes("sng") ||
    lower.includes("sit & go") ||
    lower.includes("sit and go") ||
    lower.includes("flip & go") ||
    lower.includes("flipngo")
  )
    return "SNG";
  return "MTT";
}

/**
 * Normalize the game type from the data source field and tournament name.
 *
 * If the data source provides a game type, it's uppercased and returned.
 * Otherwise, the name is scanned for game type keywords:
 * - PLO5, PLO6 for 5/6-card Omaha
 * - PLO for Pot Limit Omaha (also matches "omaha", "omaholic")
 * - HORSE for mixed games
 * - "Short Deck" for Short Deck Hold'em
 * - NLHE as default (No Limit Hold'em)
 *
 * @param gt - The game_type field from the data source (may be empty)
 * @param name - The tournament name string as fallback for detection
 * @returns The normalized game type string
 */
export function normalizeGameType(gt: string, name: string): string {
  if (gt) return gt.toUpperCase();
  const lower = name.toLowerCase();
  if (lower.includes("plo5") || lower.includes("plo 5")) return "PLO5";
  if (lower.includes("plo6") || lower.includes("plo 6")) return "PLO6";
  if (lower.includes("plo") || lower.includes("omaha") || lower.includes("omaholic")) return "PLO";
  if (lower.includes("horse")) return "HORSE";
  if (lower.includes("short deck")) return "Short Deck";
  return "NLHE";
}

/**
 * Generate a stable, deterministic tournament ID from name and start time.
 *
 * Creates a unique ID by combining the site prefix with a base64url-encoded
 * hash of the tournament name and start time. This ensures the same tournament
 * always gets the same ID across repeated imports (idempotent).
 *
 * @param sitePrefix - The site identifier prefix (e.g., "wptglobal", "ggpoker")
 * @param name - The tournament name
 * @param startTime - The tournament start time (may be empty for GGPoker)
 * @returns A stable tournament ID string like "wptglobal_abc123..."
 */
export function generateStableId(sitePrefix: string, name: string, startTime: string): string {
  return `${sitePrefix}_${Buffer.from(name + startTime).toString("base64url").slice(0, 32)}`;
}
