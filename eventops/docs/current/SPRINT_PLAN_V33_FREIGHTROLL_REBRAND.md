# Sprint Plan V33: FreightRoll Rebrand & Data Sync

**Created**: February 5, 2026  
**Status**: Active  
**Goal**: Complete FreightRoll rebranding, ensure data sync between repos, fix API contract compliance  
**Primary Repo**: YardFlow-Hitlist (Railway Backend)  
**Frontend Repo**: GTM-YardFlow (Vercel)

---

## Executive Summary

This sprint plan addresses three major workstreams:

1. **Rebrand**: Complete Luis → FreightRoll rename across all layers
2. **Data Sync**: Fix contact/prospect sync issues between Railway and GTM-YardFlow
3. **API Contract**: Ensure Railway responses match GTM-YardFlow expectations

Each sprint produces a demoable increment with full test coverage.

**Review Notes (Post-Subagent Analysis)**:
- ✅ T33B.2 DONE: Added `total` to `/api/people` pagination response  
- ✅ Fixed empty interface lint error in `src/types/brain-actions.ts`
- ⚠️ T33A.1: Use `ADD VALUE` approach for PostgreSQL enum migration, not `RENAME VALUE`
- ⚠️ T33C.2: Enrollments GET works fine - uses `sequenceId` not `flowId`

---

## Sprint 33A: Branding & Voice Cleanup (2-3 hours)

**Goal**: Complete FreightRoll rebrand, remove all Luis references  
**Demo**: AI content generation uses FreightRoll voice, signs off correctly

### T33A.1: Database Enum Migration (LUIS → FREIGHTROLL)

**Priority**: P1  
**Effort**: 30 min  
**Dependencies**: None

**Problem**: Prisma schema still uses `LUIS` in `TemplateTone` enum

**Tasks**:

1. Create Prisma migration to rename enum value: `LUIS` → `FREIGHTROLL`
2. Add data migration to update existing template records
3. Test migration on local database
4. Verify rollback works

**Files to Create**:

- `prisma/migrations/YYYYMMDDHHMMSS_rename_luis_to_freightroll/migration.sql`

**Migration SQL**:

```sql
-- Rename enum value
ALTER TYPE "TemplateTone" RENAME VALUE 'LUIS' TO 'FREIGHTROLL';

-- Update any existing templates
UPDATE message_templates SET tone = 'FREIGHTROLL' WHERE tone = 'LUIS';
```

**Validation**:

```bash
cd eventops
npx prisma migrate deploy
npx prisma studio  # Verify enum shows FREIGHTROLL
```

**Tests**:

- Manual: Create template via API with tone='FREIGHTROLL', verify DB stores correctly
- Manual: Query existing templates, verify tone shows as FREIGHTROLL

**Commit**: `chore(db): migrate TemplateTone enum LUIS → FREIGHTROLL`

---

### T33A.2: Remove Backward Compatibility Aliases

**Priority**: P2  
**Effort**: 15 min  
**Dependencies**: T33A.1

**Problem**: Code has deprecated aliases (`validateLuisOutput` etc.) that should be removed after migration

**Tasks**:

1. Remove `@deprecated` aliases from `content-generator.ts`
2. Remove `luis` from `ToneSchema` in API routes
3. Update any remaining imports

**Files to Modify**:

- `src/lib/ai/content-generator.ts` - Remove deprecated exports
- `src/app/api/ai/content/generate/route.ts` - Remove 'luis' from ToneSchema
- `src/app/api/templates/route.ts` - Remove 'LUIS' from ToneSchema
- `src/app/api/templates/[id]/route.ts` - Remove 'LUIS' from ToneSchema

**Validation**:

```bash
npm run lint  # No errors
npm run build  # No type errors
npm test -- --run  # All tests pass
```

**Tests**:

- `tests/agents/ai-content-generate.test.ts` - Verify 'luis' tone returns 400

**Commit**: `refactor: remove Luis backward compatibility aliases`

---

### T33A.3: Update Remaining YardFlow → FreightRoll Strings

**Priority**: P2  
**Effort**: 30 min  
**Dependencies**: None

**Problem**: Some hardcoded "YardFlow" strings should be "FreightRoll"

**Tasks**:

1. Audit all files for "YardFlow" strings
2. Determine which should change (user-facing) vs stay (technical names)
3. Update user-facing strings to "FreightRoll"
4. Keep technical names (repo name, URLs, etc.)

**File Audit Command**:

```bash
grep -rn "YardFlow" src/ --include="*.ts" --include="*.tsx" | grep -v "yardflow"
```

**Files Likely to Update**:

- `src/lib/agents/orchestrator.ts` - Line 268 mentions YardFlow
- `src/lib/agents/socials-agent.ts` - Hashtags include YardFlow
- Email templates with YardFlow signatures

**Validation**:

- Grep returns only technical references (URLs, repo names)
- User-facing content says "FreightRoll"

**Tests**:

- Generate content via API, verify no "YardFlow" in output
- Manual review of agent outputs

**Commit**: `docs: update user-facing YardFlow references to FreightRoll`

---

### T33A.4: SendGrid Sender Verification

**Priority**: P1  
**Effort**: 20 min  
**Dependencies**: None (parallel task)

**Problem**: Need to verify these sender addresses in SendGrid:

- jake@freightroll.com
- casey@freightroll.com
- team@freightroll.com

**Tasks**:

1. Log into SendGrid Dashboard
2. Navigate to Settings → Sender Authentication
3. Add/verify each sender address
4. Document verification status

**Validation**:

```bash
# Test email from verified sender
curl -X POST $RAILWAY_URL/api/email/test \
  -H "x-service-key: $S2S_KEY" \
  -d '{"to":"test@example.com","subject":"Test"}'
```

**Tests**:

- Manual: Send test email, verify delivery
- Check email headers show proper authentication

**Commit**: `docs: document SendGrid sender verification`

---

## Sprint 33B: Data Sync Fix (3-4 hours)

**Goal**: Fix contacts/prospects showing only partial data in frontend  
**Demo**: Frontend Hitlist shows all contacts from database with proper filtering

### T33B.1: Diagnose Data Sync Issue

**Priority**: P0  
**Effort**: 1 hour  
**Dependencies**: None

**Problem**: Frontend shows small percentage of contacts - root cause unknown

**Tasks**:

1. Query Railway database for total people count
2. Query GTM-YardFlow API for people count returned
3. Compare event IDs between repos
4. Check pagination limits
5. Check activeEventId filtering

**Diagnostic Commands**:

```bash
# Railway side - total people
curl $RAILWAY_URL/api/people?limit=1 -H "x-service-key: $S2S_KEY" | jq '.pagination'

# Check specific event
curl $RAILWAY_URL/api/people?eventId=EVENT_ID&limit=500 -H "x-service-key: $S2S_KEY" | jq 'length'

# Database direct count
# SELECT COUNT(*) FROM people;
# SELECT event_id, COUNT(*) FROM people p JOIN target_accounts t ON p.account_id = t.id GROUP BY event_id;
```

**Validation**:

- Document exact counts: DB vs API vs Frontend
- Identify the filtering layer causing data loss

**Tests**:

- N/A (diagnostic task)

**Commit**: `docs: data sync diagnostic findings`

---

### T33B.2: Fix People API Pagination/Filtering

**Priority**: P0  
**Effort**: 1 hour  
**Dependencies**: T33B.1

**Problem**: (Based on T33B.1 findings) Likely pagination limit too low or eventId mismatch

**Likely Issues**:

1. Default limit is 100, frontend may not paginate
2. S2S calls need explicit eventId or global access
3. activeEventId null for S2S requests

**Tasks**:

1. Increase default limit or add pagination support to frontend
2. Fix S2S calls to access all events (or pass correct eventId)
3. Add `count` endpoint for frontend to show total

**Files to Modify**:

- `src/app/api/people/route.ts` - Fix S2S filtering, add count
- Potentially `src/app/api/accounts/route.ts` - Same fixes

**New Endpoint** (Optional):

```typescript
// GET /api/people/count
export async function GET(req) {
  const count = await prisma.people.count({ where: {...} });
  return NextResponse.json({ total: count });
}
```

**Validation**:

```bash
# Verify full count returned
curl $RAILWAY_URL/api/people -H "x-service-key: $S2S_KEY" | jq '.pagination.total'
```

**Tests**:

- `tests/api/people.test.ts` - Add test for S2S access returns all data
- Verify pagination works: limit=10, skip=10 returns different records

**Commit**: `fix(api): improve people API pagination and S2S access`

---

### T33B.3: Add People Count Endpoint

**Priority**: P1  
**Effort**: 30 min  
**Dependencies**: T33B.2

**Problem**: Frontend needs to know total count for UI display

**Tasks**:

1. Create `/api/people/count` endpoint
2. Support same filters as `/api/people`
3. Return `{ total, filtered }` counts

**File to Create**:

- `src/app/api/people/count/route.ts`

**Implementation**:

```typescript
export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  const where = eventId ? { target_accounts: { eventId } } : {};

  const total = await prisma.people.count();
  const filtered = await prisma.people.count({ where });

  return NextResponse.json({ total, filtered });
}
```

**Validation**:

```bash
curl $RAILWAY_URL/api/people/count -H "x-service-key: $S2S_KEY"
# Returns: {"total": 1234, "filtered": 567}
```

**Tests**:

- `tests/api/people-count.test.ts`
  - Returns correct total count
  - Returns filtered count with eventId param
  - Requires auth

**Commit**: `feat(api): add /api/people/count endpoint`

---

### T33B.4: Verify Cross-Repo Event ID Sync

**Priority**: P1  
**Effort**: 30 min  
**Dependencies**: T33B.1

**Problem**: Event IDs may not match between repos

**Tasks**:

1. List events in Railway database
2. Compare with events used in GTM-YardFlow
3. Document the mapping
4. Fix any discrepancies

**Diagnostic**:

```sql
-- Railway database
SELECT id, name, start_date FROM events;
```

**Validation**:

- Event IDs match between repos
- GTM-YardFlow uses correct eventId in API calls

**Tests**:

- Manual: Create prospect in GTM-YardFlow, verify appears in Railway

**Commit**: `docs: document event ID mapping between repos`

---

## Sprint 33C: API Contract Compliance (2-3 hours)

**Goal**: All Railway API responses match GTM-YardFlow expected formats  
**Demo**: Frontend dashboards show correct data, no console errors

### T33C.1: Create RAILWAY_API_CONTRACT.md

**Priority**: P1  
**Effort**: 45 min  
**Dependencies**: None

**Problem**: No single source of truth for API response formats

**Tasks**:

1. Document all endpoints GTM-YardFlow calls
2. Document expected request/response formats
3. Note any discrepancies found
4. Mark with TODO where fixes needed

**File to Create**:

- `docs/current/RAILWAY_API_CONTRACT.md`

**Format**:

````markdown
# Railway API Contract for GTM-YardFlow

## Endpoints

### GET /api/email/analytics

Request: `?period=30d&groupBy=day`
Response:

```json
{
  "sent": 150,
  "delivered": 145,
  "opens": 45,
  "clicks": 12,
  ...
}
```
````

### POST /api/ai/content/generate

Request:

```json
{
  "type": "email",
  "tone": "freightroll",
  "context": {...}
}
```

... (all endpoints)

````

**Validation**:
- Document covers all endpoints in GTM-YardFlow's `services/railway-api.ts`

**Tests**:
- N/A (documentation)

**Commit**: `docs: add Railway API contract specification`

---

### T33C.2: Fix Enrollments Endpoint

**Priority**: P1
**Effort**: 30 min
**Dependencies**: None

**Problem**: `/api/enrollments` returns 400 "prospectId and flowId are required" but frontend may not send both

**Tasks**:
1. Review frontend enrollment flow
2. Make fields optional with sensible defaults
3. Support listing enrollments by prospectId OR flowId
4. Update error messages to be more helpful

**Files to Modify**:
- `src/app/api/enrollments/route.ts`

**Change**:
```typescript
// Before
if (!prospectId || !flowId) {
  return NextResponse.json({ error: 'prospectId and flowId are required' }, { status: 400 });
}

// After
if (!prospectId && !flowId) {
  return NextResponse.json({
    error: 'Either prospectId or flowId is required',
    hint: 'Include at least one of: prospectId, flowId'
  }, { status: 400 });
}
````

**Validation**:

```bash
# List by prospectId
curl $RAILWAY_URL/api/enrollments?prospectId=xxx -H "x-service-key: $S2S_KEY"
```

**Tests**:

- `tests/api/enrollments.test.ts`
  - Returns enrollments by prospectId only
  - Returns enrollments by flowId only
  - Returns 400 when neither provided

**Commit**: `fix(api): make enrollments endpoint more flexible`

---

### T33C.3: Add Missing health fields

**Priority**: P2  
**Effort**: 20 min  
**Dependencies**: None

**Problem**: Health endpoint may be missing fields frontend expects

**Tasks**:

1. Review what GTM-YardFlow HealthDashboard component expects
2. Add any missing fields
3. Ensure consistent field naming

**Files to Modify**:

- `src/app/api/health/route.ts`

**Validation**:

```bash
curl $RAILWAY_URL/api/health | jq '.checks | keys'
```

**Tests**:

- Verify all expected keys present

**Commit**: `feat(api): add missing health check fields`

---

## Sprint 33D: Testing & Polish (2 hours)

**Goal**: Full test coverage, clean codebase, deployment verification  
**Demo**: All tests pass, Railway deploy succeeds, frontend integration working

### T33D.1: Add Integration Tests for Data Flow

**Priority**: P1  
**Effort**: 45 min  
**Dependencies**: Sprint 33B complete

**Problem**: No E2E tests for full data flow

**Tasks**:

1. Create integration test for: Create Account → Create Person → List People
2. Create integration test for: Generate Content → Verify FreightRoll voice
3. Create integration test for: Enrollment flow

**File to Create**:

- `tests/integration/data-flow.test.ts`

**Test Cases**:

```typescript
describe('Data Flow Integration', () => {
  it('creates account and person visible via API', async () => {
    // Create account
    // Create person
    // Query /api/people
    // Verify person appears
  });

  it('people count matches pagination total', async () => {
    // Get count
    // Get paginated list
    // Verify counts match
  });
});
```

**Validation**:

```bash
npm test tests/integration/data-flow.test.ts
```

**Tests**: This IS the test task

**Commit**: `test(integration): add data flow integration tests`

---

### T33D.2: Add E2E Content Generation Test

**Priority**: P1  
**Effort**: 30 min  
**Dependencies**: Sprint 33A complete

**Problem**: No E2E test verifying FreightRoll voice output

**Tasks**:

1. Create test that calls content generate API
2. Verify output contains "FreightRoll" or correct signature
3. Verify no "Luis" or "YardFlow" in output

**File to Create**:

- `tests/e2e/freightroll-voice.test.ts`

**Test Cases**:

```typescript
describe('FreightRoll Voice E2E', () => {
  it('generates content with FreightRoll branding', async () => {
    const response = await fetch('/api/ai/content/generate', {
      method: 'POST',
      headers: { 'x-service-key': S2S_KEY },
      body: JSON.stringify({
        type: 'email',
        tone: 'freightroll',
        context: { prospectName: 'Test', companyName: 'Acme' },
      }),
    });

    const json = await response.json();
    expect(json.content).not.toContain('Luis');
    expect(json.content).not.toContain('YardFlow');
    // Should contain FreightRoll OR be neutral
  });
});
```

**Validation**:

```bash
npm test tests/e2e/freightroll-voice.test.ts
```

**Commit**: `test(e2e): add FreightRoll voice verification test`

---

### T33D.3: Deploy and Verify

**Priority**: P0  
**Effort**: 30 min  
**Dependencies**: All previous tasks

**Problem**: Need to verify full stack working in production

**Tasks**:

1. Push all commits to main
2. Verify Railway build succeeds
3. Run verification script against production
4. Document any remaining issues

**Verification Script**:

```bash
#!/bin/bash
# scripts/verify-v33.sh

RAILWAY_URL="https://yardflow-hitlist-production-2f41.up.railway.app"
S2S_KEY="$SERVICE_TO_SERVICE_SECRET"

echo "=== V33 Production Verification ==="

# 1. Health check
echo "1. Health Check..."
curl -s "$RAILWAY_URL/api/health" | jq '.status'

# 2. AI Content with FreightRoll tone
echo "2. FreightRoll Content Generation..."
curl -s -X POST "$RAILWAY_URL/api/ai/content/generate" \
  -H "Content-Type: application/json" \
  -H "x-service-key: $S2S_KEY" \
  -d '{"type":"email","tone":"freightroll","context":{"prospectName":"Test","companyName":"Acme Corp"}}' \
  | jq '{subject, contentLength: (.content | length), provider}'

# 3. Email Analytics (new format)
echo "3. Email Analytics Format..."
curl -s "$RAILWAY_URL/api/email/analytics" \
  -H "x-service-key: $S2S_KEY" \
  | jq 'keys | sort'

# 4. People Count
echo "4. People Count..."
curl -s "$RAILWAY_URL/api/people?limit=1" \
  -H "x-service-key: $S2S_KEY" \
  | jq '.pagination'

echo "=== Verification Complete ==="
```

**Validation**:

- All checks pass
- No 500 errors
- Frontend works correctly

**Commit**: `ci: add V33 production verification script`

---

## Success Criteria

| Criteria                 | Target        | Validation Method                  |
| ------------------------ | ------------- | ---------------------------------- |
| No "Luis" in codebase    | 0 occurrences | `grep -r "luis" src/ \| wc -l` = 0 |
| FreightRoll voice works  | ✅            | E2E test passes                    |
| All contacts sync        | 100%          | Frontend count = DB count          |
| Analytics format correct | ✅            | Frontend dashboard loads           |
| Build succeeds           | ✅            | Railway green                      |
| Tests pass               | 100%          | `npm test` all green               |

---

## Rollback Plan

If critical issues found:

1. **Database Migration Failed**:
   - Run `npx prisma migrate reset` (DEV ONLY)
   - Or manually: `ALTER TYPE "TemplateTone" RENAME VALUE 'FREIGHTROLL' TO 'LUIS';`

2. **API Breaking Change**:
   - Git revert the specific commit
   - Push immediately

3. **Frontend Integration Broken**:
   - Coordinate with GTM-YardFlow repo
   - Add backward compat if needed

---

## Files Created/Modified Summary

### New Files

- `prisma/migrations/XXX_rename_luis_to_freightroll/migration.sql`
- `src/app/api/people/count/route.ts`
- `docs/current/RAILWAY_API_CONTRACT.md`
- `tests/integration/data-flow.test.ts`
- `tests/e2e/freightroll-voice.test.ts`
- `scripts/verify-v33.sh`

### Modified Files

- `src/lib/ai/content-generator.ts` - Remove deprecated aliases
- `src/lib/ai/voiceConfigs.ts` - Already updated
- `src/app/api/ai/content/generate/route.ts` - Remove 'luis' support
- `src/app/api/templates/route.ts` - Remove 'LUIS' support
- `src/app/api/templates/[id]/route.ts` - Remove 'LUIS' support
- `src/app/api/enrollments/route.ts` - Flexible validation
- `src/app/api/people/route.ts` - Pagination improvements
- `src/app/api/health/route.ts` - Additional fields
- `prisma/schema.prisma` - Enum rename

---

## Sprint Timeline

| Sprint | Goal                | Deliverable                         |
| ------ | ------------------- | ----------------------------------- |
| 33A    | FreightRoll Rebrand | AI generates FreightRoll content    |
| 33B    | Data Sync Fix       | All contacts visible in frontend    |
| 33C    | API Contract        | No frontend console errors          |
| 33D    | Testing & Polish    | Production verified, all tests pass |

Each sprint is independently deployable and testable.
