# Sprint 58: API Response Contract Standardization

**Goal**: Fix `L.data.map is not a function` errors by standardizing all list endpoints to return `{ data: [...], pagination?: {...} }`.

**Root Cause**: Frontend expects `{ data: [...] }` but 10/15 endpoints return inconsistent shapes like `{ templates: [...] }`, `{ sequences: [...] }`, or bare arrays `[...]`.

---

## Sprint Summary

| Sprint  | Focus                   | Deliverables                        |
| ------- | ----------------------- | ----------------------------------- |
| **58A** | Core List Endpoints     | Fix templates, sequences, campaigns |
| **58B** | Remaining Endpoints     | Fix events, meetings, people, team  |
| **58C** | Testing & Documentation | Contract tests, API docs            |

---

## Sprint 58A: Core List Endpoints (Priority 1)

### Task 58A.1: Fix `/api/templates` response shape

**File**: `src/app/api/templates/route.ts`

**Current**:

```json
{ "templates": [...], "total": 100, "limit": 50, "offset": 0 }
```

**Target**:

```json
{ "data": [...], "pagination": { "total": 100, "limit": 50, "offset": 0 } }
```

**Test**:

```typescript
it('returns { data: [...] } shape', async () => {
  const response = await GET(mockRequest);
  const body = await response.json();
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.templates).toBeUndefined(); // Ensure old shape removed
});
```

**Commit Message**: `fix(api): standardize templates endpoint to { data: [...] } shape`

---

### Task 58A.2: Fix `/api/sequences` response shape

**File**: `src/app/api/sequences/route.ts`

**Current**:

```json
{ "sequences": [...] }
```

**Target**:

```json
{ "data": [...], "pagination": { "total": ..., "hasMore": ..., "nextCursor": ... } }
```

**Test**:

```typescript
it('returns { data: [...] } shape', async () => {
  const response = await GET(mockRequest);
  const body = await response.json();
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.sequences).toBeUndefined();
});
```

**Commit Message**: `fix(api): standardize sequences endpoint to { data: [...] } shape`

---

### Task 58A.3: Fix `/api/campaigns` response shape

**File**: `src/app/api/campaigns/route.ts`

**Current**:

```json
{ "campaigns": [...] }
```

**Target**:

```json
{ "data": [...], "pagination": { "total": ..., "hasMore": ..., "nextCursor": ... } }
```

**Test**:

```typescript
it('returns { data: [...] } shape', async () => {
  const response = await GET(mockRequest);
  const body = await response.json();
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.campaigns).toBeUndefined();
});
```

**Commit Message**: `fix(api): standardize campaigns endpoint to { data: [...] } shape`

---

## Sprint 58B: Remaining List Endpoints (Priority 2)

### Task 58B.1: Fix `/api/events` response shape

**File**: `src/app/api/events/route.ts`

**Current**: Bare array `[...]`

**Target**: `{ "data": [...] }`

**Commit Message**: `fix(api): wrap events endpoint in { data: [...] } shape`

---

### Task 58B.2: Fix `/api/meetings` response shape

**File**: `src/app/api/meetings/route.ts`

**Current**: Bare array `[...]`

**Target**: `{ "data": [...] }`

**Commit Message**: `fix(api): wrap meetings endpoint in { data: [...] } shape`

---

### Task 58B.3: Fix `/api/people` response shape

**File**: `src/app/api/people/route.ts`

**Current**: `{ "people": [...], "pagination": ... }`

**Target**: `{ "data": [...], "pagination": ... }`

**Commit Message**: `fix(api): standardize people endpoint to { data: [...] } shape`

---

### Task 58B.4: Fix `/api/team` response shape

**File**: `src/app/api/team/route.ts`

**Current**: Bare array `[...]`

**Target**: `{ "data": [...] }`

**Commit Message**: `fix(api): wrap team endpoint in { data: [...] } shape`

---

### Task 58B.5: Fix `/api/workflows` response shape

**File**: `src/app/api/workflows/route.ts`

**Current**: `{ "workflows": [...] }`

**Target**: `{ "data": [...] }`

**Commit Message**: `fix(api): standardize workflows endpoint to { data: [...] } shape`

---

### Task 58B.6: Fix `/api/notifications` response shape

**File**: `src/app/api/notifications/route.ts`

**Current**: `{ "notifications": [...], "unreadCount": ... }`

**Target**: `{ "data": [...], "unreadCount": ... }`

**Commit Message**: `fix(api): standardize notifications endpoint to { data: [...] } shape`

---

### Task 58B.7: Fix `/api/searches` response shape

**File**: `src/app/api/searches/route.ts`

**Current**: Bare array `[...]`

**Target**: `{ "data": [...] }`

**Commit Message**: `fix(api): wrap searches endpoint in { data: [...] } shape`

---

### Task 58B.8: Fix `/api/ab-tests` response shape

**File**: `src/app/api/ab-tests/route.ts`

**Current**: `{ "tests": [...] }`

**Target**: `{ "data": [...] }`

**Commit Message**: `fix(api): standardize ab-tests endpoint to { data: [...] } shape`

---

## Sprint 58C: Testing & Documentation (Priority 3)

### Task 58C.1: Create API Contract Test Suite

**File**: `tests/api/api-contract-consistency.test.ts`

```typescript
// Test pattern for ALL list endpoints
const listEndpoints = [
  '/api/templates',
  '/api/sequences',
  '/api/campaigns',
  '/api/events',
  '/api/meetings',
  '/api/people',
  '/api/team',
  '/api/workflows',
  '/api/notifications',
  '/api/searches',
  '/api/ab-tests',
];

describe.each(listEndpoints)('API Contract: %s', (endpoint) => {
  it('returns { data: [...] } shape on success', () => { ... });
  it('returns { error: string } shape on failure', () => { ... });
  it('never returns bare arrays', () => { ... });
});
```

**Commit Message**: `test(api): add contract consistency tests for all list endpoints`

---

### Task 58C.2: Document API Contract Standard

**File**: `docs/current/API_CONTRACT_STANDARD.md`

Content:

- Standard response shapes for list, single, create, update, delete
- Error response format
- Pagination shape
- Examples

**Commit Message**: `docs: add API contract standard documentation`

---

### Task 58C.3: Add buildStandardListResponse helper

**File**: `src/lib/api-response.ts`

```typescript
export function buildStandardListResponse<T>(
  data: T[],
  pagination?: {
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string;
  }
) {
  return NextResponse.json({
    data,
    ...(pagination && { pagination }),
  });
}
```

**Commit Message**: `feat(lib): add buildStandardListResponse helper`

---

## Verification Checklist

After completing Sprint 58, verify:

- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] All list endpoints return `{ data: [...] }`
- [ ] No endpoint returns bare arrays
- [ ] Frontend `useSequenceEnrollment` no longer sees `.map()` errors
- [ ] Railway logs show no 500s on list endpoints

---

## Demo Script

**Sprint 58A Demo** (10 min):

1. Show failing test with old response shape
2. Apply fix to templates endpoint
3. Show passing test
4. Show frontend successfully rendering templates

**Sprint 58B Demo** (15 min):

1. Run contract test suite
2. Show all list endpoints pass
3. Show frontend navigating through all views without errors

**Sprint 58C Demo** (5 min):

1. Walk through API_CONTRACT_STANDARD.md
2. Show buildStandardListResponse usage
3. Demonstrate how new endpoints inherit consistency

---

## Rollback Plan

If standardization causes issues:

1. Revert to previous response shapes
2. Update frontend to handle both old and new shapes
3. Gradual migration with feature flag

---

## Dependencies

- **GTM-YardFlow team**: May need to update frontend hooks if they hardcoded key names
- **Jake**: SendGrid sender verification (independent)
- **Railway**: Deploy after each task commit

---

## Time Estimates

| Task          | Estimate    | Assignee |
| ------------- | ----------- | -------- |
| 58A (3 tasks) | 2 hours     | Backend  |
| 58B (8 tasks) | 3 hours     | Backend  |
| 58C (3 tasks) | 2 hours     | Backend  |
| **Total**     | **7 hours** |          |
