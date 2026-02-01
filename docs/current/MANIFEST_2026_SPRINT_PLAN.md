# YardFlow Hitlist - Manifest 2026 Sprint Plan

> **Event Date**: February 10, 2026 (9 days from today)  
> **Philosophy**: Ship Fast, Ship Often  
> **Status**: ACTIVE  
> **Last Updated**: February 1, 2026

---

## Executive Summary

This sprint plan outlines all work required to make YardFlow Hitlist production-ready for Manifest 2026. The plan is organized into 6 sprints across 9 days, with a total estimated effort of **38 hours** (~4.2 hours/day).

### Current System State

| Component              | Status        | Notes                                        |
| ---------------------- | ------------- | -------------------------------------------- |
| **Production Deploy**  | ✅ HEALTHY    | Railway responding, health endpoint 200      |
| **Database**           | ✅ Connected  | PostgreSQL via Prisma 7.3                    |
| **Redis/Queues**       | ✅ Connected  | BullMQ workers running                       |
| **SendGrid**           | ✅ Configured | API key set in Railway                       |
| **Agent Orchestrator** | ⚠️ Partial    | Steps 1-5 wired, needs validation            |
| **Research Agent**     | ✅ Working    | OpenAI integration complete                  |
| **Sequence Agent**     | ✅ Working    | `createSequenceFromBlueprint()` implemented  |
| **Email Pipeline**     | ⚠️ Partial    | SendGrid wired, queue jobs need verification |
| **Test Coverage**      | ❌ Low        | Many tests are TODO placeholders             |

### Critical Path

```
S0 (Foundation) → S1 (Core Agents) → S3 (GTM Integration) → S5 (Hardening)
                       ↓
                 S2 (Email Pipeline)
                       ↓
                 S4 (Content Polish)
                       ↓
                 S6 (Pre-Event)
```

---

## Sprint Overview

| Sprint | Name                             | Est. Hours | Days     | Priority     |
| ------ | -------------------------------- | ---------- | -------- | ------------ |
| **S0** | Foundation & Test Infrastructure | 2.5h       | Day 1    | 🔴 BLOCKER   |
| **S1** | Core Agent Hardening             | 6.5h       | Days 1-3 | 🔴 BLOCKER   |
| **S2** | Email Pipeline Completion        | 7.5h       | Days 3-4 | 🔴 BLOCKER   |
| **S3** | GTM Integration APIs             | 4.5h       | Days 4-5 | 🔴 BLOCKER   |
| **S4** | Content & Sequence Polish        | 6.5h       | Days 5-7 | 🟡 IMPORTANT |
| **S5** | Production Hardening             | 7.5h       | Days 7-8 | 🔴 BLOCKER   |
| **S6** | Pre-Event Validation             | 3.5h       | Days 8-9 | 🟡 IMPORTANT |

**Total**: 38.5 hours

---

## Go/No-Go Checkpoints

| Checkpoint | Day   | Criteria                            | Action if Red            |
| ---------- | ----- | ----------------------------------- | ------------------------ |
| **Alpha**  | Day 3 | S0 + S1 complete, tests pass        | Descope S4, weekend work |
| **Beta**   | Day 5 | S2 + S3 complete, GTM can call APIs | Descope S4.1-S4.2        |
| **RC**     | Day 7 | S4 + S5 complete, load test passes  | War room standby         |
| **GA**     | Day 9 | S6 complete, E2E validation passes  | Launch!                  |

---

## Sprint S0: Foundation & Test Infrastructure

> **Goal**: Fix test infrastructure, validate production baseline  
> **Estimate**: 2.5 hours  
> **Demo**: All tests pass, production verified  
> **Day**: 1

### S0.1: Fix Test Environment Configuration

**Estimate**: 30 min  
**Files**: `.env.test` (create), `vitest.config.ts`

**Implementation**:

1. Create `.env.test` with test secrets
2. Update vitest.config.ts to load test environment
3. Verify tests don't use production secrets

**Acceptance Criteria**:

```bash
# Test passes without 401 errors
npm run test:integration
# All S2S tests should pass
```

**Test Validation**:

- [ ] `SERVICE_TO_SERVICE_SECRET` correctly loaded in tests
- [ ] No network calls to production in unit tests

---

### S0.2: Add Integration Test Skip Logic

**Estimate**: 30 min  
**Files**: `tests/integration/s2s-auth.test.ts`

**Implementation**:

1. Add `beforeAll` check for server availability
2. Skip network-dependent tests gracefully when server unavailable
3. Log skip reason clearly

**Acceptance Criteria**:

```bash
# Tests skip gracefully without localhost server
npm run test:integration
# Output shows "Skipped: Server not available"
```

---

### S0.3: Verify Production Health & SendGrid

**Estimate**: 30 min  
**Files**: `scripts/test-sendgrid.ts` (create)

**Implementation**:

1. Create script to send test email via SendGrid
2. Verify email delivered to known address
3. Document baseline health metrics

**Acceptance Criteria**:

```bash
# Health endpoint returns 200
curl https://yardflow-hitlist-production-2f41.up.railway.app/api/health

# Test email sends successfully
npx tsx scripts/test-sendgrid.ts
```

**Test Validation**:

- [ ] Email received in inbox (check spam folder)
- [ ] No SendGrid errors in logs

---

### S0.4: Create Test Fixtures Directory

**Estimate**: 45 min  
**Files**: `tests/agents/fixtures/mock-account.ts`

**Implementation**:

1. Add mock account matching Prisma schema
2. Add mock contact with all required fields
3. Add mock dossier with realistic data
4. Add mockPrisma utility for consistent mocking

**Acceptance Criteria**:

```typescript
import { mockAccount, mockContact, mockDossier } from "./fixtures/mock-account";
// All types should match Prisma schema
```

**Test Validation**:

- [ ] Fixtures import without TypeScript errors
- [ ] Mock data matches Prisma schema types

---

### S0.5: Audit Existing Agent API Endpoints

**Estimate**: 30 min  
**Files**: Documentation only (update this file)

**Implementation**:

1. Document all existing `/api/agents/*` endpoints
2. Note which are complete vs placeholder
3. Update sprint tasks to avoid duplicate work

**Already Exists**:
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/agents/trigger` | POST | ✅ Complete - triggers any agent action |
| `/api/agents/workflow/[id]` | GET | ✅ Complete - returns workflow status |
| `/api/agents/workflow/[id]` | POST | ✅ Complete - retries failed task |
| `/api/agents/status` | GET | ⚠️ Verify functionality |
| `/api/agents/monitor` | GET | ⚠️ Verify functionality |
| `/api/agents/control` | POST | ⚠️ Verify functionality |

**Test Validation**:

- [ ] API inventory matches actual filesystem
- [ ] Each endpoint tested with curl

---

## Sprint S1: Core Agent Hardening

> **Goal**: Make orchestrator + core agents production-ready  
> **Estimate**: 6.5 hours  
> **Demo**: Full campaign runs with database persistence  
> **Days**: 1-3  
> **Depends On**: S0

### S1.1: Verify getWorkflowStatus Implementation

**Estimate**: 45 min  
**Files**: `src/lib/agents/orchestrator.ts`

**Current State**: Method exists, need to verify it queries database correctly.

**Implementation**:

1. Verify method queries agent_tasks table
2. Ensure parent-child task relationship works
3. Calculate progress % from child task statuses

**Acceptance Criteria**:

```typescript
const status = await orchestrator.getWorkflowStatus("workflow-123");
expect(status.found).toBe(true);
expect(status.progress).toBeGreaterThanOrEqual(0);
expect(status.tasks).toBeInstanceOf(Array);
```

---

### S1.2: Verify Workflow Status API

**Estimate**: 30 min  
**Files**: `src/app/api/agents/workflow/[workflowId]/route.ts`

**Current State**: ✅ Already implemented!

**Implementation**:

1. Test GET endpoint returns correct structure
2. Test 404 for non-existent workflow
3. Test POST endpoint retries failed task

**Acceptance Criteria**:

```bash
# Should return workflow status
curl -H "x-service-key: $S2S_SECRET" \
  https://yardflow-hitlist-production-2f41.up.railway.app/api/agents/workflow/test-123
```

---

### S1.3: Fix Orchestrator eventId TODO

**Estimate**: 20 min  
**Files**: `src/lib/agents/orchestrator.ts:95`

**Implementation**:

1. Replace `eventId: params.accountId` with proper event lookup
2. Query target_account's associated event
3. Fallback to params.eventId if provided

**Acceptance Criteria**:

```typescript
// Task inputData should have valid eventId
expect(task.inputData.eventId).toMatch(/^evt-/);
```

---

### S1.4: Add Prospecting Output Propagation

**Estimate**: 45 min  
**Files**: `src/lib/agents/orchestrator.ts:142`

**Implementation**:

1. After prospecting completes, query newly imported accounts
2. Update workflow with discovered account IDs
3. Continue to research step with real IDs

**Acceptance Criteria**:

```typescript
// Workflow should have discovered accounts
expect(workflow.discoveredAccounts.length).toBeGreaterThan(0);
```

---

### S1.5: Orchestrator Unit Tests (Core - 3 tests)

**Estimate**: 45 min  
**Files**: `tests/agents/orchestrator.test.ts`

**Tests to Implement**:

1. `should create root task for workflow`
2. `should create child tasks for each agent step`
3. `should continue workflow when non-critical agent fails`

**Acceptance Criteria**:

```bash
npm run test:agents -- --grep "AgentOrchestrator"
# 3 tests should pass
```

---

### S1.6: Orchestrator Unit Tests (Retry - 2 tests)

**Estimate**: 45 min  
**Files**: `tests/agents/orchestrator.test.ts`

**Tests to Implement**:

1. `should get correct workflow status with progress`
2. `should retry failed step and increment retry count`

**Acceptance Criteria**:

```bash
npm run test:agents -- --grep "retry|status"
# 2 tests should pass
```

---

### S1.7: Research Agent Tests (3 tests)

**Estimate**: 60 min  
**Files**: `tests/agents/research.test.ts`

**Tests to Implement**:

1. `should call OpenAI for dossier generation`
2. `should persist result to company_dossiers table`
3. `should return cached result on second call`

**Acceptance Criteria**:

```bash
npm run test:agents -- --grep "ResearchAgent"
# 3 tests should pass
```

---

### S1.8: Sequence Agent Tests (3 tests)

**Estimate**: 60 min  
**Files**: `tests/agents/sequence.test.ts`

**Tests to Implement**:

1. `should design sequence with valid blueprint`
2. `should persist sequence to database`
3. `should adjust timing based on urgency`

**Acceptance Criteria**:

```bash
npm run test:agents -- --grep "SequenceEngineer"
# 3 tests should pass
```

---

### S1.9: E2E Agent Flow Test Script

**Estimate**: 45 min  
**Files**: `scripts/test-agent-workflow.ts` (create)

**Implementation**:

1. Create script that runs full campaign with mock data
2. Verify all steps complete without error
3. Output summary of completed steps

**Acceptance Criteria**:

```bash
npx tsx scripts/test-agent-workflow.ts
# Should exit 0 with all steps logged as completed
```

---

### S1.10: E2E Agent Flow Validation

**Estimate**: 45 min  
**Files**: None (manual validation)

**Implementation**:

1. Run S1.9 script against local dev server
2. Verify database records created
3. Document any issues found

**Acceptance Criteria**:

- [ ] Root task exists in agent_tasks
- [ ] Child tasks created for each step
- [ ] Sequence created in sequences table
- [ ] No uncaught errors in logs

---

## Sprint S2: Email Pipeline Completion

> **Goal**: Email sending works end-to-end with tracking  
> **Estimate**: 7.5 hours  
> **Demo**: Send email via API, see open/click in dashboard  
> **Days**: 3-4  
> **Depends On**: S0

### S2.1: Verify SendGrid Integration Works

**Estimate**: 30 min  
**Files**: `scripts/test-sendgrid.ts`

**Implementation**:

1. Send test email to known address
2. Verify delivery in SendGrid dashboard
3. Check for any errors in response

**Acceptance Criteria**:

```bash
npx tsx scripts/test-sendgrid.ts
# Output: "Email sent successfully, messageId: xxx"
```

---

### S2.2: Create Email Send Queue Job

**Estimate**: 60 min  
**Files**: `src/lib/queue/jobs/email-send.ts` (create)

**Implementation**:

```typescript
interface EmailSendJobData {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  personId?: string;
  outreachId?: string;
  trackingEnabled?: boolean;
}

export async function processEmailSend(job: Job<EmailSendJobData>) {
  // Use sendgrid.ts sendEmail function
  // Log to email_engagement table
  // Handle errors with DLQ
}
```

**Acceptance Criteria**:

```typescript
// Job completes and email_engagement row created
const job = await emailQueue.add("send-email", data);
await job.finished();
expect(await prisma.email_engagement.findFirst()).toBeTruthy();
```

---

### S2.3: Register Email Queue Worker

**Estimate**: 30 min  
**Files**: `src/lib/queue/workers.ts`

**Implementation**:

1. Import processEmailSend job
2. Register worker for 'emails' queue
3. Add error handling and logging

**Acceptance Criteria**:

```bash
# Worker logs should show email queue registered
npm run worker
# Output includes: "Email worker started"
```

---

### S2.4: Wire Sequence Step to Email Queue

**Estimate**: 60 min  
**Files**: `src/lib/queue/jobs/sequence-step.ts`

**Implementation**:

1. Check if step type is EMAIL
2. Queue email via emailQueue
3. Include tracking metadata

**Acceptance Criteria**:

```typescript
// When sequence step is EMAIL type, email job is queued
await processSequenceStepJob({ data: { enrollmentId: "test", stepNumber: 1 } });
const jobs = await emailQueue.getJobs(["waiting"]);
expect(jobs.length).toBeGreaterThan(0);
```

---

### S2.5: Verify Email Open Tracking

**Estimate**: 45 min  
**Files**: `src/app/api/tracking/email/open/route.ts`

**Implementation**:

1. Verify tracking pixel injection in sendgrid.ts
2. Test tracking endpoint updates outreach.openedAt
3. Verify email_engagement row created

**Acceptance Criteria**:

```bash
# Tracking pixel should return 1x1 gif and update DB
curl "http://localhost:3000/api/tracking/email/open?id=test-123"
```

---

### S2.6: Verify Email Click Tracking

**Estimate**: 45 min  
**Files**: `src/app/api/tracking/email/click/route.ts`

**Implementation**:

1. Verify link wrapping in sendgrid.ts
2. Test click endpoint redirects correctly
3. Verify click event logged

**Acceptance Criteria**:

```bash
# Click tracking should redirect and log
curl -L "http://localhost:3000/api/tracking/email/click?id=test-123&url=https://example.com"
```

---

### S2.7: Wire SendGrid Webhooks to Database

**Estimate**: 45 min  
**Files**: `src/app/api/webhooks/sendgrid/route.ts`

**Implementation**:

1. Verify webhook handler exists
2. Update email_engagement on delivery/bounce/spam
3. Update outreach status on events

**Acceptance Criteria**:

```typescript
// Webhook should update database
const mockEvent = { event: "delivered", sg_message_id: "xxx" };
const response = await webhookHandler(mockEvent);
expect(response.status).toBe(200);
```

---

### S2.8: Email Stats API Enhancement

**Estimate**: 30 min  
**Files**: `src/app/api/email/stats/route.ts`

**Implementation**:

1. Add today's sends/opens/clicks
2. Add bounce rate calculation
3. Add queue depth

**Acceptance Criteria**:

```json
{
  "today": { "sent": 50, "opened": 25, "clicked": 10 },
  "bounceRate": 2.5,
  "queueDepth": 100
}
```

---

### S2.9: Email Pipeline Integration Test

**Estimate**: 60 min  
**Files**: `tests/integration/email-pipeline.test.ts` (create)

**Tests to Implement**:

1. `should queue email from sequence step`
2. `should process email and log engagement`
3. `should handle SendGrid errors gracefully`

**Acceptance Criteria**:

```bash
npm run test:integration -- --grep "email"
# 3 tests should pass
```

---

## Sprint S3: GTM Integration APIs

> **Goal**: Frontend can trigger and monitor agent workflows  
> **Estimate**: 4.5 hours  
> **Demo**: GTM UI starts campaign, sees progress  
> **Days**: 4-5  
> **Depends On**: S1

### S3.1: Create Campaign Start API

**Estimate**: 60 min  
**Files**: `src/app/api/agents/campaigns/start/route.ts` (create)

**Implementation**:

```typescript
// POST /api/agents/campaigns/start
const schema = z.object({
  eventId: z.string(),
  targetAccounts: z.array(z.string()).optional(),
  campaignType: z.enum(["booth-outreach", "pre-event", "post-event"]),
});

// Queue agent job and return workflow ID
return { workflowId: job.id, status: "queued" };
```

**Acceptance Criteria**:

```bash
curl -X POST -H "x-service-key: $S2S_SECRET" \
  -d '{"eventId":"evt-1","campaignType":"booth-outreach"}' \
  /api/agents/campaigns/start
# Returns 202 with workflowId
```

---

### S3.2: Create Campaign Progress API

**Estimate**: 45 min  
**Files**: `src/app/api/agents/campaigns/[id]/progress/route.ts` (create)

**Implementation**:

```typescript
// GET /api/agents/campaigns/[id]/progress
return {
  currentStep: "research",
  progress: 40,
  estimatedTimeRemaining: 120, // seconds
  steps: [
    { name: "prospecting", status: "completed" },
    { name: "research", status: "in_progress" },
    { name: "sequence", status: "pending" },
  ],
};
```

---

### S3.3: Create List Workflows API

**Estimate**: 45 min  
**Files**: `src/app/api/agents/workflows/route.ts` (create)

**Implementation**:

```typescript
// GET /api/agents/workflows?page=1&limit=10
return {
  workflows: [...],
  total: 50,
  page: 1,
  limit: 10
};
```

---

### S3.4: Create Workflow Cancel API

**Estimate**: 45 min  
**Files**: `src/app/api/agents/workflows/[id]/cancel/route.ts` (create)

**Implementation**:

```typescript
// POST /api/agents/workflows/[id]/cancel
// Marks workflow and pending children as 'cancelled'
```

---

### S3.5: Fix S2S Auth Tests

**Estimate**: 45 min  
**Files**: `tests/integration/s2s-auth.test.ts`

**Tests to Fix**:

1. `should accept valid S2S key on protected endpoint`
2. `should include CORS headers for GTM origin`
3. `should allow health check without authentication`

**Acceptance Criteria**:

```bash
npm run test:integration -- --grep "S2S"
# All 3 tests pass
```

---

### S3.6: GTM Integration Documentation

**Estimate**: 30 min  
**Files**: Update `.github/copilot-instructions.md`, create `docs/API_REFERENCE.md`

**Documentation**:

1. All agent API endpoints with examples
2. S2S authentication headers
3. Response schemas

---

## Sprint S4: Content & Sequence Polish

> **Goal**: Content agent generates real content, sequences work end-to-end  
> **Estimate**: 6.5 hours  
> **Demo**: Generated email template based on dossier  
> **Days**: 5-7  
> **Depends On**: S1, S3

### S4.1a: Content Adaptation - OpenAI Integration

**Estimate**: 60 min  
**Files**: `src/lib/agents/content-purposing-agent.ts`

**Implementation**:

1. Replace JSON.stringify with OpenAI call
2. Pass dossier context to prompt
3. Return structured content response

---

### S4.1b: Content Adaptation - Email Personalization

**Estimate**: 45 min  
**Files**: `src/lib/agents/content-purposing-agent.ts`

**Implementation**:

1. Extract pain points from dossier
2. Customize email subject and body
3. Add merge fields for dynamic content

---

### S4.2: Content Adaptation - Case Study Selection

**Estimate**: 60 min  
**Files**: `src/lib/agents/content-purposing-agent.ts`

**Implementation**:

1. Match case study to account industry
2. Highlight relevant ROI points
3. Format for email inclusion

---

### S4.3: Sequence Enrollment Flow

**Estimate**: 60 min  
**Files**: `src/lib/outreach/sequence-engine.ts`

**Implementation**:

1. Verify enrollContact works
2. First step queued with correct delay
3. Step processing triggers email

---

### S4.4: Enrollment Pause/Resume

**Estimate**: 45 min  
**Files**: `src/lib/outreach/sequence-engine.ts`

**Implementation**:

1. Pause sets status correctly
2. Resume continues from current step
3. Paused enrollment doesn't send emails

---

### S4.5: Content Agent Tests (4 tests)

**Estimate**: 60 min  
**Files**: `tests/agents/content.test.ts`

**Tests**:

1. `should return valid content structure`
2. `should call OpenAI for adaptation`
3. `should use fallback when Content Hub unavailable`
4. `should adjust tone based on campaign goal`

---

### S4.6: Prospecting Agent Tests (3 tests)

**Estimate**: 45 min  
**Files**: `tests/agents/prospecting.test.ts`

**Tests**:

1. `should return lead array from discovery`
2. `should filter leads by ICP score`
3. `should deduplicate existing accounts`

---

## Sprint S5: Production Hardening

> **Goal**: System handles errors gracefully, monitoring in place  
> **Estimate**: 7.5 hours  
> **Demo**: Error dashboard, graceful degradation  
> **Days**: 7-8  
> **Depends On**: S1, S2, S3

### S5.1: Agent Error Handling

**Estimate**: 60 min  
**Files**: `src/lib/agents/orchestrator.ts`

**Implementation**:

1. Wrap each agent call in try-catch
2. Log errors with structured context
3. Mark task as 'failed' with error message

---

### S5.2: Workflow Timeout Handling

**Estimate**: 60 min  
**Files**: `src/lib/agents/orchestrator.ts`

**Implementation**:

1. Add 5-minute timeout to agent execution
2. Timeout marks task as 'timeout' status
3. Allow retry of timed out tasks

---

### S5.3: Dead Letter Queue for Emails

**Estimate**: 60 min  
**Files**: `src/app/api/email/queue/dead-letter/route.ts`

**Implementation**:

1. Failed emails go to DLQ
2. API to list DLQ items
3. Retry endpoint for DLQ items

---

### S5.4: Rate Limiting for Email Sends

**Estimate**: 45 min  
**Files**: `src/lib/queue/jobs/email-send.ts`

**Implementation**:

1. Limit to 100 emails/minute
2. Queue enforces rate via job delay
3. Log rate limit hits

---

### S5.5: Health Check Enhancements

**Estimate**: 45 min  
**Files**: `src/app/api/health/route.ts`

**Implementation**:

1. Add worker heartbeat check
2. Add queue depth warning thresholds
3. Add recent error count

---

### S5.6: Alert Manager Integration

**Estimate**: 60 min  
**Files**: `src/lib/alerts/alert-manager.ts`

**Implementation**:

1. Alert on workflow failure
2. Alert on high queue depth (>1000)
3. Alert on email bounce rate >5%

---

### S5.7a: Load Test Script Creation

**Estimate**: 45 min  
**Files**: `tests/load/load-test.ts` (create)

**Implementation**:

1. Script to simulate 50 concurrent workflow starts
2. Configurable concurrency and duration

---

### S5.7b: Load Test Execution & Analysis

**Estimate**: 45 min  
**Files**: Documentation

**Implementation**:

1. Run load test against staging
2. Measure P95 response times
3. Document results and bottlenecks

---

### S5.8: Post-Deploy Verification Update

**Estimate**: 30 min  
**Files**: `scripts/post-deploy-verify.sh`

**Implementation**:

1. Check all critical endpoints
2. Verify queue workers running
3. Exit with clear status

---

## Sprint S6: Pre-Event Validation

> **Goal**: Final validation and war room preparation  
> **Estimate**: 3.5 hours  
> **Demo**: Complete workflow verified  
> **Days**: 8-9  
> **Depends On**: S4, S5

### S6.1: War Room Status API

**Estimate**: 60 min  
**Files**: `src/app/api/admin/war-room/route.ts` (create)

**Implementation**:

```json
{
  "queues": { "email": { "waiting": 50, "active": 2, "failed": 0 } },
  "recentErrors": [],
  "emailStats": { "sentToday": 150, "openedToday": 75 },
  "workerStatus": { "lastHeartbeat": "2026-02-09T10:00:00Z" }
}
```

---

### S6.2: Export Enhancement

**Estimate**: 45 min  
**Files**: `src/app/api/export/route.ts`

**Implementation**:

1. Add workflow export to CSV
2. Include all tasks with statuses

---

### S6.3: Final Integration Test - Script

**Estimate**: 45 min  
**Files**: `scripts/final-integration-test.ts` (create)

**Implementation**:

1. Run complete workflow
2. Create campaign → send emails → track opens
3. Verify all database records

---

### S6.4: Final Integration Test - Execution

**Estimate**: 60 min  
**Files**: None (manual)

**Implementation**:

1. Run against production
2. Document any issues
3. Create rollback plan if needed

---

## Deferred to Post-Manifest (Sprint S7+)

These items are descoped from pre-event work:

| Item                                       | Reason               | Future Sprint |
| ------------------------------------------ | -------------------- | ------------- |
| Prospecting real scraper                   | Mock data sufficient | S7            |
| Graphics Agent (DALL-E)                    | Marketing has assets | S8            |
| Socials Agent (LinkedIn API)               | Manual posting works | S9            |
| Contracting Agent (doc gen)                | Templates exist      | S10           |
| UI components (workflow-status, task-tree) | GTM repo scope       | S7            |

---

## Risk Register

| Risk                             | Likelihood | Impact   | Mitigation                   |
| -------------------------------- | ---------- | -------- | ---------------------------- |
| SendGrid rate limit during event | Medium     | High     | Pre-warm IP, stagger sends   |
| OpenAI API timeout               | Medium     | Medium   | Fallback to cached templates |
| Worker crash                     | Low        | Critical | Heartbeat + auto-restart     |
| GTM blocked on APIs              | High       | High     | Prioritize S3 by Day 4       |

---

## Appendix: File Locations

| Purpose            | Path                                        |
| ------------------ | ------------------------------------------- |
| Agent Orchestrator | `src/lib/agents/orchestrator.ts`            |
| Sequence Engineer  | `src/lib/agents/sequence-engineer-agent.ts` |
| Content Agent      | `src/lib/agents/content-purposing-agent.ts` |
| SendGrid Client    | `src/lib/sendgrid.ts`                       |
| Queue Jobs         | `src/lib/queue/jobs/*.ts`                   |
| Workers            | `src/lib/queue/workers.ts`                  |
| Agent APIs         | `src/app/api/agents/**/*.ts`                |
| Tests              | `tests/agents/*.test.ts`                    |
