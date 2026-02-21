# Poker Manager — Technical Documentation

> **Version:** 0.1.0
> **Last updated:** 2026-02-21
> **Repository:** https://github.com/mcflay/poker-manager

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema)
5. [Features & Functionality](#5-features--functionality)
6. [API Reference](#6-api-reference)
7. [Components](#7-components)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Testing](#9-testing)
10. [Development Setup](#10-development-setup)
11. [Known Limitations](#11-known-limitations)
12. [Proposed Improvements](#12-proposed-improvements)
13. [File Structure](#13-file-structure)

---

## 1. Overview

Poker Manager is a full-stack Next.js web application for serious poker tournament players. It aggregates tournament schedules imported from real-time scraper scripts (WPT Global, GGPoker), lets players log and analyze their results, manage their bankrolls, track staking deals, and receive reminders before tournament start times.

### Core Features

| Feature | Description |
|---------|-------------|
| **Schedule** | Filterable, sortable tournament schedule table with auto-refresh |
| **My Schedule** | Favorites-only view with countdowns and color-coded priorities |
| **Results Tracking** | Log results (buy-in, payout, bounties, notes) with session grouping |
| **Analytics Dashboard** | ROI, ITM%, P&L charts, breakdowns by site / game type / buy-in |
| **Bankroll Management** | Multi-site accounts with deposit/withdrawal transaction history |
| **Staking** | Track staking deals with markup, settlement, and P&L calculator |
| **Notifications** | Browser push reminders before tournament starts |
| **Multi-Currency** | USD/EUR/GBP with user-editable exchange rates |
| **Data Export** | Export tournaments and results as CSV, JSON, or PDF |
| **Auth** | Email/password registration and login, per-user data scoping |
| **Filter Profiles** | Save, load, and delete named filter configurations |

---

## 2. Technology Stack

### Backend & Database

| Technology | Version | Role |
|------------|---------|------|
| **Next.js** | 16.1.6 | Full-stack framework (App Router, server components, API routes) |
| **TypeScript** | 5.x | Type safety across client and server |
| **SQLite (better-sqlite3)** | 12.6.2 | Embedded relational database — single file at `data/poker.db` |
| **Drizzle ORM** | 0.45.1 | Type-safe schema definitions; raw prepared statements for queries |

### Authentication

| Technology | Version | Role |
|------------|---------|------|
| **NextAuth.js** | v5.0.0-beta.30 | Session management, JWT strategy, Credentials provider |
| **bcryptjs** | — | Password hashing (12 salt rounds) |

### Frontend

| Technology | Version | Role |
|------------|---------|------|
| **React** | 19.2.3 | UI rendering |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **shadcn/ui** | — | Accessible component library (Radix UI primitives) |
| **Lucide React** | 0.575.0 | Icon set |
| **Sonner** | 2.0.7 | Toast notifications |

### State Management

| Technology | Version | Role |
|------------|---------|------|
| **Zustand** | 5.0.11 | Client-side store: filters, sidebar state, favorites |
| **nuqs** | 2.8.8 | URL query parameter state sync |

### Data & Visualization

| Technology | Version | Role |
|------------|---------|------|
| **TanStack Table** | 8.21.3 | Headless sortable table (tournaments, results, transactions) |
| **Recharts** | 3.7.0 | Charts: cumulative P&L line chart, ROI bar chart |
| **PapaParse** | 5.5.3 | CSV parsing for bulk result import |
| **jsPDF + jspdf-autotable** | 4.2.0 / 5.0.7 | PDF generation for data export |
| **Zod** | 4.3.6 | Runtime schema validation |

### Testing

| Technology | Version | Role |
|------------|---------|------|
| **Vitest** | 4.0.18 | Test runner (Jest-compatible) |
| **@testing-library/react** | 16.3.2 | Component testing utilities |
| **jsdom** | 28.1.0 | Browser DOM emulation for tests |

---

## 3. Architecture

### Project Layout

```
poker-manager/
├── src/
│   ├── app/                    # Next.js App Router pages + API routes
│   │   ├── (auth)/             # Login and register pages
│   │   ├── api/                # All server-side API endpoints
│   │   └── */page.tsx          # Page components
│   ├── components/             # React components, grouped by feature
│   ├── lib/                    # Shared server/client utilities
│   │   ├── db/                 # Database connection and schema
│   │   ├── auth/               # NextAuth configuration
│   │   ├── analytics/          # Analytics calculation functions
│   │   ├── staking/            # Staking math functions
│   │   ├── currency/           # Currency formatting and conversion
│   │   ├── export/             # CSV / JSON / PDF export helpers
│   │   ├── notifications/      # Browser notification scheduler
│   │   └── tournament-utils.ts # Tournament classification functions
│   ├── stores/                 # Zustand state stores
│   └── types/                  # TypeScript interfaces
├── data/                       # SQLite database file (gitignored)
├── public/                     # Static assets
└── scripts/                    # Seed scripts for development
```

### Data Flow

```
Scraper scripts (Python)
        │
        ▼
POST /api/import/{wpt,ggpoker}
        │
        ▼  upsert via stable ID
   SQLite tournaments table
        │
        ▼
GET /api/tournaments (with filter params)
        │
        ▼
Zustand store (filters) → TournamentTable component
```

### Request Lifecycle (API routes)

1. Request arrives at `/api/...`
2. `auth()` called — reads JWT from session cookie
3. `userId = session?.user?.id` extracted (may be `undefined` for anonymous)
4. SQL query built with user-scope condition:
   - Authenticated: `WHERE user_id = ?`
   - Anonymous: `WHERE user_id IS NULL`
5. `sqlite.prepare(query).all(...params)` executes
6. Row data mapped to camelCase interface objects
7. `NextResponse.json(...)` returned

### Tournament ID Generation

To support idempotent imports (no duplicate tournaments on repeat runs), a stable ID is derived from the tournament's content rather than a database sequence:

```typescript
// site prefix + base64url(name + startTime).slice(0, 32)
generateStableId("ggpoker", "GGMasters $5 NLH", "2025-03-01T18:00:00Z")
// → "gg_R0dNYXN0ZXJzICQ1IE5MSCB..."
```

Re-importing the same tournament hits `ON CONFLICT (id) DO UPDATE` and refreshes the record rather than creating a duplicate.

### Client-Side State (Zustand)

The `useAppStore` store holds:
- `filters` — all active filter values (sites, buy-in range, game types, etc.)
- `sidebarOpen` — whether the filter panel is visible
- `favorites` — `Set<string>` of favorited tournament IDs

Favorites use **optimistic updates**: the UI updates instantly on toggle, and the API call runs in the background. On failure, the store reverts.

---

## 4. Database Schema

The database is self-initializing — all tables are created via `CREATE TABLE IF NOT EXISTS` on application startup. No separate migration step is required.

### Tables Overview

| Table | Rows | Purpose |
|-------|------|---------|
| `sites` | ~6 (seeded) | Poker rooms/sites (WPT, GGPoker, PokerStars, …) |
| `tournaments` | thousands | Tournament schedule data imported by scrapers |
| `results` | user data | Logged tournament results per user |
| `sessions` | user data | Session groups that bundle multiple results |
| `filter_profiles` | user data | Saved filter configurations |
| `favorites` | user data | Favorited tournaments with metadata |
| `imports` | audit log | Record of each import batch |
| `users` | user data | Registered user accounts |
| `accounts` | auth | OAuth provider account links |
| `auth_sessions` | auth | Active JWT sessions |
| `bankroll_accounts` | user data | Bankroll accounts per site |
| `bankroll_transactions` | user data | Deposits, withdrawals, result-linked transactions |
| `notifications` | user data | Notification queue |
| `notification_preferences` | user data | Per-user notification settings |
| `exchange_rates` | reference | Currency conversion rates (USD↔EUR↔GBP) |
| `staking_deals` | user data | Individual staking agreements |
| `staking_packages` | user data | Groups of staking deals |

### Key Schema Details

```sql
-- Tournament schedule (core of the app)
CREATE TABLE tournaments (
  id TEXT PRIMARY KEY,          -- stable generated ID (not UUID)
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  game_type TEXT NOT NULL,      -- NLHE, PLO, PLO5, HORSE, ...
  format TEXT NOT NULL,         -- MTT, SNG, Spin&Go, Satellite
  speed TEXT,                   -- hyper, turbo, regular, deep
  structure TEXT,               -- freezeout, reentry, rebuy, pko, mystery_bounty
  buy_in REAL NOT NULL,
  rake REAL,
  bounty REAL,
  guarantee REAL,
  start_time TEXT NOT NULL,     -- ISO 8601
  status TEXT DEFAULT 'scheduled',
  currency TEXT DEFAULT 'USD',
  is_series INTEGER DEFAULT 0,
  series_name TEXT,
  ...
);

-- Results (user-scoped)
CREATE TABLE results (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  user_id TEXT,                 -- NULL = anonymous user
  entries INTEGER DEFAULT 1,
  total_invested REAL NOT NULL,
  finish_position INTEGER,
  total_entries_at_finish INTEGER,
  payout REAL DEFAULT 0,
  bounties_won REAL DEFAULT 0,
  net_result REAL,              -- computed: payout + bounties - invested
  session_id TEXT,
  notes TEXT,
  played_at TEXT
);

-- Bankroll transactions
CREATE TABLE bankroll_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bankroll_accounts(id) ON DELETE CASCADE,
  user_id TEXT,
  type TEXT NOT NULL,           -- deposit | withdrawal | result | adjustment
  amount REAL NOT NULL,         -- negative for withdrawals
  balance_after REAL NOT NULL,  -- snapshot of balance after this txn
  related_result_id TEXT,       -- optional link to a result
  description TEXT,
  transacted_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Database Performance

- `PRAGMA journal_mode = WAL` — concurrent readers with a single writer
- `PRAGMA foreign_keys = ON` — referential integrity enforced
- Indexes on frequently filtered columns: `start_time`, `site_id`, `buy_in`, `status`

---

## 5. Features & Functionality

### 5.1 Tournament Schedule (`/`)

The main page displays tournaments from all imported sources in a sortable, filterable table.

**Filter capabilities:**
- **Sites** — multi-select (WPT Global, GGPoker, PokerStars, etc.)
- **Game types** — NLHE, PLO, PLO5, HORSE, Short Deck
- **Format** — MTT, SNG, Spin&Go, Satellite
- **Speed** — Hyper, Turbo, Regular, Deep
- **Structure** — Freezeout, Re-entry, Rebuy, PKO, Mystery Bounty
- **Buy-in range** — min/max slider
- **Time window** — upcoming, today, this week
- **Status** — scheduled, running, completed
- **Search** — full-text name search
- **Favorites only** — toggle to show only favorited tournaments

**Additional features:**
- Auto-refresh every 5 minutes
- Manual refresh button
- Import button (triggers file upload wizard for scraper JSON/CSV)
- Column sorting (buy-in, start time, guarantee, etc.)
- Favorite toggle with optimistic update (instant response)
- "Log Result" shortcut per row
- "Starting soon" badge for tournaments within 30 minutes

### 5.2 My Schedule (`/schedule`)

Shows only favorited tournaments sorted by priority, with countdown timers to start.

- Color coding per favorite (6 colors)
- Priority ordering (High → Medium → Low)
- Countdown display ("Starts in 1h 23m")
- Category labels (e.g., "Sunday Major", "Weekly Series")
- Notes per favorite

### 5.3 Results Tracking (`/results`)

A personal results journal for tracking tournament performance.

**Logging a result:**
- Search/select the tournament from the schedule (or enter manually)
- Number of entries (re-entries)
- Total invested amount (auto-filled from buy-in if tournament selected)
- Finish position and field size
- Payout and bounties won
- Optional session assignment and notes
- Net result auto-computed: `payout + bounties - total_invested`

**ResultsList features:**
- Summary bar: total invested, total return, net profit, ROI%, ITM%
- Sortable by date, buy-in, payout, net result
- Session filter dropdown
- Edit and delete per row

**Bulk Import:**
- Upload CSV with column mapping UI
- Required columns: tournament name, buy-in, payout
- Optional: finish position, bounties, notes, played_at

**Export:**
- CSV or JSON via the Export dropdown button

### 5.4 Analytics (`/analytics`)

Dashboard of performance metrics over time.

**Summary cards:**
- Total tournaments played
- Total invested
- Net P&L (absolute and %)
- ROI %
- ITM% (in-the-money rate)
- Longest win streak / loss streak

**Charts:**
- **Cumulative P&L** — area chart showing bankroll growth over time
- **By Site** — horizontal bar chart: ROI per poker room
- **By Game Type** — horizontal bar chart: ROI per game type (NLHE, PLO, etc.)
- **By Buy-In Bracket** — horizontal bar chart: ROI by buy-in range

**Filtering:**
- Date range (from / to)
- All filters apply server-side on `GET /api/analytics`

### 5.5 Bankroll Management (`/bankroll`)

Multi-site bankroll tracking with full transaction history.

**Accounts:**
- Create accounts per poker site (or without a site)
- Initial balance on creation automatically creates a deposit transaction
- Delete account removes all associated transactions (CASCADE)

**Transactions:**
- Types: `deposit`, `withdrawal`, `result`, `adjustment`
- Each transaction records `balance_after` (point-in-time snapshot)
- Deletion reverses the balance effect on the account

**Balance display:**
- Color-coded: green (positive), red (negative)
- Total balance across all accounts shown in header

### 5.6 Staking (`/staking`)

Track staking deals where another player ("staker") buys a percentage of action.

**Deal creation:**
- Staker name, buy-in amount, % sold, markup multiplier
- Staker investment auto-calculated: `buyIn × (% / 100) × markup`

**Settlement:**
- Enter total payout → system computes staker payout and player net
- Player net = `payout - buyIn - stakerPayout + stakerInvestment`

**Staking Calculator:**
- Interactive real-time calculator (no save)
- Shows staker investment, effective buy-in, staker payout, staker P&L, player net

### 5.7 Notifications

**Browser push notifications:**
- Requires explicit browser permission grant
- Uses `Notification` Web API (no service worker required)
- Reminders scheduled client-side with `setTimeout`
- Configurable minutes-before: 5, 10, 15, 30, 60 (default 15)
- Notifications cleared on page reload (ephemeral scheduling)

**In-app notification center (Bell icon):**
- Unread count badge on bell icon
- Dropdown list of last 50 notifications
- Mark individual or all as read
- Polls for new notifications every 60 seconds

### 5.8 Multi-Currency

- Supported currencies: USD, EUR, GBP, CAD, AUD
- Exchange rates stored in DB, seeded with approximate values
- Users can edit rates manually via Settings → Currency
- Currency formatting: `formatCurrency(amount, "EUR")` → `€25.00`
- Conversion: `convertCurrency(100, "USD", "EUR", rateMap)` → `92.00`

> **Note:** There is no live exchange rate API integration. Rates must be updated manually.

### 5.9 Data Export

Available from the Results page header and Settings → Data:

| Format | Implementation | Notes |
|--------|---------------|-------|
| **CSV** | PapaParse `unparse()` | Triggers browser download |
| **JSON** | `JSON.stringify` with 2-space indent | Triggers browser download |
| **PDF** | jsPDF + jspdf-autotable | Generates a formatted table PDF |

Exportable data: tournaments (schedule), results (personal history).

### 5.10 Saved Filter Profiles

- Save current filter state with a custom name
- Load a saved profile (replaces current filters)
- Delete profiles
- Mark a profile as default (auto-loads on page open)
- Profiles are stored per-user in the DB

---

## 6. API Reference

All API routes are under `/api/`. Authentication is checked via `auth()` from NextAuth — unauthenticated requests are served data scoped to `user_id IS NULL`.

### Authentication

| Method | Route | Description |
|--------|-------|-------------|
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth.js handler (session, sign-in, sign-out) |
| `POST` | `/api/auth/register` | Create user account. Body: `{ name, email, password }` |

### Tournaments

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/tournaments` | List tournaments. Query params: `site`, `gameType`, `format`, `speed`, `structure`, `minBuyIn`, `maxBuyIn`, `status`, `search`, `timeWindow`, `favoritesOnly` |
| `POST` | `/api/import/wpt` | Import WPT Global scraper JSON. Body: `{ tournaments: [...] }` |
| `POST` | `/api/import/ggpoker` | Import GGPoker scraper JSON. Body: `{ tournaments: [...] }` |

### Results

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/results` | List results. Query: `sessionId`, `dateFrom`, `dateTo`, `limit`, `offset` |
| `POST` | `/api/results` | Create result. Body: `{ tournamentId, entries, totalInvested, finishPosition, totalEntriesAtFinish, payout, bountiesWon, sessionId, notes, playedAt }` |
| `GET` | `/api/results/:id` | Get single result |
| `DELETE` | `/api/results/:id` | Delete result |
| `POST` | `/api/results/bulk` | Bulk import. Body: `{ results: [...] }` |

### Sessions

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/sessions` | List sessions with aggregated result stats |
| `POST` | `/api/sessions` | Create session. Body: `{ name, date, notes }` |
| `GET/PUT/DELETE` | `/api/sessions/:id` | Read / update / delete session |

### Favorites

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/favorites` | List all favorites with full details |
| `POST` | `/api/favorites` | Toggle favorite. Body: `{ tournamentId }` |
| `PUT` | `/api/favorites` | Update favorite attributes. Body: `{ tournamentId, color, priority, notes, category }` |

### Filter Profiles

| Method | Route | Description |
|--------|-------|-------------|
| `GET/POST` | `/api/filter-profiles` | List / create profiles. POST body: `{ name, filters, isDefault }` |
| `PUT/DELETE` | `/api/filter-profiles/:id` | Update / delete profile |

### Analytics

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/analytics` | Summary + timeline + breakdowns. Query: `dateFrom`, `dateTo` |

### Bankroll

| Method | Route | Description |
|--------|-------|-------------|
| `GET/POST` | `/api/bankroll/accounts` | List accounts / create. POST: `{ name, siteId, currency, initialBalance }` |
| `GET/PUT/DELETE` | `/api/bankroll/accounts/:id` | Read / update / delete account |
| `GET/POST` | `/api/bankroll/transactions` | List (query: `accountId`) / create. POST: `{ accountId, type, amount, description }` |
| `PUT/DELETE` | `/api/bankroll/transactions/:id` | Update description / delete (reverses balance) |
| `GET` | `/api/bankroll/summary` | Aggregate stats across all accounts |

### Staking

| Method | Route | Description |
|--------|-------|-------------|
| `GET/POST` | `/api/staking/deals` | List / create deals. POST: `{ stakerName, buyInAmount, percentageSold, markup, notes }` |
| `GET/PUT/DELETE` | `/api/staking/deals/:id` | Read / update / delete deal |
| `POST` | `/api/staking/deals/:id/settle` | Settle deal. Body: `{ totalPayout }` |
| `GET/POST` | `/api/staking/packages` | List / create packages |
| `GET/PUT` | `/api/staking/packages/:id` | Read / update package |
| `GET` | `/api/staking/summary` | Aggregate staking P&L |

### Notifications

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/notifications` | List notifications + unread count |
| `POST` | `/api/notifications` | Mark read. Body: `{ id }` or `{ markAllRead: true }` |
| `GET/PUT` | `/api/notifications/preferences` | Get / update preferences |

### Export & Utilities

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/export/tournaments` | Export. Query: `format` (csv/json), `dateFrom`, `dateTo` |
| `GET` | `/api/export/results` | Export. Query: `format` (csv/json) |
| `GET` | `/api/sites` | List all active poker sites |
| `GET/POST` | `/api/currency/rates` | List rates / update rate. POST: `{ baseCurrency, targetCurrency, rate }` |

---

## 7. Components

### Feature Components

#### Tournament Schedule
- **`TournamentTable`** — Main schedule table. Uses TanStack Table for sorting. Shows name, site, buy-in, guarantee, format, speed, start time, status. Favorite toggle, "Log Result" button per row.

#### Filter Panel
- **`FilterPanel`** — Collapsible sidebar with all filter controls. Calls `setFilters()` on the Zustand store. Includes `SavedProfiles` at the top.
- **`SavedProfiles`** — Dropdown to save current filter state or load/delete saved profiles. Communicates with `/api/filter-profiles`.

#### Results
- **`ResultForm`** — Full result logging form with tournament search autocomplete, entries, payout/bounties fields, session picker, net calculation preview.
- **`ResultsList`** — Table of results with summary stats bar (total invested, net P&L, ROI%, ITM%). Sortable columns, session filter.
- **`BulkResultImport`** — File upload → PapaParse → column mapping UI → POST to `/api/results/bulk`.
- **`SessionManager`** — Session list with create form. Selecting a session filters the results list.

#### Analytics
- **`StatsCards`** — Grid of 8 metric cards. Loads from parent page props.
- **`BankrollChart`** — Recharts `AreaChart` with cumulative P&L over time. Responsive, formatted tooltips.
- **`ROIBreakdown`** — Recharts horizontal `BarChart` + detail table showing count, invested, profit, ROI per group.

#### Bankroll
- **`AccountCard`** — Shows account name, site, balance (color-coded), deposit/withdraw/delete actions.
- **`TransactionForm`** — Simple form: amount + optional description. Handles deposit/withdrawal semantics.
- **`TransactionList`** — Scrollable list of transactions with type icon, amount (+/-), balance-after snapshot.

#### Staking
- **`StakingCalculator`** — Stateless calculator with 4 inputs (buy-in, %, markup, payout). Shows 5 computed outputs in real time.
- **`StakingDealForm`** — Create a new staking deal. Shows computed staker investment preview.
- **`StakingDealList`** — Compact table with status badges (pending/settled), settle button, delete.

#### Notifications
- **`NotificationBell`** — Bell icon with unread badge. Click opens dropdown list. Polls every 60s.
- **`NotificationPreferences`** — Enable browser notifications (requests `Notification` permission), set reminder timing, toggle daily digest.

#### Settings
- **`ProfileSettings`** — Name, email, password update form (UI only — no backend user update API yet).
- **`CurrencySettings`** — Display currency selector + exchange rate table with inline editing.
- **`DataManagement`** — Export buttons (tournaments, results, all) + danger zone with account delete placeholder.

#### Auth
- **`LoginForm`** — Email + password form. Calls `signIn("credentials", ...)`. Shows error messages.
- **`RegisterForm`** — Email + password + name form. Calls `POST /api/auth/register`.
- **`UserMenu`** — Shows username, settings icon (→ `/settings`), and sign-out button.

#### Shared
- **`ImportButton`** — File picker that posts JSON/CSV to the appropriate import route based on detected source type.
- **`ExportButton`** — Dropdown with CSV and JSON options. Fetches from an export API endpoint and triggers browser download.
- **`FavoriteEditor`** — Color picker, priority selector, notes/category fields for a favorited tournament.

---

## 8. Authentication & Authorization

### Flow

```
User submits email + password
        │
POST /api/auth/register (new users)
or
NextAuth signIn("credentials", ...) (returning users)
        │
        ▼
CredentialsProvider.authorize():
  1. Find user by email in SQLite
  2. bcrypt.compare(password, passwordHash)
  3. Return { id, email, name } or null
        │
        ▼
JWT created with user.id embedded
Session cookie set (httpOnly, secure in production)
        │
        ▼
Each API request:
  const session = await auth();
  const userId = session?.user?.id; // undefined if unauthenticated
```

### User Scoping

Every table that stores personal data has a `user_id TEXT` column (nullable). All queries follow this pattern:

```typescript
const userFilter = userId ? "WHERE user_id = ?" : "WHERE user_id IS NULL";
const params = userId ? [userId] : [];
const rows = sqlite.prepare(`SELECT * FROM results ${userFilter}`).all(...params);
```

This means **the app is fully functional without creating an account** — anonymous data lives in `user_id IS NULL` rows. When a user registers and logs in, they get a fresh isolated dataset.

### Middleware

`src/middleware.ts` protects routes. Public routes (login, register, API auth) are accessible without a session. All other routes require authentication (redirects to `/login`).

---

## 9. Testing

### Setup

```bash
npm test          # run all tests once
npm run test:watch  # watch mode
npm run test:coverage  # with coverage report
```

### Test Structure

```
src/
├── components/__tests__/
│   ├── LoginForm.test.tsx
│   ├── ResultForm.test.tsx
│   ├── TransactionForm.test.tsx
│   ├── NotificationBell.test.tsx
│   └── StakingCalculator.test.tsx
├── lib/__tests__/
│   ├── tournament-utils.test.ts
│   ├── analytics-calculations.test.ts
│   ├── staking-calculations.test.ts
│   ├── currency.test.ts
│   ├── export-csv.test.ts
│   ├── export-json.test.ts
│   └── notifications-scheduler.test.ts
├── stores/__tests__/
│   └── app-store.test.ts
└── app/api/__tests__/
    ├── auth-register.test.ts
    ├── results.test.ts
    ├── sessions.test.ts
    ├── filter-profiles.test.ts
    ├── analytics.test.ts
    └── bankroll.test.ts
```

### Test Patterns

**Component tests** (jsdom environment):
```typescript
// Mock dependencies
vi.mock("next-auth/react", () => ({ useSession: vi.fn().mockReturnValue({ data: null }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
global.fetch = vi.fn();

// Render and assert
render(<TransactionForm accountId="1" type="deposit" onSuccess={vi.fn()} onCancel={vi.fn()} />);
expect(screen.getByLabelText("Amount")).toBeInTheDocument();
```

**API route tests** (Node environment — `@vitest-environment node`):
```typescript
// Mock SQLite and auth
vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue({ user: { id: "test" } }) }));
vi.mock("@/lib/db", () => ({ sqlite: { prepare: mockPrepare } }));

// Import route and call with mock Request
const { GET } = await import("@/app/api/results/route");
const res = await GET();
const data = await res.json();
expect(data.results).toHaveLength(1);
```

**Pure function tests**:
```typescript
expect(calcStakerInvestment(100, 50, 1.1)).toBeCloseTo(55);
expect(formatCurrency(-50.5, "EUR")).toBe("€50.50");
```

### Coverage (as of v0.1.0)

- **19 test files**, **165 tests**, 100% passing
- Coverage: pure utility functions (analytics, staking, currency, tournament-utils, export) fully tested
- Component tests cover rendering and basic interactions
- API route tests cover happy path + validation errors + 404 cases

---

## 10. Development Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Windows or macOS (path-aware for SQLite file)

### Installation

```bash
cd poker-manager
npm install
```

### Environment Variables

Create `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
```

### Database

The SQLite database is auto-created at `data/poker.db` on first run. No migration commands needed.

### Development Server

```bash
npm run dev          # Start on http://localhost:3000
npm run build        # Production build
npm run start        # Start production server
```

### Loading Data

Run the scrapers first, then import:

```bash
# WPT Global
python Scrapers/wpt_full_scan.py
# Then POST the output JSON to /api/import/wpt via the Import button

# GGPoker
python Scrapers/ggpoker/scraper.py
# Then POST the output JSON to /api/import/ggpoker
```

Or use the seed scripts for development:

```bash
node scripts/seed-wpt.mjs
node scripts/seed-ggpoker.mjs
```

---

## 11. Known Limitations

### Authentication
- **No OAuth providers** — only email/password. Adding Google/GitHub login requires minimal config change but has not been implemented.
- **No email verification** — users can register with any email address without verification.
- **No password reset** — there is no "Forgot Password" flow. A user who loses their password cannot recover their account.
- **ProfileSettings is UI-only** — the Settings → Profile tab renders the form but has no backend endpoint to update name/email/password (`PUT /api/users/:id` is not implemented).
- **Session expiry** — JWT sessions use default NextAuth expiry (30 days). No refresh token rotation.

### Notifications
- **Client-side only scheduling** — reminders are scheduled with `setTimeout` in the browser. They disappear on page reload or tab close. There is no persistent server-side job scheduler (e.g., cron, Redis queues).
- **No email notifications** — the daily digest preference is stored but there is no email sending implementation. Would require a transactional email provider (Resend, SendGrid, etc.).
- **No service worker** — push notifications don't work in the background (tab must be open).

### Multi-Currency
- **No live rate API** — exchange rates are seeded with approximate values and must be updated manually in Settings. No integration with a live FX API (e.g., Open Exchange Rates, Fixer.io).
- **Display only** — currency conversion is available in the currency utilities library but is not yet applied to tournament buy-in/guarantee display or analytics totals. All values are shown in their native currency.

### Bankroll
- **No auto-linking to results** — when a result is logged, no bankroll transaction is automatically created. The plan specified this integration but it was not implemented. Users must manually record deposits/withdrawals.
- **No balance validation** — withdrawals can take accounts below zero. There is no overdraft warning.

### Analytics
- **No heatmap** — the volume-by-day/hour heatmap component was planned (Phase 7) but not implemented. Only cumulative P&L and ROI breakdowns exist.
- **No export from analytics page** — the ExportButton is present on the results page but not on the analytics dashboard.

### Schedule & Import
- **No real-time scraper integration** — scrapers are separate Python scripts run manually. There is no "scrape now" button or automatic scheduled scraping from within the app.
- **Max 2000 tournaments per query** — the `LIMIT 200` in some queries and `LIMIT 2000` in others may hide data in large datasets.
- **No tournament deletion** — there is no UI or API to delete specific tournaments. The only way to remove data is to drop the database.
- **No pagination on the schedule table** — all matching tournaments load at once, which may be slow with thousands of records.

### Staking
- **No staker accounts** — stakers are identified only by name string. If the same staker appears in multiple deals, there is no way to aggregate their totals (no `stakers` table).
- **No package → deal linking** — packages exist as a separate concept but deals are not associated with packages in the current schema.

### Data & Storage
- **Single SQLite file** — not suitable for multi-user production deployment. Multiple simultaneous writers could cause lock contention. Would need PostgreSQL for scale.
- **No backup mechanism** — `data/poker.db` is the single source of truth. There is no automated backup or point-in-time recovery.
- **Data/poker.db is gitignored** — data is not version-controlled. This is correct for personal deployment but means there is no way to share a pre-seeded database.

### UI/UX
- **No dark mode toggle** — `next-themes` is installed but no theme switcher is exposed in the UI.
- **Mobile responsiveness is partial** — the filter panel, analytics charts, and schedule table are not optimized for small screens.
- **No keyboard navigation** — the tournament table does not support keyboard-driven row selection or favorite toggling.
- **Analytics page has no export button** — unlike the Results page, the Analytics dashboard offers no way to export the displayed stats.

---

## 12. Proposed Improvements

### High Priority

#### 1. Live Scraper Integration
**Problem:** Scrapers are run manually as separate Python scripts.
**Solution:** Add a "Scrape Now" API endpoint that spawns the Python scraper as a child process and streams progress. Display last-scraped timestamps per site. Consider a cron job or Windows Task Scheduler integration for automatic scraping.

#### 2. Email / Password Reset
**Problem:** Users with lost passwords have no recovery path.
**Solution:** Implement `/api/auth/forgot-password` → generate a time-limited reset token → send via email (Resend/SendGrid) → `/api/auth/reset-password` to set new password.

#### 3. Result → Bankroll Auto-Link
**Problem:** Logging a result doesn't automatically update bankroll.
**Solution:** In `POST /api/results`, check if the user has a bankroll account linked to the result's site. If so, create a `result`-type transaction automatically: `amount = net_result`, `related_result_id = result.id`.

#### 4. Live Exchange Rates
**Problem:** Rates are static seed data.
**Solution:** Integrate a free FX API (e.g., [Open Exchange Rates](https://openexchangerates.org/) free tier). Add a background refresh job (daily cron) that updates `exchange_rates`. Fall back to stored rates if the API is unavailable.

#### 5. Complete ProfileSettings Backend
**Problem:** Profile editing form has no backend.
**Solution:** Implement `PUT /api/users/me` with name, email, and password change (requires current password verification). Also support user avatar upload to `/public/avatars/`.

### Medium Priority

#### 6. Persistent Background Notifications (Service Worker)
**Problem:** Tournament reminders are lost on tab close.
**Solution:** Implement a proper service worker (`/public/sw.js`) with a push notification API. Register favorites with scheduled times. The service worker can fire notifications even when the tab is closed.

#### 7. Analytics Heatmap
**Problem:** Volume heatmap (day × hour) was planned but not built.
**Solution:** Add `GET /api/analytics/heatmap` returning counts grouped by `(dayOfWeek, hourOfDay)`. Build a grid heatmap component (can use a simple Recharts `ScatterChart` or a custom CSS grid with color intensity).

#### 8. Mobile-First Responsive Design
**Problem:** App is not fully usable on mobile.
**Solution:**
- Replace the sidebar filter panel with a bottom sheet on mobile
- Make the tournament table horizontally scrollable with sticky first column
- Add a condensed card view for results on small screens
- Consider a dedicated mobile nav bar at the bottom

#### 9. Tournament Pagination / Virtual Scrolling
**Problem:** All matching tournaments are loaded at once.
**Solution:** Implement server-side pagination with `LIMIT` + `OFFSET` and a "Load More" button, or use TanStack Virtual for virtual scrolling of large lists.

#### 10. Staker Management
**Problem:** Stakers are plain strings with no deduplication or history.
**Solution:** Add a `stakers` table with name, email, notes. Link `staking_deals` to staker ID. Show per-staker P&L history and aggregate returns.

### Long-Term / Advanced

#### 11. PostgreSQL Migration
**Problem:** SQLite is not suitable for production multi-user deployment.
**Solution:** Migrate schema to PostgreSQL (Drizzle supports both). Drizzle handles the migration. Keeps all query patterns intact. Deploy on Vercel (Neon/Supabase) or self-hosted.

#### 12. ICM / Tournament EV Calculator
**Problem:** No expected value (EV) calculations.
**Solution:** Add an ICM calculator for final tables: input stack sizes and pay jumps → compute each player's EV. Also: chip EV for push/fold decisions by stack size.

#### 13. HUD Integration (Hand History Analysis)
**Problem:** No connection between hand history and tournament results.
**Solution:** Import PokerStars/GGPoker hand history files. Parse key stats (VPIP, PFR, 3-bet%, etc.). Display stat trends overlaid with result trends.

#### 14. Shared / Public Tournament Calendars
**Problem:** No way to share a tournament schedule with others.
**Solution:** Add shareable filter profile URLs that load a read-only calendar view. Tournament groups / series could have public pages (e.g., WSOP, SCOOP series pages).

#### 15. Plugin Architecture for Scraper Sources
**Problem:** Adding a new poker site requires writing a new Python scraper and API import route.
**Solution:** Define a standard JSON schema for tournament data. Allow scrapers to register themselves. The import endpoint accepts any conforming payload with a `source` field.

---

## 13. File Structure

```
poker-manager/
│
├── .env.local                          # Environment variables (not committed)
├── .env.example                        # Template for required env vars
├── .gitignore                          # Ignores data/, .env.local, node_modules
├── package.json                        # Dependencies and npm scripts
├── next.config.ts                      # Next.js config (better-sqlite3 external)
├── tsconfig.json                       # TypeScript config (@ path alias)
├── vitest.config.ts                    # Vitest + jsdom test setup
├── postcss.config.mjs                  # PostCSS + Tailwind
├── DOCUMENTATION.md                    # This file
│
├── data/
│   └── poker.db                        # SQLite database (auto-created, gitignored)
│
├── scripts/
│   ├── seed-wpt.mjs                    # Dev seed: WPT Global tournaments
│   └── seed-ggpoker.mjs                # Dev seed: GGPoker tournaments
│
├── public/
│   └── favicon.ico
│
└── src/
    │
    ├── app/                            # Next.js App Router
    │   ├── layout.tsx                  # Root layout (SessionProvider, Toaster)
    │   ├── page.tsx                    # / — Main schedule page
    │   ├── schedule/page.tsx           # /schedule — My Schedule (favorites view)
    │   ├── results/page.tsx            # /results — Results tracking
    │   ├── analytics/page.tsx          # /analytics — Analytics dashboard
    │   ├── bankroll/page.tsx           # /bankroll — Bankroll management
    │   ├── staking/page.tsx            # /staking — Staking deals
    │   ├── settings/page.tsx           # /settings — Settings
    │   ├── login/page.tsx              # /login — Login form
    │   ├── register/page.tsx           # /register — Registration form
    │   │
    │   └── api/
    │       ├── auth/
    │       │   ├── [...nextauth]/route.ts
    │       │   └── register/route.ts
    │       ├── tournaments/route.ts
    │       ├── results/
    │       │   ├── route.ts
    │       │   ├── [id]/route.ts
    │       │   └── bulk/route.ts
    │       ├── sessions/
    │       │   ├── route.ts
    │       │   └── [id]/route.ts
    │       ├── favorites/route.ts
    │       ├── filter-profiles/
    │       │   ├── route.ts
    │       │   └── [id]/route.ts
    │       ├── sites/route.ts
    │       ├── analytics/route.ts
    │       ├── import/
    │       │   ├── wpt/route.ts
    │       │   └── ggpoker/route.ts
    │       ├── bankroll/
    │       │   ├── accounts/route.ts
    │       │   ├── accounts/[id]/route.ts
    │       │   ├── transactions/route.ts
    │       │   ├── transactions/[id]/route.ts
    │       │   └── summary/route.ts
    │       ├── notifications/
    │       │   ├── route.ts
    │       │   └── preferences/route.ts
    │       ├── currency/
    │       │   └── rates/route.ts
    │       ├── staking/
    │       │   ├── deals/route.ts
    │       │   ├── deals/[id]/route.ts
    │       │   ├── deals/[id]/settle/route.ts
    │       │   ├── packages/route.ts
    │       │   ├── packages/[id]/route.ts
    │       │   └── summary/route.ts
    │       └── export/
    │           ├── tournaments/route.ts
    │           └── results/route.ts
    │
    ├── components/
    │   ├── ui/                         # shadcn/ui primitives (button, input, etc.)
    │   ├── auth/
    │   │   ├── LoginForm.tsx
    │   │   ├── RegisterForm.tsx
    │   │   ├── SessionProvider.tsx
    │   │   └── UserMenu.tsx
    │   ├── tournament-table/
    │   │   └── TournamentTable.tsx
    │   ├── filter-panel/
    │   │   ├── FilterPanel.tsx
    │   │   └── SavedProfiles.tsx
    │   ├── import-wizard/
    │   │   └── ImportButton.tsx
    │   ├── results/
    │   │   ├── ResultForm.tsx
    │   │   ├── ResultsList.tsx
    │   │   ├── BulkResultImport.tsx
    │   │   └── SessionManager.tsx
    │   ├── analytics/
    │   │   ├── StatsCards.tsx
    │   │   ├── BankrollChart.tsx
    │   │   └── ROIBreakdown.tsx
    │   ├── bankroll/
    │   │   ├── AccountCard.tsx
    │   │   ├── TransactionForm.tsx
    │   │   └── TransactionList.tsx
    │   ├── staking/
    │   │   ├── StakingCalculator.tsx
    │   │   ├── StakingDealForm.tsx
    │   │   └── StakingDealList.tsx
    │   ├── notifications/
    │   │   ├── NotificationBell.tsx
    │   │   └── NotificationPreferences.tsx
    │   ├── settings/
    │   │   ├── ProfileSettings.tsx
    │   │   ├── CurrencySettings.tsx
    │   │   └── DataManagement.tsx
    │   ├── favorites/
    │   │   └── FavoriteEditor.tsx
    │   ├── export/
    │   │   └── ExportButton.tsx
    │   └── __tests__/
    │       ├── LoginForm.test.tsx
    │       ├── ResultForm.test.tsx
    │       ├── TransactionForm.test.tsx
    │       ├── NotificationBell.test.tsx
    │       └── StakingCalculator.test.tsx
    │
    ├── lib/
    │   ├── db/
    │   │   ├── index.ts                # SQLite init, table creation, seeding
    │   │   └── schema.ts               # Drizzle ORM schema definitions
    │   ├── auth/
    │   │   ├── config.ts               # NextAuth Credentials config
    │   │   └── index.ts                # Auth handler exports
    │   ├── types/index.ts              # TypeScript interfaces
    │   ├── utils.ts                    # cn() Tailwind class merger
    │   ├── tournament-utils.ts         # detectSpeed, detectStructure, normalizeGameType
    │   ├── analytics/
    │   │   └── calculations.ts         # computeSummary, computeTimeline, computeBreakdown
    │   ├── staking/
    │   │   └── calculations.ts         # calcStakerInvestment, calcPlayerNet, etc.
    │   ├── currency/
    │   │   └── index.ts                # formatCurrency, convertCurrency, getCurrencySymbol
    │   ├── export/
    │   │   ├── csv.ts                  # toCSV, downloadCSV
    │   │   ├── json.ts                 # toJSON, downloadJSON
    │   │   └── pdf.ts                  # generatePDF, dataToPDFRows
    │   ├── notifications/
    │   │   └── scheduler.ts            # scheduleReminder, cancelReminder
    │   └── __tests__/
    │       ├── tournament-utils.test.ts
    │       ├── analytics-calculations.test.ts
    │       ├── staking-calculations.test.ts
    │       ├── currency.test.ts
    │       ├── export-csv.test.ts
    │       ├── export-json.test.ts
    │       └── notifications-scheduler.test.ts
    │
    ├── stores/
    │   ├── app-store.ts                # Zustand: filters, sidebar, favorites
    │   └── __tests__/
    │       └── app-store.test.ts
    │
    ├── types/
    │   └── next-auth.d.ts              # Augments Session type with user.id
    │
    └── test/
        ├── setup.ts                    # @testing-library/jest-dom matchers
        ├── test-utils.tsx              # Custom render with SessionProvider
        └── mocks/
            └── data.ts                 # Sample tournament, result fixtures
```

---

*Documentation generated 2026-02-21. The app is actively developed — refer to the git history for the most recent changes.*
