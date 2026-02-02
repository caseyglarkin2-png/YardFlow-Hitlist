# YardFlow Hitlist: Email Activation Sprint Plan

> **Status**: ACTIVE  
> **Created**: February 2, 2026  
> **Primary Goal**: Enable email sending from GTM Frontend (gtm-yard-flow.vercel.app)  
> **Philosophy**: Ship Fast, Ship Often - Every task atomic (30-90 min), testable, committable  
> **Architecture**: Two-Repo Platform (Railway Backend + Vercel GTM Frontend)

---

## Executive Summary

**Current State Assessment (February 2, 2026):**

| Component | Status | Evidence |
|-----------|--------|----------|
| Railway Backend Health | ✅ HEALTHY | `/api/health` returns 200, DB/Redis/Worker OK |
| Database Schema | ✅ COMPLETE | `tier`, `score`, `status`, `tags` all present in `people` model |
| Prisma Client | ✅ SYNCED | `prisma generate` completed successfully |
| CORS Configuration | ✅ CONFIGURED | `middleware.ts` allows `gtm-yard-flow.vercel.app` |
| S2S Authentication | ✅ IMPLEMENTED | `authServiceOrSession()` supports `x-service-key` |
| Send Email API | ⚠️ EXISTS | `/api/outreach/send-email` - needs E2E validation |
| Environment Secrets | ⚠️ UNVERIFIED | Need to confirm Railway has real `SENDGRID_API_KEY` |

**Blocking Issue**: Email sends return 401 Unauthorized from GTM frontend, or may fail if SendGrid not properly configured.

---

## Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GTM Sales Team                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               GTM Frontend (Vercel)                                      │
│               gtm-yard-flow.vercel.app                                   │
│                                                                          │
│   Environment Variables Required:                                        │
│   - NEXT_PUBLIC_BACKEND_URL=https://yardflow-hitlist-production-...     │
│   - SERVICE_TO_SERVICE_SECRET=<shared secret>                           │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTPS + Headers:
                                   │   x-service-key: <SECRET>
                                   │   Content-Type: application/json
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Railway Backend                                            │
│               yardflow-hitlist-production-2f41.up.railway.app           │
│                                                                          │
│   Environment Variables Required:                                        │
│   - SERVICE_TO_SERVICE_SECRET=<shared secret>                           │
│   - SENDGRID_API_KEY=<real SendGrid key>                                │
│   - SENDGRID_FROM_EMAIL=casey@freightroll.com                           │
│   - ALLOWED_ORIGINS=https://gtm-yard-flow.vercel.app                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Sprint Overview

| Sprint | Name | Tasks | Est. Time | Demo |
|--------|------|-------|-----------|------|
| **S0** | Environment Validation | 7 | 2 hours | Secrets verified, test email sent |
| **S1** | Email Pipeline E2E | 6 | 3 hours | Send email from curl with real delivery |
| **S2** | GTM Integration Test | 6 | 2.5 hours | GTM frontend sends email successfully |
| **S3** | Error Handling & UX | 4 | 2 hours | Friendly errors, retry logic |
| **S4** | Monitoring & Alerting | 4 | 1.5 hours | Email stats dashboard, failure alerts |

**Total**: 27 tasks, ~11 hours of work (+20% buffer = ~13 hours)

---

## Sprint Dependency Matrix

```
S0 (Environment) ──────────────────────────────────────────────────────────┐
   │                                                                       │
   │ Must complete S0 before any other sprint                              │
   │                                                                       │
   ▼                                                                       │
S1 (Email E2E) ────────────────────────────────────────────────────────────┤
   │                                                                       │
   │ Must verify email works via API before testing GTM                    │
   │                                                                       │
   ▼                                                                       │
S2 (GTM Integration) ──────────────────────────────────────────────────────┤
   │                                                                       │
   │ Can run S3 & S4 in parallel after S2                                  │
   │                                                                       │
   ├──────────────────┐                                                    │
   │                  │                                                    │
   ▼                  ▼                                                    │
S3 (Error Handling)  S4 (Monitoring)                                       │
   │                  │                                                    │
   │ Both optional    │                                                    │
   │ but recommended  │                                                    │
   │                  │                                                    │
   └──────────────────┴────────────────────────────────────────────────────┘
```

**Critical Path**: S0 → S1 → S2 (minimum viable for GTM email)

---

# Sprint S0: Environment Validation

> **Goal**: Verify all secrets are correctly configured in Railway and Vercel  
> **Estimate**: 1.5 hours  
> **Demo**: Test email sent and received via SendGrid

## Tasks

### S0.1: Verify Railway Environment Variables

**Est**: 15 min | **Type**: Configuration Check

**Description**: Confirm Railway has the required environment variables set with real values (not dummy placeholders).

**Required Variables in Railway Dashboard**:
```
SERVICE_TO_SERVICE_SECRET=<generate with: openssl rand -base64 32>
SENDGRID_API_KEY=<real key from SendGrid dashboard>
SENDGRID_FROM_EMAIL=casey@freightroll.com
SENDGRID_FROM_NAME=FreightRoll
SENDGRID_REPLY_TO=casey@freightroll.com
ALLOWED_ORIGINS=https://gtm-yard-flow.vercel.app
CRON_SECRET=<generate with: openssl rand -base64 32>
```

**Validation**:
```bash
# Check health endpoint shows no missing critical vars
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq '.checks.environment'
# Expected: {"status":"ok","criticalMissing":[],"optionalMissing":[]}
```

**Success Criteria**: Health check shows no critical missing variables.

---

### S0.2: Verify Vercel Environment Variables

**Est**: 15 min | **Type**: Configuration Check

**Description**: Confirm Vercel (gtm-yard-flow) has matching secrets for S2S auth.

**Required Variables in Vercel Dashboard**:
```
NEXT_PUBLIC_BACKEND_URL=https://yardflow-hitlist-production-2f41.up.railway.app
SERVICE_TO_SERVICE_SECRET=<MUST MATCH Railway value exactly>
```

**Validation**: Deploy a test or check Vercel dashboard directly.

**Success Criteria**: Variables match between platforms.

---

### S0.3: Test S2S Authentication

**Est**: 20 min | **Type**: Integration Test

**Description**: Verify the S2S key works from external request.

**Test Script**:
```bash
#!/bin/bash
# Save as: scripts/test-s2s-auth-prod.sh

BACKEND_URL="https://yardflow-hitlist-production-2f41.up.railway.app"
S2S_SECRET="YOUR_SERVICE_TO_SERVICE_SECRET_HERE"

echo "Testing S2S Authentication..."

# Test 1: Should fail without key
RESULT=$(curl -s -w "%{http_code}" -o /dev/null \
  -X GET "$BACKEND_URL/api/accounts")
echo "Without auth: HTTP $RESULT (expect 401)"

# Test 2: Should succeed with key
RESULT=$(curl -s -w "%{http_code}" -o /dev/null \
  -X GET "$BACKEND_URL/api/accounts" \
  -H "x-service-key: $S2S_SECRET")
echo "With S2S key: HTTP $RESULT (expect 200)"

# Test 3: Check CORS preflight
RESULT=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/accounts" \
  -H "Origin: https://gtm-yard-flow.vercel.app" 2>&1 | grep -i "access-control")
echo "CORS Headers: $RESULT"
```

**Success Criteria**: 
- Request without key returns 401
- Request with valid key returns 200
- CORS headers present for GTM origin

---

### S0.4: Test SendGrid Configuration

**Est**: 20 min | **Type**: Integration Test

**Description**: Send a test email to verify SendGrid is configured correctly.

**Test Command**:
```bash
BACKEND_URL="https://yardflow-hitlist-production-2f41.up.railway.app"
CRON_SECRET="YOUR_CRON_SECRET_HERE"
TEST_EMAIL="your-email@example.com"

curl -X POST "$BACKEND_URL/api/email/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d "{\"to\": \"$TEST_EMAIL\"}"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Test email sent",
  "messageId": "abc123..."
}
```

**Success Criteria**: 
- API returns success
- Email arrives in inbox (check spam folder)

---

### S0.5: Create Environment Verification Script

**Est**: 20 min | **Files**: `eventops/scripts/verify-email-config.sh`

**Description**: Create a reusable script to verify all email-related configuration.

**Script Content**:
```bash
#!/bin/bash
# scripts/verify-email-config.sh
# Verifies email configuration is correct for production

set -e

BACKEND_URL="${BACKEND_URL:-https://yardflow-hitlist-production-2f41.up.railway.app}"

echo "=== YardFlow Email Configuration Verification ==="
echo "Backend: $BACKEND_URL"
echo ""

# 1. Health Check
echo "1. Checking backend health..."
HEALTH=$(curl -sf "$BACKEND_URL/api/health" 2>/dev/null || echo '{"status":"error"}')
STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$STATUS" = "healthy" ]; then
  echo "   ✅ Backend is healthy"
else
  echo "   ❌ Backend unhealthy: $HEALTH"
  exit 1
fi

# 2. Environment Check
echo "2. Checking environment variables..."
ENV_STATUS=$(echo "$HEALTH" | grep -o '"environment":{[^}]*}' || echo '{}')
if echo "$ENV_STATUS" | grep -q '"criticalMissing":\[\]'; then
  echo "   ✅ All critical env vars present"
else
  echo "   ❌ Missing env vars: $ENV_STATUS"
fi

# 3. CORS Check
echo "3. Checking CORS configuration..."
CORS=$(curl -sf -I -X OPTIONS "$BACKEND_URL/api/health" \
  -H "Origin: https://gtm-yard-flow.vercel.app" 2>&1 || echo "")
if echo "$CORS" | grep -qi "access-control-allow-origin"; then
  echo "   ✅ CORS headers present"
else
  echo "   ⚠️  CORS headers not detected (may be OK for non-browser)"
fi

echo ""
echo "=== Verification Complete ==="
echo ""
echo "Next Steps:"
echo "  1. Run S0.4 to send a test email"
echo "  2. Verify email arrives in inbox"
echo "  3. Proceed to Sprint S1"
```

**Validation**:
```bash
cd eventops && chmod +x scripts/verify-email-config.sh && ./scripts/verify-email-config.sh
```

**Success Criteria**: Script runs without errors, all checks pass.

---

### S0.6: Verify SendGrid Sender Authentication

**Est**: 15 min | **Type**: Configuration Check

**Description**: Confirm the sender domain (freightroll.com) is authenticated in SendGrid. Unauthenticated domains cause emails to land in spam or be rejected entirely.

**Steps**:
1. Log into SendGrid dashboard
2. Navigate to Settings → Sender Authentication
3. Verify domain shows "Verified" status
4. If not verified, complete domain authentication (DNS records)

**Success Criteria**: Domain shows as "Verified" in SendGrid dashboard.

---

### S0.7: Verify SendGrid API Key Permissions

**Est**: 10 min | **Type**: Configuration Check

**Description**: Ensure the API key has "Mail Send" permission and is not sandbox-only.

**Steps**:
1. Log into SendGrid → Settings → API Keys
2. Find the API key being used
3. Verify it has "Full Access" or at minimum "Mail Send" permission
4. Confirm key is NOT marked as "Sandbox"

**Success Criteria**: Key has mail send permissions, is not sandbox.

---

## S0 Sprint Demo

```bash
# Run verification script
./scripts/verify-email-config.sh

# Send test email
curl -X POST "https://yardflow-hitlist-production-2f41.up.railway.app/api/email/test" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"to": "casey@freightroll.com"}'

# Check inbox for email
```

---

# Sprint S1: Email Pipeline E2E

> **Goal**: Complete end-to-end email send with tracking  
> **Estimate**: 3 hours  
> **Demo**: Send email via API, track open, verify in database  
> **Blocked By**: S0 complete

## Tasks

### S1.1: Create Test Outreach Record

**Est**: 20 min | **Type**: Setup Script

**Description**: Create a test outreach record in the database that can be used for email testing.

**Script**: `scripts/create-test-outreach.ts`
```typescript
import { prisma } from '../src/lib/db';

const TEST_EMAIL = process.env.TEST_EMAIL || 'casey@freightroll.com';

async function createTestOutreach() {
  console.log(`Using test email: ${TEST_EMAIL}`);
  
  // Find or create test account
  let account = await prisma.target_accounts.findFirst({
    where: { name: 'Test Account' },
  });

  if (!account) {
    account = await prisma.target_accounts.create({
      data: {
        id: `test-account-${Date.now()}`,
        name: 'Test Account',
        website: 'https://example.com',
        icpScore: 80,
        eventId: 'manifest-2026',
        updatedAt: new Date(),
      },
    });
  }

  // Find or create test person
  let person = await prisma.people.findFirst({
    where: { email: TEST_EMAIL },
  });

  if (!person) {
    person = await prisma.people.create({
      data: {
        id: `test-person-${Date.now()}`,
        name: 'Test Person',
        email: TEST_EMAIL,
        title: 'VP Operations',
        accountId: account.id,
        updatedAt: new Date(),
      },
    });
  }

  // Create outreach record
  const outreach = await prisma.outreach.create({
    data: {
      id: `test-outreach-${Date.now()}`,
      personId: person.id,
      channel: 'EMAIL',
      status: 'DRAFT',
      subject: 'Quick question about Manifest 2026',
      message: `<p>Hi ${person.name.split(' ')[0]},</p>
<p>I noticed you'll be at Manifest 2026 and wanted to connect.</p>
<p>Would you have 15 minutes to chat about yard operations challenges?</p>
<p>Best,<br/>Casey</p>`,
      updatedAt: new Date(),
    },
  });

  console.log('Created test outreach:', outreach.id);
  console.log('Person email:', person.email);
  return outreach;
}

async function cleanupTestData() {
  console.log('Cleaning up test data...');
  await prisma.outreach.deleteMany({ where: { id: { startsWith: 'test-outreach-' } } });
  await prisma.people.deleteMany({ where: { id: { startsWith: 'test-person-' } } });
  await prisma.target_accounts.deleteMany({ where: { id: { startsWith: 'test-account-' } } });
  console.log('Cleanup complete');
}

// Run with: TEST_EMAIL=your@email.com npx tsx scripts/create-test-outreach.ts
// Cleanup with: npx tsx scripts/create-test-outreach.ts --cleanup
if (process.argv.includes('--cleanup')) {
  cleanupTestData()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
} else {
  createTestOutreach()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
```

**Validation**:
```bash
cd eventops && npx tsx scripts/create-test-outreach.ts
# Note the outreach ID for next task
```

**Success Criteria**: Outreach record created with valid person and email.

---

### S1.2: Send Test Email via API

**Est**: 20 min | **Type**: Manual Test

**Description**: Use the created outreach record to send a real email.

**Test Command**:
```bash
OUTREACH_ID="test-outreach-xxx"  # From S1.1
CRON_SECRET="your-cron-secret"
BACKEND_URL="https://yardflow-hitlist-production-2f41.up.railway.app"

curl -X POST "$BACKEND_URL/api/outreach/send-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d "{\"outreachId\": \"$OUTREACH_ID\"}"
```

**Expected Response**:
```json
{
  "success": true,
  "messageId": "abc123...",
  "outreachId": "test-outreach-xxx",
  "status": "SENT"
}
```

**Success Criteria**: 
- API returns success
- Email arrives in recipient inbox
- Outreach status updated to SENT in database

---

### S1.3: Verify Tracking Pixel

**Est**: 20 min | **Type**: Integration Test

**Description**: Confirm the email contains a tracking pixel and opens are recorded.

**Steps**:
1. Open the test email in a browser (not just preview)
2. Check the outreach record for `openedAt` timestamp

**Verification Script**:
```bash
OUTREACH_ID="test-outreach-xxx"

# Check outreach status via API
curl -s "$BACKEND_URL/api/outreach/$OUTREACH_ID/status" \
  -H "Authorization: Bearer $CRON_SECRET" | jq '.'
```

**Expected**: `openedAt` should be set after opening email.

**Success Criteria**: Open tracking works.

---

### S1.4: Review Existing Send Email Tests

**Est**: 20 min | **Files**: `tests/integration/send-email.test.ts` (EXISTING)

**Description**: Review and verify existing test file has adequate coverage. The test file already exists with comprehensive tests - do NOT create a new file.

**Existing Coverage** (verify these tests pass):
- Returns 401 when not authenticated
- Returns 400 when outreachId is missing
- Returns 404 when outreach not found
- Returns 422 for missing email
- Returns 422 for invalid email format
- Returns 503 when SendGrid is not configured
- Sends email successfully with valid data

**Validation**:
```bash
cd eventops && npm run test:integration -- tests/integration/send-email.test.ts
```

**Success Criteria**: All existing tests pass.

---

### S1.5: Verify Email Validation Function Exists

**Est**: 10 min | **Type**: Verification

**Description**: Confirm `isValidEmail` function exists and is exported from `src/lib/sendgrid.ts`. 

**Note**: This function already exists - do NOT recreate it.

**Verification**:
```bash
cd eventops && grep -n "isValidEmail" src/lib/sendgrid.ts
# Should show function definition and export
```

**Quick Test**:
```bash
npx tsx -e "import { isValidEmail } from './src/lib/sendgrid'; console.log('valid:', isValidEmail('test@example.com'), 'invalid:', isValidEmail('invalid'))"
# Expected: valid: true invalid: false
```

**Success Criteria**: Function exists, is exported, and validates correctly.

---

### S1.6: Document Email API

**Est**: 30 min | **Files**: `docs/current/EMAIL_API.md`

**Description**: Create API documentation for the email endpoints.

**Content**: Document request/response formats, error codes, and examples.

**Success Criteria**: Documentation is clear and accurate.

---

## S1 Sprint Demo

```bash
# 1. Create test outreach
cd eventops && npx tsx scripts/create-test-outreach.ts

# 2. Send email
curl -X POST "$BACKEND_URL/api/outreach/send-email" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"outreachId": "test-outreach-xxx"}'

# 3. Check inbox for email

# 4. Open email, then verify tracking
curl -s "$BACKEND_URL/api/outreach/test-outreach-xxx/status" \
  -H "Authorization: Bearer $CRON_SECRET" | jq '.openedAt'

# 5. Run tests
npm run test:integration
```

---

# Sprint S2: GTM Integration Test

> **Goal**: Verify GTM frontend can send emails successfully  
> **Estimate**: 2 hours  
> **Demo**: Click "Send" in GTM UI, email is delivered  
> **Blocked By**: S1 complete

## Tasks

### S2.1: Create GTM Proxy Test Script

**Est**: 30 min | **Files**: `scripts/test-gtm-proxy.sh`

**Description**: Simulate a request from GTM frontend to Railway backend.

```bash
#!/bin/bash
# scripts/test-gtm-proxy.sh
# Simulates GTM frontend calling Railway backend

BACKEND_URL="https://yardflow-hitlist-production-2f41.up.railway.app"
S2S_SECRET="${SERVICE_TO_SERVICE_SECRET:-your-secret}"
GTM_ORIGIN="https://gtm-yard-flow.vercel.app"

echo "=== GTM Integration Test ==="

# Test 1: CORS Preflight
echo "1. Testing CORS preflight..."
CORS=$(curl -sf -I -X OPTIONS "$BACKEND_URL/api/accounts" \
  -H "Origin: $GTM_ORIGIN" 2>&1)
if echo "$CORS" | grep -qi "access-control-allow-origin.*$GTM_ORIGIN"; then
  echo "   ✅ CORS allows GTM origin"
else
  echo "   ❌ CORS not configured for GTM"
  echo "   Response: $CORS"
fi

# Test 2: S2S Auth with GTM headers
echo "2. Testing S2S authentication..."
RESPONSE=$(curl -sf "$BACKEND_URL/api/accounts" \
  -H "Origin: $GTM_ORIGIN" \
  -H "x-service-key: $S2S_SECRET" \
  -H "Content-Type: application/json" 2>&1)
if [ $? -eq 0 ]; then
  echo "   ✅ S2S auth successful"
else
  echo "   ❌ S2S auth failed: $RESPONSE"
fi

# Test 3: Send email with GTM-like request
echo "3. Testing email send..."
# Note: Replace with real outreach ID
OUTREACH_ID="${TEST_OUTREACH_ID:-test-outreach-xxx}"
RESULT=$(curl -sf -X POST "$BACKEND_URL/api/outreach/send-email" \
  -H "Origin: $GTM_ORIGIN" \
  -H "x-service-key: $S2S_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"outreachId\": \"$OUTREACH_ID\"}" 2>&1)
if echo "$RESULT" | grep -q '"success":true'; then
  echo "   ✅ Email sent successfully"
else
  echo "   ❌ Email send failed: $RESULT"
fi

echo ""
echo "=== Test Complete ==="
```

**Validation**:
```bash
chmod +x scripts/test-gtm-proxy.sh
SERVICE_TO_SERVICE_SECRET=xxx TEST_OUTREACH_ID=yyy ./scripts/test-gtm-proxy.sh
```

**Success Criteria**: All 3 tests pass.

---

### S2.2: Verify GTM Environment Variables

**Est**: 15 min | **Type**: Configuration

**Description**: Ensure GTM frontend has correct backend URL and S2S secret.

**Required in Vercel (gtm-yard-flow)**:
```
NEXT_PUBLIC_BACKEND_URL=https://yardflow-hitlist-production-2f41.up.railway.app
SERVICE_TO_SERVICE_SECRET=<must match Railway>
```

**Validation**: Check Vercel dashboard or test via GTM frontend console.

**Success Criteria**: Variables are set and match Railway.

---

### S2.3: Test GTM Email Button

**Est**: 30 min | **Type**: Manual E2E Test

**Description**: Use the GTM frontend UI to send an email.

**Steps**:
1. Go to https://gtm-yard-flow.vercel.app
2. Navigate to a contact with email
3. Click "Send Email" button
4. Verify email is sent and status updates

**Success Criteria**: Email sends successfully from UI.

---

### S2.4: Document GTM Email Pattern (External Repo)

**Est**: 15 min | **Type**: Documentation / Issue Creation

**Description**: Document the required error handling pattern for GTM frontend. This task requires changes in the `gtm-yard-flow` repo, NOT this repo.

**Action**: Create a GitHub issue in the gtm-yard-flow repository with this pattern:

**Issue Title**: "Add error handling to email send functionality"

**Issue Body**:
```markdown
## Required Pattern for Email Sends

The GTM frontend must use a **server-side API route** (not client-side fetch) to call Railway backend. This ensures the S2S secret is not exposed to the browser.

### Implementation Pattern

\`\`\`typescript
// app/api/send-email/route.ts (GTM repo)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { outreachId } = await req.json();
  
  const response = await fetch(
    \`\${process.env.NEXT_PUBLIC_BACKEND_URL}/api/outreach/send-email\`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': process.env.SERVICE_TO_SERVICE_SECRET!,
      },
      body: JSON.stringify({ outreachId }),
    }
  );

  const result = await response.json();
  return NextResponse.json(result, { status: response.status });
}
\`\`\`

### Error Message Mapping

\`\`\`typescript
const errorMessages: Record<string, string> = {
  AUTH_REQUIRED: 'Please log in to send emails.',
  NOT_FOUND: 'This email draft was not found.',
  MISSING_EMAIL: 'This contact has no email address.',
  INVALID_EMAIL: 'The email address format is invalid.',
  ALREADY_SENT: 'This email was already sent.',
  SERVICE_UNAVAILABLE: 'Email service is temporarily unavailable.',
  SEND_FAILED: 'Failed to send email. Our team has been notified.',
};
\`\`\`
```

**Success Criteria**: Issue created in gtm-yard-flow repo.

---

### S2.5: Create GTM Integration Smoke Test

**Est**: 15 min | **Files**: `tests/smoke/gtm-email.sh`

**Description**: Quick smoke test to verify GTM→Railway email flow.

```bash
#!/bin/bash
# tests/smoke/gtm-email.sh

BACKEND_URL="https://yardflow-hitlist-production-2f41.up.railway.app"
S2S_SECRET="${SERVICE_TO_SERVICE_SECRET}"
GTM_ORIGIN="https://gtm-yard-flow.vercel.app"

# Quick check: can GTM reach Railway?
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
  "$BACKEND_URL/api/health" \
  -H "Origin: $GTM_ORIGIN")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ GTM→Railway connectivity OK"
  exit 0
else
  echo "❌ GTM→Railway connectivity FAILED (HTTP $HTTP_CODE)"
  exit 1
fi
```

**Validation**: Run as part of deployment pipeline.

**Success Criteria**: Script passes.

---

### S2.6: Verify GTM Uses Server-Side API Route

**Est**: 20 min | **Type**: Verification

**Description**: Confirm GTM frontend email sends use a server-side API route (not client-side fetch) so the S2S secret isn't exposed to the browser.

**Why**: `SERVICE_TO_SERVICE_SECRET` must NEVER be exposed in browser. GTM must proxy through its own `/api/` route.

**Verification Steps**:
1. Check GTM repo for `/app/api/` routes that call Railway
2. Verify `SERVICE_TO_SERVICE_SECRET` is NOT prefixed with `NEXT_PUBLIC_`
3. Check browser Network tab when sending email - should call GTM `/api/`, not Railway directly

**Red Flag**: If GTM calls `yardflow-hitlist-production...` directly from browser, this is a security issue.

**Success Criteria**: Email sends proxy through GTM API route.

---

## S2 Sprint Demo

```bash
# 1. Run integration test script
./scripts/test-gtm-proxy.sh

# 2. Open GTM frontend
open https://gtm-yard-flow.vercel.app

# 3. Send email from UI

# 4. Verify email received
```

---

# Sprint S3: Error Handling & UX

> **Goal**: Improve error messages and add retry logic  
> **Estimate**: 2 hours  
> **Demo**: Clear error messages in UI, automatic retry on failure  
> **Blocked By**: S2 complete

## Tasks

### S3.1: Standardize Error Response Format

**Est**: 30 min | **Files**: `src/lib/api-errors.ts`

**Description**: Create a consistent error response helper.

```typescript
// src/lib/api-errors.ts
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export interface ApiError {
  error: string;
  code: string;
  details?: string;
  errorId?: string;
}

export function apiError(
  message: string,
  code: string,
  status: number,
  details?: string
): NextResponse {
  const errorId = Math.random().toString(36).substring(2, 10);
  
  logger.error('API Error', { message, code, status, details, errorId });
  
  const body: ApiError = { error: message, code };
  if (details) body.details = details;
  if (status >= 500) body.errorId = errorId;
  
  return NextResponse.json(body, { status });
}

// Common errors
export const Errors = {
  unauthorized: () => apiError('Unauthorized', 'AUTH_REQUIRED', 401),
  notFound: (resource: string) => apiError(`${resource} not found`, 'NOT_FOUND', 404),
  badRequest: (message: string) => apiError(message, 'BAD_REQUEST', 400),
  validation: (details: string) => apiError('Validation failed', 'VALIDATION_ERROR', 400, details),
  serverError: (message: string) => apiError(message, 'SERVER_ERROR', 500),
};
```

**Validation**: Import and use in API routes.

**Success Criteria**: Consistent error format across APIs.

---

### S3.2: Add Retry Logic to Email Queue

**Est**: 30 min | **Files**: `src/lib/queue/email-processor.ts`

**Description**: Ensure failed emails are retried with exponential backoff.

```typescript
// In email queue processor
import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from './client';

const emailQueue = new Queue('emails', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s, 2s, 4s
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
```

**Validation**: Trigger a failing email and verify retries.

**Success Criteria**: Failed emails retry automatically.

---

### S3.3: Add User-Friendly Error Messages

**Est**: 30 min | **Type**: Documentation for GTM

**Description**: Map error codes to user-friendly messages for GTM frontend.

```typescript
// For GTM frontend
const errorMessages: Record<string, string> = {
  AUTH_REQUIRED: 'Please log in to send emails.',
  NOT_FOUND: 'This email draft was not found. It may have been deleted.',
  MISSING_EMAIL: 'This contact has no email address. Please add one first.',
  INVALID_EMAIL: 'The email address format is invalid. Please check and try again.',
  ALREADY_SENT: 'This email was already sent. Check your outreach history.',
  SERVICE_UNAVAILABLE: 'Email service is temporarily unavailable. Please try again in a few minutes.',
  SEND_FAILED: 'Failed to send email. Our team has been notified.',
  WRONG_CHANNEL: 'This outreach is not configured for email.',
};

function getErrorMessage(code: string): string {
  return errorMessages[code] || 'An unexpected error occurred. Please try again.';
}
```

**Success Criteria**: All error codes have friendly messages.

---

### S3.4: Add Rate Limiting with Redis

**Est**: 40 min | **Files**: `src/app/api/outreach/send-email/route.ts`

**Description**: Add rate limiting using Redis (not in-memory Map which resets on restart).

```typescript
// Add to send-email route
import { getRedisConnection } from '@/lib/queue/client';

const RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute
const MAX_SENDS_PER_WINDOW = 10;

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const redis = getRedisConnection();
  const key = `ratelimit:email:${userId}`;
  
  try {
    const count = await redis.incr(key);
    
    // Set expiry on first increment
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }
    
    if (count > MAX_SENDS_PER_WINDOW) {
      const ttl = await redis.ttl(key);
      return { allowed: false, retryAfter: ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS };
    }
    
    return { allowed: true };
  } catch (error) {
    // If Redis fails, allow the request but log
    logger.warn('Rate limit check failed', { error, userId });
    return { allowed: true };
  }
}

// Usage in POST handler:
const rateCheck = await checkRateLimit(authResult.userId);
if (!rateCheck.allowed) {
  return NextResponse.json(
    { 
      error: `Rate limit exceeded. Try again in ${rateCheck.retryAfter} seconds.`,
      code: 'RATE_LIMITED',
      retryAfter: rateCheck.retryAfter,
    },
    { 
      status: 429,
      headers: { 'Retry-After': String(rateCheck.retryAfter) },
    }
  );
}
```

**Success Criteria**: Rate limits are enforced, persist across restarts.

---

## S3 Sprint Demo

```bash
# 1. Trigger an error and verify message
curl -X POST "$BACKEND_URL/api/outreach/send-email" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"outreachId": "non-existent"}'
# Should return: {"error":"Outreach not found","code":"NOT_FOUND"}

# 2. Trigger rate limit
for i in {1..15}; do
  curl -X POST "$BACKEND_URL/api/outreach/send-email" ...
done
# Should eventually return rate limit error
```

---

# Sprint S4: Monitoring & Alerting

> **Goal**: Add visibility into email pipeline health  
> **Estimate**: 1.5 hours  
> **Demo**: Email stats dashboard, failure alerts  
> **Blocked By**: S3 complete

## Tasks

### S4.1: Verify Email Stats Endpoint

**Est**: 10 min | **Type**: Verification

**Description**: The `/api/email/stats` endpoint already exists. Verify it works correctly.

**Note**: Endpoint already exists at `src/app/api/email/stats/route.ts` - do NOT recreate.

**Verification**:
```bash
curl -s "$BACKEND_URL/api/email/stats" \
  -H "Authorization: Bearer $CRON_SECRET" | jq '.'
```

**Expected Response**:
```json
{
  "totalSent": 123,
  "sentToday": 5,
  "sentThisWeek": 42,
  "totalOpened": 67,
  "openRate": "54.5%",
  "totalBounced": 3,
  "bounceRate": "2.4%",
  "pendingDrafts": 15,
  "timestamp": "2026-02-02T..."
}
```

**Success Criteria**: Endpoint returns accurate statistics.

---

### S4.2: Add Health Check for Email Service

**Est**: 20 min | **Files**: `src/app/api/health/route.ts`

**Description**: Include email service health in main health check.

```typescript
// Add to health check
async function checkEmailService(): Promise<{ status: 'ok' | 'degraded' | 'error'; details?: string }> {
  if (!process.env.SENDGRID_API_KEY) {
    return { status: 'error', details: 'SENDGRID_API_KEY not configured' };
  }
  
  // Check recent email failures
  const recentFailures = await prisma.outreach.count({
    where: {
      status: 'BOUNCED',
      bouncedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
    },
  });
  
  if (recentFailures > 10) {
    return { status: 'degraded', details: `${recentFailures} failures in last hour` };
  }
  
  return { status: 'ok' };
}
```

**Success Criteria**: Health check includes email status.

---

### S4.3: Add Failure Alert Logging

**Est**: 20 min | **Files**: `src/lib/logger.ts`

**Description**: Ensure email failures are logged with structured data for alerting.

```typescript
// Log email failures with alert-worthy severity
logger.error('Email send failed - ALERT', {
  alertType: 'email_failure',
  outreachId,
  recipientEmail: '***@***.com', // Redacted
  errorCode: 'SEND_FAILED',
  errorMessage: sgError,
  timestamp: new Date().toISOString(),
});
```

**Success Criteria**: Failures are logged with structured alert data.

---

### S4.4: Create Email Dashboard API

**Est**: 20 min | **Files**: `src/app/api/dashboards/email/route.ts`

**Description**: Create a dashboard data endpoint for email metrics.

```typescript
// Returns data formatted for dashboard charts
export async function GET(req: NextRequest) {
  // ... auth check ...
  
  // Get daily send counts for last 7 days
  const dailyStats = await prisma.$queryRaw`
    SELECT 
      DATE(sentAt) as date,
      COUNT(*) as sent,
      COUNT(CASE WHEN openedAt IS NOT NULL THEN 1 END) as opened
    FROM outreach
    WHERE sentAt >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
    GROUP BY DATE(sentAt)
    ORDER BY date DESC
  `;
  
  return NextResponse.json({ dailyStats });
}
```

**Success Criteria**: Dashboard data available for visualization.

---

## S4 Sprint Demo

```bash
# 1. Check email stats
curl -s "$BACKEND_URL/api/email/stats" -H "Authorization: Bearer $CRON_SECRET"

# 2. Check health includes email
curl -s "$BACKEND_URL/api/health" | jq '.checks.email'

# 3. Get dashboard data
curl -s "$BACKEND_URL/api/dashboards/email" -H "Authorization: Bearer $CRON_SECRET"
```

---

# Appendix A: Quick Reference

## Environment Variables Checklist

### Railway (YardFlow-Hitlist)
```
✅ DATABASE_URL
✅ REDIS_URL
✅ AUTH_SECRET
✅ SERVICE_TO_SERVICE_SECRET
✅ CRON_SECRET
✅ SENDGRID_API_KEY
✅ SENDGRID_FROM_EMAIL
✅ SENDGRID_FROM_NAME
✅ ALLOWED_ORIGINS
```

### Vercel (gtm-yard-flow)
```
✅ NEXT_PUBLIC_BACKEND_URL
✅ SERVICE_TO_SERVICE_SECRET (must match Railway)
```

## API Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/health` | GET | Health check | None |
| `/api/email/test` | POST | Send test email | Bearer token |
| `/api/email/stats` | GET | Email statistics | S2S or Session |
| `/api/outreach/send-email` | POST | Send email | S2S or Session |
| `/api/outreach/[id]/status` | GET | Get outreach status | S2S or Session |
| `/api/outreach/track/[id]/open` | GET | Track email open | None (tracking pixel) |

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| AUTH_REQUIRED | 401 | Missing authentication |
| NOT_FOUND | 404 | Resource not found |
| MISSING_EMAIL | 422 | Contact has no email |
| INVALID_EMAIL | 422 | Email format invalid |
| ALREADY_SENT | 409 | Email already sent recently |
| WRONG_CHANNEL | 400 | Outreach is not EMAIL type |
| SERVICE_UNAVAILABLE | 503 | SendGrid not configured |
| SEND_FAILED | 500 | SendGrid API error |

---

# Appendix B: Troubleshooting

## "401 Unauthorized" from GTM Frontend

1. Check `SERVICE_TO_SERVICE_SECRET` matches in both Railway and Vercel
2. Verify header is either `x-service-key` OR `Authorization: Bearer <CRON_SECRET>` (both are accepted by `authServiceOrSession`)
3. Check Vercel env var is NOT prefixed with `NEXT_PUBLIC_` (secrets should be server-side only)
4. Verify GTM is using a server-side API route (not calling Railway directly from browser)

## "CORS Error" in Browser

1. Verify `ALLOWED_ORIGINS` in Railway includes `https://gtm-yard-flow.vercel.app`
2. Check middleware.ts is deployed
3. Test CORS preflight: `curl -I -X OPTIONS ... -H "Origin: ..."`

## "SendGrid Not Configured"

1. Check Railway has `SENDGRID_API_KEY` set (not the dummy value)
2. Verify key is valid in SendGrid dashboard
3. Check sender email is verified in SendGrid

## Email Not Arriving

1. Check spam/junk folder
2. Verify sender domain (freightroll.com) is authenticated in SendGrid
3. Check SendGrid activity logs for bounces
4. Verify recipient email is valid

---

**Document Version**: 1.0  
**Last Updated**: February 2, 2026

---

# Appendix C: Rollback Plan

If email sending causes issues after deployment:

## Immediate Rollback (< 5 min)
1. Set `SENDGRID_API_KEY` to empty string in Railway
2. This causes `/api/outreach/send-email` to return 503 gracefully
3. Users see "Email service temporarily unavailable"

## Code Rollback (< 15 min)
1. Identify last working commit: `git log --oneline | head -10`
2. Revert: `git revert <commit-hash>`
3. Push: `git push origin main`
4. Railway auto-deploys

## Database Rollback
Not typically needed for email changes. Outreach records are idempotent.

---

# Appendix D: Future Sprints (Post-Activation)

## S5: Webhook & Bounce Handling (Optional)

> **Goal**: Handle SendGrid event webhooks for bounces, complaints, and unsubscribes

### S5.1: Add SendGrid Webhook Endpoint

**Est**: 45 min | **Files**: `src/app/api/webhooks/sendgrid/route.ts`

**Description**: Create endpoint to receive SendGrid event webhooks.

### S5.2: Verify Webhook in SendGrid Dashboard

**Est**: 15 min | **Type**: Configuration

**Description**: Register the webhook URL in SendGrid settings.

### S5.3: Update Outreach Status on Bounce

**Est**: 30 min | **Files**: `src/app/api/webhooks/sendgrid/route.ts`

**Description**: Parse bounce events and update outreach status.

### S5.4: Add Webhook Signature Validation

**Est**: 30 min | **Files**: `src/app/api/webhooks/sendgrid/route.ts`

**Description**: Verify webhook requests are from SendGrid using signature.

---

## S6: Email Analytics Dashboard (Optional)

> **Goal**: Visual dashboard for email performance metrics

### Tasks
- S6.1: Add daily/weekly email charts
- S6.2: Add bounce rate trend graph
- S6.3: Add top-performing templates view
- S6.4: Add email activity feed

