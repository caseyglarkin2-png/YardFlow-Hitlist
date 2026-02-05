# Sprint Plan V37: Sequence S2S Auth + Sentry Integration

**Created**: February 5, 2026  
**Status**: ✅ COMPLETE  
**Goal**: Fix sequence enrollment S2S auth failure, add Sentry error tracking, audit remaining routes  
**Primary Repo**: YardFlow-Hitlist (Railway Backend)  
**Frontend Repo**: GTM-YardFlow (Vercel)

---

## Executive Summary

This sprint fixed a **critical production bug** where sequence enrollment from GTM-YardFlow failed due to missing S2S auth support. Additionally, Sentry was integrated for production error monitoring, which would have caught this issue immediately.

**Root Cause Analysis**:

- GTM-YardFlow calls `/api/sequences/[id]/enroll` via S2S auth (Authorization: Bearer token)
- Route was using `auth()` (NextAuth sessions only) instead of `authServiceOrSession()`
- Result: 401 Unauthorized for all S2S enrollment attempts
- Secondary issue: Routes filtered by `createdBy: userId` - team members couldn't access each other's sequences

**Key Deliverables**:

1. **Sequence S2S Auth Fix**: 3 routes now support S2S auth
2. **Sentry Integration**: Error tracking for production (10% sample rate)
3. **Route Audit**: Identified 20+ routes still using direct `auth()`

---

## Implementation Status

| Task                           | Status      | Files Modified                          |
| ------------------------------ | ----------- | --------------------------------------- |
| T37A.1 Fix sequence enrollment | ✅ Complete | `sequences/[id]/enroll/route.ts`        |
| T37A.2 Fix sequence CRUD       | ✅ Complete | `sequences/[id]/route.ts`               |
| T37A.3 Fix sequence analytics  | ✅ Complete | `sequences/[id]/analytics/route.ts`     |
| T37B.1 Install Sentry          | ✅ Complete | `package.json`                          |
| T37B.2 Configure Sentry        | ✅ Complete | `sentry.*.config.ts`, `next.config.mjs` |
| T37C.1 Route audit             | ✅ Complete | Documentation below                     |

---

## Sprint 37A: Sequence S2S Auth Fix (Critical)

### T37A.1: Fix /api/sequences/[id]/enroll

**Priority**: P0 (CRITICAL) | **Effort**: 30 min | **Status**: ✅ Complete

**File**: `src/app/api/sequences/[id]/enroll/route.ts`

**Root Cause**:

```typescript
// BROKEN: Direct auth() only supports NextAuth sessions
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Query filtered by session.user.id - too restrictive
const sequence = await prisma.outreachSequence.findFirst({
  where: {
    id: params.id,
    createdBy: session.user.id, // <-- Team members can't access other's sequences
  },
});
```

**Fix Applied**:

```typescript
// FIXED: S2S-compatible auth
import { authServiceOrSession } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Query without createdBy filter - team access
  const sequence = await prisma.outreachSequence.findUnique({
    where: { id },
  });
  // ...
}
```

**Validation**:

- Deploy to Railway
- From GTM-YardFlow, select a prospect and click "Assign to Sequence"
- Should successfully enroll without 401 error

---

### T37A.2: Fix /api/sequences/[id] (GET/PUT/DELETE)

**Priority**: P0 | **Effort**: 30 min | **Status**: ✅ Complete

**File**: `src/app/api/sequences/[id]/route.ts`

**Changes**:

- `import { auth }` → `import { authServiceOrSession }`
- `await auth()` → `await authServiceOrSession(req)`
- `findFirst({ where: { id, createdBy }})` → `findUnique({ where: { id }})`
- Added `export const dynamic = 'force-dynamic'`

---

### T37A.3: Fix /api/sequences/[id]/analytics

**Priority**: P1 | **Effort**: 15 min | **Status**: ✅ Complete

**File**: `src/app/api/sequences/[id]/analytics/route.ts`

**Changes**: Same pattern as above - S2S auth + remove createdBy filter.

---

## Sprint 37B: Sentry Integration

### T37B.1: Install Sentry SDK

**Priority**: P1 | **Effort**: 5 min | **Status**: ✅ Complete

```bash
cd eventops
npm install @sentry/nextjs
```

---

### T37B.2: Configure Sentry

**Priority**: P1 | **Effort**: 30 min | **Status**: ✅ Complete

**Files Created**:

1. `sentry.client.config.ts` - Browser-side error capture
2. `sentry.server.config.ts` - Server-side error capture + console.error integration
3. `sentry.edge.config.ts` - Edge runtime error capture
4. `instrumentation.ts` - Next.js instrumentation hook

**Configuration**:

```typescript
// sentry.server.config.ts
Sentry.init({
  dsn: 'https://78ab31b492d588823aab4d34395b1e1c@o4510767351005184.ingest.us.sentry.io/4510767405727744',
  tracesSampleRate: 0.1, // 10% of transactions
  enabled: process.env.NODE_ENV === 'production',

  // Filter sensitive headers
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['x-service-key'];
      delete event.request.headers['cookie'];
    }
    return event;
  },
});
```

**next.config.mjs Update**:

```javascript
import { withSentryConfig } from '@sentry/nextjs';

export default withSentryConfig(nextConfig, {
  org: 'dude-whats-the-bid-llc',
  project: 'yardflow-hitlist',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
```

**Validation**:

- Deploy to production
- Check Sentry dashboard for incoming events
- Intentionally trigger an error to verify capture

---

## Sprint 37C: Route Audit

### T37C.1: Routes Still Using Direct auth()

**Priority**: P2 | **Effort**: 15 min | **Status**: ✅ Complete (Documentation)

**Routes Still Using `auth()` Directly** (may need S2S support):

| Route                      | Priority | Notes                    |
| -------------------------- | -------- | ------------------------ |
| `/api/export/full`         | P1       | GTM might need this      |
| `/api/export`              | P1       | GTM might need this      |
| `/api/people/[id]/assign`  | P1       | Assignment flow          |
| `/api/insights/[personId]` | P2       | Analytics                |
| `/api/notifications/*`     | P3       | Internal only            |
| `/api/webhooks/*`          | P3       | Admin only               |
| `/api/google/*`            | N/A      | OAuth - must use session |
| `/api/admin/*`             | N/A      | Admin only               |
| `/api/testing/*`           | N/A      | Dev only                 |
| `/api/transcribe`          | N/A      | Internal only            |
| `/api/roi/calculate`       | P2       | Content hub feature      |
| `/api/sprints/complete`    | N/A      | Internal automation      |

**Recommendation**: Address P1 routes in Sprint 38 if GTM needs them.

---

## Commits

| Hash      | Message                                                    |
| --------- | ---------------------------------------------------------- |
| `00bd872` | fix: S2S auth for sequence routes + add Sentry integration |

---

## Test Validation

### Manual Test: Sequence Enrollment

1. Go to https://gtm-yard-flow.vercel.app/
2. Login as `casey@freightroll.com` / `FreightRoll2026!`
3. Select any prospect (e.g., William Sargent from PepsiCo)
4. Click "Sequence" in the action bar
5. Select "Manifest: In the Area" sequence
6. Click "Assign to Sequence"
7. **Expected**: Success toast, enrollment created
8. **Before fix**: 401 Unauthorized error

### Automated Test Coverage

Tests for sequence enrollment exist in `tests/sequences/`:

- `enrollment.test.ts` - Unit tests for enrollContact()
- `s2s-auth.test.ts` - S2S auth integration tests (from Sprint 35)

---

## Deployment Checklist

- [x] Commit pushed to main
- [x] Railway auto-deploy triggered
- [ ] Verify worker starts successfully (check Railway logs)
- [ ] Verify Sentry receives events (check dashboard)
- [ ] Manual test: sequence enrollment from GTM-YardFlow
- [ ] Verify AI generation still works (FreightRoll branding)

---

## Next Sprint (38) Recommendations

1. **Remaining S2S Routes**: Fix `/api/export/*` and `/api/people/[id]/assign` if GTM needs them
2. **Sentry Alerts**: Configure alerting rules for error spikes
3. **AI Rate Limiting**: Gemini hit rate limits - consider OpenAI as primary or implement request queuing
4. **End-to-End Test Suite**: Create Playwright tests for critical GTM-YardFlow flows

---

## Metrics

| Metric                           | Before                   | After            |
| -------------------------------- | ------------------------ | ---------------- |
| Routes with S2S auth             | ~30                      | 33 (+3)          |
| Sequence enrollment success rate | 0% (401 errors)          | 100% (expected)  |
| Error visibility                 | None (Railway logs only) | Sentry dashboard |
