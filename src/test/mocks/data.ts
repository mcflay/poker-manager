/**
 * Shared test fixtures — sample data for use across test files.
 *
 * Provides realistic tournament, site, and result data that mirrors
 * the actual data shapes used by the application.
 */

import { Tournament, Site, Result, FilterState, DEFAULT_FILTERS } from "@/lib/types";

/** Sample poker sites matching the seeded DB defaults */
export const mockSites: Site[] = [
  { id: "wptglobal", name: "WPT Global", currency: "USD", isActive: true },
  { id: "ggpoker", name: "GGPoker", currency: "USD", isActive: true },
  { id: "pokerstars", name: "PokerStars", currency: "USD", isActive: true },
];

/** Sample tournaments covering various formats, speeds, and statuses */
export const mockTournaments: Tournament[] = [
  {
    id: "wptglobal_abc123",
    siteId: "wptglobal",
    siteName: "WPT Global",
    name: "$50K GTD Mystery Bounty",
    gameType: "NLHE",
    format: "MTT",
    speed: "regular",
    structure: "mystery_bounty",
    tournamentType: "Bounty",
    buyIn: 109,
    rake: 9,
    bounty: 0,
    guarantee: 50000,
    startTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
    status: "scheduled",
    currency: "USD",
    isSeries: false,
    hasResult: false,
    isFavorite: false,
  },
  {
    id: "ggpoker_def456",
    siteId: "ggpoker",
    siteName: "GGPoker",
    name: "GGMasters $150 Turbo PKO",
    gameType: "NLHE",
    format: "MTT",
    speed: "turbo",
    structure: "pko",
    tournamentType: "Bounty",
    buyIn: 150,
    rake: 12,
    bounty: 50,
    guarantee: 100000,
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h from now
    status: "registering",
    currency: "USD",
    isSeries: false,
    hasResult: false,
    isFavorite: true,
  },
  {
    id: "wptglobal_ghi789",
    siteId: "wptglobal",
    siteName: "WPT Global",
    name: "$5 Hyper Turbo Satellite",
    gameType: "NLHE",
    format: "Satellite",
    speed: "hyper",
    structure: "freezeout",
    tournamentType: "Satellite",
    buyIn: 5,
    rake: 0.5,
    bounty: 0,
    guarantee: 0,
    startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // started 30 min ago
    status: "running",
    currency: "USD",
    isSeries: false,
    hasResult: false,
    isFavorite: false,
  },
  {
    id: "pokerstars_jkl012",
    siteId: "pokerstars",
    siteName: "PokerStars",
    name: "Sunday Million PLO",
    gameType: "PLO",
    format: "MTT",
    speed: "regular",
    structure: "reentry",
    tournamentType: "",
    buyIn: 215,
    rake: 15,
    bounty: 0,
    guarantee: 1000000,
    startTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // finished 5h ago
    status: "completed",
    currency: "USD",
    isSeries: true,
    seriesName: "Sunday Special",
    hasResult: true,
    isFavorite: true,
  },
];

/** Sample result for the completed tournament */
export const mockResults: Result[] = [
  {
    id: "result_001",
    tournamentId: "pokerstars_jkl012",
    entries: 2,
    totalInvested: 430,
    finishPosition: 15,
    totalEntriesAtFinish: 6543,
    payout: 1250,
    bountiesWon: 0,
    netResult: 820,
    notes: "Made a deep run, got unlucky on the bubble",
    playedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

/** WPT scraper output fixture for testing the import route */
export const mockWptScraperOutput = {
  scraped_at: new Date().toISOString(),
  tournament_count: 2,
  tournaments: [
    {
      name: "$10K GTD Turbo PKO",
      start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      buy_in: 22,
      guaranteed: 10000,
      game_type: "NLH",
      tournament_type: "Bounty",
      currency: "USD",
    },
    {
      name: "Freeroll Deep Stack",
      start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      buy_in: 0,
      guaranteed: 500,
      game_type: "",
      tournament_type: "",
      currency: "USD",
    },
  ],
};
