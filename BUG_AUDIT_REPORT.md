# YardFlow EventOps - Comprehensive Bug Audit Report
**Date:** January 22, 2026  
**Target Deployment:** https://yard-flow-hitlist.vercel.app  
**Stack:** Next.js 14.2.35, Prisma ORM, PostgreSQL, NextAuth v5

---

## CRITICAL BUGS (Breaks Functionality - Blocks Deployment)

### 🔴 BUG-001: Missing Database Migrations - Meeting Table Does Not Exist
**Severity:** CRITICAL  
**Files Affected:**
- [prisma/schema.prisma](eventops/prisma/schema.prisma#L278-L299)
- [src/app/api/meetings/route.ts](eventops/src/app/api/meetings/route.ts)
- [src/app/api/meetings/[id]/route.ts](eventops/src/app/api/meetings/[id]/route.ts)
- [src/app/api/dashboards/stats/route.ts](eventops/src/app/api/dashboards/stats/route.ts#L32-L43)
- [src/app/api/analytics/route.ts](eventops/src/app/api/analytics/route.ts#L135)
- [src/app/api/analytics/funnel/route.ts](eventops/src/app/api/analytics/funnel/route.ts#L60-L66)
- [src/app/api/analytics/cohort/route.ts](eventops/src/app/api/analytics/cohort/route.ts#L58)
- [src/app/dashboard/calendar/page.tsx](eventops/src/app/dashboard/calendar/page.tsx#L42)

**Issue:**  
The `Meeting` model is defined in the Prisma schema but the corresponding `meetings` table does not exist in the database. No migrations directory found, indicating migrations have never been run or are missing.

**Error Message:**  
```
The table `public.meetings` does not exist in the current database
```

**Impact:**
- Calendar feature completely broken (500 errors)
- Dashboard stats API fails when calculating meeting metrics
- Analytics funnel and cohort endpoints crash
- Engagement scoring fails when accessing person.meetings

**Root Cause:**  
Missing `prisma migrate deploy` step in deployment or migrations not committed to repository.

**Fix Approach:**
```bash
# Create and apply initial migration
cd eventops
npx prisma migrate dev --name init
# OR deploy existing migrations
npx prisma migrate deploy
```

**Verification:**
```bash
npx prisma migrate status
```

---

### 🔴 BUG-002: Inconsistent Session User ID Type Handling
**Severity:** CRITICAL  
**Files Affected:**
- [src/lib/auth.ts](eventops/src/lib/auth.ts#L52-L63)
- [src/app/api/accounts/route.ts](eventops/src/app/api/accounts/route.ts#L25)
- [src/app/api/campaigns/route.ts](eventops/src/app/api/campaigns/route.ts#L19)
- [src/app/api/people/route.ts](eventops/src/app/api/people/route.ts#L35)
- Multiple other API endpoints (20+ locations)

**Issue:**  
Auth callback sets `session.user.id` but many API endpoints check `session?.user` without verifying `id` exists, then immediately use `session.user.id` which could be undefined.

**Locations with Issue:**
```typescript
// WRONG - checks user but not id
if (!session?.user) { return ... }
const user = await prisma.user.findUnique({
  where: { id: session.user.id }, // ❌ Could be undefined
});
```

**Impact:**
- Runtime errors if `session.user.id` is undefined
- Database queries fail with "invalid ID" errors
- Inconsistent behavior across different endpoints

**Fix Approach:**
Replace all instances with:
```typescript
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Affected Files (Partial List):**
- src/app/api/accounts/route.ts (lines 20, 71)
- src/app/api/campaigns/route.ts (lines 14, 56)
- src/app/api/people/route.ts (lines 101, 105)
- src/app/api/dashboards/route.ts (lines 13, 51)
- 15+ more endpoints

---

### 🔴 BUG-003: Non-null Assertion Operator on Nullable Email Field
**Severity:** CRITICAL  
**Files Affected:**
- [src/app/api/meetings/route.ts](eventops/src/app/api/meetings/route.ts#L17)
- [src/app/api/search/advanced/route.ts](eventops/src/app/api/search/advanced/route.ts#L17)
- [src/app/api/analytics/route.ts](eventops/src/app/api/analytics/route.ts#L17)
- [src/app/api/engagement/score/route.ts](eventops/src/app/api/engagement/score/route.ts#L17)
- 13 total occurrences

**Issue:**  
Using `session.user.email!` (non-null assertion) when email could be null/undefined.

**Example:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: session.user.email! }, // ❌ Dangerous!
});
```

**Impact:**
- Runtime crashes if email is null
- Database query failures
- Inconsistent user lookup logic

**Fix Approach:**
```typescript
if (!session?.user?.email) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
const user = await prisma.user.findUnique({
  where: { email: session.user.email },
});
```

---

## HIGH PRIORITY BUGS (Degrades UX - Causes Errors)

### 🟠 BUG-004: Missing Error Boundaries in Client Components
**Severity:** HIGH  
**Files Affected:**
- [src/app/dashboard/calendar/page.tsx](eventops/src/app/dashboard/calendar/page.tsx)
- [src/app/dashboard/custom/page.tsx](eventops/src/app/dashboard/custom/page.tsx)
- [src/app/dashboard/research/bulk/page.tsx](eventops/src/app/dashboard/research/bulk/page.tsx)
- All dashboard pages

**Issue:**  
No error boundaries implemented. If any component crashes, entire app breaks with white screen.

**Impact:**
- Poor user experience on errors
- No error recovery mechanism
- Difficult to debug production issues

**Fix Approach:**
Create error boundary component:
```tsx
// src/components/error-boundary.tsx
'use client';
export default function ErrorBoundary({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

Add `error.tsx` files to route segments.

---

### 🟠 BUG-005: Missing Loading States in Calendar Component
**Severity:** HIGH  
**File:** [src/app/dashboard/calendar/page.tsx](eventops/src/app/dashboard/calendar/page.tsx#L42-L48)

**Issue:**  
Calendar fetches meetings but doesn't show error state if fetch fails, only logs to console.

```typescript
const fetchMeetings = async () => {
  try {
    const res = await fetch('/api/meetings?status=SCHEDULED');
    const data = await res.json();
    setMeetings(data);
  } catch (error) {
    console.error('Error fetching meetings:', error); // ❌ Silent failure
  } finally {
    setLoading(false);
  }
};
```

**Impact:**
- Users see empty calendar with no explanation
- Network/API errors invisible to users
- No retry mechanism

**Fix Approach:**
```typescript
const [error, setError] = useState<string | null>(null);

const fetchMeetings = async () => {
  try {
    const res = await fetch('/api/meetings?status=SCHEDULED');
    if (!res.ok) throw new Error('Failed to load meetings');
    const data = await res.json();
    setMeetings(data);
    setError(null);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

// Show error UI
{error && <Alert variant="destructive">{error}</Alert>}
```

---

### 🟠 BUG-006: Meetings API Returns Array Instead of Object
**Severity:** HIGH  
**File:** [src/app/api/meetings/route.ts](eventops/src/app/api/meetings/route.ts#L60)

**Issue:**  
GET endpoint returns raw array but calendar expects array, while POST returns object. Inconsistent API response format.

```typescript
// GET returns: Meeting[]
return NextResponse.json(meetings);

// POST returns: Meeting
return NextResponse.json(meeting);
```

**Impact:**
- Inconsistent API contract
- Frontend has to handle different response shapes
- Difficult to add metadata later (pagination, totals)

**Fix Approach:**
```typescript
return NextResponse.json({ 
  meetings,
  total: meetings.length 
});
```

Update calendar page to handle `data.meetings || data`.

---

### 🟠 BUG-007: No Pagination on People Endpoint
**Severity:** HIGH  
**File:** [src/app/api/people/route.ts](eventops/src/app/api/people/route.ts#L141-L152)

**Issue:**  
People endpoint loads all people without pagination, could cause performance issues and timeouts with large datasets.

```typescript
const people = await prisma.person.findMany({
  where,
  include: {
    account: true,
  },
  orderBy: { name: 'asc' },
}); // ❌ No limit!
```

**Impact:**
- Slow page loads with >1000 people
- Potential memory issues
- Poor UX for large datasets

**Fix Approach:**
Import pagination utilities and add cursor-based pagination:
```typescript
import { parsePaginationParams, buildPaginatedResponse, getPrismaCursorParams } from '@/lib/pagination';

const { cursor, limit } = parsePaginationParams(searchParams);
const people = await prisma.person.findMany({
  where,
  include: { account: true },
  orderBy: { name: 'asc' },
  ...getPrismaCursorParams(cursor, limit),
});
return NextResponse.json(buildPaginatedResponse(people, limit!));
```

---

### 🟠 BUG-008: Dashboard Stats API Missing User Lookup Validation
**Severity:** HIGH  
**File:** [src/app/api/dashboards/stats/route.ts](eventops/src/app/api/dashboards/stats/route.ts#L14-L20)

**Issue:**  
Queries user by email but doesn't check if user was found before accessing `activeEventId`.

```typescript
const user = await prisma.user.findUnique({
  where: { email: session.user.email },
});

if (!user) {
  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}
// But never checks if user.activeEventId exists before using it
```

**Impact:**
- Runtime errors if user has no active event
- Inconsistent data returned
- Should return empty stats, not error

**Fix Approach:**
```typescript
if (!user?.activeEventId) {
  return NextResponse.json({
    accounts: 0,
    people: 0,
    campaigns: 0,
    meetings: 0,
    outreachSent: 0,
    responseRate: 0,
    // ... zero values
  });
}
```

---

### 🟠 BUG-009: Import Execute Endpoint Has No Transaction Safety
**Severity:** HIGH  
**File:** [src/app/api/import/execute/route.ts](eventops/src/app/api/import/execute/route.ts#L34-L88)

**Issue:**  
Bulk import creates accounts/people in a loop without transaction. If one fails, database left in inconsistent state.

```typescript
for (const row of rows) {
  await prisma.targetAccount.create({ data }); // ❌ No transaction
  created++;
}
```

**Impact:**
- Partial imports if error occurs mid-batch
- No rollback mechanism
- Duplicate data on retry
- Data integrity issues

**Fix Approach:**
```typescript
const result = await prisma.$transaction(async (tx) => {
  const created = [];
  for (const row of rows) {
    const account = await tx.targetAccount.create({ data });
    created.push(account);
  }
  return created;
});
```

---

## MEDIUM PRIORITY BUGS (Minor UX Issues - Edge Cases)

### 🟡 BUG-010: OpenAI API Key Not Validated at Startup
**Severity:** MEDIUM  
**Files Affected:**
- [src/lib/env.ts](eventops/src/lib/env.ts#L18)
- [src/lib/ai-research.ts](eventops/src/lib/ai-research.ts#L8)
- [src/lib/ai-contact-insights.ts](eventops/src/lib/ai-contact-insights.ts#L8)

**Issue:**  
`OPENAI_API_KEY` is optional in env schema, but AI features fail at runtime if not set. Should validate at startup or disable features gracefully.

**Impact:**
- Runtime errors when using AI features
- Poor error messages for users
- 500 errors instead of feature flags

**Fix Approach:**
Either make it required:
```typescript
OPENAI_API_KEY: z.string().min(1, 'OpenAI API key required'),
```

Or add feature flag:
```typescript
export const AI_FEATURES_ENABLED = !!env.OPENAI_API_KEY;
```

And check in components:
```typescript
if (!AI_FEATURES_ENABLED) {
  return <div>AI features disabled</div>;
}
```

---

### 🟡 BUG-011: Advanced Search Uses Insecure String Contains
**Severity:** MEDIUM  
**File:** [src/app/api/search/advanced/route.ts](eventops/src/app/api/search/advanced/route.ts#L48-L55)

**Issue:**  
Search uses `contains` mode without proper sanitization. While Prisma parameterizes queries, `%` and `_` wildcards could cause unexpected results.

```typescript
OR: [
  { name: { contains: query, mode: 'insensitive' } },
  { website: { contains: query, mode: 'insensitive' } },
]
```

**Impact:**
- Unexpected search results with special characters
- Performance issues with wildcards
- Not technically SQL injection (Prisma prevents) but poor UX

**Fix Approach:**
Sanitize input:
```typescript
const sanitizedQuery = query.replace(/[%_]/g, '\\$&');
```

---

### 🟡 BUG-012: Calendar Page Doesn't Handle Empty Meetings Array
**Severity:** MEDIUM  
**File:** [src/app/dashboard/calendar/page.tsx](eventops/src/app/dashboard/calendar/page.tsx#L42-L48)

**Issue:**  
If API returns error object instead of array, calendar crashes because it expects `meetings.filter()`.

```typescript
const fetchMeetings = async () => {
  try {
    const res = await fetch('/api/meetings?status=SCHEDULED');
    const data = await res.json();
    setMeetings(data); // ❌ Could be { error: 'message' }
  }
```

**Impact:**
- App crashes if API returns error
- No validation of response structure

**Fix Approach:**
```typescript
const data = await res.json();
if (!res.ok || data.error) {
  throw new Error(data.error || 'Failed to fetch');
}
setMeetings(Array.isArray(data) ? data : data.meetings || []);
```

---

### 🟡 BUG-013: Bulk Research Queue Missing Rate Limiting
**Severity:** MEDIUM  
**File:** [src/app/api/research/bulk/route.ts](eventops/src/app/api/research/bulk/route.ts#L29-L30)

**Issue:**  
Allows up to 500 accounts per batch but doesn't rate limit API calls, could overwhelm OpenAI API.

**Impact:**
- Potential API quota exhaustion
- 429 rate limit errors from OpenAI
- Expensive API costs

**Fix Approach:**
Add rate limiting:
```typescript
import { checkRateLimit } from '@/lib/rate-limiter';

const { allowed } = await checkRateLimit(
  session.user.id!, 
  'research-bulk', 
  10 // 10 requests per minute
);

if (!allowed) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' }, 
    { status: 429 }
  );
}
```

---

### 🟡 BUG-014: No Validation on ICP Score Range
**Severity:** MEDIUM  
**Files Affected:**
- [src/app/api/accounts/route.ts](eventops/src/app/api/accounts/route.ts#L39)
- [src/app/api/accounts/[id]/route.ts](eventops/src/app/api/accounts/[id]/route.ts#L62)

**Issue:**  
ICP score can be set to any integer, no validation for 0-100 range.

**Impact:**
- Data integrity issues
- Broken filtering logic
- Confusing UI displays

**Fix Approach:**
Add validation:
```typescript
if (data.icpScore !== undefined) {
  const score = Number(data.icpScore);
  if (score < 0 || score > 100 || isNaN(score)) {
    return NextResponse.json(
      { error: 'ICP score must be between 0 and 100' },
      { status: 400 }
    );
  }
}
```

---

### 🟡 BUG-015: Custom Dashboard Widget Config Not Validated
**Severity:** MEDIUM  
**File:** [src/app/api/dashboards/route.ts](eventops/src/app/api/dashboards/route.ts#L23)

**Issue:**  
Dashboard accepts arbitrary JSON for `widgets` without validation.

**Impact:**
- Broken dashboards from malformed config
- Potential XSS if widgets render user input
- No schema enforcement

**Fix Approach:**
Add Zod schema:
```typescript
import { z } from 'zod';

const widgetSchema = z.object({
  id: z.string(),
  type: z.enum(['metric', 'chart', 'table', 'activity']),
  config: z.record(z.any()),
  position: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
});

const dashboardSchema = z.object({
  name: z.string().min(1).max(100),
  layout: z.enum(['grid', 'flex', 'masonry']),
  widgets: z.array(widgetSchema),
});

const validated = dashboardSchema.parse(body);
```

---

## LOW PRIORITY BUGS (Cosmetic - Nice-to-Have Fixes)

### 🔵 BUG-016: Inconsistent Error Response Format
**Severity:** LOW  
**Files:** Multiple API endpoints

**Issue:**  
Some endpoints return `{ error: 'message' }`, others return `{ message: 'error' }`, some include `hint`.

**Fix:** Standardize to:
```typescript
{ 
  error: string, 
  hint?: string,
  code?: string 
}
```

---

### 🔵 BUG-017: Missing TypeScript Strict Mode
**Severity:** LOW  
**File:** [tsconfig.json](eventops/tsconfig.json)

**Issue:**  
Not using TypeScript strict mode, allowing many type safety issues.

**Fix:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

---

### 🔵 BUG-018: Console.log Statements in Production Code
**Severity:** LOW  
**Files:** Multiple

**Issue:**  
Many `console.log` and `console.error` statements should use proper logger.

**Fix:** Use logger from [src/lib/logger.ts](eventops/src/lib/logger.ts) consistently.

---

### 🔵 BUG-019: No Request Timeout Configuration
**Severity:** LOW  
**Files:** All API routes

**Issue:**  
No timeout on database queries or external API calls.

**Fix:** Add timeout middleware:
```typescript
export const config = {
  maxDuration: 30, // 30 seconds
};
```

---

### 🔵 BUG-020: Missing CORS Headers for API Routes
**Severity:** LOW  
**Issue:** If accessed from different domain, API routes fail.

**Fix:** Add CORS middleware if needed for external access.

---

## SECURITY CONCERNS

### 🔒 SEC-001: No Rate Limiting on Auth Endpoints
**File:** [src/app/api/auth/[...nextauth]/route.ts](eventops/src/app/api/auth/[...nextauth]/route.ts)

**Issue:** Login endpoint not rate limited, vulnerable to brute force attacks.

---

### 🔒 SEC-002: Audit Logs Don't Capture IP or User Agent
**File:** [src/lib/audit-logger.ts](eventops/src/lib/audit-logger.ts)

**Issue:** Audit logs missing critical forensic data.

---

### 🔒 SEC-003: No CSRF Protection Beyond NextAuth Default
**Issue:** Custom API endpoints may need CSRF tokens for state-changing operations.

---

## PERFORMANCE CONCERNS

### ⚡ PERF-001: N+1 Query in Analytics Cohort Endpoint
**File:** [src/app/api/analytics/cohort/route.ts](eventops/src/app/api/analytics/cohort/route.ts#L58)

**Issue:** Loads meetings without proper joins, causing multiple queries.

---

### ⚡ PERF-002: Missing Database Indexes
**File:** [prisma/schema.prisma](eventops/prisma/schema.prisma)

**Issue:** Missing composite indexes on:
- `(eventId, createdAt)` for time-based queries
- `(personId, scheduledAt)` for calendar queries
- `(campaignId, status)` for campaign analytics

---

### ⚡ PERF-003: Dashboard Stats Makes 8 Sequential Queries
**File:** [src/app/api/dashboards/stats/route.ts](eventops/src/app/api/dashboards/stats/route.ts#L28)

**Issue:** Using `Promise.all` is good, but could use raw SQL aggregation for better performance.

---

## RECOMMENDED IMMEDIATE ACTIONS

### 🚨 BEFORE DEPLOYMENT:

1. **Run database migrations** (BUG-001)
   ```bash
   cd eventops && npx prisma migrate deploy
   ```

2. **Fix session.user.id checks** (BUG-002)
   - Search and replace all `if (!session?.user)` with `if (!session?.user?.id)`

3. **Fix email non-null assertions** (BUG-003)
   - Remove all `session.user.email!` and add proper checks

4. **Add error boundaries** (BUG-004)
   - Create error.tsx in app/dashboard

5. **Test calendar with migrations** (Verify BUG-001 fix)

### 📋 BEFORE PRODUCTION:

1. Enable TypeScript strict mode (BUG-017)
2. Add rate limiting to auth (SEC-001)
3. Implement error boundaries (BUG-004)
4. Add pagination to people endpoint (BUG-007)
5. Wrap imports in transactions (BUG-009)

### 🔄 ONGOING IMPROVEMENTS:

1. Add database indexes (PERF-002)
2. Standardize error responses (BUG-016)
3. Replace console.log with logger (BUG-018)
4. Add input validation schemas (BUG-014, BUG-015)

---

## TESTING RECOMMENDATIONS

1. **Database Migration Test:**
   ```bash
   npx prisma migrate reset --force
   npx prisma migrate deploy
   npx prisma db seed
   ```

2. **API Integration Tests:**
   - Test all meeting endpoints
   - Test calendar with various date ranges
   - Test bulk operations rollback

3. **Error Scenario Tests:**
   - Missing session.user.id
   - Missing session.user.email
   - Network failures in calendar
   - Invalid pagination cursors

---

## SUMMARY

**Critical Issues:** 3 (Must fix before any deployment)  
**High Priority:** 6 (Fix before production use)  
**Medium Priority:** 6 (Fix in next sprint)  
**Low Priority:** 5 (Technical debt)  
**Security Concerns:** 3 (Address before public release)  
**Performance Concerns:** 3 (Optimize for scale)

**Total Bugs Found:** 26

**Deployment Status:** ❌ **NOT READY** - Critical bugs must be resolved first.
