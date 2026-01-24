# YardFlow Hitlist - AI Coding Agent Instructions

## Project Overview
Event-driven Account-Based Marketing (ABM) platform built for targeting high-value accounts at industry events (Manifest 2026). Core focus: **ship fast, ship often** with production deploys after every 60-120 min task.

**Tech Stack**: Next.js 14.2 (App Router), PostgreSQL, Prisma, Redis/BullMQ, NextAuth v5, Railway deployment  
**Philosophy**: Free services over paid ($0/month AI via Gemini Pro, pattern detection over Hunter.io API)

## Architecture Patterns

### Monorepo Structure
- Root `/` contains Railway deployment configs (`railway.json`, `Dockerfile.worker`)
- Application lives in `/eventops` subdirectory (Next.js app)
- **Critical**: All `npm` commands run from `/eventops`, Railway build commands use `cd eventops && ...`

### Database Access Pattern
```typescript
// Always import from centralized db module
import { prisma } from '@/lib/db';

// NEVER create new PrismaClient instances
// db.ts handles singleton pattern with globalThis caching
```

**Import inconsistency exists**: Some files use `import { db as prisma }` - both work but prefer `{ prisma }` for new code.

### Lazy Initialization for External Services
**CRITICAL**: Never initialize Redis, database connections, or external API clients at module load time:

```typescript
// ✅ CORRECT - Lazy initialization
let redisConnection: Redis | null = null;
export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(config);
  }
  return redisConnection;
}

// ❌ WRONG - Blocks builds on Railway
export const redis = new Redis(config); // Runs at import time!
```

**Why**: Railway Nixpacks analyzes imports during build, causing hangs if connections attempt during static analysis.

### API Routes & Data Flow
- **API Routes**: `/eventops/src/app/api/*/route.ts` - REST endpoints
- **No Server Actions**: This codebase uses API routes exclusively, not Next.js Server Actions
- **Auth**: NextAuth v5 via `import { auth } from '@/auth'` - returns session or null
- **Pagination**: Use `@/lib/pagination` helpers (`parsePaginationParams`, `buildPaginatedResponse`)
- **Logging**: Structured JSON logging via `@/lib/logger` - use `logger.info()`, `logger.error()`, `logger.warn()`

### Authentication Pattern (NextAuth v5)
```typescript
// src/lib/auth.ts - Credentials provider with JWT strategy
import { auth } from '@/auth';

// In API routes - protect with session check
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Auth config: trustHost: true (required for Railway)
// Password verification: bcryptjs via @/lib/password
```

### Queue Architecture (BullMQ)
```typescript
// Job queues defined in src/lib/queue/queues.ts
import { addEnrichmentJob, addSequenceJob } from '@/lib/queue/queues';

// Workers run in separate process: npm run worker
// Deployed as standalone Railway service (railway-worker.json)
```

**Separation**: Web process (Next.js) adds jobs, worker process consumes them. Both need database + Redis access.

### Cron Jobs & Scheduled Tasks
```typescript
// API routes in src/app/api/cron/{job-name}/route.ts
// Protected with CRON_SECRET via Authorization: Bearer header
// Examples: /api/cron/google-sync, /api/cron/sequences

// Cron authentication pattern:
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Active Cron Jobs**:
- `/api/cron/google-sync` - Syncs Google Calendar events (every 6 hours: `0 */6 * * *`)
- `/api/cron/sequences` - Processes automated outreach sequences (planned)

**Railway Cron Setup**: Configure via Railway dashboard → Settings → Cron Jobs → Add schedule  
**Testing Cron Locally**: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/google-sync`

## Critical Workflows

### Development Cycle (60-120 min tasks)
```bash
cd eventops
npm install          # Install dependencies
npx prisma migrate dev  # Run migrations
npx prisma db seed   # Seed data (uses prisma/seed.ts)
npm run dev          # Start at localhost:3000
```

### Deployment (Railway Auto-Deploy)
```bash
git commit -m "Task X.Y: Description"
git push origin main
# Railway auto-deploys on push
# Verify: https://yardflow-hitlist-production.up.railway.app/api/health
```

**Health Check**: `/api/health` validates database, Redis, auth, env vars  
**Migrations**: Auto-run via `railway.json` startCommand: `npx prisma migrate deploy && npm start`

### Testing
```bash
npm run test         # Vitest unit tests (watch mode)
npm run test:unit    # Run once
npm run test:e2e     # Playwright E2E tests
```

**Test location**: `src/lib/enrichment/__tests__/*.test.ts` - uses Vitest + Prisma mocks

### Testing Patterns
```typescript
// Mock Prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    people: { findMany: jest.fn(), create: jest.fn() },
    target_accounts: { update: jest.fn() },
  },
}));

// Test with mocked data
it('should detect email pattern', async () => {
  (prisma.people.findMany as jest.Mock).mockResolvedValue([
    { name: 'John Doe', email: 'john.doe@acme.com' },
  ]);
  
  const result = await detector.detectPatternsForCompany('account-1');
  expect(result.primaryPattern?.patternType).toBe('first.last');
});
```

**Run specific test**: `npm test -- email-pattern-detector.test.ts`  
**Coverage**: `npm test -- --coverage`

## Domain-Specific Patterns

### Manifest 2026 Event Focus
**Context**: This platform targets the [Manifest Vegas 2026](https://matchmaking.grip.events/manifestvegas2026/app) supply chain & logistics conference. All features optimize for booth conversations and pre-event outreach.

**Key Features**:
- **Manifest Meeting Requests**: 250-char AI-generated requests (`/api/manifest/generate`)
- **Facility Intelligence**: Warehouse/DC counts for logistics prospects (ROI calculations)
- **Strategic Questions**: Booth conversation starters based on company dossiers
- **Industry Context**: Supply chain, 3PL, distribution, waste management focus

**Personas Priority**:
1. **ExecOps** (10pts each): C-level operations/logistics executives
2. **Ops** (5pts each): Directors, VPs of operations
3. **Procurement** (3pts each): Supply chain buyers
4. **Sales** (2pts each): Secondary targets

### YardFlow Brand Asset Integration
**Marketing Hub**: [https://flow-state-klbt.vercel.app/](https://flow-state-klbt.vercel.app/) (YardFlow by FreightRoll - Yard Network System)

**Content Sources** (future agent integration):
- ROI calculators with waste management savings models
- Case studies for sequence personalization
- Graphics/social assets for multi-channel campaigns
- Product messaging for email templates
- Contracting templates for deal stages

**Planned Agents** (not yet implemented):
- Prospecting Agent: Lead discovery + qualification
- Research Agent: Company dossier generation
- Sequence Engineer: Multi-step campaign builder
- Content Purposing: Adapt marketing assets to outreach
- Graphics Agent: Visual content for sequences
- Socials Agent: LinkedIn/Twitter coordination
- Contracting Agent: Deal documentation automation

### Email Enrichment (Pattern Detection over APIs)
```typescript
// src/lib/enrichment/email-pattern-detector.ts
// Analyzes existing company emails to infer patterns
// Generates new emails: {first}.{last}@domain.com vs {first}{last}@domain.com
// 88% coverage with MX validation beats 100% guesses
```

**Key insight**: Uses existing contact emails to reverse-engineer company naming conventions. Saves $1,788/year vs Hunter.io.

### AI Integration (Gemini Pro)
```typescript
// src/lib/ai/gemini-client.ts
// Uses Google Gemini Pro (free tier) instead of OpenAI
// Generates: company dossiers, contact insights, strategic questions
// Temperature: 0.7 default, maxTokens: 2048
```

### Sequence Engine (Multi-Step Outreach)
```typescript
// src/lib/outreach/sequence-engine.ts
// enrollContact() - Adds person to sequence with compliance checks
// Uses BullMQ delayed jobs for step timing
// Tracks: opens, clicks, replies, bounces via Gmail integration
```

**Compliance**: GDPR consent, unsubscribe status, email validation checked before enrollment.

### ROI Calculator (Value Proposition Engine)
```typescript
// src/lib/roi-calculator.ts
// Inputs: facilityCount, operationalScale, companySize, persona, industry
// Calculates annual savings based on shipment volume models
// Base: 100-1000 shipments/day/facility * $12/shipment * 15-20% efficiency gain
// Persona multipliers: Procurement +5%, Operations +3%, Exec +2%
// Output: annualSavings ($), paybackPeriod (months), confidence (LOW/MEDIUM/HIGH)
```

**Integration Point**: External calculator at `https://flow-state-klbt.vercel.app/roi/` (future integration via `calculateRoiViaExternalApi()`)

### ICP Scoring (Target Account Qualification)
```typescript
// src/lib/icp-calculator.ts
// Scores 0-100 based on 4 factors:
// 1. Persona Match (0-40 pts): ExecOps=10pts each, Ops=5pts, Procurement=3pts, Sales=2pts
// 2. Executive Count (0-20 pts): 5+ execs=20pts, 3+=15pts, 2+=10pts, 1+=5pts
// 3. Total Contacts (0-20 pts): 10+ contacts=20pts, 7+=15pts, 5+=10pts, 3+=5pts
// 4. Data Completeness (0-20 pts): Percentage of filled fields (name/website/industry/HQ/notes)
// Auto-recalculates on data changes, logged to score_history table
```

**Score Triggers**: When ICP score crosses thresholds, can auto-enroll in sequences (Sprint 24+).

## Environment & Configuration

### Required ENV Vars
```bash
DATABASE_URL             # PostgreSQL connection
AUTH_SECRET              # NextAuth (openssl rand -base64 32)
REDIS_URL               # Railway format: redis://default:pass@host:port
GEMINI_API_KEY          # Google AI Studio (free tier)
GOOGLE_CLIENT_ID        # OAuth + Calendar API
GOOGLE_CLIENT_SECRET    # OAuth credentials
SENDGRID_API_KEY        # Email sending
CRON_SECRET             # For cron job authentication (openssl rand -base64 32)
```

**Optional**: `OPENAI_API_KEY` (fallback), `ENABLE_AUTO_ENRICHMENT` (feature flag), `HUBSPOT_API_KEY` (CRM integration)

### Railway-Specific
- `railway.json`: Main web process (Next.js)
- `railway-worker.json`: Separate worker service
- Both use same DATABASE_URL, REDIS_URL from Railway env
- Build: Nixpacks auto-detects package.json, runs `npm ci && prisma generate && npm run build`

## Common Gotchas

1. **Session Access**: Always null-check before accessing `session.user.id`
   ```typescript
   const session = await auth();
   if (!session?.user?.id) redirect('/login');
   ```

2. **Prisma Generate**: Required after schema changes AND in Railway builds
   ```bash
   npx prisma migrate dev  # Local (generates + migrates)
   npx prisma generate     # Explicit client generation
   ```

3. **Path Aliases**: `@/*` maps to `src/*` (tsconfig.json)

4. **Worker Process**: If queue jobs don't run, check Railway worker service is deployed separately

5. **Build Timeouts**: Railway has 5-min build limit. Keep tasks atomic. If build hangs, check for module-level connections.

## Debugging & Troubleshooting

### Local Development Issues
```bash
# Database connection errors
npx prisma db push          # Force schema sync without migration
npx prisma studio           # Visual database browser (localhost:5555)

# Type errors after schema changes
npx prisma generate         # Regenerate Prisma Client types
rm -rf .next && npm run dev # Clear Next.js cache

# Queue jobs not processing
npm run worker              # Start worker process separately
# Check Redis connection in worker logs
```

### Production Debugging
```bash
# Check Railway logs
railway logs --service web
railway logs --service worker

# Verify deployment
curl https://yardflow-hitlist-production.up.railway.app/api/health

# Check specific service
railway run --service worker env  # View worker environment
railway connect                   # SSH into service container
```

**Debug Endpoints**:
- `/api/health` - System health (database, Redis, auth, env vars)
- `/api/debug/env` - Environment variable check (development only)
- `/api/queue/status` - BullMQ queue statistics

## Disaster Recovery & Maintenance

### Database Backup
```bash
# Create backup (local development)
cd eventops
npm run backup:create  # Uses scripts/backup-database.sh

# Manual backup
pg_dump $DATABASE_URL > backups/backup_$(date +%Y%m%d_%H%M%S).sql
gzip backups/backup_*.sql

# Railway production backup
railway run pg_dump $DATABASE_URL > prod_backup.sql
```

**Auto-cleanup**: Keeps last 7 backups, removes older files automatically

### Database Restore
```bash
# Restore from backup
gunzip -c backups/backup_20260124_120000.sql.gz | psql $DATABASE_URL

# Restore specific tables only
pg_restore -t people -t target_accounts backup.sql | psql $DATABASE_URL
```

### Deployment Rollback
```bash
# Railway rollback to previous deployment
railway rollback

# Or rollback via dashboard: Deployments → Select previous → Rollback

# Verify after rollback
curl https://yardflow-hitlist-production.up.railway.app/api/health
```

### Migration Rollback
```bash
# Undo last migration
npx prisma migrate resolve --rolled-back migration_name

# Reset database (DANGER: deletes all data)
npx prisma migrate reset

# Safe migration rollback (production)
# 1. Create rollback migration manually
# 2. Test in staging first
# 3. Apply with: npx prisma migrate deploy
```

### Emergency Procedures
**Service Down**: Check Railway status → Verify env vars → Check logs → Restart service  
**Database Issues**: Check connection string → Verify Prisma schema → Run health check  
**Queue Stuck**: Restart worker service → Check Redis connection → Clear failed jobs  
**Build Failing**: Check for module-level connections → Verify Prisma generate → Review Railway logs

## Sprint Planning Context

**Current Sprint**: Sprint 30 - Production Hardening (Jan 23, 2026)  
**Task Format**: `TASK X.Y: Description (Est: 45-90 min)` - Atomic, committable units  
**Documentation**: 
- PRIMARY: `docs/current/SPRINT_30_PRODUCTION_HARDENING.md`
- Archive: `docs/archive/sprints/SPRINT_*.md` (historical)
- Principles: `docs/current/PROJECT_PRINCIPLES.md`

**Key Metrics**:
- Build time: < 5 minutes
- Task size: 2-6 hours
- Deploy frequency: After every task
- Uptime: Zero downtime deploys

## File Conventions

- **API Routes**: `app/api/{domain}/{action}/route.ts`
- **Types**: Inline or `src/types/*.ts` (no shared types/ directory)
- **Tests**: `**/__tests__/*.test.ts` (co-located with source)
- **Lib Structure**: Domain-grouped (`lib/enrichment/`, `lib/queue/`, `lib/outreach/`)

## Integration Points

- **Google Calendar**: `src/lib/google/calendar.ts` - Creates meetings via OAuth2
- **SendGrid**: `src/lib/sendgrid.ts` - Transactional email
- **HubSpot**: `src/lib/hubspot/` - CRM sync with rate limiting (100 req/10s)
- **LinkedIn**: Web scraping for company/person enrichment (`src/lib/enrichment/linkedin-scraper.ts`)
- **Manifest App**: Deep links to attendee profiles, meeting requests (`src/lib/manifest-integration.ts`)

### HubSpot Integration Workflow
```typescript
// src/lib/hubspot/sync-contacts.ts
// Rate-limited (100 req/10s) bidirectional sync
// API: POST /api/hubspot/sync/contacts { limit: 100, accountId: "..." }
// Upserts contacts to Prisma, tracks import/update counts
// Uses exponential backoff retry logic for resilience
```

**Setup**: `HUBSPOT_API_KEY` in env, test with `npx tsx scripts/test-hubspot.ts`

### YardFlow Content Hub API Integration
```typescript
// Integration with https://flow-state-klbt.vercel.app/
// Future implementation for pulling marketing assets

// ROI Calculator Integration
async function fetchExternalROI(params: RoiInput): Promise<RoiData> {
  const response = await fetch('https://flow-state-klbt.vercel.app/api/roi/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
}

// Case Study Retrieval
async function fetchCaseStudies(industry: string): Promise<CaseStudy[]> {
  const response = await fetch(`https://flow-state-klbt.vercel.app/api/case-studies?industry=${industry}`);
  return response.json();
}

// Brand Voice Content
async function fetchBrandMessaging(persona: string): Promise<MessagingGuide> {
  const response = await fetch(`https://flow-state-klbt.vercel.app/api/messaging/${persona}`);
  return response.json();
}
```

**Content Types Available**:
- ROI calculators with waste management models
- Case studies filtered by industry/company size
- Product messaging templates per persona
- Social media graphics and assets
- Email signature templates
- Proposal/contracting templates

## When Making Changes

1. **Read sprint docs first**: `docs/current/SPRINT_*_QUICK_REFERENCE.md` for task context
2. **Test locally**: `npm run dev` in `/eventops` before pushing
3. **Check health endpoint**: After Railway deploy, verify `/api/health` returns 200
4. **Update docs**: If architectural change, update relevant sprint doc
5. **Commit atomically**: Each commit should be production-ready, independently testable

## Questions to Ask if Stuck

- Is this a web process (Next.js) or worker process concern?
- Am I initializing connections lazily (not at module load)?
- Does Railway need both services updated (web + worker)?
- Have I run `npx prisma generate` after schema changes?
- Is the health endpoint showing all systems green?

## Best Practices & Patterns

### Error Handling
```typescript
// Always wrap API calls with try-catch + logging
import { logger } from '@/lib/logger';

try {
  await someExternalApi();
} catch (error) {
  logger.error('Context-specific message', { error, metadata });
  return NextResponse.json({ error: 'User-friendly message' }, { status: 500 });
}
```

### Type Safety
- Use Prisma-generated types: `import type { people, target_accounts } from '@prisma/client'`
- Define inline interfaces for API responses (no centralized types directory)
- Use Zod for runtime validation of external inputs

### Performance Patterns
- **Pagination**: Always use cursor-based pagination for large datasets (`@/lib/pagination`)
- **Database Queries**: Use `include` strategically, avoid N+1 queries
- **Caching**: Redis for session data, job queue state (not general purpose cache)
- **Background Jobs**: Long-running tasks (>5s) must use BullMQ worker process

### Data Enrichment Pipeline
```typescript
// Standard enrichment workflow:
// 1. Email Pattern Detection (src/lib/enrichment/email-pattern-detector.ts)
// 2. LinkedIn Scraping (src/lib/enrichment/linkedin-scraper.ts)
// 3. Company Dossier (src/lib/ai-research.ts via Gemini)
// 4. Contact Insights (src/lib/ai-contact-insights.ts)
// 5. ROI Calculation (src/lib/roi-calculator.ts)
// All orchestrated via BullMQ enrichment queue
```

### Multi-Channel Outreach Strategy
**Channels**: EMAIL (primary), LINKEDIN (secondary), MANIFEST (event-specific), PHONE (manual)
**Sequence Pattern**: Email intro → LinkedIn connection → Email follow-up → Manifest request → Phone call
**Tracking**: Opens/clicks via SendGrid webhooks, replies via Gmail API polling

## Future Roadmap (Agent Squad Vision)

**Goal**: Transform EventOps into full GTM automation platform via specialized AI agents

**Agent Architecture** (planned):
1. **Prospecting Agent**: Auto-discover leads from event attendee lists, web scraping
2. **Research Agent**: Generate company dossiers, competitive intelligence
3. **Sequence Engineer**: Build multi-step campaigns based on persona/ICP score
4. **Content Purposing**: Adapt [flow-state-klbt.vercel.app](https://flow-state-klbt.vercel.app/) assets to outreach
5. **Graphics Agent**: Generate visual content for social/email campaigns
6. **Socials Agent**: LinkedIn/Twitter coordination and engagement
7. **Contracting Agent**: Deal documentation, SOW generation, legal templates

**Content Hub Integration**: All agents pull from YardFlow marketing site for:
- Brand voice consistency (waste management, logistics messaging)
- ROI calculator data for value props
- Case studies for social proof
- Visual assets for multi-channel campaigns

**Implementation Notes**:
- Each agent = separate workflow in `src/lib/agents/{name}-agent.ts`
- Agents communicate via BullMQ job chains
- Central orchestrator: `src/lib/agents/orchestrator.ts`
- Agent state stored in `agent_tasks` table (to be created)
