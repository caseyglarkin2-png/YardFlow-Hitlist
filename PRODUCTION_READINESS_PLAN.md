# YardFlow Hitlist - Production Readiness Plan

**Purpose**: Systematic quality assurance through atomic, testable tasks  
**Approach**: Each task is committable. Each sprint is demoable. Each validation is executable.

---

## Plan Structure

Every sprint follows this pattern:
- **Sprint Goal**: Clear, testable objective
- **Tasks**: Atomic units of work (each is a single commit)
  - Files Modified
  - Implementation (exact code)
  - Tests (automated validation)
  - Commit Message (semantic commit format)
- **Sprint Demo**: What to run/show to prove it works
- **Sprint Validation**: Executable checklist with commands

---

## Current State Analysis

**Completed Work**:
- Sprints 0-17: Auth, CRUD, AI research, campaigns, sequences, A/B testing, engagement scoring
- Sprint 19: Bulk research queue with API and UI
- Sprint 28-29: Custom dashboards, pagination utilities, rate limiting

**Critical Blockers**:
1. **Prisma Model Bug**: Schema has `model meetings` but code uses `prisma.meeting` (15 files)
2. **Schema Drift**: 30+ models defined, only 13 tables exist in database
3. **No Error Handling**: Runtime errors crash pages
4. **Zero Test Coverage**: No automated tests
5. **No Production Monitoring**: Can't detect errors

**Database State**:
- 2,653 target accounts
- 5,409 people/contacts
- Need to audit: campaigns, outreach, meetings counts

---

## SPRINT QA-0: Production Safety Foundation

**Sprint Goal**: Enable safe deployments with backup, rollback, and baseline monitoring

### Sprint Overview

**What We'll Build**:
- Automated database backup system
- Feature flag infrastructure
- Rollback procedure
- Baseline metrics collector

**What We'll Demo**:
```bash
# 1. Create database backup
npm run backup:create

# 2. Toggle feature flag
npm run feature:toggle research-queue

# 3. Collect baseline metrics
npm run metrics:baseline

# 4. Test rollback
vercel rollback
```

---

### Task QA-0.1: Database Backup Automation

**Description**: Create automated backup system for PostgreSQL database

**Files Created**:
- `/eventops/scripts/backup-database.sh`
- `/eventops/scripts/restore-database.sh`
- `/eventops/package.json` (add scripts)

**Implementation**:

```bash
# eventops/scripts/backup-database.sh
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Get database URL from .env
source .env.local
DB_URL=$DATABASE_URL

echo "Creating backup: $BACKUP_FILE"

# Dump database
pg_dump "$DB_URL" > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

echo "✅ Backup created: ${BACKUP_FILE}.gz"
echo "   Size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"

# Keep only last 7 backups
ls -t $BACKUP_DIR/backup_*.sql.gz | tail -n +8 | xargs -r rm

echo "✅ Old backups cleaned up"
```

```bash
# eventops/scripts/restore-database.sh
#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/restore-database.sh <backup-file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh ./backups/backup_*.sql.gz
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

source .env.local
DB_URL=$DATABASE_URL

echo "⚠️  WARNING: This will overwrite the current database!"
echo "   Database: $DB_URL"
echo "   Backup: $BACKUP_FILE"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled"
  exit 0
fi

echo "Restoring database..."

# Decompress and restore
gunzip -c "$BACKUP_FILE" | psql "$DB_URL"

echo "✅ Database restored from $BACKUP_FILE"
```

```json
// eventops/package.json (add to scripts)
{
  "scripts": {
    "backup:create": "chmod +x scripts/backup-database.sh && ./scripts/backup-database.sh",
    "backup:restore": "chmod +x scripts/restore-database.sh && ./scripts/restore-database.sh"
  }
}
```

**Tests**:

```bash
# Test 1: Create backup
cd eventops
npm run backup:create

# Verify: Backup file exists
ls -lh backups/backup_*.sql.gz
# Expected: File exists with size > 0

# Test 2: Verify backup content
gunzip -c backups/backup_$(ls -t backups/ | head -1) | head -20
# Expected: See SQL DDL statements

# Test 3: Dry run restore (cancel when prompted)
npm run backup:restore backups/backup_$(ls -t backups/ | head -1)
# Type "no" when prompted
# Expected: Script exits without error
```

**Validation Checklist**:
- [ ] `npm run backup:create` succeeds
- [ ] Backup file created in `/eventops/backups/`
- [ ] Backup file is compressed (.gz)
- [ ] Backup contains SQL statements
- [ ] Old backups auto-deleted (keep 7)
- [ ] Restore script runs (dry run)

**Commit Message**:
```
feat(ops): add database backup and restore scripts

- Create automated backup with timestamp
- Compress backups with gzip
- Auto-cleanup old backups (keep 7)
- Add restore script with confirmation prompt
- Add npm scripts for backup/restore

Test: npm run backup:create
```

---

### Task QA-0.2: Feature Flag System

**Description**: Enable/disable features without code changes

**Files Created**:
- `/eventops/src/lib/feature-flags.ts`
- `/eventops/src/components/feature-flag.tsx`

**Files Modified**:
- `/eventops/prisma/schema.prisma` (add FeatureFlag model)

**Implementation**:

```prisma
// prisma/schema.prisma (add to file)
model FeatureFlag {
  id          String   @id @default(cuid())
  name        String   @unique
  enabled     Boolean  @default(false)
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

```typescript
// src/lib/feature-flags.ts
import { prisma } from '@/lib/db';

export type FeatureFlagName =
  | 'research-queue'
  | 'bulk-import'
  | 'ai-outreach'
  | 'google-calendar'
  | 'advanced-analytics';

const DEFAULT_FLAGS: Record<FeatureFlagName, boolean> = {
  'research-queue': true,
  'bulk-import': true,
  'ai-outreach': true,
  'google-calendar': false,
  'advanced-analytics': false,
};

// Cache for performance
let flagCache: Map<string, boolean> | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function isFeatureEnabled(name: FeatureFlagName): Promise<boolean> {
  // Check cache
  if (flagCache && Date.now() < cacheExpiry) {
    return flagCache.get(name) ?? DEFAULT_FLAGS[name];
  }

  try {
    // Load all flags
    const flags = await prisma.featureFlag.findMany();
    
    // Rebuild cache
    flagCache = new Map(flags.map(f => [f.name, f.enabled]));
    cacheExpiry = Date.now() + CACHE_TTL;

    return flagCache.get(name) ?? DEFAULT_FLAGS[name];
  } catch (error) {
    console.error('Failed to load feature flags:', error);
    return DEFAULT_FLAGS[name];
  }
}

export async function setFeatureFlag(name: FeatureFlagName, enabled: boolean): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { name },
    create: { name, enabled },
    update: { enabled },
  });

  // Invalidate cache
  flagCache = null;
}

export async function getAllFlags(): Promise<Record<string, boolean>> {
  const flags = await prisma.featureFlag.findMany();
  const result: Record<string, boolean> = { ...DEFAULT_FLAGS };
  
  flags.forEach(flag => {
    result[flag.name] = flag.enabled;
  });

  return result;
}
```

```typescript
// src/components/feature-flag.tsx
'use client';

import { useEffect, useState } from 'react';
import { FeatureFlagName } from '@/lib/feature-flags';

interface Props {
  flag: FeatureFlagName;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureFlag({ flag, children, fallback = null }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/feature-flags/${flag}`)
      .then(r => r.json())
      .then(data => {
        setEnabled(data.enabled);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [flag]);

  if (loading) return null;
  return enabled ? <>{children}</> : <>{fallback}</>;
}
```

```typescript
// src/app/api/feature-flags/[name]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled, setFeatureFlag, FeatureFlagName } from '@/lib/feature-flags';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  const enabled = await isFeatureEnabled(params.name as FeatureFlagName);
  return NextResponse.json({ enabled });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { enabled } = await request.json();
  await setFeatureFlag(params.name as FeatureFlagName, enabled);

  return NextResponse.json({ success: true });
}
```

**Tests**:

```bash
# Test 1: Create migration
cd eventops
npx prisma migrate dev --name add_feature_flags
# Expected: Migration created successfully

# Test 2: Check API
curl http://localhost:3000/api/feature-flags/research-queue
# Expected: {"enabled":true}

# Test 3: Toggle flag
curl -X POST http://localhost:3000/api/feature-flags/research-queue \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'
# Expected: {"success":true}

# Test 4: Verify toggle worked
curl http://localhost:3000/api/feature-flags/research-queue
# Expected: {"enabled":false}

# Test 5: Use in component
# Visit page with: <FeatureFlag flag="research-queue">Content</FeatureFlag>
# Expected: Content hidden when flag disabled
```

**Validation Checklist**:
- [ ] FeatureFlag model in database
- [ ] `isFeatureEnabled()` returns boolean
- [ ] API endpoint returns flag status
- [ ] Can toggle flag via API
- [ ] Component hides content when disabled
- [ ] Cache works (check query count)

**Commit Message**:
```
feat(core): add feature flag system

- Add FeatureFlag model to schema
- Implement flag check with caching (1min TTL)
- Add API endpoint to read/write flags
- Create FeatureFlag React component
- Define default flags for all features

Test: curl /api/feature-flags/research-queue
```

---

### Task QA-0.3: Production Metrics Baseline

**Description**: Capture current production metrics for comparison

**Files Created**:
- `/eventops/scripts/collect-baseline-metrics.ts`
- `/eventops/scripts/baseline-metrics.json` (output)

**Implementation**:

```typescript
// scripts/collect-baseline-metrics.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function collectMetrics() {
  console.log('📊 Collecting baseline metrics...\n');

  const [
    accountCount,
    peopleCount,
    campaignCount,
    outreachCount,
    meetingCount,
    templateCount,
    sequenceCount,
  ] = await Promise.all([
    prisma.targetAccount.count(),
    prisma.person.count(),
    prisma.campaign.count(),
    prisma.outreach.count(),
    prisma.meetings.count(),
    prisma.template.count(),
    prisma.sequence.count(),
  ]);

  // Get average ICP score
  const avgICP = await prisma.targetAccount.aggregate({
    _avg: { icpScore: true },
  });

  // Get accounts with dossiers
  const accountsWithResearch = await prisma.targetAccount.count({
    where: { researchData: { not: null } },
  });

  // Get outreach stats
  const outreachStats = await prisma.outreach.groupBy({
    by: ['status'],
    _count: true,
  });

  // Get campaign stats
  const campaignStats = await prisma.campaign.groupBy({
    by: ['status'],
    _count: true,
  });

  const metrics = {
    timestamp: new Date().toISOString(),
    database: {
      accounts: {
        total: accountCount,
        withResearch: accountsWithResearch,
        avgIcpScore: avgICP._avg.icpScore ?? 0,
      },
      people: peopleCount,
      campaigns: {
        total: campaignCount,
        byStatus: Object.fromEntries(
          campaignStats.map(s => [s.status, s._count])
        ),
      },
      outreach: {
        total: outreachCount,
        byStatus: Object.fromEntries(
          outreachStats.map(s => [s.status, s._count])
        ),
      },
      meetings: meetingCount,
      templates: templateCount,
      sequences: sequenceCount,
    },
  };

  console.log('Baseline Metrics:');
  console.log(JSON.stringify(metrics, null, 2));

  // Save to file
  fs.writeFileSync(
    'scripts/baseline-metrics.json',
    JSON.stringify(metrics, null, 2)
  );

  console.log('\n✅ Metrics saved to scripts/baseline-metrics.json');

  await prisma.$disconnect();
}

collectMetrics().catch(console.error);
```

```json
// package.json (add script)
{
  "scripts": {
    "metrics:baseline": "npx tsx scripts/collect-baseline-metrics.ts"
  }
}
```

**Tests**:

```bash
# Test: Run metrics collection
cd eventops
npm run metrics:baseline

# Verify: Output file created
cat scripts/baseline-metrics.json

# Expected output:
# {
#   "timestamp": "2026-01-22T...",
#   "database": {
#     "accounts": {
#       "total": 2653,
#       "withResearch": 150,
#       "avgIcpScore": 67.5
#     },
#     "people": 5409,
#     ...
#   }
# }
```

**Validation Checklist**:
- [ ] Script runs without errors
- [ ] JSON file created
- [ ] All counts are numbers
- [ ] Timestamp is ISO format
- [ ] Matches expected data (2653 accounts, 5409 people)

**Commit Message**:
```
feat(ops): add baseline metrics collection script

- Collect counts for all major entities
- Calculate average ICP score
- Group outreach/campaigns by status
- Save timestamped snapshot to JSON
- Add npm script for easy execution

Test: npm run metrics:baseline
```

---

### Task QA-0.4: Rollback Test Procedure

**Description**: Document and test production rollback

**Files Created**:
- `/ROLLBACK.md`

**Implementation**:

```markdown
# Production Rollback Procedure

## When to Rollback

Rollback if you observe:
- Error rate > 5% (check Sentry)
- P95 latency > 2000ms (check Vercel Analytics)
- Critical feature broken (e.g., auth fails)
- Database corruption detected

## Rollback Steps

### 1. Identify Target Deployment

```bash
# List recent deployments
vercel ls --prod

# Output:
# Age   Deployment                       Status
# 2m    yard-flow-hitlist-abc123.vercel  Ready
# 1h    yard-flow-hitlist-xyz789.vercel  Ready (current)
```

### 2. Test Previous Deployment

```bash
# Visit preview URL
open https://yard-flow-hitlist-abc123.vercel.app

# Verify:
# - Login works
# - Dashboard loads
# - CRUD operations work
```

### 3. Execute Rollback

```bash
# Rollback to previous deployment
vercel rollback https://yard-flow-hitlist-abc123.vercel.app

# Confirm when prompted
# Production URL now points to abc123
```

### 4. Verify Rollback

```bash
# Check health
curl https://yard-flow-hitlist.vercel.app/api/health

# Expected: {"database":true,"openai":true}

# Check Sentry
# Error rate should drop to < 1%
```

### 5. Database Rollback (if needed)

⚠️ **Only if database migration caused the issue**

```bash
# Restore from backup
cd eventops
npm run backup:restore backups/backup_YYYYMMDD_HHMMSS.sql.gz
# Type "yes" when prompted

# Re-run migrations to target version
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

## Post-Rollback

1. **Investigate**: Check Sentry for root cause
2. **Fix**: Create hotfix branch
3. **Test**: Full QA on staging
4. **Deploy**: Small, incremental fix

## Testing the Rollback Procedure

```bash
# 1. Deploy a test change
echo "// test change" >> eventops/src/app/page.tsx
git add -A
git commit -m "test: trigger deployment for rollback test"
git push

# 2. Wait for deployment
vercel ls --prod
# Note the new deployment URL

# 3. Rollback to previous
vercel rollback
# Select the previous deployment

# 4. Verify
curl https://yard-flow-hitlist.vercel.app
# Should NOT contain "test change"

# 5. Cleanup
git reset --hard HEAD~1
git push --force
```

## Expected Rollback Time

- **Code rollback**: < 2 minutes
- **Database rollback**: < 5 minutes (depends on backup size)
- **Total downtime**: < 5 minutes

## Rollback Decision Tree

```
Error detected
├─ Error rate > 5%
│  └─ ROLLBACK IMMEDIATELY
├─ Database issue
│  ├─ Migration failed
│  │  └─ ROLLBACK code + database
│  └─ Data corruption
│     └─ RESTORE from backup
├─ Non-critical bug
│  └─ DEPLOY hotfix (no rollback)
└─ Unknown cause
   └─ ROLLBACK + investigate
```
```

**Tests**:

```bash
# Test 1: Create test deployment
cd eventops
echo "// rollback test" >> src/app/page.tsx
git add -A
git commit -m "test: rollback procedure"
git push

# Wait 2-3 minutes for deployment

# Test 2: List deployments
vercel ls --prod
# Expected: See 2+ deployments

# Test 3: Execute rollback
vercel rollback
# Select previous deployment (not the one with "rollback test")

# Test 4: Verify rollback
curl https://yard-flow-hitlist.vercel.app | grep "rollback test"
# Expected: No match (comment should be gone)

# Test 5: Cleanup
git reset --hard HEAD~1
git push --force
```

**Validation Checklist**:
- [ ] ROLLBACK.md created
- [ ] Rollback procedure documented
- [ ] Test deployment created
- [ ] Rollback executed successfully
- [ ] Production URL points to previous version
- [ ] Cleanup completed

**Commit Message**:
```
docs(ops): add production rollback procedure

- Document when to rollback
- Step-by-step rollback instructions
- Database restore procedure
- Decision tree for rollback scenarios
- Test procedure included

Test: Follow ROLLBACK.md test section
```

---

### Task QA-0.5: Deployment Smoke Test

**Description**: Automated test suite that runs after every deployment

**Files Created**:
- `/eventops/tests/smoke/smoke-test.sh`

**Implementation**:

```bash
#!/bin/bash
# eventops/tests/smoke/smoke-test.sh
set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${1:-"https://yard-flow-hitlist.vercel.app"}
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "🔍 Running smoke tests against: $BASE_URL"
echo ""

# Helper functions
test_endpoint() {
  local name=$1
  local url=$2
  local expected_status=$3
  local expected_content=$4
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -n "Testing: $name ... "
  
  response=$(curl -s -w "\n%{http_code}" "$url")
  status=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)
  
  if [ "$status" -ne "$expected_status" ]; then
    echo -e "${RED}FAIL${NC} (got $status, expected $expected_status)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
  
  if [ -n "$expected_content" ]; then
    if echo "$body" | grep -q "$expected_content"; then
      echo -e "${GREEN}PASS${NC}"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      echo -e "${RED}FAIL${NC} (content mismatch)"
      FAILED_TESTS=$((FAILED_TESTS + 1))
      return 1
    fi
  else
    echo -e "${GREEN}PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  fi
}

# Tests
echo "═══════════════════════════════════════"
echo "  Health Checks"
echo "═══════════════════════════════════════"

test_endpoint "Health endpoint" "$BASE_URL/api/health" 200 "database"

echo ""
echo "═══════════════════════════════════════"
echo "  Page Load Tests"
echo "═══════════════════════════════════════"

test_endpoint "Home page" "$BASE_URL" 200 "YardFlow"
test_endpoint "Login page" "$BASE_URL/login" 200 "Sign in"

echo ""
echo "═══════════════════════════════════════"
echo "  API Tests (Unauthenticated)"
echo "═══════════════════════════════════════"

test_endpoint "Accounts API (should require auth)" "$BASE_URL/api/accounts" 401 "Unauthorized"
test_endpoint "People API (should require auth)" "$BASE_URL/api/people" 401 "Unauthorized"

echo ""
echo "═══════════════════════════════════════"
echo "  Summary"
echo "═══════════════════════════════════════"

echo "Total tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ All smoke tests passed!${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
```

```json
// package.json (add script)
{
  "scripts": {
    "test:smoke": "chmod +x tests/smoke/smoke-test.sh && ./tests/smoke/smoke-test.sh",
    "test:smoke:prod": "npm run test:smoke https://yard-flow-hitlist.vercel.app",
    "test:smoke:local": "npm run test:smoke http://localhost:3000"
  }
}
```

**Tests**:

```bash
# Test 1: Run smoke tests locally
cd eventops
npm run dev &
sleep 5
npm run test:smoke:local

# Expected output:
# Testing: Health endpoint ... PASS
# Testing: Home page ... PASS
# Testing: Login page ... PASS
# Testing: Accounts API ... PASS
# Testing: People API ... PASS
# ✅ All smoke tests passed!

# Test 2: Run against production
npm run test:smoke:prod

# Test 3: Verify failure case (intentionally fail)
# Stop dev server
pkill -f "next dev"
npm run test:smoke:local
# Expected: Tests fail with connection error
```

**Validation Checklist**:
- [ ] Smoke test script created
- [ ] Script is executable
- [ ] All tests pass locally
- [ ] All tests pass in production
- [ ] Returns exit code 0 on success
- [ ] Returns exit code 1 on failure

**Commit Message**:
```
test(ops): add deployment smoke tests

- Create smoke test script with 5 tests
- Test health endpoint
- Test page loads (home, login)
- Test API auth requirements
- Add npm scripts for local/prod testing
- Color-coded output with summary

Test: npm run test:smoke:local
```

---

## Sprint QA-0: Demo & Validation

**Demo Script**:

```bash
# 1. Show database backup
npm run backup:create
ls -lh backups/

# 2. Show feature flag system
curl http://localhost:3000/api/feature-flags/research-queue

# Toggle it
curl -X POST http://localhost:3000/api/feature-flags/research-queue \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'

# Verify toggle
curl http://localhost:3000/api/feature-flags/research-queue

# 3. Show baseline metrics
npm run metrics:baseline
cat scripts/baseline-metrics.json

# 4. Show rollback procedure
cat ROLLBACK.md

# 5. Run smoke tests
npm run test:smoke:local
```

**Sprint Validation**:

Run these commands to verify sprint completion:

```bash
cd eventops

# ✅ Backup system works
npm run backup:create
test -f backups/backup_*.sql.gz && echo "PASS: Backup created" || echo "FAIL: No backup"

# ✅ Feature flags work
curl -s http://localhost:3000/api/feature-flags/research-queue | grep -q "enabled" && echo "PASS: Feature flags" || echo "FAIL: Feature flags"

# ✅ Metrics collection works
npm run metrics:baseline
test -f scripts/baseline-metrics.json && echo "PASS: Metrics collected" || echo "FAIL: No metrics"

# ✅ Rollback procedure documented
test -f ../ROLLBACK.md && echo "PASS: Rollback docs" || echo "FAIL: No rollback docs"

# ✅ Smoke tests pass
npm run test:smoke:local && echo "PASS: Smoke tests" || echo "FAIL: Smoke tests failed"
```

**Expected Output**:
```
PASS: Backup created
PASS: Feature flags
PASS: Metrics collected
PASS: Rollback docs
PASS: Smoke tests
```

**Sprint Complete When**:
- All 5 tasks committed
- All validation tests pass
- Can demonstrate each feature
- Ready to deploy to production safely

---

## SPRINT QA-1: Critical Bug Fixes

**Sprint Goal**: Fix blocking bugs preventing production use

### Sprint Overview

**Bugs to Fix**:
1. Prisma model naming mismatch (meetings vs Meeting)
2. Missing database migrations (17 models not in DB)
3. Broken calendar view (uses non-existent model)
4. Dashboard stats aggregation errors
5. Orphaned data from missing cascade deletes

**What We'll Demo**:
```bash
# 1. Calendar loads without errors
open http://localhost:3000/dashboard/calendar

# 2. All migrations applied
npx prisma migrate status

# 3. Dashboard stats work
curl http://localhost:3000/api/dashboards/stats

# 4. No orphaned records
npm run audit:data
```

---

### Task QA-1.1: Fix Prisma Model Naming

**Description**: Rename `model meetings` to `model Meeting` with proper mapping

**Files Modified**:
- `/eventops/prisma/schema.prisma`

**Implementation**:

```prisma
// OLD (incorrect):
model meetings {
  id          String   @id @default(cuid())
  title       String
  // ... rest of fields
}

// NEW (correct):
model Meeting {
  id          String   @id @default(cuid())
  title       String
  scheduledAt DateTime
  duration    Int?     // minutes
  location    String?
  notes       String?
  status      MeetingStatus @default(SCHEDULED)
  
  personId    String
  person      Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  campaignId  String?
  campaign    Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  
  eventId     String
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("meetings") // Maps to existing 'meetings' table
  @@index([personId])
  @@index([campaignId])
  @@index([eventId])
  @@index([scheduledAt])
}

enum MeetingStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

**Tests**:

```bash
# Test 1: Generate Prisma client
cd eventops
npx prisma generate

# Verify: No errors

# Test 2: Check TypeScript types
npx tsc --noEmit | grep -i meeting
# Expected: No errors (model should be PascalCase now)

# Test 3: Test in code
cat > test-meeting.ts << 'EOF'
import { prisma } from './src/lib/db';

async function test() {
  // Should work now (capital M)
  const meetings = await prisma.meeting.findMany({ take: 5 });
  console.log(`Found ${meetings.length} meetings`);
}

test();
EOF

npx tsx test-meeting.ts
# Expected: "Found X meetings" (no error)
rm test-meeting.ts

# Test 4: Check database mapping
npx prisma db pull --print
# Expected: Should show 'model Meeting' with '@@map("meetings")'
```

**Validation Checklist**:
- [ ] Schema has `model Meeting` (PascalCase)
- [ ] Has `@@map("meetings")` annotation
- [ ] `npx prisma generate` succeeds
- [ ] TypeScript compilation succeeds
- [ ] Can query `prisma.meeting.findMany()`
- [ ] Database table name unchanged

**Commit Message**:
```
fix(prisma): rename meetings model to Meeting

- Change 'model meetings' to 'model Meeting' (PascalCase)
- Add @@map("meetings") to preserve table name
- Add MeetingStatus enum
- Add proper indexes and relations
- Fixes TypeScript errors in 15 files

Breaking: prisma.meetings → prisma.meeting
Test: npx tsx test-meeting.ts
```

---

### Task QA-1.2: Update All Code References

**Description**: Update 15 files to use correct `prisma.meeting` syntax

**Files Modified**:
- `/eventops/src/app/api/dashboards/stats/route.ts`
- `/eventops/src/app/api/meetings/route.ts`
- `/eventops/src/app/api/meetings/[id]/route.ts`
- `/eventops/src/app/api/analytics/route.ts`
- `/eventops/src/app/api/analytics/funnel/route.ts`
- `/eventops/src/app/api/analytics/cohort/route.ts`
- `/eventops/src/app/dashboard/calendar/page.tsx`

**Implementation**:

```typescript
// Before (all files):
const meetings = await prisma.meetings.findMany(); // ❌ Error

// After (all files):
const meetings = await prisma.meeting.findMany(); // ✅ Works
```

Use multi_replace to update all at once...

**Tests**:

```bash
# Test 1: Verify no more references to prisma.meetings
cd eventops
grep -r "prisma\.meetings" src/
# Expected: No results

# Test 2: Build succeeds
npm run build
# Expected: No TypeScript errors

# Test 3: API works
curl http://localhost:3000/api/meetings
# Expected: 200 OK with meetings array

# Test 4: Dashboard stats work
curl http://localhost:3000/api/dashboards/stats
# Expected: 200 OK with meeting count
```

**Validation Checklist**:
- [ ] No `prisma.meetings` in codebase
- [ ] All files use `prisma.meeting`
- [ ] TypeScript builds without errors
- [ ] All API endpoints return data
- [ ] Dashboard loads without errors

**Commit Message**:
```
fix(api): update all code to use prisma.meeting

- Replace prisma.meetings with prisma.meeting (15 files)
- Update dashboard stats API
- Update meetings CRUD routes
- Update analytics routes
- Update calendar page

Test: grep -r "prisma\.meetings" src/ (should be empty)
```

---

### Task QA-1.3: Create Missing Migrations

**Description**: Generate migrations for 17 models not in database

**Files Created**:
- `/eventops/prisma/migrations/YYYYMMDD_add_missing_models/migration.sql`

**Implementation**:

```bash
# First, check what's missing
cd eventops

# Compare schema to database
npx prisma db pull --print > actual-schema.prisma
diff prisma/schema.prisma actual-schema.prisma

# Expected diff shows missing models:
# - Template
# - Sequence
# - SequenceStep
# - Campaign
# - CampaignMember
# - Outreach
# - OutreachTracking
# - ABTest
# - ABTestVariant
# - EngagementScore
# - Activity
# - FeatureFlag (from QA-0.2)
# etc.

# Create migration
npx prisma migrate dev --name add_missing_models

# This will create:
# - Migration SQL file
# - Update database
# - Regenerate client
```

**Tests**:

```bash
# Test 1: Migration created
ls prisma/migrations/ | grep add_missing_models
# Expected: Directory exists

# Test 2: All models in database
npx prisma db pull --force
diff prisma/schema.prisma prisma/schema.bak
# Expected: Minimal diff (only formatting)

# Test 3: Can query new tables
cat > test-models.ts << 'EOF'
import { prisma } from './src/lib/db';

async function test() {
  const [templates, sequences, campaigns] = await Promise.all([
    prisma.template.count(),
    prisma.sequence.count(),
    prisma.campaign.count(),
  ]);
  
  console.log(`Templates: ${templates}`);
  console.log(`Sequences: ${sequences}`);
  console.log(`Campaigns: ${campaigns}`);
}

test();
EOF

npx tsx test-models.ts
# Expected: Counts displayed (may be 0)
rm test-models.ts

# Test 4: Foreign keys work
npx prisma studio --browser none &
sleep 3
curl http://localhost:5555
# Expected: Prisma Studio UI loads
pkill -f "prisma studio"
```

**Validation Checklist**:
- [ ] Migration file created
- [ ] All models exist in database
- [ ] Can query all models
- [ ] Foreign key constraints created
- [ ] Indexes created
- [ ] Prisma Studio shows all tables

**Commit Message**:
```
feat(db): add missing database migrations

- Generate migration for 17 missing models
- Add Template, Sequence, Campaign tables
- Add Outreach, Meeting, Activity tables
- Add proper foreign keys and indexes
- Update Prisma client

Test: npx prisma db pull (should match schema)
```

---

### Task QA-1.4: Fix Calendar View

**Description**: Update calendar to use correct Meeting model

**Files Modified**:
- `/eventops/src/app/dashboard/calendar/page.tsx`

**Implementation**:

```typescript
// src/app/dashboard/calendar/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  duration?: number;
  location?: string;
  status: string;
  person: {
    name: string;
    email: string;
  };
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeetings();
  }, [currentDate]);

  async function loadMeetings() {
    setLoading(true);
    
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    const response = await fetch(
      `/api/meetings?start=${start.toISOString()}&end=${end.toISOString()}`
    );
    
    if (response.ok) {
      const data = await response.json();
      setMeetings(data.meetings || []);
    }
    
    setLoading(false);
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getMeetingsForDate = (date: Date) => {
    return meetings.filter(m => 
      isSameDay(new Date(m.scheduledAt), date)
    );
  };

  const selectedMeetings = selectedDate ? getMeetingsForDate(selectedDate) : [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          Calendar
        </h1>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <span className="font-semibold min-w-[150px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map(day => {
          const dayMeetings = getMeetingsForDate(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`
                min-h-[100px] p-2 border rounded-lg text-left
                ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}
                ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                ${isSelected ? 'ring-2 ring-blue-500' : ''}
                hover:bg-gray-50
              `}
            >
              <div className="font-semibold mb-1">{format(day, 'd')}</div>
              
              {dayMeetings.length > 0 && (
                <div className="space-y-1">
                  {dayMeetings.slice(0, 2).map(meeting => (
                    <div
                      key={meeting.id}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded truncate"
                    >
                      {format(new Date(meeting.scheduledAt), 'h:mm a')} - {meeting.title}
                    </div>
                  ))}
                  {dayMeetings.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayMeetings.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Meeting details panel */}
      {selectedDate && (
        <div className="mt-6 border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">
            {format(selectedDate, 'MMMM d, yyyy')}
          </h2>
          
          {selectedMeetings.length === 0 ? (
            <p className="text-gray-500">No meetings scheduled</p>
          ) : (
            <div className="space-y-3">
              {selectedMeetings.map(meeting => (
                <div key={meeting.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{meeting.title}</h3>
                      <p className="text-sm text-gray-600">
                        {format(new Date(meeting.scheduledAt), 'h:mm a')}
                        {meeting.duration && ` • ${meeting.duration} min`}
                      </p>
                      <p className="text-sm text-gray-600">
                        With: {meeting.person.name}
                      </p>
                      {meeting.location && (
                        <p className="text-sm text-gray-600">
                          Location: {meeting.location}
                        </p>
                      )}
                    </div>
                    <span className={`
                      px-2 py-1 text-xs rounded
                      ${meeting.status === 'SCHEDULED' ? 'bg-green-100 text-green-800' : ''}
                      ${meeting.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : ''}
                      ${meeting.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {meeting.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Tests**:

```bash
# Test 1: Page loads
npm run dev
open http://localhost:3000/dashboard/calendar
# Expected: Calendar grid displays

# Test 2: API returns meetings
curl 'http://localhost:3000/api/meetings?start=2026-01-01T00:00:00Z&end=2026-01-31T23:59:59Z'
# Expected: JSON with meetings array

# Test 3: Click day with meetings
# In browser: Click a day
# Expected: Meeting details panel shows below

# Test 4: Navigation works
# Click prev/next month
# Expected: Calendar updates, new meetings load
```

**Validation Checklist**:
- [ ] Calendar page loads without errors
- [ ] Month grid displays correctly
- [ ] Can navigate months
- [ ] Meetings appear on correct dates
- [ ] Click day shows meeting details
- [ ] No console errors

**Commit Message**:
```
fix(calendar): update to use correct Meeting model

- Use prisma.meeting (not prisma.meetings)
- Add date range filtering
- Show meetings on calendar grid
- Add meeting details panel
- Handle empty states

Test: Visit /dashboard/calendar
```

---

### Task QA-1.5: Fix Dashboard Aggregations

**Description**: Fix Prisma aggregate queries in dashboard stats

**Files Modified**:
- `/eventops/src/app/api/dashboards/stats/route.ts`

**Implementation**:

```typescript
// src/app/api/dashboards/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const eventId = session.user.eventId;

  try {
    const [
      accountCount,
      peopleCount,
      campaignCount,
      activeCount,
      meetingCount,
      outreachStats,
    ] = await Promise.all([
      // Total accounts
      prisma.targetAccount.count({
        where: { eventId },
      }),

      // Total people
      prisma.person.count({
        where: { eventId },
      }),

      // Total campaigns
      prisma.campaign.count({
        where: { eventId },
      }),

      // Active campaigns
      prisma.campaign.count({
        where: { eventId, status: 'ACTIVE' },
      }),

      // Total meetings
      prisma.meeting.count({
        where: { eventId },
      }),

      // Outreach stats (fixed: use separate counts)
      prisma.outreach.groupBy({
        by: ['status'],
        where: { eventId },
        _count: { id: true },
      }),
    ]);

    // Calculate outreach metrics
    const outreachByStatus: Record<string, number> = {};
    outreachStats.forEach(stat => {
      outreachByStatus[stat.status] = stat._count.id;
    });

    const totalOutreach = Object.values(outreachByStatus).reduce((a, b) => a + b, 0);
    const opened = outreachByStatus['OPENED'] || 0;
    const replied = outreachByStatus['REPLIED'] || 0;

    const openRate = totalOutreach > 0 ? (opened / totalOutreach) * 100 : 0;
    const replyRate = totalOutreach > 0 ? (replied / totalOutreach) * 100 : 0;

    // Get average ICP score
    const icpAvg = await prisma.targetAccount.aggregate({
      where: { eventId, icpScore: { not: null } },
      _avg: { icpScore: true },
    });

    return NextResponse.json({
      accounts: {
        total: accountCount,
        avgIcpScore: icpAvg._avg.icpScore ?? 0,
      },
      people: {
        total: peopleCount,
      },
      campaigns: {
        total: campaignCount,
        active: activeCount,
      },
      meetings: {
        total: meetingCount,
      },
      outreach: {
        total: totalOutreach,
        byStatus: outreachByStatus,
        metrics: {
          openRate: Math.round(openRate * 10) / 10,
          replyRate: Math.round(replyRate * 10) / 10,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard stats' },
      { status: 500 }
    );
  }
}
```

**Tests**:

```bash
# Test 1: API returns valid JSON
curl http://localhost:3000/api/dashboards/stats | jq

# Expected output:
# {
#   "accounts": {
#     "total": 2653,
#     "avgIcpScore": 67.5
#   },
#   "people": {
#     "total": 5409
#   },
#   "campaigns": {
#     "total": 5,
#     "active": 2
#   },
#   "meetings": {
#     "total": 10
#   },
#   "outreach": {
#     "total": 100,
#     "byStatus": { ... },
#     "metrics": {
#       "openRate": 45.5,
#       "replyRate": 12.3
#     }
#   }
# }

# Test 2: Dashboard page loads
open http://localhost:3000/dashboard
# Expected: Stats cards show numbers

# Test 3: No TypeScript errors
npx tsc --noEmit
# Expected: No errors
```

**Validation Checklist**:
- [ ] API returns 200 OK
- [ ] All counts are numbers
- [ ] Percentages calculated correctly
- [ ] Dashboard page loads
- [ ] No Prisma errors in logs

**Commit Message**:
```
fix(api): repair dashboard stats aggregations

- Use groupBy instead of broken _sum aggregate
- Calculate open/reply rates from counts
- Add error handling
- Use correct Meeting model
- Fix TypeScript types

Test: curl /api/dashboards/stats | jq
```

---

### Task QA-1.6: Add Cascade Delete Constraints

**Description**: Ensure related records are deleted when parent is removed

**Files Modified**:
- `/eventops/prisma/schema.prisma`

**Implementation**:

```prisma
// prisma/schema.prisma

// Example: Person model with cascade deletes
model Person {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  // ... other fields
  
  accountId String
  account   TargetAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  
  // Relations that should cascade
  outreach  Outreach[]  // When person deleted, delete their outreach
  meetings  Meeting[]   // When person deleted, delete their meetings
  activities Activity[] // When person deleted, delete their activities
  
  @@index([accountId])
  @@index([eventId])
}

// Outreach should cascade when person or campaign deleted
model Outreach {
  id        String   @id @default(cuid())
  // ... fields
  
  personId   String
  person     Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  campaignId String?
  campaign   Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  
  // Tracking data should cascade
  tracking   OutreachTracking[]
}

// Meeting cascades when person deleted, sets null when campaign deleted
model Meeting {
  id        String   @id @default(cuid())
  // ... fields
  
  personId   String
  person     Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  campaignId String?
  campaign   Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  
  @@map("meetings")
}

// Update all models with proper cascade rules...
```

**Tests**:

```bash
# Test 1: Create migration
cd eventops
npx prisma migrate dev --name add_cascade_deletes

# Test 2: Test cascade delete
cat > test-cascade.ts << 'EOF'
import { prisma } from './src/lib/db';

async function testCascade() {
  // Create test person with outreach
  const person = await prisma.person.create({
    data: {
      name: 'Test Person',
      email: 'test-cascade@example.com',
      accountId: 'some-account-id',
      eventId: 'event1',
    },
  });

  const outreach = await prisma.outreach.create({
    data: {
      subject: 'Test',
      body: 'Test',
      personId: person.id,
      eventId: 'event1',
      status: 'DRAFT',
    },
  });

  console.log(`Created person ${person.id} with outreach ${outreach.id}`);

  // Delete person - outreach should cascade
  await prisma.person.delete({ where: { id: person.id } });

  // Check if outreach was deleted
  const orphaned = await prisma.outreach.findUnique({
    where: { id: outreach.id },
  });

  if (orphaned) {
    console.error('❌ FAIL: Outreach not deleted (cascade failed)');
  } else {
    console.log('✅ PASS: Outreach cascade deleted');
  }
}

testCascade();
EOF

npx tsx test-cascade.ts
# Expected: "✅ PASS: Outreach cascade deleted"
rm test-cascade.ts

# Test 3: Check foreign key constraints
npx prisma studio --browser none &
sleep 3
# Try to delete person with outreach in Prisma Studio
# Expected: Outreach records deleted automatically
pkill -f "prisma studio"
```

**Validation Checklist**:
- [ ] Migration created
- [ ] Foreign keys have onDelete rules
- [ ] Deleting person deletes outreach
- [ ] Deleting person deletes meetings
- [ ] Deleting campaign sets meetings.campaignId to null
- [ ] No orphaned records in database

**Commit Message**:
```
feat(db): add cascade delete constraints

- Add onDelete: Cascade to Person relations
- Outreach/Meeting cascade when Person deleted
- Campaign deletion sets campaignId to null (soft delete)
- Prevent orphaned records
- Add migration for FK constraints

Test: npx tsx test-cascade.ts
```

---

## Sprint QA-1: Demo & Validation

**Demo Script**:

```bash
cd eventops

# 1. Show Prisma model fix
npx prisma studio --browser none &
sleep 3
open http://localhost:5555
# Navigate to Meeting model
# Show data loads correctly
pkill -f "prisma studio"

# 2. Show all migrations applied
npx prisma migrate status
# Expected: All migrations applied

# 3. Show calendar works
npm run dev &
sleep 5
open http://localhost:3000/dashboard/calendar
# Click around, show meetings load

# 4. Show dashboard stats
curl http://localhost:3000/api/dashboards/stats | jq
# Show valid JSON with correct counts

# 5. Test cascade delete
# Delete a person in Prisma Studio
# Show their outreach/meetings also deleted
```

**Sprint Validation**:

```bash
cd eventops

# ✅ Prisma model fixed
grep "model Meeting" prisma/schema.prisma && echo "PASS: Model renamed" || echo "FAIL"

# ✅ No code uses old name
! grep -r "prisma\.meetings" src/ && echo "PASS: Code updated" || echo "FAIL"

# ✅ All migrations applied
npx prisma migrate status | grep -q "Database schema is up to date" && echo "PASS: Migrations" || echo "FAIL"

# ✅ Calendar loads
curl -s http://localhost:3000/dashboard/calendar | grep -q "Calendar" && echo "PASS: Calendar" || echo "FAIL"

# ✅ Dashboard stats work
curl -s http://localhost:3000/api/dashboards/stats | jq -e '.accounts.total' && echo "PASS: Stats" || echo "FAIL"

# ✅ Build succeeds
npm run build 2>&1 | grep -q "Compiled successfully" && echo "PASS: Build" || echo "FAIL"
```

**Expected Output**:
```
PASS: Model renamed
PASS: Code updated
PASS: Migrations
PASS: Calendar
PASS: Stats
PASS: Build
```

**Sprint Complete When**:
- All 6 tasks committed
- All validation tests pass
- Calendar fully functional
- No Prisma errors in logs
- Build succeeds

---

*Continue with QA-2 through QA-7 in same atomic, testable format...*

Would you like me to continue with the remaining sprints in this exhaustive, atomic task format?
