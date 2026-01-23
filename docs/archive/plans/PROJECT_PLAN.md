# EventOps - Complete Project Plan

## A) Repo Bootstrapping Plan

### Prerequisites
- Node.js 20+ and npm
- Docker & Docker Compose
- Git

### Initial Setup Commands

```bash
# 1. Initialize Next.js with TypeScript
npx create-next-app@latest eventops --typescript --tailwind --app --src-dir --import-alias "@/*"
cd eventops

# 2. Install core dependencies
npm install --save \
  @prisma/client \
  @auth/prisma-adapter \
  next-auth@beta \
  @tanstack/react-query \
  zod \
  bcryptjs \
  date-fns \
  clsx \
  class-variance-authority \
  lucide-react

# 3. Install dev dependencies
npm install --save-dev \
  prisma \
  @types/bcryptjs \
  @types/node \
  @playwright/test \
  vitest \
  @vitejs/plugin-react \
  eslint \
  prettier \
  prettier-plugin-tailwindcss \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin

# 4. Initialize Prisma
npx prisma init

# 5. Initialize Playwright
npx playwright install

# 6. Setup shadcn/ui
npx shadcn-ui@latest init -d
```

### File Structure

```
eventops/
├── .env                          # Local env vars (gitignored)
├── .env.example                  # Template for env vars
├── .gitignore
├── docker-compose.yml            # Local Postgres + app
├── Dockerfile                    # App container
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── components.json               # shadcn config
├── prettier.config.js
├── .eslintrc.json
├── vitest.config.ts
├── playwright.config.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                   # Seed data script
│   └── migrations/
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── events/route.ts
│   │   │   ├── accounts/route.ts
│   │   │   └── ...
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx        # Shared dashboard layout
│   │   │   ├── events/
│   │   │   ├── accounts/
│   │   │   ├── people/
│   │   │   ├── outreach/
│   │   │   ├── research/
│   │   │   └── execution/
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   ├── layout/
│   │   │   ├── nav.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── header.tsx
│   │   ├── events/
│   │   ├── accounts/
│   │   ├── people/
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── auth.ts               # Auth config
│   │   ├── db.ts                 # Prisma client
│   │   ├── utils.ts              # cn() helper, etc
│   │   ├── validations/          # Zod schemas
│   │   ├── services/             # Business logic
│   │   │   ├── scoring.ts
│   │   │   ├── ingestion.ts
│   │   │   ├── outreach.ts
│   │   │   └── enrichment.ts
│   │   └── constants.ts
│   │
│   └── types/
│       └── index.ts              # Shared TypeScript types
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── public/
    └── seed-data/
        ├── manifest-companies.csv
        └── manifest-people.csv
```

### Environment Variables (.env.example)

```bash
# Database
DATABASE_URL="postgresql://eventops:eventops@localhost:5432/eventops?schema=public"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars-change-in-prod"

# Optional: Feature Flags
FEATURE_AUTO_ENRICHMENT=false

# Optional: Search API (for enrichment)
SERPAPI_KEY=""
OPENAI_API_KEY=""
```

### Docker Compose (docker-compose.yml)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: eventops-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: eventops
      POSTGRES_PASSWORD: eventops
      POSTGRES_DB: eventops
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eventops"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Uncomment for production-like local development
  # app:
  #   build: .
  #   container_name: eventops-app
  #   restart: unless-stopped
  #   depends_on:
  #     postgres:
  #       condition: service_healthy
  #   environment:
  #     DATABASE_URL: postgresql://eventops:eventops@postgres:5432/eventops
  #     NEXTAUTH_URL: http://localhost:3000
  #   ports:
  #     - "3000:3000"
  #   volumes:
  #     - .:/app
  #     - /app/node_modules

volumes:
  postgres_data:
```

### Local Development Workflow

```bash
# 1. Start Postgres
docker compose up -d postgres

# 2. Run migrations
npx prisma migrate dev

# 3. (Optional) Seed database
npx prisma db seed

# 4. Start dev server
npm run dev

# App runs at http://localhost:3000
```

### Production Deployment Checklist

- Use managed Postgres (Neon, Supabase, or cloud provider)
- Set strong NEXTAUTH_SECRET
- Configure production domain in NEXTAUTH_URL
- Run `prisma migrate deploy` (not dev)
- Build with `npm run build`
- Deploy to Vercel/Railway/fly.io

---

## B) Sprint Plan

### Sprint 0 — Repo + "Hello, authenticated world"

**Goal:** App runs locally, user can sign in, see an empty dashboard.

**Duration:** 2-3 days

#### Ticket 0.1: Initialize Next.js app + Tailwind + shadcn/ui + lint/format

**Description:**
- Create Next.js 14+ app with App Router, TypeScript, Tailwind
- Configure ESLint + Prettier with Tailwind plugin
- Initialize shadcn/ui with default configuration
- Add basic shadcn components: Button, Card, Input, Label, Badge

**Files Touched:**
- `package.json`, `tsconfig.json`, `next.config.js`
- `tailwind.config.ts`, `components.json`
- `.eslintrc.json`, `prettier.config.js`
- `src/components/ui/*`

**Tests/Validation:**
- `npm run lint` passes
- `npm run build` succeeds
- `npm run dev` starts without errors

**Acceptance Criteria:**
- [ ] App runs on localhost:3000
- [ ] Tailwind classes apply correctly
- [ ] shadcn Button component renders
- [ ] ESLint and Prettier configured

---

#### Ticket 0.2: Docker Compose Postgres + env management

**Description:**
- Create `docker-compose.yml` with Postgres 16
- Create `.env.example` with all required env vars
- Add `.env` to `.gitignore`
- Document connection setup in README

**Files Touched:**
- `docker-compose.yml`
- `.env.example`
- `.gitignore`
- `README.md`

**Tests/Validation:**
- `docker compose up -d` starts Postgres
- `docker compose ps` shows healthy container
- Connection string from .env works

**Acceptance Criteria:**
- [ ] Postgres runs on port 5432
- [ ] Can connect via `psql` or GUI client
- [ ] Environment variables documented
- [ ] Database persists across restarts (volume)

---

#### Ticket 0.3: Prisma setup + initial schema + migrations

**Description:**
- Initialize Prisma with `prisma init`
- Define complete data model (Event, Account, Person, User, ScoringConfig, etc.)
- Create initial migration
- Setup Prisma Client singleton
- Add seed script structure

**Files Touched:**
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/lib/db.ts`
- `package.json` (prisma seed config)

**Tests/Validation:**
- `npx prisma validate` succeeds
- `npx prisma migrate dev` creates migration
- `npx prisma generate` succeeds
- `npx prisma db seed` runs without errors

**Acceptance Criteria:**
- [ ] All models defined with relationships
- [ ] Migration applied successfully
- [ ] Prisma Client accessible via `@/lib/db`
- [ ] Seed script creates test user

---

#### Ticket 0.4: Auth (NextAuth/Auth.js) + protected routes + roles

**Description:**
- Install and configure NextAuth v5 (Auth.js)
- Setup Prisma adapter
- Implement email/password authentication
- Create User, Account, Session tables
- Add role-based authorization (ADMIN, MEMBER)
- Protect dashboard routes with middleware

**Files Touched:**
- `src/lib/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/middleware.ts`
- `src/app/(auth)/login/page.tsx`
- `prisma/schema.prisma` (User model updates)

**Tests/Validation:**
- E2E test: Unauthenticated user redirected to login
- E2E test: Login with valid credentials succeeds
- E2E test: Protected route accessible after login
- Unit test: Password hashing function

**Acceptance Criteria:**
- [ ] `/login` page renders
- [ ] User can register and log in
- [ ] Dashboard routes require authentication
- [ ] Session persists across page refreshes
- [ ] Role stored in session token

---

#### Ticket 0.5: Basic layout + nav shell + "Create Event" placeholder

**Description:**
- Create dashboard layout with sidebar navigation
- Add header with user menu (profile, logout)
- Create navigation links (Events, Accounts, People, Outreach, Execution)
- Create empty placeholder pages for each section
- Add "Create Event" button (non-functional)

**Files Touched:**
- `src/app/(dashboard)/layout.tsx`
- `src/components/layout/nav.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/header.tsx`
- `src/app/(dashboard)/page.tsx`
- `src/app/(dashboard)/events/page.tsx`

**Tests/Validation:**
- Manual smoke test checklist:
  - [ ] Login redirects to dashboard
  - [ ] Sidebar shows all nav items
  - [ ] Clicking nav items changes routes
  - [ ] User menu shows username
  - [ ] Logout returns to login page

**Acceptance Criteria:**
- [ ] Clean, minimal UI with consistent spacing
- [ ] Mobile-responsive layout
- [ ] Active route highlighted in nav
- [ ] All routes render (even if empty)

---

### Sprint 1 — Event + Account + People CRUD (the spine)

**Goal:** Create event, add accounts, add people, view detail pages.

**Duration:** 3-4 days

#### Ticket 1.1: Event CRUD (create/edit/list/activate)

**Description:**
- Create Event model with fields: name, location, startDate, endDate, status
- Build Events list page with table
- Create Event form (create/edit modal or page)
- Add "active event" selector (stored in user session/cookie)
- All subsequent operations scoped to active event

**Files Touched:**
- `src/app/(dashboard)/events/page.tsx`
- `src/app/(dashboard)/events/[id]/page.tsx`
- `src/components/events/event-form.tsx`
- `src/components/events/event-list.tsx`
- `src/app/api/events/route.ts`
- `src/lib/validations/event.ts` (Zod schema)

**Tests/Validation:**
- E2E: Create event → appears in list
- E2E: Edit event → changes persist
- E2E: Set active event → persists across navigation
- Unit: Event validation schema tests

**Acceptance Criteria:**
- [ ] Can create event with all fields
- [ ] Events list shows all events
- [ ] Can edit event details
- [ ] Active event badge visible
- [ ] Delete event (soft delete)

---

#### Ticket 1.2: Account CRUD + company normalization helper

**Description:**
- Build Accounts list page (scoped to active event)
- Create Account form (name, website, industry, facility_est, yards_est, confidence, notes)
- Implement company name normalization (lowercase, remove Inc/LLC, trim)
- Add search/filter UI placeholder

**Files Touched:**
- `src/app/(dashboard)/accounts/page.tsx`
- `src/app/(dashboard)/accounts/[id]/page.tsx`
- `src/components/accounts/account-form.tsx`
- `src/components/accounts/account-list.tsx`
- `src/app/api/accounts/route.ts`
- `src/lib/services/normalization.ts`
- `src/lib/validations/account.ts`

**Tests/Validation:**
- Unit: Normalization tests ("GXO, Inc." → "gxo")
- E2E: Create account → shows in list
- E2E: Edit account → changes saved
- Unit: Account validation edge cases

**Acceptance Criteria:**
- [ ] Accounts list shows company name, industry, tier
- [ ] Can create/edit accounts
- [ ] Normalized name stored for deduplication
- [ ] Click account → detail page

---

#### Ticket 1.3: Person CRUD (linked to account) + persona tags

**Description:**
- Build People management within Account detail page
- Create Person form (name, title, email, linkedin, persona tags)
- Add persona tag selector (exec_ops, ops, procurement, sales, tech, non_ops)
- Allow multiple people per account
- Show people count on account list

**Files Touched:**
- `src/app/(dashboard)/accounts/[id]/page.tsx`
- `src/components/people/person-form.tsx`
- `src/components/people/person-list.tsx`
- `src/app/api/people/route.ts`
- `src/lib/validations/person.ts`
- `src/lib/constants.ts` (persona definitions)

**Tests/Validation:**
- E2E: Add person to account → shows in account detail
- E2E: Edit person → changes persist
- E2E: Delete person → removed from account
- Unit: Persona tag validation

**Acceptance Criteria:**
- [ ] Can add multiple people to account
- [ ] Persona tags stored correctly
- [ ] People list shows name, title, persona badges
- [ ] Account detail shows people count
- [ ] Can edit/delete people

---

#### Ticket 1.4: Global search (accounts/people)

**Description:**
- Implement global search command palette (Cmd+K)
- Search across accounts (company name, website)
- Search across people (name, title)
- Show search results with type badges
- Navigate to detail page on selection

**Files Touched:**
- `src/components/layout/search.tsx` (command palette)
- `src/app/api/search/route.ts`
- `src/lib/services/search.ts`

**Tests/Validation:**
- E2E: Search for account name → results appear
- E2E: Search for person name → results appear
- E2E: Click result → navigates correctly
- Integration: Search API returns correct results

**Acceptance Criteria:**
- [ ] Cmd+K opens search palette
- [ ] Real-time search (debounced)
- [ ] Results show account vs person badge
- [ ] Keyboard navigation works
- [ ] ESC closes palette

---

#### Ticket 1.5: Filter UI (tier/status placeholders) + server query patterns

**Description:**
- Add filter bar to Accounts list
- Implement filters: tier, industry, score range, persona
- URL query params persist filters
- Server-side filtering with Prisma
- Add sort options (score, name, created date)

**Files Touched:**
- `src/components/accounts/account-filters.tsx`
- `src/app/(dashboard)/accounts/page.tsx`
- `src/app/api/accounts/route.ts`
- `src/lib/services/filtering.ts`

**Tests/Validation:**
- E2E: Apply filter → results update
- E2E: Reload page → filters persist
- E2E: Sort by score → order correct
- Integration: Filter query builder tests

**Acceptance Criteria:**
- [ ] Filter bar shows all filter options
- [ ] Filters apply immediately
- [ ] URL reflects active filters
- [ ] Clear all filters button works
- [ ] Sort options work

---

### Sprint 2 — CSV Ingestion + Dedupe/Merge

**Goal:** Upload attendee CSV → system creates/updates accounts+people with dedupe.

**Duration:** 4-5 days

#### Ticket 2.1: CSV upload endpoint + storage + parse pipeline

**Description:**
- Create file upload API route (multipart/form-data)
- Store CSV temporarily (local filesystem or memory)
- Parse CSV with validation (check required columns)
- Return parsed data preview (first 10 rows)
- Use Zod for row validation

**Files Touched:**
- `src/app/api/ingestion/upload/route.ts`
- `src/lib/services/ingestion.ts`
- `src/lib/validations/csv.ts`

**Tests/Validation:**
- Unit: CSV parser with sample CSVs
- Unit: Handle malformed CSV gracefully
- Integration: Upload endpoint returns preview
- E2E: Upload file → preview appears

**Acceptance Criteria:**
- [ ] Accepts CSV files only
- [ ] Validates file size (< 10MB)
- [ ] Detects CSV columns
- [ ] Returns parsed preview
- [ ] Error handling for invalid files

---

#### Ticket 2.2: Mapping UI (column selection)

**Description:**
- Create CSV mapping page
- Show column headers from CSV
- Dropdown selectors to map to: Company, Name, Title, Email, etc.
- Preview mapped data
- Store mapping configuration for future imports
- "Next" button proceeds to dedupe review

**Files Touched:**
- `src/app/(dashboard)/ingestion/map/page.tsx`
- `src/components/ingestion/column-mapper.tsx`
- `src/app/api/ingestion/map/route.ts`

**Tests/Validation:**
- E2E: Upload CSV → mapping screen renders
- E2E: Select columns → preview updates
- Unit: Mapping config validation

**Acceptance Criteria:**
- [ ] All CSV columns visible
- [ ] Can map to Account/Person fields
- [ ] Preview shows first 5 mapped rows
- [ ] Validation: Company and Name required
- [ ] Saves mapping for reuse

---

#### Ticket 2.3: Dedupe pass (exact + fuzzy) with review screen

**Description:**
- Implement exact match on normalized company name
- Implement fuzzy match with Levenshtein distance (threshold 85%)
- Show potential duplicates in review UI
- User can select: "Create new" or "Merge with existing"
- For people: match on name + account

**Files Touched:**
- `src/lib/services/deduplication.ts`
- `src/app/(dashboard)/ingestion/review/page.tsx`
- `src/components/ingestion/duplicate-review.tsx`
- `src/app/api/ingestion/dedupe/route.ts`

**Tests/Validation:**
- Unit: Normalization function ("GXO, Inc." === "GXO")
- Unit: Fuzzy match with test cases
- Unit: Deduplication logic deterministic
- E2E: Upload with duplicates → review screen shows matches

**Acceptance Criteria:**
- [ ] Exact matches auto-flagged
- [ ] Fuzzy matches shown with confidence %
- [ ] User can review each potential duplicate
- [ ] Can override dedupe decision
- [ ] "Skip all duplicates" option

---

#### Ticket 2.4: Merge accounts tool (manual override)

**Description:**
- Build manual merge UI (accessible from account detail)
- Select two accounts to merge
- Choose primary account (keeps ID)
- Migrate all people, assets, drafts to primary
- Soft delete secondary account
- Audit log the merge

**Files Touched:**
- `src/app/(dashboard)/accounts/merge/page.tsx`
- `src/components/accounts/merge-tool.tsx`
- `src/app/api/accounts/merge/route.ts`
- `src/lib/services/merge.ts`

**Tests/Validation:**
- Unit: Merge function tests (people transferred)
- E2E: Merge two accounts → one remains
- E2E: People from both accounts visible
- Integration: Audit log created

**Acceptance Criteria:**
- [ ] Can select two accounts
- [ ] Shows preview of merge result
- [ ] Confirms merge with warning
- [ ] All related records updated
- [ ] Merge logged in audit trail

---

#### Ticket 2.5: Import summary report

**Description:**
- After import completes, show summary:
  - X companies created
  - Y companies updated
  - Z people created
  - Duplicates skipped
- Link to view imported accounts
- Export summary as JSON/CSV

**Files Touched:**
- `src/app/(dashboard)/ingestion/summary/page.tsx`
- `src/components/ingestion/import-summary.tsx`
- `src/app/api/ingestion/execute/route.ts`

**Tests/Validation:**
- E2E: Complete import → summary counts correct
- Integration: Summary API returns accurate counts
- Unit: Summary calculation logic

**Acceptance Criteria:**
- [ ] Summary shows created/updated/skipped counts
- [ ] Links to imported accounts work
- [ ] Can download summary report
- [ ] Errors displayed with details

---

### Sprint 3 — Scoring Engine v1 + Weight Tuning

**Goal:** Compute ranks/tiers per event; tune weights in UI; store score runs.

**Duration:** 4-5 days

#### Ticket 3.1: Scoring function (titles + facility_est + confidence + override)

**Description:**
- Implement scoring algorithm:
  - Base score from persona counts (exec_ops=10, ops=5, etc.)
  - Facility estimate bonus (with confidence weighting)
  - Mega network override (+25 points)
  - Vendor penalty (if sales > ops)
- Write comprehensive tests with fixtures
- Make weights configurable (from ScoringConfig)

**Files Touched:**
- `src/lib/services/scoring.ts`
- `tests/unit/scoring.test.ts`

**Tests/Validation:**
- Unit: Test with known inputs/outputs
- Unit: Edge cases (null estimates, zero confidence)
- Unit: Vendor penalty calculation
- Unit: Mega boost application

**Acceptance Criteria:**
- [ ] Scoring function pure and deterministic
- [ ] Handles missing data gracefully
- [ ] Weights applied correctly
- [ ] 100% test coverage for scoring logic

---

#### Ticket 3.2: ScoreRun table + "Run scoring" button

**Description:**
- Create ScoreRun model (eventId, runAt, scores[])
- Store snapshot of all account scores
- Add "Run Scoring" button on Accounts page
- Show loading state during computation
- Display tier badges after run completes

**Files Touched:**
- `prisma/schema.prisma`
- `src/app/api/scoring/run/route.ts`
- `src/components/accounts/score-runner.tsx`
- `src/lib/services/scoring.ts` (orchestrator)

**Tests/Validation:**
- E2E: Click "Run Scoring" → scores computed
- E2E: Accounts list shows updated tiers
- Integration: ScoreRun record created
- Unit: Score orchestrator logic

**Acceptance Criteria:**
- [ ] Button triggers scoring for active event
- [ ] Progress indicator shown
- [ ] Scores stored in ScoreRun + Account tables
- [ ] Tier assignments visible
- [ ] Timestamp of last run displayed

---

#### Ticket 3.3: ScoringConfig UI (weights, caps, thresholds)

**Description:**
- Create ScoringConfig CRUD interface
- Fields: exec_ops_weight, ops_weight, proc_weight, facility_multiplier, tier1_threshold, tier2_threshold
- Per-event configuration
- Preview score changes without saving
- "Recompute with new weights" action

**Files Touched:**
- `src/app/(dashboard)/events/[id]/scoring-config/page.tsx`
- `src/components/scoring/config-form.tsx`
- `src/app/api/scoring/config/route.ts`

**Tests/Validation:**
- E2E: Update weights → rerun → scores change
- E2E: Reset to default weights
- Unit: Config validation (positive numbers)
- Integration: Config persists across sessions

**Acceptance Criteria:**
- [ ] All weights editable
- [ ] Tier thresholds configurable
- [ ] Preview mode shows potential changes
- [ ] Save triggers automatic rescore
- [ ] Default presets available

---

#### Ticket 3.4: Deltas view between score runs

**Description:**
- Show comparison between last two score runs
- Display accounts that moved tiers
- Highlight top movers (biggest score changes)
- Add "Diff" badge showing +/- points
- Filter by "Moved up" / "Moved down"

**Files Touched:**
- `src/app/(dashboard)/scoring/deltas/page.tsx`
- `src/components/scoring/delta-view.tsx`
- `src/app/api/scoring/deltas/route.ts`
- `src/lib/services/scoring.ts` (delta calculator)

**Tests/Validation:**
- Unit: Delta calculation tests
- E2E: Run scoring twice → deltas appear
- E2E: Filter by "Moved to Tier 1"
- Integration: Delta API returns correct comparisons

**Acceptance Criteria:**
- [ ] Shows before/after scores
- [ ] Tier change highlighted
- [ ] Top 20 movers listed
- [ ] Can view full history of runs
- [ ] Export deltas to CSV

---

#### Ticket 3.5: Account list shows rank/tier badges + sortable columns

**Description:**
- Add Rank and Tier columns to account list
- Sortable by: Score (desc), Rank (asc), Name, Created
- Tier badges color-coded (Tier 1=green, Tier 2=blue, Tier 3=gray)
- Show score on hover
- Paginate results (50 per page)

**Files Touched:**
- `src/components/accounts/account-list.tsx`
- `src/components/ui/tier-badge.tsx`
- `src/app/api/accounts/route.ts` (sorting)

**Tests/Validation:**
- E2E: Sort by score → order correct
- E2E: Tier badge colors correct
- E2E: Pagination works
- Unit: Tier assignment logic

**Acceptance Criteria:**
- [ ] All accounts show tier badge
- [ ] Sort options functional
- [ ] Rank displayed (e.g., #1, #2)
- [ ] Pagination controls visible
- [ ] Loading state during sort

---

### Sprint 4 — Research + Evidence + Facility Estimates

**Goal:** Each account has research panel with evidence links, estimates, confidence.

**Duration:** 3-4 days

#### Ticket 4.1: Evidence link component + add/edit sources

**Description:**
- Add "Research" tab to account detail page
- Create Evidence model (accountId, url, title, notes, addedBy, addedAt)
- UI to add/edit/delete evidence links
- Validate URLs with Zod
- Show clickable links with favicon

**Files Touched:**
- `src/app/(dashboard)/accounts/[id]/research/page.tsx`
- `src/components/research/evidence-list.tsx`
- `src/components/research/evidence-form.tsx`
- `src/app/api/research/evidence/route.ts`
- `prisma/schema.prisma`

**Tests/Validation:**
- E2E: Add evidence → shows in list
- E2E: Edit evidence → changes persist
- E2E: Delete evidence → removed
- Unit: URL validation tests

**Acceptance Criteria:**
- [ ] Can add multiple evidence links
- [ ] URLs validated and displayed
- [ ] Notes field for context
- [ ] Shows who added and when
- [ ] Links open in new tab

---

#### Ticket 4.2: Facility/yards estimate fields + confidence + method

**Description:**
- Add fields to Account: facility_est, yards_est, confidence (0-100), estimation_method, last_verified
- Create estimation form in Research tab
- Dropdown for method (public_data, third_party, internal, assumed)
- Confidence slider with visual indicator
- Auto-update last_verified timestamp

**Files Touched:**
- `prisma/schema.prisma`
- `src/components/research/estimate-form.tsx`
- `src/app/api/accounts/[id]/route.ts`
- `src/lib/validations/account.ts`

**Tests/Validation:**
- E2E: Set estimate → saves to account
- E2E: Confidence slider updates value
- Unit: Confidence normalization (0-100)
- Unit: Method enum validation

**Acceptance Criteria:**
- [ ] Facility/yards estimates editable
- [ ] Confidence required with estimate
- [ ] Method dropdown required
- [ ] Last verified date auto-set
- [ ] Estimates visible on account detail

---

#### Ticket 4.3: Account "Research" page tab with structured notes

**Description:**
- Create tabbed interface: Overview / People / Research / Outreach / Assets
- Research tab shows:
  - Estimates form
  - Evidence links
  - Structured notes (markdown editor)
  - Research status (not_started, in_progress, complete)
- Auto-save notes with debounce

**Files Touched:**
- `src/app/(dashboard)/accounts/[id]/layout.tsx` (tabs)
- `src/app/(dashboard)/accounts/[id]/research/page.tsx`
- `src/components/research/notes-editor.tsx`
- `src/app/api/accounts/[id]/notes/route.ts`

**Tests/Validation:**
- E2E: Switch tabs → content renders
- E2E: Edit notes → auto-saves
- E2E: Markdown preview works
- Integration: Notes API saves correctly

**Acceptance Criteria:**
- [ ] Tab navigation works
- [ ] All research components visible
- [ ] Notes support markdown
- [ ] Auto-save feedback shown
- [ ] Research status indicator

---

#### Ticket 4.4: Bulk edit (select accounts → set confidence/status)

**Description:**
- Add checkboxes to account list
- "Bulk Actions" button when accounts selected
- Actions: Set confidence, Set method, Set research status
- Apply to all selected accounts
- Confirmation dialog with preview

**Files Touched:**
- `src/components/accounts/account-list.tsx`
- `src/components/accounts/bulk-actions.tsx`
- `src/app/api/accounts/bulk-update/route.ts`

**Tests/Validation:**
- E2E: Select 5 accounts → bulk set confidence
- E2E: All 5 accounts updated
- E2E: Cancel bulk action → no changes
- Integration: Bulk update transaction atomic

**Acceptance Criteria:**
- [ ] Can select multiple accounts
- [ ] Select all checkbox works
- [ ] Bulk actions menu appears
- [ ] Preview shows affected accounts
- [ ] Update confirmation required

---

### Sprint 5 — Outreach Templates + Draft Generation + Export

**Goal:** Generate drafts for filtered cohorts; edit and export to CSV.

**Duration:** 4-5 days

#### Ticket 5.1: OutreachTemplate CRUD with variable preview

**Description:**
- Create OutreachTemplate model (name, subject, body, persona, eventId)
- Template variables: {{first_name}}, {{company}}, {{title}}, {{event}}, etc.
- Template builder UI with variable insertion buttons
- Live preview with sample data
- Template library (global + event-specific)

**Files Touched:**
- `prisma/schema.prisma`
- `src/app/(dashboard)/outreach/templates/page.tsx`
- `src/components/outreach/template-form.tsx`
- `src/components/outreach/template-preview.tsx`
- `src/app/api/outreach/templates/route.ts`
- `src/lib/services/templating.ts`

**Tests/Validation:**
- Unit: Template rendering with test data
- Unit: Variable substitution edge cases
- E2E: Create template → preview renders
- E2E: Edit template → changes reflected

**Acceptance Criteria:**
- [ ] Can create/edit/delete templates
- [ ] Variable buttons insert {{var}} syntax
- [ ] Preview shows rendered output
- [ ] Templates filterable by persona
- [ ] Duplicate template feature

---

#### Ticket 5.2: Draft generation (bulk) with filters

**Description:**
- Add "Generate Drafts" button on Accounts page
- Filter selection: Tier, Persona, Score range
- Template selection per persona
- Generate drafts for all people matching filters
- Show progress bar during generation
- Store drafts in OutreachDraft table

**Files Touched:**
- `src/app/(dashboard)/outreach/generate/page.tsx`
- `src/components/outreach/draft-generator.tsx`
- `src/app/api/outreach/generate/route.ts`
- `src/lib/services/outreach.ts`
- `prisma/schema.prisma`

**Tests/Validation:**
- E2E: Generate for Tier 1 Ops → 10 drafts created
- E2E: Progress indicator shows completion
- Integration: Drafts stored correctly
- Unit: Draft generation logic tests

**Acceptance Criteria:**
- [ ] Filters applied correctly
- [ ] One draft per person (or per persona)
- [ ] Template variables substituted
- [ ] Generation completes without errors
- [ ] Summary shows count generated

---

#### Ticket 5.3: Draft editor with status workflow + audit trail

**Description:**
- Create drafts list page (filterable by status)
- Draft editor: subject + body (editable)
- Status workflow: draft → approved → sent → replied → meeting_set
- Track status changes with timestamps
- Show edit history in sidebar
- Assign owner to draft

**Files Touched:**
- `src/app/(dashboard)/outreach/drafts/page.tsx`
- `src/app/(dashboard)/outreach/drafts/[id]/page.tsx`
- `src/components/outreach/draft-editor.tsx`
- `src/components/outreach/status-workflow.tsx`
- `src/app/api/outreach/drafts/route.ts`

**Tests/Validation:**
- E2E: Edit draft → changes save
- E2E: Change status → timestamp recorded
- E2E: Audit trail shows history
- Integration: Status transitions valid

**Acceptance Criteria:**
- [ ] All drafts visible in list
- [ ] Can edit subject and body
- [ ] Status dropdown functional
- [ ] Audit trail shows who/when
- [ ] Owner assignable

---

#### Ticket 5.4: CSV export (HubSpot/Apollo-friendly)

**Description:**
- Add "Export to CSV" button on drafts list
- Export format: FirstName, LastName, Email, Company, Subject, Body, Status
- Include filtering before export
- Download CSV file to browser
- Option to export selected drafts only

**Files Touched:**
- `src/app/api/outreach/export/route.ts`
- `src/components/outreach/export-button.tsx`
- `src/lib/services/csv-export.ts`

**Tests/Validation:**
- Unit: CSV generation tests with fixtures
- E2E: Export 50 drafts → CSV downloads
- E2E: Open CSV → columns correct
- Integration: Export API returns valid CSV

**Acceptance Criteria:**
- [ ] Export all or selected drafts
- [ ] CSV format correct for import tools
- [ ] Special characters escaped
- [ ] Filename includes timestamp
- [ ] Export respects filters

---

#### Ticket 5.5: "Copy" helpers for one-liners (clipboard)

**Description:**
- Add copy-to-clipboard buttons throughout UI:
  - Copy subject line
  - Copy body
  - Copy opener (first 2 sentences)
  - Copy account one-liner (from connect report)
- Toast notification on copy
- Keyboard shortcuts (Cmd+Shift+C)

**Files Touched:**
- `src/components/ui/copy-button.tsx`
- `src/components/outreach/draft-editor.tsx`
- `src/components/accounts/account-detail.tsx`
- `src/lib/hooks/use-clipboard.ts`

**Tests/Validation:**
- Manual checklist:
  - [ ] Click copy → text in clipboard
  - [ ] Toast appears
  - [ ] Keyboard shortcut works
- E2E: Copy button click → clipboard updated

**Acceptance Criteria:**
- [ ] Copy buttons visible on hover
- [ ] Clipboard API works across browsers
- [ ] Fallback for unsupported browsers
- [ ] Visual feedback on copy
- [ ] Copied text formatted correctly

---

### Sprint 6 — Connect Reports / One-Pagers (Assets)

**Goal:** Upload PDFs per account + generate HTML "connect report" from fields.

**Duration:** 3-4 days

#### Ticket 6.1: Asset upload (PDF) + storage strategy

**Description:**
- Create Asset model (accountId, type, filename, filepath, uploadedBy, uploadedAt)
- File upload API (multipart/form-data)
- Store files in `/public/uploads/` for local dev
- Abstract storage layer for S3/Cloudflare R2 in prod
- Validate file type and size

**Files Touched:**
- `prisma/schema.prisma`
- `src/app/api/assets/upload/route.ts`
- `src/lib/services/storage.ts`
- `src/components/assets/upload-form.tsx`

**Tests/Validation:**
- E2E: Upload PDF → appears in asset list
- E2E: Download PDF → file correct
- Unit: File validation (PDF only, < 5MB)
- Integration: Storage abstraction tests

**Acceptance Criteria:**
- [ ] PDF upload works
- [ ] Files stored securely
- [ ] Download link functional
- [ ] File size limit enforced
- [ ] Storage layer swappable

---

#### Ticket 6.2: Connect report schema + renderer (HTML)

**Description:**
- Define connect report structure:
  - Account overview (name, industry, facility count, score, tier)
  - Key people (top 3-5 with titles)
  - Evidence summary (facility estimates, sources)
  - Outreach hooks (why relevant to event)
  - Next steps / call to action
- Create HTML template with Tailwind styling
- Server-side rendering (React Server Component)

**Files Touched:**
- `src/app/(dashboard)/accounts/[id]/connect-report/page.tsx`
- `src/components/reports/connect-report.tsx`
- `src/lib/services/report-builder.ts`

**Tests/Validation:**
- Unit: Report builder with fixtures
- Snapshot test: HTML output consistent
- E2E: Generate report → HTML renders
- Manual: Print preview looks good

**Acceptance Criteria:**
- [ ] Report includes all sections
- [ ] Clean, professional design
- [ ] Data from account/people/research
- [ ] Print-friendly layout
- [ ] No missing data errors

---

#### Ticket 6.3: "Generate connect report" from account data

**Description:**
- Add "Generate Connect Report" button on account detail
- Auto-populate report with:
  - Account fields
  - Top people by score/role
  - Research evidence and estimates
  - Outreach drafts (approved only)
- Save generated report as HTML in Asset table
- Link to view/download

**Files Touched:**
- `src/app/api/reports/generate/route.ts`
- `src/components/accounts/generate-report-button.tsx`
- `src/lib/services/report-builder.ts`

**Tests/Validation:**
- E2E: Click generate → report created
- E2E: View report → data correct
- Integration: Report generation deterministic
- Unit: Data aggregation logic

**Acceptance Criteria:**
- [ ] One-click generation
- [ ] Report stored as asset
- [ ] Regenerate updates existing report
- [ ] Generation completes in < 2s
- [ ] Error handling for incomplete data

---

#### Ticket 6.4: Print-friendly styling + shareable link

**Description:**
- Add print CSS media queries
- Remove nav/sidebar for print
- Page breaks after sections
- Create shareable link (auth-protected)
- "Print" and "Share" buttons on report page
- Optional: PDF export via headless browser

**Files Touched:**
- `src/app/(dashboard)/accounts/[id]/connect-report/page.tsx`
- `src/app/globals.css` (print styles)
- `src/app/api/reports/share/route.ts`

**Tests/Validation:**
- Manual: Print preview → layout correct
- E2E: Share link → accessible with auth
- E2E: Print → no nav elements
- Manual: Print to PDF test

**Acceptance Criteria:**
- [ ] Print layout clean
- [ ] No broken page breaks
- [ ] Share link works
- [ ] Link expires after 7 days (optional)
- [ ] Print button triggers browser print

---

### Sprint 7 — Execution Mode (Day-of Ops)

**Goal:** Meeting targets, tasks, notes, owner assignment, quick filters.

**Duration:** 3-4 days

#### Ticket 7.1: Task/Activity model + CRUD + next actions list

**Description:**
- Create Task model (accountId, personId, type, status, owner, dueDate, notes)
- Task types: outreach, meeting, follow_up, research
- Task status: todo, in_progress, done
- Next actions dashboard (sorted by due date)
- Create/edit tasks from account detail

**Files Touched:**
- `prisma/schema.prisma`
- `src/app/(dashboard)/execution/page.tsx`
- `src/components/execution/task-list.tsx`
- `src/components/execution/task-form.tsx`
- `src/app/api/tasks/route.ts`

**Tests/Validation:**
- E2E: Create task → appears in list
- E2E: Mark task done → status updates
- E2E: Filter by owner → shows only theirs
- Integration: Task queries optimized

**Acceptance Criteria:**
- [ ] Can create tasks for accounts/people
- [ ] Due dates with calendar picker
- [ ] Owner assignment dropdown
- [ ] Next actions sorted by date
- [ ] Overdue tasks highlighted

---

#### Ticket 7.2: Execution board view (kanban-lite)

**Description:**
- Create execution board with columns:
  - Not Started
  - In Progress
  - Meeting Set
  - Completed
- Drag-and-drop optional (use buttons for MVP)
- Show account cards with: name, tier, owner, next task
- Filter by event, owner, tier
- Quick actions: add note, create task, view detail

**Files Touched:**
- `src/app/(dashboard)/execution/board/page.tsx`
- `src/components/execution/board-column.tsx`
- `src/components/execution/account-card.tsx`

**Tests/Validation:**
- E2E: Move account to "In Progress" → status updates
- E2E: Filter by owner → shows correct accounts
- Manual: Board renders all accounts
- Manual: Quick actions work

**Acceptance Criteria:**
- [ ] Board shows all active accounts
- [ ] Status transitions work
- [ ] Filters apply correctly
- [ ] Cards show key info
- [ ] Mobile-responsive (stack columns)

---

#### Ticket 7.3: Owner assignment + "My Queue" dashboard

**Description:**
- Add owner field to Account and Task
- Create "My Queue" dashboard for logged-in user
- Show:
  - My accounts (assigned to me)
  - My tasks (assigned to me)
  - My meetings (upcoming)
- Quick stats: total assigned, completed this week
- Personalized filters

**Files Touched:**
- `src/app/(dashboard)/page.tsx` (dashboard)
- `src/components/dashboard/my-queue.tsx`
- `src/components/dashboard/stats.tsx`
- `src/app/api/dashboard/route.ts`

**Tests/Validation:**
- E2E: Login as Jake → see only Jake's accounts
- E2E: Complete task → stats update
- Integration: Dashboard API filters by user
- Unit: Stats calculation tests

**Acceptance Criteria:**
- [ ] Dashboard shows user-specific data
- [ ] Stats accurate and real-time
- [ ] Links to full lists work
- [ ] Empty state handled gracefully
- [ ] Fast load time (< 1s)

---

#### Ticket 7.4: Fast keyboard search + command palette (optional)

**Description:**
- Enhance Cmd+K search with quick actions:
  - Search accounts/people
  - Create new account/task
  - Navigate to pages
- Recent items shown by default
- Keyboard shortcuts listed in menu
- Search history (per user)

**Files Touched:**
- `src/components/layout/command-palette.tsx`
- `src/lib/hooks/use-command-palette.ts`
- `src/app/api/search/route.ts`

**Tests/Validation:**
- Manual demo script:
  - [ ] Cmd+K opens palette
  - [ ] Type "GXO" → account appears
  - [ ] Select → navigates
  - [ ] Type ">" → shows actions
  - [ ] Create task action works
- E2E: Command palette navigation

**Acceptance Criteria:**
- [ ] Instant search (< 100ms)
- [ ] Keyboard-only navigation
- [ ] Recent items cache
- [ ] Actions context-aware
- [ ] Help menu with shortcuts

---

### Sprint 8 — Optional Automation: "Enrich via Search" (Feature-Flagged)

**Goal:** One-click enrichment suggestions with citations (off by default).

**Duration:** 3-4 days (optional)

#### Ticket 8.1: Feature flag system + admin toggle

**Description:**
- Create FeatureFlag model (name, enabled, description)
- Admin page to toggle features
- Middleware to check flags
- Environment variable fallback
- Flags: auto_enrichment, ai_suggestions, bulk_actions

**Files Touched:**
- `prisma/schema.prisma`
- `src/app/(dashboard)/admin/features/page.tsx`
- `src/lib/services/feature-flags.ts`
- `src/middleware.ts`

**Tests/Validation:**
- Unit: Flag evaluation logic
- E2E: Toggle flag → feature appears/disappears
- Integration: Flag state persists
- Unit: Environment override tests

**Acceptance Criteria:**
- [ ] Admin can toggle flags
- [ ] Flags persist in database
- [ ] Client-side flag checks work
- [ ] Server-side flag checks work
- [ ] Env var override works

---

#### Ticket 8.2: Server route to fetch search results (SerpAPI/CSE)

**Description:**
- Create API route to fetch search results
- Integrate SerpAPI or Google Custom Search
- Query: "{company_name} facilities yards locations"
- Return top 5 results with: title, url, snippet
- Cache results (1 week)
- Rate limiting to avoid API quota issues

**Files Touched:**
- `src/app/api/enrichment/search/route.ts`
- `src/lib/services/search-api.ts`
- `src/lib/cache.ts`

**Tests/Validation:**
- Integration: Mock external API response
- Unit: Query builder tests
- E2E: API returns results for known company
- Manual: Check real API integration

**Acceptance Criteria:**
- [ ] API key secured in env var
- [ ] Returns top 5 results
- [ ] Caching works
- [ ] Rate limiting applied
- [ ] Error handling for API failures

---

#### Ticket 8.3: Extractor (LLM) returns estimate + confidence + sources

**Description:**
- Create extractor service using OpenAI/Anthropic
- Prompt: "Given these search results, estimate facility count and yard count for {company}. Provide confidence level and cite sources."
- Parse structured response (JSON)
- Return: facility_est, yards_est, confidence, method, sources[]
- Validate output with Zod schema

**Files Touched:**
- `src/lib/services/extractor.ts`
- `src/lib/prompts/enrichment.ts`
- `src/app/api/enrichment/extract/route.ts`

**Tests/Validation:**
- Integration: Mock LLM API response
- Unit: Response parser tests
- Unit: Confidence normalization
- E2E: Extractor returns valid schema

**Acceptance Criteria:**
- [ ] LLM API integrated
- [ ] Prompt engineering optimized
- [ ] Structured output enforced
- [ ] Sources cited correctly
- [ ] Handles "no info found" gracefully

---

#### Ticket 8.4: UI "Suggest estimates" + human approval

**Description:**
- Add "Enrich" button on account research page (if feature enabled)
- Show loading state during enrichment
- Display suggestions in modal:
  - Estimated facilities
  - Estimated yards
  - Confidence level
  - Source links
- "Approve" → writes to account fields + adds evidence links
- "Reject" → dismisses suggestion
- "Edit" → modify before approving

**Files Touched:**
- `src/components/research/enrichment-button.tsx`
- `src/components/research/enrichment-modal.tsx`
- `src/app/api/enrichment/suggest/route.ts`

**Tests/Validation:**
- E2E: Click enrich → suggestions appear
- E2E: Approve → account updated
- E2E: Reject → no changes
- Integration: End-to-end enrichment flow
- Manual: Check LLM suggestions quality

**Acceptance Criteria:**
- [ ] Button only visible if flag enabled
- [ ] Suggestions display clearly
- [ ] Approve updates account + adds sources
- [ ] Edit mode allows changes
- [ ] Errors handled gracefully
- [ ] Loading spinner shown

---

## C) Data Model (Prisma Schema - Initial Draft)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== AUTH & USERS ====================

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  password      String?   // hashed
  image         String?
  role          Role      @default(MEMBER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  tasks         Task[]
  assets        Asset[]
  evidences     Evidence[]
  drafts        OutreachDraft[]
  scoreRuns     ScoreRun[]

  @@map("users")
}

enum Role {
  ADMIN
  MEMBER
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// ==================== CORE DOMAIN ====================

model Event {
  id          String   @id @default(cuid())
  name        String
  location    String?
  startDate   DateTime
  endDate     DateTime
  status      EventStatus @default(PLANNING)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  companies       Company[]
  scoringConfigs  ScoringConfig[]
  scoreRuns       ScoreRun[]
  templates       OutreachTemplate[]

  @@map("events")
}

enum EventStatus {
  PLANNING
  ACTIVE
  COMPLETED
  CANCELLED
}

model Company {
  id                String   @id @default(cuid())
  eventId           String
  companyName       String
  normalizedName    String   // for deduplication
  website           String?
  industry          String?
  facilityEst       Int?
  yardsEst          Int?
  confidence        Int?     // 0-100
  estimationMethod  EstimationMethod?
  lastVerified      DateTime?
  megaNetworkBoost  Boolean  @default(false)
  vendorPenalty     Boolean  @default(false)
  notes             String?
  researchStatus    ResearchStatus @default(NOT_STARTED)
  executionStatus   ExecutionStatus @default(NOT_STARTED)
  owner             String?
  
  // Computed fields (from scoring)
  score             Float?
  rank              Int?
  tier              Tier?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  event             Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  people            Person[]
  evidences         Evidence[]
  assets            Asset[]
  tasks             Task[]
  scores            CompanyScore[]

  @@unique([eventId, normalizedName])
  @@index([eventId, tier])
  @@index([eventId, score])
  @@map("companies")
}

enum EstimationMethod {
  PUBLIC_DATA
  THIRD_PARTY
  INTERNAL
  ASSUMED
}

enum ResearchStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETE
}

enum ExecutionStatus {
  NOT_STARTED
  IN_PROGRESS
  MEETING_SET
  COMPLETED
}

enum Tier {
  TIER_1
  TIER_2
  TIER_3
}

model Person {
  id          String   @id @default(cuid())
  companyId   String
  name        String
  title       String?
  email       String?
  linkedinUrl String?
  personaScore Int?
  
  // Persona flags (from CSV mapping)
  isExecOps   Boolean  @default(false)
  isOps       Boolean  @default(false)
  isProc      Boolean  @default(false)
  isSales     Boolean  @default(false)
  isTech      Boolean  @default(false)
  isNonOps    Boolean  @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  drafts      OutreachDraft[]
  tasks       Task[]

  @@index([companyId])
  @@map("people")
}

// ==================== SCORING ====================

model ScoringConfig {
  id              String   @id @default(cuid())
  eventId         String
  
  // Weights
  execOpsWeight   Float    @default(10)
  opsWeight       Float    @default(5)
  procWeight      Float    @default(3)
  salesWeight     Float    @default(1)
  techWeight      Float    @default(1)
  
  // Modifiers
  facilityMultiplier Float @default(0.5)
  megaBoost       Float    @default(25)
  vendorPenaltyAmount Float @default(12)
  
  // Tier thresholds
  tier1Threshold  Float    @default(75)
  tier2Threshold  Float    @default(50)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  event           Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([eventId])
  @@map("scoring_configs")
}

model ScoreRun {
  id          String   @id @default(cuid())
  eventId     String
  runBy       String
  runAt       DateTime @default(now())
  
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [runBy], references: [id])
  scores      CompanyScore[]

  @@index([eventId, runAt])
  @@map("score_runs")
}

model CompanyScore {
  id          String   @id @default(cuid())
  scoreRunId  String
  companyId   String
  score       Float
  rank        Int
  tier        Tier
  
  scoreRun    ScoreRun @relation(fields: [scoreRunId], references: [id], onDelete: Cascade)
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([scoreRunId, companyId])
  @@map("company_scores")
}

// ==================== RESEARCH ====================

model Evidence {
  id          String   @id @default(cuid())
  companyId   String
  url         String
  title       String?
  notes       String?
  addedBy     String
  addedAt     DateTime @default(now())

  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [addedBy], references: [id])

  @@index([companyId])
  @@map("evidence")
}

// ==================== OUTREACH ====================

model OutreachTemplate {
  id          String   @id @default(cuid())
  eventId     String?  // null = global template
  name        String
  subject     String
  body        String
  personaFilter String? // JSON array of persona types
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  event       Event?   @relation(fields: [eventId], references: [id], onDelete: SetNull)
  drafts      OutreachDraft[]

  @@map("outreach_templates")
}

model OutreachDraft {
  id          String   @id @default(cuid())
  personId    String
  templateId  String?
  subject     String
  body        String
  status      DraftStatus @default(DRAFT)
  owner       String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  approvedAt  DateTime?
  sentAt      DateTime?

  person      Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  template    OutreachTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  user        User?    @relation(fields: [owner], references: [id])

  @@index([personId])
  @@index([status])
  @@map("outreach_drafts")
}

enum DraftStatus {
  DRAFT
  APPROVED
  SENT
  REPLIED
  MEETING_SET
}

// ==================== ASSETS ====================

model Asset {
  id          String   @id @default(cuid())
  companyId   String
  type        AssetType
  filename    String
  filepath    String
  mimeType    String?
  uploadedBy  String
  uploadedAt  DateTime @default(now())

  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [uploadedBy], references: [id])

  @@index([companyId])
  @@map("assets")
}

enum AssetType {
  PDF
  CONNECT_REPORT
  OTHER
}

// ==================== EXECUTION ====================

model Task {
  id          String   @id @default(cuid())
  companyId   String?
  personId    String?
  type        TaskType
  status      TaskStatus @default(TODO)
  title       String
  notes       String?
  owner       String?
  dueDate     DateTime?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?

  company     Company? @relation(fields: [companyId], references: [id], onDelete: Cascade)
  person      Person?  @relation(fields: [personId], references: [id], onDelete: Cascade)
  user        User?    @relation(fields: [owner], references: [id])

  @@index([owner, status])
  @@index([dueDate])
  @@map("tasks")
}

enum TaskType {
  OUTREACH
  MEETING
  FOLLOW_UP
  RESEARCH
  OTHER
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

// ==================== FEATURE FLAGS ====================

model FeatureFlag {
  id          String   @id @default(cuid())
  name        String   @unique
  enabled     Boolean  @default(false)
  description String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("feature_flags")
}
```

---

## D) Key Screens + Routes

### Authentication
- `GET /login` - Login page
- `GET /register` - Register page (admin-only in prod)
- `POST /api/auth/[...nextauth]` - NextAuth routes

### Dashboard
- `GET /` - My Queue dashboard (personalized)
- `GET /dashboard/stats` - Overview stats

### Events
- `GET /events` - Events list
- `GET /events/new` - Create event
- `GET /events/[id]` - Event detail
- `GET /events/[id]/edit` - Edit event
- `GET /events/[id]/scoring-config` - Scoring configuration

### Companies/Accounts
- `GET /accounts` - Accounts list (filterable, sortable)
- `GET /accounts/new` - Create account
- `GET /accounts/[id]` - Account detail (tabs: Overview, People, Research, Outreach, Assets)
- `GET /accounts/[id]/research` - Research tab
- `GET /accounts/[id]/connect-report` - Connect report view
- `GET /accounts/merge` - Merge tool

### People
- `GET /people` - People list
- `GET /people/[id]` - Person detail

### Ingestion
- `GET /ingestion` - CSV upload start
- `GET /ingestion/map` - Column mapping
- `GET /ingestion/review` - Dedupe review
- `GET /ingestion/summary` - Import summary

### Scoring
- `GET /scoring/config` - Scoring configuration (per event)
- `POST /api/scoring/run` - Run scoring
- `GET /scoring/deltas` - Score deltas between runs

### Outreach
- `GET /outreach/templates` - Template library
- `GET /outreach/templates/new` - Create template
- `GET /outreach/generate` - Draft generator
- `GET /outreach/drafts` - Drafts list
- `GET /outreach/drafts/[id]` - Draft editor
- `POST /api/outreach/export` - Export to CSV

### Execution
- `GET /execution` - Next actions list
- `GET /execution/board` - Kanban board
- `GET /execution/tasks` - Tasks list

### Research/Enrichment (Feature-Flagged)
- `POST /api/enrichment/search` - Fetch search results
- `POST /api/enrichment/extract` - LLM extraction
- `POST /api/enrichment/suggest` - Full enrichment flow

### Admin
- `GET /admin/users` - User management
- `GET /admin/features` - Feature flags

---

## E) Testing Strategy

### Unit Tests (Vitest)
- **Business Logic:**
  - Scoring function with fixtures
  - Company name normalization
  - Fuzzy matching algorithm
  - Template rendering and variable substitution
  - CSV parsing and validation
  - Delta calculation between score runs
  - Confidence normalization
  - Persona tag extraction

- **Utilities:**
  - Date formatting
  - String manipulation (cn, slugify)
  - Validation schemas (Zod)
  - Feature flag evaluation

- **Coverage Target:** 80%+ for services and lib functions

### Integration Tests (Vitest + Prisma)
- **API Routes:**
  - Event CRUD operations
  - Account CRUD with relationships
  - Scoring run creation
  - CSV upload and parsing
  - Bulk operations (bulk update, bulk generate)
  - Search API with filters
  - Draft generation pipeline

- **Database:**
  - Migrations run successfully
  - Seed script populates data
  - Relationships and cascades work
  - Indexes improve query performance

### E2E Tests (Playwright)
- **Critical User Flows:**
  - Login → dashboard → create event → add account → add person
  - Upload CSV → map columns → review duplicates → import
  - Run scoring → view tiers → adjust weights → rerun → view deltas
  - Generate drafts → edit draft → change status → export CSV
  - Create task → assign owner → mark complete
  - Upload asset → generate connect report → print

- **Smoke Tests:**
  - All pages load without errors
  - Navigation works
  - Forms submit successfully
  - Protected routes redirect unauthenticated users

- **Coverage Target:** All major user journeys end-to-end

### Manual Testing
- **Validation Checklists:**
  - Print preview for connect reports
  - Copy-to-clipboard functionality
  - Keyboard shortcuts
  - Mobile responsiveness
  - Error states and edge cases
  - Loading states during async operations

### Performance Testing
- **Benchmarks:**
  - Page load time < 1s
  - Scoring run for 500 accounts < 5s
  - Search results < 100ms
  - CSV import for 1000 rows < 10s

### Test Data
- **Seed Script Includes:**
  - 2 events (Manifest 2026, Future Event 2027)
  - 2 users (Casey admin, Jake member)
  - 50 companies with varied scores/tiers
  - 150 people with different personas
  - 10 outreach templates
  - Sample scoring config
  - Sample tasks and drafts

---

## Delivery Plan Summary

### Phase 1: Foundation (Sprint 0-1) — Week 1-2
- Deliverable: Working app with auth, events, accounts, people
- Demo: Login, create event, add companies, search

### Phase 2: Data Pipeline (Sprint 2-3) — Week 3-4
- Deliverable: CSV ingestion + scoring engine
- Demo: Upload CSV, dedupe, run scoring, view tiers

### Phase 3: Outreach (Sprint 4-5) — Week 5-6
- Deliverable: Research tools + outreach generation
- Demo: Add evidence, generate drafts, export CSV

### Phase 4: Assets & Execution (Sprint 6-7) — Week 7-8
- Deliverable: Connect reports + execution board
- Demo: Generate report, assign tasks, execution board

### Phase 5: Polish & Automation (Sprint 8) — Week 9 (optional)
- Deliverable: Auto-enrichment (feature-flagged)
- Demo: One-click enrichment with LLM

---

## Next Steps

1. ✅ Review this plan with stakeholders
2. ⏭️ Run bootstrapping commands (Ticket 0.1-0.2)
3. ⏭️ Setup Prisma and seed data (Ticket 0.3)
4. ⏭️ Implement authentication (Ticket 0.4)
5. ⏭️ Build layout shell (Ticket 0.5)
6. ⏭️ Sprint 0 demo checkpoint
7. ⏭️ Continue with Sprint 1...

**Estimated Timeline:** 8-9 weeks for full MVP (all sprints)
**Minimum Viable:** Sprint 0-3 (4 weeks) for core hitlist + outreach functionality
