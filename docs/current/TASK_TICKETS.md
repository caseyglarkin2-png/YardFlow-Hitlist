# YardFlow Hitlist - Task Tickets

> **Manifest 2026 Launch Tasks**  
> **Format**: Atomic, Committable, Testable  
> **Last Updated**: February 1, 2026

---

## How to Use This Document

Each task follows this format:

````
### [SPRINT].[TASK_NUM]: [Title]

**ID**: [Unique identifier]
**Sprint**: [Parent sprint]
**Estimate**: [Time in minutes]
**Priority**: [P0/P1/P2]
**Status**: [ ] Not Started | [~] In Progress | [x] Complete

**Files**:
- `path/to/file.ts` (action: CREATE/UPDATE/DELETE)

**Description**:
[What needs to be done]

**Implementation**:
[Code snippets or steps]

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

**Test Validation**:
```bash
[Command to validate]
````

**Depends On**: [Task IDs or None]
**Blocks**: [Task IDs or None]

````

---

# Sprint S0: Foundation & Test Infrastructure

## S0.1: Fix Test Environment Configuration

**ID**: `S0.1-TEST-ENV`
**Sprint**: S0
**Estimate**: 30 min
**Priority**: P0
**Status**: [ ] Not Started

**Files**:
- `eventops/.env.test` (CREATE)
- `eventops/vitest.config.ts` (UPDATE)

**Description**:
Create test environment file with mock secrets to prevent 401 errors in integration tests.

**Implementation**:
```bash
# .env.test
SERVICE_TO_SERVICE_SECRET=test-s2s-secret-for-testing
CRON_SECRET=test-cron-secret
DATABASE_URL=postgresql://test@localhost:5432/test
REDIS_URL=redis://localhost:6379
````

```typescript
// vitest.config.ts - add env file loading
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig({
  test: {
    env: loadEnv("test", process.cwd(), ""),
  },
});
```

**Acceptance Criteria**:

- [ ] `.env.test` file exists with all required test secrets
- [ ] `vitest.config.ts` loads test environment
- [ ] Integration tests no longer get 401 for missing secrets

**Test Validation**:

```bash
cd eventops && npm run test:integration 2>&1 | grep -v "401"
```

**Depends On**: None  
**Blocks**: S0.2, S1.5, S1.6

---

## S0.2: Add Integration Test Skip Logic

**ID**: `S0.2-TEST-SKIP`  
**Sprint**: S0  
**Estimate**: 30 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/tests/integration/s2s-auth.test.ts` (UPDATE)

**Description**:
Add logic to skip network-dependent tests when server is unavailable.

**Implementation**:

```typescript
// At top of test file
let serverAvailable = false;

beforeAll(async () => {
  try {
    const res = await fetch("http://localhost:3000/api/health", {
      signal: AbortSignal.timeout(2000),
    });
    serverAvailable = res.ok;
  } catch {
    console.log("Server not available, skipping network tests");
    serverAvailable = false;
  }
});

// In each network test
it.skipIf(!serverAvailable)("should connect to server", async () => {
  // test code
});
```

**Acceptance Criteria**:

- [ ] Tests skip gracefully when server unavailable
- [ ] Skip message logged clearly
- [ ] Tests run when server is available

**Test Validation**:

```bash
# With server down
cd eventops && npm run test:integration
# Should show "skipped" for network tests

# With server up
npm run dev & npm run test:integration
# All tests should run
```

**Depends On**: S0.1  
**Blocks**: S3.5

---

## S0.3: Verify Production Health & SendGrid

**ID**: `S0.3-VERIFY-PROD`  
**Sprint**: S0  
**Estimate**: 30 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/scripts/test-sendgrid.ts` (CREATE)

**Description**:
Create script to verify SendGrid is working and document baseline metrics.

**Implementation**:

```typescript
// scripts/test-sendgrid.ts
import { sendEmail } from "@/lib/sendgrid";

async function testSendGrid() {
  const result = await sendEmail({
    to: "test@example.com", // Replace with real test email
    subject: "YardFlow SendGrid Test",
    htmlBody: "<h1>Test</h1><p>SendGrid is working!</p>",
  });

  if (result.success) {
    console.log("✅ Email sent successfully");
    console.log("Message ID:", result.messageId);
  } else {
    console.error("❌ Email failed:", result.error);
    process.exit(1);
  }
}

testSendGrid();
```

**Acceptance Criteria**:

- [ ] Script executes without error
- [ ] Test email received in inbox
- [ ] Production health returns 200

**Test Validation**:

```bash
# Verify production health
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq .status
# Should output: "healthy"

# Test SendGrid
cd eventops && npx tsx scripts/test-sendgrid.ts
```

**Depends On**: None  
**Blocks**: S2.1

---

## S0.4: Create Test Fixtures Directory

**ID**: `S0.4-FIXTURES`  
**Sprint**: S0  
**Estimate**: 45 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/tests/agents/fixtures/mock-account.ts` (UPDATE)
- `eventops/tests/agents/fixtures/mock-prisma.ts` (CREATE)

**Description**:
Create comprehensive test fixtures matching Prisma schema.

**Implementation**:

```typescript
// fixtures/mock-account.ts
import type { target_accounts, people, company_dossiers } from "@prisma/client";

export const mockAccount: target_accounts = {
  id: "acc-test-001",
  name: "Acme Logistics",
  website: "https://acme-logistics.com",
  industry: "Logistics",
  icpScore: 85,
  tier: "Tier 1",
  employeeCount: 500,
  revenue: "$50M",
  hqCity: "Austin",
  hqState: "TX",
  eventId: "evt-manifest-2026",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
  // ... all required fields
};

export const mockContact: people = {
  id: "ppl-test-001",
  accountId: "acc-test-001",
  name: "John Smith",
  title: "VP Operations",
  email: "john@acme-logistics.com",
  tier: "Tier 1",
  score: 90,
  isExecOps: true,
  // ... all required fields
};

export const mockDossier: company_dossiers = {
  id: "dos-test-001",
  accountId: "acc-test-001",
  companyOverview: "Acme Logistics is a mid-size 3PL serving the Southwest...",
  keyPainPoints: "Manual yard scheduling, dock congestion",
  recentNews: "Expanded to 5 new facilities in Q4",
  // ... all required fields
};
```

```typescript
// fixtures/mock-prisma.ts
import { vi } from "vitest";

export const createMockPrisma = () => ({
  agent_tasks: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  target_accounts: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  people: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  // ... other models
});
```

**Acceptance Criteria**:

- [ ] All fixtures match Prisma schema types (no TS errors)
- [ ] Fixtures can be imported in tests
- [ ] mockPrisma provides consistent mocking

**Test Validation**:

```bash
cd eventops && npx tsc --noEmit tests/agents/fixtures/*.ts
# Should have no errors
```

**Depends On**: None  
**Blocks**: S1.5, S1.6, S1.7, S1.8

---

## S0.5: Audit Existing Agent API Endpoints

**ID**: `S0.5-API-AUDIT`  
**Sprint**: S0  
**Estimate**: 30 min  
**Priority**: P1  
**Status**: [ ] Not Started

**Files**:

- Documentation only

**Description**:
Document existing agent APIs to prevent duplicate work.

**Implementation**:
Manual verification of:

- `/api/agents/trigger` - POST triggers agent jobs ✅ EXISTS
- `/api/agents/workflow/[id]` - GET status, POST retry ✅ EXISTS
- `/api/agents/status` - Verify functionality
- `/api/agents/monitor` - Verify functionality
- `/api/agents/control` - Verify functionality

**Acceptance Criteria**:

- [ ] All agent endpoints documented
- [ ] Each endpoint tested with curl
- [ ] Status noted (complete/partial/placeholder)

**Test Validation**:

```bash
# Test each endpoint
for path in trigger workflow/test status monitor control; do
  curl -s -o /dev/null -w "%{http_code}" \
    -H "x-service-key: test" \
    http://localhost:3000/api/agents/$path
done
```

**Depends On**: None  
**Blocks**: S3.1

---

# Sprint S1: Core Agent Hardening

## S1.1: Verify getWorkflowStatus Implementation

**ID**: `S1.1-WORKFLOW-STATUS`  
**Sprint**: S1  
**Estimate**: 45 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/src/lib/agents/orchestrator.ts` (UPDATE)

**Description**:
Verify and fix the getWorkflowStatus method to correctly query database.

**Implementation**:

```typescript
async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
  const rootTask = await prisma.agent_tasks.findUnique({
    where: { id: workflowId },
    include: {
      childTasks: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!rootTask) {
    return { found: false };
  }

  const tasks = rootTask.childTasks;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const failed = tasks.filter(t => t.status === 'failed').length;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    found: true,
    id: workflowId,
    status: this.deriveStatus(rootTask, tasks),
    progress,
    completedSteps: completed,
    failedSteps: failed,
    totalSteps: total,
    tasks: tasks.map(t => ({
      id: t.id,
      agentType: t.agentType,
      status: t.status,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      errorMessage: t.errorMessage,
    })),
    startedAt: rootTask.startedAt,
    completedAt: rootTask.completedAt,
  };
}
```

**Acceptance Criteria**:

- [ ] Method queries agent_tasks correctly
- [ ] Progress calculated from child tasks
- [ ] All task statuses included in response

**Test Validation**:

```typescript
// In orchestrator.test.ts
it("should return correct workflow status", async () => {
  const status = await orchestrator.getWorkflowStatus("test-workflow");
  expect(status.found).toBe(true);
  expect(status.progress).toBeGreaterThanOrEqual(0);
});
```

**Depends On**: S0.1  
**Blocks**: S1.2

---

## S1.2: Verify Workflow Status API

**ID**: `S1.2-WORKFLOW-API`  
**Sprint**: S1  
**Estimate**: 30 min  
**Priority**: P0  
**Status**: [x] Complete (already exists)

**Files**:

- `eventops/src/app/api/agents/workflow/[workflowId]/route.ts` (EXISTS)

**Description**:
Verify existing API works correctly.

**Acceptance Criteria**:

- [ ] GET returns workflow status
- [ ] POST retries failed task
- [ ] 404 for non-existent workflow
- [ ] 401 without auth

**Test Validation**:

```bash
# Test with auth
curl -H "x-service-key: $S2S_SECRET" \
  http://localhost:3000/api/agents/workflow/test-123
```

**Depends On**: S1.1  
**Blocks**: S3.2

---

## S1.3: Fix Orchestrator eventId TODO

**ID**: `S1.3-EVENTID-FIX`  
**Sprint**: S1  
**Estimate**: 20 min  
**Priority**: P1  
**Status**: [ ] Not Started

**Files**:

- `eventops/src/lib/agents/orchestrator.ts` (UPDATE)

**Description**:
Replace placeholder eventId with proper event lookup.

**Implementation**:

```typescript
// Around line 95, replace:
// eventId: params.accountId, // TODO: Get proper eventId

// With:
const targetAccount = params.targetAccounts?.[0]
  ? await prisma.target_accounts.findUnique({
      where: { id: params.targetAccounts[0] },
      select: { eventId: true },
    })
  : null;
const eventId = params.eventId || targetAccount?.eventId || "manifest-2026";
```

**Acceptance Criteria**:

- [ ] eventId comes from target account when available
- [ ] Fallback to params.eventId
- [ ] Default to 'manifest-2026' as last resort

**Test Validation**:

```typescript
it("should use correct eventId from target account", async () => {
  const result = await orchestrator.runFullCampaign({
    targetAccounts: ["acc-with-event"],
    campaignType: "booth-outreach",
  });
  expect(result.eventId).not.toBe("acc-with-event");
});
```

**Depends On**: None  
**Blocks**: None

---

## S1.4: Add Prospecting Output Propagation

**ID**: `S1.4-PROSPECTING-OUTPUT`  
**Sprint**: S1  
**Estimate**: 45 min  
**Priority**: P1  
**Status**: [ ] Not Started

**Files**:

- `eventops/src/lib/agents/orchestrator.ts` (UPDATE)

**Description**:
After prospecting completes, query and use discovered accounts.

**Implementation**:

```typescript
// After prospecting task completes (around line 165)
if (prospectingTask.status === "completed") {
  // Query recently imported accounts
  const discovered = await prisma.target_accounts.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 60000) }, // Last minute
      eventId: params.eventId,
    },
    select: { id: true },
    take: 20,
  });

  const discoveredIds = discovered.map((a) => a.id);
  logger.info("Discovered accounts from prospecting", {
    count: discoveredIds.length,
  });

  // Update params for next steps
  targetAccounts.push(...discoveredIds);
}
```

**Acceptance Criteria**:

- [ ] Discovered accounts added to workflow
- [ ] Research runs on discovered accounts
- [ ] Empty discovery doesn't crash

**Test Validation**:

```typescript
it("should continue with discovered accounts", async () => {
  const result = await orchestrator.runFullCampaign({
    eventId: "test-event",
    campaignType: "pre-event",
  });
  expect(
    result.tasks.filter((t) => t.agentType === "research").length,
  ).toBeGreaterThan(0);
});
```

**Depends On**: None  
**Blocks**: S1.9

---

## S1.5: Orchestrator Unit Tests - Core (3 tests)

**ID**: `S1.5-ORCH-TESTS-CORE`  
**Sprint**: S1  
**Estimate**: 45 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/tests/agents/orchestrator.test.ts` (UPDATE)

**Description**:
Implement 3 critical tests for orchestrator.

**Tests**:

```typescript
describe("AgentOrchestrator", () => {
  it("should create root task for workflow", async () => {
    const result = await orchestrator.runFullCampaign({
      eventId: "test-event",
      campaignType: "booth-outreach",
    });
    expect(agentStateManager.createTask).toHaveBeenCalled();
    expect(result.id).toBeDefined();
  });

  it("should create child tasks for each agent step", async () => {
    const result = await orchestrator.runFullCampaign({
      eventId: "test-event",
      targetAccounts: ["acc-1"],
      campaignType: "booth-outreach",
    });
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.tasks.some((t) => t.agentType === "research")).toBe(true);
  });

  it("should continue when non-critical agent fails", async () => {
    // Mock socials agent to fail
    vi.mocked(SocialsAgent.prototype.run).mockRejectedValue(
      new Error("API error"),
    );

    const result = await orchestrator.runFullCampaign({
      eventId: "test-event",
      campaignType: "booth-outreach",
    });
    // Workflow should still complete
    expect(result.status).not.toBe("failed");
  });
});
```

**Acceptance Criteria**:

- [ ] All 3 tests pass
- [ ] Tests use proper mocking
- [ ] No actual API calls made

**Test Validation**:

```bash
npm run test:agents -- --grep "AgentOrchestrator" --run
# 3 tests should pass
```

**Depends On**: S0.1, S0.4  
**Blocks**: S1.9

---

## S1.6: Orchestrator Unit Tests - Retry (2 tests)

**ID**: `S1.6-ORCH-TESTS-RETRY`  
**Sprint**: S1  
**Estimate**: 45 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/tests/agents/orchestrator.test.ts` (UPDATE)

**Description**:
Implement 2 tests for status and retry functionality.

**Tests**:

```typescript
describe("getWorkflowStatus", () => {
  it("should return correct progress percentage", async () => {
    // Mock 2 completed, 1 in progress, 1 pending out of 4
    vi.mocked(prisma.agent_tasks.findUnique).mockResolvedValue({
      id: "workflow-1",
      childTasks: [
        { id: "1", status: "completed" },
        { id: "2", status: "completed" },
        { id: "3", status: "in_progress" },
        { id: "4", status: "pending" },
      ],
    });

    const status = await orchestrator.getWorkflowStatus("workflow-1");
    expect(status.progress).toBe(50); // 2/4 = 50%
  });
});

describe("retryFailedStep", () => {
  it("should increment retry count and reset status", async () => {
    const result = await orchestrator.retryFailedStep(
      "workflow-1",
      "task-failed",
    );

    expect(prisma.agent_tasks.update).toHaveBeenCalledWith({
      where: { id: "task-failed" },
      data: expect.objectContaining({
        status: "pending",
        retryCount: expect.any(Object), // increment
      }),
    });
  });
});
```

**Acceptance Criteria**:

- [ ] Both tests pass
- [ ] Progress calculation correct
- [ ] Retry logic increments counter

**Test Validation**:

```bash
npm run test:agents -- --grep "retry|progress" --run
# 2 tests should pass
```

**Depends On**: S0.1, S0.4  
**Blocks**: S1.9

---

## S1.7: Research Agent Tests (3 tests)

**ID**: `S1.7-RESEARCH-TESTS`  
**Sprint**: S1  
**Estimate**: 60 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/tests/agents/research.test.ts` (UPDATE)

**Description**:
Implement 3 critical tests for research agent.

**Tests**:

```typescript
describe("ResearchAgent", () => {
  it("should call OpenAI for dossier generation", async () => {
    const agent = new ResearchAgent();
    await agent.generateDossier({ accountId: "acc-1" });

    // Verify OpenAI was called
    expect(openai.chat.completions.create).toHaveBeenCalled();
  });

  it("should persist result to company_dossiers table", async () => {
    const agent = new ResearchAgent();
    await agent.generateDossier({ accountId: "acc-1" });

    expect(prisma.company_dossiers.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: "acc-1" },
      }),
    );
  });

  it("should return cached result on second call", async () => {
    // First call
    await agent.generateDossier({ accountId: "acc-1" });
    // Second call
    await agent.generateDossier({ accountId: "acc-1" });

    // OpenAI should only be called once (cached)
    expect(openai.chat.completions.create).toHaveBeenCalledTimes(1);
  });
});
```

**Acceptance Criteria**:

- [ ] All 3 tests pass
- [ ] OpenAI properly mocked
- [ ] Cache behavior verified

**Test Validation**:

```bash
npm run test:agents -- --grep "ResearchAgent" --run
# 3 tests should pass
```

**Depends On**: S0.4  
**Blocks**: S1.9

---

## S1.8: Sequence Agent Tests (3 tests)

**ID**: `S1.8-SEQUENCE-TESTS`  
**Sprint**: S1  
**Estimate**: 60 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/tests/agents/sequence.test.ts` (UPDATE)

**Description**:
Implement 3 critical tests for sequence engineer.

**Tests**:

```typescript
describe("SequenceEngineerAgent", () => {
  it("should design sequence with valid blueprint", async () => {
    const agent = new SequenceEngineerAgent();
    const blueprint = await agent.designSequence({
      personId: "ppl-1",
      campaignGoal: "meeting",
    });

    expect(blueprint.name).toBeDefined();
    expect(blueprint.steps.length).toBeGreaterThan(0);
    expect(blueprint.steps[0].channel).toBeDefined();
  });

  it("should persist sequence to database", async () => {
    const agent = new SequenceEngineerAgent();
    const sequenceId = await agent.createSequenceFromBlueprint({
      name: "Test Sequence",
      steps: [{ channel: "EMAIL", subject: "Hi" }],
    });

    expect(prisma.sequences.create).toHaveBeenCalled();
    expect(sequenceId).toMatch(/^seq-/);
  });

  it("should adjust timing based on urgency", async () => {
    const agent = new SequenceEngineerAgent();

    const lowUrgency = await agent.designSequence({
      personId: "ppl-1",
      campaignGoal: "relationship",
      urgency: "low",
    });

    const highUrgency = await agent.designSequence({
      personId: "ppl-1",
      campaignGoal: "meeting",
      urgency: "high",
    });

    // High urgency should have shorter delays
    expect(highUrgency.steps[0].delayDays).toBeLessThan(
      lowUrgency.steps[0].delayDays,
    );
  });
});
```

**Acceptance Criteria**:

- [ ] All 3 tests pass
- [ ] Blueprint structure validated
- [ ] Urgency affects timing

**Test Validation**:

```bash
npm run test:agents -- --grep "SequenceEngineer" --run
# 3 tests should pass
```

**Depends On**: S0.4  
**Blocks**: S1.9

---

## S1.9: E2E Agent Flow Test Script

**ID**: `S1.9-E2E-SCRIPT`  
**Sprint**: S1  
**Estimate**: 45 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/scripts/test-agent-workflow.ts` (CREATE)

**Description**:
Create script that runs full campaign workflow.

**Implementation**:

```typescript
// scripts/test-agent-workflow.ts
import { AgentOrchestrator } from "@/lib/agents/orchestrator";
import { prisma } from "@/lib/db";

async function testAgentWorkflow() {
  console.log("🚀 Starting agent workflow test...\n");

  const orchestrator = new AgentOrchestrator();

  try {
    const result = await orchestrator.runFullCampaign({
      eventId: "manifest-2026",
      targetAccounts: ["test-account"],
      campaignType: "booth-outreach",
    });

    console.log("✅ Workflow completed!");
    console.log("   ID:", result.id);
    console.log("   Status:", result.status);
    console.log("   Tasks:", result.tasks.length);

    // Verify database records
    const rootTask = await prisma.agent_tasks.findUnique({
      where: { id: result.id },
    });
    console.log("   Root task exists:", !!rootTask);

    if (result.status === "completed") {
      console.log("\n✅ All steps completed successfully!");
      process.exit(0);
    } else {
      console.log("\n⚠️ Workflow completed with status:", result.status);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Workflow failed:", error);
    process.exit(1);
  }
}

testAgentWorkflow();
```

**Acceptance Criteria**:

- [ ] Script runs without error
- [ ] All workflow steps logged
- [ ] Exit 0 on success, 1 on failure

**Test Validation**:

```bash
cd eventops && npx tsx scripts/test-agent-workflow.ts
# Should exit 0 with success message
```

**Depends On**: S1.1, S1.5, S1.6, S1.7, S1.8  
**Blocks**: S1.10

---

## S1.10: E2E Agent Flow Validation

**ID**: `S1.10-E2E-VALIDATE`  
**Sprint**: S1  
**Estimate**: 45 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- None (manual validation)

**Description**:
Run E2E script and verify database records.

**Steps**:

1. Start local dev server
2. Run S1.9 script
3. Verify database records:
   - Root task in agent_tasks
   - Child tasks created
   - Sequence in sequences table
4. Document any issues

**Acceptance Criteria**:

- [ ] Root task exists in agent_tasks
- [ ] Child tasks for each step
- [ ] Sequence created in sequences table
- [ ] No uncaught errors

**Test Validation**:

```bash
# Run script
npx tsx scripts/test-agent-workflow.ts

# Verify DB records
psql $DATABASE_URL -c "SELECT id, agentType, status FROM agent_tasks ORDER BY createdAt DESC LIMIT 10;"
```

**Depends On**: S1.9  
**Blocks**: S2.\*

---

# Sprint S2: Email Pipeline Completion

## S2.1: Verify SendGrid Integration

**ID**: `S2.1-SENDGRID-VERIFY`  
**Sprint**: S2  
**Estimate**: 30 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- Uses `scripts/test-sendgrid.ts` from S0.3

**Description**:
Confirm SendGrid sends emails successfully.

**Acceptance Criteria**:

- [ ] Test email received
- [ ] No errors in SendGrid dashboard
- [ ] Message ID returned

**Test Validation**:

```bash
npx tsx scripts/test-sendgrid.ts
# Check inbox for test email
```

**Depends On**: S0.3  
**Blocks**: S2.2

---

## S2.2: Create Email Send Queue Job

**ID**: `S2.2-EMAIL-JOB`  
**Sprint**: S2  
**Estimate**: 60 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/src/lib/queue/jobs/email-send.ts` (CREATE)

**Description**:
Create BullMQ job processor for sending emails.

**Implementation**:

```typescript
// src/lib/queue/jobs/email-send.ts
import { Job } from "bullmq";
import { sendEmail } from "@/lib/sendgrid";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface EmailSendJobData {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  personId?: string;
  outreachId?: string;
  sequenceEnrollmentId?: string;
  trackingEnabled?: boolean;
}

export async function processEmailSend(
  job: Job<EmailSendJobData>,
): Promise<{ success: boolean; messageId?: string }> {
  const {
    to,
    toName,
    subject,
    html,
    outreachId,
    trackingEnabled = true,
  } = job.data;

  logger.info("Processing email send job", { jobId: job.id, to, subject });

  try {
    const result = await sendEmail({
      to,
      toName,
      subject,
      htmlBody: html,
      outreachId: trackingEnabled ? outreachId : undefined,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    // Log engagement
    if (outreachId) {
      await prisma.outreach.update({
        where: { id: outreachId },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });
    }

    logger.info("Email sent successfully", { messageId: result.messageId });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error("Email send failed", { error, jobId: job.id });
    throw error; // Let BullMQ handle retry
  }
}
```

**Acceptance Criteria**:

- [ ] Job interface matches sendgrid.ts
- [ ] Outreach status updated on send
- [ ] Errors thrown for BullMQ retry

**Test Validation**:

```typescript
it("should process email and update outreach", async () => {
  await processEmailSend({ data: mockEmailData });
  expect(prisma.outreach.update).toHaveBeenCalled();
});
```

**Depends On**: S2.1  
**Blocks**: S2.3, S2.4

---

## S2.3: Register Email Queue Worker

**ID**: `S2.3-EMAIL-WORKER`  
**Sprint**: S2  
**Estimate**: 30 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/src/lib/queue/workers.ts` (UPDATE)

**Description**:
Register email send job processor with BullMQ worker.

**Implementation**:

```typescript
// In workers.ts, add:
import { processEmailSend } from "./jobs/email-send";

function getEmailSendWorker(): Worker {
  if (!emailSendWorker) {
    emailSendWorker = new Worker(
      "emails",
      async (job: Job) => {
        return await processEmailSend(job);
      },
      {
        connection: getRedisConnection(),
        concurrency: 5,
        limiter: {
          max: 100,
          duration: 60000, // 100 per minute
        },
      },
    );

    emailSendWorker.on("completed", (job) => {
      logger.info("Email job completed", { jobId: job.id });
    });

    emailSendWorker.on("failed", (job, err) => {
      logger.error("Email job failed", { jobId: job?.id, error: err.message });
    });
  }
  return emailSendWorker;
}
```

**Acceptance Criteria**:

- [ ] Worker starts without error
- [ ] Rate limiting configured (100/min)
- [ ] Logs on complete/fail

**Test Validation**:

```bash
npm run worker
# Should log: "Email worker started"
```

**Depends On**: S2.2  
**Blocks**: S2.4

---

## S2.4: Wire Sequence Step to Email Queue

**ID**: `S2.4-SEQUENCE-EMAIL`  
**Sprint**: S2  
**Estimate**: 60 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/src/lib/queue/jobs/sequence-step.ts` (UPDATE)

**Description**:
Queue email when sequence step type is EMAIL.

**Implementation**:

```typescript
// In processSequenceStepJob
if (step.channelType === "EMAIL") {
  const emailQueue = await getEmailQueue();

  await emailQueue.add("send-email", {
    to: enrollment.person.email,
    toName: enrollment.person.name,
    subject: step.subject,
    html: step.content,
    personId: enrollment.personId,
    outreachId: outreach.id,
    sequenceEnrollmentId: enrollment.id,
  });

  logger.info("Email queued for sequence step", {
    enrollmentId: enrollment.id,
    step: step.order,
  });
}
```

**Acceptance Criteria**:

- [ ] EMAIL steps queue email job
- [ ] All required data passed to job
- [ ] Non-EMAIL steps unaffected

**Test Validation**:

```typescript
it("should queue email for EMAIL sequence steps", async () => {
  await processSequenceStepJob({
    data: { enrollmentId: "enr-1", stepNumber: 1 },
  });
  const jobs = await emailQueue.getJobs(["waiting"]);
  expect(jobs.some((j) => j.data.sequenceEnrollmentId === "enr-1")).toBe(true);
});
```

**Depends On**: S2.2, S2.3  
**Blocks**: S2.9

---

## S2.5: Verify Email Open Tracking

**ID**: `S2.5-OPEN-TRACK`  
**Sprint**: S2  
**Estimate**: 45 min  
**Priority**: P1  
**Status**: [ ] Not Started

**Files**:

- `eventops/src/app/api/tracking/email/open/route.ts` (VERIFY)
- `eventops/src/lib/sendgrid.ts` (VERIFY)

**Description**:
Verify tracking pixel injection and open tracking endpoint.

**Acceptance Criteria**:

- [ ] Tracking pixel added to email HTML
- [ ] Open endpoint returns 1x1 gif
- [ ] outreach.openedAt updated
- [ ] email_engagement row created

**Test Validation**:

```bash
# Test tracking pixel endpoint
curl -I http://localhost:3000/api/tracking/email/open?id=test-123
# Should return image/gif content-type
```

**Depends On**: S2.2  
**Blocks**: S2.9

---

## S2.6: Verify Email Click Tracking

**ID**: `S2.6-CLICK-TRACK`  
**Sprint**: S2  
**Estimate**: 45 min  
**Priority**: P1  
**Status**: [ ] Not Started

**Files**:

- `eventops/src/app/api/tracking/email/click/route.ts` (VERIFY)
- `eventops/src/lib/sendgrid.ts` (VERIFY)

**Description**:
Verify link wrapping and click tracking endpoint.

**Acceptance Criteria**:

- [ ] Links wrapped with tracking URL
- [ ] Click endpoint redirects to original URL
- [ ] Click event logged in database

**Test Validation**:

```bash
# Test click tracking redirect
curl -I "http://localhost:3000/api/tracking/email/click?id=test&url=https://example.com"
# Should return 302 redirect
```

**Depends On**: S2.2  
**Blocks**: S2.9

---

## S2.7: Wire SendGrid Webhooks to Database

**ID**: `S2.7-WEBHOOKS`  
**Sprint**: S2  
**Estimate**: 45 min  
**Priority**: P1  
**Status**: [ ] Not Started

**Files**:

- `eventops/src/app/api/webhooks/sendgrid/route.ts` (UPDATE)

**Description**:
Ensure webhook updates database on email events.

**Implementation**:

```typescript
// Handle delivery/bounce/spam events
switch (event.event) {
  case "delivered":
    await prisma.outreach.update({
      where: { id: trackingId },
      data: { status: "SENT", sentAt: new Date() },
    });
    break;
  case "bounce":
    await prisma.outreach.update({
      where: { id: trackingId },
      data: { status: "BOUNCED", bouncedAt: new Date() },
    });
    break;
  case "spamreport":
    await prisma.outreach.update({
      where: { id: trackingId },
      data: { status: "SPAM" },
    });
    break;
}
```

**Acceptance Criteria**:

- [ ] Delivered → status SENT
- [ ] Bounce → status BOUNCED
- [ ] Spam → status SPAM

**Test Validation**:

```typescript
it("should update status on webhook", async () => {
  await webhookHandler({ event: "bounce", tracking_id: "out-1" });
  expect(prisma.outreach.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: { status: "BOUNCED" } }),
  );
});
```

**Depends On**: S2.2  
**Blocks**: S2.9

---

## S2.8: Email Stats API Enhancement

**ID**: `S2.8-EMAIL-STATS`  
**Sprint**: S2  
**Estimate**: 30 min  
**Priority**: P2  
**Status**: [ ] Not Started

**Files**:

- `eventops/src/app/api/email/stats/route.ts` (UPDATE)

**Description**:
Add today's metrics and queue depth to stats.

**Implementation**:

```typescript
// Add to existing stats response
const today = new Date();
today.setHours(0, 0, 0, 0);

const todayStats = await prisma.outreach.groupBy({
  by: ["status"],
  where: {
    sentAt: { gte: today },
    channel: "EMAIL",
  },
  _count: true,
});

const queueDepth = await emailQueue.getJobCounts();

return {
  today: {
    sent: todayStats.find((s) => s.status === "SENT")?._count || 0,
    opened: todayStats.find((s) => s.status === "OPENED")?._count || 0,
    clicked: todayStats.find((s) => s.status === "CLICKED")?._count || 0,
  },
  bounceRate: calculateBounceRate(todayStats),
  queueDepth: queueDepth.waiting + queueDepth.active,
};
```

**Acceptance Criteria**:

- [ ] Today's sent/opened/clicked counts
- [ ] Bounce rate calculated
- [ ] Queue depth included

**Test Validation**:

```bash
curl http://localhost:3000/api/email/stats
# Should include today, bounceRate, queueDepth
```

**Depends On**: S2.2  
**Blocks**: None

---

## S2.9: Email Pipeline Integration Test

**ID**: `S2.9-EMAIL-INTEGRATION`  
**Sprint**: S2  
**Estimate**: 60 min  
**Priority**: P0  
**Status**: [ ] Not Started

**Files**:

- `eventops/tests/integration/email-pipeline.test.ts` (CREATE)

**Description**:
Integration test for full email pipeline.

**Tests**:

```typescript
describe("Email Pipeline", () => {
  it("should queue email from sequence step", async () => {
    // Enroll contact, advance to EMAIL step
    // Verify email job queued
  });

  it("should process email and log engagement", async () => {
    // Queue email job
    // Process with mocked SendGrid
    // Verify outreach updated
  });

  it("should handle SendGrid errors gracefully", async () => {
    // Mock SendGrid failure
    // Verify job fails and can be retried
  });
});
```

**Acceptance Criteria**:

- [ ] All 3 tests pass
- [ ] Uses mocked SendGrid
- [ ] Verifies DB updates

**Test Validation**:

```bash
npm run test:integration -- --grep "Email Pipeline" --run
# 3 tests should pass
```

**Depends On**: S2.4, S2.5, S2.6, S2.7  
**Blocks**: S6.3

---

# Sprint S3-S6: See MANIFEST_2026_SPRINT_PLAN.md

The remaining sprints (S3: GTM Integration, S4: Content Polish, S5: Hardening, S6: Pre-Event) follow the same format. Refer to the main sprint plan for details.

---

## Task Status Legend

| Symbol | Status      |
| ------ | ----------- |
| [ ]    | Not Started |
| [~]    | In Progress |
| [x]    | Complete    |
| [!]    | Blocked     |

## Priority Legend

| Priority | Meaning                                     |
| -------- | ------------------------------------------- |
| P0       | BLOCKER - Must complete before event        |
| P1       | IMPORTANT - Should complete if time permits |
| P2       | NICE TO HAVE - Can defer to post-event      |

---

**Document End**
