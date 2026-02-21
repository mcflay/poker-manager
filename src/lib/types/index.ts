/**
 * Shared TypeScript type definitions for the poker tournament manager.
 *
 * These interfaces define the shape of data flowing between the database,
 * API routes, and React components. All types are centralized here to
 * ensure consistency across the application.
 *
 * @module types
 */

/** A poker site/room (e.g., PokerStars, GGPoker) */
export interface Site {
  id: string;
  name: string;
  currency: string;
  logoUrl?: string | null;
  isActive: boolean;
}

/**
 * A tournament record with optional joined fields.
 *
 * Core fields come from the `tournaments` table. The `siteName`,
 * `hasResult`, and `isFavorite` fields are populated via JOINs
 * in the tournaments API route.
 */
export interface Tournament {
  id: string;
  siteId: string;
  /** Joined from sites table — display name of the poker site */
  siteName?: string;
  name: string;
  /** Game type: NLHE, PLO, PLO5, PLO6, HORSE, Short Deck */
  gameType: string;
  /** Format: MTT, SNG, Satellite, Spin&Go */
  format: string;
  /** Speed: hyper, turbo, regular, deep */
  speed: string;
  /** Structure: freezeout, reentry, rebuy, pko, mystery_bounty */
  structure: string;
  /** Descriptive type: Bounty, Satellite, Freeroll, Main Event, etc. */
  tournamentType: string;
  /** Total buy-in in site currency */
  buyIn: number;
  rake: number;
  bounty: number;
  /** Guaranteed prize pool */
  guarantee: number;
  maxEntries?: number | null;
  /** ISO 8601 start time */
  startTime: string;
  endTime?: string | null;
  status: TournamentStatus;
  totalEntries?: number | null;
  prizePool?: number | null;
  currency: string;
  isSeries: boolean;
  seriesName?: string | null;
  /** Whether the user has logged a result for this tournament */
  hasResult?: boolean;
  /** Whether the user has favorited this tournament */
  isFavorite?: boolean;
}

/** Possible tournament lifecycle statuses */
export type TournamentStatus =
  | "scheduled"
  | "registering"
  | "late_reg"
  | "running"
  | "completed"
  | "cancelled";

/** A user's result for a played tournament */
export interface Result {
  id: string;
  tournamentId: string;
  /** Number of entries (1 = single entry, >1 = re-entries) */
  entries: number;
  /** Total amount invested: buy_in * entries */
  totalInvested: number;
  /** Final finish position (1 = winner) */
  finishPosition?: number | null;
  /** Total field size when the user finished */
  totalEntriesAtFinish?: number | null;
  /** Total payout received */
  payout: number;
  /** Bounties won (for PKO tournaments) */
  bountiesWon: number;
  /** Net result: payout + bounties - total_invested */
  netResult?: number | null;
  sessionId?: string | null;
  notes?: string | null;
  playedAt?: string | null;
  createdAt: string;
}

/**
 * Filter state — controls which tournaments are displayed.
 *
 * Each field corresponds to a filter dimension in the FilterPanel.
 * Arrays use OR logic within a dimension (e.g., sites: ["gg", "stars"]
 * shows tournaments from either site). Empty arrays = no filter applied.
 */
export interface FilterState {
  /** Selected poker site IDs */
  sites: string[];
  /** Minimum buy-in threshold (null = no minimum) */
  buyInMin: number | null;
  /** Maximum buy-in threshold (null = no maximum) */
  buyInMax: number | null;
  /** Selected game types (NLHE, PLO, etc.) */
  gameTypes: string[];
  /** Selected formats (MTT, SNG, etc.) */
  formats: string[];
  /** Selected speeds (hyper, turbo, etc.) */
  speeds: string[];
  /** Selected structures (freezeout, pko, etc.) */
  structures: string[];
  /** Selected tournament type labels */
  tournamentTypes: string[];
  /** Minimum guarantee threshold (null = no minimum) */
  guaranteeMin: number | null;
  /** Selected status filters */
  statuses: TournamentStatus[];
  /** Free-text search query (matches tournament name) */
  search: string;
  /** Show only favorited tournaments */
  showFavoritesOnly: boolean;
  /** Only show tournaments starting within this many hours (null = show all) */
  timeWindowHours: number | null;
}

/** Default filter state — shows all tournaments with no filters applied */
export const DEFAULT_FILTERS: FilterState = {
  sites: [],
  buyInMin: null,
  buyInMax: null,
  gameTypes: [],
  formats: [],
  speeds: [],
  structures: [],
  tournamentTypes: [],
  guaranteeMin: null,
  statuses: [],
  search: "",
  showFavoritesOnly: false,
  timeWindowHours: null,
};

/** A saved filter profile with metadata */
export interface FilterProfile {
  id: string;
  name: string;
  filters: FilterState;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
}

/** Summary statistics returned after a data import operation */
export interface ImportSummary {
  total: number;
  newCount: number;
  updated: number;
  skipped: number;
}

/** Shape of the WPT Global scraper JSON output */
export interface WptScraperOutput {
  /** ISO 8601 timestamp when the scrape was performed */
  scraped_at: string;
  /** Number of tournaments in the output */
  tournament_count: number;
  /** Array of scraped tournament data */
  tournaments: WptTournament[];
}

/** A single tournament from the WPT Global scraper */
export interface WptTournament {
  name: string;
  /** ISO 8601 start time (null if unknown) */
  start_time: string | null;
  buy_in: number;
  guaranteed: number;
  game_type: string;
  tournament_type: string;
  currency: string;
}
