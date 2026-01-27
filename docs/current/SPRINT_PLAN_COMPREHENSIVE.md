# YardFlow Hitlist: Comprehensive Sprint & Task Plan

> **Document Version**: 1.1 (Reviewed & Updated)
> **Created**: 2026-01-27
> **Author**: GitHub Copilot (AI Technical Program Manager)
> **Reviewed By**: AI Senior TPM Subagent
> **Status**: APPROVED - Ready for Execution

---

## Executive Summary

### Current State Analysis
- **Production URL**: `https://yardflow-hitlist-production-2f41.up.railway.app`
- **Build Status**: TIMEOUT (Railway build exceeds time limit)
- **Root Causes Identified**:
  1. **Massive node_modules** (1.1GB) - `googleapis` alone is 196MB
  2. **Inefficient Nixpacks config** - Install phase conflicting with railway.json
  3. **Duplicate build steps** - `npm ci` and `prisma generate` ran multiple times
  4. **55+ API routes** - Large compilation surface area
  5. **postinstall hook** - Triggered extra `prisma generate` on every install

### Build Timeout Root Cause (FIXED)
```
Previous Build Flow (BROKEN):
1. Nixpacks Install: "cd eventops && npm ci" 
2. Railway buildCommand: Also ran "npm ci" - DUPLICATE
3. postinstall hook: Ran "prisma generate" - DUPLICATE
4. Build command: Ran "prisma generate" again - TRIPLICATE
RESULT: Timeout after ~15 minutes

New Build Flow (FIXED):
1. Nixpacks Setup: Install Node 20 only
2. Railway buildCommand: npm ci --omit=dev && prisma generate && build
3. No postinstall (removed)
RESULT: Expected < 8 minutes
```

### Changes Applied This Session
- ✅ Removed `postinstall` hook from `package.json`
- ✅ Simplified `nixpacks.toml` (environment only, no duplicate commands)
- ✅ Updated `railway.json` with `--omit=dev` flag
- ✅ Added caching configuration

---

## PHASE 0: EMERGENCY BUILD FIX

### Sprint 0: Build Pipeline Repair (IMMEDIATE)
**Goal**: Get a successful Railway build within 10 minutes.
**Duration**: 1-2 hours
**Outcome**: Production deployment succeeds.
**Status**: ✅ FIXES APPLIED - AWAITING VERIFICATION

#### Task 0.1: Fix Nixpacks Configuration ✅ DONE
**Priority**: P0 (BLOCKER)
**Status**: Completed this session

**Implementation Applied**:
```toml
# eventops/nixpacks.toml - Environment only, no build commands
[phases.setup]
nixPkgs = ["nodejs_20"]

[caches]
npm = "eventops/node_modules"
next = "eventops/.next/cache"
```

---

#### Task 0.2: Consolidate Build Commands ✅ DONE
**Priority**: P0
**Status**: Completed this session

**Implementation Applied** (railway.json):
```json
{
  "buildCommand": "cd eventops && npm ci --omit=dev --no-audit && npx prisma generate && NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build"
}
```

**Key Changes**:
- `--omit=dev`: Skip devDependencies (saves ~200MB install time)
- `--no-audit`: Skip security audit (saves ~30s)
- Single `prisma generate` call
- Nixpacks handles environment only

---

#### Task 0.3: Remove postinstall Hook ✅ DONE
**Priority**: P1
**Status**: Completed this session

**Change Made**: Removed from `package.json`:
```diff
- "postinstall": "prisma generate",
```

---

#### Task 0.4: Replace googleapis with Lightweight Alternative
**Priority**: P1
**Status**: PENDING - Optional optimization
**Impact**: Would reduce install time by ~2-3 minutes

**Current**: `googleapis` (196MB) for Calendar/Gmail/Contacts
**Proposed**: Individual packages (~10MB total):
- `@googleapis/calendar`
- `@googleapis/gmail`
- `google-auth-library`

**Files to Update**:
- `src/lib/google/auth.ts`
- `src/lib/google/calendar.ts`
- `src/lib/google/gmail.ts`
- `src/lib/google/contacts.ts`

**Validation**:
- [ ] All Google integrations still work
- [ ] node_modules reduced by 180MB+

---

#### Task 0.5: Document Rollback Procedure
**Priority**: P1
**Status**: PENDING

**Documentation to Create**:
```markdown
## Railway Rollback Procedure
1. Go to Railway Dashboard → YardFlow-Hitlist → Deployments
2. Find last working deployment (green check)
3. Click "..." menu → "Rollback to this deployment"
4. Verify /api/ping returns 200
```

---

#### Task 0.6: Verify Build Success
**Priority**: P0
**Status**: PENDING

**Validation Checklist**:
- [ ] `git push` triggers Railway build
- [ ] Build completes in < 10 minutes
- [ ] Deployment shows "Active"
- [ ] `curl /api/ping` returns 200
- [ ] `curl /api/health` returns 200 or 503 (not 502)

**Verification Script**:
```bash
#!/bin/bash
# scripts/verify-build-success.sh
URL="https://yardflow-hitlist-production-2f41.up.railway.app"

echo "Testing ping endpoint..."
if curl -sf "$URL/api/ping" > /dev/null; then
  echo "✅ Ping successful"
else
  echo "❌ Ping failed"
  exit 1
fi

echo "Testing health endpoint..."
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health.json "$URL/api/health")
if [ "$HEALTH" = "200" ] || [ "$HEALTH" = "503" ]; then
  echo "✅ Health endpoint responding ($HEALTH)"
  cat /tmp/health.json | head -5
else
  echo "❌ Health endpoint failed ($HEALTH)"
  exit 1
fi
```

---

## PHASE 1: PRODUCTION STABILITY

### Sprint 1: Core Infrastructure Hardening
**Goal**: Zero 502 errors, reliable health checks, proper observability.
**Duration**: 1 week equivalent
**Outcome**: Production app responds consistently to all requests.
**Demo**: Health check dashboard showing 100% uptime.
**Prerequisites**: Sprint 0 complete (build succeeds)

---

#### Task 1.1: Validate Liveness Endpoint (/api/ping) ✅ EXISTS
**Priority**: P0
**Status**: Already implemented at `src/app/api/ping/route.ts`

**Validation Only**:
- [ ] `curl /api/ping` returns 200 with `{ status: 'ok' }`
- [ ] Response time < 50ms
- [ ] No database/Redis imports in file

---

#### Task 1.2: Harden Health Endpoint (/api/health)
**Priority**: P0
**Description**: Readiness check with graceful degradation.

**Current Issue**: Health check returns 503 if any component fails, but should still respond.

**Acceptance Criteria**:
- Returns 200 if app is running with all services healthy
- Returns 200 with `degraded` status if non-critical service fails
- Returns 503 only if critical failure (DB completely unreachable)
- Each check has 3-second timeout
- Never crashes/throws unhandled exception

**Implementation Pattern**:
```typescript
async function checkWithTimeout<T>(
  name: string,
  check: () => Promise<T>,
  timeoutMs = 3000
): Promise<{ status: 'ok' | 'error'; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await Promise.race([
      check(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
    ]);
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (e) {
    return { status: 'error', latencyMs: Date.now() - start, error: String(e) };
  }
}
```

**Chaos Test**:
```bash
# Temporarily set invalid REDIS_URL, verify health returns 200 degraded
REDIS_URL=redis://invalid:6379 npm run dev
curl localhost:3000/api/health  # Should return 200 with redis.status: 'error'
```

**Validation**:
- [ ] Normal: `curl /api/health` returns 200 with all checks ok
- [ ] Degraded: Returns 200 with degraded status when Redis down
- [ ] Response includes latency metrics for each component

---

#### Task 1.3: Verify Server Binding (0.0.0.0)
**Priority**: P0
**Description**: Ensure Next.js binds to all interfaces.

**Current Status**: Already configured in `start-production.sh`

**Validation Only**:
- [ ] Logs show "Listening on 0.0.0.0:3000" or similar
- [ ] External requests to production URL succeed

---

#### Task 1.4: Audit & Standardize Logging
**Priority**: P1
**Description**: Verify all routes use structured logger.

**Current Status**: `src/lib/logger.ts` exists with Winston

**Audit Tasks**:
- [ ] Grep for `console.log` in `src/` - should find minimal usage
- [ ] Verify API routes use `logger.info/warn/error`
- [ ] Add request_id to logs (via middleware)

**Validation**:
- [ ] `railway logs` shows JSON objects
- [ ] Logs include timestamp, level, message fields

---

#### Task 1.5: Database Connection Pool Optimization
**Priority**: P1
**Description**: Configure Prisma for serverless/container environment.

**Implementation Checklist**:
- [ ] Add `?connection_limit=10&pool_timeout=30` to DATABASE_URL in Railway
- [ ] Verify `src/lib/db.ts` uses `globalThis` singleton pattern
- [ ] Add connection event logging

**Validation Script**:
```typescript
// scripts/verify-db-pool.ts
import { prisma } from '../src/lib/db';

async function test() {
  // Simulate concurrent requests
  const promises = Array(20).fill(null).map(() => 
    prisma.$queryRaw`SELECT 1`
  );
  await Promise.all(promises);
  console.log('✅ 20 concurrent queries succeeded');
}
```

---

#### Task 1.6: Environment Variable Validation
**Priority**: P0
**Description**: Startup check for required env vars.

**Implementation**:
```typescript
// src/lib/env.ts
const REQUIRED_VARS = ['DATABASE_URL', 'AUTH_SECRET', 'REDIS_URL'];

export function validateEnv() {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
```

**Validation**:
- [ ] App fails fast with clear error if DATABASE_URL missing
- [ ] Health endpoint shows which vars are missing

---

### Sprint 2: Authentication & Session Management
**Goal**: Reliable login/logout with proper session handling.
**Duration**: 1 week equivalent
**Outcome**: Users can log in and stay logged in.
**Demo**: Login → Dashboard → Logout flow works 100%.

---

#### Task 2.1: Verify NextAuth Configuration
**Priority**: P0
**Description**: Ensure NextAuth v5 is properly configured for production.

**Acceptance Criteria**:
- `AUTH_SECRET` is set (32+ chars)
- `AUTH_URL` matches production domain
- `trustHost: true` is set for Railway

**Validation**:
- [ ] Login with credentials works
- [ ] Session persists across page refreshes
- [ ] Logout clears session

---

#### Task 2.2: Seed Production Users
**Priority**: P0
**Description**: Ensure default admin user exists.

**Implementation**:
```bash
# Run on Railway
railway run --service yardflow-hitlist-production npm run db:seed:prod
```

**Credentials Created**:
- Admin: `admin@yardflow.com` / `YardFlow2026!`
- Demo: `demo@yardflow.com` / `demo123`

**Validation**:
- [ ] Can log in with admin credentials
- [ ] Dashboard loads without errors

---

#### Task 2.3: Session Error Handling
**Priority**: P1
**Description**: Graceful handling of expired/invalid sessions.

**Acceptance Criteria**:
- Expired session redirects to login
- No crash on invalid session token
- Clear error messages

**Validation**:
- [ ] Wait 1 hour, session still works (or gracefully expires)
- [ ] Manually corrupt cookie, get clean redirect

---

### Sprint 3: Core Data Layer
**Goal**: Reliable CRUD operations for all primary entities.
**Duration**: 1 week equivalent
**Outcome**: All data operations work without errors.
**Demo**: Create/Read/Update accounts, contacts, events.

---

#### Task 3.1: Validate Prisma Schema
**Priority**: P0
**Description**: Ensure schema matches production database.

**Implementation**:
```bash
npx prisma migrate status
npx prisma db push --accept-data-loss=false
```

**Validation**:
- [ ] No pending migrations
- [ ] Schema matches database

---

#### Task 3.2: Account CRUD Operations
**Priority**: P0
**Description**: Verify target_accounts table operations.

**Validation Tests**:
```typescript
// tests/integration/accounts.test.ts
describe('Accounts', () => {
  it('can create account', async () => { ... });
  it('can read accounts list', async () => { ... });
  it('can update account', async () => { ... });
  it('can delete account', async () => { ... });
});
```

---

#### Task 3.3: Contact CRUD Operations
**Priority**: P0
**Description**: Verify people table operations.

**Validation Tests**:
```typescript
// tests/integration/people.test.ts
describe('People', () => {
  it('can create contact', async () => { ... });
  it('can link contact to account', async () => { ... });
  it('can update contact', async () => { ... });
});
```

---

#### Task 3.4: Event CRUD Operations
**Priority**: P1
**Description**: Verify events table operations.

---

### Sprint 4: Background Job Infrastructure
**Goal**: Reliable async job processing with BullMQ + Redis.
**Duration**: 1 week equivalent
**Outcome**: Jobs queue and process reliably.
**Demo**: Enqueue job → Worker processes → Result visible.

---

#### Task 4.1: Redis Connection Singleton
**Priority**: P0
**Description**: Lazy initialization pattern for Redis.

**Current Issue**: Redis connection at module load crashes builds.

**Implementation**:
```typescript
// src/lib/queue/client.ts
let connection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connection;
}
```

**Validation**:
- [ ] Build succeeds without Redis
- [ ] Runtime connects to Redis

---

#### Task 4.2: Queue Definitions
**Priority**: P0
**Description**: Define all job queues with proper options.

**Queues**:
- `enrichment` - Company enrichment jobs
- `outreach` - Email sending jobs
- `sequence` - Sequence step execution
- `agent` - AI agent tasks

**Implementation**:
```typescript
// src/lib/queue/queues.ts
export const enrichmentQueue = new Queue('enrichment', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});
```

---

#### Task 4.3: Worker Process Entry Point
**Priority**: P0
**Description**: Single entry point for worker service.

**Implementation**:
```typescript
// src/lib/queue/workers.ts
import { Worker } from 'bullmq';
import { getRedisConnection } from './client';
import { processEnrichment } from './processors/enrichment';

const enrichmentWorker = new Worker('enrichment', processEnrichment, {
  connection: getRedisConnection(),
  concurrency: 5,
});

console.log('Worker started');
```

**Validation**:
- [ ] `npm run worker` starts without error
- [ ] Worker logs "Worker started"

---

#### Task 4.4: Job Status Dashboard
**Priority**: P1
**Description**: Admin UI to view job status.

**Implementation**:
- Route: `/admin/jobs`
- Show queue counts (waiting, active, completed, failed)
- List recent jobs with status

**Validation**:
- [ ] Dashboard loads
- [ ] Shows accurate counts

---

### Sprint 5: AI Agent Foundation
**Goal**: Basic AI agent can generate content.
**Duration**: 1 week equivalent
**Outcome**: AI generates company dossiers.
**Demo**: Click "Generate Dossier" → AI creates research summary.

---

#### Task 5.1: Gemini API Integration
**Priority**: P0
**Description**: Wrapper for Gemini API calls.

**Implementation**:
```typescript
// src/lib/ai/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateContent(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

**Validation**:
- [ ] Can generate text from prompt
- [ ] Handles API errors gracefully

---

#### Task 5.2: Company Dossier Generator
**Priority**: P0
**Description**: AI generates company research summary.

**Input**: Company name, website, industry
**Output**: Structured dossier with:
- Company overview
- Key pain points
- Tech stack (inferred)
- Recent news

**Validation**:
- [ ] Generates coherent dossier
- [ ] Saves to `company_dossiers` table

---

#### Task 5.3: Research Agent Job Processor
**Priority**: P0
**Description**: BullMQ processor for research jobs.

**Implementation**:
```typescript
// src/lib/queue/processors/research.ts
export async function processResearchJob(job: Job) {
  const { accountId } = job.data;
  const account = await prisma.target_accounts.findUnique({ where: { id: accountId } });
  const dossier = await generateDossier(account);
  await prisma.company_dossiers.upsert({ ... });
  return { success: true, dossierId: dossier.id };
}
```

---

#### Task 5.4: Trigger Research from UI
**Priority**: P1
**Description**: Button on account page to trigger research.

**Implementation**:
- Add "Research" button to account detail page
- POST to `/api/accounts/[id]/research`
- Enqueue research job
- Show "Research in progress" status

**Validation**:
- [ ] Button click enqueues job
- [ ] Job processes and saves dossier
- [ ] Refresh shows dossier content

---

### Sprint 6: Manifest 2026 Data Import
**Goal**: Import and process event attendee data.
**Duration**: 1 week equivalent
**Outcome**: 2000+ companies imported and enriched.
**Demo**: View imported companies with enriched data.

---

#### Task 6.1: CSV Import Endpoint
**Priority**: P0
**Description**: Upload and parse Manifest attendee CSV.

**Implementation**:
- Route: POST `/api/import/manifest`
- Accept multipart/form-data
- Parse CSV with papaparse
- Validate required fields

**Validation**:
- [ ] Upload succeeds
- [ ] Records created in database

---

#### Task 6.2: Bulk Enrichment Dispatcher
**Priority**: P0
**Description**: Enqueue research jobs for all imported companies.

**Implementation**:
```typescript
// scripts/dispatch-manifest-enrichment.ts
const accounts = await prisma.target_accounts.findMany({
  where: { source: 'manifest-2026', dossier: null }
});

for (const account of accounts) {
  await enrichmentQueue.add('enrich', { accountId: account.id });
}
```

**Validation**:
- [ ] All accounts have jobs queued
- [ ] Worker processes jobs progressively

---

#### Task 6.3: Rate Limiting
**Priority**: P0
**Description**: Prevent API quota exhaustion.

**Implementation**:
```typescript
const enrichmentQueue = new Queue('enrichment', {
  limiter: { max: 10, duration: 60000 }, // 10 per minute
});
```

---

#### Task 6.4: Import Progress Dashboard
**Priority**: P1
**Description**: Show import/enrichment progress.

**Display**:
- Total imported: X
- Enriched: Y
- Pending: Z
- Failed: N

---

### Sprint 7: Outreach Campaign Foundation
**Goal**: Create and manage outreach campaigns.
**Duration**: 1 week equivalent
**Outcome**: Campaigns with sequences defined.
**Demo**: Create campaign → Define sequence → Enroll contacts.

---

#### Task 7.1: Campaign CRUD
**Priority**: P0
**Description**: Create and manage campaigns.

---

#### Task 7.2: Sequence Builder
**Priority**: P0
**Description**: Define multi-step outreach sequences.

**Model**:
```prisma
model sequences {
  id        String @id
  name      String
  steps     Json   // [{type: 'email', delay: 0}, {type: 'email', delay: 3d}]
  campaignId String
}
```

---

#### Task 7.3: Contact Enrollment
**Priority**: P0
**Description**: Add contacts to sequences.

---

#### Task 7.4: Sequence Step Processor
**Priority**: P1
**Description**: Worker processes sequence steps.

---

### Sprint 8: Email Generation & Sending
**Goal**: Generate and send personalized emails.
**Duration**: 1 week equivalent
**Outcome**: Emails generated and sent via SendGrid.
**Demo**: Generate email → Preview → Send → Track open.

---

#### Task 8.1: Email Template Engine
**Priority**: P0
**Description**: Generate personalized email content.

---

#### Task 8.2: SendGrid Integration
**Priority**: P0
**Description**: Send emails via SendGrid API.

---

#### Task 8.3: Email Preview UI
**Priority**: P1
**Description**: Preview generated email before sending.

---

#### Task 8.4: Open/Click Tracking
**Priority**: P1
**Description**: Track email engagement.

---

### Sprint 9: Analytics & Reporting
**Goal**: Dashboards showing campaign performance.
**Duration**: 1 week equivalent
**Outcome**: Actionable metrics visible.
**Demo**: View campaign ROI dashboard.

---

#### Task 9.1: Engagement Metrics
**Priority**: P0
**Description**: Track opens, clicks, replies.

---

#### Task 9.2: Campaign Dashboard
**Priority**: P0
**Description**: Overview of all campaigns.

---

#### Task 9.3: Account Engagement Score
**Priority**: P1
**Description**: Calculate engagement per account.

---

#### Task 9.4: Export Reports
**Priority**: P1
**Description**: Export data to CSV/PDF.

---

## PHASE 3: POLISH & SCALE

### Sprint 10: Performance Optimization
- Bundle size reduction
- Database query optimization
- Caching layer

### Sprint 11: Security Hardening
- Rate limiting on all endpoints
- Input validation audit
- CORS configuration

### Sprint 12: Production Readiness
- Monitoring & alerting
- Backup automation
- Disaster recovery plan

---

## Appendix A: Dependency Optimization Recommendations

### Remove or Replace Heavy Dependencies

| Package | Size | Recommendation |
|---------|------|----------------|
| `googleapis` | 196MB | Replace with `googleapis-common` + specific APIs |
| `@hubspot/api-client` | 47MB | Use direct REST calls if using < 3 endpoints |
| `openai` | 13MB | Keep (core feature) |
| `@playwright/test` | 64KB+ | Move to CI-only, not production |

### Recommended package.json changes:
```json
{
  "dependencies": {
    // REMOVE: "googleapis": "^170.1.0"
    // ADD: "@googleapis/calendar": "^9.0.0" (if only using calendar)
  }
}
```

---

## Appendix B: Quick Reference Commands

```bash
# Local Development
cd eventops && npm run dev

# Build Test
cd eventops && npm run build

# Database
cd eventops && npx prisma migrate dev
cd eventops && npx prisma studio

# Worker
cd eventops && npm run worker

# Tests
cd eventops && npm run test:unit
cd eventops && npm run test:smoke:local

# Production Seed
railway run --service yardflow-hitlist-production npm run db:seed:prod
```

---

## Appendix C: Environment Variables Checklist

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `AUTH_SECRET` | ✅ | NextAuth secret (32+ chars) |
| `AUTH_URL` | ✅ | Production URL |
| `GEMINI_API_KEY` | ⚠️ | Required for AI features |
| `SENDGRID_API_KEY` | ⚠️ | Required for email sending |
| `GOOGLE_CLIENT_ID` | ⚠️ | Required for Google OAuth |
| `GOOGLE_CLIENT_SECRET` | ⚠️ | Required for Google OAuth |

---

*End of Document*
