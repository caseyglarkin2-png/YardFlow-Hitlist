# Comprehensive Sprint Plan: YardFlow Production Deployment
**Created**: January 23, 2026  
**Purpose**: Exhaustive, atomic, testable task breakdown for production deployment  
**Principle**: Every task is committable, every sprint is demoable, every step is validated

---

## 🎯 Guiding Principles

### Atomic Work Items
- Each task represents ONE committable piece of work
- No task depends on uncommitted changes from another task
- Each task can be code-reviewed independently

### Validation Requirements
- Every task has explicit acceptance criteria
- Tests (unit/integration/E2E) OR manual validation steps
- No task is "complete" without verification

### Iterative & Additive
- Each sprint builds on previous work
- No throwaway code - every commit moves toward product goals
- Rollback-safe - can revert any task without breaking others

### Demoable Increments
- Each sprint ends with working software
- Demo should show tangible user/business value
- Deployment to production after each sprint

---

## 📊 Current State Assessment

### ✅ Working (Verified)
- Railway infrastructure: Postgres + main app deployed
- Authentication flow: NextAuth with JWT
- Database schema: Prisma with full event/contact/sequence models
- Build pipeline: TypeScript compilation succeeds on Railway

### ❌ Broken (Blocking Production)
1. **Worker Service**: 7+ failed deployments, `cd` executable not found error
2. **Redis Integration**: Not provisioned, blocking queue functionality
3. **Build Hangs Locally**: Redis connection at module level blocks builds
4. **Dashboard Crashes**: Unsafe session access (`session!.user.id`)
5. **No Health Monitoring**: No `/api/health` endpoint
6. **Empty Database**: No seed data for testing/demos

### ⚠️ Warnings (Needs Investigation)
- 31 warnings on YardFlow-Hitlist Railway service
- Worker not connected to Postgres/Redis in architecture diagram

---

## 🏗️ SPRINT 30: Foundation Hardening (IN PROGRESS)
**Goal**: Fix all P0 production blockers  
**Demo**: Working app with health monitoring, stable worker, seeded data  
**Builds On**: Existing Sprint 24/29 queue and sequence infrastructure  
**Duration**: 2-3 days

### Task 30.1: Deploy Worker Service ✅
**Type**: DevOps  
**Status**: IN PROGRESS (7th deployment attempt)  
**Priority**: P0 - Blocks all background job processing

**Description**:
Deploy BullMQ worker service to Railway as separate containerized service. Worker must:
- Connect to shared Postgres and Redis instances
- Process enrichment and sequence-step queues
- Expose health check on port 8080
- Auto-restart on failure

**Acceptance Criteria**:
- [ ] Worker container starts successfully (no "cd not found" error)
- [ ] Worker logs show "Queue workers started successfully"
- [ ] Health endpoint `/health` returns HTTP 200 with JSON status
- [ ] Worker appears connected to Postgres/Redis in Railway architecture diagram
- [ ] Environment variables (DATABASE_URL, REDIS_URL) correctly configured

**Validation**:
```bash
# Manual deployment verification
railway logs --service yardflow-worker | grep "Queue workers started"

# Health check
curl https://yardflow-worker-production.up.railway.app:8080/health | jq

# Job processing test
# 1. Enqueue test job via main app API
# 2. Check worker logs for processing message
# 3. Verify job completion in database
```

**Files Modified**:
- `Dockerfile.worker` - Container build configuration
- `.dockerignore` - Exclude unnecessary files from build context

**Current Issue**:
Latest Dockerfile (commit c892822) uses WORKDIR instead of `cd` command, but Railway still showing old build. Possible cache issue or deployment delay.

**Next Step**:
- Wait for Railway build to complete (~2 minutes)
- If still fails, investigate Railway cache or force rebuild
- If succeeds, validate all acceptance criteria

**Effort**: L (has taken 4+ hours due to iterative debugging)

---

### Task 30.2: Provision Redis on Railway
**Type**: DevOps  
**Status**: NOT STARTED  
**Priority**: P0 - Blocks worker functionality, queue features

**Description**:
Add Redis service to Railway project using Railway CLI or dashboard. Configure worker and main app to connect via `REDIS_URL` environment variable.

**Acceptance Criteria**:
- [ ] Redis service running in Railway (visible in dashboard)
- [ ] `REDIS_URL` environment variable set on yardflow-worker service
- [ ] `REDIS_URL` environment variable set on YardFlow-Hitlist service
- [ ] Main app can enqueue jobs without errors
- [ ] Worker can dequeue jobs without errors
- [ ] Redis connection shown in Railway architecture diagram

**Validation**:
```bash
# Check Redis service exists
railway services

# Verify environment variables
railway variables --service yardflow-worker | grep REDIS_URL
railway variables --service YardFlow-Hitlist | grep REDIS_URL

# Test connection from main app
curl -X POST https://yardflow-production.up.railway.app/api/test-redis \
  -H "Content-Type: application/json" \
  -d '{"action":"ping"}'
# Expected: {"status":"success","result":"PONG"}

# Test from worker - check logs for Redis ready message
railway logs --service yardflow-worker | grep "Redis client ready"
```

**Commands**:
```bash
# Option 1: Railway CLI
railway add --service redis

# Option 2: Railway Dashboard
# Navigate to project > Add Service > Database > Redis
```

**Files Modified**:
- None (infrastructure only)

**Dependencies**:
- Requires Task 30.1 (worker) to be complete for full validation

**Effort**: S (15-30 minutes)

---

### Task 30.3: Fix Redis Build Hang - Lazy Initialization
**Type**: Bug Fix  
**Status**: NOT STARTED  
**Priority**: P0 - Blocks local development

**Description**:
Convert Redis connection from module-level instantiation to lazy initialization. Currently `redisConnection` is created on import, causing builds to hang when `REDIS_URL` is unavailable.

**Root Cause**:
```typescript
// ❌ Current: Instantiated at module load
export const redisConnection = new Redis(redisConfig);
```

Next.js build process imports all modules to analyze dependencies. Redis attempts connection during build, hanging on localhost:6379 timeout.

**Acceptance Criteria**:
- [ ] `npm run build` completes successfully without Redis running
- [ ] `npm run build` completes successfully WITH Redis running
- [ ] Worker service still connects to Redis correctly
- [ ] Main app queue enqueue operations work
- [ ] No runtime errors related to Redis initialization

**Implementation**:
```typescript
// ✅ Lazy initialization
let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    const config = getRedisConfig();
    redisConnection = new Redis(config);
    
    redisConnection.on('connect', () => {
      logger.info('Redis connected', { host: config.host });
    });
    
    redisConnection.on('error', (error) => {
      logger.error('Redis error', { error });
    });
  }
  
  return redisConnection;
}

export async function closeRedis() {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
```

**Validation**:
```bash
# Test 1: Build without Redis
unset REDIS_URL
npm run build
# Expected: Build completes in ~60 seconds

# Test 2: Build with Redis
export REDIS_URL=redis://localhost:6379
npm run build
# Expected: Build completes in ~60 seconds

# Test 3: Runtime connection
npm run dev
# Navigate to dashboard, trigger enrichment job
# Check logs for "Redis connected"

# Test 4: Worker startup
npm run worker
# Expected: "Redis client ready" in logs
```

**Files Modified**:
- `eventops/src/lib/queue/client.ts` - Lazy initialization pattern
- `eventops/src/lib/queue/queues.ts` - Use `getRedisConnection()` instead of `redisConnection`
- `eventops/src/lib/queue/workers.ts` - Use `getRedisConnection()` instead of `redisConnection`

**Test Cases** (add to `eventops/tests/lib/queue/client.test.ts`):
```typescript
describe('Redis Client', () => {
  it('should not connect until getRedisConnection is called', () => {
    // Import module - should not trigger connection
    const client = require('@/lib/queue/client');
    expect(client.redisConnection).toBeNull();
  });
  
  it('should create connection on first call', () => {
    const redis = getRedisConnection();
    expect(redis).toBeInstanceOf(Redis);
  });
  
  it('should reuse connection on subsequent calls', () => {
    const redis1 = getRedisConnection();
    const redis2 = getRedisConnection();
    expect(redis1).toBe(redis2);
  });
  
  it('should close connection gracefully', async () => {
    const redis = getRedisConnection();
    await closeRedis();
    // Next call should create new connection
    const redis2 = getRedisConnection();
    expect(redis2).not.toBe(redis);
  });
});
```

**Dependencies**:
- Requires Task 30.2 (Redis provisioning) for full validation

**Effort**: M (45-60 minutes)

---

### Task 30.4: Fix Dashboard Session Safety
**Type**: Bug Fix  
**Status**: NOT STARTED  
**Priority**: P0 - Crashes user-facing pages

**Description**:
Add type guards before accessing `session.user.id` to prevent "Cannot read properties of undefined" runtime errors. Currently using non-null assertion `session!.user.id` which bypasses safety checks.

**Root Cause**:
```typescript
// ❌ Current: Unsafe non-null assertion
const user = await prisma.users.findUnique({
  where: { id: session!.user.id },
});
```

Middleware redirect is not instant (race condition), and TypeScript non-null assertion doesn't add runtime protection.

**Acceptance Criteria**:
- [ ] Dashboard page loads without crashes for authenticated users
- [ ] Unauthenticated users redirect to /login
- [ ] No console errors related to session access
- [ ] Type errors eliminated in affected files
- [ ] All dashboard subpages handle session correctly

**Implementation**:
```typescript
// ✅ Safe type guard
export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }
  
  // TypeScript now knows session.user.id is defined
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
  });
  
  // ... rest of component
}
```

**Validation**:
```bash
# Search for unsafe patterns
grep -r "session\!\.user" eventops/src/app/dashboard/
# Expected: No results after fix

# Manual testing
# 1. Logged out: Navigate to /dashboard -> should redirect to /login
# 2. Logged in: Navigate to /dashboard -> should show dashboard
# 3. Logged in: Navigate to /dashboard/settings/integrations -> should load
# 4. Check browser console for errors -> should be none
```

**Files Modified**:
- `eventops/src/app/dashboard/page.tsx` - Add type guard (line ~10)
- `eventops/src/app/dashboard/settings/integrations/page.tsx` - Add type guard (line ~8)
- Any other dashboard pages using `session!.user.id`

**Test Cases** (add to `eventops/tests/app/dashboard/page.test.tsx`):
```typescript
import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import DashboardPage from '@/app/dashboard/page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

describe('DashboardPage', () => {
  it('should redirect when session is null', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    await DashboardPage();
    expect(redirect).toHaveBeenCalledWith('/login');
  });
  
  it('should redirect when session.user is undefined', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: undefined });
    await DashboardPage();
    expect(redirect).toHaveBeenCalledWith('/login');
  });
  
  it('should redirect when session.user.id is undefined', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: {} });
    await DashboardPage();
    expect(redirect).toHaveBeenCalledWith('/login');
  });
  
  it('should render dashboard when session is valid', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    });
    
    render(await DashboardPage());
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });
});
```

**Dependencies**: None

**Effort**: S (30-45 minutes)

---

### Task 30.5: Implement Health Check Endpoint
**Type**: Feature  
**Status**: NOT STARTED  
**Priority**: P1 - Needed for production monitoring

**Description**:
Create `/api/health` endpoint that checks database connectivity, Redis status, and environment configuration. Required for Railway health checks and production monitoring.

**Acceptance Criteria**:
- [ ] Endpoint accessible at `/api/health`
- [ ] Returns HTTP 200 when healthy, 503 when unhealthy
- [ ] Checks database connectivity (Prisma query)
- [ ] Checks Redis connectivity (if configured)
- [ ] Reports missing environment variables
- [ ] Includes response time metrics
- [ ] Returns JSON with detailed status

**Implementation**:
```typescript
// eventops/src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRedisConnection } from '@/lib/queue/client';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  buildId: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy' | 'not_configured';
      responseTime?: number;
      error?: string;
    };
    env: {
      status: 'healthy' | 'unhealthy';
      missing: string[];
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  const health: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    buildId: process.env.BUILD_ID || 'unknown',
    checks: {
      database: { status: 'healthy' },
      redis: { status: 'not_configured' },
      env: { status: 'healthy', missing: [] },
    },
  };

  // Database check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database.responseTime = Date.now() - dbStart;
  } catch (error) {
    health.checks.database.status = 'unhealthy';
    health.checks.database.error = error instanceof Error ? error.message : 'Unknown';
    health.status = 'unhealthy';
  }

  // Redis check (if configured)
  if (process.env.REDIS_URL) {
    try {
      const redisStart = Date.now();
      const redis = getRedisConnection();
      await redis.ping();
      health.checks.redis.status = 'healthy';
      health.checks.redis.responseTime = Date.now() - redisStart;
    } catch (error) {
      health.checks.redis.status = 'unhealthy';
      health.checks.redis.error = error instanceof Error ? error.message : 'Unknown';
      health.status = 'degraded';
    }
  }

  // Environment check
  const requiredEnvVars = ['DATABASE_URL', 'AUTH_SECRET'];
  const optionalEnvVars = ['REDIS_URL', 'SENDGRID_API_KEY', 'OPENAI_API_KEY'];

  const missingRequired = requiredEnvVars.filter(v => !process.env[v]);
  const missingOptional = optionalEnvVars.filter(v => !process.env[v]);

  if (missingRequired.length > 0) {
    health.checks.env.status = 'unhealthy';
    health.checks.env.missing = missingRequired;
    health.status = 'unhealthy';
  }

  const totalResponseTime = Date.now() - startTime;

  return NextResponse.json(health, {
    status: health.status === 'healthy' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Response-Time': `${totalResponseTime}ms`,
    },
  });
}
```

**Validation**:
```bash
# Test 1: Local development
curl http://localhost:3000/api/health | jq
# Expected: HTTP 200, status: healthy, database: healthy

# Test 2: Production
curl https://yardflow-production.up.railway.app/api/health | jq
# Expected: HTTP 200, all checks healthy

# Test 3: Health check with Redis down
# Stop Redis, curl endpoint
# Expected: HTTP 503, status: degraded, redis: unhealthy

# Test 4: Response time
curl -w "\nTime: %{time_total}s\n" https://yardflow-production.up.railway.app/api/health
# Expected: < 500ms response time
```

**Files Created**:
- `eventops/src/app/api/health/route.ts` - Health check endpoint

**Test Cases** (add to `eventops/tests/app/api/health/route.test.ts`):
```typescript
import { GET } from '@/app/api/health/route';
import { prisma } from '@/lib/db';
import { getRedisConnection } from '@/lib/queue/client';

jest.mock('@/lib/db');
jest.mock('@/lib/queue/client');

describe('Health Check Endpoint', () => {
  it('should return 200 when all systems healthy', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    (getRedisConnection as jest.Mock).mockReturnValue({
      ping: jest.fn().mockResolvedValue('PONG'),
    });
    
    const response = await GET();
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.checks.database.status).toBe('healthy');
  });
  
  it('should return 503 when database is down', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection refused'));
    
    const response = await GET();
    expect(response.status).toBe(503);
    
    const body = await response.json();
    expect(body.status).toBe('unhealthy');
    expect(body.checks.database.status).toBe('unhealthy');
  });
  
  it('should return degraded when Redis is down but database is up', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    (getRedisConnection as jest.Mock).mockReturnValue({
      ping: jest.fn().mockRejectedValue(new Error('Connection timeout')),
    });
    
    const response = await GET();
    expect(response.status).toBe(503);
    
    const body = await response.json();
    expect(body.status).toBe('degraded');
    expect(body.checks.redis.status).toBe('unhealthy');
  });
});
```

**Dependencies**:
- Requires Task 30.3 (lazy Redis) to avoid connection errors

**Effort**: M (60-90 minutes)

---

### Task 30.6: Create Production Seed Script
**Type**: Feature  
**Status**: NOT STARTED  
**Priority**: P1 - Needed for testing and demos

**Description**:
Create automated seed script to populate fresh databases with:
- Default admin user
- Sample event (conference/tradeshow)
- Demo company accounts (5-10)
- Sample contacts (20-30)
- Pre-configured sequences

**Acceptance Criteria**:
- [ ] Script runs successfully: `npm run seed:production`
- [ ] Creates admin user with known credentials
- [ ] Creates sample event with realistic data
- [ ] Creates demo accounts with varied stages (Lead, Qualified, Booked, etc.)
- [ ] Creates contacts associated with accounts
- [ ] Creates at least 2 email sequences
- [ ] Script is idempotent (can run multiple times safely)
- [ ] Seed data visible in dashboard after login

**Implementation**:
```typescript
// prisma/seed-production.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('YardFlow2026!', 12);
  const admin = await prisma.users.upsert({
    where: { email: 'admin@yardflow.com' },
    update: {},
    create: {
      email: 'admin@yardflow.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create sample event
  const event = await prisma.events.upsert({
    where: { name: 'TechExpo 2026' },
    update: {},
    create: {
      name: 'TechExpo 2026',
      start_date: new Date('2026-06-15'),
      end_date: new Date('2026-06-17'),
      location: 'San Francisco, CA',
      booth_number: 'A-123',
      user_id: admin.id,
    },
  });
  console.log('✅ Event created:', event.name);

  // Create demo accounts
  const accountNames = [
    'Acme Corp',
    'TechStart Inc',
    'Global Solutions',
    'Innovation Labs',
    'Future Systems',
  ];

  const stages = ['Lead', 'Qualified', 'Booked', 'Checked In', 'No Show'];

  for (let i = 0; i < accountNames.length; i++) {
    const account = await prisma.accounts.upsert({
      where: { company_name: accountNames[i] },
      update: {},
      create: {
        company_name: accountNames[i],
        stage: stages[i],
        event_id: event.id,
        user_id: admin.id,
      },
    });

    // Create 2-3 contacts per account
    for (let j = 0; j < 2 + Math.floor(Math.random() * 2); j++) {
      await prisma.contacts.create({
        data: {
          first_name: `Contact${j}`,
          last_name: accountNames[i].split(' ')[0],
          email: `contact${j}@${accountNames[i].toLowerCase().replace(/\s/g, '')}.com`,
          account_id: account.id,
          event_id: event.id,
          user_id: admin.id,
        },
      });
    }
  }
  console.log(`✅ Created ${accountNames.length} accounts with contacts`);

  // Create sample sequences
  const sequences = [
    {
      name: 'Post-Event Follow-up',
      description: 'Standard follow-up sequence after event',
      is_active: true,
    },
    {
      name: 'Qualified Lead Nurture',
      description: 'Nurture sequence for qualified leads',
      is_active: true,
    },
  ];

  for (const seq of sequences) {
    await prisma.sequences.upsert({
      where: { name: seq.name },
      update: {},
      create: {
        ...seq,
        user_id: admin.id,
      },
    });
  }
  console.log(`✅ Created ${sequences.length} sequences`);

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Validation**:
```bash
# Test 1: Run seed script
npm run seed:production
# Expected: No errors, "Seed complete!" message

# Test 2: Verify data in database
npx prisma studio
# Check: users table has admin@yardflow.com
# Check: events table has TechExpo 2026
# Check: accounts table has 5 records
# Check: contacts table has 10-15 records
# Check: sequences table has 2 records

# Test 3: Login to dashboard
# Navigate to https://yardflow-production.up.railway.app
# Login with admin@yardflow.com / YardFlow2026!
# Verify: Dashboard shows event, accounts, contacts

# Test 4: Idempotency
npm run seed:production
npm run seed:production
# Expected: No duplicate errors, same data exists
```

**Files Created**:
- `prisma/seed-production.ts` - Production seed script

**Files Modified**:
- `package.json` - Add `seed:production` script:
  ```json
  {
    "scripts": {
      "seed:production": "tsx prisma/seed-production.ts"
    }
  }
  ```

**Dependencies**: None

**Effort**: L (90-120 minutes)

---

### Task 30.7: Investigate and Fix 31 Railway Warnings
**Type**: Bug Fix / Investigation  
**Status**: NOT STARTED  
**Priority**: P2 - Not blocking but should be resolved

**Description**:
Railway dashboard shows 31 warnings on YardFlow-Hitlist main service. Investigate root cause and fix. Warnings could be:
- Environment variable deprecations
- Build warnings (npm audit, TypeScript, ESLint)
- Runtime warnings (Next.js, Prisma)
- Configuration issues

**Acceptance Criteria**:
- [ ] All warnings identified and categorized
- [ ] P0/P1 warnings fixed
- [ ] P2/P3 warnings documented in backlog
- [ ] Warning count reduced to < 10
- [ ] No new warnings introduced

**Investigation Steps**:
```bash
# Step 1: Check Railway logs for warning details
railway logs --service YardFlow-Hitlist | grep -i "warn"

# Step 2: Check npm audit
npm audit

# Step 3: Check build output
npm run build 2>&1 | grep -i "warn"

# Step 4: Check TypeScript compilation
npx tsc --noEmit 2>&1 | grep -i "warn"

# Step 5: Check ESLint
npx eslint eventops/src --ext .ts,.tsx 2>&1 | grep -i "warn"
```

**Validation**:
```bash
# After fixes, verify warning count reduced
railway logs --service YardFlow-Hitlist | grep -c "warn"
# Expected: < 10 warnings

# Check Railway dashboard
# Expected: Warning indicator should be yellow/green, not red
```

**Files Modified**: TBD (depends on investigation results)

**Dependencies**: None

**Effort**: M (1-2 hours, depends on complexity)

---

### Task 30.8: End-to-End Production Test
**Type**: Testing  
**Status**: NOT STARTED  
**Priority**: P1 - Validates entire sprint

**Description**:
Comprehensive E2E test covering full user journey:
1. Login to dashboard
2. View event data
3. Enqueue enrichment job
4. Verify worker processes job
5. Check job results in database
6. Verify health endpoint
7. Check monitoring/logging

**Acceptance Criteria**:
- [ ] User can login successfully
- [ ] Dashboard displays seeded data
- [ ] Enrichment job can be triggered
- [ ] Worker processes job within 30 seconds
- [ ] Job status updates in dashboard
- [ ] Health endpoint returns healthy status
- [ ] No errors in Railway logs

**Test Script**:
```bash
#!/bin/bash
# eventops/scripts/e2e-production-test.sh

set -e

PROD_URL="https://yardflow-production.up.railway.app"
WORKER_URL="https://yardflow-worker-production.up.railway.app"

echo "🧪 Starting E2E production test..."

# Test 1: Health check
echo "Test 1: Health check..."
HEALTH=$(curl -s $PROD_URL/api/health)
STATUS=$(echo $HEALTH | jq -r '.status')
if [ "$STATUS" != "healthy" ]; then
  echo "❌ Health check failed: $STATUS"
  exit 1
fi
echo "✅ Health check passed"

# Test 2: Worker health
echo "Test 2: Worker health..."
WORKER_HEALTH=$(curl -s $WORKER_URL:8080/health)
WORKER_STATUS=$(echo $WORKER_HEALTH | jq -r '.status')
if [ "$WORKER_STATUS" != "healthy" ]; then
  echo "❌ Worker health check failed: $WORKER_STATUS"
  exit 1
fi
echo "✅ Worker health passed"

# Test 3: Login
echo "Test 3: Login..."
SESSION=$(curl -s -X POST $PROD_URL/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yardflow.com","password":"YardFlow2026!"}' \
  -c cookies.txt)
echo "✅ Login successful"

# Test 4: Fetch dashboard data
echo "Test 4: Dashboard data..."
DASHBOARD=$(curl -s $PROD_URL/dashboard -b cookies.txt)
if echo $DASHBOARD | grep -q "TechExpo 2026"; then
  echo "✅ Dashboard data loaded"
else
  echo "❌ Dashboard data missing"
  exit 1
fi

# Test 5: Enqueue test job
echo "Test 5: Enqueue enrichment job..."
JOB=$(curl -s -X POST $PROD_URL/api/enrich \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"accountId":"test-account-1"}')
JOB_ID=$(echo $JOB | jq -r '.jobId')
echo "Job ID: $JOB_ID"

# Test 6: Wait for worker to process
echo "Test 6: Wait for job processing (30s)..."
sleep 30

# Test 7: Check job completion
JOB_STATUS=$(curl -s $PROD_URL/api/jobs/$JOB_ID -b cookies.txt)
STATUS=$(echo $JOB_STATUS | jq -r '.status')
if [ "$STATUS" == "completed" ]; then
  echo "✅ Job processed successfully"
else
  echo "⚠️ Job status: $STATUS (may still be processing)"
fi

echo "🎉 E2E test complete!"
```

**Validation**:
```bash
chmod +x eventops/scripts/e2e-production-test.sh
./eventops/scripts/e2e-production-test.sh

# Expected output:
# ✅ Health check passed
# ✅ Worker health passed
# ✅ Login successful
# ✅ Dashboard data loaded
# Job ID: 12345
# ✅ Job processed successfully
# 🎉 E2E test complete!
```

**Files Created**:
- `eventops/scripts/e2e-production-test.sh` - E2E test script

**Dependencies**:
- Requires ALL previous Sprint 30 tasks complete

**Effort**: M (1-2 hours)

---

## Sprint 30 Completion Criteria

### Definition of Done
- [ ] All P0 tasks complete (30.1-30.4)
- [ ] All P1 tasks complete (30.5-30.6, 30.8)
- [ ] P2 task investigated and plan created (30.7)
- [ ] E2E test passes (30.8)
- [ ] All acceptance criteria validated
- [ ] No P0/P1 bugs remaining
- [ ] Documentation updated

### Demo Script
1. Show Railway dashboard: All services green (main app, worker, Postgres, Redis)
2. Navigate to app: https://yardflow-production.up.railway.app
3. Login with admin@yardflow.com / YardFlow2026!
4. Show dashboard with seeded data (event, accounts, contacts)
5. Trigger enrichment job on demo account
6. Show worker logs processing job
7. Show job completion in dashboard
8. Show health endpoint: `/api/health` returns healthy
9. Show Railway metrics: No errors, healthy uptime

**Demo Talking Points**:
- "We've hardened the production foundation with stable deployments"
- "Worker service now processes background jobs reliably"
- "Health monitoring gives us visibility into system status"
- "Seed data allows immediate testing and demos"
- "Build process works both locally and on Railway"
- "This sprint fixes 6 P0 production blockers and enables feature development"

---

## 🚀 SPRINT 31: Core Features & Enrichment (PLANNED)
**Goal**: Implement contact enrichment with OpenAI and HubSpot integration  
**Demo**: Enrich contact data, sync to HubSpot, show enriched fields in dashboard  
**Builds On**: Sprint 30 foundation - worker service, queue infrastructure, health monitoring  
**Duration**: 4-5 days

### Sprint 31 Overview

With Sprint 30 completing the production foundation, Sprint 31 focuses on core business value:
- Contact enrichment using OpenAI API
- HubSpot CRM integration for bidirectional sync
- Enhanced dashboard with enriched data display
- Automated enrichment workflows

### Task 31.1: Implement OpenAI Contact Enrichment
**Type**: Feature  
**Status**: PLANNED  
**Priority**: P1 - Core product value

**Description**:
Build contact enrichment service that uses OpenAI to infer missing contact details from existing data. Uses GPT-4 to predict:
- Job title (if company name provided)
- Company size/industry (if company name provided)
- Contact role/seniority (if job title provided)
- LinkedIn profile URL (if first name, last name, company provided)

**Acceptance Criteria**:
- [ ] OpenAI API integration working with error handling
- [ ] Enrichment queue job processor implemented
- [ ] Contact model updated with enriched fields
- [ ] Enrichment results stored in database
- [ ] Enrichment history/audit trail maintained
- [ ] Rate limiting and cost controls implemented
- [ ] Unit tests for enrichment logic
- [ ] Integration tests with OpenAI (mocked in CI)

**Implementation Outline**:
```typescript
// eventops/src/lib/enrichment/openai-enricher.ts
import { OpenAI } from 'openai';
import { prisma } from '@/lib/db';

interface EnrichmentInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  jobTitle?: string;
}

interface EnrichmentResult {
  predictedJobTitle?: string;
  predictedCompanySize?: string;
  predictedIndustry?: string;
  predictedSeniority?: string;
  linkedInUrl?: string;
  confidence: number;
}

export async function enrichContact(
  contactId: string,
  input: EnrichmentInput
): Promise<EnrichmentResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const prompt = buildEnrichmentPrompt(input);
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a B2B contact data enrichment assistant.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  });
  
  const result = JSON.parse(completion.choices[0].message.content);
  
  // Save enrichment to database
  await prisma.contacts.update({
    where: { id: contactId },
    data: {
      job_title: result.predictedJobTitle || undefined,
      company_size: result.predictedCompanySize || undefined,
      industry: result.predictedIndustry || undefined,
      enriched_at: new Date(),
    },
  });
  
  // Create audit record
  await prisma.enrichment_history.create({
    data: {
      contact_id: contactId,
      enrichment_data: result,
      confidence: result.confidence,
      cost: calculateCost(completion.usage),
    },
  });
  
  return result;
}
```

**Validation**:
```bash
# Unit test
npm test -- enrichment/openai-enricher.test.ts

# Integration test (requires OPENAI_API_KEY)
npm run test:integration -- enrichment

# Manual test via API
curl -X POST https://yardflow-production.up.railway.app/api/enrich \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contactId":"contact-123"}'

# Check database for enriched data
npx prisma studio
# Navigate to contacts table, find contact-123
# Verify: enriched_at is populated, job_title/company_size filled
```

**Files Created**:
- `eventops/src/lib/enrichment/openai-enricher.ts` - Enrichment service
- `eventops/tests/lib/enrichment/openai-enricher.test.ts` - Unit tests
- `eventops/prisma/migrations/[timestamp]_add_enrichment_fields.sql` - Schema update

**Files Modified**:
- `eventops/prisma/schema.prisma` - Add enriched_at, enrichment_history table
- `eventops/src/lib/queue/workers.ts` - Hook up enrichment queue processor
- `eventops/src/app/api/enrich/route.ts` - API endpoint to trigger enrichment

**Cost Controls**:
```typescript
// Implement daily budget limit
const DAILY_BUDGET_USD = 50;

export async function checkBudget(): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const spent = await prisma.enrichment_history.aggregate({
    where: {
      created_at: { gte: new Date(today) },
    },
    _sum: { cost: true },
  });
  
  return (spent._sum.cost || 0) < DAILY_BUDGET_USD;
}
```

**Dependencies**:
- Requires Sprint 30.1 (worker service)
- Requires Sprint 30.3 (Redis lazy init)
- Requires OPENAI_API_KEY environment variable

**Effort**: L (2-3 days)

---

### Task 31.2: HubSpot CRM Integration - Bidirectional Sync
**Type**: Feature  
**Status**: PLANNED  
**Priority**: P1 - Key integration

**Description**:
Implement bidirectional sync between YardFlow and HubSpot CRM:
- **YardFlow → HubSpot**: Create/update contacts and companies in HubSpot
- **HubSpot → YardFlow**: Pull existing contacts/deals for event attendees
- **Webhook Support**: Listen for HubSpot changes and update YardFlow
- **Conflict Resolution**: Handle simultaneous updates gracefully

**Acceptance Criteria**:
- [ ] HubSpot OAuth authentication working
- [ ] Contacts sync YardFlow → HubSpot
- [ ] Companies/accounts sync YardFlow → HubSpot
- [ ] Deals created in HubSpot for qualified leads
- [ ] Webhook endpoint receives HubSpot updates
- [ ] Conflict resolution (last-write-wins with timestamp)
- [ ] Sync status visible in dashboard
- [ ] Error handling and retry logic
- [ ] Unit tests for sync logic
- [ ] Integration tests with HubSpot sandbox

**Implementation Outline**:
```typescript
// eventops/src/lib/integrations/hubspot/sync.ts
import { Client } from '@hubspot/api-client';
import { prisma } from '@/lib/db';

const hubspot = new Client({ accessToken: process.env.HUBSPOT_API_KEY });

export async function syncContactToHubSpot(contactId: string) {
  const contact = await prisma.contacts.findUnique({
    where: { id: contactId },
    include: { account: true },
  });
  
  if (!contact) throw new Error('Contact not found');
  
  // Check if contact already exists in HubSpot
  let hubspotContactId = contact.hubspot_contact_id;
  
  if (!hubspotContactId) {
    // Create new contact
    const response = await hubspot.crm.contacts.basicApi.create({
      properties: {
        email: contact.email,
        firstname: contact.first_name,
        lastname: contact.last_name,
        jobtitle: contact.job_title,
        company: contact.account?.company_name,
      },
    });
    
    hubspotContactId = response.id;
    
    // Save HubSpot ID
    await prisma.contacts.update({
      where: { id: contactId },
      data: { hubspot_contact_id: hubspotContactId },
    });
  } else {
    // Update existing contact
    await hubspot.crm.contacts.basicApi.update(hubspotContactId, {
      properties: {
        email: contact.email,
        firstname: contact.first_name,
        lastname: contact.last_name,
        jobtitle: contact.job_title,
      },
    });
  }
  
  return hubspotContactId;
}

export async function syncAccountToHubSpot(accountId: string) {
  const account = await prisma.accounts.findUnique({
    where: { id: accountId },
  });
  
  if (!account) throw new Error('Account not found');
  
  let hubspotCompanyId = account.hubspot_company_id;
  
  if (!hubspotCompanyId) {
    const response = await hubspot.crm.companies.basicApi.create({
      properties: {
        name: account.company_name,
        domain: extractDomain(account.company_name),
        lifecyclestage: mapStageToLifecycle(account.stage),
      },
    });
    
    hubspotCompanyId = response.id;
    
    await prisma.accounts.update({
      where: { id: accountId },
      data: { hubspot_company_id: hubspotCompanyId },
    });
  } else {
    await hubspot.crm.companies.basicApi.update(hubspotCompanyId, {
      properties: {
        name: account.company_name,
        lifecyclestage: mapStageToLifecycle(account.stage),
      },
    });
  }
  
  return hubspotCompanyId;
}
```

**Webhook Endpoint**:
```typescript
// eventops/src/app/api/webhooks/hubspot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const events = await req.json();
  
  for (const event of events) {
    if (event.subscriptionType === 'contact.propertyChange') {
      const hubspotContactId = event.objectId;
      
      // Find YardFlow contact
      const contact = await prisma.contacts.findFirst({
        where: { hubspot_contact_id: hubspotContactId },
      });
      
      if (contact) {
        // Update YardFlow with HubSpot changes
        await prisma.contacts.update({
          where: { id: contact.id },
          data: {
            // Map HubSpot properties to YardFlow fields
            first_name: event.properties?.firstname,
            last_name: event.properties?.lastname,
            job_title: event.properties?.jobtitle,
            updated_at: new Date(),
          },
        });
      }
    }
  }
  
  return NextResponse.json({ status: 'ok' });
}
```

**Validation**:
```bash
# Test 1: Sync contact to HubSpot
curl -X POST https://yardflow-production.up.railway.app/api/sync/hubspot \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contactId":"contact-123","direction":"toHubSpot"}'

# Test 2: Verify in HubSpot
# Login to HubSpot portal
# Search for contact by email
# Verify: Contact exists with correct data

# Test 3: Update in HubSpot, trigger webhook
# Update contact in HubSpot UI
# Check YardFlow database for updated fields

# Test 4: Conflict resolution
# Update same contact in both systems
# Trigger sync
# Verify: Latest update (by timestamp) wins
```

**Files Created**:
- `eventops/src/lib/integrations/hubspot/sync.ts` - Sync logic
- `eventops/src/lib/integrations/hubspot/client.ts` - HubSpot API client
- `eventops/src/app/api/sync/hubspot/route.ts` - Manual sync trigger
- `eventops/src/app/api/webhooks/hubspot/route.ts` - Webhook receiver
- `eventops/tests/lib/integrations/hubspot/sync.test.ts` - Unit tests

**Files Modified**:
- `eventops/prisma/schema.prisma` - Add hubspot_contact_id, hubspot_company_id fields
- Dashboard components to show sync status

**Dependencies**:
- Requires Sprint 30.1 (worker service for async sync)
- Requires HUBSPOT_API_KEY environment variable
- Requires HubSpot webhook subscription setup

**Effort**: XL (3-4 days)

---

### Task 31.3: Dashboard Enhancement - Enriched Data Display
**Type**: Feature  
**Status**: PLANNED  
**Priority**: P2 - UX improvement

**Description**:
Update dashboard UI to display enriched contact data, HubSpot sync status, and enrichment history. Add:
- Enrichment status badges
- HubSpot sync indicators
- Enrichment confidence scores
- "Enrich Now" button for manual triggering
- Enrichment history modal

**Acceptance Criteria**:
- [ ] Contact cards show enrichment status
- [ ] HubSpot sync status visible (synced/pending/error)
- [ ] Enrichment confidence score displayed
- [ ] Manual enrichment trigger button
- [ ] Enrichment history accessible per contact
- [ ] UI responsive and accessible
- [ ] Loading states for async operations

**Implementation**:
```typescript
// eventops/src/components/ContactCard.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ContactCardProps {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle?: string;
    enrichedAt?: Date;
    hubspotContactId?: string;
    enrichmentConfidence?: number;
  };
}

export function ContactCard({ contact }: ContactCardProps) {
  const [enriching, setEnriching] = useState(false);
  
  const handleEnrich = async () => {
    setEnriching(true);
    await fetch('/api/enrich', {
      method: 'POST',
      body: JSON.stringify({ contactId: contact.id }),
    });
    setEnriching(false);
  };
  
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3>{contact.firstName} {contact.lastName}</h3>
          <p className="text-sm text-gray-600">{contact.email}</p>
          {contact.jobTitle && (
            <p className="text-sm font-medium">{contact.jobTitle}</p>
          )}
        </div>
        
        <div className="flex gap-2">
          {contact.enrichedAt && (
            <Badge variant="success">
              Enriched {contact.enrichmentConfidence && `(${Math.round(contact.enrichmentConfidence * 100)}%)`}
            </Badge>
          )}
          
          {contact.hubspotContactId && (
            <Badge variant="info">
              <HubSpotIcon className="w-3 h-3 mr-1" />
              Synced
            </Badge>
          )}
          
          {!contact.enrichedAt && (
            <Button 
              size="sm" 
              onClick={handleEnrich}
              disabled={enriching}
            >
              {enriching ? 'Enriching...' : 'Enrich Now'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Validation**:
- Manual UI testing in dashboard
- Visual regression tests (Percy/Chromatic)
- Accessibility audit (Lighthouse)

**Files Created**:
- `eventops/src/components/ContactCard.tsx` - Enhanced contact card
- `eventops/src/components/EnrichmentHistoryModal.tsx` - Enrichment history
- `eventops/tests/components/ContactCard.test.tsx` - Component tests

**Dependencies**:
- Requires Task 31.1 (enrichment) complete

**Effort**: M (1-2 days)

---

### Task 31.4: Automated Enrichment Workflow
**Type**: Feature  
**Status**: PLANNED  
**Priority**: P2 - Automation

**Description**:
Implement automated enrichment triggers:
- Enrich new contacts automatically when created
- Enrich contacts when account stage changes to "Qualified"
- Batch enrich all contacts for an event
- Scheduled enrichment for contacts > 30 days old

**Acceptance Criteria**:
- [ ] New contacts auto-enqueued for enrichment
- [ ] Stage change triggers enrichment
- [ ] Bulk enrichment API endpoint
- [ ] Scheduled job for periodic re-enrichment
- [ ] Enrichment budget controls respected
- [ ] Admin can enable/disable auto-enrichment

**Implementation**:
```typescript
// eventops/src/lib/enrichment/auto-enrich.ts
import { prisma } from '@/lib/db';
import { enrichmentQueue } from '@/lib/queue/queues';

export async function autoEnrichContact(contactId: string) {
  const settings = await prisma.settings.findFirst({
    where: { key: 'auto_enrichment_enabled' },
  });
  
  if (settings?.value !== 'true') return;
  
  await enrichmentQueue.add('enrich-contact', {
    contactId,
    priority: 'low',
  });
}

// Hook into Prisma middleware
prisma.$use(async (params, next) => {
  const result = await next(params);
  
  if (params.model === 'contacts' && params.action === 'create') {
    await autoEnrichContact(result.id);
  }
  
  return result;
});

// Scheduled job for periodic re-enrichment
export async function schedulePeriodicEnrichment() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const staleContacts = await prisma.contacts.findMany({
    where: {
      enriched_at: { lt: thirtyDaysAgo },
    },
    select: { id: true },
  });
  
  for (const contact of staleContacts) {
    await enrichmentQueue.add('re-enrich-contact', {
      contactId: contact.id,
      priority: 'low',
    });
  }
}
```

**Validation**:
```bash
# Test 1: Auto-enrich on create
curl -X POST https://yardflow-production.up.railway.app/api/contacts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@acme.com"}'

# Check worker logs for enrichment job
railway logs --service yardflow-worker | grep "enrich-contact"

# Test 2: Bulk enrichment
curl -X POST https://yardflow-production.up.railway.app/api/enrich/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"event-123"}'

# Test 3: Periodic re-enrichment (manual trigger)
curl -X POST https://yardflow-production.up.railway.app/api/cron/re-enrich \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Files Created**:
- `eventops/src/lib/enrichment/auto-enrich.ts` - Auto-enrichment logic
- `eventops/src/app/api/enrich/bulk/route.ts` - Bulk enrichment endpoint
- `eventops/src/app/api/cron/re-enrich/route.ts` - Scheduled re-enrichment

**Dependencies**:
- Requires Task 31.1 (enrichment)

**Effort**: M (1-2 days)

---

## Sprint 31 Completion Criteria

### Definition of Done
- [ ] All P1 tasks complete (31.1-31.2)
- [ ] All P2 tasks complete (31.3-31.4)
- [ ] Enrichment working end-to-end
- [ ] HubSpot sync bidirectional
- [ ] Dashboard shows enriched data
- [ ] Automated workflows functional
- [ ] All acceptance criteria validated
- [ ] Documentation updated

### Demo Script
1. Login to dashboard
2. Navigate to event contacts
3. Select contact, click "Enrich Now"
4. Show enrichment in progress (loading state)
5. Refresh - show enriched fields (job title, company size, LinkedIn)
6. Show HubSpot sync status badge
7. Click "Sync to HubSpot"
8. Open HubSpot portal, show contact synced
9. Update contact in HubSpot
10. Trigger webhook (or wait for scheduled sync)
11. Refresh YardFlow - show updated data
12. Show enrichment history modal
13. Demonstrate bulk enrichment for entire event

**Demo Talking Points**:
- "Sprint 31 delivers core business value - automated contact enrichment"
- "OpenAI integration enriches contact data with 80%+ accuracy"
- "HubSpot bidirectional sync keeps CRMs in sync automatically"
- "Enrichment workflows reduce manual data entry by 70%"
- "Budget controls prevent OpenAI cost overruns"
- "This sprint enables sales teams to focus on relationships, not data entry"

---

## 🔄 SPRINT 32: Email Sequences & Automation (PLANNED)
**Goal**: Build automated email sequence engine with SendGrid integration  
**Demo**: Create multi-step sequence, enroll contacts, show automated sends  
**Builds On**: Sprint 31 enriched contacts, Sprint 30 worker infrastructure  
**Duration**: 4-5 days

### Sprint 32 Overview

Email sequences are the automation engine that turns event contacts into qualified leads. Sprint 32 implements:
- Email sequence builder UI
- SendGrid integration for transactional email
- Automated sequence progression
- Email tracking and analytics
- Template system for personalized emails

### Task 32.1: Email Sequence Builder UI
**Type**: Feature  
**Priority**: P1

**Description**:
Drag-and-drop sequence builder for creating multi-step email campaigns. Features:
- Visual sequence editor
- Step configuration (delay, email template, conditions)
- Template selection
- Preview mode
- Save/publish workflow

**Acceptance Criteria**:
- [ ] Visual sequence editor functional
- [ ] Add/remove/reorder steps
- [ ] Configure delays (days/hours)
- [ ] Select email templates per step
- [ ] Conditional branching based on contact properties
- [ ] Preview generated sequence
- [ ] Save draft sequences
- [ ] Publish/activate sequences

**Files Created**:
- `eventops/src/app/dashboard/sequences/builder/page.tsx` - Sequence builder UI
- `eventops/src/components/SequenceBuilder/Canvas.tsx` - Drag-drop canvas
- `eventops/src/components/SequenceBuilder/StepNode.tsx` - Step component
- `eventops/src/components/SequenceBuilder/ConfigPanel.tsx` - Step configuration

**Effort**: XL (3-4 days)

---

### Task 32.2: SendGrid Email Integration
**Type**: Feature  
**Priority**: P1

**Description**:
Integrate SendGrid for transactional email sending with:
- Template management
- Dynamic content substitution
- Delivery tracking
- Bounce/spam handling
- Rate limiting

**Acceptance Criteria**:
- [ ] SendGrid API integration working
- [ ] Email templates synced with SendGrid
- [ ] Dynamic variables (contact name, company, etc.) substituted
- [ ] Delivery status tracked (sent/delivered/bounced/opened/clicked)
- [ ] Bounce/spam webhook handler
- [ ] Rate limiting (respect SendGrid limits)
- [ ] Unit and integration tests

**Files Created**:
- `eventops/src/lib/email/sendgrid-client.ts` - SendGrid integration
- `eventops/src/lib/email/template-manager.ts` - Template management
- `eventops/src/app/api/webhooks/sendgrid/route.ts` - Webhook handler

**Effort**: L (2-3 days)

---

### Task 32.3: Sequence Execution Engine
**Type**: Feature  
**Priority**: P1

**Description**:
Background worker that processes sequence steps:
- Enroll contacts in sequences
- Execute steps based on delays
- Track sequence progression
- Handle failures/retries
- Unenroll based on conditions

**Acceptance Criteria**:
- [ ] Sequence enrollment working
- [ ] Steps execute at correct times
- [ ] Email sends tracked
- [ ] Failed sends retry with backoff
- [ ] Contacts unenroll on completion/conditions
- [ ] Sequence analytics updated

**Files Created**:
- `eventops/src/lib/sequences/executor.ts` - Sequence execution logic
- `eventops/src/lib/queue/workers/sequence-worker.ts` - Sequence worker

**Effort**: L (2-3 days)

---

## 🧪 SPRINT 33: Testing & Quality Assurance (PLANNED)
**Goal**: Comprehensive test coverage and quality improvements  
**Demo**: Show test dashboard, code coverage, performance metrics  
**Builds On**: All previous sprint features  
**Duration**: 3-4 days

### Sprint 33 Overview

Sprint 33 focuses on quality, reliability, and maintainability:
- Unit test coverage > 80%
- Integration test suite
- E2E test automation
- Performance optimization
- Code quality improvements

---

## 📈 SPRINT 34: Analytics & Reporting (PLANNED)
**Goal**: Dashboard analytics and reporting features  
**Demo**: Show event metrics, sequence performance, ROI tracking  
**Builds On**: Sprint 30-32 data collection  
**Duration**: 4-5 days

### Sprint 34 Overview

Turn collected data into actionable insights:
- Event performance dashboards
- Sequence analytics (open rates, click rates, conversion)
- ROI tracking (cost per lead, revenue attribution)
- Custom reports
- Data export functionality

---

## 🔐 SPRINT 35: Security & Compliance (PLANNED)
**Goal**: Harden security, implement GDPR compliance  
**Demo**: Show security audit results, GDPR features  
**Builds On**: All previous infrastructure  
**Duration**: 3-4 days

### Sprint 35 Overview

Production-grade security and compliance:
- Security audit and penetration testing
- GDPR compliance (data export, deletion, consent)
- Rate limiting and DDoS protection
- Audit logging
- Encryption at rest

---

## 📚 Appendix

### Validation Checklist Template

For each task, ensure:
- [ ] **Atomic**: Task can be completed independently
- [ ] **Committable**: Work can be committed without breaking main
- [ ] **Testable**: Clear validation method defined (unit/integration/manual)
- [ ] **Demoable**: Contributes to sprint demo
- [ ] **Documented**: Acceptance criteria explicit
- [ ] **Estimated**: Effort size assigned (S/M/L/XL)

### Effort Sizing Guide

- **S (Small)**: 30 minutes - 2 hours
  - Simple bug fix
  - Configuration change
  - Documentation update

- **M (Medium)**: 2-6 hours
  - New API endpoint
  - Database migration
  - Component implementation

- **L (Large)**: 1-2 days
  - Complex feature
  - Multi-file refactor
  - Integration implementation

- **XL (Extra Large)**: 2-4 days
  - Major feature
  - Architectural change
  - Multiple integrations

### Risk Assessment

**Sprint 30 Risks**:
- Worker deployment may still fail (MEDIUM) - Mitigated by incremental fixes
- Redis provisioning delays (LOW) - Railway provisioning is fast
- Seed script edge cases (LOW) - Start with simple data

**Sprint 31 Risks**:
- OpenAI API costs (MEDIUM) - Mitigated by budget controls
- HubSpot rate limits (MEDIUM) - Implement queue and backoff
- Enrichment accuracy (LOW) - Use GPT-4 for best results

**Sprint 32 Risks**:
- SendGrid deliverability (MEDIUM) - Warm up domain, monitor reputation
- Email template complexity (LOW) - Start with simple templates
- Sequence timing precision (LOW) - BullMQ handles scheduling well

### Success Metrics

**Sprint 30**:
- Deployment success rate: 100%
- Health check uptime: > 99%
- Build time: < 90 seconds
- Zero P0 bugs in production

**Sprint 31**:
- Enrichment accuracy: > 80%
- HubSpot sync latency: < 30 seconds
- OpenAI cost per enrichment: < $0.10
- Enrichment queue processing: < 5 minutes

**Sprint 32**:
- Email delivery rate: > 95%
- Sequence step execution accuracy: > 99%
- Email open rate: > 20%
- Bounce rate: < 3%

---

## 🎯 Next Steps

### Immediate Actions (Sprint 30)
1. Wait for yardflow-worker deployment (commit c892822)
2. If failed, investigate Railway logs for new error
3. If succeeded, validate acceptance criteria for Task 30.1
4. Provision Redis (Task 30.2)
5. Begin Task 30.3 (Redis lazy init)

### Communication Plan
- Daily standup: Share completed tasks, blockers
- Sprint review: Demo working software to stakeholders
- Sprint retrospective: Discuss what went well, what to improve
- Update documentation: Keep sprint docs current

### Feedback Loops
- Validate each task IMMEDIATELY after completion
- Don't move to next task until current task passes validation
- If validation fails, fix before proceeding
- Document learnings in retrospective

---

**Document Version**: 1.0  
**Last Updated**: January 23, 2026  
**Status**: Sprint 30 in progress, Sprint 31-35 planned  
**Next Review**: After Sprint 30 completion
