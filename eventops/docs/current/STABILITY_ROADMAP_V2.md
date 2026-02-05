# YardFlow-Hitlist: Stability & Bug Fix Roadmap v2

**Created**: February 5, 2026  
**Revised**: February 5, 2026 (Subagent Review Applied)  
**Goal**: Zero bugs, full GTM integration, Sentry-monitored stability  
**Philosophy**: Ship Fast, Ship Often - atomic commits with validation

---

## Executive Summary

### Current State Audit Results

| Category | Status | Details |
|----------|--------|---------|
| **S2S Auth** | 🟡 Partial | 76 routes migrated, **61 remaining** (1 partial migration) |
| **Lint Warnings** | 🟡 Warning | 234 warnings (any types, unused vars, React hooks) |
| **Worker** | 🟢 Healthy | Retry logic, graceful shutdown, heartbeat working |
| **Tests** | 🟢 Passing | 177 tests pass, 12 skipped (17 test files) |
| **Sentry** | 🟡 Partial | SDK integrated, but no explicit error capture in routes |
| **Build** | 🟢 Clean | Lint warnings don't block build |

### Core Problem

GTM-YardFlow (Vercel) calls Railway APIs using S2S Bearer token auth. Routes that use `auth()` directly only support NextAuth sessions → **401 Unauthorized** for GTM features.

### Migration Statistics

```
Total API routes:       185
Using authServiceOrSession: 76  (41%)
Using auth() directly:      61  (33%)
No auth required:           48  (26%)
Partial migration:           1  (export/route.ts)
```

### Routes to EXCLUDE from Migration

These routes **intentionally** use session-based auth and should NOT be migrated:
- `/api/auth/session/route.ts` - Bridge endpoint for session validation
- `/api/auth/[...nextauth]/route.ts` - NextAuth internal handler
- `/api/google/*` routes - Require OAuth tokens from session (special handling)

---

## Sprint Structure

Each sprint produces:
1. Demoable, tested functionality
2. Atomic commits with validation
3. Railway deployment verification

**Time Estimate**: ~15-20 minutes per route migration

---

## Sprint 38: Critical S2S Auth (P0 Routes)

**Goal**: Fix routes most critical to GTM-YardFlow user workflows  
**Estimated Time**: 2-3 hours  
**Prerequisites**: Verify `CRON_SECRET` and `SERVICE_TO_SERVICE_SECRET` are set in Railway

### Ticket 38.1: Fix People Assign Route (~20 min)

**File**: `src/app/api/people/[id]/assign/route.ts`  
**Impact**: GTM "Assign" button fails for all users

```typescript
// Current (broken)
import { auth } from '@/auth';
const session = await auth();

// Target
import { authServiceOrSession } from '@/lib/auth-service';
const authResult = await authServiceOrSession(req);
```

**Validation**:
- [ ] `npm run lint` passes
- [ ] Create test `tests/integration/people-assign-s2s.test.ts`
- [ ] Manual: Assign person via GTM-YardFlow
- [ ] Commit: `fix: S2S auth for people assign route`

---

### Ticket 38.2: Fix Export Routes (~30 min)

**Files**: 
- `src/app/api/export/full/route.ts` - Full migration needed
- `src/app/api/export/route.ts` - **POST only** (GET already uses authServiceOrSession)

**Impact**: Export buttons fail in GTM

**Validation**:
- [ ] `npm run lint` passes
- [ ] Create test `tests/integration/export-s2s.test.ts`
- [ ] Manual: Export accounts via GTM-YardFlow
- [ ] Commit: `fix: S2S auth for export routes`

---

### Ticket 38.3: Fix Outreach Routes (~1 hour)

**Files** (5 files needing migration):
- `src/app/api/outreach/[id]/route.ts`
- `src/app/api/outreach/[id]/mark-sent/route.ts`
- `src/app/api/outreach/export/route.ts`
- `src/app/api/outreach/generate/route.ts`
- `src/app/api/outreach/generate-ai/route.ts`

**Note**: `src/app/api/outreach/route.ts` already uses `authServiceOrSession`

**Impact**: All outreach management fails in GTM

**Validation**:
- [ ] `npm run lint` passes
- [ ] Create test `tests/integration/outreach-s2s.test.ts`
- [ ] Manual: Create/edit outreach in GTM
- [ ] Commit: `fix: S2S auth for outreach routes`

---

### Ticket 38.4: Fix Meeting Routes (~30 min)

**Files**:
- `src/app/api/meetings/route.ts`
- `src/app/api/meetings/[id]/route.ts`

**Impact**: Meeting scheduling broken in GTM

**Validation**:
- [ ] `npm run lint` passes
- [ ] Create test `tests/integration/meetings-s2s.test.ts`
- [ ] Commit: `fix: S2S auth for meeting routes`

---

### Sprint 38 Completion Criteria

- [ ] All 9 files migrated to `authServiceOrSession`
- [ ] 4 new test files created and passing
- [ ] Railway deploy successful
- [ ] GTM-YardFlow manual smoke test passes
- [ ] Reference [ROLLBACK_PROCEDURE.md](ROLLBACK_PROCEDURE.md) if issues arise

---

## Sprint 39: Secondary S2S Auth Routes

**Goal**: Fix remaining high-traffic routes used by GTM  
**Estimated Time**: 3-4 hours

### Ticket 39.1: Fix Contact Insights Route (~20 min)

**File**: `src/app/api/contact/[id]/insights/route.ts`

**Validation**:
- [ ] Test: `tests/integration/contact-insights-s2s.test.ts`
- [ ] Commit: `fix: S2S auth for contact insights route`

---

### Ticket 39.2: Fix Notification Routes (~45 min)

**Files**:
- `src/app/api/notifications/route.ts`
- `src/app/api/notifications/[id]/route.ts`
- `src/app/api/notifications/mark-read/route.ts`
- `src/app/api/notifications/mark-all-read/route.ts`

**Validation**:
- [ ] Test: `tests/integration/notifications-s2s.test.ts`
- [ ] Commit: `fix: S2S auth for notification routes`

---

### Ticket 39.3: Fix Queue/Analytics Routes (~45 min)

**Files**:
- `src/app/api/queue/stats/route.ts`
- `src/app/api/queue/enrich/route.ts`
- `src/app/api/queue/status/[jobId]/route.ts`
- `src/app/api/engagement/score/route.ts`

**Validation**:
- [ ] Test: `tests/integration/queue-s2s.test.ts`
- [ ] Commit: `fix: S2S auth for queue and analytics routes`

---

### Ticket 39.4: Fix Activity/Search Routes (~30 min)

**Files**:
- `src/app/api/activity/stream/route.ts`
- `src/app/api/search/advanced/route.ts`

**Validation**:
- [ ] Test: `tests/integration/activity-search-s2s.test.ts`
- [ ] Commit: `fix: S2S auth for activity and search routes`

---

### Sprint 39 Completion Criteria

- [ ] 11 additional routes migrated
- [ ] Tests for each route group
- [ ] Deploy successful

---

## Sprint 40: Remaining S2S Routes (Non-OAuth)

**Goal**: Complete auth migration for non-OAuth routes  
**Estimated Time**: 4-5 hours

### Ticket 40.1: HubSpot/Admin Routes (~30 min)

**Files**:
- `src/app/api/hubspot/sync/contacts/route.ts`
- `src/app/api/admin/google-sync/control/route.ts`
- `src/app/api/admin/seed/route.ts`

**Validation**:
- [ ] Test: `tests/integration/admin-s2s.test.ts`
- [ ] Commit: `fix: S2S auth for admin routes`

---

### Ticket 40.2: Training Routes (~45 min)

**Files**:
- `src/app/api/training/content/route.ts`
- `src/app/api/training/content/[id]/route.ts`
- `src/app/api/training/drive/list/route.ts`
- `src/app/api/training/import/youtube/route.ts`
- `src/app/api/training/import/hubspot/route.ts`

**Validation**:
- [ ] Test: `tests/integration/training-s2s.test.ts`
- [ ] Commit: `fix: S2S auth for training routes`

---

### Ticket 40.3: Remaining Feature Routes (~2 hours)

**Files**:
- `src/app/api/webhooks/route.ts`
- `src/app/api/webhooks/[id]/route.ts`
- `src/app/api/insights/[personId]/route.ts`
- `src/app/api/workflows/launch/route.ts`
- `src/app/api/manifest/questions/route.ts`
- `src/app/api/manifest/track-request/route.ts`
- `src/app/api/manifest/track-view/route.ts`
- `src/app/api/manifest/generate-request/route.ts`
- `src/app/api/targets/top/route.ts`
- `src/app/api/briefing/daily/route.ts`
- `src/app/api/ocr/badge/route.ts`
- `src/app/api/linkedin/track-connection/route.ts`
- `src/app/api/bulk/tag/route.ts`
- `src/app/api/presence/route.ts`
- `src/app/api/roi/calculate/route.ts`
- `src/app/api/testing/ab/[testId]/route.ts`
- `src/app/api/sprints/complete/route.ts`
- `src/app/api/transcribe/route.ts`
- `src/app/api/reports/pdf/route.ts`

**Validation**:
- [ ] Tests for each group
- [ ] Commit: `fix: S2S auth for remaining feature routes`

---

### Sprint 40 Completion Criteria

- [ ] All non-OAuth routes migrated
- [ ] Comprehensive test coverage
- [ ] Deploy successful

---

## Sprint 40.5: Google OAuth Routes (Special Handling)

**Goal**: Migrate Google routes with OAuth token preservation  
**Estimated Time**: 2-3 hours  
**Risk Level**: HIGH - May break OAuth flow

### ⚠️ IMPORTANT: OAuth Token Requirement

Google integration routes require OAuth tokens stored in the user session. Migrating these routes to S2S auth ONLY will break them because:
1. S2S calls don't have session tokens
2. OAuth refresh tokens must come from session

**Strategy**: Use hybrid auth - accept BOTH S2S (for non-OAuth operations) AND session (for OAuth operations).

### Ticket 40.5.1: Audit Google Routes (~30 min)

For each route, determine if it:
- Needs OAuth tokens (KEEP session auth)
- Only does DB operations (CAN migrate to S2S)

**Files to audit**:
- `src/app/api/google/connect/route.ts` - OAuth required
- `src/app/api/google/disconnect/route.ts` - Session required
- `src/app/api/google/calendar/sync/route.ts` - OAuth required
- `src/app/api/google/gmail/check-replies/route.ts` - OAuth required
- `src/app/api/google/contacts/import/route.ts` - OAuth required
- `src/app/api/google/sync/control/route.ts` - May not need OAuth

---

### Ticket 40.5.2: Implement Hybrid Auth for Google Routes

For routes that need OAuth:
```typescript
import { authServiceOrSession } from '@/lib/auth-service';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  // Try S2S first
  const authResult = await authServiceOrSession(req);
  
  // If S2S auth, this is a status/config request - no OAuth needed
  if (authResult?.serviceAuth) {
    // Handle S2S case (limited operations)
    return handleServiceRequest(authResult);
  }
  
  // For user operations, get full session with OAuth tokens
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Proceed with OAuth-dependent operation
  return handleUserRequest(session);
}
```

**Validation**:
- [ ] OAuth flow still works (connect/disconnect)
- [ ] Calendar sync works
- [ ] Gmail check-replies works
- [ ] Contacts import works
- [ ] Commit: `feat: Hybrid auth for Google OAuth routes`

---

### Sprint 40.5 Completion Criteria

- [ ] All Google routes audited
- [ ] OAuth flows tested end-to-end
- [ ] S2S operations work where applicable
- [ ] **No regressions in OAuth functionality**

---

## Sprint 41: Sentry Enhancement

**Goal**: Explicit error capture in all routes  
**Estimated Time**: 2-3 hours

### Ticket 41.1: Create Sentry Error Wrapper (~30 min)

**File**: `src/lib/sentry-utils.ts` (NEW FILE)

```typescript
import * as Sentry from '@sentry/nextjs';

interface RouteErrorContext {
  route: string;
  method: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

export function captureRouteError(
  error: unknown,
  context: RouteErrorContext
): Error {
  const err = error instanceof Error ? error : new Error(String(error));
  
  Sentry.captureException(err, {
    tags: {
      route: context.route,
      method: context.method,
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: context.extra,
  });
  
  return err;
}

export function captureRouteMessage(
  message: string,
  level: 'info' | 'warning' | 'error',
  context: RouteErrorContext
): void {
  Sentry.captureMessage(message, {
    level,
    tags: {
      route: context.route,
      method: context.method,
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: context.extra,
  });
}
```

**Validation**:
- [ ] Unit test `tests/lib/sentry-utils.test.ts`
- [ ] Verify Sentry receives test error
- [ ] Commit: `feat: Add Sentry error capture utilities`

---

### Ticket 41.2: Add Sentry to High-Traffic Routes (~1.5 hours)

Add `captureRouteError` to catch blocks in:
- `src/app/api/ai/chat/route.ts`
- `src/app/api/sequences/[id]/enroll/route.ts`
- `src/app/api/accounts/[id]/route.ts`
- `src/app/api/people/[id]/route.ts`
- `src/app/api/outreach/route.ts`

Pattern:
```typescript
catch (error) {
  captureRouteError(error, {
    route: '/api/ai/chat',
    method: 'POST',
    userId: authResult?.userId,
  });
  const message = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json({ error: message }, { status: 500 });
}
```

**Validation**:
- [ ] Test errors appear in Sentry dashboard
- [ ] Commit: `feat: Add Sentry error capture to high-traffic routes`

---

### Ticket 41.3: Add Sentry Alerts (~30 min)

Configure in Sentry dashboard:
- Alert on 5+ errors/minute (same error)
- Alert on new error types
- Weekly digest email

**Validation**:
- [ ] Trigger test alert
- [ ] Verify notification received

---

### Sprint 41 Completion Criteria

- [ ] Sentry captures all route errors
- [ ] Alerts configured
- [ ] Test error visible in Sentry dashboard

---

## Sprint 42: Lint Cleanup (Technical Debt)

**Goal**: Eliminate all 234 lint warnings  
**Estimated Time**: 3-4 hours  
**Note**: Can be parallelized with Sprint 41

### Ticket 42.1: Fix Unused Variables (~1 hour)

**Estimated**: ~80 warnings

Pattern: Prefix with `_` or remove

```typescript
// Before
catch (error) { // 'error' is defined but never used

// After  
catch (_error) {
```

**Files** (top offenders):
- `src/app/dashboard/ab-test/page.tsx` (4 warnings)
- `src/app/dashboard/import/preview/page.tsx` (3 warnings)
- `src/lib/ai/gemini-client.ts` (2 warnings)

**Validation**:
- [ ] `npm run lint | grep "is defined but never used" | wc -l` returns 0
- [ ] Commit: `refactor: Fix unused variable lint warnings`

---

### Ticket 42.2: Fix `any` Types (~2 hours)

**Estimated**: ~120 warnings

Pattern: Replace with proper types or `unknown`

```typescript
// Before
const data: any = await response.json();

// After
const data: Record<string, unknown> = await response.json();
// OR with specific type
interface ResponseData { id: string; name: string; }
const data = await response.json() as ResponseData;
```

**Files** (top offenders):
- `src/lib/enrichment/company-enrichment-orchestrator.ts` (7 warnings)
- `src/lib/outreach/email-sender.ts` (6 warnings)
- `src/app/dashboard/manifest/requests/page.tsx` (4 warnings)

**Validation**:
- [ ] `npm run lint | grep "Unexpected any" | wc -l` returns 0
- [ ] Commit: `refactor: Replace any types with proper typing`

---

### Ticket 42.3: Fix React Hook Dependencies (~30 min)

**Estimated**: ~10 warnings

Pattern: Add missing deps or use `useCallback`

```typescript
// Before
useEffect(() => { loadData(); }, []); // Missing 'loadData'

// After
const loadData = useCallback(() => { ... }, [deps]);
useEffect(() => { loadData(); }, [loadData]);
```

**Files**:
- `src/app/dashboard/activity/page.tsx`
- `src/app/dashboard/analytics-advanced/page.tsx`
- `src/app/dashboard/campaigns/[id]/page.tsx`
- `src/app/dashboard/meetings/[id]/page.tsx`
- `src/app/dashboard/notifications/page.tsx`

**Validation**:
- [ ] `npm run lint | grep "exhaustive-deps" | wc -l` returns 0
- [ ] Commit: `refactor: Fix React hook dependency warnings`

---

### Ticket 42.4: Fix Unused Imports (~30 min)

**Estimated**: ~24 warnings

Remove all unused imports

**Validation**:
- [ ] `npm run lint | grep "is defined but never used" | wc -l` returns 0
- [ ] Commit: `refactor: Remove unused imports`

---

### Sprint 42 Completion Criteria

- [ ] `npm run lint` reports 0 warnings
- [ ] Build still succeeds
- [ ] All tests pass
- [ ] No runtime regressions

---

## Sprint 43: Test Coverage Expansion

**Goal**: Increase test coverage for API routes  
**Estimated Time**: 4-5 hours

### Ticket 43.1: Core Route Tests (~2 hours)

Create test files:
- `tests/integration/accounts-crud.test.ts`
- `tests/integration/people-crud.test.ts`
- `tests/integration/ai-chat.test.ts`

**Validation**:
- [ ] Each test file has 5+ test cases
- [ ] All tests pass
- [ ] Commit: `test: Add core route integration tests`

---

### Ticket 43.2: E2E Flow Tests (~2 hours)

- E2E sequence enrollment flow
- E2E email sending flow
- E2E AI chat conversation flow

**Validation**:
- [ ] Each flow test covers happy path + error cases
- [ ] Commit: `test: Add E2E flow tests`

---

### Sprint 43 Completion Criteria

- [ ] 200+ tests total
- [ ] All critical paths have integration tests

---

## Quick Reference: File Lists

### Sprint 38 (P0 - 9 files)

```
src/app/api/people/[id]/assign/route.ts
src/app/api/export/full/route.ts
src/app/api/export/route.ts (POST only)
src/app/api/outreach/[id]/route.ts
src/app/api/outreach/[id]/mark-sent/route.ts
src/app/api/outreach/export/route.ts
src/app/api/outreach/generate/route.ts
src/app/api/outreach/generate-ai/route.ts
src/app/api/meetings/route.ts
src/app/api/meetings/[id]/route.ts
```

### Validation Commands

```bash
cd eventops

# Lint check (must pass)
npm run lint

# Type check
npx tsc --noEmit

# Run all tests
npm test

# Run specific test file
npm test tests/integration/people-assign-s2s.test.ts

# Build check
npm run build

# Find remaining auth() routes
grep -rl "from '@/auth'" src/app/api --include="*.ts" | wc -l

# Find partial migrations (both imports)
grep -l "from '@/auth'" src/app/api/**/*.ts | xargs -I{} grep -l "authServiceOrSession" {}
```

### S2S Auth Migration Pattern

```typescript
// BEFORE (broken for GTM)
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  // ...
}

// AFTER (works for GTM + direct sessions)
import { authServiceOrSession } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authResult.userId;
    // ...
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

---

## Progress Tracking

| Sprint | Status | Est. Time | Completion Date | Notes |
|--------|--------|-----------|-----------------|-------|
| 37 | ✅ Done | - | Feb 5, 2026 | Sentry + Sequence S2S fix |
| 38 | ⬜ Not Started | 2-3 hrs | - | Critical S2S routes (9 files) |
| 39 | ⬜ Not Started | 3-4 hrs | - | Secondary S2S routes (11 files) |
| 40 | ⬜ Not Started | 4-5 hrs | - | Remaining S2S routes (~30 files) |
| 40.5 | ⬜ Not Started | 2-3 hrs | - | Google OAuth routes (6 files) |
| 41 | ⬜ Not Started | 2-3 hrs | - | Sentry enhancement |
| 42 | ⬜ Not Started | 3-4 hrs | - | Lint cleanup (234 warnings) |
| 43 | ⬜ Not Started | 4-5 hrs | - | Test coverage |

**Total Estimated Time**: ~22-30 hours

---

## Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Google OAuth routes break | High | Critical | Sprint 40.5 isolated, hybrid auth pattern |
| Lint fixes cause runtime bugs | Low | Medium | Run full test suite after each batch |
| S2S migration breaks existing users | Low | High | authServiceOrSession supports BOTH patterns |
| Sentry overload (too many events) | Low | Low | 10% sample rate configured |

---

## Definition of Done

A sprint is complete when:
1. All code changes committed and pushed
2. `npm run lint` passes
3. `npm test` passes (all tests)
4. Railway build succeeds
5. Manual smoke test from GTM-YardFlow passes
6. Sprint documentation updated

---

## Appendix: Useful Scripts

### Check Migration Status

```bash
# Routes still using auth()
echo "Routes needing migration:"
grep -rl "from '@/auth'" src/app/api --include="*.ts" | wc -l

# Routes using authServiceOrSession
echo "Routes already migrated:"
grep -rl "authServiceOrSession" src/app/api --include="*.ts" | wc -l
```

### Verify Railway Environment

```bash
# These must be set for S2S auth to work:
# - CRON_SECRET
# - SERVICE_TO_SERVICE_SECRET (if used)
# - AUTH_SECRET
```

---

*Document revised based on subagent review (Feb 5, 2026). Ready for execution.*
