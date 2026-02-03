# YardFlow Sprint 26 — February 1, 2026

**Session Date**: February 1, 2026  
**Mission**: Full-stack production readiness with end-to-end email sequences and meeting attribution  
**Status**: ✅ Email Working | ⚠️ Schema Issues Identified | 🚀 Webhooks Implemented

---

## Executive Summary

| Area                   | Status      | Notes                                          |
| ---------------------- | ----------- | ---------------------------------------------- |
| **Railway Backend**    | ✅ Healthy  | All systems green (DB, Redis, Worker, Queues)  |
| **Email Sending**      | ✅ Working  | Test email to casey@freightroll.com successful |
| **SendGrid Verified**  | ✅ Done     | Single Sender `casey@freightroll.com` verified |
| **Calendly Webhook**   | ✅ Created  | `/api/webhooks/calendly` - meeting attribution |
| **Inbound Webhook**    | ✅ Created  | `/api/webhooks/inbound` - reply/OOO detection  |
| **Schema Drift**       | ⚠️ BLOCKING | Duplicate enrollment models need consolidation |
| **Frontend Connector** | ⚠️ Partial  | GTM needs RAILWAY_API_SECRET in Vercel         |

---

## 🏆 Today's Accomplishments

### 1. Email Infrastructure Complete

- Updated Railway `SENDGRID_FROM_EMAIL` to `casey@freightroll.com`
- Verified email sends via `/api/email/test`
- Email received successfully in inbox

### 2. Calendly Webhook Implemented (`/api/webhooks/calendly`)

- Handles `invitee.created` → Create meeting, stop sequences
- Handles `invitee.canceled` → Mark meeting cancelled
- HMAC-SHA256 signature verification
- Auto-stops active enrollments on meeting booked

### 3. Inbound Email Webhook Implemented (`/api/webhooks/inbound`)

- SendGrid Inbound Parse compatible
- OOO detection with smart patterns (10+ phrases)
- Return date extraction (day names, MM/DD dates)
- Bounce detection and email status update
- Auto-pause enrollments on OOO, stop on reply

### 4. Schema Updates

- Added `PAUSED` status to sequence_enrollments
- Added `resume_at` field for OOO auto-resume

---

## ⚠️ Critical Issues Identified

### P0 — BLOCKING: Duplicate Enrollment Models

**Problem**: Two separate enrollment tables exist in the schema with different naming and fields:

| Model                  | Table      | Used By                                           |
| ---------------------- | ---------- | ------------------------------------------------- |
| `SequenceEnrollment`   | PascalCase | sequence-engine.ts, cron/sequences, compliance.ts |
| `sequence_enrollments` | snake_case | webhooks, enrollments API                         |

**Impact**:

- Enrollments created via sequence-engine go to one table
- Webhooks update a different table
- They are **completely disconnected**

**Files Affected**:

- `src/lib/outreach/sequence-engine.ts` (17 usages)
- `src/app/api/cron/sequences/route.ts` (3 usages)
- `src/lib/outreach/compliance.ts` (3 usages)
- `src/app/api/sequences/[id]/analytics/route.ts` (1 usage)

**Solution**: Consolidate to `sequence_enrollments` (snake_case) and update all TypeScript to match.

---

### P0 — BLOCKING: /api/prospects Returns Error

**Error**: `The column '(not available)' does not exist in the current database.`

**Root Cause**: Either schema drift or the query uses a field that doesn't exist in production.

**File**: `src/app/api/prospects/route.ts`

**Fix**: Run Prisma migrations on production:

```bash
DATABASE_URL="<prod>" npx prisma migrate deploy
```

---

### P1 — Missing Environment Variables in Railway

| Variable                            | Status     | Required For                  |
| ----------------------------------- | ---------- | ----------------------------- |
| `CALENDLY_WEBHOOK_SECRET`           | ❓ Unknown | Calendly webhook verification |
| `SENDGRID_WEBHOOK_VERIFICATION_KEY` | ❓ Unknown | SendGrid webhook verification |

---

## 📋 Sprint 26 Task Backlog

### P0 — Blocking (Must Fix This Week)

| Task                                   | File(s)            | Effort | Owner   |
| -------------------------------------- | ------------------ | ------ | ------- |
| T26.1: Consolidate enrollment models   | Schema + 5 files   | 3hr    | Backend |
| T26.2: Run Prisma migration on prod    | Railway            | 30min  | DevOps  |
| T26.3: Fix /api/prospects schema error | prospects/route.ts | 1hr    | Backend |

### P1 — High Priority (This Week)

| Task                                          | File(s)                 | Effort | Owner   |
| --------------------------------------------- | ----------------------- | ------ | ------- |
| T26.4: Add CALENDLY_WEBHOOK_SECRET to Railway | Railway Dashboard       | 15min  | DevOps  |
| T26.5: Add SENDGRID_WEBHOOK_VERIFICATION_KEY  | Railway Dashboard       | 15min  | DevOps  |
| T26.6: Add webhook idempotency (Redis dedup)  | 3 webhook routes        | 2hr    | Backend |
| T26.7: Add resume_at cron check               | cron/sequences/route.ts | 1hr    | Backend |
| T26.8: Add inbound webhook auth               | inbound/route.ts        | 1hr    | Backend |

### P2 — Can Wait (Next Week)

| Task                                             | File(s)           | Effort | Owner    |
| ------------------------------------------------ | ----------------- | ------ | -------- |
| T26.9: Improve OOO date parsing with chrono-node | inbound/route.ts  | 1hr    | Backend  |
| T26.10: Add webhook_events audit table           | Schema + webhooks | 2hr    | Backend  |
| T26.11: Fix lint warnings (batched)              | Multiple          | 3hr    | Backend  |
| T26.12: Add GTM frontend proxy testing           | GTM-YardFlow      | 2hr    | Frontend |

---

## Technical Details: Enrollment Model Consolidation

### Current State

**Model 1: `SequenceEnrollment`** (line 591 in schema)

```prisma
model SequenceEnrollment {
  id          String    @id @default(cuid())
  sequenceId  String
  personId    String?
  accountId   String?
  currentStep Int       @default(0)
  status      String    @default("active")
  startedAt   DateTime  @default(now())
  completedAt DateTime?
  pauseReason String?
  // Relations to OutreachSequence
}
```

**Model 2: `sequence_enrollments`** (line 243 in schema)

```prisma
model sequence_enrollments {
  id           String    @id @default(cuid())
  sequence_id  String
  contact_id   String
  status       String    @default("ACTIVE")
  current_step Int       @default(0)
  enrolled_at  DateTime  @default(now())
  completed_at DateTime?
  exited_at    DateTime?
  exit_reason  String?
  resume_at    DateTime?
  // Relations to sequences
}
```

### Target State

Keep `sequence_enrollments` with merged fields:

```prisma
model sequence_enrollments {
  id           String    @id @default(cuid())
  sequence_id  String
  contact_id   String
  account_id   String?
  status       String    @default("ACTIVE") // ACTIVE|PAUSED|COMPLETED|EXITED|FAILED
  current_step Int       @default(0)
  enrolled_at  DateTime  @default(now())
  completed_at DateTime?
  exited_at    DateTime?
  exit_reason  String?
  pause_reason String?
  resume_at    DateTime?

  // Relations
  sequence     sequences       @relation(...)
  people       people          @relation(...)
  target_accounts target_accounts? @relation(...)
  sequence_steps sequence_steps[]

  @@index([sequence_id])
  @@index([contact_id])
  @@index([status])
}
```

### Files to Update

1. **src/lib/outreach/sequence-engine.ts** — 12 usages
2. **src/app/api/cron/sequences/route.ts** — 3 usages
3. **src/lib/outreach/compliance.ts** — 3 usages
4. **src/app/api/sequences/[id]/analytics/route.ts** — 1 usage

### Migration Strategy

1. Add missing fields to `sequence_enrollments`
2. Create migration to merge data from `SequenceEnrollment` to `sequence_enrollments`
3. Update all TypeScript files to use `prisma.sequence_enrollments`
4. Remove `SequenceEnrollment` model from schema
5. Remove `OutreachSequence` and `EmailActivity` if fully replaced

---

## Frontend Connector Status

### GTM-YardFlow (Vercel) Requirements

| Config               | Value                                                     | Status         |
| -------------------- | --------------------------------------------------------- | -------------- |
| `RAILWAY_API_URL`    | `https://yardflow-hitlist-production-2f41.up.railway.app` | ⏳ Need to set |
| `RAILWAY_API_SECRET` | Same as Railway `CRON_SECRET`                             | ⏳ Need to set |

### Integration Points

| Endpoint                | GTM Usage            | Railway Status           |
| ----------------------- | -------------------- | ------------------------ |
| `/api/health`           | System health widget | ✅ Working               |
| `/api/dashboards/stats` | Dashboard overview   | ✅ Working               |
| `/api/sequences`        | Sequence management  | ✅ Working               |
| `/api/enrollments`      | Enrollment tracking  | ⚠️ Uses snake_case model |
| `/api/prospects`        | Prospect management  | ❌ Schema error          |
| `/api/email/test`       | Email testing        | ✅ Working               |

### `railwayClient` Implementation

GTM should create `lib/railway-client.ts`:

```typescript
const BASE_URL = process.env.RAILWAY_API_URL;
const SERVICE_KEY = process.env.RAILWAY_API_SECRET;

export const railwayClient = {
  async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!BASE_URL || !SERVICE_KEY) {
      throw new Error("Missing Railway configuration");
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) throw new Error(`Railway API Error: ${res.status}`);
    return res.json();
  },
};
```

---

## Quick Commands

```bash
# Check Railway health
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq '.status'

# Check email config
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/email/test | jq

# Send test email (requires CRON_SECRET)
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"to":"your@email.com"}' \
  https://yardflow-hitlist-production-2f41.up.railway.app/api/email/test

# Check Calendly webhook endpoint
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/webhooks/calendly | jq

# Check inbound webhook endpoint
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/webhooks/inbound | jq
```

---

## Production Database Stats

| Entity        | Count |
| ------------- | ----- |
| Accounts      | 2,615 |
| People        | 5,397 |
| Campaigns     | 0     |
| Meetings      | 0     |
| Outreach Sent | 0     |
| Sequences     | 0     |
| Enrollments   | 0     |

---

## Next Steps (Priority Order)

1. **Immediate**: Configure Calendly/SendGrid webhook secrets in Railway
2. **Today**: Push commit with new webhooks to trigger Railway deploy
3. **This Week**: Consolidate enrollment models (T26.1)
4. **This Week**: Run Prisma migrations on production (T26.2)
5. **This Week**: Set up GTM-YardFlow → Railway integration
6. **Next Week**: Create first test sequence and enrollments

---

## Files Changed This Session

```
3 files changed, 549 insertions(+), 1 deletion(-)

 eventops/prisma/schema.prisma                          | +2  (PAUSED status, resume_at)
 eventops/src/app/api/webhooks/calendly/route.ts        | +247 (new file)
 eventops/src/app/api/webhooks/inbound/route.ts         | +299 (new file)
```

---

## Definition of Done

- [x] Audit codebase and identify gaps
- [x] Implement Calendly webhook
- [x] Implement inbound email webhook
- [x] Update schema with PAUSED status
- [x] Subagent review with improvements
- [x] Document all findings in Sprint 26
- [ ] Push to main and deploy
- [ ] Consolidate enrollment models
- [ ] Configure webhook secrets in Railway

---

_Session End: February 1, 2026_  
_Next Session: Enrollment Model Consolidation_
