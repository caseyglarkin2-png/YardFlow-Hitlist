# YardFlow EventOps - QA & Stabilization Sprint Plan

**Created**: January 22, 2026  
**Project**: Event execution platform for Manifest 2026  
**Live URL**: https://yard-flow-hitlist.vercel.app  
**Production Data**: 2,653 companies, 5,409 contacts

---

## 📋 Executive Summary

**Goal**: Stabilize platform for production use before adding new features  
**Timeline**: 22-29 days (QA sprints) + 25+ days (feature sprints)  
**Approach**: Fix critical bugs → Data quality → UX polish → Performance → Testing → Security → Monitoring

### Critical Issues Identified

🚨 **BLOCKER**: Prisma model naming mismatch
- Schema: `model meetings` (lowercase)
- Code: `prisma.meeting` (expects `Meeting`)
- Impact: Runtime errors in calendar, dashboard stats, analytics
- Files affected: 15+ API routes

### Success Criteria

- ✅ All builds pass with 0 TypeScript errors
- ✅ All pages load without runtime errors
- ✅ 70%+ test coverage on critical paths
- ✅ Performance: P95 < 500ms, FCP < 1.5s
- ✅ Security: 0 high/critical vulnerabilities
- ✅ Monitoring: Error tracking + health checks live

---

## SPRINT QA-0: Production Safety & Backup (1 day)

**Goal**: Ensure safe rollback capability before schema changes

### Task QA-0.1: Production Database Backup (2 hours)

**Description**: Create full database backup with verified restore procedure

**Files Created**:
- `/scripts/backup-db.sh`
- `/scripts/restore-db.sh`
- `/docs/DISASTER_RECOVERY.md`

**Implementation**:

```bash
# scripts/backup-db.sh
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/eventops_${TIMESTAMP}.sql"

echo "📦 Creating backup: $BACKUP_FILE"

# Export from Vercel Postgres
pg_dump $POSTGRES_URL_NON_POOLING > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

echo "✅ Backup created: ${BACKUP_FILE}.gz"
echo "📊 Size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"
```

**Commands**:
```bash
# Create backup
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh

# Test restore to local
gunzip -c backups/eventops_20260122_*.sql.gz | psql postgresql://localhost:5432/eventops_test
```

**Validation**:
- [ ] Backup file created in `/backups` directory
- [ ] File size > 100KB (contains data)
- [ ] Restore to local database succeeds
- [ ] Record count matches production (`SELECT COUNT(*) FROM people`)
- [ ] Backup file stored in secure location (S3/Vercel Blob)

**Acceptance**: Can restore production database to working state in < 30 minutes

---

### Task QA-0.2: Schema Migration Rollback Strategy (2 hours)

**Description**: Create migration rollback scripts for upcoming Prisma changes

**Files Created**:
- `/eventops/prisma/migrations/rollback_meetings.sql`
- `/docs/MIGRATION_PROCESS.md`

**Implementation**:

```sql
-- rollback_meetings.sql
-- Reverts Meeting model name change if needed

BEGIN;

-- Rename table back
ALTER TABLE IF EXISTS "Meeting" RENAME TO "meetings";

-- Update indexes
ALTER INDEX IF EXISTS "Meeting_personId_idx" RENAME TO "meetings_personId_idx";
ALTER INDEX IF EXISTS "Meeting_scheduledAt_idx" RENAME TO "meetings_scheduledAt_idx";

COMMIT;
```

**Commands**:
```bash
# Test migration on staging
npx prisma migrate dev --name fix_meeting_model --create-only

# Review generated SQL
cat prisma/migrations/*/migration.sql

# Apply to staging first
DATABASE_URL=$STAGING_DATABASE_URL npx prisma migrate deploy

# If successful, apply to production
npx prisma migrate deploy
```

**Validation**:
- [ ] Migration script reviewed and tested on staging
- [ ] Rollback script tested (can revert changes)
- [ ] No data loss during migration
- [ ] Foreign keys remain intact
- [ ] Indexes recreated correctly

**Acceptance**: Can rollback schema changes without data loss

---

### Task QA-0.3: Feature Flag System (3 hours)

**Description**: Implement feature flags to disable problematic features without deployment

**Files Created**:
- `/eventops/src/lib/feature-flags.ts`
- `/eventops/src/app/api/features/route.ts`

**Implementation**:

```typescript
// src/lib/feature-flags.ts
export const features = {
  calendar: process.env.FEATURE_CALENDAR === 'true',
  customDashboards: process.env.FEATURE_CUSTOM_DASHBOARDS === 'true',
  bulkResearch: process.env.FEATURE_BULK_RESEARCH === 'true',
  meetings: process.env.FEATURE_MEETINGS === 'true',
} as const;

export function isFeatureEnabled(feature: keyof typeof features): boolean {
  return features[feature] ?? false;
}
```

**Usage in components**:
```typescript
// src/app/dashboard/calendar/page.tsx
import { isFeatureEnabled } from '@/lib/feature-flags';

export default async function CalendarPage() {
  if (!isFeatureEnabled('calendar')) {
    return <div>Calendar feature temporarily disabled</div>;
  }
  // ... rest of component
}
```

**Validation**:
- [ ] Can disable calendar via env var
- [ ] Disabled features show user-friendly message
- [ ] No runtime errors when features disabled
- [ ] Vercel env vars can toggle features instantly
- [ ] Feature status visible in admin panel

**Acceptance**: Can disable broken features in production without code deployment

---

### Task QA-0.4: Monitoring Baseline Documentation (1 hour)

**Description**: Document current error rates and performance metrics

**Files Created**:
- `/docs/BASELINE_METRICS.md`

**Commands**:
```bash
# Check Vercel Analytics
vercel analytics

# Export current error logs
vercel logs --output=logs/baseline_errors.txt

# Run Lighthouse
npx lighthouse https://yard-flow-hitlist.vercel.app --output=html --output-path=reports/baseline.html
```

**Metrics to Record**:
- Current error rate (errors/hour)
- Page load times (P50, P95, P99)
- Build time
- Bundle sizes
- Database query counts
- API response times

**Validation**:
- [ ] Baseline metrics documented
- [ ] Lighthouse report generated (score __/100)
- [ ] Error log patterns identified
- [ ] Slow queries identified
- [ ] Bundle size recorded (__MB total)

**Acceptance**: Can compare future metrics against baseline

---

### Task QA-0.5: Hotfix Deployment Process (2 hours)

**Description**: Document and test emergency fix deployment procedure

**Files Created**:
- `/docs/HOTFIX_PROCEDURE.md`
- `/.github/workflows/hotfix.yml` (if using GitHub Actions)

**Implementation**:

```markdown
# HOTFIX_PROCEDURE.md

## Emergency Fix Process (< 30 minutes)

### 1. Create Hotfix Branch
```bash
git checkout -b hotfix/critical-bug-name
```

### 2. Make Minimal Fix
- Change ONLY affected files
- No refactoring or feature additions
- Add inline comment explaining fix

### 3. Test Locally
```bash
npm run build
npm run test (if tests exist)
```

### 4. Deploy to Preview
```bash
git push origin hotfix/critical-bug-name
# Vercel auto-creates preview deployment
```

### 5. Verify Preview
- Test specific bug fix
- Smoke test critical paths
- Check logs for errors

### 6. Merge to Main
```bash
git checkout main
git merge --no-ff hotfix/critical-bug-name
git push origin main
```

### 7. Monitor Production
- Watch Vercel logs for 10 minutes
- Check error tracking
- Verify fix resolved issue
```

**Commands**:
```bash
# Practice hotfix workflow
git checkout -b hotfix/test-procedure
echo "# Test" > TEST_HOTFIX.md
git add TEST_HOTFIX.md
git commit -m "hotfix: test emergency procedure"
git push origin hotfix/test-procedure

# Delete test branch
git branch -D hotfix/test-procedure
git push origin --delete hotfix/test-procedure
```

**Validation**:
- [ ] Hotfix process documented
- [ ] Test hotfix deployed to preview in < 5 minutes
- [ ] Team members trained on process
- [ ] Can ship critical fix in < 30 minutes
- [ ] Rollback procedure documented

**Acceptance**: Documented process for shipping emergency fixes

---

## SPRINT QA-1: Critical Bug Fixes & Schema Alignment (3-4 days)

**Goal**: Fix blocking bugs that prevent core features from working

### Task QA-1.1: Fix Prisma Meeting Model Naming (4 hours)

**🚨 CRITICAL BUG**: Schema has `model meetings` but code uses `prisma.meeting`

**Root Cause**: 
- Database table: `meetings` (lowercase, plural)
- Prisma schema: `model meetings { ... @@map("meetings") }`
- Generated client: `prisma.meetings` (not `prisma.meeting`)
- Code imports use: `prisma.meeting` ❌

**Files to Fix** (15 total):
1. `/eventops/src/app/api/dashboards/stats/route.ts` (3 occurrences)
2. `/eventops/src/app/api/meetings/route.ts` (2 occurrences)
3. `/eventops/src/app/api/meetings/[id]/route.ts` (5 occurrences)
4. `/eventops/src/app/api/analytics/route.ts` (1 occurrence)
5. `/eventops/src/app/api/analytics/funnel/route.ts` (2 occurrences)
6. `/eventops/src/app/api/analytics/cohort/route.ts` (1 occurrence)
7. `/eventops/src/app/dashboard/calendar/page.tsx` (client-side fetch)

**Option A**: Rename model to `Meeting` (PascalCase - follows Prisma conventions)

```prisma
// prisma/schema.prisma
model Meeting {
  id           String   @id @default(cuid())
  personId     String
  scheduledAt  DateTime
  // ... rest of fields
  
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  @@index([personId])
  @@index([scheduledAt])
  @@map("meetings")  // Maps to lowercase table
}
```

**Option B**: Update all code to use `prisma.meetings` (lowercase)

**RECOMMENDED**: Option A (PascalCase model, keeps table name)

**Migration**:
```bash
# 1. Update schema.prisma
# Change: model meetings { ... }
# To: model Meeting { ... @@map("meetings") }

# 2. Generate new client
npx prisma generate

# 3. Create migration (safe - only renames model, not table)
npx prisma migrate dev --name rename_meeting_model --create-only

# 4. Review migration.sql (should be empty or minimal)
cat prisma/migrations/*/migration.sql

# 5. Apply migration
npx prisma migrate deploy
```

**Code Changes**:

```typescript
// Before (all 15 files)
const meetings = await prisma.meeting.findMany({ ... })

// After
const meetings = await prisma.meetings.findMany({ ... })

// OR if using Option A (PascalCase):
const meetings = await prisma.meeting.findMany({ ... })  // Now works!
```

**Multi-file Fix** (use find-replace):
```bash
# Find all occurrences
grep -r "prisma\.meeting\." eventops/src/app/api/

# Replace in all files (Option B)
find eventops/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/prisma\.meeting\./prisma.meetings./g'
```

**Validation**:
- [ ] `npx prisma validate` succeeds
- [ ] `npm run build` completes with 0 TypeScript errors
- [ ] Calendar page loads without error
- [ ] Dashboard stats API returns 200
- [ ] Can create/read/update/delete meetings via API
- [ ] Foreign key to Person table works

**Test Commands**:
```bash
# Test API endpoints
curl http://localhost:3000/api/meetings
curl http://localhost:3000/api/dashboards/stats

# Test types
npm run build
```

**Acceptance**: All meeting-related APIs return valid responses

---

### Task QA-1.2: Fix Dashboard Stats API Error Handling (2 hours)

**File**: `/eventops/src/app/api/dashboards/stats/route.ts`

**Issues**:
- Missing try/catch around Prisma queries
- No handling for missing tables
- Returns 500 instead of graceful degradation

**Implementation**:

```typescript
// src/app/api/dashboards/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const last30Days = subDays(today, 30);
    const previous30Days = subDays(today, 60);

    // Wrap queries in try/catch for graceful degradation
    let currentMeetings = 0;
    let previousMeetings = 0;

    try {
      [currentMeetings, previousMeetings] = await Promise.all([
        prisma.meetings.count({
          where: { createdAt: { gte: last30Days } }
        }),
        prisma.meetings.count({
          where: { createdAt: { gte: previous30Days, lt: last30Days } }
        }),
      ]);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      // Continue with zeros - feature not critical
    }

    const [accounts, people, campaigns, totalOutreach, openedCount, repliedCount] = await Promise.all([
      prisma.targetAccount.count(),
      prisma.person.count(),
      prisma.campaign.count(),
      prisma.outreach.count(),
      prisma.outreach.count({ where: { openedAt: { not: null } } }),
      prisma.outreach.count({ where: { respondedAt: { not: null } } }),
    ]);

    const totalSent = totalOutreach;
    const totalReplied = repliedCount;
    const responseRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;

    // ... rest of implementation

    return NextResponse.json({
      overview: {
        accounts,
        people,
        campaigns,
        meetings: currentMeetings,
        responseRate,
        meetingsChange: previousMeetings > 0 
          ? Math.round(((currentMeetings - previousMeetings) / previousMeetings) * 100) 
          : 0,
      },
      // ... rest of response
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

**Validation**:
- [ ] API returns 200 even if meetings table doesn't exist
- [ ] Error logged but not exposed to client
- [ ] Dashboard page loads with partial data
- [ ] Try/catch around all Prisma queries
- [ ] Error includes helpful message in logs

**Test**:
```bash
# Test with meetings table
curl http://localhost:3000/api/dashboards/stats | jq

# Test error handling (rename table temporarily)
# Should return 200 with meetings: 0
```

**Acceptance**: Dashboard loads even with database errors

---

### Task QA-1.3: Audit All API Routes for Prisma Errors (4 hours)

**Description**: Check every API route for potential runtime errors

**Files to Audit** (43 routes):
- `/eventops/src/app/api/**/*.ts`

**Common Issues**:
1. Missing try/catch blocks
2. Incorrect model names
3. Missing null checks
4. Unhandled Prisma errors

**Implementation**: Create audit checklist

```typescript
// Checklist for each route:
// ✅ Wrapped in try/catch
// ✅ Returns proper status codes (200, 400, 401, 404, 500)
// ✅ Validates inputs with Zod
// ✅ Checks user authorization
// ✅ Handles Prisma errors (unique constraint, foreign key, not found)
// ✅ Logs errors properly
// ✅ Returns JSON error responses

// Example fixed route:
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const createAccountSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional(),
  industry: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate input
    const json = await request.json();
    const validation = createAccountSchema.safeParse(json);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    // 3. Database operation with error handling
    const account = await prisma.targetAccount.create({
      data: {
        ...validation.data,
        eventId: 'manifest-2026', // TODO: Get from session
      },
    });

    return NextResponse.json(account, { status: 201 });

  } catch (error) {
    // 4. Proper error handling
    console.error('Create account error:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Account already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
```

**Routes to Fix** (Priority order):
1. `/api/accounts/route.ts` ✅ Already has pagination
2. `/api/people/route.ts`
3. `/api/outreach/route.ts`
4. `/api/campaigns/route.ts`
5. `/api/meetings/route.ts`
6. `/api/meetings/[id]/route.ts`
7. `/api/analytics/*.ts`
8. `/api/dashboards/*.ts`
9. `/api/research/*.ts`
10. All remaining routes

**Validation Script**:
```bash
# Create audit script
cat > scripts/audit-routes.sh << 'EOF'
#!/bin/bash
echo "🔍 Auditing API routes..."

ROUTES=$(find eventops/src/app/api -name "route.ts")
TOTAL=$(echo "$ROUTES" | wc -l)
ISSUES=0

for route in $ROUTES; do
  # Check for try/catch
  if ! grep -q "try {" "$route"; then
    echo "❌ Missing try/catch: $route"
    ((ISSUES++))
  fi
  
  # Check for auth
  if ! grep -q "auth()" "$route" && ! grep -q "session" "$route"; then
    echo "⚠️  No auth check: $route"
  fi
done

echo ""
echo "📊 Results: $ISSUES/$TOTAL routes need fixes"
EOF

chmod +x scripts/audit-routes.sh
./scripts/audit-routes.sh
```

**Validation**:
- [ ] All routes have try/catch
- [ ] All routes return proper HTTP status codes
- [ ] All routes validate inputs
- [ ] Audit script created and run
- [ ] All Prisma errors handled gracefully

**Acceptance**: 100% of API routes have proper error handling

---

### Task QA-1.4: Fix Calendar View Missing API (3 hours)

**File**: `/eventops/src/app/dashboard/calendar/page.tsx`

**Issue**: Calendar fetches `/api/meetings` but may not handle errors

**Current Code Analysis**:
```typescript
// Fetches meetings for selected day
const response = await fetch(`/api/meetings?date=${format(selectedDay, 'yyyy-MM-dd')}`);
const data = await response.json();
```

**Fix Implementation**:

```typescript
// src/app/dashboard/calendar/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

interface Meeting {
  id: string;
  personId: string;
  scheduledAt: string;
  duration: number;
  location?: string;
  status: string;
  meetingType?: string;
  person: {
    name: string;
    title?: string;
  };
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch meetings for selected day
  useEffect(() => {
    const fetchMeetings = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/meetings?date=${format(selectedDay, 'yyyy-MM-dd')}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch meetings: ${response.statusText}`);
        }
        
        const data = await response.json();
        setMeetings(data.meetings || []);
      } catch (err) {
        console.error('Error fetching meetings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load meetings');
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, [selectedDay]);

  // Calendar day generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meeting Calendar</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-medium min-w-[150px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
        
        {days.map((day) => (
          <button
            key={day.toString()}
            onClick={() => setSelectedDay(day)}
            className={`
              p-4 rounded border text-center
              ${isSameMonth(day, currentMonth) ? '' : 'text-gray-400'}
              ${isSameDay(day, selectedDay) ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
            `}
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>

      {/* Meeting details panel */}
      <div className="mt-6 border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">
          Meetings for {format(selectedDay, 'MMMM d, yyyy')}
        </h2>
        
        {loading && <p>Loading meetings...</p>}
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">
            {error}
          </div>
        )}
        
        {!loading && !error && meetings.length === 0 && (
          <p className="text-gray-500">No meetings scheduled</p>
        )}
        
        {!loading && meetings.length > 0 && (
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="border rounded p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{meeting.person.name}</div>
                    {meeting.person.title && (
                      <div className="text-sm text-gray-600">{meeting.person.title}</div>
                    )}
                  </div>
                  <span className={`
                    px-2 py-1 rounded text-xs
                    ${meeting.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' : ''}
                    ${meeting.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : ''}
                    ${meeting.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : ''}
                  `}>
                    {meeting.status}
                  </span>
                </div>
                
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {format(new Date(meeting.scheduledAt), 'h:mm a')} ({meeting.duration} min)
                  </div>
                  {meeting.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {meeting.location}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**API Route Check**:
```typescript
// Verify /api/meetings/route.ts exists and works
// Expected response:
{
  "meetings": [
    {
      "id": "...",
      "personId": "...",
      "scheduledAt": "2026-01-22T14:00:00.000Z",
      "duration": 30,
      "status": "SCHEDULED",
      "person": {
        "name": "John Doe",
        "title": "VP Operations"
      }
    }
  ]
}
```

**Validation**:
- [ ] Calendar page loads without errors
- [ ] Selecting a day fetches meetings
- [ ] Loading state shows while fetching
- [ ] Error state shows if API fails
- [ ] Empty state shows when no meetings
- [ ] Meeting details display correctly

**Test**:
```bash
# Create test meeting
curl -X POST http://localhost:3000/api/meetings \
  -H "Content-Type: application/json" \
  -d '{
    "personId": "person-1",
    "scheduledAt": "2026-01-22T14:00:00Z",
    "duration": 30,
    "location": "Booth 123",
    "status": "SCHEDULED"
  }'

# Verify calendar shows it
open http://localhost:3000/dashboard/calendar
```

**Acceptance**: Calendar displays meetings with proper error handling

---

### Task QA-1.5: Database Index Optimization (3 hours)

**Description**: Add missing indexes for frequently queried fields

**Files Modified**:
- `/eventops/prisma/schema.prisma`

**Current Index Analysis**:
```sql
-- Existing indexes from schema
@@index([personId])          -- people.personId
@@index([accountId])          -- people.accountId
@@index([eventId])            -- campaigns.eventId
@@index([status])             -- campaigns.status
@@index([scheduledAt])        -- meetings.scheduledAt
```

**Missing Indexes** (based on common queries):
```prisma
// Add to schema.prisma

model outreach {
  // ... existing fields
  
  @@index([personId])
  @@index([campaignId])
  @@index([status])
  @@index([sentAt])          // NEW - for chronological queries
  @@index([openedAt])        // NEW - for engagement metrics
  @@index([respondedAt])     // NEW - for response rate calculations
}

model target_accounts {
  // ... existing fields
  
  @@index([eventId])
  @@index([icpScore])        // NEW - for top accounts queries
  @@index([createdAt])       // NEW - for recent accounts
}

model people {
  // ... existing fields
  
  @@index([accountId])
  @@index([email])           // NEW - for email lookups
  @@index([isExecOps])       // NEW - for persona filtering
  @@index([createdAt])       // NEW - for recent contacts
}

model company_dossiers {
  // ... existing fields
  
  @@index([accountId])
  @@index([researchedAt])    // NEW - for stale dossier detection
}
```

**Migration**:
```bash
# Create migration
npx prisma migrate dev --name add_performance_indexes

# Verify migration
cat prisma/migrations/*/migration.sql

# Expected output:
# CREATE INDEX "outreach_sentAt_idx" ON "outreach"("sentAt");
# CREATE INDEX "outreach_openedAt_idx" ON "outreach"("openedAt");
# etc.

# Apply to production
npx prisma migrate deploy
```

**Performance Test**:
```sql
-- Before indexes
EXPLAIN ANALYZE SELECT * FROM outreach WHERE status = 'SENT' ORDER BY sentAt DESC LIMIT 50;
-- Execution time: ~500ms (Seq Scan)

-- After indexes
EXPLAIN ANALYZE SELECT * FROM outreach WHERE status = 'SENT' ORDER BY sentAt DESC LIMIT 50;
-- Execution time: ~5ms (Index Scan)
```

**Validation**:
- [ ] Migration creates indexes successfully
- [ ] No duplicate indexes
- [ ] Query plans use new indexes (check with EXPLAIN)
- [ ] Dashboard loads faster (measure before/after)
- [ ] No index bloat (total size reasonable)

**Measurement**:
```bash
# Before optimization
time curl http://localhost:3000/api/dashboards/stats
# ~2.5s

# After optimization
time curl http://localhost:3000/api/dashboards/stats
# Target: <500ms
```

**Acceptance**: Dashboard stats API < 500ms response time

---

### Task QA-1.6: Bulk Research Queue Stability (3 hours)

**Files Modified**:
- `/eventops/src/lib/research-queue.ts`
- `/eventops/src/app/api/research/bulk/route.ts`

**Issues**:
- Queue not persisted (lost on server restart)
- No retry logic for failed research
- No cancel operation
- No progress persistence

**Implementation**: Add database-backed queue

```prisma
// Add to schema.prisma
model research_jobs {
  id          String   @id @default(cuid())
  accountIds  String   // JSON array
  status      String   @default("PENDING") // PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
  progress    Int      @default(0)
  total       Int
  errors      String?  // JSON array of errors
  startedAt   DateTime?
  completedAt DateTime?
  createdBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([status])
  @@index([createdAt])
}
```

**Updated Queue Manager**:
```typescript
// src/lib/research-queue.ts
import { prisma } from './db';
import { generateCompanyDossier } from './ai-research';

export class ResearchQueue {
  private static instance: ResearchQueue;
  private processing = false;

  static getInstance() {
    if (!this.instance) {
      this.instance = new ResearchQueue();
    }
    return this.instance;
  }

  async addJob(accountIds: string[], userId: string) {
    const job = await prisma.researchJobs.create({
      data: {
        accountIds: JSON.stringify(accountIds),
        total: accountIds.length,
        progress: 0,
        status: 'PENDING',
        createdBy: userId,
      },
    });

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return job;
  }

  async cancelJob(jobId: string) {
    await prisma.researchJobs.update({
      where: { id: jobId },
      data: { status: 'CANCELLED' },
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (true) {
        // Get next pending job
        const job = await prisma.researchJobs.findFirst({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
        });

        if (!job) break;

        // Mark as processing
        await prisma.researchJobs.update({
          where: { id: job.id },
          data: { status: 'PROCESSING', startedAt: new Date() },
        });

        const accountIds = JSON.parse(job.accountIds) as string[];
        const errors: Array<{accountId: string; error: string}> = [];

        // Process each account
        for (let i = 0; i < accountIds.length; i++) {
          const accountId = accountIds[i];

          // Check if job was cancelled
          const currentJob = await prisma.researchJobs.findUnique({
            where: { id: job.id },
          });
          
          if (currentJob?.status === 'CANCELLED') {
            break;
          }

          try {
            // Generate dossier with retry logic
            await this.generateWithRetry(accountId, 3);
          } catch (error) {
            errors.push({
              accountId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          // Update progress
          await prisma.researchJobs.update({
            where: { id: job.id },
            data: { progress: i + 1 },
          });

          // Rate limit: 1 request per second
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Mark as completed or failed
        const finalStatus = errors.length === accountIds.length ? 'FAILED' : 'COMPLETED';
        await prisma.researchJobs.update({
          where: { id: job.id },
          data: {
            status: finalStatus,
            errors: errors.length > 0 ? JSON.stringify(errors) : null,
            completedAt: new Date(),
          },
        });
      }
    } finally {
      this.processing = false;
    }
  }

  private async generateWithRetry(accountId: string, maxRetries: number) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await generateCompanyDossier(accountId);
        return; // Success
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async getJobStatus(jobId: string) {
    const job = await prisma.researchJobs.findUnique({
      where: { id: jobId },
    });

    if (!job) return null;

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      total: job.total,
      errors: job.errors ? JSON.parse(job.errors) : [],
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  async resumeOnStartup() {
    // Resume any processing jobs that were interrupted
    const stuckJobs = await prisma.researchJobs.findMany({
      where: { status: 'PROCESSING' },
    });

    for (const job of stuckJobs) {
      await prisma.researchJobs.update({
        where: { id: job.id },
        data: { status: 'PENDING' },
      });
    }

    // Start processing
    this.processQueue();
  }
}

// Resume on server start
ResearchQueue.getInstance().resumeOnStartup();
```

**API Update**:
```typescript
// src/app/api/research/bulk/route.ts

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountIds } = await request.json();

    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json({ error: 'Invalid accountIds' }, { status: 400 });
    }

    const queue = ResearchQueue.getInstance();
    const job = await queue.addJob(accountIds, session.user.email);

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    console.error('Bulk research error:', error);
    return NextResponse.json({ error: 'Failed to start bulk research' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  const queue = ResearchQueue.getInstance();
  await queue.cancelJob(jobId);

  return NextResponse.json({ success: true });
}
```

**Validation**:
- [ ] Queue persists across server restarts
- [ ] Failed research automatically retries (3 attempts)
- [ ] Can cancel running job
- [ ] Progress saved to database
- [ ] Resume works after server restart

**Test**:
```bash
# Start bulk research
curl -X POST http://localhost:3000/api/research/bulk \
  -H "Content-Type: application/json" \
  -d '{"accountIds": ["acc1", "acc2", "acc3"]}'
# Response: {"jobId": "job123"}

# Check status
curl http://localhost:3000/api/research/bulk?jobId=job123

# Cancel job
curl -X DELETE http://localhost:3000/api/research/bulk?jobId=job123

# Restart server mid-job
# Job should resume automatically
```

**Acceptance**: Bulk research queue persists and resumes correctly

---

## Sprint Completion Checklist

### QA-1 Done When:
- [ ] All Prisma model names match code usage
- [ ] All API routes have proper error handling
- [ ] Dashboard stats loads without errors
- [ ] Calendar displays meetings correctly
- [ ] Database indexes improve query performance
- [ ] Bulk research queue persists across restarts
- [ ] Build completes in < 60s with 0 errors
- [ ] All critical pages load without runtime errors

### Deployment:
```bash
# Run full test suite
npm run build
npm run test (if exists)

# Create migration
cd eventops
npx prisma migrate dev --name qa1_critical_fixes

# Deploy to production
git add -A
git commit -m "fix: QA-1 critical bug fixes and schema alignment"
git push origin main

# Verify deployment
curl https://yard-flow-hitlist.vercel.app/api/dashboards/stats
curl https://yard-flow-hitlist.vercel.app/dashboard/calendar
```

---

## SPRINT QA-2: Data Integrity & Validation (2-3 days)

**Goal**: Ensure data quality and prevent corruption

### Task QA-2.1: CSV Import Validation & Error Handling (3 hours)

**Files Modified**:
- `/eventops/src/app/api/import/execute/route.ts`
- `/eventops/src/app/dashboard/import/page.tsx`

**Issues**:
- No validation of required fields
- Poor error messages
- No duplicate detection
- Can import malformed data

**Implementation**: Add comprehensive validation

```typescript
// src/lib/import-validator.ts
import { z } from 'zod';

export const personSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  title: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  linkedin: z.string().url('Invalid LinkedIn URL').optional(),
  accountId: z.string().cuid('Invalid account ID'),
});

export const accountSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  website: z.string().url('Invalid website URL').optional(),
  industry: z.string().optional(),
  headquarters: z.string().optional(),
  icpScore: z.number().int().min(0).max(100).optional(),
});

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: unknown;
}

export function validateImportData<T>(
  data: unknown[],
  schema: z.ZodSchema<T>
): { valid: T[]; errors: ValidationError[] } {
  const valid: T[] = [];
  const errors: ValidationError[] = [];

  data.forEach((row, index) => {
    const result = schema.safeParse(row);
    
    if (result.success) {
      valid.push(result.data);
    } else {
      result.error.errors.forEach((err) => {
        errors.push({
          row: index + 1,
          field: err.path.join('.'),
          message: err.message,
          value: err.path.reduce((obj, key) => obj?.[key], row as any),
        });
      });
    }
  });

  return { valid, errors };
}

export async function detectDuplicates(
  data: Array<{ email?: string; name: string }>,
  accountId?: string
): Promise<Array<{ row: number; field: string; existingId: string }>> {
  const duplicates: Array<{ row: number; field: string; existingId: string }> = [];

  for (let i = 0; i < data.length; i++) {
    const person = data[i];
    
    if (person.email) {
      const existing = await prisma.person.findFirst({
        where: { 
          email: person.email,
          ...(accountId && { accountId }),
        },
      });

      if (existing) {
        duplicates.push({
          row: i + 1,
          field: 'email',
          existingId: existing.id,
        });
      }
    }
  }

  return duplicates;
}
```

**Updated API**:
```typescript
// src/app/api/import/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { validateImportData, detectDuplicates, personSchema } from '@/lib/import-validator';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, accountId, skipDuplicates = false } = await request.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    // Validate data
    const { valid, errors: validationErrors } = validateImportData(data, personSchema);

    if (validationErrors.length > 0 && !skipDuplicates) {
      return NextResponse.json({
        error: 'Validation failed',
        validationErrors,
        validCount: valid.length,
        errorCount: validationErrors.length,
      }, { status: 400 });
    }

    // Check for duplicates
    const duplicates = await detectDuplicates(valid, accountId);

    if (duplicates.length > 0 && !skipDuplicates) {
      return NextResponse.json({
        error: 'Duplicates detected',
        duplicates,
        message: 'Set skipDuplicates=true to import only new records',
      }, { status: 409 });
    }

    // Filter out duplicates if skip option set
    const toImport = skipDuplicates
      ? valid.filter((_, i) => !duplicates.some(d => d.row === i + 1))
      : valid;

    // Import data
    const result = await prisma.person.createMany({
      data: toImport.map(person => ({
        ...person,
        accountId: accountId || person.accountId,
      })),
      skipDuplicates: true, // Use Prisma's built-in deduplication
    });

    return NextResponse.json({
      success: true,
      imported: result.count,
      skipped: duplicates.length,
      validationErrors: validationErrors.length,
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      error: 'Import failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

**Validation**:
- [ ] Invalid emails rejected with clear message
- [ ] Missing required fields show field name
- [ ] Duplicate emails detected before import
- [ ] Can choose to skip duplicates
- [ ] Error response includes row numbers
- [ ] Validation errors show on frontend

**Test**:
```bash
# Test with invalid data
curl -X POST http://localhost:3000/api/import/execute \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {"name": "John Doe", "email": "invalid-email"},
      {"name": "", "email": "valid@example.com"},
      {"name": "Jane Doe", "email": "jane@example.com"}
    ]
  }'

# Expected response:
{
  "error": "Validation failed",
  "validationErrors": [
    {"row": 1, "field": "email", "message": "Invalid email format"},
    {"row": 2, "field": "name", "message": "Name is required"}
  ],
  "validCount": 1,
  "errorCount": 2
}
```

**Acceptance**: Import validates data and shows clear error messages

---

### Task QA-2.2: Relationship Integrity & Cascade Deletes (2 hours)

**Description**: Verify cascade deletes work correctly and no orphaned records

**Test Scenarios**:

```typescript
// tests/integration/relationships.test.ts
import { prisma } from '@/lib/db';

describe('Relationship Integrity', () => {
  it('should cascade delete people when account deleted', async () => {
    // Create account with people
    const account = await prisma.targetAccount.create({
      data: {
        name: 'Test Corp',
        eventId: 'manifest-2026',
      },
    });

    const person = await prisma.person.create({
      data: {
        name: 'John Doe',
        accountId: account.id,
      },
    });

    // Delete account
    await prisma.targetAccount.delete({
      where: { id: account.id },
    });

    // Verify person was deleted
    const orphanedPerson = await prisma.person.findUnique({
      where: { id: person.id },
    });

    expect(orphanedPerson).toBeNull();
  });

  it('should cascade delete outreach when person deleted', async () => {
    const person = await prisma.person.findFirst();
    
    const outreach = await prisma.outreach.create({
      data: {
        personId: person!.id,
        channel: 'EMAIL',
        message: 'Test message',
      },
    });

    await prisma.person.delete({
      where: { id: person!.id },
    });

    const orphanedOutreach = await prisma.outreach.findUnique({
      where: { id: outreach.id },
    });

    expect(orphanedOutreach).toBeNull();
  });

  it('should set null campaign when campaign deleted', async () => {
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Test Campaign',
        eventId: 'manifest-2026',
      },
    });

    const person = await prisma.person.findFirst();
    
    const outreach = await prisma.outreach.create({
      data: {
        personId: person!.id,
        campaignId: campaign.id,
        channel: 'EMAIL',
        message: 'Test',
      },
    });

    await prisma.campaign.delete({
      where: { id: campaign.id },
    });

    const updatedOutreach = await prisma.outreach.findUnique({
      where: { id: outreach.id },
    });

    expect(updatedOutreach?.campaignId).toBeNull();
  });
});
```

**Database Constraints Check**:
```sql
-- Verify foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

**Validation**:
- [ ] Deleting account deletes all people
- [ ] Deleting account deletes all score history
- [ ] Deleting account deletes company dossier
- [ ] Deleting person deletes all outreach
- [ ] Deleting person deletes contact insights
- [ ] Deleting campaign sets outreach.campaignId to null
- [ ] No orphaned records in database

**Manual Test**:
```bash
# Via UI: Delete an account
open http://localhost:3000/dashboard/accounts/[id]
# Click delete button

# Verify no orphans
npx prisma studio
# Check that related people, outreach, dossiers are gone
```

**Acceptance**: All cascade deletes work without orphaned records

---

### Task QA-2.3: Email Validation & Deduplication (2 hours)

**Files Modified**:
- `/eventops/src/app/api/people/route.ts`
- `/eventops/src/app/dashboard/people/new/page.tsx`

**Implementation**: Add email validation and duplicate checking

```typescript
// src/lib/email-validator.ts
import { z } from 'zod';

export const emailSchema = z.string().email().toLowerCase().trim();

export async function isEmailUnique(
  email: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.person.findFirst({
    where: {
      email,
      id: excludeId ? { not: excludeId } : undefined,
    },
  });

  return !existing;
}

export async function findDuplicateEmails(
  accountId: string
): Promise<Array<{ email: string; count: number; ids: string[] }>> {
  const people = await prisma.person.findMany({
    where: { accountId, email: { not: null } },
    select: { id: true, email: true },
  });

  const emailMap = new Map<string, string[]>();
  
  people.forEach(person => {
    if (person.email) {
      const ids = emailMap.get(person.email) || [];
      ids.push(person.id);
      emailMap.set(person.email, ids);
    }
  });

  const duplicates: Array<{ email: string; count: number; ids: string[] }> = [];
  
  emailMap.forEach((ids, email) => {
    if (ids.length > 1) {
      duplicates.push({ email, count: ids.length, ids });
    }
  });

  return duplicates;
}
```

**Updated API**:
```typescript
// src/app/api/people/route.ts
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate email if provided
    if (data.email) {
      const emailValidation = emailSchema.safeParse(data.email);
      if (!emailValidation.success) {
        return NextResponse.json({
          error: 'Invalid email format',
          field: 'email',
        }, { status: 400 });
      }

      // Check for duplicates
      const isUnique = await isEmailUnique(emailValidation.data);
      if (!isUnique) {
        return NextResponse.json({
          error: 'Email already exists',
          field: 'email',
          suggestion: 'Use existing contact or update their information',
        }, { status: 409 });
      }

      data.email = emailValidation.data; // Use normalized email
    }

    const person = await prisma.person.create({
      data: {
        ...data,
        accountId: data.accountId || session.user.accountId,
      },
    });

    return NextResponse.json(person, { status: 201 });

  } catch (error) {
    console.error('Create person error:', error);
    return NextResponse.json({ error: 'Failed to create person' }, { status: 500 });
  }
}
```

**Client-side Validation**:
```typescript
// src/app/dashboard/people/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewPersonPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    if (!email) return true; // Optional field
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email format' }));
      return false;
    }
    
    setErrors(prev => ({ ...prev, email: '' }));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});

    // Validate required fields
    if (!formData.name.trim()) {
      setErrors(prev => ({ ...prev, name: 'Name is required' }));
      return;
    }

    // Validate email format
    if (formData.email && !validateEmail(formData.email)) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ [data.field]: data.error });
        } else {
          throw new Error(data.error || 'Failed to create person');
        }
        return;
      }

      router.push(`/dashboard/people/${data.id}`);
    } catch (error) {
      console.error(error);
      setErrors({ submit: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Contact</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full border rounded px-3 py-2 ${errors.name ? 'border-red-500' : ''}`}
            required
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="VP of Operations"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (e.target.value) validateEmail(e.target.value);
            }}
            onBlur={() => formData.email && validateEmail(formData.email)}
            className={`w-full border rounded px-3 py-2 ${errors.email ? 'border-red-500' : ''}`}
            placeholder="john.doe@company.com"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {errors.submit && (
          <div className="bg-red-50 text-red-600 p-3 rounded">
            {errors.submit}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Contact'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border px-4 py-2 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
```

**Validation**:
- [ ] Invalid email format rejected
- [ ] Duplicate email shows error
- [ ] Email normalized (lowercase, trimmed)
- [ ] Client-side validation before submit
- [ ] Clear error messages
- [ ] Suggestion to use existing contact

**Test**:
```bash
# Test duplicate detection
curl -X POST http://localhost:3000/api/people \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "JOHN@EXAMPLE.COM"}'

curl -X POST http://localhost:3000/api/people \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe", "email": "john@example.com"}'

# Expected: 409 Conflict - "Email already exists"
```

**Acceptance**: Email validation prevents duplicates with clear messages

---

### Task QA-2.4: ICP Score Bounds Enforcement (1 hour)

**Files Modified**:
- `/eventops/prisma/schema.prisma`
- `/eventops/src/app/api/accounts/[id]/override-score/route.ts`

**Implementation**: Add database constraints and validation

```prisma
// prisma/schema.prisma
model target_accounts {
  // ... other fields
  icpScore Int? @default(0)
  // Add check constraint in migration
  
  @@map("target_accounts")
}
```

**Migration**:
```sql
-- migrations/add_icp_score_constraint/migration.sql
ALTER TABLE target_accounts
ADD CONSTRAINT check_icp_score_range 
CHECK (icpScore IS NULL OR (icpScore >= 0 AND icpScore <= 100));
```

**API Validation**:
```typescript
// src/app/api/accounts/[id]/override-score/route.ts
import { z } from 'zod';

const scoreSchema = z.number().int().min(0).max(100);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { score, reason } = await request.json();

    // Validate score
    const validation = scoreSchema.safeParse(score);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid score',
        message: 'Score must be between 0 and 100',
      }, { status: 400 });
    }

    // Update account
    const account = await prisma.targetAccount.update({
      where: { id: params.id },
      data: { icpScore: validation.data },
    });

    // Log change
    await prisma.scoreHistory.create({
      data: {
        accountId: params.id,
        oldScore: account.icpScore,
        newScore: validation.data,
        reason: reason || 'Manual override',
        changedBy: session.user.email,
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update score' }, { status: 500 });
  }
}
```

**Validation**:
- [ ] Cannot set score < 0
- [ ] Cannot set score > 100
- [ ] Database constraint enforces range
- [ ] API returns 400 with clear message
- [ ] Frontend prevents invalid input

**Test**:
```bash
# Test boundary conditions
curl -X POST http://localhost:3000/api/accounts/test-id/override-score \
  -H "Content-Type: application/json" \
  -d '{"score": 150, "reason": "test"}'
# Expected: 400 - "Score must be between 0 and 100"

curl -X POST http://localhost:3000/api/accounts/test-id/override-score \
  -H "Content-Type: application/json" \
  -d '{"score": -5, "reason": "test"}'
# Expected: 400 - "Score must be between 0 and 100"
```

**Acceptance**: ICP scores are always between 0-100

---

### Task QA-2.5: Production Data Audit & Cleanup (3 hours)

**Description**: Audit existing production data for integrity issues

**Scripts Created**:
- `/scripts/audit-data.ts`

**Implementation**:

```typescript
// scripts/audit-data.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditData() {
  console.log('🔍 Starting data audit...\n');

  // 1. Invalid emails
  const invalidEmails = await prisma.person.findMany({
    where: {
      email: { not: null },
    },
    select: { id: true, name: true, email: true },
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const badEmails = invalidEmails.filter(p => !emailRegex.test(p.email!));
  
  console.log(`📧 Email Validation:`);
  console.log(`  Total with emails: ${invalidEmails.length}`);
  console.log(`  Invalid format: ${badEmails.length}`);
  if (badEmails.length > 0) {
    console.log(`  Examples:`, badEmails.slice(0, 5).map(p => p.email));
  }

  // 2. Out-of-bounds ICP scores
  const badScores = await prisma.targetAccount.findMany({
    where: {
      icpScore: {
        OR: [
          { lt: 0 },
          { gt: 100 },
        ],
      },
    },
    select: { id: true, name: true, icpScore: true },
  });

  console.log(`\n📊 ICP Score Validation:`);
  console.log(`  Out of bounds (< 0 or > 100): ${badScores.length}`);
  if (badScores.length > 0) {
    console.log(`  Examples:`, badScores.slice(0, 5));
  }

  // 3. Orphaned records
  const orphanedPeople = await prisma.$queryRaw`
    SELECT p.id, p.name 
    FROM people p 
    LEFT JOIN target_accounts a ON p.accountId = a.id 
    WHERE a.id IS NULL
    LIMIT 10
  `;

  console.log(`\n🔗 Orphaned Records:`);
  console.log(`  People without accounts: ${(orphanedPeople as any[]).length}`);

  // 4. Duplicate emails
  const duplicateEmails = await prisma.$queryRaw`
    SELECT email, COUNT(*) as count
    FROM people
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING COUNT(*) > 1
  `;

  console.log(`\n👥 Duplicate Emails:`);
  console.log(`  Emails used multiple times: ${(duplicateEmails as any[]).length}`);
  if ((duplicateEmails as any[]).length > 0) {
    console.log(`  Examples:`, (duplicateEmails as any[]).slice(0, 5));
  }

  // 5. Missing required relationships
  const accountsWithoutEvent = await prisma.targetAccount.count({
    where: { eventId: null },
  });

  console.log(`\n🎫 Missing Relationships:`);
  console.log(`  Accounts without events: ${accountsWithoutEvent}`);

  // 6. Data quality metrics
  const totalAccounts = await prisma.targetAccount.count();
  const accountsWithDossiers = await prisma.companyDossier.count();
  const accountsWithICP = await prisma.targetAccount.count({
    where: { icpScore: { not: null } },
  });

  const totalPeople = await prisma.person.count();
  const peopleWithEmail = await prisma.person.count({
    where: { email: { not: null } },
  });
  const peopleWithLinkedIn = await prisma.person.count({
    where: { linkedin: { not: null } },
  });

  console.log(`\n📈 Data Completeness:`);
  console.log(`  Accounts: ${totalAccounts}`);
  console.log(`    - With dossiers: ${accountsWithDossiers} (${Math.round(accountsWithDossiers/totalAccounts*100)}%)`);
  console.log(`    - With ICP scores: ${accountsWithICP} (${Math.round(accountsWithICP/totalAccounts*100)}%)`);
  console.log(`  People: ${totalPeople}`);
  console.log(`    - With emails: ${peopleWithEmail} (${Math.round(peopleWithEmail/totalPeople*100)}%)`);
  console.log(`    - With LinkedIn: ${peopleWithLinkedIn} (${Math.round(peopleWithLinkedIn/totalPeople*100)}%)`);

  // Generate cleanup script
  if (badEmails.length > 0 || badScores.length > 0 || (orphanedPeople as any[]).length > 0) {
    console.log(`\n🔧 Generating cleanup script...`);
    
    let cleanupSQL = '-- Data Cleanup Script\n-- Generated: ' + new Date().toISOString() + '\n\n';
    
    if (badEmails.length > 0) {
      cleanupSQL += '-- Clear invalid emails\n';
      badEmails.forEach(p => {
        cleanupSQL += `UPDATE people SET email = NULL WHERE id = '${p.id}';\n`;
      });
      cleanupSQL += '\n';
    }

    if (badScores.length > 0) {
      cleanupSQL += '-- Clamp ICP scores\n';
      cleanupSQL += `UPDATE target_accounts SET icpScore = LEAST(GREATEST(icpScore, 0), 100) WHERE icpScore < 0 OR icpScore > 100;\n\n`;
    }

    if ((orphanedPeople as any[]).length > 0) {
      cleanupSQL += '-- Delete orphaned people\n';
      (orphanedPeople as any[]).forEach((p: any) => {
        cleanupSQL += `DELETE FROM people WHERE id = '${p.id}';\n`;
      });
    }

    await fs.writeFile('scripts/cleanup.sql', cleanupSQL);
    console.log('✅ Cleanup script saved to scripts/cleanup.sql');
  }

  console.log(`\n✅ Audit complete!`);
}

auditData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Commands**:
```bash
# Run audit
npx ts-node scripts/audit-data.ts

# Review cleanup script
cat scripts/cleanup.sql

# Apply cleanup (with backup first!)
npx prisma db execute --file scripts/cleanup.sql
```

**Validation**:
- [ ] Audit script runs successfully
- [ ] All data issues identified
- [ ] Cleanup script generated
- [ ] < 1% invalid records after cleanup
- [ ] No data loss

**Acceptance**: Production data quality report generated

---

## Sprint QA-2 Completion

### Done When:
- [ ] CSV import validates all data
- [ ] Cascade deletes work correctly
- [ ] Email validation prevents duplicates
- [ ] ICP scores bounded to 0-100
- [ ] Production data audit complete
- [ ] < 1% invalid/orphaned records

---

## SPRINT QA-3: UI/UX Polish & Accessibility (2-3 days)

**Goal**: Fix user-facing issues and improve user experience

### Task QA-3.1: Navigation Consistency Audit (2 hours)

**Description**: Verify all navigation links work and routes exist

**Files Modified**:
- `/eventops/src/components/dashboard-nav.tsx`

**Audit Process**:

```typescript
// scripts/audit-routes.ts
import fs from 'fs';
import path from 'path';

const navLinks = [
  '/dashboard',
  '/dashboard/accounts',
  '/dashboard/people',
  '/dashboard/campaigns',
  '/dashboard/outreach',
  '/dashboard/meetings',
  '/dashboard/calendar',
  '/dashboard/sequences',
  '/dashboard/templates',
  '/dashboard/analytics',
  '/dashboard/analytics-advanced',
  '/dashboard/custom',
  '/dashboard/search',
  '/dashboard/import',
  '/dashboard/export',
  '/dashboard/team',
  '/dashboard/activity',
  '/dashboard/notifications',
  '/dashboard/research/bulk',
  '/dashboard/ab-test',
  '/dashboard/engagement',
  '/dashboard/workflows',
];

const appDir = path.join(__dirname, '../eventops/src/app');

function checkRouteExists(route: string): boolean {
  // Convert route to file path
  const routePath = route.replace('/dashboard', '/dashboard');
  const possiblePaths = [
    path.join(appDir, routePath, 'page.tsx'),
    path.join(appDir, routePath, 'page.ts'),
  ];

  return possiblePaths.some(p => fs.existsSync(p));
}

console.log('🔍 Auditing navigation routes...\n');

const missing: string[] = [];
const working: string[] = [];

navLinks.forEach(link => {
  if (checkRouteExists(link)) {
    working.push(link);
  } else {
    missing.push(link);
    console.log(`❌ Missing: ${link}`);
  }
});

console.log(`\n📊 Results:`);
console.log(`  ✅ Working: ${working.length}/${navLinks.length}`);
console.log(`  ❌ Missing: ${missing.length}/${navLinks.length}`);

if (missing.length > 0) {
  console.log(`\n🔧 To fix:`);
  missing.forEach(link => {
    console.log(`  - Create: eventops/src/app${link}/page.tsx`);
  });
}
```

**Navigation Component Check**:

```typescript
// src/components/dashboard-nav.tsx
const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Accounts', href: '/dashboard/accounts', icon: Building2 },
  { name: 'People', href: '/dashboard/people', icon: Users },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: Target },
  { name: 'Outreach', href: '/dashboard/outreach', icon: Send },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Custom Dashboards', href: '/dashboard/custom', icon: Layout },
  // ... verify all routes exist
];

// Add route validation in development
if (process.env.NODE_ENV === 'development') {
  navItems.forEach(item => {
    fetch(item.href).catch(() => {
      console.warn(`Navigation route may be broken: ${item.href}`);
    });
  });
}
```

**Validation**:
- [ ] All nav links resolve to pages (no 404s)
- [ ] Breadcrumbs show correct hierarchy
- [ ] Back buttons work correctly
- [ ] Active link highlighting works
- [ ] Mobile menu includes all links

**Test**:
```bash
# Run audit script
npx ts-node scripts/audit-routes.ts

# Manual test: Click every link
open http://localhost:3000/dashboard
# Click through entire nav menu
```

**Acceptance**: 0 broken navigation links

---

### Task QA-3.2: Loading States & Skeleton Loaders (3 hours)

**Description**: Add loading feedback for all async operations

**Pattern to Implement**:

```typescript
// src/components/ui/skeleton.tsx
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      {...props}
    />
  );
}

// Example usage in list views
export function AccountListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border rounded p-4">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}
```

**Files to Update**:

1. **Accounts List**:
```typescript
// src/app/dashboard/accounts/page.tsx
'use client';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  if (loading) {
    return <AccountListSkeleton />;
  }

  return (/* account list */);
}
```

2. **People List**:
```typescript
// src/app/dashboard/people/page.tsx
// Similar pattern with PeopleListSkeleton
```

3. **Button Loading States**:
```typescript
// src/components/ui/button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({ loading, disabled, children, ...props }: ButtonProps) {
  return (
    <button disabled={loading || disabled} {...props}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Usage
<Button loading={isSubmitting} onClick={handleSubmit}>
  Save Changes
</Button>
```

4. **Async Action Feedback**:
```typescript
// Example: Generate dossier button
const [generating, setGenerating] = useState(false);

const handleGenerate = async () => {
  setGenerating(true);
  try {
    await fetch('/api/accounts/123/research', { method: 'POST' });
    toast.success('Dossier generated!');
  } catch (error) {
    toast.error('Failed to generate dossier');
  } finally {
    setGenerating(false);
  }
};

<Button loading={generating} onClick={handleGenerate}>
  {generating ? 'Generating...' : 'Generate Dossier'}
</Button>
```

**Pages to Add Loading States**:
- [ ] `/dashboard/accounts` - List skeleton
- [ ] `/dashboard/people` - List skeleton
- [ ] `/dashboard/campaigns` - List skeleton
- [ ] `/dashboard/outreach` - List skeleton
- [ ] `/dashboard/calendar` - Calendar skeleton
- [ ] `/dashboard/analytics` - Chart skeletons
- [ ] All forms - Button loading states
- [ ] All API mutations - Spinner feedback

**Validation**:
- [ ] Loading state appears within 100ms of action
- [ ] Skeleton matches final layout
- [ ] Buttons disabled during loading
- [ ] No flash of empty content
- [ ] Throttle 3G test shows good UX

**Test**:
```bash
# Throttle network to 3G
# Chrome DevTools > Network > Throttling > Fast 3G

# Navigate through app
# Every page should show loading state
```

**Acceptance**: All async operations show loading feedback

---

### Task QA-3.3: Error Boundaries & User-Friendly Messages (2 hours)

**Description**: Catch runtime errors and show helpful messages

**Implementation**:

```typescript
// src/components/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
    
    // Send to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4 text-center max-w-md">
            We encountered an error while loading this page. 
            {this.state.error && (
              <span className="block text-sm mt-2 text-gray-500">
                {this.state.error.message}
              </span>
            )}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Wrap Pages**:
```typescript
// src/app/dashboard/layout.tsx
import { ErrorBoundary } from '@/components/error-boundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
```

**API Error Messages**:
```typescript
// src/lib/api-client.ts
export async function apiClient<T>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const json = await response.json();

    if (!response.ok) {
      // User-friendly error messages
      const userMessage = getUserFriendlyError(response.status, json.error);
      return { error: userMessage };
    }

    return { data: json };
  } catch (error) {
    return { error: 'Network error. Please check your connection and try again.' };
  }
}

function getUserFriendlyError(status: number, serverMessage: string): string {
  const messages: Record<number, string> = {
    400: 'Invalid input. Please check your data and try again.',
    401: 'Please log in to continue.',
    403: "You don't have permission to do that.",
    404: 'The requested resource was not found.',
    409: serverMessage || 'This already exists.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Our team has been notified.',
    503: 'Service temporarily unavailable. Please try again later.',
  };

  return messages[status] || serverMessage || 'Something went wrong. Please try again.';
}
```

**Form Error Display**:
```typescript
// Pattern for form errors
{errors.submit && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
    <div className="flex items-start">
      <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">Error</p>
        <p className="text-sm">{errors.submit}</p>
        {retryable && (
          <button
            onClick={handleRetry}
            className="text-sm underline mt-2"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  </div>
)}
```

**Validation**:
- [ ] Error boundary catches runtime errors
- [ ] User sees friendly message (not stack trace)
- [ ] Reload button works
- [ ] API errors show context-specific messages
- [ ] Network errors handled gracefully

**Test**:
```typescript
// Trigger error boundary
throw new Error('Test error');

// Test API errors
fetch('/api/nonexistent').then(/* handle error */);
```

**Acceptance**: All errors show user-friendly messages with recovery options

---

### Task QA-3.4: Form Validation & Inline Errors (2 hours)

**Description**: Client-side validation with field-level feedback

**Implementation**:

```typescript
// src/hooks/use-form-validation.ts
import { useState } from 'react';

interface ValidationRule<T> {
  field: keyof T;
  validate: (value: any, formData: T) => string | null;
}

export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  rules: ValidationRule<T>[]
) {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = (field: keyof T, value: any): string | null => {
    const rule = rules.find(r => r.field === field);
    if (!rule) return null;
    
    return rule.validate(value, formData);
  };

  const handleChange = (field: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error || undefined }));
    }
  };

  const handleBlur = (field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error || undefined }));
  };

  const validateAll = (): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    rules.forEach(rule => {
      const error = rule.validate(formData[rule.field], formData);
      if (error) {
        newErrors[rule.field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const reset = () => {
    setFormData(initialData);
    setErrors({});
    setTouched({});
  };

  return {
    formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
  };
}

// Example usage
const accountForm = useFormValidation(
  { name: '', website: '', industry: '' },
  [
    {
      field: 'name',
      validate: (value) => {
        if (!value?.trim()) return 'Company name is required';
        if (value.length < 2) return 'Company name must be at least 2 characters';
        return null;
      },
    },
    {
      field: 'website',
      validate: (value) => {
        if (!value) return null; // Optional field
        try {
          new URL(value);
          return null;
        } catch {
          return 'Please enter a valid URL (e.g., https://example.com)';
        }
      },
    },
  ]
);
```

**Form Component Pattern**:
```typescript
// src/app/dashboard/accounts/new/page.tsx
'use client';

export default function NewAccountPage() {
  const form = useFormValidation(
    { name: '', website: '', industry: '', headquarters: '' },
    validationRules
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.validateAll()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(form.formData),
      });

      if (!response.ok) throw new Error();
      
      toast.success('Account created!');
      router.push('/dashboard/accounts');
    } catch {
      toast.error('Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Account</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.formData.name}
            onChange={(e) => form.handleChange('name', e.target.value)}
            onBlur={() => form.handleBlur('name')}
            className={`
              w-full border rounded px-3 py-2
              ${form.errors.name ? 'border-red-500' : 'border-gray-300'}
              focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
            aria-invalid={!!form.errors.name}
            aria-describedby={form.errors.name ? 'name-error' : undefined}
          />
          {form.errors.name && (
            <p id="name-error" className="text-red-500 text-sm mt-1">
              {form.errors.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Website
          </label>
          <input
            type="url"
            value={form.formData.website}
            onChange={(e) => form.handleChange('website', e.target.value)}
            onBlur={() => form.handleBlur('website')}
            className={`
              w-full border rounded px-3 py-2
              ${form.errors.website ? 'border-red-500' : 'border-gray-300'}
            `}
            placeholder="https://example.com"
          />
          {form.errors.website && (
            <p className="text-red-500 text-sm mt-1">{form.errors.website}</p>
          )}
        </div>

        {/* More fields... */}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Account'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border px-4 py-2 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
```

**Validation**:
- [ ] Required fields validated on blur
- [ ] Inline errors appear immediately
- [ ] Submit disabled during validation
- [ ] Clear error messages
- [ ] Keyboard navigation works
- [ ] ARIA attributes for screen readers

**Test**:
```bash
# Test validation
# 1. Leave required field empty and tab away
# 2. Enter invalid email
# 3. Try to submit with errors
# 4. Fix errors and submit
```

**Acceptance**: All forms validate with inline, accessible error messages

---

### Task QA-3.5: Mobile Responsiveness (3 hours)

**Description**: Test and fix mobile viewport (375px - 768px)

**Testing Checklist**:

```markdown
## Mobile Test Checklist (375px width)

### Navigation
- [ ] Hamburger menu opens/closes
- [ ] All nav items accessible
- [ ] Active state visible
- [ ] Logout button reachable

### Dashboard
- [ ] Cards stack vertically
- [ ] Stats readable
- [ ] Charts resize properly
- [ ] No horizontal scroll

### Lists (Accounts, People)
- [ ] Table scrolls horizontally
- [ ] Action buttons accessible
- [ ] Search bar visible
- [ ] Filters work

### Forms
- [ ] Inputs full width
- [ ] Labels visible
- [ ] Buttons stack vertically
- [ ] Validation messages visible

### Detail Pages
- [ ] Content readable
- [ ] Images scale
- [ ] Tabs work
- [ ] Back button visible
```

**Common Fixes**:

```css
/* src/app/globals.css */

/* Prevent horizontal scroll */
body {
  overflow-x: hidden;
}

/* Responsive tables */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {
  /* Stack cards */
  .dashboard-grid {
    grid-template-columns: 1fr !important;
  }

  /* Full width buttons */
  .button-group {
    flex-direction: column;
  }

  .button-group button {
    width: 100%;
  }

  /* Smaller text */
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.25rem; }

  /* Touch targets (min 44px) */
  button, a {
    min-height: 44px;
    min-width: 44px;
  }
}
```

**Mobile Navigation**:
```typescript
// src/components/mobile-nav.tsx
'use client';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden p-2"
        aria-label="Toggle menu"
      >
        {open ? <X /> : <Menu />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <nav className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-lg">
            {/* Nav items */}
          </nav>
        </div>
      )}
    </>
  );
}
```

**Validation**:
- [ ] All pages work on iPhone SE (375px)
- [ ] No horizontal scroll
- [ ] Touch targets ≥ 44px
- [ ] Text readable without zoom
- [ ] Forms submit on mobile
- [ ] Tables scroll horizontally

**Test**:
```bash
# Chrome DevTools
# Toggle device toolbar (Cmd+Shift+M)
# Test: iPhone SE, iPhone 12, iPad

# Real device testing
# Open: https://yard-flow-hitlist.vercel.app on phone
```

**Acceptance**: All features usable on 375px viewport

---

### Task QA-3.6: Accessibility (WCAG 2.1 AA) (2 hours)

**Description**: Ensure keyboard navigation and screen reader support

**Lighthouse Audit**:
```bash
npx lighthouse https://yard-flow-hitlist.vercel.app \
  --only-categories=accessibility \
  --output=html \
  --output-path=reports/accessibility.html
```

**Common Fixes**:

```typescript
// 1. Alt text for images
<img src="/logo.png" alt="YardFlow logo" />

// 2. ARIA labels for icons
<button aria-label="Delete account">
  <Trash2 className="h-4 w-4" />
</button>

// 3. Form labels
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// 4. Skip to main content
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
<main id="main-content">
  {/* Content */}
</main>

// 5. Focus visible styles
/* globals.css */
*:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

// 6. Keyboard navigation
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

// 7. Color contrast (min 4.5:1)
// Check all text/background combinations

// 8. Semantic HTML
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Title</h1>
    <section>
      <h2>Subtitle</h2>
    </section>
  </article>
</main>
```

**Validation**:
- [ ] Lighthouse accessibility score > 90
- [ ] Can navigate entire app with keyboard only
- [ ] Focus indicators visible
- [ ] Screen reader announces changes
- [ ] Color contrast passes WCAG AA
- [ ] Form errors announced

**Test**:
```bash
# Keyboard navigation test
# Tab through entire app
# Enter/Space to activate
# Escape to close modals

# Screen reader test (macOS)
# VoiceOver: Cmd+F5
# Navigate with screen reader enabled
```

**Acceptance**: Lighthouse accessibility score ≥ 90

---

## Sprint QA-3 Completion

### Done When:
- [ ] All navigation links work
- [ ] Loading states on all async operations
- [ ] Error boundaries catch runtime errors
- [ ] Forms validate with inline errors
- [ ] Mobile responsive (375px+)
- [ ] Lighthouse accessibility > 90
- [ ] Can navigate entire app with keyboard

---

## SPRINT QA-4: Performance Optimization (2-3 days)

**Goal**: Improve load times and reduce bundle size

### Task QA-4.1: Implement Universal Pagination (3 hours)

**Description**: Add pagination to all list views

**Already Created**:
- `/eventops/src/lib/pagination.ts` ✅
- `/eventops/src/app/api/accounts/route.ts` (with pagination) ✅

**Apply Pattern to Remaining Routes**:

```typescript
// Pattern for API routes
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const { cursor, limit, orderBy, orderDir } = parsePaginationParams(searchParams);

  const where = {}; // Add filters

  const { items, nextCursor, hasMore, total } = await buildPaginatedResponse(
    'person', // or 'targetAccount', 'campaign', etc.
    where,
    { cursor, limit, orderBy, orderDir }
  );

  return NextResponse.json({
    people: items,
    pagination: {
      nextCursor,
      hasMore,
      total,
      limit,
    },
  });
}
```

**Client Component Pattern**:
```typescript
// src/components/paginated-list.tsx
'use client';

interface Props<T> {
  endpoint: string;
  renderItem: (item: T) => React.ReactNode;
  pageSize?: number;
}

export function PaginatedList<T extends { id: string }>({
  endpoint,
  renderItem,
  pageSize = 50,
}: Props<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    
    const url = new URL(endpoint, window.location.origin);
    if (cursor) url.searchParams.set('cursor', cursor);
    url.searchParams.set('limit', pageSize.toString());

    const response = await fetch(url.toString());
    const data = await response.json();

    setItems(prev => [...prev, ...data.items]);
    setCursor(data.pagination.nextCursor);
    setHasMore(data.pagination.hasMore);
    setLoading(false);
  };

  useEffect(() => {
    loadMore();
  }, []);

  return (
    <div>
      <div className="space-y-2">
        {items.map(renderItem)}
      </div>
      
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-4 w-full border rounded py-2 hover:bg-gray-50"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

// Usage
<PaginatedList
  endpoint="/api/people"
  renderItem={(person) => <PersonCard key={person.id} person={person} />}
  pageSize={25}
/>
```

**Routes to Paginate**:
- [ ] `/api/people/route.ts`
- [ ] `/api/campaigns/route.ts`
- [ ] `/api/outreach/route.ts`
- [ ] `/api/meetings/route.ts`
- [ ] `/api/activity/route.ts`

**Validation**:
- [ ] Initial load fetches 25-50 items
- [ ] "Load More" button appears
- [ ] Subsequent loads append to list
- [ ] Performance: < 200ms per page
- [ ] Cursor-based (not offset) for consistency

**Test**:
```bash
# Load page with 1000+ records
# Initial load should be fast (< 1s)
# Measure: Network tab shows small payload

curl 'http://localhost:3000/api/people?limit=25' | jq '.pagination'
# Expected: { "nextCursor": "...", "hasMore": true, "total": 5409 }
```

**Acceptance**: All list views load ≤ 50 items initially

---

### Task QA-4.2: Database Query Optimization (3 hours)

**Description**: Add select clauses and optimize N+1 queries

**Current Issue**: Over-fetching data

```typescript
// ❌ BAD: Fetches all fields
const accounts = await prisma.targetAccount.findMany();

// ✅ GOOD: Select only needed fields
const accounts = await prisma.targetAccount.findMany({
  select: {
    id: true,
    name: true,
    website: true,
    icpScore: true,
  },
});
```

**N+1 Query Fix**:
```typescript
// ❌ BAD: N+1 query
const accounts = await prisma.targetAccount.findMany();
for (const account of accounts) {
  const people = await prisma.person.findMany({
    where: { accountId: account.id },
  });
  // Process people
}

// ✅ GOOD: Include relation
const accounts = await prisma.targetAccount.findMany({
  include: {
    people: {
      select: {
        id: true,
        name: true,
        title: true,
      },
      take: 5, // Limit per account
    },
    _count: {
      select: { people: true }, // Just get count
    },
  },
});
```

**Query Optimization Patterns**:

```typescript
// 1. Use select for specific fields
select: {
  id: true,
  name: true,
  email: true,
}

// 2. Use include with select for relations
include: {
  person: {
    select: { name: true, title: true },
  },
}

// 3. Use _count for counts (don't fetch all)
include: {
  _count: {
    select: {
      people: true,
      outreach: true,
    },
  },
}

// 4. Limit included relations
include: {
  outreach: {
    take: 10,
    orderBy: { createdAt: 'desc' },
  },
}

// 5. Use aggregations
const stats = await prisma.outreach.aggregate({
  _count: { id: true },
  _avg: { /* field */ },
  where: { status: 'SENT' },
});
```

**Files to Optimize**:
1. `/api/accounts/route.ts` - Don't fetch all people
2. `/api/people/[id]/route.ts` - Select only needed account fields
3. `/api/dashboards/stats/route.ts` - Use aggregations
4. `/api/analytics/route.ts` - Use aggregations, not findMany

**Measurement**:
```typescript
// Add query logging
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
  ],
});

prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`);
  console.log(`Duration: ${e.duration}ms`);
});
```

**Validation**:
- [ ] No SELECT * queries
- [ ] No N+1 queries
- [ ] 90% of queries < 50ms
- [ ] Dashboard loads < 500ms
- [ ] Query log shows optimized queries

**Test**:
```bash
# Enable query logging
# Load dashboard
# Check console for query times

# Expected: Most queries < 50ms
```

**Acceptance**: 90% of database queries < 50ms

---

### Task QA-4.3: Bundle Size Reduction & Code Splitting (4 hours)

**Description**: Analyze and reduce JavaScript bundle size

**Analysis**:
```bash
# Install analyzer
npm install -D @next/bundle-analyzer

# Configure
# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... existing config
});

# Run analysis
ANALYZE=true npm run build
```

**Common Optimizations**:

1. **Dynamic Imports for Heavy Components**:
```typescript
// ❌ BAD: Import chart library on every page load
import { LineChart } from 'recharts';

// ✅ GOOD: Lazy load chart component
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

2. **Tree-shake Icon Libraries**:
```typescript
// ❌ BAD: Imports entire library
import * as Icons from 'lucide-react';

// ✅ GOOD: Import specific icons
import { Home, Users, Settings } from 'lucide-react';
```

3. **Code Split Routes**:
```typescript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
};
```

4. **Remove Unused Dependencies**:
```bash
# Find unused deps
npx depcheck

# Remove them
npm uninstall unused-package
```

5. **Optimize Date Libraries**:
```typescript
// ❌ BAD: Import entire moment.js (heavy)
import moment from 'moment';

// ✅ GOOD: Use date-fns with tree-shaking
import { format, subDays } from 'date-fns';
```

**Target Bundle Sizes**:
- First Load JS: < 100KB per page
- Shared chunks: < 200KB total
- Total bundle: < 500KB

**Validation**:
- [ ] Bundle analyzer shows no duplicate deps
- [ ] Large libraries dynamically imported
- [ ] First Load JS < 100KB per page
- [ ] Lighthouse performance > 90

**Test**:
```bash
# Build and analyze
ANALYZE=true npm run build

# Check first load sizes
# Should see: "First Load JS shared by all" < 200KB
```

**Acceptance**: First Load JS < 100KB per page

---

### Task QA-4.4: Image Optimization (1 hour)

**Description**: Optimize all images with next/image

**Pattern**:
```typescript
// ❌ BAD: Regular img tag
<img src="/logo.png" alt="Logo" width="200" />

// ✅ GOOD: next/image
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // For above-fold images
/>

// For external images
<Image
  src="https://example.com/image.jpg"
  alt="Description"
  width={400}
  height={300}
  unoptimized={false} // Let Next.js optimize
/>
```

**Configuration**:
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['example.com'], // Allow external domains
    formats: ['image/webp', 'image/avif'], // Modern formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
};
```

**Find All Images**:
```bash
# Find img tags
grep -r "<img" eventops/src --include="*.tsx" --include="*.ts"

# Should return 0 results (use Image instead)
```

**Validation**:
- [ ] All images use next/image
- [ ] External domains configured
- [ ] Width/height specified
- [ ] Alt text present
- [ ] Lazy loading enabled (default)

**Test**:
```bash
# Network tab: Images should be WebP format
# DevTools: No CLS (Cumulative Layout Shift)
```

**Acceptance**: All images optimized with next/image

---

### Task QA-4.5: Caching Strategy (2 hours)

**Description**: Implement client and server-side caching

**API Route Caching**:
```typescript
// src/app/api/accounts/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const account = await prisma.targetAccount.findUnique({
    where: { id: params.id },
  });

  return NextResponse.json(account, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

**Client-Side Caching with SWR**:
```typescript
// Install SWR
npm install swr

// src/hooks/use-account.ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useAccount(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/accounts/${id}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    account: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

// Usage in component
const { account, isLoading } = useAccount(accountId);
```

**Static Data Caching**:
```typescript
// Cache expensive computations
import { unstable_cache } from 'next/cache';

const getCachedStats = unstable_cache(
  async () => {
    return await prisma.targetAccount.aggregate({
      _count: true,
      _avg: { icpScore: true },
    });
  },
  ['dashboard-stats'],
  {
    revalidate: 300, // 5 minutes
    tags: ['stats'],
  }
);
```

**Cache Invalidation**:
```typescript
// src/app/api/accounts/route.ts
import { revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  const account = await prisma.targetAccount.create({/* ... */});
  
  // Invalidate cached stats
  revalidateTag('stats');
  
  return NextResponse.json(account);
}
```

**Validation**:
- [ ] Static content cached
- [ ] API responses have Cache-Control headers
- [ ] Repeated requests use cache
- [ ] Cache invalidates on mutations
- [ ] Network tab shows 304 (Not Modified)

**Test**:
```bash
# Load page twice
# Second load should use cache

# Network tab:
# First request: 200 OK
# Second request: 304 Not Modified (or from cache)
```

**Acceptance**: Repeat page visits 50% faster

---

### Task QA-4.6: Load Testing & Performance Monitoring (2 hours)

**Description**: Test under concurrent load

**Setup k6**:
```bash
# Install k6
brew install k6  # macOS
# or download from k6.io

# Create load test script
cat > scripts/load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 25 },   // Increase to 25 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // < 1% failure rate
  },
};

export default function () {
  // Test dashboard
  const dashboard = http.get('https://yard-flow-hitlist.vercel.app/api/dashboards/stats');
  check(dashboard, {
    'dashboard status 200': (r) => r.status === 200,
    'dashboard < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test accounts list
  const accounts = http.get('https://yard-flow-hitlist.vercel.app/api/accounts?limit=25');
  check(accounts, {
    'accounts status 200': (r) => r.status === 200,
    'accounts < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);
}
EOF

# Run load test
k6 run scripts/load-test.js
```

**Expected Results**:
```
✓ dashboard status 200
✓ dashboard < 500ms
✓ accounts status 200
✓ accounts < 300ms

checks.........................: 100.00% ✓ 400 ✗ 0
http_req_duration..............: avg=250ms p(95)=450ms
http_req_failed................: 0.00% ✓ 0 ✗ 400
```

**Monitor Production**:
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const start = Date.now();
  
  const response = NextResponse.next();
  
  const duration = Date.now() - start;
  
  response.headers.set('X-Response-Time', `${duration}ms`);
  
  // Log slow requests
  if (duration > 1000) {
    console.warn(`Slow request: ${request.url} took ${duration}ms`);
  }
  
  return response;
}
```

**Validation**:
- [ ] P95 response time < 500ms under 25 concurrent users
- [ ] No connection pool exhaustion
- [ ] Error rate < 1%
- [ ] Memory usage stable
- [ ] CPU usage < 80%

**Test**:
```bash
# Run load test
k6 run scripts/load-test.js

# Monitor Vercel metrics
vercel logs --follow
```

**Acceptance**: P95 < 500ms under 25 concurrent users

---

## Sprint QA-4 Completion

### Done When:
- [ ] All lists paginated (≤ 50 items per page)
- [ ] 90% of queries < 50ms
- [ ] Bundle size: First Load JS < 100KB
- [ ] All images optimized
- [ ] Caching implemented
- [ ] Load test: P95 < 500ms
- [ ] Lighthouse performance > 90

---

## SPRINT QA-5: Testing Infrastructure (3-4 days)

**Goal**: Build automated testing foundation

### Task QA-5.1: Unit Test Setup with Vitest (3 hours)

**Description**: Configure Vitest for unit testing

**Installation**:
```bash
cd eventops
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

**Configuration**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/types/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Setup File**:
```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock fetch
global.fetch = vi.fn();
```

**Example Tests**:
```typescript
// tests/lib/icp-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateICPScore } from '@/lib/icp-calculator';

describe('ICP Calculator', () => {
  it('should return 100 for perfect match', () => {
    const score = calculateICPScore({
      industry: 'Logistics',
      headquarters: 'United States',
      revenueRange: '$100M-$500M',
      facilityCount: 10,
    });
    
    expect(score).toBe(100);
  });

  it('should return 0 for no match', () => {
    const score = calculateICPScore({
      industry: 'Retail',
      headquarters: 'Unknown',
      revenueRange: 'Unknown',
      facilityCount: 0,
    });
    
    expect(score).toBe(0);
  });

  it('should handle partial matches', () => {
    const score = calculateICPScore({
      industry: 'Logistics',
      headquarters: 'Unknown',
      revenueRange: '$100M-$500M',
      facilityCount: 5,
    });
    
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThan(100);
  });
});
```

```typescript
// tests/lib/email-validator.test.ts
import { describe, it, expect } from 'vitest';
import { isValidEmail, normalizeEmail } from '@/lib/email-validator';

describe('Email Validator', () => {
  it('should validate correct email formats', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
  });

  it('should normalize emails', () => {
    expect(normalizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    expect(normalizeEmail('  user@site.com  ')).toBe('user@site.com');
  });
});
```

```typescript
// tests/components/button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when loading', () => {
    render(<Button loading>Submit</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

**Package.json Scripts**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Validation**:
- [ ] Vitest runs successfully
- [ ] Can import from @/ alias
- [ ] Tests for lib functions pass
- [ ] Component tests work
- [ ] Coverage report generated

**Test**:
```bash
# Run tests
npm test

# Run with UI
npm run test:ui

# Generate coverage
npm run test:coverage
```

**Acceptance**: 20+ unit tests passing

---

### Task QA-5.2: API Integration Tests (4 hours)

**Description**: Test API endpoints with Prisma mocking

**Setup**:
```typescript
// tests/integration/api-test-utils.ts
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { prisma } from '@/lib/db';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: mockDeep<PrismaClient>(),
}));

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});
```

**Example API Tests**:
```typescript
// tests/integration/accounts-api.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/accounts/route';
import { prismaMock } from './api-test-utils';

describe('Accounts API', () => {
  beforeEach(() => {
    // Mock auth
    vi.mock('@/lib/auth', () => ({
      auth: () => Promise.resolve({ user: { email: 'test@example.com' } }),
    }));
  });

  describe('GET /api/accounts', () => {
    it('should return paginated accounts', async () => {
      const mockAccounts = [
        { id: '1', name: 'Company A', eventId: 'event1', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'Company B', eventId: 'event1', createdAt: new Date(), updatedAt: new Date() },
      ];

      prismaMock.targetAccount.findMany.mockResolvedValue(mockAccounts);
      prismaMock.targetAccount.count.mockResolvedValue(2);

      const request = new Request('http://localhost:3000/api/accounts?limit=25');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });

    it('should handle empty results', async () => {
      prismaMock.targetAccount.findMany.mockResolvedValue([]);
      prismaMock.targetAccount.count.mockResolvedValue(0);

      const request = new Request('http://localhost:3000/api/accounts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts).toHaveLength(0);
    });
  });

  describe('POST /api/accounts', () => {
    it('should create new account', async () => {
      const newAccount = {
        name: 'New Company',
        website: 'https://example.com',
        industry: 'Logistics',
      };

      prismaMock.targetAccount.create.mockResolvedValue({
        id: 'new-id',
        ...newAccount,
        eventId: 'event1',
        headquarters: null,
        icpScore: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/accounts', {
        method: 'POST',
        body: JSON.stringify(newAccount),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('New Company');
    });

    it('should validate required fields', async () => {
      const request = new Request('http://localhost:3000/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ website: 'https://example.com' }), // Missing name
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });
});
```

**Test More Endpoints**:
```typescript
// tests/integration/people-api.test.ts
// tests/integration/campaigns-api.test.ts
// tests/integration/outreach-api.test.ts
// tests/integration/dashboards-api.test.ts
```

**Validation**:
- [ ] All CRUD endpoints tested
- [ ] Auth middleware tested
- [ ] Validation logic tested
- [ ] Error handling tested
- [ ] Pagination tested

**Test**:
```bash
npm test tests/integration
```

**Acceptance**: 30+ API integration tests passing

---

### Task QA-5.3: E2E Critical User Journeys (5 hours)

**Description**: Test complete user flows with Playwright

**Installation**:
```bash
npm install -D @playwright/test
npx playwright install
```

**Configuration**:
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Test Utilities**:
```typescript
// tests/e2e/utils/auth.ts
import { Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'casey@freightroll.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}
```

**E2E Test 1: Account Management Journey**:
```typescript
// tests/e2e/account-journey.spec.ts
import { test, expect } from '@playwright/test';
import { login } from './utils/auth';

test.describe('Account Management Journey', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create, view, and delete account', async ({ page }) => {
    // Navigate to accounts
    await page.click('text=Accounts');
    await expect(page).toHaveURL('/dashboard/accounts');

    // Create new account
    await page.click('text=Add Account');
    await page.fill('input[name="name"]', 'Test Company E2E');
    await page.fill('input[name="website"]', 'https://testcompany.com');
    await page.selectOption('select[name="industry"]', 'Logistics');
    await page.click('button[type="submit"]');

    // Verify redirect to accounts list
    await expect(page).toHaveURL('/dashboard/accounts');
    await expect(page.locator('text=Test Company E2E')).toBeVisible();

    // View account detail
    await page.click('text=Test Company E2E');
    await expect(page.locator('h1')).toContainText('Test Company E2E');
    await expect(page.locator('text=https://testcompany.com')).toBeVisible();

    // Delete account
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Confirm")'); // Confirmation modal
    await expect(page).toHaveURL('/dashboard/accounts');
    await expect(page.locator('text=Test Company E2E')).not.toBeVisible();
  });

  test('should generate dossier for account', async ({ page }) => {
    await page.goto('/dashboard/accounts');
    
    // Click first account
    await page.click('tr:nth-child(1) a');
    
    // Generate dossier
    await page.click('text=Generate Dossier');
    
    // Wait for generation
    await expect(page.locator('text=Generating...')).toBeVisible();
    await expect(page.locator('text=Company Overview')).toBeVisible({ timeout: 30000 });
    
    // Verify dossier content
    const overview = await page.locator('[data-testid="company-overview"]').textContent();
    expect(overview).toBeTruthy();
    expect(overview!.length).toBeGreaterThan(50);
  });
});
```

**E2E Test 2: Campaign Creation Journey**:
```typescript
// tests/e2e/campaign-journey.spec.ts
import { test, expect } from '@playwright/test';
import { login } from './utils/auth';

test.describe('Campaign Creation Journey', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create campaign and generate outreach', async ({ page }) => {
    // Create campaign
    await page.click('text=Campaigns');
    await page.click('text=New Campaign');
    
    await page.fill('input[name="name"]', 'Q1 Outreach Campaign');
    await page.fill('textarea[name="description"]', 'Target logistics companies');
    await page.check('input[value="isExecOps"]'); // Target persona
    await page.fill('input[name="minIcpScore"]', '70');
    
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/\w+/);

    // Generate outreach
    await page.click('text=Generate Outreach');
    await page.selectOption('select[name="template"]', 'cold-email-v1');
    await page.click('button:has-text("Generate")');
    
    // Verify outreach created
    await expect(page.locator('text=Outreach generated')).toBeVisible();
    await expect(page.locator('table tr')).toHaveCount(5); // At least some outreach
  });
});
```

**E2E Test 3: CSV Import Journey**:
```typescript
// tests/e2e/import-journey.spec.ts
import { test, expect } from '@playwright/test';
import { login } from './utils/auth';
import path from 'path';

test.describe('CSV Import Journey', () => {
  test('should import CSV with contacts', async ({ page }) => {
    await login(page);

    // Navigate to import
    await page.click('text=Import');
    
    // Upload CSV
    const filePath = path.join(__dirname, 'fixtures', 'test-contacts.csv');
    await page.setInputFiles('input[type="file"]', filePath);
    
    // Wait for preview
    await expect(page.locator('text=Preview Import')).toBeVisible();
    
    // Map columns
    await page.selectOption('select[data-field="name"]', 'Full Name');
    await page.selectOption('select[data-field="email"]', 'Email Address');
    await page.selectOption('select[data-field="title"]', 'Job Title');
    
    // Continue to preview
    await page.click('button:has-text("Continue")');
    await expect(page.locator('table tr')).toHaveCount(11); // 10 rows + header
    
    // Import
    await page.click('button:has-text("Import")');
    
    // Verify success
    await expect(page.locator('text=Successfully imported 10 contacts')).toBeVisible();
    
    // Check people list
    await page.click('text=People');
    // Verify at least one imported person shows up
    await expect(page.locator('table')).toBeVisible();
  });
});
```

**E2E Test 4: Analytics Dashboard Journey**:
```typescript
// tests/e2e/analytics-journey.spec.ts
import { test, expect } from '@playwright/test';
import { login } from './utils/auth';

test.describe('Analytics Dashboard Journey', () => {
  test('should load dashboard and interact with filters', async ({ page }) => {
    await login(page);
    
    // Dashboard loads
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Verify stat cards
    await expect(page.locator('text=Total Accounts')).toBeVisible();
    await expect(page.locator('text=Total Contacts')).toBeVisible();
    await expect(page.locator('text=Active Campaigns')).toBeVisible();
    
    // Navigate to analytics
    await page.click('text=Analytics');
    
    // Apply date filter
    await page.selectOption('select[name="period"]', '30');
    
    // Wait for chart update
    await page.waitForTimeout(500);
    
    // Verify charts visible
    await expect(page.locator('canvas')).toBeVisible();
    
    // Export data
    await page.click('text=Export');
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toContain('.csv');
  });
});
```

**Validation**:
- [ ] Login flow works
- [ ] Account CRUD operations work
- [ ] Campaign creation works
- [ ] CSV import works
- [ ] Analytics loads correctly
- [ ] All tests pass on desktop and mobile

**Test**:
```bash
# Run all E2E tests
npx playwright test

# Run specific test
npx playwright test tests/e2e/account-journey.spec.ts

# Debug mode
npx playwright test --debug

# View report
npx playwright show-report
```

**Acceptance**: 5+ complete user journeys tested end-to-end

---

### Task QA-5.4: Error Scenario Testing (2 hours)

**Description**: Test error handling and edge cases

**Error Scenarios to Test**:

```typescript
// tests/integration/error-scenarios.test.ts
import { describe, it, expect } from 'vitest';

describe('Error Scenarios', () => {
  describe('API Validation Errors', () => {
    it('should reject empty account name', async () => {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('name');
    });

    it('should reject invalid email', async () => {
      const response = await fetch('/api/people', {
        method: 'POST',
        body: JSON.stringify({
          name: 'John Doe',
          email: 'not-an-email',
        }),
      });
      
      expect(response.status).toBe(400);
    });

    it('should reject ICP score out of range', async () => {
      const response = await fetch('/api/accounts/123/override-score', {
        method: 'POST',
        body: JSON.stringify({ score: 150 }),
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('0 and 100');
    });
  });

  describe('Auth Errors', () => {
    it('should return 401 for unauthenticated requests', async () => {
      // Clear session
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      
      const response = await fetch('/api/accounts');
      expect(response.status).toBe(401);
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 for non-existent account', async () => {
      const response = await fetch('/api/accounts/nonexistent-id');
      expect(response.status).toBe(404);
    });
  });

  describe('Duplicate Errors', () => {
    it('should reject duplicate email', async () => {
      // Create first person
      await fetch('/api/people', {
        method: 'POST',
        body: JSON.stringify({
          name: 'John Doe',
          email: 'duplicate@example.com',
        }),
      });

      // Try to create duplicate
      const response = await fetch('/api/people', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'duplicate@example.com',
        }),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      // Make 101 requests (over limit of 100)
      const requests = Array.from({ length: 101 }, () => 
        fetch('/api/accounts')
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Network Errors', () => {
    it('should handle database connection failure', async () => {
      // Mock database down
      vi.mock('@/lib/db', () => ({
        prisma: {
          targetAccount: {
            findMany: () => Promise.reject(new Error('Connection refused')),
          },
        },
      }));

      const response = await fetch('/api/accounts');
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
```

**Validation**:
- [ ] Invalid inputs rejected with 400
- [ ] Unauthorized requests return 401
- [ ] Not found returns 404
- [ ] Duplicates return 409
- [ ] Rate limiting works
- [ ] Network errors handled gracefully

**Test**:
```bash
npm test tests/integration/error-scenarios.test.ts
```

**Acceptance**: 15+ error scenarios tested

---

### Task QA-5.5: CI/CD Integration (2 hours)

**Description**: Run tests on every PR

**GitHub Actions Workflow**:
```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: eventops_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: eventops/package-lock.json
      
      - name: Install dependencies
        working-directory: ./eventops
        run: npm ci
      
      - name: Run linter
        working-directory: ./eventops
        run: npm run lint
      
      - name: Run Prisma generate
        working-directory: ./eventops
        run: npx prisma generate
      
      - name: Run unit tests
        working-directory: ./eventops
        run: npm test -- --run
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/eventops_test
      
      - name: Run E2E tests
        working-directory: ./eventops
        run: npx playwright test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/eventops_test
          NEXTAUTH_URL: http://localhost:3000
          NEXTAUTH_SECRET: test-secret
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: eventops/test-results/
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./eventops/coverage/coverage-final.json
```

**Branch Protection**:
```yaml
# .github/branch-protection.yml
required_status_checks:
  strict: true
  contexts:
    - test
required_pull_request_reviews:
  required_approving_review_count: 1
enforce_admins: false
```

**Validation**:
- [ ] Tests run on every push
- [ ] Tests run on every PR
- [ ] Failed tests block merge
- [ ] Coverage report uploaded
- [ ] Test results visible in PR

**Test**:
```bash
# Create test PR
git checkout -b test/ci-integration
git commit --allow-empty -m "test: CI integration"
git push origin test/ci-integration

# Check GitHub Actions tab
# Should see workflow running
```

**Acceptance**: CI runs tests on every PR

---

## Sprint QA-5 Completion

### Done When:
- [ ] Unit tests: 70%+ coverage on lib functions
- [ ] API tests: All CRUD endpoints tested
- [ ] E2E tests: 5+ user journeys passing
- [ ] Error scenarios: 15+ edge cases tested
- [ ] CI/CD: Tests run on every PR
- [ ] All tests passing in CI

---

## SPRINT QA-6: Security Hardening (2-3 days)

**Goal**: Eliminate security vulnerabilities and protect user data

### Task QA-6.1: Apply Rate Limiting to All Endpoints (1 hour)

**Description**: Protect against abuse and DDoS

**Current State**: Rate limiter created in Sprint 29 ✅

**Apply to All Routes**:

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { RateLimiter } from '@/lib/rate-limiter';

const limiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
});

export async function middleware(request: NextRequest) {
  // Skip rate limiting for static files
  if (request.nextUrl.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    const { allowed, remaining, resetTime } = await limiter.check(ip);
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetTime.toString());
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
  ],
};
```

**Special Limits for Expensive Operations**:
```typescript
// src/app/api/accounts/[id]/research/route.ts
import { RateLimiter } from '@/lib/rate-limiter';

const researchLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 5, // Only 5 AI generations per minute
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limit AI generation
  const { allowed } = await researchLimiter.check(session.user.email);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. AI generation is limited to 5 per minute.' },
      { status: 429 }
    );
  }

  // ... proceed with generation
}
```

**Validation**:
- [ ] Rate limiting headers in all API responses
- [ ] 429 status on excessive requests
- [ ] Different limits for expensive operations
- [ ] IP-based tracking
- [ ] User-based tracking for authenticated routes

**Test**:
```bash
# Test rate limiting
for i in {1..105}; do
  curl http://localhost:3000/api/accounts
done

# Should see 429 after 100 requests

# Check headers
curl -I http://localhost:3000/api/accounts
# Expected:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
```

**Acceptance**: All API routes rate limited

---

### Task QA-6.2: Input Sanitization & Validation (2 hours)

**Description**: Prevent XSS and injection attacks

**Install Sanitizer**:
```bash
npm install dompurify isomorphic-dompurify
npm install -D @types/dompurify
```

**Server-Side Validation**:
```typescript
// src/lib/validation.ts
import { z } from 'zod';

// Account schema
export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().optional(),
  headquarters: z.string().max(255).optional(),
  icpScore: z.number().min(0).max(100).optional(),
  notes: z.string().max(5000).optional(),
});

// Person schema
export const personSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email format').toLowerCase(),
  title: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  accountId: z.string().uuid(),
});

// Campaign schema
export const campaignSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional(),
  targetPersona: z.array(z.string()).min(1, 'Select at least one persona'),
  minIcpScore: z.number().min(0).max(100).default(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).default('DRAFT'),
});

// Outreach schema
export const outreachSchema = z.object({
  subject: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(10000),
  personId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENT', 'OPENED', 'REPLIED']).default('DRAFT'),
});

// Helper function to validate and sanitize
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}
```

**Apply to API Routes**:
```typescript
// src/app/api/accounts/route.ts
import { accountSchema, validateInput } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  
  // Validate input
  const validation = validateInput(accountSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  // Use validated data
  const account = await prisma.targetAccount.create({
    data: {
      ...validation.data,
      eventId: session.user.eventId,
    },
  });

  return NextResponse.json(account, { status: 201 });
}
```

**Client-Side Sanitization** (for rich text):
```typescript
// src/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}

export function stripHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

// Usage in components
import { sanitizeHTML } from '@/lib/sanitize';

function DossierView({ html }: { html: string }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(html) }} />
  );
}
```

**Validation**:
- [ ] All API routes validate input with Zod
- [ ] Rich text sanitized before rendering
- [ ] SQL injection prevented (Prisma escapes automatically)
- [ ] XSS attacks blocked
- [ ] Email addresses normalized to lowercase

**Test**:
```bash
# Test XSS prevention
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(\"XSS\")</script>Company"}'

# Should return 400 or sanitized name

# Test SQL injection (should be safe with Prisma)
curl -X GET "http://localhost:3000/api/accounts?name='; DROP TABLE accounts; --"

# Should not affect database
```

**Acceptance**: All user inputs validated and sanitized

---

### Task QA-6.3: SQL Injection Prevention Audit (1 hour)

**Description**: Verify Prisma prevents SQL injection

**Prisma Safety**:
```typescript
// ✅ SAFE: Prisma parameterizes queries
const account = await prisma.targetAccount.findFirst({
  where: { name: userInput }, // Safe, Prisma escapes
});

// ✅ SAFE: Even with raw queries (use $queryRaw)
const results = await prisma.$queryRaw`
  SELECT * FROM target_accounts WHERE name = ${userInput}
`;
// Prisma uses prepared statements

// ❌ UNSAFE: Never use unsafeQueryRaw with string concatenation
const results = await prisma.$queryRawUnsafe(
  `SELECT * FROM target_accounts WHERE name = '${userInput}'`
);
// DON'T DO THIS!
```

**Audit All Raw Queries**:
```bash
# Search for raw queries
grep -r "\$queryRaw" eventops/src
grep -r "\$executeRaw" eventops/src

# Should return 0 results or only safe parameterized queries
```

**Safe Patterns**:
```typescript
// 1. Dynamic filtering (SAFE)
const where: Prisma.TargetAccountWhereInput = {};
if (industryFilter) {
  where.industry = industryFilter; // Safe
}
const accounts = await prisma.targetAccount.findMany({ where });

// 2. Search (SAFE)
const accounts = await prisma.targetAccount.findMany({
  where: {
    name: {
      contains: searchTerm, // Safe, Prisma escapes
      mode: 'insensitive',
    },
  },
});

// 3. Ordering (SAFE with enum)
const validOrderFields = ['name', 'icpScore', 'createdAt'] as const;
type OrderField = typeof validOrderFields[number];

const orderBy = validOrderFields.includes(orderByParam as OrderField)
  ? { [orderByParam]: 'asc' }
  : { createdAt: 'desc' };

const accounts = await prisma.targetAccount.findMany({ orderBy });
```

**Validation**:
- [ ] No use of `$queryRawUnsafe`
- [ ] No string concatenation in queries
- [ ] Dynamic filters use Prisma types
- [ ] Search uses Prisma contains/search
- [ ] Order by validated against whitelist

**Test**:
```bash
# Attempt SQL injection
curl "http://localhost:3000/api/accounts?name=' OR '1'='1"

# Should return empty or match literal string, not bypass
```

**Acceptance**: No SQL injection vulnerabilities

---

### Task QA-6.4: CORS and Security Headers (1 hour)

**Description**: Configure CORS and security headers

**Next.js Security Headers**:
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Prevent clickjacking
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Prevent MIME sniffing
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block', // Enable XSS filter
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGIN || 'https://yard-flow-hitlist.vercel.app',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400', // 24 hours
          },
        ],
      },
    ];
  },

  // Content Security Policy
  async redirects() {
    return [];
  },
  
  // Strict-Transport-Security (HSTS) in production only
  ...(process.env.NODE_ENV === 'production' && {
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains; preload',
            },
          ],
        },
      ];
    },
  }),
};
```

**Content Security Policy**:
```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // CSP for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
        "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://api.openai.com",
        "frame-ancestors 'none'",
      ].join('; ')
    );
  }
  
  return response;
}
```

**Validation**:
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
- [ ] CORS configured for API
- [ ] CSP configured
- [ ] HSTS enabled in production

**Test**:
```bash
# Check headers
curl -I https://yard-flow-hitlist.vercel.app

# Expected:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000
```

**Acceptance**: Security headers configured

---

### Task QA-6.5: Environment Variable Security (1 hour)

**Description**: Protect secrets and validate config

**Environment Validation**:
```typescript
// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Auth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  
  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  
  // Optional
  HUBSPOT_API_KEY: z.string().optional(),
  APOLLO_API_KEY: z.string().optional(),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// Validate on startup
export const env = validateEnv();

// Usage
import { env } from '@/lib/env';

const apiKey = env.OPENAI_API_KEY; // Type-safe
```

**Prevent Secret Leakage**:
```typescript
// src/app/api/config/route.ts
export async function GET() {
  // ❌ NEVER expose secrets
  return NextResponse.json({
    database: process.env.DATABASE_URL, // BAD!
    apiKey: process.env.OPENAI_API_KEY, // BAD!
  });
  
  // ✅ Only expose safe config
  return NextResponse.json({
    version: '1.0.0',
    features: {
      aiResearch: !!process.env.OPENAI_API_KEY,
      hubspot: !!process.env.HUBSPOT_API_KEY,
    },
  });
}
```

**Gitignore Check**:
```bash
# Ensure .env files ignored
cat .gitignore | grep "\.env"

# Should include:
# .env
# .env.local
# .env.*.local
```

**Validation**:
- [ ] All env vars validated on startup
- [ ] Secrets not exposed in API responses
- [ ] .env files in .gitignore
- [ ] Production env vars in Vercel dashboard
- [ ] No hardcoded secrets in code

**Test**:
```bash
# Test missing env var
unset DATABASE_URL
npm run dev

# Should exit with validation error

# Test invalid env var
export OPENAI_API_KEY="invalid"
npm run dev

# Should exit with validation error
```

**Acceptance**: All environment variables validated

---

### Task QA-6.6: Dependency Audit & Updates (1 hour)

**Description**: Fix known vulnerabilities in dependencies

**Audit Dependencies**:
```bash
cd eventops

# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# For high/critical that can't auto-fix
npm audit fix --force

# Generate report
npm audit --json > security-audit.json
```

**Update Dependencies**:
```bash
# Check outdated packages
npm outdated

# Update to latest safe versions
npm update

# Update Next.js (carefully)
npm install next@latest react@latest react-dom@latest

# Update Prisma
npm install @prisma/client@latest
npm install -D prisma@latest

# Regenerate Prisma client
npx prisma generate
```

**Dependabot Configuration**:
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/eventops"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-username"
    labels:
      - "dependencies"
    
    # Security updates only
    versioning-strategy: increase-if-necessary
    
    # Group updates
    groups:
      production-dependencies:
        patterns:
          - "*"
        exclude-patterns:
          - "@types/*"
          - "eslint*"
          - "prettier"
```

**Validation**:
- [ ] No high/critical vulnerabilities
- [ ] All dependencies up to date
- [ ] Dependabot configured
- [ ] Package-lock.json committed
- [ ] Build still works after updates

**Test**:
```bash
# After updates, verify build
npm run build

# Run tests
npm test

# Check production deployment
vercel --prod
```

**Acceptance**: 0 high/critical vulnerabilities

---

### Task QA-6.7: Authentication & Session Security (2 hours)

**Description**: Harden auth implementation

**Session Configuration**:
```typescript
// src/auth.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Update every hour
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.eventId = user.eventId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.eventId = token.eventId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await verifyPassword(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          eventId: user.eventId,
          role: user.role,
        };
      },
    }),
  ],
});
```

**Password Hashing**:
```typescript
// src/lib/password.ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Validate password strength
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

**Protect API Routes**:
```typescript
// src/app/api/accounts/route.ts
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Ensure user can only access their event's data
  const accounts = await prisma.targetAccount.findMany({
    where: {
      eventId: session.user.eventId, // Data isolation
    },
  });

  return NextResponse.json({ accounts });
}
```

**Validation**:
- [ ] Sessions expire after 24 hours
- [ ] Passwords hashed with bcrypt (12 rounds)
- [ ] Password strength requirements
- [ ] All API routes check auth
- [ ] Data isolation by eventId
- [ ] CSRF protection (NextAuth default)

**Test**:
```bash
# Test weak password
curl -X POST http://localhost:3000/api/auth/register \
  -d '{"email":"test@example.com","password":"weak"}'

# Should reject

# Test session expiry
# Login, wait 24 hours, should require re-login

# Test data isolation
# User A should not see User B's accounts
```

**Acceptance**: Auth hardened with password requirements and session limits

---

## Sprint QA-6 Completion

### Done When:
- [ ] Rate limiting on all endpoints
- [ ] Input validation with Zod
- [ ] No SQL injection vulnerabilities
- [ ] Security headers configured
- [ ] Environment variables validated
- [ ] 0 high/critical vulnerabilities
- [ ] Auth hardened (password requirements, session expiry)
- [ ] Data isolated by eventId

---

## SPRINT QA-7: Observability & Monitoring (2 days)

**Goal**: Detect and diagnose production issues quickly

### Task QA-7.1: Error Tracking with Sentry (2 hours)

**Description**: Capture and alert on production errors

**Installation**:
```bash
cd eventops
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configuration**:
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: 1.0,
  
  // Session replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of errors
  
  environment: process.env.NODE_ENV,
  
  beforeSend(event, hint) {
    // Don't send password fields
    if (event.request?.data) {
      delete event.request.data.password;
    }
    return event;
  },
  
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  
  beforeSend(event) {
    // Filter out noise
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
      return null; // Don't send benign errors
    }
    return event;
  },
});
```

**Capture Errors**:
```typescript
// src/app/api/accounts/route.ts
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    // ... your code
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/accounts',
        method: 'POST',
      },
      extra: {
        body: await request.json(),
      },
    });
    
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
```

**Custom Events**:
```typescript
// Track important business events
Sentry.captureMessage('High-value account created', {
  level: 'info',
  tags: {
    accountId: account.id,
    icpScore: account.icpScore,
  },
});
```

**Validation**:
- [ ] Sentry captures unhandled errors
- [ ] Source maps uploaded for debugging
- [ ] Sensitive data filtered
- [ ] Alerts configured in Sentry dashboard
- [ ] Performance issues tracked

**Test**:
```bash
# Trigger test error
# Add to a page:
<button onClick={() => { throw new Error('Test error'); }}>
  Test Sentry
</button>

# Click button
# Check Sentry dashboard for error
```

**Acceptance**: Production errors captured in Sentry

---

### Task QA-7.2: Performance Monitoring (1 hour)

**Description**: Track Core Web Vitals and API performance

**Web Vitals Tracking**:
```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Custom Performance Tracking**:
```typescript
// src/lib/performance.ts
import * as Sentry from '@sentry/nextjs';

export function trackApiPerformance(
  endpoint: string,
  duration: number,
  status: number
) {
  Sentry.metrics.distribution('api.duration', duration, {
    tags: {
      endpoint,
      status: status.toString(),
    },
    unit: 'millisecond',
  });

  // Alert on slow responses
  if (duration > 1000) {
    Sentry.captureMessage('Slow API response', {
      level: 'warning',
      tags: { endpoint },
      extra: { duration, status },
    });
  }
}

// Usage in API routes
export async function GET(request: NextRequest) {
  const start = Date.now();
  
  try {
    const accounts = await prisma.targetAccount.findMany();
    const duration = Date.now() - start;
    
    trackApiPerformance('/api/accounts', duration, 200);
    
    return NextResponse.json({ accounts });
  } catch (error) {
    const duration = Date.now() - start;
    trackApiPerformance('/api/accounts', duration, 500);
    throw error;
  }
}
```

**Database Query Performance**:
```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
  ],
});

// Track slow queries
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    Sentry.captureMessage('Slow database query', {
      level: 'warning',
      extra: {
        query: e.query,
        duration: e.duration,
        params: e.params,
      },
    });
  }
});

export { prisma };
```

**Validation**:
- [ ] Core Web Vitals tracked
- [ ] API performance metrics sent to Sentry
- [ ] Slow queries logged
- [ ] Dashboard shows performance trends
- [ ] Alerts on performance degradation

**Test**:
```bash
# Check Vercel Analytics dashboard
# Check Sentry Performance tab
# Should see metrics for:
# - LCP (Largest Contentful Paint)
# - FID (First Input Delay)
# - CLS (Cumulative Layout Shift)
```

**Acceptance**: Performance metrics tracked

---

### Task QA-7.3: Business Metrics Dashboard (2 hours)

**Description**: Track KPIs and usage metrics

**Metrics to Track**:
```typescript
// src/lib/metrics.ts
import { prisma } from '@/lib/db';

export async function getDailyMetrics(date: Date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const [
    accountsCreated,
    peopleAdded,
    dossiersGenerated,
    campaignsCreated,
    outreachSent,
    meetingsBooked,
  ] = await Promise.all([
    prisma.targetAccount.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    
    prisma.person.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    
    prisma.targetAccount.count({
      where: {
        researchData: { not: null },
        updatedAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    
    prisma.campaign.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    
    prisma.outreach.count({
      where: {
        status: 'SENT',
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    
    prisma.meetings.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
  ]);

  return {
    date,
    accountsCreated,
    peopleAdded,
    dossiersGenerated,
    campaignsCreated,
    outreachSent,
    meetingsBooked,
  };
}

// Store metrics in database
export async function recordDailyMetrics() {
  const metrics = await getDailyMetrics();
  
  // Could store in a metrics table or send to analytics service
  console.log('Daily Metrics:', metrics);
  
  return metrics;
}
```

**Scheduled Job** (using Vercel Cron):
```typescript
// src/app/api/cron/daily-metrics/route.ts
import { recordDailyMetrics } from '@/lib/metrics';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const metrics = await recordDailyMetrics();
  
  return NextResponse.json({ success: true, metrics });
}
```

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-metrics",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Admin Dashboard**:
```typescript
// src/app/dashboard/admin/metrics/page.tsx
'use client';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    fetch('/api/metrics/daily')
      .then(r => r.json())
      .then(setMetrics);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Business Metrics</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard title="Accounts Created" value={metrics[0]?.accountsCreated || 0} />
        <MetricCard title="Dossiers Generated" value={metrics[0]?.dossiersGenerated || 0} />
        <MetricCard title="Outreach Sent" value={metrics[0]?.outreachSent || 0} />
      </div>

      <table className="w-full">
        <thead>
          <tr>
            <th>Date</th>
            <th>Accounts</th>
            <th>People</th>
            <th>Dossiers</th>
            <th>Campaigns</th>
            <th>Outreach</th>
            <th>Meetings</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m: any) => (
            <tr key={m.date}>
              <td>{new Date(m.date).toLocaleDateString()}</td>
              <td>{m.accountsCreated}</td>
              <td>{m.peopleAdded}</td>
              <td>{m.dossiersGenerated}</td>
              <td>{m.campaignsCreated}</td>
              <td>{m.outreachSent}</td>
              <td>{m.meetingsBooked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Validation**:
- [ ] Daily metrics calculated
- [ ] Cron job runs daily
- [ ] Admin dashboard shows trends
- [ ] KPIs tracked over time

**Test**:
```bash
# Manually trigger cron
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://yard-flow-hitlist.vercel.app/api/cron/daily-metrics

# Check response
# Visit /dashboard/admin/metrics
```

**Acceptance**: Business metrics tracked daily

---

### Task QA-7.4: Health Check Endpoints (1 hour)

**Description**: Monitor system health

**Health Check API**:
```typescript
// src/app/api/health/route.ts
import { prisma } from '@/lib/db';

export async function GET() {
  const checks = {
    database: false,
    openai: false,
    timestamp: new Date().toISOString(),
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // Check OpenAI (optional)
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      });
      checks.openai = response.ok;
    } catch (error) {
      console.error('OpenAI health check failed:', error);
    }
  }

  const isHealthy = checks.database;
  const status = isHealthy ? 200 : 503;

  return NextResponse.json(checks, { status });
}
```

**Detailed Health Check**:
```typescript
// src/app/api/health/detailed/route.ts
export async function GET() {
  const [
    accountCount,
    personCount,
    campaignCount,
    outreachCount,
  ] = await Promise.all([
    prisma.targetAccount.count(),
    prisma.person.count(),
    prisma.campaign.count(),
    prisma.outreach.count(),
  ]);

  const uptime = process.uptime();

  return NextResponse.json({
    status: 'healthy',
    uptime: `${Math.floor(uptime / 60)} minutes`,
    database: {
      connected: true,
      tables: {
        accounts: accountCount,
        people: personCount,
        campaigns: campaignCount,
        outreach: outreachCount,
      },
    },
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    },
  });
}
```

**Validation**:
- [ ] /api/health returns 200 when healthy
- [ ] Returns 503 when database down
- [ ] /api/health/detailed shows system stats
- [ ] Can integrate with uptime monitoring service

**Test**:
```bash
# Check health
curl http://localhost:3000/api/health

# Expected:
# {"database":true,"openai":true,"timestamp":"2024-01-21T..."}

# Detailed health
curl http://localhost:3000/api/health/detailed
```

**Acceptance**: Health check endpoints operational

---

### Task QA-7.5: Logging Strategy (1 hour)

**Description**: Structured logging for production debugging

**Logger Utility**:
```typescript
// src/lib/logger.ts
import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  eventId?: string;
  accountId?: string;
  [key: string]: any;
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const logData = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Console in development
    if (process.env.NODE_ENV === 'development') {
      console[level === 'debug' ? 'log' : level](JSON.stringify(logData, null, 2));
    }

    // Send to external service in production
    if (process.env.NODE_ENV === 'production') {
      if (level === 'error') {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: context,
        });
      } else if (level === 'warn') {
        Sentry.captureMessage(message, {
          level: 'warning',
          extra: context,
        });
      }
      
      // Could also send to log aggregation service
      // await sendToLogService(logData);
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, {
      ...context,
      error: error?.message,
      stack: error?.stack,
    });
  }
}

export const logger = new Logger();

// Usage
logger.info('Account created', {
  accountId: '123',
  userId: 'abc',
  icpScore: 85,
});

logger.error('Failed to generate dossier', error, {
  accountId: '123',
  attempts: 3,
});
```

**Use in API Routes**:
```typescript
// src/app/api/accounts/route.ts
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const session = await auth();
  
  logger.info('Creating account', {
    userId: session.user.id,
    eventId: session.user.eventId,
  });

  try {
    const account = await prisma.targetAccount.create({/* ... */});
    
    logger.info('Account created successfully', {
      accountId: account.id,
      name: account.name,
    });

    return NextResponse.json(account);
  } catch (error) {
    logger.error('Failed to create account', error as Error, {
      userId: session.user.id,
    });
    
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
```

**Validation**:
- [ ] Structured logs with context
- [ ] Errors sent to Sentry
- [ ] Production logs queryable
- [ ] Debug logs only in development
- [ ] Sensitive data not logged

**Test**:
```bash
# Development: Check console
npm run dev

# Production: Check Sentry breadcrumbs
# Visit Sentry > Issues > Select error > Breadcrumbs
```

**Acceptance**: Structured logging implemented

---

## Sprint QA-7 Completion

### Done When:
- [ ] Sentry captures production errors
- [ ] Performance metrics tracked (Web Vitals)
- [ ] Business metrics dashboard operational
- [ ] Health check endpoints working
- [ ] Structured logging implemented
- [ ] Uptime monitoring configured

---

## ORIGINAL ROADMAP SPRINTS (18, 20-24)

The following sprints are from the original roadmap and should be implemented after QA stabilization is complete.

---

## SPRINT 18: Google Workspace Integration (5 days)

**Goal**: Sync calendar, import contacts, integrate Gmail

### Task 18.1: Google OAuth Setup (3 hours)

**Description**: Enable Google sign-in and API access

**Installation**:
```bash
npm install next-auth google-auth-library googleapis
```

**Configuration**:
```typescript
// src/auth.ts
import GoogleProvider from 'next-auth/providers/google';

export const { handlers, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/contacts.readonly',
            'https://www.googleapis.com/auth/gmail.send',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    // ... existing providers
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
  },
});
```

**Validation**:
- [ ] Google OAuth flow works
- [ ] Access token stored in session
- [ ] Refresh token persisted
- [ ] Required scopes granted

---

### Task 18.2: Google Calendar Sync (4 hours)

**Description**: Two-way sync with Google Calendar

**Implementation**:
```typescript
// src/lib/google-calendar.ts
import { google } from 'googleapis';
import { auth } from '@/auth';

async function getCalendarClient() {
  const session = await auth();
  if (!session?.accessToken) throw new Error('Not authenticated');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function createMeetingInGoogle(meeting: {
  title: string;
  start: Date;
  end: Date;
  attendees: string[];
  description?: string;
}) {
  const calendar = await getCalendarClient();

  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: meeting.title,
      description: meeting.description,
      start: {
        dateTime: meeting.start.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: meeting.end.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
      attendees: meeting.attendees.map(email => ({ email })),
    },
  });

  return event.data;
}

export async function syncMeetingsFromGoogle(since: Date) {
  const calendar = await getCalendarClient();

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: since.toISOString(),
    maxResults: 100,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items || [];
}
```

**API Route**:
```typescript
// src/app/api/google/calendar/sync/route.ts
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const since = new Date();
  since.setDate(since.getDate() - 30); // Last 30 days

  const events = await syncMeetingsFromGoogle(since);

  // Save to database
  for (const event of events) {
    await prisma.meetings.upsert({
      where: { googleEventId: event.id },
      create: {
        title: event.summary || 'Untitled',
        scheduledAt: new Date(event.start.dateTime || event.start.date),
        googleEventId: event.id,
        attendees: event.attendees?.map(a => a.email) || [],
        eventId: session.user.eventId,
      },
      update: {
        title: event.summary || 'Untitled',
        scheduledAt: new Date(event.start.dateTime || event.start.date),
      },
    });
  }

  return NextResponse.json({ success: true, synced: events.length });
}
```

---

### Task 18.3: Google Contacts Import (3 hours)

Similar pattern for importing contacts from Google...

---

## SPRINT 20-24 SUMMARIES

Due to length, I'll provide summaries for the remaining sprints:

### SPRINT 20: Enhanced Analytics (4 days)
- Funnel visualization (prospect → meeting → deal)
- Heatmap of engagement by industry/persona
- Predictive scoring with ML
- Campaign comparison A/B test results
- Cohort analysis

### SPRINT 21: Mobile Optimization (3 days)
- PWA configuration
- Offline sync with service workers
- Mobile-optimized UI (bottom nav, swipe gestures)
- Push notifications
- Quick actions (shortcuts)

### SPRINT 22: Testing & Quality (4 days)
- 80%+ code coverage
- Visual regression testing
- Load testing (100+ concurrent users)
- Accessibility audit (WCAG AAA)
- Performance optimization

### SPRINT 23: Security & Compliance (3 days)
- Data encryption at rest
- Audit trail for all mutations
- RBAC (role-based access control)
- SOC 2 preparation
- GDPR compliance (data export, deletion)

### SPRINT 24: Documentation (2 days)
- User guide with screenshots
- API documentation (OpenAPI spec)
- Developer onboarding guide
- Video tutorials
- Troubleshooting FAQ

---

## DEPLOYMENT CHECKLIST

Before deploying to production:

### Pre-Deployment
- [ ] All QA sprints (0-7) complete
- [ ] All tests passing
- [ ] No high/critical vulnerabilities
- [ ] Database backup created
- [ ] Environment variables configured
- [ ] Feature flags enabled

### Deployment
- [ ] Run: `npm run build`
- [ ] Verify: No errors in build
- [ ] Run: `npm run test`
- [ ] Verify: All tests pass
- [ ] Run: `vercel --prod`
- [ ] Verify: Deployment successful
- [ ] Smoke test: Visit production URL
- [ ] Verify: Dashboard loads
- [ ] Verify: Auth works
- [ ] Verify: CRUD operations work

### Post-Deployment
- [ ] Monitor Sentry for errors
- [ ] Check Vercel Analytics
- [ ] Verify health check: /api/health
- [ ] Monitor database performance
- [ ] Check rate limiting logs
- [ ] Announce to users

### Rollback Plan
If issues detected:
1. `vercel rollback` to previous deployment
2. Investigate errors in Sentry
3. Fix issues in development
4. Redeploy with fixes

---

## TIMELINE SUMMARY

**QA & Stabilization**: 12-17 days
- QA-0: 1 day
- QA-1: 2 days
- QA-2: 2 days
- QA-3: 2-3 days
- QA-4: 2-3 days
- QA-5: 3-4 days
- QA-6: 2-3 days
- QA-7: 2 days

**Original Roadmap**: 21 days
- Sprint 18: 5 days
- Sprint 20: 4 days
- Sprint 21: 3 days
- Sprint 22: 4 days
- Sprint 23: 3 days
- Sprint 24: 2 days

**Total**: ~33-38 days to production-ready

---

## SUCCESS METRICS

### Technical Metrics
- Build time: < 2 minutes
- Test coverage: > 70%
- Lighthouse score: > 90
- P95 API latency: < 500ms
- Error rate: < 0.1%
- Uptime: > 99.9%

### Business Metrics
- Accounts created per day
- Dossiers generated per day
- Outreach sent per day
- Meetings booked per day
- Campaign conversion rate
- User engagement (DAU/MAU)

---

## NEXT STEPS

1. **Fix Prisma Model Bug** (CRITICAL)
   - Rename `model meetings` → `model Meeting` with `@@map("meetings")`
   - OR update all 15 files to use `prisma.meetings`

2. **Execute QA-0** (IMMEDIATE)
   - Create production database backup
   - Setup feature flags
   - Document baseline metrics
   - Test hotfix deployment

3. **Run QA-1 through QA-7** (2-3 weeks)
   - Follow task list above
   - Mark each task complete
   - Validate with test procedures
   - Deploy fixes incrementally

4. **Implement Sprint 18-24** (3-4 weeks)
   - After QA complete
   - One sprint at a time
   - Test thoroughly
   - Deploy to staging first

5. **Production Launch**
   - Final QA pass
   - Load testing
   - User acceptance testing
   - Staged rollout

---

**End of QA & Stabilization Plan**

This plan contains **6+ sprints**, **50+ atomic tasks**, and **comprehensive testing procedures** to bring YardFlow to production-ready state.
