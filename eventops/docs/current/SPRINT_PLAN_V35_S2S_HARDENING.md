# Sprint Plan V35: S2S Auth Hardening & Worker Reliability

**Created**: February 5, 2026  
**Status**: ✅ COMPLETE  
**Goal**: Extend S2S auth to all GTM-required endpoints, enhance worker startup reliability, improve error documentation  
**Primary Repo**: YardFlow-Hitlist (Railway Backend)  
**Frontend Repo**: GTM-YardFlow (Vercel)

---

## Executive Summary

This sprint extends S2S authentication to 12+ additional API routes identified in Sprint 34 review as missing S2S support - these routes return 403 when GTM-YardFlow calls them. Additionally, we enhanced worker reliability with startup health checks and improved cross-repo documentation.

**Key Deliverables**:

1. **S2S Auth**: 12 additional routes now support both session and S2S auth
2. **Worker Startup**: Integrated `runStartupChecks()` - fails fast if DB/Redis unavailable
3. **SendGrid Verification**: Actual API connectivity check, not just key presence
4. **GTM Documentation**: Added error code reference table with retry strategy

---

## Implementation Status

| Task                          | Status      | Files Modified                                      |
| ----------------------------- | ----------- | --------------------------------------------------- |
| T35A.1 Audit routes           | ✅ Complete | Documentation only                                  |
| T35A.2 Fix /api/integrations  | ✅ Complete | `integrations/route.ts`                             |
| T35A.3 Fix /api/reports/\*    | ✅ Complete | `reports/schedule/route.ts`, `reports/pdf/route.ts` |
| T35A.4 Fix /api/ab-tests/\*   | ✅ Complete | `ab-tests/route.ts`, `ab-tests/[id]/route.ts`       |
| T35A.5 Fix /api/enrichment/\* | ✅ Complete | 8 enrichment routes                                 |
| T35B.1 SendGrid connectivity  | ✅ Complete | `startup-checks.ts`                                 |
| T35B.2 Worker integration     | ✅ Complete | `queue/workers.ts`                                  |
| T35C.1 Error code reference   | ✅ Complete | `GTM_INTEGRATION_FIX_V34.md`                        |
| T35C.2 S2S auth tests         | ✅ Complete | `s2s-auth.test.ts`                                  |

---

## Sprint 35A: S2S Auth Extension (2 hours)

### T35A.1: Audit Routes Needing S2S

**Priority**: P0 | **Effort**: 15 min | **Status**: ✅ Complete

Found 100+ routes using plain `auth()` instead of `authServiceOrSession`. Prioritized routes that GTM-YardFlow needs to call.

**Routes Requiring S2S (Fixed)**:

- `/api/integrations` - GET/POST
- `/api/reports/schedule` - GET/POST
- `/api/reports/pdf` - POST
- `/api/ab-tests` - GET/POST
- `/api/ab-tests/[id]` - GET/PUT/POST
- `/api/enrichment/patterns/apply` - POST
- `/api/enrichment/patterns/batch` - POST
- `/api/enrichment/patterns/detect` - POST
- `/api/enrichment/smart-guess` - POST/PUT
- `/api/enrichment/validate` - POST
- `/api/enrichment/linkedin/enrich-all` - POST
- `/api/enrichment/linkedin/enrich-company` - POST
- `/api/enrichment/multi-source` - POST

**Routes Intentionally Session-Only** (not fixed):

- `/api/google/*` - OAuth flows require user session
- `/api/team/*` - Internal admin only
- `/api/auth/*` - Session management
- `/api/admin/*` - Admin tools

---

### T35A.2: Fix /api/integrations

**Priority**: P0 | **Effort**: 15 min | **Status**: ✅ Complete

**File**: `src/app/api/integrations/route.ts`

**Changes**:

```typescript
// Before
import { auth } from '@/auth';
const session = await auth();
if (!session?.user) { ... }

// After
import { authServiceOrSession } from '@/lib/auth-service';
const authResult = await authServiceOrSession(req);
if (!authResult) { ... }
```

---

### T35A.3: Fix /api/reports Routes

**Priority**: P0 | **Effort**: 20 min | **Status**: ✅ Complete

**Files**:

- `src/app/api/reports/schedule/route.ts`
- `src/app/api/reports/pdf/route.ts`

**Pattern Applied**:

```typescript
import { authServiceOrSession } from '@/lib/auth-service';

export async function GET/POST(req: NextRequest) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user from auth result for queries requiring user context
  const userId = authResult.type === 'session'
    ? authResult.userId
    : req.headers.get('x-user-id') || authResult.userId;
  ...
}
```

---

### T35A.4: Fix /api/ab-tests Routes

**Priority**: P0 | **Effort**: 25 min | **Status**: ✅ Complete

**Files**:

- `src/app/api/ab-tests/route.ts` (GET, POST)
- `src/app/api/ab-tests/[id]/route.ts` (GET, PUT, POST)

Both routes now support S2S auth with user context passthrough.

---

### T35A.5: Fix /api/enrichment Routes

**Priority**: P0 | **Effort**: 45 min | **Status**: ✅ Complete

**Files Modified** (8 routes):

- `enrichment/patterns/apply/route.ts`
- `enrichment/patterns/batch/route.ts`
- `enrichment/patterns/detect/route.ts`
- `enrichment/smart-guess/route.ts` (POST + PUT)
- `enrichment/validate/route.ts`
- `enrichment/linkedin/enrich-all/route.ts`
- `enrichment/linkedin/enrich-company/route.ts`
- `enrichment/multi-source/route.ts`

---

## Sprint 35B: Worker Reliability (1 hour)

### T35B.1: Add SendGrid Connectivity Check

**Priority**: P1 | **Effort**: 30 min | **Status**: ✅ Complete

**File**: `src/lib/startup-checks.ts`

**Before**: Only checked if `SENDGRID_API_KEY` env var was set.

**After**: Added `verifySendGridConnectivity()` that makes actual API call:

```typescript
export async function verifySendGridConnectivity(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
}> {
  const response = await fetch('https://api.sendgrid.com/v3/user/credits', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (response.ok) return { configured: true, connected: true };
  if (response.status === 401)
    return { configured: true, connected: false, error: 'Invalid API key' };
  // ...
}
```

**Updated StartupResult Interface**:

```typescript
export interface StartupResult {
  database: boolean;
  redis: boolean;
  sendgrid: {
    configured: boolean;
    connected: boolean;
    error?: string;
  };
  ai: boolean;
  environment: { valid: boolean; missing: string[] };
  ready: boolean;
}
```

---

### T35B.2: Integrate Startup Checks into Worker

**Priority**: P1 | **Effort**: 30 min | **Status**: ✅ Complete

**File**: `src/lib/queue/workers.ts`

**Changes**:

```typescript
// Before
function startWorkers() {
  try {
    getEnrichmentWorker();
    ...
  }
}
startWorkers();

// After
async function startWorkers() {
  try {
    // Run startup health checks before starting workers
    const { runStartupChecks } = await import('@/lib/startup-checks');
    const checkResult = await runStartupChecks();

    if (!checkResult.ready) {
      logger.error('Startup checks failed - cannot start workers', {
        database: checkResult.database,
        redis: checkResult.redis,
        sendgrid: checkResult.sendgrid,
        ai: checkResult.ai,
      });
      process.exit(1);
    }

    logger.info('Startup checks passed', {
      database: checkResult.database,
      redis: checkResult.redis,
      sendgrid: checkResult.sendgrid.connected ? 'connected' : 'not connected',
    });

    getEnrichmentWorker();
    ...
  }
}

startWorkers().catch((err) => {
  logger.error('Worker startup failed', { err });
  process.exit(1);
});
```

---

## Sprint 35C: Documentation & Testing (30 min)

### T35C.1: Add Error Code Reference to GTM Guide

**Priority**: P2 | **Effort**: 15 min | **Status**: ✅ Complete

**File**: `docs/current/GTM_INTEGRATION_FIX_V34.md`

**Added Sections**:

1. **HTTP Status Codes Table**:
   | Status | Meaning | Action |
   |--------|---------|--------|
   | 200 | Success | Response contains requested data |
   | 401 | Unauthorized | Auth header missing or malformed |
   | 403 | Forbidden | Auth header present but invalid secret |
   | 422 | Unprocessable | Business logic error (see error code) |
   | 429 | Rate Limited | Wait and retry with backoff |

2. **Business Error Codes Table**:
   | Code | Endpoint | Meaning |
   |------|----------|---------|
   | `MISSING_EMAIL` | `/outreach/send-email` | Contact has no email |
   | `ALREADY_SENT` | `/outreach/send-email` | Email already sent |
   | `SERVICE_UNAVAILABLE` | `/outreach/send-email` | SendGrid not configured |

3. **Retry Strategy Code**:
   ```typescript
   async function fetchWithRetry(url, options, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       const response = await fetch(url, options);
       if (response.ok) return response;
       if (response.status === 429 || response.status === 503) {
         const delay = Math.pow(2, i) * 1000;
         await new Promise((resolve) => setTimeout(resolve, delay));
         continue;
       }
       throw new Error(`API error: ${response.status}`);
     }
   }
   ```

---

### T35C.2: Extend S2S Auth Test Suite

**Priority**: P2 | **Effort**: 15 min | **Status**: ✅ Complete

**File**: `tests/integration/s2s-auth.test.ts`

**Added Test Cases** (6 new tests):

```typescript
describe('Sprint 35: New S2S Endpoints', () => {
  it('should accept S2S auth on /api/integrations');
  it('should accept S2S auth on /api/reports/schedule');
  it('should accept S2S auth on /api/ab-tests');
  it('should accept S2S auth on /api/enrichment/validate POST');
  it('should accept S2S auth on /api/enrichment/patterns/detect POST');
  it('should accept S2S auth on /api/enrichment/smart-guess POST');
});
```

**Test Run Results**: 137 passed | 12 skipped | 33 todo (182 total)

---

## Files Modified Summary

### New Files

_None_

### Modified Files

| File                                                      | Changes                     |
| --------------------------------------------------------- | --------------------------- |
| `src/app/api/integrations/route.ts`                       | S2S auth (GET, POST)        |
| `src/app/api/reports/schedule/route.ts`                   | S2S auth (GET, POST)        |
| `src/app/api/reports/pdf/route.ts`                        | S2S auth (POST)             |
| `src/app/api/ab-tests/route.ts`                           | S2S auth (GET, POST)        |
| `src/app/api/ab-tests/[id]/route.ts`                      | S2S auth (GET, PUT, POST)   |
| `src/app/api/enrichment/patterns/apply/route.ts`          | S2S auth                    |
| `src/app/api/enrichment/patterns/batch/route.ts`          | S2S auth                    |
| `src/app/api/enrichment/patterns/detect/route.ts`         | S2S auth                    |
| `src/app/api/enrichment/smart-guess/route.ts`             | S2S auth (POST, PUT)        |
| `src/app/api/enrichment/validate/route.ts`                | S2S auth                    |
| `src/app/api/enrichment/linkedin/enrich-all/route.ts`     | S2S auth                    |
| `src/app/api/enrichment/linkedin/enrich-company/route.ts` | S2S auth                    |
| `src/app/api/enrichment/multi-source/route.ts`            | S2S auth                    |
| `src/lib/startup-checks.ts`                               | SendGrid connectivity check |
| `src/lib/queue/workers.ts`                                | Startup check integration   |
| `docs/current/GTM_INTEGRATION_FIX_V34.md`                 | Error code reference        |
| `tests/integration/s2s-auth.test.ts`                      | 6 new endpoint tests        |

---

## Remaining Routes (Not Fixed - By Design)

These routes intentionally use session-only auth:

| Route                          | Reason                      |
| ------------------------------ | --------------------------- |
| `/api/google/*`                | OAuth requires user session |
| `/api/team/*`                  | Internal admin only         |
| `/api/auth/*`                  | Session management          |
| `/api/admin/*`                 | Admin tools                 |
| `/api/notifications/*`         | User-specific UI            |
| `/api/presence/*`              | Real-time UI features       |
| `/api/webhooks/*` (management) | Internal config             |

---

## Validation Commands

```bash
# 1. Run lint
cd eventops && npm run lint

# 2. Run tests
cd eventops && npm test

# 3. Verify S2S auth coverage
grep -r "authServiceOrSession" src/app/api/ --include="*.ts" | wc -l
# Expected: 60+ files

# 4. Test production endpoints
curl -s "$RAILWAY_URL/api/integrations" \
  -H "Authorization: Bearer $CRON_SECRET" | jq '.integrations | length'

curl -s "$RAILWAY_URL/api/ab-tests" \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

---

## Related Documentation

- [GTM_INTEGRATION_FIX_V34.md](../../../docs/current/GTM_INTEGRATION_FIX_V34.md) - Cross-repo integration guide
- [RAILWAY_API_CONTRACT.md](../../../docs/current/RAILWAY_API_CONTRACT.md) - Full API documentation
- [SPRINT_PLAN_V34_EMAIL_ACTIVATION.md](./SPRINT_PLAN_V34_EMAIL_ACTIVATION.md) - Previous sprint

---

## Next Steps (Sprint 36 Candidates)

1. **P0**: Add worker startup retry logic (3 attempts with 5s delay)
2. **P1**: Fix remaining critical routes if GTM needs them (people/[id], sequences/[id], roi/calculate)
3. **P1**: Create `getUserIdFromAuth()` helper to reduce code duplication
4. **P2**: Add request body size limits to AI endpoints
5. **P2**: Add webhook signature verification test coverage
6. **P2**: Tighten SendGrid 403 handling (treat as `connected: false`)

---

## Review Findings Applied

Based on subagent review:

1. ✅ **Dead code removed** - Unreachable return in `enrichment/validate/route.ts`
2. ✅ **Try-catch added** - Error handling for `ab-tests/route.ts` GET/POST
3. 📋 **Deferred** - Worker retry logic (Sprint 36)
4. 📋 **Deferred** - `getUserIdFromAuth` helper (Sprint 36)

---

**Sprint 35 Complete**: February 5, 2026
