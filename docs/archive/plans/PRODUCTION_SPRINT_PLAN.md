# EventOps Production Sprint Plan
**Generated:** January 22, 2026  
**Project:** EventOps - Event Intelligence Platform  
**Production URL:** https://yard-flow-hitlist.vercel.app  
**Status:** 🔴 PRODUCTION BROKEN - 63+ TypeScript Errors  

---

## 🚨 Executive Summary

**Current State:** Production deployment failing with TypeScript compilation errors. People detail page and several other features non-functional.

**Root Cause:** Schema-code misalignment from rapid feature development. Code references non-existent Prisma relations and fields.

**Strategy:** Fix critical blockers first (schema), then data completeness, then polish.

**Timeline:** 8-12 days across 4 sprints  
**Risk:** LOW (schema changes are additive, backwards compatible)

---

## 📊 Error Analysis

### By Severity
- **BLOCKER** (18 errors): Schema relation mismatches, model casing issues
- **HIGH** (27 errors): Missing fields breaking business logic  
- **MEDIUM** (15 errors): Query syntax errors, type safety issues
- **LOW** (3 errors): Incomplete features, optimization opportunities

### By Category
1. **Schema Relations** - 12 files affected - `account`, `person`, `dossier` relations
2. **Model Casing** - 8 files affected - `Meeting` vs `meeting`, `auditLog`
3. **Missing Fields** - 15 files affected - tier, revenue, icpScore, etc.
4. **UI Components** - 3 files affected - avatar, tooltip, separator
5. **Query Syntax** - 10 files affected - Wrong where/include clauses
6. **Type Safety** - 5 files affected - Implicit any types
7. **Incomplete Features** - 4 files affected - Sequences, audit logging

---

## 🎯 Sprint Breakdown

---

## **SPRINT 0: Emergency Stabilization** (1-2 days)
**Goal:** Get production working. Fix all BLOCKER issues.  
**Demo:** People page loads, no TypeScript errors, successful deployment

### Task S0-T01: Fix Prisma Schema Relations
**Priority:** BLOCKER  
**Complexity:** MODERATE  
**Estimated Time:** 2 hours

**Problem:**
- Code expects `people.target_accounts` but includes `{ account: true }`
- Code expects `target_accounts.company_dossiers` but includes `{ dossier: true }`
- Code expects `outreach.people` but includes `{ person: true }`

**Solution:**
Update `eventops/prisma/schema.prisma` to add explicit relation names matching code expectations:

```prisma
model target_accounts {
  id           String   @id @default(cuid())
  // ... existing fields ...
  
  // EXISTING (keep)
  people       people[] // Already exists
  
  // ADD THESE ALIASES
  account      target_accounts[] @relation("AccountSelf") // For backwards compat
  dossier      company_dossiers? // Singular relation
}

model people {
  id           String   @id @default(cuid())
  accountId    String
  // ... existing fields ...
  
  // EXISTING (keep)
  target_accounts target_accounts @relation(fields: [accountId], references: [id], onDelete: Cascade)
  
  // ADD THIS ALIAS
  account      target_accounts @relation("PeopleAccount", fields: [accountId], references: [id])
}

model outreach {
  id           String   @id @default(cuid())
  personId     String
  // ... existing fields ...
  
  // EXISTING (keep)
  people       people @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  // ADD THIS ALIAS  
  person       people @relation("OutreachPerson", fields: [personId], references: [id])
}

model company_dossiers {
  id           String   @id @default(cuid())
  accountId    String   @unique // Make this unique for 1:1 relation
  // ... existing fields ...
  
  target_accounts target_accounts @relation(fields: [accountId], references: [id])
}
```

**Commands:**
```bash
cd eventops
npx prisma format
npx prisma validate
npx prisma migrate dev --name add_relation_aliases
npx prisma generate
```

**Validation:**
- [ ] `npx prisma validate` passes
- [ ] Migration generated successfully
- [ ] No breaking changes to existing data
- [ ] Relations appear in Prisma Client types

**Acceptance:** TypeScript autocomplete shows both `people.account` and `people.target_accounts`

---

### Task S0-T02: Fix Model Name Casing
**Priority:** BLOCKER  
**Complexity:** SIMPLE  
**Estimated Time:** 30 minutes

**Problem:**
- Code uses `prisma.Meeting` but schema defines `model meeting` (lowercase)
- Code uses `prisma.auditLog` but this model doesn't exist

**Solution:**

**Option A (Preferred):** Fix code to match schema
```bash
# Find all instances
grep -r "prisma.Meeting" eventops/src
grep -r "prisma.auditLog" eventops/src

# Files to fix:
# - src/app/api/reports/pdf/route.ts (line 40)
# - src/app/api/export/full/route.ts (line 50)
# - src/app/api/dashboards/stats/route.ts (line 107)
```

**Changes:**
```typescript
// BEFORE
const meetings = await prisma.Meeting.count({ ... });
const logs = await prisma.auditLog.findMany({ ... });

// AFTER  
const meetings = await prisma.meeting.count({ ... });
// Remove auditLog - doesn't exist, use activities table instead
const logs = await prisma.activities.findMany({
  orderBy: { createdAt: 'desc' },
  take: 20,
});
```

**Validation:**
- [ ] `npm run build` in eventops directory
- [ ] No "Property 'Meeting' does not exist" errors
- [ ] No "Property 'auditLog' does not exist" errors

**Acceptance:** All Prisma model references use correct casing

---

### Task S0-T03: Fix People Detail Page API
**Priority:** BLOCKER  
**Complexity:** SIMPLE  
**Estimated Time:** 15 minutes

**Problem:**
`src/app/api/people/[id]/route.ts` line 36 includes `dossier` on `target_accounts` before relation exists.

**Solution:**
```typescript
// File: eventops/src/app/api/people/[id]/route.ts

// BEFORE (lines 32-41)
const person = await prisma.people.findUnique({
  where: { id: params.id },
  include: {
    target_accounts: {
      include: {
        dossier: true, // ERROR: dossier relation doesn't exist yet
      },
    },
    insights: true,
  },
});

// AFTER
const person = await prisma.people.findUnique({
  where: { id: params.id },
  include: {
    target_accounts: true, // Just get the account, no nested include
    insights: true,
  },
});

// If you need dossier data, fetch separately:
const dossier = person?.target_accounts 
  ? await prisma.company_dossiers.findUnique({
      where: { accountId: person.target_accounts.id }
    })
  : null;
```

**Validation:**
- [ ] Visit `/dashboard/people/<any-id>` in production
- [ ] Page loads without "Failed to load person details" alert
- [ ] Person data displays correctly
- [ ] No console errors

**Acceptance:** People detail page loads successfully

---

### Task S0-T04: Fix People Detail Page Client Code
**Priority:** BLOCKER  
**Complexity:** SIMPLE  
**Estimated Time:** 10 minutes

**Problem:**
`src/app/dashboard/people/[id]/page.tsx` line 45 uses `data.people.accountId` instead of `data.person.accountId`

**Solution:**
```typescript
// File: eventops/src/app/dashboard/people/[id]/page.tsx

// BEFORE (line 45)
const roiRes = await fetch(`/api/roi/calculate?accountId=${data.people.accountId}`);

// AFTER
const roiRes = await fetch(`/api/roi/calculate?accountId=${data.person.accountId}`);
```

**Validation:**
- [ ] ROI calculator loads on people detail page
- [ ] No console error about "data.people is undefined"

**Acceptance:** No client-side errors on people page

---

### Task S0-T05: Install Missing UI Components
**Priority:** HIGH  
**Complexity:** SIMPLE  
**Estimated Time:** 20 minutes

**Problem:**
Missing `avatar`, `tooltip`, `separator` shadcn components referenced in code.

**Solution:**
```bash
cd eventops

# Install missing components
npx shadcn@latest add avatar
npx shadcn@latest add tooltip  
npx shadcn@latest add separator

# Verify imports work
npm run build
```

**Affected Files:**
- `src/components/team/presence-indicator.tsx` (avatar, tooltip)
- `src/app/dashboard/reports/builder/page.tsx` (separator)

**Validation:**
- [ ] Components created in `src/components/ui/`
- [ ] No "Cannot find module" errors for these components
- [ ] Build succeeds

**Acceptance:** All UI component imports resolve

---

### Task S0-T06: Deploy and Smoke Test
**Priority:** BLOCKER  
**Complexity:** SIMPLE  
**Estimated Time:** 30 minutes

**Solution:**
```bash
cd eventops
npm run build  # Verify local build works
git add -A
git commit -m "fix: resolve schema mismatches and model casing (Sprint 0)"
git push origin main

# Wait for Vercel deployment (2-3 min)
# Then smoke test
```

**Smoke Test Checklist:**
- [ ] Dashboard loads
- [ ] Accounts list loads
- [ ] Account detail page loads
- [ ] People list loads
- [ ] **People detail page loads (CRITICAL)**
- [ ] Outreach list loads
- [ ] Meetings list loads
- [ ] Reports page loads
- [ ] No console errors on any page

**Validation:**
- [ ] Vercel build succeeds
- [ ] All smoke tests pass
- [ ] No JavaScript errors in production console
- [ ] TypeScript error count: 0 (from 63+)

**Acceptance:** Production is stable and usable

---

**Sprint 0 Deliverables:**
✅ Schema relations fixed  
✅ Model casing corrected  
✅ People page working  
✅ UI components installed  
✅ Production deployed and stable  
✅ TypeScript error count: 0

**Sprint 0 Risks:**
- **Schema Migration Risk:** LOW - All changes are additive
- **Data Loss Risk:** NONE - No data deletion or modification
- **Rollback Plan:** `git revert <commit>`, rollback Prisma migration

---

## **SPRINT 1: Data Completeness** (2-3 days)
**Goal:** Add missing fields to enable full feature functionality  
**Demo:** Export works, ICP scoring persists, tier/status filtering works

### Task S1-T01: Add Missing Account Fields
**Priority:** HIGH  
**Complexity:** MODERATE  
**Estimated Time:** 1 hour

**Problem:**
Code references fields that don't exist: `tier`, `revenue`, `location`, `employeeCount`

**Solution:**
```prisma
// File: eventops/prisma/schema.prisma

model target_accounts {
  id              String   @id @default(cuid())
  eventId         String
  name            String
  website         String?
  industry        String?
  headquarters    String?
  icpScore        Int?
  notes           String?
  assignedTo      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // ADD THESE FIELDS
  tier            String?   // 'A', 'B', 'C', 'D' for account prioritization
  status          String?   // 'PROSPECTING', 'ENGAGED', 'MEETING_SCHEDULED', 'WON', 'LOST'
  revenue         Float?    // Annual revenue in USD
  location        String?   // Full address or city/state
  employeeCount   Int?      // Number of employees
  
  // ... existing relations ...
}
```

**Commands:**
```bash
cd eventops
npx prisma format
npx prisma migrate dev --name add_account_fields
npx prisma generate
```

**Affected Features:**
- Account filtering by tier/status
- Export to CSV (full data)
- ICP scoring algorithm (uses employeeCount, revenue)
- Account detail view

**Affected Files (will now work):**
- `src/app/api/export/full/route.ts` (lines 83-87)
- `src/app/api/ai/score-icp/route.ts` (scoring algorithm)
- `src/components/accounts-filters.tsx` (tier/status dropdowns)

**Validation:**
- [ ] Migration runs successfully
- [ ] Fields appear in Prisma Studio
- [ ] Can set tier/status via UI
- [ ] Export includes new fields
- [ ] No null constraint violations

**Acceptance:** Accounts table has all required fields for business logic

---

### Task S1-T02: Add People ICP Score Field
**Priority:** HIGH  
**Complexity:** SIMPLE  
**Estimated Time:** 30 minutes

**Problem:**
AI scoring endpoint calculates `icpScore` for people but can't persist it.

**Solution:**
```prisma
// File: eventops/prisma/schema.prisma

model people {
  id           String   @id @default(cuid())
  accountId    String
  name         String
  title        String?
  email        String?
  phone        String?
  linkedin     String?
  notes        String?
  isExecOps    Boolean  @default(false)
  isOps        Boolean  @default(false)
  isProc       Boolean  @default(false)
  isSales      Boolean  @default(false)
  isTech       Boolean  @default(false)
  isNonOps     Boolean  @default(false)
  assignedTo   String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // ADD THIS FIELD
  icpScore     Int?     // 0-100 ICP match score
  
  // ... existing relations ...
}
```

**Commands:**
```bash
cd eventops
npx prisma migrate dev --name add_people_icp_score
npx prisma generate
```

**Affected Files:**
- `src/app/api/ai/score-icp/route.ts` (can now persist people scores)
- People list view (can show/sort by score)

**Validation:**
- [ ] Migration succeeds
- [ ] POST `/api/ai/score-icp` updates `people.icpScore`
- [ ] People list can sort by ICP score
- [ ] Score displays in people detail view

**Acceptance:** People ICP scores persist and display correctly

---

### Task S1-T03: Add Sequences State Fields
**Priority:** MEDIUM  
**Complexity:** MODERATE  
**Estimated Time:** 1 hour

**Problem:**
Sequence automation code expects fields: `status`, `currentStep`, `lastStepDate`, `personId`

**Decision:** Two options:

**Option A - Complete Feature (Recommended if sequences are needed):**
```prisma
model sequences {
  id             String   @id @default(cuid())
  name           String
  description    String?
  steps          String   // JSON array of steps
  isActive       Boolean  @default(true)
  campaignId     String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  // ADD THESE
  status         String   @default("ACTIVE")  // ACTIVE, PAUSED, COMPLETED
  currentStep    Int      @default(0)         // Current step index
  lastStepDate   DateTime?                     // When last step executed
  personId       String?                       // Person in sequence
  
  campaign       campaigns? @relation(fields: [campaignId], references: [id])
  person         people?    @relation(fields: [personId], references: [id])
}
```

**Option B - Stub Feature (If sequences not needed now):**
```typescript
// File: src/app/api/cron/sequences/route.ts

export async function GET(req: NextRequest) {
  // TODO: Implement sequence automation when needed
  return NextResponse.json({ 
    message: "Sequence automation not yet implemented",
    executed: 0 
  });
}
```

**Recommendation:** Use Option B for Sprint 1, defer to Sprint 3 if needed.

**Validation (if Option A):**
- [ ] Migration succeeds
- [ ] Sequence cron job runs without errors
- [ ] Sequences progress through steps
- [ ] Email sent at correct intervals

**Acceptance:** Sequences either fully functional or gracefully stubbed

---

### Task S1-T04: Fix Export Full Data
**Priority:** HIGH  
**Complexity:** MODERATE  
**Estimated Time:** 1 hour

**Problem:**
`src/app/api/export/full/route.ts` has multiple schema errors preventing CSV export.

**Solution:**
Apply all fixes from S1-T01 and S1-T02, then fix relation references:

```typescript
// File: eventops/src/app/api/export/full/route.ts

// BEFORE (line 36)
include: { account: true, outreach: true, Meeting: true },

// AFTER
include: { 
  target_accounts: true,  // Use correct relation name
  outreach: true, 
  meeting: true           // Lowercase model name
},

// BEFORE (line 46)
people: { include: { account: true } },

// AFTER
people: { include: { target_accounts: true } },

// BEFORE (line 50)
const meetings = await prisma.Meeting.findMany({

// AFTER
const meetings = await prisma.meeting.findMany({

// BEFORE (line 97 - accountName from relation)
accountName: p.account.name,

// AFTER
accountName: p.target_accounts.name,

// BEFORE (lines 98-104 - wrong persona fields)
icpScore: p.icpScore,        // Now exists (from S1-T02)
isSupplyChain: p.isSupplyChain,  // Remove - doesn't exist
isITTech: p.isITTech,            // Remove - doesn't exist
isProcurement: p.isProcurement,  // Remove - doesn't exist
isFacilities: p.isFacilities,    // Remove - doesn't exist

// AFTER (use actual schema fields)
icpScore: p.icpScore,
isExecOps: p.isExecOps,
isOps: p.isOps,
isProc: p.isProc,
isSales: p.isSales,
isTech: p.isTech,
isNonOps: p.isNonOps,

// BEFORE (line 109-110)
personName: o.people.name,
accountName: o.people.account.name,

// AFTER (need to include person in outreach query)
// Fix at line 41 - include people relation:
include: {
  people: {
    include: { target_accounts: true }
  }
},

// Then:
personName: o.people.name,
accountName: o.people.target_accounts.name,
```

**Complete Fixed Query:**
```typescript
// Around line 36
const people = await prisma.people.findMany({
  where: { accountId: { in: accounts.map(a => a.id) } },
  include: { 
    target_accounts: true,
    outreach: true, 
    meeting: true
  },
});

const outreach = await prisma.outreach.findMany({
  where: { personId: { in: people.map(p => p.id) } },
  include: {
    people: {
      include: { target_accounts: true }
    }
  }
});

const meetings = await prisma.meeting.findMany({
  where: { personId: { in: people.map(p => p.id) } },
  include: {
    people: { include: { target_accounts: true } }
  },
});
```

**Validation:**
- [ ] POST `/api/export/full` with `format=csv` returns CSV file
- [ ] CSV includes all accounts, people, outreach, meetings
- [ ] All persona fields present
- [ ] Relation fields (accountName) populated correctly
- [ ] Download works in browser

**Acceptance:** Full data export generates complete CSV/JSON without errors

---

### Task S1-T05: Fix Analytics Heatmap
**Priority:** MEDIUM  
**Complexity:** SIMPLE  
**Estimated Time:** 20 minutes

**Problem:**
`src/app/api/analytics/heatmap/route.ts` uses `person: { ... }` instead of `personId: { ... }`

**Solution:**
```typescript
// File: eventops/src/app/api/analytics/heatmap/route.ts

// BEFORE (line 32)
const outreach = await prisma.outreach.findMany({
  where: {
    person: {  // ERROR: 'person' is not a valid filter
      accountId: { in: accountIds },
    },
    sentAt: { gte: startDate, lte: endDate },
  },
});

// AFTER
const outreach = await prisma.outreach.findMany({
  where: {
    people: {  // Use the relation name
      accountId: { in: accountIds },
    },
    sentAt: { gte: startDate, lte: endDate },
  },
});
```

**Validation:**
- [ ] GET `/api/analytics/heatmap?eventId=<id>` returns data
- [ ] Heatmap component renders on analytics page
- [ ] No console errors

**Acceptance:** Engagement heatmap displays without errors

---

### Task S1-T06: Fix PDF Report Generation
**Priority:** MEDIUM  
**Complexity:** MODERATE  
**Estimated Time:** 45 minutes

**Problem:**
`src/app/api/reports/pdf/route.ts` has model casing, relation errors, and incorrect aggregation.

**Solution:**
```typescript
// File: eventops/src/app/api/reports/pdf/route.ts

// Fix 1: Model casing (line 40)
const meetings = await prisma.meeting.count({  // Lowercase
  where: { eventId },
});

// Fix 2: Relation filter (line 51)
const outreach = await prisma.outreach.findMany({
  where: {
    people: {  // Not 'person'
      accountId: { in: accountIds },
    },
  },
  include: {
    _count: {
      select: {
        // This is wrong - outreach doesn't have nested counts
        // Remove _count entirely
      }
    }
  }
});

// Fix 3: Simplify aggregation
const outreach = await prisma.outreach.findMany({
  where: {
    people: {
      accountId: { in: accountIds },
    },
  },
  select: {
    status: true,
    openedAt: true,
    clickedAt: true,
    repliedAt: true,
  }
});

const totalSent = outreach.filter(o => o.status !== 'DRAFT').length;
const opened = outreach.filter(o => o.openedAt !== null).length;
const replied = outreach.filter(o => o.repliedAt !== null).length;

const openRate = totalSent > 0 ? ((opened / totalSent) * 100).toFixed(1) : '0';
const replyRate = totalSent > 0 ? ((replied / totalSent) * 100).toFixed(1) : '0';
```

**Validation:**
- [ ] POST `/api/reports/pdf` with `eventId` returns HTML
- [ ] HTML includes metrics
- [ ] Can print to PDF from browser
- [ ] Metrics are accurate

**Acceptance:** PDF reports generate with correct metrics

---

### Task S1-T07: Fix Dashboard Stats
**Priority:** MEDIUM  
**Complexity:** SIMPLE  
**Estimated Time:** 30 minutes

**Problem:**
`src/app/api/dashboards/stats/route.ts` line 107 uses non-existent `auditLog` model.

**Solution:**
```typescript
// File: eventops/src/app/api/dashboards/stats/route.ts

// BEFORE (line 107-111)
const recentActivity = await prisma.auditLog.findMany({
  orderBy: { createdAt: 'desc' },
  take: 20,
});

// AFTER (use activities table instead)
const recentActivity = await prisma.activities.findMany({
  where: { eventId },
  orderBy: { createdAt: 'desc' },
  take: 20,
  include: {
    people: {
      select: {
        name: true,
        target_accounts: { select: { name: true } }
      }
    }
  }
});

// Update mapping (line 120)
const activityFeed = recentActivity.map(log => ({
  id: log.id,
  type: log.type,  // 'OUTREACH_SENT', 'MEETING_SCHEDULED', etc.
  description: `${log.people?.name} - ${log.type}`,
  accountName: log.people?.target_accounts?.name,
  timestamp: log.createdAt,
}));
```

**Validation:**
- [ ] Dashboard loads without errors
- [ ] Recent activity feed displays
- [ ] Activity types show correctly

**Acceptance:** Dashboard stats API works correctly

---

**Sprint 1 Deliverables:**
✅ All required fields added to schema  
✅ Export generates complete CSV/JSON  
✅ ICP scoring persists for people  
✅ Analytics endpoints work correctly  
✅ PDF reports generate successfully  

**Sprint 1 Risks:**
- **Schema Migration Risk:** MODERATE - Adding fields can fail if constraints wrong
- **Data Migration Risk:** NONE - All new fields are nullable
- **Testing Required:** Manual QA of export, reports, analytics

---

## **SPRINT 2: Query Optimization & Type Safety** (2 days)
**Goal:** Fix remaining query syntax errors and improve type safety  
**Demo:** All API endpoints return valid data, no implicit any types

### Task S2-T01: Fix Research Queue Queries
**Priority:** MEDIUM  
**Complexity:** MODERATE  
**Estimated Time:** 1 hour

**Problem:**
`src/lib/research-queue.ts` and `src/app/api/research/candidates/route.ts` use incorrect `dossier` relation.

**Solution:**
After Sprint 0 schema changes, these should work. If not:

```typescript
// File: eventops/src/lib/research-queue.ts

// BEFORE (line 62)
include: { dossier: true },

// AFTER (if Sprint 0 didn't add alias)
include: { company_dossiers: true },

// Update references (lines 76-77)
const daysSince = account.company_dossiers
  ? Math.floor((Date.now() - account.company_dossiers.researchedAt.getTime()) / (1000 * 60 * 60 * 24))
  : null;
```

**Validation:**
- [ ] GET `/api/research/candidates` returns accounts needing research
- [ ] Research refresh page displays candidates
- [ ] Can trigger bulk research

**Acceptance:** Research queue correctly identifies stale dossiers

---

### Task S2-T02: Fix Outreach Activity Tracking
**Priority:** MEDIUM  
**Complexity:** SIMPLE  
**Estimated Time:** 30 minutes

**Problem:**
Activity logging tries to set `personId` but `activities` schema may not have it.

**Solution:**

Check schema first:
```bash
cd eventops
npx prisma studio
# Check activities model
```

If `personId` doesn't exist:
```prisma
model activities {
  id          String   @id @default(cuid())
  eventId     String
  type        String   // 'OUTREACH_SENT', 'MEETING_SCHEDULED', etc.
  description String?
  metadata    String?  // JSON
  createdAt   DateTime @default(now())
  
  // ADD IF MISSING
  personId    String?
  accountId   String?
  
  people      people?  @relation(fields: [personId], references: [id])
  target_accounts target_accounts? @relation(fields: [accountId], references: [id])
}
```

Then code works as-is.

**Validation:**
- [ ] Outreach tracking creates activity records
- [ ] Activity feed shows outreach events
- [ ] personId populated correctly

**Acceptance:** Activity tracking persists all relevant IDs

---

### Task S2-T03: Fix Sequence Cron Job
**Priority:** LOW (if using Option B from S1-T03)  
**Complexity:** COMPLEX (if implementing)  
**Estimated Time:** 3-4 hours (defer to Sprint 3)

**Problem:**
`src/app/api/cron/sequences/route.ts` expects fields that don't exist.

**Recommended Solution for Sprint 2:**
Stub the endpoint:

```typescript
// File: eventops/src/app/api/cron/sequences/route.ts

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Implement sequence automation
  // Requirements:
  // 1. Find ACTIVE sequences where next step is due
  // 2. Execute step (send email/LinkedIn)
  // 3. Update currentStep, lastStepDate
  // 4. Mark COMPLETED if all steps done
  
  return NextResponse.json({ 
    message: 'Sequence automation not implemented',
    sequences_processed: 0,
    outreach_sent: 0
  });
}
```

**Validation:**
- [ ] Cron job doesn't crash
- [ ] Returns success response
- [ ] Vercel cron job runs without errors

**Acceptance:** Cron endpoint is stable (even if stubbed)

---

### Task S2-T04: Add TypeScript Types for API Responses
**Priority:** MEDIUM  
**Complexity:** MODERATE  
**Estimated Time:** 2 hours

**Problem:**
Many API responses use `any` types, reducing type safety.

**Solution:**
Create type definitions:

```typescript
// File: eventops/src/types/api.ts

import { Prisma } from '@prisma/client';

// Person with relations
export type PersonWithAccount = Prisma.peopleGetPayload<{
  include: {
    target_accounts: true;
    insights: true;
  };
}>;

// Account with people and dossier
export type AccountWithDetails = Prisma.target_accountsGetPayload<{
  include: {
    people: true;
    company_dossiers: true;
  };
}>;

// Outreach with person and account
export type OutreachWithDetails = Prisma.outreachGetPayload<{
  include: {
    people: {
      include: {
        target_accounts: true;
      };
    };
  };
}>;

// Meeting with person
export type MeetingWithPerson = Prisma.meetingGetPayload<{
  include: {
    people: {
      include: {
        target_accounts: true;
      };
    };
  };
}>;

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

**Usage Example:**
```typescript
// File: src/app/api/people/[id]/route.ts

import { PersonWithAccount, ApiResponse } from '@/types/api';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // ... auth ...
  
  const person: PersonWithAccount | null = await prisma.people.findUnique({
    where: { id: params.id },
    include: {
      target_accounts: true,
      insights: true,
    },
  });

  if (!person) {
    return NextResponse.json<ApiResponse<never>>({ 
      success: false,
      error: 'Person not found' 
    }, { status: 404 });
  }

  return NextResponse.json<ApiResponse<PersonWithAccount>>({ 
    success: true,
    data: person 
  });
}
```

**Affected Files (gradually update):**
- All API routes in `src/app/api/`
- All client components that fetch data

**Validation:**
- [ ] No `any` types in function signatures
- [ ] IDE autocomplete works for API responses
- [ ] TypeScript strict mode passes

**Acceptance:** 80%+ of API routes use proper types

---

### Task S2-T05: Add Error Boundary Components
**Priority:** MEDIUM  
**Complexity:** SIMPLE  
**Estimated Time:** 1 hour

**Problem:**
Runtime errors crash pages instead of showing graceful error UI.

**Solution:**
```typescript
// File: eventops/src/app/error.tsx

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
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
```

```typescript
// File: eventops/src/app/dashboard/error.tsx

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-2">Error loading dashboard</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <div className="flex gap-4">
        <Button onClick={reset}>Try again</Button>
        <Link href="/dashboard">
          <Button variant="outline">Go to Dashboard Home</Button>
        </Link>
      </div>
    </div>
  );
}
```

**Validation:**
- [ ] Trigger error (e.g., invalid API response)
- [ ] Error boundary catches it
- [ ] User sees friendly message
- [ ] Can reset or navigate away

**Acceptance:** Errors display user-friendly messages instead of blank screens

---

**Sprint 2 Deliverables:**
✅ All query syntax errors resolved  
✅ Type safety improved (80%+ typed)  
✅ Error boundaries protect against crashes  
✅ Research and analytics queries optimized  

**Sprint 2 Risks:**
- **Type Migration Risk:** LOW - Types don't affect runtime
- **Error Boundary Risk:** NONE - Additive feature
- **Testing Required:** Unit tests for query functions

---

## **SPRINT 3: Feature Completion & Polish** (3-5 days)
**Goal:** Complete half-implemented features or remove them  
**Demo:** All features either fully functional or cleanly removed

### Task S3-T01: Complete Sequence Automation (Optional)
**Priority:** LOW  
**Complexity:** COMPLEX  
**Estimated Time:** 6-8 hours

**Decision Point:** Do we need automated sequences?

**If YES - Full Implementation:**

Step 1: Schema (from S1-T03 Option A)
Step 2: State Machine Logic

```typescript
// File: eventops/src/lib/sequence-engine.ts

import { db as prisma } from './db';

export async function processSequences() {
  const activeSequences = await prisma.sequences.findMany({
    where: {
      status: 'ACTIVE',
      isActive: true,
    },
    include: {
      person: { include: { target_accounts: true } },
      campaign: true,
    },
  });

  const results = {
    processed: 0,
    sent: 0,
    completed: 0,
    errors: [] as string[],
  };

  for (const seq of activeSequences) {
    try {
      const steps = JSON.parse(seq.steps);
      const currentStepIndex = seq.currentStep || 0;

      // Check if sequence is complete
      if (currentStepIndex >= steps.length) {
        await prisma.sequences.update({
          where: { id: seq.id },
          data: { status: 'COMPLETED' },
        });
        results.completed++;
        continue;
      }

      // Check if enough time has passed for next step
      const lastStepDate = seq.lastStepDate || seq.createdAt;
      const currentStep = steps[currentStepIndex];
      const daysSinceLastStep = Math.floor(
        (Date.now() - lastStepDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastStep < currentStep.delayDays) {
        continue; // Not time yet
      }

      // Execute step
      const outreach = await prisma.outreach.create({
        data: {
          personId: seq.personId!,
          channel: currentStep.channel,
          subject: currentStep.subject,
          message: currentStep.message,
          status: 'SENT',
          sentAt: new Date(),
          sequenceId: seq.id,
          campaignId: seq.campaignId,
        },
      });

      // Update sequence state
      await prisma.sequences.update({
        where: { id: seq.id },
        data: {
          currentStep: currentStepIndex + 1,
          lastStepDate: new Date(),
        },
      });

      results.processed++;
      results.sent++;
    } catch (error: any) {
      results.errors.push(`Sequence ${seq.id}: ${error.message}`);
    }
  }

  return results;
}
```

Step 3: Update Cron Job

```typescript
// File: eventops/src/app/api/cron/sequences/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { processSequences } from '@/lib/sequence-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await processSequences();
  
  return NextResponse.json({
    success: true,
    ...results,
    timestamp: new Date().toISOString(),
  });
}
```

**Validation:**
- [ ] Create sequence with 3 steps (0 days, 3 days, 7 days delay)
- [ ] Assign to person
- [ ] Cron runs → first outreach sent immediately
- [ ] Wait 3 days → second outreach sent
- [ ] Wait 7 days → third outreach sent, sequence marked COMPLETED

**Acceptance:** Sequences execute automatically on schedule

**If NO - Remove Feature:**

```bash
# Delete files
rm eventops/src/app/api/cron/sequences/route.ts
rm eventops/src/app/dashboard/sequences -rf
rm eventops/src/app/api/sequences -rf

# Update navigation
# Remove sequence links from dashboard nav

# Keep schema for future, just disable
```

---

### Task S3-T02: Audit Logging with Activities Table
**Priority:** MEDIUM  
**Complexity:** MODERATE  
**Estimated Time:** 2 hours

**Problem:**
Code references `auditLog` which doesn't exist. Use `activities` instead.

**Solution:**
Create audit logging utility:

```typescript
// File: eventops/src/lib/audit.ts

import { db as prisma } from './db';

export type AuditEventType =
  | 'ACCOUNT_CREATED'
  | 'ACCOUNT_UPDATED'
  | 'PERSON_CREATED'
  | 'PERSON_UPDATED'
  | 'OUTREACH_SENT'
  | 'MEETING_SCHEDULED'
  | 'MEETING_COMPLETED'
  | 'SCORE_UPDATED';

export async function logAudit(params: {
  eventId: string;
  type: AuditEventType;
  description: string;
  personId?: string;
  accountId?: string;
  metadata?: any;
}) {
  return await prisma.activities.create({
    data: {
      eventId: params.eventId,
      type: params.type,
      description: params.description,
      personId: params.personId,
      accountId: params.accountId,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}

export async function getRecentActivity(eventId: string, limit = 20) {
  return await prisma.activities.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      people: {
        select: {
          name: true,
          target_accounts: { select: { name: true } },
        },
      },
    },
  });
}
```

**Usage in API Routes:**
```typescript
// Example: src/app/api/accounts/route.ts

import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  // ... create account ...
  
  await logAudit({
    eventId: account.eventId,
    type: 'ACCOUNT_CREATED',
    description: `Created account: ${account.name}`,
    accountId: account.id,
  });
  
  return NextResponse.json(account);
}
```

**Affected Files:**
- All CRUD API routes (accounts, people, outreach, meetings)
- Dashboard stats route (use `getRecentActivity`)

**Validation:**
- [ ] Creating account logs activity
- [ ] Updating person logs activity
- [ ] Dashboard shows recent activity feed
- [ ] Activity includes user name and timestamp

**Acceptance:** All major actions are logged and visible

---

### Task S3-T03: Cleanup Unused Code
**Priority:** LOW  
**Complexity:** SIMPLE  
**Estimated Time:** 2 hours

**Problem:**
Orphaned code from rapid development.

**Solution:**

```bash
# Find unused exports
npx ts-prune | grep 'used in module'

# Find TODO comments
grep -r "TODO" eventops/src --exclude-dir=node_modules

# Find console.log statements (remove before production)
grep -r "console.log" eventops/src --exclude-dir=node_modules | grep -v "console.error"
```

**Cleanup Checklist:**
- [ ] Remove unused imports
- [ ] Remove commented-out code blocks
- [ ] Convert `console.log` to proper logger
- [ ] Remove incomplete features not on roadmap
- [ ] Update stale comments

**Validation:**
- [ ] `npm run build` still succeeds
- [ ] No functionality broken
- [ ] Code size reduced

**Acceptance:** Codebase is clean and maintainable

---

### Task S3-T04: Performance Optimization
**Priority:** MEDIUM  
**Complexity:** MODERATE  
**Estimated Time:** 3 hours

**Problem:**
Some queries are inefficient (N+1 problems, missing indexes).

**Solution:**

**1. Add Database Indexes:**
```prisma
// File: eventops/prisma/schema.prisma

model target_accounts {
  // ... fields ...
  
  @@index([eventId])
  @@index([icpScore])
  @@index([assignedTo])
  @@index([tier])
  @@index([status])
}

model people {
  // ... fields ...
  
  @@index([accountId])
  @@index([email])
  @@index([assignedTo])
  @@index([icpScore])
}

model outreach {
  // ... fields ...
  
  @@index([personId])
  @@index([status])
  @@index([sentAt])
  @@index([campaignId])
}

model meeting {
  // ... fields ...
  
  @@index([personId])
  @@index([scheduledAt])
  @@index([status])
}
```

**Commands:**
```bash
cd eventops
npx prisma migrate dev --name add_indexes
```

**2. Optimize Queries:**
```typescript
// BEFORE (N+1 problem)
const accounts = await prisma.target_accounts.findMany();
for (const account of accounts) {
  const people = await prisma.people.findMany({ 
    where: { accountId: account.id } 
  });
  // Process people...
}

// AFTER (single query with include)
const accounts = await prisma.target_accounts.findMany({
  include: { people: true },
});
for (const account of accounts) {
  // Process account.people...
}
```

**3. Add Caching for Expensive Queries:**
```typescript
// File: eventops/src/lib/cache.ts

const cache = new Map<string, { data: any; expires: number }>();

export function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
}

export function setCache<T>(key: string, data: T, ttlSeconds = 300) {
  cache.set(key, {
    data,
    expires: Date.now() + ttlSeconds * 1000,
  });
}
```

**Usage:**
```typescript
// Example: Dashboard stats
const cacheKey = `dashboard:stats:${eventId}`;
let stats = getCached(cacheKey);

if (!stats) {
  stats = await calculateStats(eventId);
  setCache(cacheKey, stats, 60); // Cache for 1 minute
}

return NextResponse.json(stats);
```

**Validation:**
- [ ] Accounts list loads in < 500ms
- [ ] Dashboard stats load in < 300ms
- [ ] No N+1 query warnings in Prisma logs
- [ ] Lighthouse performance score > 80

**Acceptance:** All pages load quickly, queries are optimized

---

### Task S3-T05: Integration Testing Suite
**Priority:** HIGH  
**Complexity:** COMPLEX  
**Estimated Time:** 4-6 hours

**Problem:**
No automated tests to prevent regressions.

**Solution:**

```bash
cd eventops
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

**Test Structure:**
```
eventops/
├── tests/
│   ├── integration/
│   │   ├── accounts.test.ts
│   │   ├── people.test.ts
│   │   ├── outreach.test.ts
│   │   └── meetings.test.ts
│   ├── unit/
│   │   ├── ai-research.test.ts
│   │   ├── icp-scoring.test.ts
│   │   └── roi-calculator.test.ts
│   └── setup.ts
```

**Example Test:**
```typescript
// File: eventops/tests/integration/people.test.ts

import { describe, it, expect, beforeAll } from 'vitest';

describe('People API', () => {
  let authToken: string;
  let testPersonId: string;

  beforeAll(async () => {
    // Login and get token
    const res = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    authToken = res.headers.get('set-cookie')!;
  });

  it('should create a person', async () => {
    const res = await fetch('http://localhost:3000/api/people', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authToken,
      },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        accountId: 'test-account-id',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.person).toBeDefined();
    expect(data.person.name).toBe('John Doe');
    testPersonId = data.person.id;
  });

  it('should get person by ID', async () => {
    const res = await fetch(`http://localhost:3000/api/people/${testPersonId}`, {
      headers: { Cookie: authToken },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.person.id).toBe(testPersonId);
    expect(data.person.target_accounts).toBeDefined();
  });

  it('should update person', async () => {
    const res = await fetch(`http://localhost:3000/api/people/${testPersonId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authToken,
      },
      body: JSON.stringify({
        title: 'VP of Operations',
        isOps: true,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe('VP of Operations');
    expect(data.isOps).toBe(true);
  });
});
```

**Run Tests:**
```bash
npm run test
# Or
npm run test:watch
```

**Validation:**
- [ ] All integration tests pass
- [ ] Coverage > 60% on critical paths
- [ ] CI/CD runs tests on every commit

**Acceptance:** Test suite catches regressions before deployment

---

**Sprint 3 Deliverables:**
✅ Sequence automation completed or removed  
✅ Audit logging functional  
✅ Codebase cleaned up  
✅ Performance optimized  
✅ Test suite established (60%+ coverage)  

**Sprint 3 Risks:**
- **Feature Removal Risk:** MEDIUM - Ensure removed features aren't critical
- **Performance Risk:** LOW - Indexes are safe to add
- **Testing Risk:** NONE - Tests are additive

---

## **SPRINT 4: Production Hardening** (2-3 days)
**Goal:** Security, monitoring, documentation  
**Demo:** Production-ready with monitoring, docs, and security audit

### Task S4-T01: Security Audit
**Priority:** HIGH  
**Complexity:** MODERATE  
**Estimated Time:** 2 hours

**Checklist:**
- [ ] All API routes check `await auth()` for authentication
- [ ] No sensitive data in error messages
- [ ] Rate limiting on public endpoints
- [ ] CSRF protection enabled
- [ ] SQL injection prevention (Prisma ORM handles this)
- [ ] XSS prevention (React handles this)
- [ ] Environment variables not committed to git
- [ ] API keys rotated and secure

**Tools:**
```bash
# Check for secrets in codebase
npx secretlint "**/*"

# Dependency vulnerability scan
npm audit
npm audit fix

# OWASP dependency check
npx snyk test
```

**Validation:**
- [ ] No HIGH vulnerabilities in npm audit
- [ ] No secrets in git history
- [ ] All endpoints require auth
- [ ] Rate limiting tested (100 req/min limit)

**Acceptance:** Security scan passes with no criticals

---

### Task S4-T02: Error Tracking (Sentry)
**Priority:** HIGH  
**Complexity:** SIMPLE  
**Estimated Time:** 1 hour

**Solution:**
```bash
cd eventops
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configuration:**
```typescript
// File: eventops/sentry.client.config.ts

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },
});
```

**Validation:**
- [ ] Sentry receives test error
- [ ] Error includes stack trace
- [ ] User context attached
- [ ] Environment tags correct

**Acceptance:** All production errors logged to Sentry

---

### Task S4-T03: Performance Monitoring
**Priority:** MEDIUM  
**Complexity:** SIMPLE  
**Estimated Time:** 1 hour

**Solution:**

Add Vercel Analytics:
```bash
cd eventops
npm install @vercel/analytics
```

```typescript
// File: eventops/src/app/layout.tsx

import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

**Validation:**
- [ ] Vercel dashboard shows page views
- [ ] Core Web Vitals tracked
- [ ] API response times visible

**Acceptance:** Performance metrics available in Vercel dashboard

---

### Task S4-T04: API Documentation
**Priority:** MEDIUM  
**Complexity:** MODERATE  
**Estimated Time:** 3 hours

**Solution:**

```markdown
# File: eventops/docs/API.md

# EventOps API Documentation

Base URL: `https://yard-flow-hitlist.vercel.app`

## Authentication

All endpoints require authentication via NextAuth session cookie.

## Accounts

### List Accounts
```http
GET /api/accounts?eventId={eventId}&limit=100&offset=0
```

Response:
```json
{
  "accounts": [
    {
      "id": "abc123",
      "name": "Acme Corp",
      "icpScore": 85,
      "tier": "A"
    }
  ],
  "total": 250
}
```

### Create Account
```http
POST /api/accounts
Content-Type: application/json

{
  "eventId": "xyz789",
  "name": "New Corp",
  "website": "https://example.com",
  "industry": "Manufacturing"
}
```

... (document all 77 endpoints)
```

**Validation:**
- [ ] All endpoints documented
- [ ] Example requests/responses
- [ ] Error codes explained
- [ ] Authentication described

**Acceptance:** Developers can integrate with API using docs alone

---

### Task S4-T05: User Documentation
**Priority:** MEDIUM  
**Complexity:** MODERATE  
**Estimated Time:** 2 hours

**Solution:**

```markdown
# File: eventops/docs/USER_GUIDE.md

# EventOps User Guide

## Getting Started

1. **Login** - Use your company email to sign in
2. **Select Event** - Choose Manifest 2026 from events dropdown
3. **Import Accounts** - Upload CSV of target companies
4. **Score Accounts** - AI generates ICP scores
5. **Add People** - Import or manually add contacts
6. **Generate Outreach** - AI creates personalized emails
7. **Track Engagement** - Monitor opens, clicks, replies
8. **Schedule Meetings** - Book time at the event

## Features

### Account Management
- **ICP Scoring**: 0-100 score based on fit
- **Tier System**: A/B/C/D prioritization
- **AI Research**: Auto-generate company dossiers

### Outreach
- **Email Templates**: Reusable message templates
- **AI Generation**: Personalized outreach per contact
- **SendGrid Integration**: Send emails directly
- **Tracking**: Opens, clicks, replies automatically tracked

... (complete guide)
```

**Validation:**
- [ ] Non-technical user can complete tasks
- [ ] Screenshots for each feature
- [ ] Troubleshooting section
- [ ] FAQ included

**Acceptance:** User can onboard without support

---

**Sprint 4 Deliverables:**
✅ Security audit passed  
✅ Error tracking enabled  
✅ Performance monitoring active  
✅ API documentation complete  
✅ User guide published  

**Sprint 4 Risks:**
- **Documentation Risk:** NONE - Can iterate post-launch
- **Monitoring Risk:** NONE - Additive features
- **Security Risk:** MEDIUM - Must fix all criticals before launch

---

## 🎉 Definition of Done

### Sprint-Level
- [ ] All tasks completed and committed
- [ ] Local build passes (`npm run build`)
- [ ] Deployed to production
- [ ] Smoke tests pass
- [ ] Demo recorded/presented
- [ ] Documentation updated

### Task-Level
- [ ] Code written and tested
- [ ] TypeScript errors: 0
- [ ] Validation checklist completed
- [ ] Acceptance criteria met
- [ ] Code reviewed (if team)
- [ ] Committed to main branch

---

## 📈 Success Metrics

### Sprint 0 (Emergency Stabilization)
- **Technical:** TypeScript errors: 63 → 0
- **User:** People page loads successfully
- **Business:** Can access production dashboard

### Sprint 1 (Data Completeness)
- **Technical:** All schema fields present
- **User:** Export generates complete data
- **Business:** ICP scoring persists

### Sprint 2 (Optimization)
- **Technical:** Query response time < 500ms
- **User:** No loading spinners > 2 seconds
- **Business:** 80% code typed

### Sprint 3 (Feature Completion)
- **Technical:** Test coverage > 60%
- **User:** All features work or removed
- **Business:** No half-finished functionality

### Sprint 4 (Production Hardening)
- **Technical:** 0 critical vulnerabilities
- **User:** Error tracking catches issues
- **Business:** Ready for enterprise use

---

## 🚀 Deployment Strategy

### Sprint 0-1 (High Risk)
- Deploy during off-hours (evenings)
- Have rollback plan ready
- Monitor for 30 minutes post-deploy

### Sprint 2-3 (Medium Risk)
- Deploy during business hours
- Gradual rollout if possible
- Monitor for 15 minutes

### Sprint 4 (Low Risk)
- Deploy anytime
- Monitoring/docs don't affect runtime

---

## 🔄 Rollback Plan

**If deployment fails:**

```bash
# Rollback code
git revert HEAD
git push origin main

# Rollback database (if schema changed)
cd eventops
npx prisma migrate reset
npx prisma migrate deploy
```

**If production is broken but deployment succeeded:**

```bash
# Revert to last known good commit
git log  # Find good commit
git revert <bad-commit-hash>
git push origin main
```

---

## 📞 Support Contacts

- **Production Issues:** Check Vercel logs, Sentry errors
- **Database Issues:** Check Neon PostgreSQL dashboard
- **Build Failures:** Check Vercel build logs

---

## 📝 Sprint Retrospective Template

After each sprint:

**What went well:**
- 

**What could improve:**
- 

**Action items:**
- 

**Blockers encountered:**
- 

**Estimated vs Actual Time:**
- 

---

## ✅ Ready to Start?

**Sprint 0 is CRITICAL and should start immediately.**

Next steps:
1. Review this plan with team
2. Set up development environment
3. Backup production database (Task S0-T01 from QA plan)
4. Start Sprint 0 Task 1: Fix Prisma Schema Relations

**Estimated total timeline:** 8-12 days  
**Recommended schedule:** 2 sprints per week  
**Target completion:** February 5, 2026

---

*This plan is a living document. Update as you learn and adapt to changing requirements.*
