# Sprint Plan V34: Email Activation & Platform Stability

**Created**: February 5, 2026  
**Status**: Active  
**Goal**: Enable email sending from frontend, eliminate YardFlow branding, fix all console errors  
**Primary Repo**: YardFlow-Hitlist (Railway Backend)  
**Frontend Repo**: GTM-YardFlow (Vercel)

---

## Executive Summary

This sprint plan addresses critical blockers preventing Manifest 2026 outreach:

1. **Email Sending**: Frontend can't send emails (403 errors, missing endpoints)
2. **Branding**: AI generates "YardFlow" instead of "FreightRoll" 
3. **Auth Issues**: Multiple routes use session-only auth, breaking S2S
4. **Console Errors**: 500/403 errors polluting frontend console

**Review Notes**:
- T34A.2 removed: `/api/email/send` already exists
- T34B.2 expanded: `brand-voice-generator.ts` contains literal "YardFlow"
- T34C.1 split: Too large for single commit
- Existing tests will be extended, not duplicated

---

## Sprint 34A: Email Send Pipeline (2 hours)

**Goal**: Users can send emails from frontend and receive them in inbox  
**Demo**: Send test email through GTM-YardFlow → arrives in inbox within 30 seconds

### T34A.1: Verify SendGrid Configuration

**Priority**: P0 | **Effort**: 15 min | **Dependencies**: None

**Problem**: Email sending may fail if SendGrid not properly configured

**Tasks**:
1. SSH into Railway or check environment: verify `SENDGRID_API_KEY` is set
2. Log into SendGrid dashboard
3. Check Settings → Sender Authentication for verified domains/senders
4. Document which sender addresses are verified

**Expected Verified Senders**:
- `jake@freightroll.com`
- `casey@freightroll.com`  
- `team@freightroll.com`

**Validation**:
```bash
curl -s "$RAILWAY_URL/api/email/health" -H "Authorization: Bearer $CRON_SECRET" | jq '.status'
# Expected: "ok"
```

**Test**: N/A (configuration verification)

**Commit**: `docs: document SendGrid sender verification status`

---

### T34A.2: Verify /api/email/send Flow

**Priority**: P0 | **Effort**: 20 min | **Dependencies**: T34A.1

**Problem**: Need to confirm direct email send works end-to-end

**Note**: Endpoint already exists at `src/app/api/email/send/route.ts`

**Tasks**:
1. Review existing `/api/email/send` implementation
2. Test with actual SendGrid call (not mock)
3. Verify email arrives in test inbox
4. Check outreach record created in database

**Validation**:
```bash
curl -X POST "$RAILWAY_URL/api/email/send" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-test@email.com",
    "subject": "V34 Email Test",
    "body": "This is a test from Sprint 34A",
    "from": "jake@freightroll.com"
  }'
# Expected: { "success": true, "messageId": "..." }
```

**Test**: Manual inbox verification + check outreach table

**Commit**: `test: verify /api/email/send end-to-end flow`

---

### T34A.3: Verify /api/outreach/send-email Flow

**Priority**: P0 | **Effort**: 25 min | **Dependencies**: T34A.1

**Problem**: Frontend uses outreachId-based send flow

**Current Flow**:
1. Create outreach record: `POST /api/outreach` 
2. Send email: `POST /api/outreach/send-email { outreachId }`

**Tasks**:
1. Create test outreach record via API
2. Call send-email with that outreachId
3. Verify email arrives
4. Verify outreach status updated to SENT

**Validation**:
```bash
# Step 1: Create outreach
OUTREACH_ID=$(curl -s -X POST "$RAILWAY_URL/api/outreach" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "personId": "test-person-id",
    "channel": "EMAIL",
    "subject": "Test Subject",
    "message": "Test body content"
  }' | jq -r '.id')

# Step 2: Send it
curl -X POST "$RAILWAY_URL/api/outreach/send-email" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"outreachId\": \"$OUTREACH_ID\"}"
# Expected: { "success": true, "messageId": "..." }
```

**Test**: `tests/integration/outreach-send-flow.test.ts`

**Commit**: `test: verify outreach create → send-email flow`

---

### T34A.4: Verify SendGrid Webhook Integration

**Priority**: P1 | **Effort**: 30 min | **Dependencies**: T34A.2

**Problem**: Need delivery tracking (opened, clicked, bounced)

**Tasks**:
1. Review `/api/webhooks/sendgrid/route.ts` exists and handles events
2. Verify event mapping: delivered → SENT, opened → OPENED, clicked → CLICKED
3. Test with SendGrid's "Test Webhook" feature in dashboard
4. Verify outreach record updates

**Events to Handle**:
| SendGrid Event | Outreach Status |
|----------------|-----------------|
| `delivered` | SENT |
| `open` | OPENED |
| `click` | CLICKED |
| `bounce` | BOUNCED |
| `spamreport` | BOUNCED |

**Validation**:
```bash
# Simulate webhook event
curl -X POST "$RAILWAY_URL/api/webhooks/sendgrid" \
  -H "Content-Type: application/json" \
  -d '[{"event":"open","sg_message_id":"test123"}]'
```

**Test**: `tests/webhooks/sendgrid.test.ts` with mock events

**Commit**: `test: verify SendGrid webhook event handling`

---

## Sprint 34B: FreightRoll Voice Hardening (1.5 hours)

**Goal**: AI never generates "YardFlow" - always "FreightRoll"  
**Demo**: Generate content with all 3 tones, all say FreightRoll, zero YardFlow

### T34B.1: Add Post-Generation YardFlow Validator

**Priority**: P0 | **Effort**: 30 min | **Dependencies**: None

**Problem**: Even with prompts, AI sometimes ignores "never mention YardFlow"

**Tasks**:
1. Add `sanitizeFreightRollContent()` function in `content-generator.ts`
2. Replace any occurrence of "YardFlow" with "FreightRoll" (case-insensitive)
3. Log when replacement happens for monitoring
4. Apply to all content generation output

**Implementation**:
```typescript
// src/lib/ai/content-generator.ts
export function sanitizeFreightRollContent(content: string): { 
  content: string; 
  wasModified: boolean 
} {
  const regex = /yardflow/gi;
  const wasModified = regex.test(content);
  return {
    content: content.replace(regex, 'FreightRoll'),
    wasModified,
  };
}
```

**Validation**:
```bash
# Generate content and check output
curl -X POST "$RAILWAY_URL/api/ai/content/generate" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type":"email","tone":"professional","context":{"prospectName":"Test","companyName":"Acme"}}' \
  | jq '.content' | grep -i yardflow
# Expected: No matches
```

**Test**: `tests/ai/content-generator.test.ts` - input with "YardFlow", verify output has "FreightRoll"

**Commit**: `feat: add post-generation YardFlow sanitizer`

---

### T34B.2: Fix brand-voice-generator.ts YardFlow References

**Priority**: P0 | **Effort**: 45 min | **Dependencies**: None

**Problem**: `src/lib/ai/brand-voice-generator.ts` line 42 contains literal "YardFlow Brand Voice Guidelines"

**Tasks**:
1. Open `src/lib/ai/brand-voice-generator.ts`
2. Replace all user-facing "YardFlow" with "FreightRoll"
3. Audit other prompts in the file
4. Run lint to ensure no regressions

**Files to Modify**:
- `src/lib/ai/brand-voice-generator.ts`
- `src/lib/ai/dossier-generator.ts` (if contains YardFlow)
- `src/lib/ai/sequence-generator.ts` (if contains YardFlow)

**Validation**:
```bash
grep -ri "yardflow" src/lib/ai/*.ts | grep -v "// YardFlow" | grep -v ".test.ts"
# Expected: Only comments and URLs, no user-facing strings
```

**Test**: Manual grep verification + lint pass

**Commit**: `fix: replace YardFlow with FreightRoll in AI generators`

---

### T34B.3: Extend Voice Config Tests for YardFlow Absence

**Priority**: P1 | **Effort**: 15 min | **Dependencies**: T34B.1

**Problem**: Existing `tests/agents/voice-configs.test.ts` doesn't verify YardFlow absence

**Tasks**:
1. Open existing `tests/agents/voice-configs.test.ts`
2. Add test case: "generated content contains no YardFlow"
3. Test all 3 tones: freightroll, professional, challenger

**Implementation**:
```typescript
describe('FreightRoll voice generation', () => {
  it.each(['freightroll', 'professional', 'challenger'])(
    'generates %s content without YardFlow',
    async (tone) => {
      const result = await generateContent({ tone, ... });
      expect(result.content.toLowerCase()).not.toContain('yardflow');
    }
  );
});
```

**Validation**: `npm test tests/agents/voice-configs.test.ts` passes

**Test**: This IS the test

**Commit**: `test: add YardFlow absence verification to voice tests`

---

## Sprint 34C: Auth Audit & S2S Hardening (2 hours)

**Goal**: All endpoints work for both session and S2S auth  
**Demo**: All frontend calls succeed with S2S headers

### T34C.1a: Audit Routes for S2S Requirements

**Priority**: P0 | **Effort**: 15 min | **Dependencies**: None

**Problem**: Unknown which routes use session-only auth()

**Tasks**:
1. Run grep to find all `auth()` usages
2. Categorize: needs S2S vs session-only by design
3. Document findings

**Command**:
```bash
grep -rn "await auth()" src/app/api/ --include="*.ts" | grep -v authServiceOrSession
```

**Expected Findings** (session-only routes that may need S2S):
| Route | Current Auth | Needs S2S? |
|-------|--------------|------------|
| `/api/reports/*` | auth() | No (internal) |
| `/api/accounts/[id]/*` | auth() | Yes |
| `/api/team/*` | auth() | No (internal) |
| `/api/integrations/*` | auth() | No (internal) |

**Validation**: Document created with full route audit

**Test**: N/A (documentation/analysis)

**Commit**: `docs: audit routes for S2S auth requirements`

---

### T34C.1b: Fix /api/accounts Routes for S2S

**Priority**: P0 | **Effort**: 30 min | **Dependencies**: T34C.1a

**Problem**: Account routes may use session-only auth

**Routes to Check**:
- `/api/accounts/[id]/route.ts`
- `/api/accounts/[id]/assign/route.ts`
- `/api/accounts/[id]/calculate-score/route.ts`

**Tasks**:
1. Check each route's auth pattern
2. Replace `auth()` with `authServiceOrSession()` where needed
3. Update import statements
4. Test both session and S2S access

**Validation**:
```bash
curl "$RAILWAY_URL/api/accounts/test-id" \
  -H "x-service-key: $S2S_SECRET"
# Expected: 200 or 404, not 401/403
```

**Test**: Add S2S test case to `tests/api/accounts.test.ts`

**Commit**: `fix: enable S2S auth for /api/accounts routes`

---

### T34C.2: Extend S2S Integration Test Suite

**Priority**: P1 | **Effort**: 20 min | **Dependencies**: T34C.1b

**Problem**: Existing S2S tests don't cover all critical endpoints

**Tasks**:
1. Open `tests/integration/s2s-auth.test.ts`
2. Add coverage for:
   - `/api/people` (GET)
   - `/api/accounts` (GET)
   - `/api/sequences` (GET)
   - `/api/outreach` (POST)
3. Verify each returns 200 with valid S2S key

**Validation**: `npm test tests/integration/s2s-auth.test.ts` all pass

**Test**: This IS the test extension

**Commit**: `test: extend S2S auth tests to cover critical endpoints`

---

### T34C.3: Update API Contract Auth Documentation

**Priority**: P2 | **Effort**: 15 min | **Dependencies**: T34C.1a

**Tasks**:
1. Open `docs/current/RAILWAY_API_CONTRACT.md`
2. Add "Auth Type" column to endpoint table
3. Mark each endpoint: S2S, Session, Both, None

**Format**:
```markdown
| Endpoint | Method | Auth Type | Description |
|----------|--------|-----------|-------------|
| /api/health | GET | None | No auth required |
| /api/ai/chat | POST | S2S | Requires x-service-key |
| /api/team | GET | Session | Internal UI only |
```

**Validation**: Document updated and reviewed

**Test**: N/A (documentation)

**Commit**: `docs: add auth type to RAILWAY_API_CONTRACT.md`

---

## Sprint 34D: Console Error Cleanup (1.5 hours)

**Goal**: Zero red errors in frontend console  
**Demo**: Load GTM-YardFlow, open devtools, zero 4xx/5xx errors

### T34D.1: Fix /api/auth/session Error Response

**Priority**: P1 | **Effort**: 20 min | **Dependencies**: None

**Problem**: `/api/auth/session` returns invalid JSON causing SyntaxError

**Note**: Path is `/api/auth/session`, NOT `/api/oauth/session`

**Tasks**:
1. Check `/api/auth/session/route.ts` exists
2. Ensure returns JSON on error (not HTML)
3. Add try-catch wrapper if missing
4. Test with various auth states

**Validation**:
```bash
curl -s "$RAILWAY_URL/api/auth/session" | jq '.'
# Expected: Valid JSON (even if empty or error)
```

**Test**: `tests/api/auth-session.test.ts` - verify JSON response in all cases

**Commit**: `fix: ensure /api/auth/session returns valid JSON`

---

### T34D.2: Debug Template 403 Errors

**Priority**: P1 | **Effort**: 30 min | **Dependencies**: None

**Problem**: Frontend shows `/api/railway/templates` 403 Forbidden

**Tasks**:
1. Verify `/api/templates/route.ts` uses authServiceOrSession (it does)
2. Add debug logging at auth check point
3. Check frontend is sending correct header format
4. Verify Bearer token vs x-service-key usage

**Debug Code**:
```typescript
// Temporary logging in templates route
logger.info('[templates] Auth attempt', {
  hasAuthHeader: !!req.headers.get('authorization'),
  hasServiceKey: !!req.headers.get('x-service-key'),
});
```

**Validation**: Frontend templates load, no 403 in console

**Test**: Manual verification with console open

**Commit**: `fix: debug and resolve template 403 errors`

---

### T34D.3: Fix Activity Endpoint 403

**Priority**: P1 | **Effort**: 15 min | **Dependencies**: None

**Problem**: `/api/railway/activit..._` returning 403

**Note**: Already fixed `activity/route.ts` to use authServiceOrSession in commit f784087

**Tasks**:
1. Verify fix deployed (check Railway build log)
2. Test endpoint directly
3. Confirm frontend call works

**Validation**:
```bash
curl -X POST "$RAILWAY_URL/api/outreach/activity" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"outreachId":"test","type":"OPENED"}'
# Expected: 200 or 404, not 403
```

**Test**: Manual verification after deploy

**Commit**: N/A (already committed in f784087)

---

## Sprint 34E: Production Hardening (1 hour)

**Goal**: Reliable operations with observability  
**Demo**: Health dashboard shows all green, logs have request IDs

### T34E.1: Add Request ID to All Responses

**Priority**: P1 | **Effort**: 20 min | **Dependencies**: None

**Problem**: Hard to correlate frontend errors with backend logs

**Tasks**:
1. Generate requestId at start of each handler
2. Add to all log messages
3. Return in response header: `X-Request-Id`
4. Frontend can display in error messages

**Implementation**:
```typescript
// Standard pattern for all routes
const requestId = crypto.randomUUID().slice(0, 12);
logger.info('[endpoint] Request received', { requestId });
// ... handler code ...
return NextResponse.json(data, {
  headers: { 'X-Request-Id': requestId },
});
```

**Validation**: Check response headers contain X-Request-Id

**Test**: Verify header in `tests/integration/request-id.test.ts`

**Commit**: `feat: add X-Request-Id header to all responses`

---

### T34E.2: Add Database Self-Test on Startup

**Priority**: P1 | **Effort**: 15 min | **Dependencies**: None

**Tasks**:
1. In `start-worker.sh` or worker init, add DB ping
2. Fail fast if DB unreachable
3. Log success/failure

**Implementation**:
```typescript
// src/lib/startup-checks.ts
export async function verifyDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('[startup] Database connection verified');
    return true;
  } catch (error) {
    logger.error('[startup] Database connection FAILED', { error });
    return false;
  }
}
```

**Validation**: Worker logs show "Database connection verified"

**Test**: Manual verification in Railway logs

**Commit**: `feat: add database self-test on worker startup`

---

### T34E.3: Add Redis Self-Test on Startup

**Priority**: P1 | **Effort**: 10 min | **Dependencies**: None

**Tasks**:
1. Add Redis ping to startup checks
2. Fail fast if Redis unreachable
3. Log success/failure

**Validation**: Worker logs show "Redis connection verified"

**Test**: Manual verification in Railway logs

**Commit**: `feat: add Redis self-test on worker startup`

---

## Success Criteria

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| Email sends work | 100% success | Send 5 test emails, all arrive |
| No YardFlow in content | 0 occurrences | Generate all 3 tones, grep output |
| Console errors | 0 red errors | Load frontend, check devtools |
| S2S endpoints | All working | Run S2S test suite |
| Health check | All green | `curl /api/health | jq '.status'` |

---

## Rollback Plan

If critical issues found:

1. **Email sending broken**: 
   - Check SendGrid dashboard for API errors
   - Verify SENDGRID_API_KEY in Railway env

2. **Auth changes break frontend**:
   - Revert specific auth changes: `git revert <commit>`
   - Add back session-only auth as fallback

3. **Content generation fails**:
   - Check AI provider health: `/api/health`
   - Fallback to OpenAI if Gemini rate limited

---

## Files Modified Summary

### New Files
- `tests/integration/outreach-send-flow.test.ts`
- `tests/integration/request-id.test.ts`
- `src/lib/startup-checks.ts`

### Modified Files
- `src/lib/ai/content-generator.ts` - Add sanitizer
- `src/lib/ai/brand-voice-generator.ts` - Replace YardFlow
- `src/app/api/accounts/[id]/route.ts` - S2S auth
- `src/app/api/auth/session/route.ts` - JSON error handling
- `tests/agents/voice-configs.test.ts` - Add YardFlow tests
- `tests/integration/s2s-auth.test.ts` - Extend coverage
- `docs/current/RAILWAY_API_CONTRACT.md` - Auth column

---

## Sprint Timeline Summary

| Sprint | Duration | Deliverable |
|--------|----------|-------------|
| 34A | 2 hours | Email sending works end-to-end |
| 34B | 1.5 hours | All content says FreightRoll |
| 34C | 2 hours | All S2S endpoints working |
| 34D | 1.5 hours | Zero console errors |
| 34E | 1 hour | Production observability |

**Total Estimated Effort**: 8 hours

Each sprint is independently deployable and testable.
