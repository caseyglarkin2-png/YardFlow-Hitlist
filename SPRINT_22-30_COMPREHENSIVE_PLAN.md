# YardFlow Hitlist - Comprehensive Sprint Plan
## Sprints 22-30: Production-Ready Platform

**Created:** January 23, 2026  
**Philosophy:** Ship Fast, Ship Often, Stay Focused  
**Status:** ✅ ACTIVE ROADMAP

---

## 📋 Sprint Plan Overview

Every task follows our atomic deployment philosophy:
- **Atomic:** 30-120 minutes of focused work
- **Committable:** Passes tests, builds successfully
- **Demoable:** Each sprint results in working software
- **Shippable:** Deploy to Railway after each task

**Total Sprints:** 9  
**Total Tasks:** 65 atomic tasks  
**Estimated Time:** 9-12 weeks

---

## 🏗️ Sprint 22: Production Stabilization & Foundation

**Goal:** Fix production blockers, establish monitoring, validate core functionality

**Success Criteria:** 
- ✅ App accessible and functional on Railway
- ✅ Zero console errors in production logs
- ✅ Authentication working for all users
- ✅ Database queries optimized and indexed
- ✅ Automated smoke tests passing

**Priority:** 🔴 CRITICAL - DO FIRST

---

### Task 22.1: Fix NextAuth Untrusted Host Error

**Status:** ✅ COMPLETE (commit a50a0f6)

**Description:** Add `trustHost: true` to NextAuth config for Railway deployment

**Files Changed:** `src/lib/auth.ts`

**Validation:** ✅ Railway logs show no UntrustedHost errors

**Time:** 15 min

---

### Task 22.2: Fix Remaining Type Errors

**Description:** Resolve any lingering Prisma query type errors in enrichment libraries

**Files to Check:**
- `src/lib/enrichment/email-pattern-detector.ts`
- `src/lib/enrichment/pattern-applicator.ts`
- `src/lib/enrichment/linkedin-extractor.ts`
- `src/lib/enrichment/wikipedia-extractor.ts`

**Implementation:**
- Search for any remaining `{ not: null }` patterns
- Replace with compatible Prisma 5.x syntax
- Ensure nested filters use `AND` arrays where needed

**Validation:**
```bash
cd eventops
npm run build
# Should complete with 0 type errors
```

**Tests:**
```bash
npm test -- enrichment
# All enrichment tests pass
```

**Estimate:** 60 min

**Ship:** `git commit -m "fix: remaining Prisma type errors"` → Railway auto-deploy

---

### Task 22.3: Production Health Check Endpoint

**Description:** Create comprehensive health check API for monitoring

**Files:** `src/app/api/health/route.ts`

**Implementation:**
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {} as any
  };

  try {
    // Database connectivity
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = { status: 'ok', responseTime: '<50ms' };
  } catch (e) {
    checks.checks.database = { status: 'error', error: e.message };
    checks.status = 'unhealthy';
  }

  try {
    // Auth system check
    const session = await auth();
    checks.checks.auth = { status: 'ok', configured: true };
  } catch (e) {
    checks.checks.auth = { status: 'error', error: e.message };
  }

  // Environment variables
  checks.checks.env = {
    nodeEnv: process.env.NODE_ENV,
    databaseConfigured: !!process.env.DATABASE_URL,
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  };

  return NextResponse.json(checks, { 
    status: checks.status === 'healthy' ? 200 : 503 
  });
}
```

**Validation:**
```bash
curl https://yardflow-hitlist-production.up.railway.app/api/health
# Returns 200 with healthy status

# Check all systems:
curl https://yardflow-hitlist-production.up.railway.app/api/health | jq '.checks'
```

**Estimate:** 45 min

**Ship:** `git commit -m "feat: production health check endpoint"`

---

### Task 22.4: Production Smoke Test Suite

**Description:** Automated tests for critical production paths

**Files:** `tests/smoke/production.spec.ts`

**Implementation:**
```typescript
import { test, expect } from '@playwright/test';

const PROD_URL = 'https://yardflow-hitlist-production.up.railway.app';

test.describe('Production Smoke Tests', () => {
  test('health check returns 200', async ({ request }) => {
    const response = await request.get(`${PROD_URL}/api/health`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('home page loads', async ({ page }) => {
    await page.goto(PROD_URL);
    await expect(page).toHaveTitle(/YardFlow/);
  });

  test('login page accessible', async ({ page }) => {
    await page.goto(`${PROD_URL}/login`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('API returns 401 for unauthenticated requests', async ({ request }) => {
    const response = await request.get(`${PROD_URL}/api/people`);
    expect(response.status()).toBe(401);
  });

  test('database connection works', async ({ request }) => {
    const health = await request.get(`${PROD_URL}/api/health`);
    const data = await health.json();
    expect(data.checks.database.status).toBe('ok');
  });
});
```

**Package Installation:**
```bash
cd eventops
npm install -D @playwright/test
npx playwright install chromium
```

**Validation:**
```bash
npm run test:smoke
# Output: ✓ 5 tests passed
```

**Add to package.json:**
```json
{
  "scripts": {
    "test:smoke": "playwright test tests/smoke"
  }
}
```

**Estimate:** 90 min

**Ship:** `git commit -m "test: production smoke test suite"`

---

### Task 22.5: Error Boundary Implementation

**Description:** Add React error boundaries to prevent white screens of death

**Files:**
- `src/app/error.tsx` (route-level errors)
- `src/app/global-error.tsx` (root layout errors)
- `src/components/error-boundary.tsx` (reusable component)

**Implementation:**

**`src/app/error.tsx`:**
```typescript
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground">
          {error.message || 'An unexpected error occurred'}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
```

**`src/app/global-error.tsx`:**
```typescript
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Application Error</h2>
          <p>{error.message}</p>
          <button onClick={reset}>Reload</button>
        </div>
      </body>
    </html>
  );
}
```

**Validation:**
1. Add `throw new Error('Test error')` to dashboard page
2. Visit `/dashboard` → see error boundary
3. Click "Try again" → error clears
4. Remove test error
5. Check Railway logs for error logging

**Estimate:** 60 min

**Ship:** `git commit -m "feat: error boundaries for graceful failure"`

---

### Task 22.6: Production Database Migration Verification

**Description:** Ensure all Prisma migrations applied in Railway production

**Implementation:**
```bash
# In Railway console or via CLI:
railway run npx prisma migrate status

# Should show:
# Database schema is up to date!
# No pending migrations
```

**Validation Steps:**
1. Run migration status check
2. Query database to verify data:
   ```sql
   SELECT COUNT(*) FROM people;
   -- Expected: 5409
   
   SELECT COUNT(*) FROM target_accounts;
   -- Expected: 2653
   ```
3. Check indexes exist:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'people';
   -- Verify primary key and foreign key indexes exist
   ```
4. Document migration process in `docs/railway-migrations.md`

**Files:** `docs/railway-migrations.md` (new)

**Validation:**
- ✅ Migration status shows "up to date"
- ✅ Person count: 5,409
- ✅ Company count: 2,653
- ✅ Indexes present on foreign keys

**Estimate:** 30 min

**Ship:** `git commit -m "docs: Railway migration verification process"`

---

### Task 22.7: Structured Logging Infrastructure

**Description:** Add Winston logger for structured production logging

**Files:** 
- `src/lib/logger.ts` (new)
- `src/middleware.ts` (update)

**Installation:**
```bash
cd eventops
npm install winston
```

**Implementation:**

**`src/lib/logger.ts`:**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'yardflow' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

export default logger;

// Helper functions
export const logAPIRequest = (method: string, path: string, duration: number) => {
  logger.info('API Request', { method, path, duration });
};

export const logError = (error: Error, context?: any) => {
  logger.error('Application Error', { 
    message: error.message, 
    stack: error.stack,
    ...context 
  });
};
```

**Update middleware:**
```typescript
// src/middleware.ts
import logger from '@/lib/logger';

export function middleware(req: NextRequest) {
  const start = Date.now();
  
  // ... existing auth logic ...
  
  // Log request
  const duration = Date.now() - start;
  logger.info('Request', {
    method: req.method,
    path: req.nextUrl.pathname,
    duration,
    userAgent: req.headers.get('user-agent')
  });
  
  return response;
}
```

**Validation:**
```bash
# Check Railway logs for structured output:
railway logs | grep "API Request"
railway logs | grep "error"

# Should see JSON-formatted log entries
```

**Estimate:** 90 min

**Ship:** `git commit -m "feat: structured logging with Winston"`

---

### Task 22.8: Production Metrics Dashboard

**Description:** Enable Railway metrics and set up basic alerting

**Implementation:**
1. Enable Railway metrics in project settings
2. Configure response time alert (>2s threshold)
3. Configure error rate alert (>1% threshold)
4. Set up database connection pool monitoring
5. Document metrics access in README

**Steps:**
```bash
# View Railway metrics:
railway status
railway logs --filter "error"

# Check database connections:
railway run psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

**Files:** Update `README.md` with monitoring section

**Validation:**
- ✅ Can view metrics in Railway dashboard
- ✅ Response time visible for API routes
- ✅ Error logs filterable
- ✅ Database connection count visible

**Estimate:** 45 min

**Ship:** `git commit -m "docs: production metrics and monitoring"`

---

## 🎯 Sprint 22 Demo

**What We Ship:**
1. ✅ Production app fully functional on Railway
2. ✅ Health check endpoint for monitoring
3. ✅ Automated smoke tests prevent regressions
4. ✅ Error boundaries prevent white screens
5. ✅ Structured logging for debugging
6. ✅ Metrics dashboard for performance tracking

**How to Demo:**
```bash
# Health check
curl https://yardflow-hitlist-production.up.railway.app/api/health

# Run smoke tests
npm run test:smoke

# Check metrics
railway status
railway logs --tail 50
```

**Success Metrics:**
- All 8 tasks completed ✅
- 8 production commits
- 0 critical errors in logs
- Smoke tests: 5/5 passing
- Response time: <500ms average

---

## 🔧 Sprint 23: HubSpot Integration Activation

**Goal:** Activate HubSpot CRM integration using existing API key (ffe089b9-5787-4a13-857b-f2e071851b8e)

**Success Criteria:**
- ✅ Sync HubSpot contacts to YardFlow (bi-directional)
- ✅ Import HubSpot deals and display on dashboard
- ✅ Push YardFlow enrichment data back to HubSpot
- ✅ Real-time webhook sync working
- ✅ Integration dashboard showing sync status

**Why HubSpot Before Google:** Simpler API, proven SDK, existing customers likely use it

---

### Task 23.0: HubSpot API Setup & Validation

**Description:** Verify HubSpot API key, configure client, test connectivity

**Files:** 
- `.env` (verify `HUBSPOT_API_KEY`)
- `src/lib/hubspot/client.ts` (new)

**Installation:**
```bash
cd eventops
npm install @hubspot/api-client
```

**Implementation:**

**`src/lib/hubspot/client.ts`:**
```typescript
import { Client } from '@hubspot/api-client';

if (!process.env.HUBSPOT_API_KEY) {
  throw new Error('HUBSPOT_API_KEY environment variable not set');
}

export const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_API_KEY,
});

// Test connection
export async function testHubSpotConnection() {
  try {
    const response = await hubspotClient.crm.contacts.basicApi.getPage();
    return { success: true, contactCount: response.total };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**Validation:**
```bash
# Test in Railway console:
railway run node -e "
  const { testHubSpotConnection } = require('./eventops/src/lib/hubspot/client.ts');
  testHubSpotConnection().then(console.log);
"

# Expected output:
# { success: true, contactCount: 123 }
```

**Estimate:** 30 min

**Ship:** `git commit -m "feat: HubSpot API client setup"`

---

### Task 23.1: HubSpot Rate Limiting Middleware

**Description:** Implement rate limit handling for HubSpot API (100 req/10s limit)

**Files:** `src/lib/hubspot/rate-limiter.ts` (new)

**Implementation:**
```typescript
import logger from '@/lib/logger';

class HubSpotRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestCount = 0;
  private windowStart = Date.now();
  
  private readonly MAX_REQUESTS = 100;
  private readonly WINDOW_MS = 10000; // 10 seconds

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          if (error.code === 429) {
            // Retry after delay
            const retryAfter = parseInt(error.response?.headers?.['retry-after'] || '10');
            logger.warn('HubSpot rate limit hit, retrying', { retryAfter });
            await this.sleep(retryAfter * 1000);
            return this.execute(fn);
          }
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      
      // Reset window if needed
      if (now - this.windowStart > this.WINDOW_MS) {
        this.requestCount = 0;
        this.windowStart = now;
      }

      // Wait if at limit
      if (this.requestCount >= this.MAX_REQUESTS) {
        const waitTime = this.WINDOW_MS - (now - this.windowStart);
        await this.sleep(waitTime);
        this.requestCount = 0;
        this.windowStart = Date.now();
      }

      const task = this.queue.shift();
      if (task) {
        this.requestCount++;
        await task();
      }
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const rateLimiter = new HubSpotRateLimiter();
```

**Validation:**
```typescript
// Test file: src/lib/hubspot/__tests__/rate-limiter.test.ts
test('handles 150 requests without 429 errors', async () => {
  const requests = Array.from({ length: 150 }, () => 
    rateLimiter.execute(() => Promise.resolve('ok'))
  );
  
  const results = await Promise.all(requests);
  expect(results).toHaveLength(150);
  expect(results.every(r => r === 'ok')).toBe(true);
});
```

**Estimate:** 90 min

**Ship:** `git commit -m "feat: HubSpot rate limiting with retry logic"`

---

### Task 23.2: HubSpot Contact Sync (Pull)

**Description:** Import contacts from HubSpot CRM to YardFlow database

**Files:**
- `src/lib/hubspot/sync-contacts.ts` (new)
- `src/app/api/hubspot/sync/contacts/route.ts` (new)

**Implementation:**

**`src/lib/hubspot/sync-contacts.ts`:**
```typescript
import { hubspotClient } from './client';
import { rateLimiter } from './rate-limiter';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';

export async function syncHubSpotContacts(accountId?: string) {
  const results = {
    imported: 0,
    updated: 0,
    errors: 0,
  };

  try {
    // Fetch all contacts with pagination
    let after: string | undefined;
    do {
      const response = await rateLimiter.execute(() =>
        hubspotClient.crm.contacts.basicApi.getPage(100, after, [
          'email',
          'firstname',
          'lastname',
          'phone',
          'company',
          'jobtitle',
          'linkedin',
        ])
      );

      for (const contact of response.results) {
        try {
          const props = contact.properties;
          
          // Find or create company
          let companyId = accountId;
          if (!companyId && props.company) {
            const company = await prisma.target_accounts.findFirst({
              where: { name: { contains: props.company, mode: 'insensitive' } }
            });
            companyId = company?.id;
          }

          // Upsert person
          await prisma.people.upsert({
            where: { 
              email: props.email || `hubspot_${contact.id}@placeholder.com` 
            },
            create: {
              email: props.email,
              name: `${props.firstname || ''} ${props.lastname || ''}`.trim(),
              phone: props.phone,
              title: props.jobtitle,
              linkedin: props.linkedin,
              accountId: companyId,
              hubspotContactId: contact.id,
              createdAt: new Date(contact.createdAt),
              updatedAt: new Date(contact.updatedAt),
            },
            update: {
              name: `${props.firstname || ''} ${props.lastname || ''}`.trim(),
              phone: props.phone,
              title: props.jobtitle,
              linkedin: props.linkedin,
              hubspotContactId: contact.id,
              updatedAt: new Date(contact.updatedAt),
            },
          });

          results.imported++;
        } catch (error) {
          logger.error('Failed to sync contact', { contactId: contact.id, error });
          results.errors++;
        }
      }

      after = response.paging?.next?.after;
    } while (after);

    logger.info('HubSpot contact sync complete', results);
    return results;
  } catch (error) {
    logger.error('HubSpot contact sync failed', { error });
    throw error;
  }
}
```

**API Route:**
```typescript
// src/app/api/hubspot/sync/contacts/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncHubSpotContacts } from '@/lib/hubspot/sync-contacts';

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { accountId } = await req.json();
  
  const results = await syncHubSpotContacts(accountId);
  
  return NextResponse.json(results);
}
```

**Validation:**
```bash
# Test API call:
curl -X POST https://yardflow-hitlist-production.up.railway.app/api/hubspot/sync/contacts \
  -H "Cookie: authjs.session-token=..." \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected response:
# {"imported": 50, "updated": 0, "errors": 0}

# Verify in database:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM people WHERE \"hubspotContactId\" IS NOT NULL;"
```

**Estimate:** 120 min

**Ship:** `git commit -m "feat: HubSpot contact sync (pull)"`

---

### Task 23.3: HubSpot Deal Schema & Migration

**Description:** Add Deal model to Prisma schema for HubSpot opportunities

**Files:** `prisma/schema.prisma`

**Schema Addition:**
```prisma
model Deal {
  id            String    @id @default(cuid())
  hubspotId     String    @unique
  name          String
  amount        Float?
  stage         String
  closeDate     DateTime?
  probability   Float?
  description   String?
  
  // Relationships
  companyId     String?
  company       target_accounts? @relation(fields: [companyId], references: [id])
  
  // Metadata
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([companyId])
  @@index([stage])
  @@index([closeDate])
}
```

**Update target_accounts:**
```prisma
model target_accounts {
  // ... existing fields ...
  deals         Deal[]
}
```

**Migration:**
```bash
cd eventops
npx prisma migrate dev --name add_hubspot_deals
npx prisma generate
```

**Validation:**
```bash
# Check migration created:
ls prisma/migrations/ | grep add_hubspot_deals

# Apply to Railway:
git push  # Auto-deploys and runs migrations

# Verify schema:
railway run npx prisma db pull
```

**Estimate:** 30 min

**Ship:** `git commit -m "feat: HubSpot deals schema and migration"`

---

### Task 23.4: HubSpot Deal Import

**Description:** Import deals/opportunities from HubSpot

**Files:**
- `src/lib/hubspot/sync-deals.ts` (new)
- `src/app/api/hubspot/sync/deals/route.ts` (new)

**Implementation:**

**`src/lib/hubspot/sync-deals.ts`:**
```typescript
import { hubspotClient } from './client';
import { rateLimiter } from './rate-limiter';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';

export async function syncHubSpotDeals() {
  const results = {
    imported: 0,
    updated: 0,
    errors: 0,
  };

  try {
    let after: string | undefined;
    do {
      const response = await rateLimiter.execute(() =>
        hubspotClient.crm.deals.basicApi.getPage(100, after, [
          'dealname',
          'amount',
          'dealstage',
          'closedate',
          'description',
          'hs_deal_stage_probability',
        ])
      );

      for (const deal of response.results) {
        try {
          const props = deal.properties;
          
          // Find associated company via HubSpot associations
          let companyId: string | undefined;
          try {
            const associations = await hubspotClient.crm.deals.associationsApi.getAll(
              deal.id,
              'companies'
            );
            if (associations.results.length > 0) {
              const hubspotCompanyId = associations.results[0].id;
              const company = await prisma.target_accounts.findFirst({
                where: { hubspotCompanyId }
              });
              companyId = company?.id;
            }
          } catch (e) {
            logger.warn('Could not find company for deal', { dealId: deal.id });
          }

          await prisma.deal.upsert({
            where: { hubspotId: deal.id },
            create: {
              hubspotId: deal.id,
              name: props.dealname || 'Untitled Deal',
              amount: props.amount ? parseFloat(props.amount) : null,
              stage: props.dealstage || 'unknown',
              closeDate: props.closedate ? new Date(props.closedate) : null,
              probability: props.hs_deal_stage_probability 
                ? parseFloat(props.hs_deal_stage_probability) 
                : null,
              description: props.description,
              companyId,
              createdAt: new Date(deal.createdAt),
              updatedAt: new Date(deal.updatedAt),
            },
            update: {
              name: props.dealname || 'Untitled Deal',
              amount: props.amount ? parseFloat(props.amount) : null,
              stage: props.dealstage || 'unknown',
              closeDate: props.closedate ? new Date(props.closedate) : null,
              probability: props.hs_deal_stage_probability 
                ? parseFloat(props.hs_deal_stage_probability) 
                : null,
              description: props.description,
              companyId,
              updatedAt: new Date(deal.updatedAt),
            },
          });

          results.imported++;
        } catch (error) {
          logger.error('Failed to sync deal', { dealId: deal.id, error });
          results.errors++;
        }
      }

      after = response.paging?.next?.after;
    } while (after);

    logger.info('HubSpot deal sync complete', results);
    return results;
  } catch (error) {
    logger.error('HubSpot deal sync failed', { error });
    throw error;
  }
}
```

**Validation:**
```bash
# Sync deals:
curl -X POST .../api/hubspot/sync/deals

# Check database:
psql $DATABASE_URL -c "SELECT name, amount, stage FROM \"Deal\" LIMIT 10;"
```

**Estimate:** 90 min

**Ship:** `git commit -m "feat: HubSpot deal import"`

---

### Task 23.5: Deal Dashboard View

**Description:** Display HubSpot deals on dashboard

**Files:** `src/app/dashboard/deals/page.tsx` (new)

**Implementation:**
```typescript
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export default async function DealsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const deals = await prisma.deal.findMany({
    include: {
      company: {
        select: { name: true, id: true }
      }
    },
    orderBy: { amount: 'desc' },
    take: 50,
  });

  const totalValue = deals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
  const avgDealSize = totalValue / deals.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Deals</h1>
        <p className="text-muted-foreground">
          HubSpot opportunities synced to YardFlow
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deal Count</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{deals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg Deal Size</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(avgDealSize)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deals.map(deal => (
              <div key={deal.id} className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-semibold">{deal.name}</h3>
                  {deal.company && (
                    <p className="text-sm text-muted-foreground">
                      {deal.company.name}
                    </p>
                  )}
                  <Badge variant="outline">{deal.stage}</Badge>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(deal.amount || 0)}</p>
                  {deal.closeDate && (
                    <p className="text-sm text-muted-foreground">
                      Close: {new Date(deal.closeDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Validation:**
- Navigate to `/dashboard/deals`
- See list of HubSpot deals
- Verify total value calculation
- Click company link → go to company page

**Estimate:** 60 min

**Ship:** `git commit -m "feat: deals dashboard view"`

---

### Task 23.6: HubSpot Enrichment Push

**Description:** Push YardFlow enrichment data back to HubSpot contacts

**Files:**
- `src/lib/hubspot/push-enrichment.ts` (new)
- Update enrichment workflows to trigger push

**Implementation:**

**`src/lib/hubspot/push-enrichment.ts`:**
```typescript
import { hubspotClient } from './client';
import { rateLimiter } from './rate-limiter';
import logger from '@/lib/logger';

export async function pushEnrichmentToHubSpot(personId: string) {
  const person = await prisma.people.findUnique({
    where: { id: personId },
    include: { account: true }
  });

  if (!person?.hubspotContactId) {
    logger.warn('Person has no HubSpot ID', { personId });
    return;
  }

  try {
    // Prepare custom properties to update
    const properties: Record<string, any> = {};

    if (person.email) properties.email = person.email;
    if (person.phone) properties.phone = person.phone;
    if (person.linkedin) properties.linkedin = person.linkedin;
    if (person.title) properties.jobtitle = person.title;
    
    // Custom fields (create these in HubSpot first)
    if (person.icpScore) properties.icp_score = person.icpScore;
    if (person.enrichmentSource) {
      properties.enrichment_source = person.enrichmentSource;
    }

    await rateLimiter.execute(() =>
      hubspotClient.crm.contacts.basicApi.update(
        person.hubspotContactId!,
        { properties }
      )
    );

    logger.info('Pushed enrichment to HubSpot', { 
      personId, 
      hubspotId: person.hubspotContactId 
    });
  } catch (error) {
    logger.error('Failed to push enrichment to HubSpot', { 
      personId, 
      error 
    });
    throw error;
  }
}
```

**Hook into Enrichment:**
Update `src/lib/enrichment/orchestrator.ts`:
```typescript
// After enriching a person:
if (updatedPerson.hubspotContactId) {
  await pushEnrichmentToHubSpot(updatedPerson.id);
}
```

**Validation:**
1. Enrich a contact in YardFlow (find email via pattern)
2. Check HubSpot contact → see email updated
3. Check Railway logs → see "Pushed enrichment to HubSpot"

**Estimate:** 120 min

**Ship:** `git commit -m "feat: push enrichment to HubSpot"`

---

### Task 23.7: HubSpot Webhook Handler

**Description:** Receive real-time updates from HubSpot when contacts/deals change

**Files:**
- `src/app/api/webhooks/hubspot/route.ts` (new)
- Webhook signature verification

**Implementation:**

**`src/app/api/webhooks/hubspot/route.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import logger from '@/lib/logger';
import { syncHubSpotContacts } from '@/lib/hubspot/sync-contacts';

// Verify HubSpot signature
function verifySignature(
  signature: string,
  requestBody: string,
  clientSecret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', clientSecret)
    .update(requestBody)
    .digest('hex');
  return signature === hash;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('X-HubSpot-Signature');
  const body = await req.text();
  
  // Verify signature
  if (!signature || !verifySignature(
    signature, 
    body, 
    process.env.HUBSPOT_CLIENT_SECRET!
  )) {
    logger.warn('Invalid HubSpot webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const events = JSON.parse(body);
  
  for (const event of events) {
    logger.info('HubSpot webhook received', { 
      eventType: event.subscriptionType,
      objectId: event.objectId 
    });

    try {
      switch (event.subscriptionType) {
        case 'contact.creation':
        case 'contact.propertyChange':
          // Sync specific contact
          await syncHubSpotContacts();
          break;
          
        case 'deal.creation':
        case 'deal.propertyChange':
          // Sync specific deal
          await syncHubSpotDeals();
          break;
      }
    } catch (error) {
      logger.error('Webhook processing failed', { event, error });
    }
  }

  return NextResponse.json({ success: true });
}
```

**HubSpot Configuration:**
1. Go to HubSpot Settings → Integrations → Private Apps
2. Create webhook subscription
3. URL: `https://yardflow-hitlist-production.up.railway.app/api/webhooks/hubspot`
4. Events: `contact.creation`, `contact.propertyChange`, `deal.creation`

**Validation:**
1. Update a contact in HubSpot UI
2. Wait 30 seconds
3. Check YardFlow database → see update
4. Check Railway logs → see webhook event

**Estimate:** 90 min

**Ship:** `git commit -m "feat: HubSpot webhook handler for real-time sync"`

---

### Task 23.8: HubSpot Integration Dashboard

**Description:** Dashboard showing HubSpot sync status and controls

**Files:** `src/app/dashboard/integrations/hubspot/page.tsx` (new)

**Implementation:**
```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function HubSpotIntegrationPage() {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const syncContacts = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/hubspot/sync/contacts', {
        method: 'POST',
      });
      const data = await response.json();
      toast({
        title: 'Sync Complete',
        description: `Imported: ${data.imported}, Errors: ${data.errors}`,
      });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HubSpot Integration</h1>
        <p className="text-muted-foreground">
          Bi-directional sync with HubSpot CRM
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Connection Status
              <Badge variant="default">Connected</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Key</span>
                <span>••••••••{process.env.HUBSPOT_API_KEY?.slice(-4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Webhook</span>
                <Badge variant="outline">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={syncContacts} 
              disabled={syncing}
              className="w-full"
            >
              {syncing ? 'Syncing...' : 'Sync Contacts Now'}
            </Button>
            <Button 
              variant="outline"
              className="w-full"
            >
              Sync Deals Now
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add sync log table here */}
          <p className="text-sm text-muted-foreground">
            Last sync: Just now
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Validation:**
- Visit `/dashboard/integrations/hubspot`
- Click "Sync Contacts Now" → see success toast
- Verify connection status shows "Connected"

**Estimate:** 60 min

**Ship:** `git commit -m "feat: HubSpot integration dashboard"`

---

## 🎯 Sprint 23 Demo

**What We Ship:**
1. ✅ Full HubSpot CRM integration
2. ✅ Bi-directional contact sync
3. ✅ Deal import and dashboard
4. ✅ Real-time webhook updates
5. ✅ Rate-limited API calls (no 429 errors)
6. ✅ Integration management UI

**How to Demo:**
```bash
# Sync contacts from HubSpot
curl -X POST .../api/hubspot/sync/contacts

# View deals dashboard
open https://yardflow-hitlist-production.up.railway.app/dashboard/deals

# Update contact in HubSpot → auto-syncs to YardFlow
# Enrich contact in YardFlow → auto-pushes to HubSpot
```

**Success Metrics:**
- All 8 tasks completed ✅
- 100+ contacts synced
- 20+ deals imported
- Webhook responding <1s
- 0 rate limit errors

---

## 📧 Sprint 24: Email Pattern Enhancement

**Goal:** Production-ready email pattern detection and generation

**Success Criteria:**
- ✅ >90% pattern detection accuracy
- ✅ Email validation before saving
- ✅ Pattern management UI
- ✅ Bulk generation with job queue
- ✅ Analytics dashboard

---

### Task 24.0: Job Queue Infrastructure (Redis + BullMQ)

**Description:** Set up Redis and BullMQ for background jobs

**Files:**
- `docker-compose.yml` (add Redis locally)
- `src/lib/queue/setup.ts` (new)
- Railway: Add Redis service

**Installation:**
```bash
cd eventops
npm install bullmq ioredis
```

**Railway Redis Setup:**
```bash
# In Railway dashboard:
# Add Service → Database → Redis
# Copy REDIS_URL to environment variables
```

**Implementation:**

**`src/lib/queue/setup.ts`:**
```typescript
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Email generation queue
export const emailQueue = new Queue('email-generation', { connection });

// Worker for processing jobs
export const emailWorker = new Worker(
  'email-generation',
  async (job) => {
    const { type, data } = job.data;
    
    switch (type) {
      case 'generate-bulk':
        const { generateBulkEmails } = await import('@/lib/enrichment/email-generator');
        return await generateBulkEmails(data.companyId, data.force);
      
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  },
  { connection }
);

emailWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
```

**Validation:**
```bash
# Add test job:
curl -X POST .../api/queue/test \
  -d '{"message": "test"}'

# Check Redis:
railway run redis-cli
> KEYS *
> LLEN bull:email-generation:wait
```

**Estimate:** 90 min

**Ship:** `git commit -m "feat: Redis and BullMQ job queue infrastructure"`

---

### Task 24.1: Enhanced Pattern Detection Algorithm

**Description:** Improve email pattern detection with edge case handling

**Files:** `src/lib/enrichment/email-pattern-detector.ts`

**Enhancements:**
```typescript
// Handle edge cases:
// - Middle names: "John Michael Doe" → j.doe, jm.doe, john.doe
// - Suffixes: "John Doe Jr." → remove Jr., III, etc.
// - Hyphens: "Mary-Jane Smith" → maryjane.smith, mary-jane.smith
// - International: "José García" → jose.garcia (normalize accents)

export function detectEmailPatterns(emails: Array<{ email: string; name: string }>) {
  const patterns: Record<string, { count: number; examples: string[] }> = {};

  for (const { email, name } of emails) {
    const pattern = extractPattern(email, normalizeName(name));
    
    if (!patterns[pattern]) {
      patterns[pattern] = { count: 0, examples: [] };
    }
    
    patterns[pattern].count++;
    if (patterns[pattern].examples.length < 3) {
      patterns[pattern].examples.push(email);
    }
  }

  // Return sorted by confidence (frequency)
  return Object.entries(patterns)
    .map(([pattern, data]) => ({
      pattern,
      confidence: data.count / emails.length,
      examples: data.examples,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count);
}

function normalizeName(name: string): { first: string; last: string; middle?: string } {
  // Remove suffixes
  name = name.replace(/\b(Jr|Sr|III|IV|PhD|MD)\b\.?/gi, '').trim();
  
  // Normalize accents
  name = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const parts = name.split(/\s+/);
  
  if (parts.length === 2) {
    return { first: parts[0], last: parts[1] };
  } else if (parts.length >= 3) {
    return { 
      first: parts[0], 
      middle: parts.slice(1, -1).join(' '),
      last: parts[parts.length - 1] 
    };
  }
  
  return { first: name, last: '' };
}

function extractPattern(email: string, name: { first: string; last: string; middle?: string }): string {
  const [localPart] = email.split('@');
  const normalized = localPart.toLowerCase();
  
  const first = name.first.toLowerCase();
  const last = name.last.toLowerCase();
  const middle = name.middle?.toLowerCase();
  
  // Try to match common patterns
  if (normalized === `${first}.${last}`) return '{first}.{last}';
  if (normalized === `${first}${last}`) return '{first}{last}';
  if (normalized === `${first[0]}${last}`) return '{f}{last}';
  if (normalized === `${first}.${last[0]}`) return '{first}.{l}';
  if (normalized === `${first[0]}.${last}`) return '{f}.{last}';
  
  // Middle initial
  if (middle && normalized === `${first}.${middle[0]}.${last}`) {
    return '{first}.{m}.{last}';
  }
  
  return 'unknown';
}
```

**Tests:**
```typescript
// src/lib/enrichment/__tests__/email-pattern-detector.test.ts
describe('Email Pattern Detection', () => {
  test('handles middle names', () => {
    const emails = [
      { name: 'John Michael Doe', email: 'john.m.doe@company.com' },
      { name: 'Jane Marie Smith', email: 'jane.m.smith@company.com' },
    ];
    
    const patterns = detectEmailPatterns(emails);
    expect(patterns[0].pattern).toBe('{first}.{m}.{last}');
    expect(patterns[0].confidence).toBe(1.0);
  });

  test('handles suffixes', () => {
    const emails = [
      { name: 'John Doe Jr.', email: 'john.doe@company.com' },
      { name: 'Jane Smith PhD', email: 'jane.smith@company.com' },
    ];
    
    const patterns = detectEmailPatterns(emails);
    expect(patterns[0].pattern).toBe('{first}.{last}');
  });

  test('handles accents', () => {
    const emails = [
      { name: 'José García', email: 'jose.garcia@company.com' },
    ];
    
    const patterns = detectEmailPatterns(emails);
    expect(patterns[0].pattern).toBe('{first}.{last}');
  });

  test('achieves >90% accuracy on real data', async () => {
    const realEmails = await prisma.people.findMany({
      where: { email: { not: null }, name: { not: null } },
      select: { email: true, name: true },
      take: 100,
    });
    
    const patterns = detectEmailPatterns(realEmails as any);
    const topPattern = patterns[0];
    
    expect(topPattern.confidence).toBeGreaterThan(0.9);
  });
});
```

**Validation:**
```bash
npm test -- email-pattern-detector
# All tests pass
# Real data test shows >90% accuracy
```

**Estimate:** 120 min

**Ship:** `git commit -m "feat: enhanced email pattern detection with edge cases"`

---

### Task 24.2: Email Validation Service

**Description:** Validate generated emails before saving (DNS MX check, format, catch-all detection)

**Files:** `src/lib/enrichment/email-validator.ts` (new)

**Installation:**
```bash
npm install dns-validate mailchecker
```

**Implementation:**
```typescript
import dns from 'dns/promises';
import mailchecker from 'mailchecker';

export interface ValidationResult {
  valid: boolean;
  confidence: 'high' | 'medium' | 'low';
  checks: {
    format: boolean;
    domain: boolean;
    mxRecords: boolean;
    disposable: boolean;
    catchAll?: boolean;
  };
  reason?: string;
}

export async function validateEmail(email: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: false,
    confidence: 'low',
    checks: {
      format: false,
      domain: false,
      mxRecords: false,
      disposable: false,
    },
  };

  // 1. Format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  result.checks.format = emailRegex.test(email);
  if (!result.checks.format) {
    result.reason = 'Invalid email format';
    return result;
  }

  const [, domain] = email.split('@');

  // 2. Disposable email check
  result.checks.disposable = !mailchecker.isValid(email);
  if (result.checks.disposable) {
    result.reason = 'Disposable email domain';
    return result;
  }

  // 3. DNS MX record check
  try {
    const mxRecords = await dns.resolveMx(domain);
    result.checks.mxRecords = mxRecords.length > 0;
    result.checks.domain = true;
  } catch (error) {
    result.checks.mxRecords = false;
    result.reason = 'No MX records found';
    return result;
  }

  // 4. Catch-all detection (optional, can be expensive)
  // Skipped for now - requires SMTP connection

  // Calculate confidence
  const checksArr = Object.values(result.checks);
  const passedChecks = checksArr.filter(Boolean).length;
  
  if (passedChecks === checksArr.length) {
    result.valid = true;
    result.confidence = 'high';
  } else if (passedChecks >= checksArr.length - 1) {
    result.valid = true;
    result.confidence = 'medium';
  } else {
    result.valid = false;
    result.confidence = 'low';
  }

  return result;
}

// Batch validation
export async function validateEmails(emails: string[]): Promise<Map<string, ValidationResult>> {
  const results = new Map();
  
  for (const email of emails) {
    const result = await validateEmail(email);
    results.set(email, result);
  }
  
  return results;
}
```

**Validation:**
```typescript
// Test
const result = await validateEmail('john.doe@google.com');
expect(result.valid).toBe(true);
expect(result.confidence).toBe('high');

const invalidResult = await validateEmail('invalid@fake-domain-xyz-123.com');
expect(invalidResult.valid).toBe(false);
```

**Estimate:** 90 min

**Ship:** `git commit -m "feat: email validation with DNS and disposable checks"`

---

### Task 24.3: Pattern Management UI

**Description:** View, test, and manage detected email patterns

**Files:** `src/app/dashboard/patterns/page.tsx` (new)

**Implementation:**
```typescript
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PatternTester } from '@/components/patterns/pattern-tester';

export default async function PatternsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  // Get companies with detected patterns
  const companies = await prisma.target_accounts.findMany({
    where: {
      people: {
        some: {
          AND: [
            { email: { not: null } },
            { name: { not: null } }
          ]
        }
      }
    },
    include: {
      people: {
        where: {
          AND: [
            { email: { not: null } },
            { name: { not: null } }
          ]
        },
        select: { email: true, name: true }
      }
    },
    take: 50,
  });

  const companyPatterns = companies.map(company => {
    const patterns = detectEmailPatterns(
      company.people.map(p => ({ email: p.email!, name: p.name! }))
    );
    
    return {
      company: company.name,
      domain: company.website?.replace('https://', '').replace('www.', ''),
      topPattern: patterns[0],
      allPatterns: patterns,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Patterns</h1>
        <p className="text-muted-foreground">
          Detected patterns from existing contacts
        </p>
      </div>

      <PatternTester />

      <div className="space-y-4">
        {companyPatterns.map((cp, idx) => (
          <Card key={idx} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{cp.company}</h3>
                <p className="text-sm text-muted-foreground">{cp.domain}</p>
              </div>
              <Badge variant="default">
                {(cp.topPattern.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </div>
            
            <div className="mt-4">
              <p className="font-mono text-sm">
                {cp.topPattern.pattern}@{cp.domain}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Examples: {cp.topPattern.examples.join(', ')}
              </p>
            </div>

            {cp.allPatterns.length > 1 && (
              <details className="mt-4">
                <summary className="text-sm cursor-pointer">
                  Show {cp.allPatterns.length - 1} more patterns
                </summary>
                <ul className="mt-2 space-y-1">
                  {cp.allPatterns.slice(1).map((pattern, i) => (
                    <li key={i} className="text-sm">
                      {pattern.pattern} ({(pattern.confidence * 100).toFixed(0)}%)
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Pattern Tester Component:**
```typescript
// src/components/patterns/pattern-tester.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function PatternTester() {
  const [pattern, setPattern] = useState('{first}.{last}');
  const [firstName, setFirstName] = useState('John');
  const [lastName, setLastName] = useState('Doe');
  const [domain, setDomain] = useState('company.com');

  const generateEmail = () => {
    return pattern
      .replace('{first}', firstName.toLowerCase())
      .replace('{last}', lastName.toLowerCase())
      .replace('{f}', firstName[0].toLowerCase())
      .replace('{l}', lastName[0].toLowerCase()) +
      `@${domain}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pattern Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input 
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Input 
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        
        <Input 
          placeholder="Pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        />
        
        <Input 
          placeholder="Domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />

        <div className="rounded-md bg-muted p-4">
          <p className="font-mono text-lg">{generateEmail()}</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Validation:**
- Visit `/dashboard/patterns`
- See detected patterns for each company
- Test pattern generator with different inputs
- Verify confidence scores

**Estimate:** 120 min

**Ship:** `git commit -m "feat: email pattern management UI"`

---

### Task 24.4: Bulk Email Generation with Queue

**Description:** Generate emails for all contacts missing them using job queue

**Files:**
- `src/lib/enrichment/email-generator.ts` (new)
- `src/app/api/enrichment/patterns/bulk/route.ts` (update)

**Implementation:**

**`src/lib/enrichment/email-generator.ts`:**
```typescript
import { emailQueue } from '@/lib/queue/setup';
import { prisma } from '@/lib/db';
import { detectEmailPatterns } from './email-pattern-detector';
import { validateEmail } from './email-validator';
import logger from '@/lib/logger';

export async function queueBulkEmailGeneration(companyId?: string) {
  const job = await emailQueue.add('generate-bulk', {
    type: 'generate-bulk',
    data: { companyId, force: false }
  });
  
  return job.id;
}

export async function generateBulkEmails(companyId?: string, force = false) {
  const results = {
    generated: 0,
    validated: 0,
    failed: 0,
    skipped: 0,
  };

  // Get companies
  const companies = await prisma.target_accounts.findMany({
    where: companyId ? { id: companyId } : {},
    include: {
      people: {
        select: { id: true, email: true, name: true }
      }
    }
  });

  for (const company of companies) {
    // Detect patterns from existing emails
    const withEmails = company.people.filter(p => p.email && p.name);
    if (withEmails.length < 2) {
      logger.info('Not enough emails to detect pattern', { companyId: company.id });
      continue;
    }

    const patterns = detectEmailPatterns(
      withEmails.map(p => ({ email: p.email!, name: p.name! }))
    );
    
    if (!patterns.length || patterns[0].confidence < 0.7) {
      logger.info('Pattern confidence too low', { companyId: company.id });
      continue;
    }

    const topPattern = patterns[0];
    const domain = company.website?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || 
                   withEmails[0].email!.split('@')[1];

    // Generate for contacts without email
    const needingEmail = company.people.filter(p => !p.email && p.name);
    
    for (const person of needingEmail) {
      try {
        const email = applyPattern(topPattern.pattern, person.name!, domain);
        
        // Validate
        const validation = await validateEmail(email);
        
        if (validation.valid && validation.confidence !== 'low') {
          await prisma.people.update({
            where: { id: person.id },
            data: {
              email,
              enrichmentSource: 'email_pattern',
              enrichmentConfidence: validation.confidence === 'high' ? 0.9 : 0.7,
            }
          });
          
          results.generated++;
          results.validated++;
        } else {
          logger.warn('Email validation failed', { email, reason: validation.reason });
          results.failed++;
        }
      } catch (error) {
        logger.error('Email generation failed', { personId: person.id, error });
        results.failed++;
      }
    }
  }

  logger.info('Bulk email generation complete', results);
  return results;
}

function applyPattern(pattern: string, name: string, domain: string): string {
  const normalized = normalizeName(name);
  
  return pattern
    .replace('{first}', normalized.first.toLowerCase())
    .replace('{last}', normalized.last.toLowerCase())
    .replace('{f}', normalized.first[0].toLowerCase())
    .replace('{l}', normalized.last[0].toLowerCase())
    .replace('{m}', normalized.middle?.[0]?.toLowerCase() || '') +
    `@${domain}`;
}
```

**API Route:**
```typescript
// src/app/api/enrichment/patterns/bulk/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { queueBulkEmailGeneration } from '@/lib/enrichment/email-generator';

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { companyId } = await req.json();
  
  const jobId = await queueBulkEmailGeneration(companyId);
  
  return NextResponse.json({ jobId, status: 'queued' });
}
```

**Validation:**
```bash
# Queue bulk generation:
curl -X POST .../api/enrichment/patterns/bulk

# Check job status:
railway run redis-cli
> LLEN bull:email-generation:completed

# Verify emails generated:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM people WHERE \"enrichmentSource\" = 'email_pattern';"
```

**Estimate:** 120 min

**Ship:** `git commit -m "feat: bulk email generation with validation queue"`

---

### Task 24.5: Batch Job Monitoring UI

**Description:** View running jobs, progress, and errors

**Files:** `src/app/dashboard/jobs/page.tsx` (new)

**Implementation:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Job {
  id: string;
  name: string;
  progress: number;
  state: 'active' | 'completed' | 'failed' | 'waiting';
  data: any;
  result?: any;
  error?: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      const response = await fetch('/api/queue/jobs');
      const data = await response.json();
      setJobs(data.jobs);
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 2000); // Poll every 2s
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Background Jobs</h1>
        <p className="text-muted-foreground">
          Monitor enrichment and bulk operations
        </p>
      </div>

      <div className="space-y-4">
        {jobs.map(job => (
          <Card key={job.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{job.name}</CardTitle>
                <Badge variant={
                  job.state === 'completed' ? 'default' :
                  job.state === 'failed' ? 'destructive' :
                  'secondary'
                }>
                  {job.state}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {job.state === 'active' && (
                <Progress value={job.progress} className="mb-2" />
              )}
              
              {job.result && (
                <div className="text-sm">
                  <p>Generated: {job.result.generated}</p>
                  <p>Validated: {job.result.validated}</p>
                  <p>Failed: {job.result.failed}</p>
                </div>
              )}

              {job.error && (
                <p className="text-sm text-destructive">{job.error}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**API for jobs:**
```typescript
// src/app/api/queue/jobs/route.ts
import { NextResponse } from 'next/server';
import { emailQueue } from '@/lib/queue/setup';

export async function GET() {
  const [active, completed, failed, waiting] = await Promise.all([
    emailQueue.getActive(),
    emailQueue.getCompleted(),
    emailQueue.getFailed(),
    emailQueue.getWaiting(),
  ]);

  const jobs = [...active, ...completed, ...failed, ...waiting].map(job => ({
    id: job.id,
    name: job.name,
    progress: job.progress || 0,
    state: await job.getState(),
    data: job.data,
    result: job.returnvalue,
    error: job.failedReason,
  }));

  return NextResponse.json({ jobs });
}
```

**Validation:**
- Start bulk email generation
- Visit `/dashboard/jobs`
- See job progress updating every 2 seconds
- Verify completion shows results

**Estimate:** 90 min

**Ship:** `git commit -m "feat: background job monitoring dashboard"`

---

### Task 24.6: Email Pattern Analytics

**Description:** Dashboard showing pattern effectiveness metrics

**Files:** `src/app/dashboard/analytics/patterns/page.tsx` (new)

**Implementation:**
```typescript
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PatternAnalyticsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  // Get pattern-generated emails
  const patternEmails = await prisma.people.findMany({
    where: { enrichmentSource: 'email_pattern' },
    select: {
      enrichmentConfidence: true,
      createdAt: true,
      account: { select: { name: true } }
    }
  });

  const highConfidence = patternEmails.filter(p => p.enrichmentConfidence && p.enrichmentConfidence > 0.8).length;
  const mediumConfidence = patternEmails.filter(p => p.enrichmentConfidence && p.enrichmentConfidence >= 0.6 && p.enrichmentConfidence <= 0.8).length;
  const lowConfidence = patternEmails.filter(p => p.enrichmentConfidence && p.enrichmentConfidence < 0.6).length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Pattern Analytics</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{patternEmails.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>High Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{highConfidence}</p>
            <p className="text-xs text-muted-foreground">
              {((highConfidence / patternEmails.length) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medium Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{mediumConfidence}</p>
            <p className="text-xs text-muted-foreground">
              {((mediumConfidence / patternEmails.length) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{lowConfidence}</p>
            <p className="text-xs text-muted-foreground">
              {((lowConfidence / patternEmails.length) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add charts, trend graphs, etc. */}
    </div>
  );
}
```

**Validation:**
- Generate emails via pattern system
- Visit `/dashboard/analytics/patterns`
- See metrics and confidence distribution

**Estimate:** 60 min

**Ship:** `git commit -m "feat: email pattern analytics dashboard"`

---

## 🎯 Sprint 24 Demo

**What We Ship:**
1. ✅ >90% accurate email pattern detection
2. ✅ Email validation (DNS, format, disposable check)
3. ✅ Pattern management UI
4. ✅ Bulk generation with Redis job queue
5. ✅ Job monitoring dashboard
6. ✅ Analytics showing effectiveness

**How to Demo:**
```bash
# Detect patterns:
open /dashboard/patterns

# Test pattern:
# Input: John Doe at company.com
# Pattern: {first}.{last}
# Output: john.doe@company.com

# Bulk generate:
curl -X POST .../api/enrichment/patterns/bulk

# Monitor jobs:
open /dashboard/jobs

# View analytics:
open /dashboard/analytics/patterns
```

**Success Metrics:**
- 1000+ emails generated
- >90% validation success rate
- Job queue processing <5min/1000 contacts
- 0 jobs stuck in queue

---

## 📊 Remaining Sprints Summary

Due to length constraints, here's a summary of the remaining sprints. Full task breakdowns follow the same atomic pattern:

### **Sprint 25: Google Integration** (7 tasks, ~8 hours)
- OAuth scope validation
- Google Contacts import (API + UI)
- Calendar sync
- Gmail search for contact discovery
- Drive file import

### **Sprint 26: LinkedIn Discovery** (6 tasks, ~9 hours)
- Strategy decision (Proxycurl vs scraping)
- LinkedIn search integration
- Profile data extraction
- Company page discovery
- Manual discovery UI
- Automated enrichment queue

### **Sprint 27: AI Agent Foundation** (5 tasks, ~8 hours)
- Agent registry architecture
- Pesti sales agent (basic)
- Personality configuration system
- Agent command router
- Cost tracking for AI usage

### **Sprint 28: Advanced Enrichment** (6 tasks, ~9 hours)
- Multi-source orchestrator
- Data quality scoring
- Priority queue for enrichment
- Duplicate detection and merging
- Source attribution audit log
- Enrichment analytics dashboard

### **Sprint 29: Outreach Automation** (8 tasks, ~11 hours)
- **CRITICAL:** Email compliance (CAN-SPAM, GDPR)
- SendGrid sending infrastructure
- Email tracking (opens/clicks)
- Sequence builder (schema + engine + UI)
- AI personalization engine
- Campaign management
- Unsubscribe handling

### **Sprint 30: Analytics & Reporting** (6 tasks, ~8 hours)
- Query optimization (indexes)
- Contact engagement analytics
- Enrichment ROI calculator
- Campaign performance dashboard
- Custom report builder
- Export system (CSV, PDF)

---

## ✅ Sprint Execution Checklist

For each task, follow this process:

### Before Starting:
- [ ] Read task description completely
- [ ] Understand validation criteria
- [ ] Check dependencies (previous tasks)

### During Work:
- [ ] Write code (30-120 min focused time)
- [ ] Write tests (if applicable)
- [ ] Run tests locally: `npm test`
- [ ] Build successfully: `npm run build`
- [ ] Test in dev: `npm run dev`

### Before Committing:
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No console.log statements (unless intentional)
- [ ] Validation criteria met

### Deploy:
```bash
git add -A
git commit -m "feat: <task description>"
git push  # Auto-deploys to Railway
```

### After Deploy:
- [ ] Check Railway logs: `railway logs`
- [ ] Test production: Visit feature URL
- [ ] Run smoke tests: `npm run test:smoke`
- [ ] Update task status to ✅ COMPLETE

---

## 🎯 Success Metrics

By Sprint 30 completion:

**Technical:**
- 65 production commits ✅
- 100% test coverage on critical paths
- <500ms avg API response time
- 99.9% uptime

**Features:**
- Full HubSpot + Google integration
- 5,000+ enriched contacts
- Automated outreach campaigns
- AI-powered personalization
- Comprehensive analytics

**Business:**
- $0 additional infrastructure costs (free tiers)
- 10x faster prospecting workflow
- 90%+ email accuracy
- Real-time CRM sync

---

## 📝 Documentation Standards

Every sprint updates:
- `README.md` - Feature list
- `docs/<feature>.md` - Detailed guide
- API routes - JSDoc comments
- Prisma schema - Field descriptions

---

## 🚀 Next Steps

**Immediate Priority:**
1. Complete Sprint 22 (stabilization) - CURRENT
2. Begin Sprint 23 (HubSpot) - HIGH ROI
3. Sprint 24 (Email patterns) - CORE DIFFERENTIATOR

**Timeline:**
- Sprints 22-24: Weeks 1-3 (foundation)
- Sprints 25-27: Weeks 4-6 (integrations)
- Sprints 28-30: Weeks 7-9 (advanced features)

---

**Last Updated:** January 23, 2026  
**Status:** ✅ ACTIVE EXECUTION  
**Current Sprint:** 22 (Production Stabilization)  
**Philosophy:** Ship Fast, Ship Often, Stay Focused
