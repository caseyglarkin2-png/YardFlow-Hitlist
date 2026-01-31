# YardFlow Hitlist: Manifest 2026 Sprint Plan

> **Status**: ACTIVE  
> **Created**: January 31, 2026  
> **Target Event**: Manifest 2026 (Feb 10-12, 2026)  
> **Days Remaining**: 10  
> **Philosophy**: Ship Fast, Ship Often - Atomic, testable tasks  
> **Reviewed By**: AI Senior TPM Subagent

---

## Executive Summary

### Current State
- **Production URL**: `https://yardflow-hitlist-production-2f41.up.railway.app`
- **Build Status**: ✅ CI Passing (commit 277aca9)
- **Railway Deploy**: ⏳ Pending verification
- **User Complaint**: "So built for mobile that you can't see any of the names when you enter the war room"

### Critical Path to Manifest 2026
```
Jan 31 → U0 (Audit)
Feb 1-2 → U1 (Desktop UI) + U2 (Deploy Verification) [PARALLEL]
Feb 3-4 → U3 (E2E Testing) + U4 (Platform Integration) [PARALLEL]
Feb 5-6 → U5 (Pre-Event Hardening)
Feb 7 → Buffer for escapes
Feb 8-9 → Final QA walkthrough
Feb 10-12 → MANIFEST 2026 🎯
```

### Architecture Reference
```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER (Desktop/Tablet)                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   GTM Frontend      │ │   Content Hub       │ │   Direct Access     │
│   (Vercel)          │ │   (Vercel)          │ │   (Railway)         │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
         ┌─────────────────────┐       ┌─────────────────────┐
         │  YardFlow-Hitlist   │       │  YardFlow-Worker    │
         │  (Next.js Web)      │       │  (BullMQ Jobs)      │
         │  Railway Service    │       │  Railway Service    │
         └─────────────────────┘       └─────────────────────┘
                    │                             │
                    └──────────────┬──────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  PostgreSQL  │    Redis     │
                    │  (Prisma 7)  │  (BullMQ)    │
                    └──────────────────────────────┘
```

---

## Sprint U0: Audit & Baseline (0.5 days)

**Goal**: Create concrete acceptance criteria for UI fixes with screenshots.  
**Demo**: Screenshot grid showing each dashboard at 1920x1080 with annotated issues.  
**Validation**: GitHub issues created with before screenshots.

### Task U0.1: Capture Desktop Screenshots at 1920x1080

**File**: `docs/audit/desktop-screenshots-2026-01-31/`  
**Action**: Take full-page screenshots of 6 key pages:
1. `/dashboard` (main dashboard)
2. `/dashboard/event-day` (war room)
3. `/dashboard/accounts` (account list)
4. `/dashboard/people` (contacts list)
5. `/dashboard/calendar` (meeting calendar)
6. `/dashboard/manifest` (Manifest hitlist)

**Script**:
```bash
#!/bin/bash
# scripts/capture-desktop-screenshots.sh
PROD_URL="https://yardflow-hitlist-production-2f41.up.railway.app"
PAGES=("/dashboard" "/dashboard/event-day" "/dashboard/accounts" "/dashboard/people" "/dashboard/calendar" "/dashboard/manifest")

mkdir -p docs/audit/desktop-screenshots-$(date +%Y-%m-%d)
for page in "${PAGES[@]}"; do
  filename=$(echo $page | tr '/' '-' | sed 's/^-//')
  npx playwright screenshot --viewport-size="1920,1080" "$PROD_URL$page" \
    "docs/audit/desktop-screenshots-$(date +%Y-%m-%d)/${filename}.png"
done
```

**Validation**: 6 PNG files exist in audit folder.

---

### Task U0.2: Document Specific UI Issues

**File**: `docs/audit/UI_ISSUES.md`  
**Action**: For each screenshot, annotate:
- Text truncation (can't read names)
- Navigation overflow
- Layout breaking points
- Touch target sizes

**Expected Issues Based on Code Review**:
| Page | Issue | Root Cause |
|------|-------|------------|
| Nav | 19 items overflow at ~1400px | No overflow handling in `DashboardNav` |
| Nav | Hidden below 640px | `hidden sm:flex` with no hamburger menu |
| Event-Day | Names truncated in meeting cards | Missing `min-w-0` on flex children |
| Accounts | Table columns too narrow | `whitespace-nowrap` without min-width |
| People | Same as Accounts | Same pattern |

**Validation**: Markdown file with issue list matches actual screenshots.

---

### Task U0.3: Create GitHub Issues for Each Problem

**Action**: Create GitHub issues with:
- Screenshot attached
- CSS selector of problematic element
- Proposed fix
- Acceptance criteria

**Issue Template**:
```markdown
## Problem
[Screenshot showing issue]

## Location
- File: `src/app/dashboard/event-day/page.tsx`
- Line: 175
- CSS: `.meeting-card .flex-1`

## Root Cause
Missing `min-w-0` causes flex child to overflow instead of truncate.

## Proposed Fix
```tsx
<div className="flex-1 min-w-0">
  <p className="font-semibold truncate">{meeting.people.name}</p>
```

## Acceptance Criteria
- [ ] Name visible up to 30 characters before truncation
- [ ] Ellipsis shown for longer names
- [ ] No horizontal overflow on parent container
```

**Validation**: At least 5 GitHub issues created.

---

## Sprint U1: Desktop UI/UX Emergency Fix (2 days)

**Goal**: War room and key pages fully usable on 1920x1080 screens.  
**Demo**: Side-by-side before/after screenshots showing readable names.  
**Validation**: All U0.3 issues closed with fixes merged.

### Task U1.1: Add Hamburger Menu for Mobile

**Priority**: P1  
**File**: `src/components/dashboard-nav.tsx`, `src/components/layout/mobile-nav.tsx`  
**Problem**: Navigation is `hidden sm:flex` - users on phones see nothing.

**Implementation**:
```tsx
// src/components/dashboard-nav.tsx
import { MobileNav } from '@/components/layout/mobile-nav';

export function DashboardNav() {
  return (
    <>
      {/* Mobile hamburger - visible below sm breakpoint */}
      <div className="sm:hidden">
        <MobileNav />
      </div>
      
      {/* Desktop nav - visible at sm and above */}
      <div className="hidden sm:ml-6 sm:flex sm:space-x-4 overflow-x-auto">
        {/* Core items only */}
      </div>
    </>
  );
}
```

**Validation**:
```bash
# Resize browser to 375px width
# Hamburger icon visible
# Tapping opens slide-out nav with all items
```

---

### Task U1.2: Add "More" Dropdown for Nav Overflow

**Priority**: P0 (Critical)  
**File**: `src/components/dashboard-nav.tsx`  
**Problem**: 19 nav items overflow on screens < 1600px.

**Implementation**:
```tsx
const coreNavItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Event Day', href: '/dashboard/event-day' }, // War Room!
  { name: 'Accounts', href: '/dashboard/accounts' },
  { name: 'People', href: '/dashboard/people' },
  { name: 'Calendar', href: '/dashboard/calendar' },
  { name: 'Outreach', href: '/dashboard/outreach' },
];

const moreNavItems = [
  { name: 'Campaigns', href: '/dashboard/campaigns' },
  { name: 'Research', href: '/dashboard/research/bulk' },
  { name: 'Agents', href: '/dashboard/agents' },
  { name: 'Analytics', href: '/dashboard/analytics' },
  { name: 'Settings', href: '/dashboard/settings/integrations' },
  { name: 'Team', href: '/dashboard/team' },
  { name: 'Help', href: '/dashboard/help' },
];

// Render core items inline, moreNavItems in dropdown
<DropdownMenu>
  <DropdownMenuTrigger>More ▼</DropdownMenuTrigger>
  <DropdownMenuContent>
    {moreNavItems.map(item => (
      <DropdownMenuItem key={item.href}>
        <Link href={item.href}>{item.name}</Link>
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

**Validation**:
```bash
# At 1920px: 6 core items visible + "More" dropdown
# At 1366px: Same layout, no overflow
# Dropdown opens with remaining 7 items
```

---

### Task U1.3: Fix Event-Day Meeting Card Text Truncation

**Priority**: P0 (Critical - War Room!)  
**File**: `src/app/dashboard/event-day/page.tsx`  
**Lines**: ~170-190 (meeting card layout)  
**Problem**: `flex-1` without `min-w-0` causes text to overflow instead of truncate.

**Current Code** (Line 175):
```tsx
<div className="flex-1">
  <p className="font-semibold">{meeting.people.name}</p>
```

**Fixed Code**:
```tsx
<div className="flex-1 min-w-0">
  <p className="font-semibold truncate">{meeting.people.name}</p>
  <p className="text-sm text-gray-600 truncate">
    {meeting.people.title} at {meeting.people.target_accounts.name}
  </p>
```

**Validation**:
```bash
# Create meeting with person named "Alexandra Montgomery-Fitzgerald III"
# Name shows with ellipsis, not overflowing card
# Title line also truncates properly
```

---

### Task U1.4: Add min-width to Table Columns

**Priority**: P1  
**Files**: 
- `src/app/dashboard/accounts/page.tsx`
- `src/app/dashboard/people/page.tsx`

**Problem**: `whitespace-nowrap` causes columns to collapse to content width.

**Implementation Pattern**:
```tsx
<table className="min-w-full">
  <thead>
    <tr>
      <th className="min-w-[200px]">Name</th>  {/* Enforce minimum */}
      <th className="min-w-[150px]">Company</th>
      <th className="min-w-[120px]">Title</th>
      <th className="min-w-[100px]">ICP Score</th>
    </tr>
  </thead>
  <tbody>
    {/* Add wrapper for horizontal scroll */}
  </tbody>
</table>

{/* Wrap table in scrollable container */}
<div className="overflow-x-auto">
  <table>...</table>
</div>
```

**Validation**:
```bash
# At 1920px: All columns visible without scrolling
# At 1366px: Horizontal scroll appears if needed
# Name column always shows at least 25 characters
```

---

### Task U1.5: Add War Room Full-Screen Mode

**Priority**: P0 (Critical - User's main complaint)  
**File**: `src/app/dashboard/event-day/page.tsx` (new component)  
**Problem**: Event-day dashboard designed for general use, not trade show floor.

**New Component**: `src/components/war-room-mode.tsx`
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WarRoomToggle() {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  return (
    <Button 
      onClick={toggleFullScreen}
      variant="outline"
      className="fixed top-4 right-4 z-50"
    >
      {isFullScreen ? <Minimize2 /> : <Maximize2 />}
      {isFullScreen ? ' Exit War Room' : ' War Room Mode'}
    </Button>
  );
}
```

**CSS for War Room Mode**:
```css
/* When fullscreen, hide nav and maximize content */
:fullscreen .dashboard-nav { display: none; }
:fullscreen main { max-width: 100%; padding: 1rem; }
:fullscreen .text-sm { font-size: 1rem; }  /* Larger text */
:fullscreen .text-xs { font-size: 0.875rem; }
```

**Validation**:
```bash
# Click "War Room Mode" button
# Screen goes fullscreen
# Navigation hidden
# Fonts 25% larger
# Meeting cards easily readable from 3 feet away
```

---

### Task U1.6: Expand Container Width on XL Screens

**Priority**: P2  
**File**: `src/app/dashboard/layout.tsx`  
**Problem**: `max-w-7xl` (1280px) wastes space on 1920px+ screens.

**Current**:
```tsx
<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
```

**Fixed**:
```tsx
<main className="mx-auto max-w-7xl xl:max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
```

**Validation**:
```bash
# At 1920px: Content uses ~1536px width
# At 2560px: Content uses full 1536px
# At 1366px: Content uses 1280px (unchanged)
```

---

### Task U1.7: Visual Regression Test Script

**Priority**: P2  
**File**: `scripts/visual-regression.sh`  
**Action**: Capture after screenshots and compare to baseline.

**Script**:
```bash
#!/bin/bash
# Compare before/after screenshots using ImageMagick
BEFORE="docs/audit/desktop-screenshots-2026-01-31"
AFTER="docs/audit/desktop-screenshots-$(date +%Y-%m-%d)"

for file in "$BEFORE"/*.png; do
  name=$(basename "$file")
  compare -metric RMSE "$BEFORE/$name" "$AFTER/$name" "docs/audit/diff-$name" 2>&1
done
```

**Validation**: All diff images show improvements in readability areas.

---

## Sprint U2: Build & Deploy Verification (0.5 days)

**Goal**: Confirm both Web and Worker services healthy on Railway.  
**Demo**: Health endpoint returns 200 with all components green.  
**Validation**: Smoke test script passes 100%.

### Task U2.1: Monitor Railway Build Status

**Priority**: P0  
**Action**: Check Railway dashboard for latest build.

**Validation Checklist**:
- [ ] YardFlow-Hitlist: Build succeeded
- [ ] YardFlow-Worker: Build succeeded
- [ ] Both show "Online" status
- [ ] No error badges visible

**If Build Fails**:
1. Check Build Logs for error
2. Fix locally and push
3. Re-verify

---

### Task U2.2: Verify Web Health Endpoint

**Priority**: P0  
**Command**:
```bash
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq .
```

**Expected Response**:
```json
{
  "status": "healthy",
  "database": { "status": "ok", "latencyMs": 50 },
  "redis": { "status": "ok", "latencyMs": 5 },
  "queues": { "status": "ok" }
}
```

**If 500 Error**:
1. Check Deploy Logs for startup error
2. Verify DATABASE_URL and REDIS_URL env vars
3. Check if Prisma migration needed

---

### Task U2.3: Verify Worker Service Processes Jobs

**Priority**: P1  
**Action**: Trigger a test job and verify it processes.

**Test Script**:
```bash
# Trigger research job via API
curl -X POST https://yardflow-hitlist-production-2f41.up.railway.app/api/research/enqueue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"accountId": "test-123"}'

# Check queue status
curl https://yardflow-hitlist-production-2f41.up.railway.app/api/queues/status \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Validation**: Job appears in queue and eventually completes.

---

### Task U2.4: Document Health Status in Go-Live Checklist

**Priority**: P1  
**File**: `docs/current/GO_LIVE_CHECKLIST.md`  
**Action**: Update with current verified status.

**Add Section**:
```markdown
## Verified: January 31, 2026

### Health Check Output
```json
{
  "status": "healthy",
  "database": { "status": "ok", "latencyMs": 62 },
  "redis": { "status": "ok", "latencyMs": 2 }
}
```

### Service Status
- [x] YardFlow-Hitlist: Online
- [x] YardFlow-Worker: Online
- [x] PostgreSQL: Connected
- [x] Redis: Connected
```

---

## Sprint U3: Core Flow E2E Testing (1.5 days)

**Goal**: Validate critical user journeys work end-to-end.  
**Demo**: QA checklist with all items checked.  
**Validation**: Smoke test script passes, manual flows verified.

### Task U3.1: Test Login Flow

**Priority**: P0  
**Action**: Manual test of NextAuth login.

**Steps**:
1. Go to `https://yardflow-hitlist-production-2f41.up.railway.app/login`
2. Enter `casey@freightroll.com` / `FreightRoll2026!`
3. Verify redirect to `/dashboard`
4. Verify user email shown in nav
5. Click "Sign out", verify redirect to login

**Validation**:
- [ ] Login succeeds
- [ ] Session persists on page refresh
- [ ] Sign out clears session

---

### Task U3.2: Test Account CRUD Operations

**Priority**: P0  
**Action**: Create, Read, Update, Delete account.

**Test Script**:
```bash
# Create
curl -X POST /api/accounts -d '{"name": "E2E Test Corp", "eventId": "..."}' | jq .

# Read
curl /api/accounts?search=E2E | jq .

# Update
curl -X PATCH /api/accounts/{id} -d '{"icpScore": 85}' | jq .

# Delete
curl -X DELETE /api/accounts/{id}
```

**Validation**: All operations return 200/201.

---

### Task U3.3: Test Meeting Creation → Event Day Appears

**Priority**: P0  
**Action**: Create meeting and verify it shows in war room.

**Steps**:
1. Go to `/dashboard/calendar`
2. Create new meeting for today
3. Go to `/dashboard/event-day`
4. Verify meeting appears in "Upcoming Meetings"

**Validation**: Meeting visible within 30 seconds of creation.

---

### Task U3.4: Test Outreach Creation and Status Updates

**Priority**: P0  
**Action**: Create outreach and verify status tracking.

**Steps**:
1. Go to `/dashboard/outreach`
2. Create new email outreach
3. Verify status is "DRAFT"
4. (If SendGrid configured) Send email
5. Verify status changes to "SENT"

**Validation**: Status transitions work correctly.

---

### Task U3.5: Extend Smoke Test Script

**Priority**: P1  
**File**: `eventops/tests/smoke/production.ts`  
**Action**: Add auth flow testing.

**Implementation**:
```typescript
async function testAuthFlow() {
  console.log('Testing auth flow...');
  
  // Test login endpoint exists
  const loginPage = await fetch(`${BASE_URL}/login`);
  assert(loginPage.status === 200, 'Login page loads');
  
  // Test protected route redirects
  const dashboardNoAuth = await fetch(`${BASE_URL}/dashboard`, {
    redirect: 'manual'
  });
  assert(dashboardNoAuth.status === 307, 'Dashboard redirects without auth');
  
  console.log('✅ Auth flow tests passed');
}
```

**Validation**: `npm run test:smoke` passes.

---

### Task U3.6: Create QA Checklist Document

**Priority**: P1  
**File**: `docs/current/QA_CHECKLIST.md`  
**Action**: Document all manual test steps.

**Content**:
```markdown
# QA Checklist - Manifest 2026

## Login Flow
- [ ] Login with casey@freightroll.com
- [ ] Session persists on refresh
- [ ] Sign out works

## Account Management
- [ ] View account list
- [ ] Create new account
- [ ] Edit account details
- [ ] View account dossier

## People/Contacts
- [ ] View people list
- [ ] Add person to account
- [ ] Edit person details

## Meetings (War Room)
- [ ] View calendar
- [ ] Create meeting
- [ ] Meeting appears in event-day
- [ ] Check-in to meeting works

## Outreach
- [ ] Create draft outreach
- [ ] View outreach list
- [ ] Track outreach status

## Event Day (War Room)
- [ ] Stats show correct counts
- [ ] Upcoming meetings visible
- [ ] Recent outreach visible
- [ ] Auto-refresh works (every 30s)
- [ ] War Room mode toggle works
```

---

## Sprint U4: Platform Integration Testing (1 day)

**Goal**: GTM-YardFlow (Vercel) can call Railway APIs.  
**Demo**: Browser console shows successful fetch from Vercel to Railway.  
**Validation**: Cross-origin requests succeed without CORS errors.

### Task U4.1: Set Environment Variables in Railway

**Priority**: P0  
**Platform**: Railway Dashboard → YardFlow-Hitlist → Variables

**Variables to Add**:
```bash
ALLOWED_ORIGINS=https://gtm-yard-flow.vercel.app,https://flow-state-klbt.vercel.app
SERVICE_TO_SERVICE_SECRET=<generate with: openssl rand -base64 32>
```

**Also Set in Vercel** (GTM-YardFlow project):
```bash
RAILWAY_API_URL=https://yardflow-hitlist-production-2f41.up.railway.app
SERVICE_TO_SERVICE_SECRET=<same value as Railway>
```

**Validation**: Both dashboards show variables configured.

---

### Task U4.2: Test CORS Preflight

**Priority**: P0  
**Command**:
```bash
curl -i -X OPTIONS \
  -H "Origin: https://gtm-yard-flow.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: x-service-key,x-user-id" \
  https://yardflow-hitlist-production-2f41.up.railway.app/api/accounts
```

**Expected Headers**:
```
Access-Control-Allow-Origin: https://gtm-yard-flow.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, x-service-key, x-user-id
Access-Control-Allow-Credentials: true
```

**Validation**: All CORS headers present.

---

### Task U4.3: Test S2S Auth Header Flow

**Priority**: P0  
**Command**:
```bash
curl -s \
  -H "x-service-key: $SERVICE_TO_SERVICE_SECRET" \
  -H "x-user-id: casey@freightroll.com" \
  https://yardflow-hitlist-production-2f41.up.railway.app/api/accounts | jq .
```

**Expected**: 200 response with accounts array.

**If 401 Error**: Check `authServiceOrSession()` implementation in route.

---

### Task U4.4: Create GTM Test Page

**Priority**: P1  
**Repo**: gtm-yard-flow (Vercel)  
**File**: `app/test/railway/page.tsx`

**Implementation**:
```tsx
'use client';

import { useState } from 'react';

export default function RailwayTestPage() {
  const [result, setResult] = useState('');

  async function testFetch() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_RAILWAY_URL}/api/accounts`,
      {
        headers: {
          'x-service-key': process.env.NEXT_PUBLIC_SERVICE_KEY!,
          'x-user-id': 'test@example.com',
        },
      }
    );
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
  }

  return (
    <div>
      <button onClick={testFetch}>Test Railway API</button>
      <pre>{result}</pre>
    </div>
  );
}
```

**Validation**: Page loads accounts from Railway without CORS error.

---

## Sprint U5: Pre-Event Hardening (2 days)

**Goal**: Production ready for Manifest 2026 with monitoring and runbook.  
**Demo**: Runbook accessible, alerts configured, data seeded, load tested.  
**Validation**: Pre-event checklist 100% complete.

### Task U5.1: Import Manifest 2026 Attendee List

**Priority**: P0  
**File**: Manifest 2026 attendee CSV  
**Action**: Import via `/dashboard/import` or seed script.

**Seed Script**:
```typescript
// prisma/seeds/manifest-2026.ts
import { prisma } from '../../src/lib/db';

const manifestAccounts = [
  { name: 'Target Company 1', industry: 'Logistics', icpScore: 90 },
  { name: 'Target Company 2', industry: 'Supply Chain', icpScore: 85 },
  // ... from attendee list
];

async function seed() {
  const event = await prisma.events.findFirst({
    where: { name: { contains: 'Manifest' } }
  });
  
  for (const account of manifestAccounts) {
    await prisma.target_accounts.create({
      data: { ...account, eventId: event.id }
    });
  }
}
```

**Validation**: `/dashboard/manifest` shows imported accounts.

---

### Task U5.2: Configure Railway Health Check Alerts

**Priority**: P1  
**Platform**: Railway Dashboard → Settings → Observability

**Configuration**:
- Health check endpoint: `/api/health`
- Check interval: 30 seconds
- Alert on: 3 consecutive failures
- Notification: Email to team

**Validation**: Test by temporarily breaking health endpoint, verify alert fires.

---

### Task U5.3: Update Incident Runbook

**Priority**: P1  
**File**: `docs/current/GO_LIVE_CHECKLIST.md` (expand INCIDENT RUNBOOK section)

**Content**:
```markdown
## 🆘 Incident Runbook

### Symptom: 502 Bad Gateway
1. Check Railway dashboard for deployment status
2. Check Deploy Logs for startup errors
3. Verify DATABASE_URL and REDIS_URL env vars
4. Try rollback to previous deployment

### Symptom: Health check failing
1. SSH/check Deploy Logs
2. Check database connectivity: `SELECT 1`
3. Check Redis connectivity
4. Restart service via Railway dashboard

### Symptom: Slow response times
1. Check database query latency
2. Check Redis queue depth
3. Scale up Railway service (add replicas)

### Rollback Procedure
1. Go to Railway → Deployments
2. Find last green deployment
3. Click ... → Rollback
4. Verify /api/health returns 200
```

---

### Task U5.4: Test Rollback Procedure

**Priority**: P1  
**Action**: Practice rollback to verify it works.

**Steps**:
1. Note current deployment hash
2. Push intentionally broken commit (e.g., syntax error)
3. Wait for failed deploy
4. Rollback to noted deployment
5. Verify health check passes

**Validation**: Rollback completes in < 5 minutes.

---

### Task U5.5: Run Load Test

**Priority**: P1  
**Tool**: k6 or Artillery  
**Target**: 50 concurrent users for 5 minutes

**k6 Script**:
```javascript
// scripts/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '5m',
};

export default function () {
  const res = http.get('https://yardflow-hitlist-production-2f41.up.railway.app/api/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

**Run**:
```bash
k6 run scripts/load-test.js
```

**Validation**:
- 95th percentile response time < 500ms
- Error rate < 1%
- No memory leaks (RAM stable)

---

### Task U5.6: Create Pre-Event Checklist

**Priority**: P0  
**File**: `docs/current/PRE_EVENT_CHECKLIST.md`

**Content**:
```markdown
# Pre-Event Checklist - Manifest 2026

## 1 Week Before (Feb 3-7)
- [ ] Verify login works for all team members
- [ ] Import final attendee list
- [ ] Create event-specific email templates
- [ ] Configure lead scoring thresholds
- [ ] Test booth traffic tracking zones
- [ ] Run load test (50 users)

## Day Before (Feb 9)
- [ ] Check Railway health status
- [ ] Verify Redis connection stable
- [ ] Test email sending (if SendGrid configured)
- [ ] Export analytics baseline
- [ ] Bookmark War Room URL

## Day Of (Feb 10-12)
- [ ] Monitor /api/health hourly
- [ ] Check event-day dashboard every 2 hours
- [ ] Export booth traffic data EOD
- [ ] Document any issues for post-mortem
```

---

### Task U5.7: Dry Run Day-Of Procedures

**Priority**: P1  
**Action**: Walk through the Day-Of checklist as if it were event day.

**Steps**:
1. Open War Room dashboard
2. Enter full-screen mode
3. Simulate checking in to a meeting
4. Create test outreach
5. View analytics/stats
6. Export a report

**Validation**: All actions complete without errors.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| UI fixes take longer than 2 days | Medium | High | Start with highest-impact: nav overflow + war room mode |
| Load test reveals bottleneck | Medium | High | Have Railway scaling plan (add replicas) |
| Platform integration fails | Low | Medium | S2S auth already coded, just needs testing |
| Redis outage during event | Low | High | Event-day dashboard should cache last fetch |
| Import fails for attendee list | Medium | Medium | Test import with sample data first |

---

## Sprint Dependencies

```
U0 (Audit) ─────────────────────────────────────┐
                                                │
U1 (UI Fixes) ◀─────────────────────────────────┤
                                                │
U2 (Deploy Verification) ◀──────────────────────┤ (Parallel with U1)
                                                │
U3 (E2E Testing) ◀──────────────────────────────┤
     │                                          │
     └──── U4 (Platform Integration) ◀──────────┤ (Parallel with U3)
                │                               │
                └─────── U5 (Hardening) ◀───────┘
```

---

## Success Criteria

1. ✅ War room readable on 1920x1080 screens
2. ✅ Navigation usable on all screen sizes
3. ✅ Both Railway services healthy
4. ✅ Critical user flows work end-to-end
5. ✅ GTM-YardFlow can call Railway APIs
6. ✅ Runbook and monitoring in place
7. ✅ Load test passes (50 concurrent users)
8. ✅ Pre-event checklist 100% complete

---

## Appendix: File Reference

```
/workspaces/YardFlow-Hitlist/
├── docs/
│   └── current/
│       ├── MANIFEST_SPRINT_PLAN.md    # This file
│       ├── GO_LIVE_CHECKLIST.md       # Event checklist
│       ├── QA_CHECKLIST.md            # Manual test steps
│       └── PRE_EVENT_CHECKLIST.md     # Day-before checklist
├── eventops/
│   ├── src/
│   │   ├── app/dashboard/
│   │   │   ├── event-day/page.tsx     # War Room
│   │   │   ├── accounts/page.tsx      # Account list
│   │   │   ├── people/page.tsx        # Contact list
│   │   │   └── layout.tsx             # Dashboard layout
│   │   └── components/
│   │       ├── dashboard-nav.tsx      # Navigation (fix target)
│   │       ├── war-room-mode.tsx      # Full-screen toggle (new)
│   │       └── layout/mobile-nav.tsx  # Hamburger menu
│   └── scripts/
│       ├── capture-desktop-screenshots.sh
│       ├── visual-regression.sh
│       └── load-test.js
└── scripts/
    └── test-s2s-integration.sh
```

---

_Document Version: 1.0_  
_Created: 2026-01-31_  
_Reviewed: AI Senior TPM Subagent_
