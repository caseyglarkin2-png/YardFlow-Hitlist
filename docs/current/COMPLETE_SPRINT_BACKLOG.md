# YardFlow Platform: Complete Sprint Backlog v2

> **Status**: ACTIVE  
> **Created**: January 31, 2026  
> **Last Reviewed**: TPM Review Applied  
> **Philosophy**: Ship Fast, Ship Often - Every task atomic (60-120 min), testable, committable  
> **Architecture**: Two-Repo Platform (Railway + Vercel)

---

## ⚠️ TPM Review Corrections Applied

| Issue Found                          | Resolution                            |
| ------------------------------------ | ------------------------------------- |
| `email_events` table doesn't exist   | Use existing `email_engagement` model |
| `npm run test:agents` script missing | Added S0.2 to create it               |
| `agent_tasks` missing self-relation  | Added S0.1 Prisma migration           |
| Tasks S1.8, S3.4, S4.3 too large     | Split into atomic subtasks            |
| GTM repo tasks not in this workspace | Created handoff documentation         |
| Test file structure missing          | Added S0.3 to scaffold tests          |

---

## Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USERS                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
           ┌───────────────────────┴───────────────────────┐
           ▼                                               ▼
┌─────────────────────┐                         ┌─────────────────────┐
│   GTM Frontend      │                         │   Direct Access     │
│   gtm-yard-flow     │                         │   yardflow-hitlist  │
│   (Vercel)          │                         │   (Railway)         │
│                     │                         │                     │
│   REPO: gtm-yardflow│                         │   REPO: YardFlow-   │
│                     │                         │         Hitlist     │
└─────────┬───────────┘                         └──────────┬──────────┘
          │                                                │
          │ S2S API Calls                                  │ Direct API
          │ x-service-key                                  │ NextAuth
          ▼                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   YardFlow-Hitlist Backend (Railway)                     │
│                                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │   Next.js    │ │  PostgreSQL  │ │    Redis     │ │   BullMQ     │   │
│  │   API (Web)  │ │  (Prisma 7)  │ │   (Queues)   │ │   (Worker)   │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Repository Map

| Repo               | Purpose                         | Deployed To | URL                                             |
| ------------------ | ------------------------------- | ----------- | ----------------------------------------------- |
| `YardFlow-Hitlist` | Backend API, Workers, Dashboard | Railway     | yardflow-hitlist-production-2f41.up.railway.app |
| `gtm-yardflow`     | GTM Frontend, Sales UI          | Vercel      | gtm-yard-flow.vercel.app                        |

---

## Sprint Overview

| Sprint | Name                          | Tasks | Est. Time | Demo                      |
| ------ | ----------------------------- | ----- | --------- | ------------------------- |
| **S0** | Infrastructure Setup          | 4     | 2 hours   | Test suite runs           |
| **S1** | Agent Orchestrator Completion | 10    | 8 hours   | Full campaign workflow    |
| **S2** | GTM Frontend Integration      | 7     | 5 hours   | GTM calls Railway API     |
| **S3** | Email & Outreach Pipeline     | 7     | 6 hours   | Emails tracked end-to-end |
| **S4** | Analytics & Reporting         | 6     | 5 hours   | Funnel dashboard          |
| **S5** | Production Hardening          | 8     | 6 hours   | Load test passes          |

**Total**: 42 tasks, ~32 hours of dev time

---

# Sprint S0: Infrastructure Setup (NEW)

> **Goal**: Fix foundational issues before feature work  
> **Estimate**: 2 hours  
> **Demo**: `npm run test:agents` runs successfully

## Tasks

### S0.1: Add agent_tasks Self-Relation

**Est**: 30 min | **Files**: `prisma/schema.prisma`

The `parentTaskId` field exists but has no Prisma relation, causing ORM queries to fail.

```prisma
model agent_tasks {
  id           String    @id @default(cuid())
  agentType    String
  status       String    @default("pending")
  inputData    Json
  outputData   Json?
  errorMessage String?   @db.Text
  accountId    String?
  contactId    String?
  parentTaskId String?
  retryCount   Int       @default(0)
  maxRetries   Int       @default(3)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  startedAt    DateTime?
  completedAt  DateTime?

  targetAccount target_accounts? @relation(fields: [accountId], references: [id], onDelete: Cascade)
  contact       people?          @relation(fields: [contactId], references: [id], onDelete: Cascade)

  // NEW: Self-relation for task hierarchy
  parentTask   agent_tasks?  @relation("TaskHierarchy", fields: [parentTaskId], references: [id])
  childTasks   agent_tasks[] @relation("TaskHierarchy")

  @@index([agentType, status])
  @@index([accountId])
  @@index([contactId])
  @@index([parentTaskId])
  @@index([status])
  @@index([createdAt])
}
```

**Validation**:

```bash
cd eventops && npx prisma migrate dev --name add_task_hierarchy
npx prisma generate
```

---

### S0.2: Add test:agents npm Script

**Est**: 15 min | **Files**: `package.json`

```json
{
  "scripts": {
    "test:agents": "vitest run --config vitest.config.ts tests/agents/"
  }
}
```

**Validation**:

```bash
npm run test:agents
# Should run (even if no tests exist yet, it should not error on missing script)
```

---

### S0.3: Create Test Directory Structure

**Est**: 30 min | **Files**: `tests/agents/`, `tests/integration/`

```
tests/
├── agents/
│   ├── prospecting.test.ts
│   ├── research.test.ts
│   ├── sequence.test.ts
│   ├── content.test.ts
│   ├── orchestrator.test.ts
│   └── fixtures/
│       └── mock-account.ts
├── integration/
│   ├── campaign-workflow.test.ts
│   └── s2s-auth.test.ts
└── smoke/
    └── (existing)
```

Create placeholder tests:

```typescript
// tests/agents/orchestrator.test.ts
import { describe, it, expect, vi } from "vitest";

describe("AgentOrchestrator", () => {
  it.todo("should run full campaign workflow");
  it.todo("should handle Step 3 (Sequence Design)");
  it.todo("should handle Step 4 (Content Creation)");
  it.todo("should handle Step 5 (Socials)");
  it.todo("should retry failed tasks");
});
```

**Validation**:

```bash
npm run test:agents
# Should show 5 pending tests
```

---

### S0.4: Create Test Fixtures

**Est**: 30 min | **Files**: `tests/agents/fixtures/`

```typescript
// tests/agents/fixtures/mock-account.ts
export const mockAccount = {
  id: "test-account-1",
  name: "Acme Logistics",
  website: "https://acme-logistics.com",
  industry: "Logistics",
  icpScore: 85,
};

export const mockContact = {
  id: "test-contact-1",
  name: "John Smith",
  title: "VP Operations",
  email: "john@acme-logistics.com",
  accountId: "test-account-1",
};

export const mockDossier = {
  id: "test-dossier-1",
  accountId: "test-account-1",
  companyOverview: "Acme Logistics is a mid-size 3PL...",
  recentNews: "Recently expanded to 5 new facilities",
  keyPainPoints: "Manual yard scheduling causing delays",
};
```

**Validation**:

```bash
# Import should work
npx tsx -e "import { mockAccount } from './tests/agents/fixtures/mock-account'; console.log(mockAccount.name);"
# Output: Acme Logistics
```

---

## S0 Sprint Demo

```bash
cd eventops

# 1. Migration applied
npx prisma migrate status
# Should show: "Database is up to date"

# 2. Test script exists
npm run test:agents
# Should run and show pending tests

# 3. Fixtures work
npx tsx -e "import('./tests/agents/fixtures/mock-account').then(m => console.log(m.mockAccount.name))"
# Output: Acme Logistics
```

---

# Sprint S1: Agent Orchestrator Completion

> **Goal**: Complete Steps 3-5 of runFullCampaign  
> **Estimate**: 8 hours  
> **Demo**: Full campaign workflow from prospect to content  
> **Blocked By**: S0 complete

## Current State

The orchestrator has 3 TODOs in `eventops/src/lib/agents/orchestrator.ts`:

| Step                     | Status     | Line |
| ------------------------ | ---------- | ---- |
| Step 1: Prospecting      | ✅ Working | ~120 |
| Step 2: Research         | ✅ Working | ~130 |
| Step 3: Sequence Design  | ❌ TODO    | ~141 |
| Step 4: Content Creation | ❌ TODO    | ~144 |
| Step 5: Socials          | ❌ TODO    | ~147 |

## Tasks

### S1.1: Implement Step 3 - Sequence Design

**Est**: 90 min | **Files**: `src/lib/agents/orchestrator.ts`

```typescript
// In runFullCampaign, replace TODO at Step 3:
case 'sequence_design':
  const sequenceAgent = new SequenceEngineerAgent();
  const sequenceResult = await sequenceAgent.execute({
    accountId: account.id,
    contactIds: contacts.map(c => c.id),
    dossier,
    campaignId: campaign.id,
  });

  if (!sequenceResult.success) {
    throw new Error(`Sequence design failed: ${sequenceResult.error}`);
  }

  // Store sequence in database
  const sequence = await prisma.sequences.create({
    data: {
      id: `seq-${Date.now()}`,
      campaignId: campaign.id,
      name: `${account.name} Outreach Sequence`,
      description: sequenceResult.data.description,
      steps: JSON.stringify(sequenceResult.data.steps),
      updatedAt: new Date(),
    }
  });

  stepOutputs.sequence = sequence;
  break;
```

**Validation**:

```typescript
// tests/agents/orchestrator.test.ts
it("should handle Step 3 (Sequence Design)", async () => {
  const mockSequenceAgent = vi.fn().mockResolvedValue({
    success: true,
    data: { description: "Test", steps: [] },
  });
  // ... test implementation
});
```

---

### S1.2: Implement Step 4 - Content Creation

**Est**: 90 min | **Files**: `src/lib/agents/orchestrator.ts`

```typescript
case 'content_creation':
  const contentAgent = new ContentPurposingAgent();
  const contentResult = await contentAgent.execute({
    accountId: account.id,
    dossier,
    sequence: stepOutputs.sequence,
    persona: contacts[0]?.title || 'Operations Executive',
  });

  if (!contentResult.success) {
    throw new Error(`Content creation failed: ${contentResult.error}`);
  }

  // Store templates
  for (const template of contentResult.data.templates) {
    await prisma.message_templates.create({
      data: {
        id: `tmpl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: template.name,
        channel: template.channel,
        subject: template.subject,
        template: template.body,
        updatedAt: new Date(),
      }
    });
  }

  stepOutputs.content = contentResult.data;
  break;
```

**Validation**: Unit test in `tests/agents/orchestrator.test.ts`

---

### S1.3: Implement Step 5 - Socials

**Est**: 60 min | **Files**: `src/lib/agents/orchestrator.ts`

```typescript
case 'socials':
  const socialsAgent = new SocialsAgent();
  const socialsResult = await socialsAgent.execute({
    accountId: account.id,
    dossier,
    content: stepOutputs.content,
    platforms: ['linkedin'], // Default to LinkedIn for B2B
  });

  if (!socialsResult.success) {
    logger.warn('Socials generation failed, continuing workflow', {
      error: socialsResult.error
    });
    // Non-critical - don't throw
  }

  stepOutputs.socials = socialsResult.data;
  break;
```

**Validation**: Unit test in `tests/agents/orchestrator.test.ts`

---

### S1.4: Add Parent-Child Task Queries

**Est**: 60 min | **Files**: `src/lib/agents/state-manager.ts`

```typescript
// Add to AgentStateManager class
async getTasksWithChildren(parentTaskId: string): Promise<AgentTask[]> {
  return prisma.agent_tasks.findMany({
    where: { parentTaskId },
    include: {
      childTasks: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

async getTaskTree(rootTaskId: string): Promise<TaskTree> {
  const root = await prisma.agent_tasks.findUnique({
    where: { id: rootTaskId },
    include: {
      childTasks: {
        include: {
          childTasks: true, // 2 levels deep
        }
      }
    }
  });

  return root;
}
```

**Validation**:

```bash
# Integration test
npm run test:agents -- --grep "task tree"
```

---

### S1.5: Add Workflow Retry Logic

**Est**: 60 min | **Files**: `src/lib/agents/orchestrator.ts`

```typescript
async retryFailedStep(workflowId: string): Promise<WorkflowResult> {
  const workflow = await prisma.agent_tasks.findUnique({
    where: { id: workflowId },
    include: { childTasks: true }
  });

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  // Find first failed task
  const failedTask = workflow.childTasks.find(t => t.status === 'failed');
  if (!failedTask) {
    throw new Error('No failed tasks to retry');
  }

  // Check retry limit
  if (failedTask.retryCount >= failedTask.maxRetries) {
    throw new Error(`Max retries (${failedTask.maxRetries}) exceeded`);
  }

  // Increment retry count and requeue
  await prisma.agent_tasks.update({
    where: { id: failedTask.id },
    data: {
      status: 'pending',
      retryCount: { increment: 1 },
      errorMessage: null,
    }
  });

  // Re-run from this step
  return this.resumeFromStep(workflowId, failedTask.agentType);
}
```

**Validation**:

```typescript
it("should retry failed tasks up to maxRetries", async () => {
  // Create task with retryCount: 2, maxRetries: 3
  // Call retryFailedStep
  // Verify retryCount is now 3
});
```

---

### S1.6: Implement getWorkflowStatus

**Est**: 45 min | **Files**: `src/lib/agents/orchestrator.ts`

Replace the TODO at line ~253:

```typescript
async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
  const workflow = await prisma.agent_tasks.findUnique({
    where: { id: workflowId },
    include: {
      childTasks: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!workflow) {
    return { found: false };
  }

  const steps = workflow.childTasks.map(task => ({
    step: task.agentType,
    status: task.status,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    error: task.errorMessage,
  }));

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length || 5; // Default 5 steps in full workflow

  return {
    found: true,
    workflowId,
    status: workflow.status,
    progress: Math.round((completedSteps / totalSteps) * 100),
    steps,
    startedAt: workflow.startedAt,
    completedAt: workflow.completedAt,
  };
}
```

**Validation**:

```bash
curl -s http://localhost:3000/api/agents/workflows/test-id/status | jq
```

---

### S1.7: Create Workflow Status API

**Est**: 45 min | **Files**: `src/app/api/agents/workflows/[id]/status/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AgentOrchestrator } from "@/lib/agents/orchestrator";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orchestrator = new AgentOrchestrator();
  const status = await orchestrator.getWorkflowStatus(params.id);

  if (!status.found) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  return NextResponse.json(status);
}
```

**Validation**:

```bash
# Must return workflow status
curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:3000/api/agents/workflows/test-id/status
```

---

### S1.8a: Add Real-Time Polling to Dashboard

**Est**: 45 min | **Files**: `src/components/agents/workflow-status.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';

interface WorkflowStatusProps {
  workflowId: string;
  pollInterval?: number;
}

export function WorkflowStatus({ workflowId, pollInterval = 3000 }: WorkflowStatusProps) {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/agents/workflows/${workflowId}/status`);
        if (!res.ok) throw new Error('Failed to fetch');
        setStatus(await res.json());
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [workflowId, pollInterval]);

  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!status) return <div>Loading...</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span>Progress: {status.progress}%</span>
        <div className="flex-1 bg-gray-200 rounded h-2">
          <div
            className="bg-blue-500 h-2 rounded"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

**Validation**: Visual inspection - progress bar updates every 3 seconds

---

### S1.8b: Add Task Tree Visualization

**Est**: 45 min | **Files**: `src/components/agents/task-tree.tsx`

```typescript
'use client';

interface TaskTreeProps {
  steps: WorkflowStep[];
}

const statusColors = {
  pending: 'bg-gray-400',
  in_progress: 'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
};

export function TaskTree({ steps }: TaskTreeProps) {
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${statusColors[step.status]}`} />
          <span className="capitalize">{step.step.replace('_', ' ')}</span>
          {step.error && (
            <span className="text-red-500 text-sm">{step.error}</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Validation**: Visual inspection - task tree shows colored status dots

---

### S1.8c: Add Retry Button for Failed Tasks

**Est**: 30 min | **Files**: `src/components/agents/retry-button.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface RetryButtonProps {
  workflowId: string;
  onRetry?: () => void;
}

export function RetryButton({ workflowId, onRetry }: RetryButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/workflows/${workflowId}/retry`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Retry failed');
      onRetry?.();
    } catch (e) {
      console.error('Retry error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleRetry} disabled={loading} variant="outline">
      {loading ? 'Retrying...' : 'Retry Failed Step'}
    </Button>
  );
}
```

**Validation**: Click retry button, verify API called

---

### S1.9: Integration Test - Full Campaign Workflow

**Est**: 90 min | **Files**: `tests/integration/campaign-workflow.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { AgentOrchestrator } from "@/lib/agents/orchestrator";

describe("Full Campaign Workflow", () => {
  let testAccountId: string;
  let testCampaignId: string;

  beforeAll(async () => {
    // Create test data
    const event = await prisma.events.create({
      /* ... */
    });
    const account = await prisma.target_accounts.create({
      /* ... */
    });
    testAccountId = account.id;
    // ... create campaign
  });

  afterAll(async () => {
    // Cleanup
    await prisma.agent_tasks.deleteMany({
      where: { accountId: testAccountId },
    });
    // ... cleanup
  });

  it("should run full workflow from prospecting to content", async () => {
    const orchestrator = new AgentOrchestrator();

    const result = await orchestrator.runFullCampaign({
      accountId: testAccountId,
      campaignId: testCampaignId,
    });

    expect(result.success).toBe(true);
    expect(result.stepsCompleted).toContain("prospecting");
    expect(result.stepsCompleted).toContain("research");
    expect(result.stepsCompleted).toContain("sequence_design");
    expect(result.stepsCompleted).toContain("content_creation");
    expect(result.stepsCompleted).toContain("socials");
  }, 60000); // 60s timeout for AI calls
});
```

**Validation**:

```bash
npm run test:agents -- --grep "Full Campaign"
```

---

## S1 Sprint Demo

```bash
cd eventops

# 1. Run a full campaign via API
curl -X POST http://localhost:3000/api/agents/campaign \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"accountId": "test-account", "campaignId": "test-campaign"}'

# 2. Check workflow status
curl http://localhost:3000/api/agents/workflows/{workflowId}/status

# 3. Verify all 5 steps completed
# Should see: prospecting, research, sequence_design, content_creation, socials
```

---

# Sprint S2: GTM Frontend Integration

> **Goal**: Connect gtm-yardflow (Vercel) to YardFlow-Hitlist (Railway)  
> **Estimate**: 5 hours  
> **Demo**: GTM frontend fetches accounts from Railway API  
> **Blocked By**: S0, S1 (partially)

## ⚠️ Cross-Repo Work

Tasks S2.1-S2.4 are in the **gtm-yardflow** repository. Options:

1. Clone gtm-yardflow into this workspace
2. Create GitHub issues for the GTM team
3. Work in both repos simultaneously

**Coordination Strategy**: Create `docs/current/GTM_INTEGRATION_HANDOFF.md` with exact steps.

## Tasks

### S2.0: Verify S2S Auth on Railway (This Repo)

**Est**: 30 min | **Files**: `tests/integration/s2s-auth.test.ts`

Verify the Railway backend accepts S2S requests correctly.

```typescript
import { describe, it, expect } from "vitest";

describe("S2S Authentication", () => {
  const RAILWAY_URL = process.env.TEST_RAILWAY_URL || "http://localhost:3000";
  const SERVICE_SECRET = process.env.SERVICE_TO_SERVICE_SECRET;

  it("should accept valid S2S key", async () => {
    const res = await fetch(`${RAILWAY_URL}/api/accounts`, {
      headers: {
        "x-service-key": SERVICE_SECRET!,
      },
    });

    expect(res.status).toBe(200);
  });

  it("should reject missing S2S key", async () => {
    const res = await fetch(`${RAILWAY_URL}/api/accounts`);
    expect(res.status).toBe(401);
  });

  it("should reject invalid S2S key", async () => {
    const res = await fetch(`${RAILWAY_URL}/api/accounts`, {
      headers: {
        "x-service-key": "invalid-key",
      },
    });

    expect(res.status).toBe(401);
  });
});
```

**Validation**:

```bash
npm run test -- tests/integration/s2s-auth.test.ts
```

---

### S2.1: Create railway-client.ts (GTM Repo)

**Est**: 60 min | **Repo**: gtm-yardflow | **File**: `lib/railway-client.ts`

```typescript
// GTM REPO: gtm-yardflow/lib/railway-client.ts
const RAILWAY_API_URL = process.env.RAILWAY_API_URL;
const SERVICE_KEY = process.env.SERVICE_TO_SERVICE_SECRET;

export async function railwayFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  if (!RAILWAY_API_URL || !SERVICE_KEY) {
    throw new Error("Railway configuration missing");
  }

  const response = await fetch(`${RAILWAY_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-service-key": SERVICE_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Railway API error: ${response.status}`);
  }

  return response.json();
}

// Typed API methods
export const railway = {
  accounts: {
    list: () => railwayFetch<Account[]>("/api/accounts"),
    get: (id: string) => railwayFetch<Account>(`/api/accounts/${id}`),
  },
  campaigns: {
    list: () => railwayFetch<Campaign[]>("/api/campaigns"),
    start: (data: StartCampaignInput) =>
      railwayFetch<{ workflowId: string }>("/api/agents/campaign", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};
```

**Validation**: Import works in GTM repo without errors

---

### S2.2: Configure Vercel Environment Variables (Manual)

**Est**: 15 min | **Location**: Vercel Dashboard

**NOT A CODE TASK** - This is a manual configuration step.

1. Go to Vercel Dashboard → gtm-yard-flow project
2. Go to Settings → Environment Variables
3. Add:
   - `RAILWAY_API_URL` = `https://yardflow-hitlist-production-2f41.up.railway.app`
   - `SERVICE_TO_SERVICE_SECRET` = (copy from Railway)

**Validation**:

```bash
# In GTM repo
npx vercel env pull .env.local
cat .env.local | grep RAILWAY
```

---

### S2.3: Update GTM API Routes (GTM Repo)

**Est**: 60 min | **Repo**: gtm-yardflow | **Files**: `app/api/proxy/accounts/route.ts`

```typescript
// GTM REPO: gtm-yardflow/app/api/proxy/accounts/route.ts
import { NextResponse } from "next/server";
import { railway } from "@/lib/railway-client";

export async function GET() {
  try {
    const accounts = await railway.accounts.list();
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Railway proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 502 },
    );
  }
}
```

**Validation**: GTM `/api/proxy/accounts` returns Railway data

---

### S2.4: Add CORS Test (This Repo)

**Est**: 30 min | **Files**: `tests/integration/cors.test.ts`

```typescript
import { describe, it, expect } from "vitest";

describe("CORS Configuration", () => {
  const RAILWAY_URL = "https://yardflow-hitlist-production-2f41.up.railway.app";
  const GTM_ORIGIN = "https://gtm-yard-flow.vercel.app";

  it("should allow GTM origin", async () => {
    const res = await fetch(`${RAILWAY_URL}/api/health`, {
      headers: {
        Origin: GTM_ORIGIN,
      },
    });

    const corsHeader = res.headers.get("access-control-allow-origin");
    expect(corsHeader).toMatch(new RegExp(GTM_ORIGIN.replace(".", "\\.")));
  });

  it("should handle preflight OPTIONS", async () => {
    const res = await fetch(`${RAILWAY_URL}/api/accounts`, {
      method: "OPTIONS",
      headers: {
        Origin: GTM_ORIGIN,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "x-service-key",
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });
});
```

**Validation**:

```bash
npm run test -- tests/integration/cors.test.ts
```

---

### S2.5: Create Integration Handoff Document

**Est**: 30 min | **Files**: `docs/current/GTM_INTEGRATION_HANDOFF.md`

Document the exact steps for GTM repo work.

**Validation**: Document exists and is accurate

---

### S2.6: Update PLATFORM_REUNIFICATION_PLAN.md

**Est**: 30 min | **Files**: `docs/current/PLATFORM_REUNIFICATION_PLAN.md`

Update with completed S2S implementation details.

**Validation**: Document reflects current state

---

### S2.7: End-to-End Integration Test

**Est**: 45 min | **Files**: `tests/e2e/gtm-integration.test.ts`

```typescript
import { describe, it, expect } from "vitest";

describe("GTM-Railway Integration E2E", () => {
  const GTM_URL = process.env.GTM_URL || "https://gtm-yard-flow.vercel.app";

  it("should fetch accounts through GTM proxy", async () => {
    const res = await fetch(`${GTM_URL}/api/proxy/accounts`);
    expect(res.ok).toBe(true);

    const accounts = await res.json();
    expect(Array.isArray(accounts)).toBe(true);
  });
});
```

**Validation**:

```bash
GTM_URL=https://gtm-yard-flow.vercel.app npm run test -- tests/e2e/gtm-integration.test.ts
```

---

## S2 Sprint Demo

```bash
# From GTM frontend (browser or curl)
curl https://gtm-yard-flow.vercel.app/api/proxy/accounts

# Should return accounts from Railway backend
# Verify CORS headers present
```

---

# Sprint S3: Email & Outreach Pipeline

> **Goal**: Complete SendGrid integration with tracking  
> **Estimate**: 6 hours  
> **Demo**: Send email, track open, see analytics  
> **Blocked By**: S0

## ⚠️ Schema Note

Use existing `email_engagement` model, NOT `email_events`.

## Tasks

### S3.1: Create SendGrid Email Job

**Est**: 60 min | **Files**: `src/lib/queue/jobs/send-email.ts`

```typescript
import { Job } from "bullmq";
import sgMail from "@sendgrid/mail";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface SendEmailJobData {
  to: string;
  from: string;
  subject: string;
  html: string;
  sequenceStepId: string;
  trackingEnabled?: boolean;
}

export async function processSendEmail(job: Job<SendEmailJobData>) {
  const {
    to,
    from,
    subject,
    html,
    sequenceStepId,
    trackingEnabled = true,
  } = job.data;

  logger.info("Sending email", { to, subject, sequenceStepId });

  try {
    const [response] = await sgMail.send({
      to,
      from,
      subject,
      html,
      trackingSettings: {
        openTracking: { enable: trackingEnabled },
        clickTracking: { enable: trackingEnabled },
      },
      customArgs: {
        sequence_step_id: sequenceStepId,
      },
    });

    // Update sequence step
    await prisma.sequence_steps.update({
      where: { id: sequenceStepId },
      data: {
        status: "SENT",
        sent_at: new Date(),
      },
    });

    logger.info("Email sent successfully", {
      messageId: response.headers["x-message-id"],
      sequenceStepId,
    });

    return { success: true, messageId: response.headers["x-message-id"] };
  } catch (error) {
    logger.error("Email send failed", { error, sequenceStepId });

    await prisma.sequence_steps.update({
      where: { id: sequenceStepId },
      data: {
        status: "FAILED",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}
```

**Validation**:

```bash
# Add to worker registration and verify job processes
npm run worker
# Queue a test email job
```

---

### S3.2: Register Email Job in Worker

**Est**: 30 min | **Files**: `src/lib/queue/workers.ts`

Add the send-email processor to the worker.

```typescript
import { processSendEmail } from "./jobs/send-email";

// In worker setup:
worker.on("active", (job) => {
  if (job.name === "send-email") {
    processSendEmail(job);
  }
});
```

**Validation**: Worker logs show "send-email" job type registered

---

### S3.3: Verify SendGrid Webhook Handler

**Est**: 45 min | **Files**: `src/app/api/webhooks/sendgrid/route.ts`

Verify existing handler uses `email_engagement` model correctly.

```typescript
// Update to use correct model
await prisma.email_engagement.create({
  data: {
    id: `eng-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sequenceStepId: event.sequence_step_id,
    eventType: event.event, // 'open', 'click', 'bounce', etc.
    recipientEmail: event.email,
    timestamp: new Date(event.timestamp * 1000),
    metadata: event,
  },
});
```

**Validation**:

```bash
# Test webhook with mock payload
curl -X POST http://localhost:3000/api/webhooks/sendgrid \
  -H "Content-Type: application/json" \
  -d '[{"event":"open","email":"test@test.com","timestamp":1234567890,"sequence_step_id":"test-step"}]'
```

---

### S3.3a: Document SendGrid Webhook Registration

**Est**: 15 min | **Files**: `docs/current/SENDGRID_SETUP.md`

Document how to register the webhook URL in SendGrid dashboard.

---

### S3.4a: Create Email Stats API

**Est**: 45 min | **Files**: `src/app/api/email/stats/route.ts`

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await prisma.email_engagement.groupBy({
    by: ["eventType"],
    _count: { id: true },
  });

  const formatted = stats.reduce(
    (acc, stat) => {
      acc[stat.eventType.toLowerCase()] = stat._count.id;
      return acc;
    },
    {} as Record<string, number>,
  );

  return NextResponse.json({
    sent: formatted.delivered || 0,
    opened: formatted.open || 0,
    clicked: formatted.click || 0,
    bounced: formatted.bounce || 0,
    openRate: formatted.delivered
      ? (((formatted.open || 0) / formatted.delivered) * 100).toFixed(1)
      : "0",
    clickRate: formatted.open
      ? (((formatted.click || 0) / formatted.open) * 100).toFixed(1)
      : "0",
  });
}
```

**Validation**:

```bash
curl -H "Cookie: ..." http://localhost:3000/api/email/stats
```

---

### S3.4b: Create Email Stats Card Component

**Est**: 30 min | **Files**: `src/components/email/stats-card.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MousePointer, AlertCircle, Eye } from 'lucide-react';

interface EmailStatsCardProps {
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
    openRate: string;
    clickRate: string;
  };
}

export function EmailStatsCard({ stats }: EmailStatsCardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Sent</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.sent}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Opens</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.opened}</div>
          <p className="text-xs text-muted-foreground">{stats.openRate}% rate</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Clicks</CardTitle>
          <MousePointer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.clicked}</div>
          <p className="text-xs text-muted-foreground">{stats.clickRate}% rate</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Bounced</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.bounced}</div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Validation**: Component renders with mock data

---

### S3.5: Email Analytics Page

**Est**: 45 min | **Files**: `src/app/dashboard/email/page.tsx`

```typescript
import { Suspense } from 'react';
import { EmailStatsCard } from '@/components/email/stats-card';

async function getEmailStats() {
  const res = await fetch('/api/email/stats', { cache: 'no-store' });
  return res.json();
}

export default async function EmailDashboardPage() {
  const stats = await getEmailStats();

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Email Analytics</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <EmailStatsCard stats={stats} />
      </Suspense>
    </div>
  );
}
```

**Validation**: Navigate to /dashboard/email, see stats

---

## S3 Sprint Demo

```bash
# 1. Queue an email
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test@test.com","subject":"Test","sequenceStepId":"step-1"}'

# 2. Simulate SendGrid webhook (open event)
curl -X POST http://localhost:3000/api/webhooks/sendgrid \
  -d '[{"event":"open","email":"test@test.com","sequence_step_id":"step-1","timestamp":1234567890}]'

# 3. View stats
curl http://localhost:3000/api/email/stats
# Should show: { sent: 1, opened: 1, ... }
```

---

# Sprint S4: Analytics & Reporting

> **Goal**: Funnel analytics and data export  
> **Estimate**: 5 hours  
> **Demo**: Download CSV of campaign performance  
> **Blocked By**: S3

## Tasks

### S4.1: Funnel Analytics API

**Est**: 60 min | **Files**: `src/app/api/analytics/funnel/route.ts`

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get funnel metrics
  const [accounts, contacted, meetings, won] = await Promise.all([
    prisma.target_accounts.count(),
    prisma.outreach.count({ where: { status: "SENT" } }),
    prisma.Meeting.count(),
    prisma.Meeting.count({ where: { status: "COMPLETED", dealStage: "WON" } }),
  ]);

  return NextResponse.json({
    stages: [
      { name: "Target Accounts", count: accounts, rate: 100 },
      {
        name: "Contacted",
        count: contacted,
        rate: accounts ? ((contacted / accounts) * 100).toFixed(1) : 0,
      },
      {
        name: "Meetings",
        count: meetings,
        rate: contacted ? ((meetings / contacted) * 100).toFixed(1) : 0,
      },
      {
        name: "Won",
        count: won,
        rate: meetings ? ((won / meetings) * 100).toFixed(1) : 0,
      },
    ],
  });
}
```

**Validation**:

```bash
curl -H "Cookie: ..." http://localhost:3000/api/analytics/funnel
```

---

### S4.2: Export API with Pagination

**Est**: 45 min | **Files**: `src/app/api/reports/export/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "accounts";
  const format = searchParams.get("format") || "json";
  const limit = Math.min(parseInt(searchParams.get("limit") || "1000"), 10000);
  const offset = parseInt(searchParams.get("offset") || "0");

  let data: any[];

  switch (type) {
    case "accounts":
      data = await prisma.target_accounts.findMany({
        take: limit,
        skip: offset,
      });
      break;
    case "contacts":
      data = await prisma.people.findMany({ take: limit, skip: offset });
      break;
    case "meetings":
      data = await prisma.Meeting.findMany({ take: limit, skip: offset });
      break;
    case "outreach":
      data = await prisma.outreach.findMany({ take: limit, skip: offset });
      break;
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (format === "csv") {
    const csv = convertToCSV(data);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=${type}-export.csv`,
      },
    });
  }

  return NextResponse.json({ data, count: data.length, offset, limit });
}

function convertToCSV(data: any[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((row) =>
    Object.values(row)
      .map((v) => (typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v))
      .join(","),
  );
  return [headers, ...rows].join("\n");
}
```

**Validation**:

```bash
curl -H "Cookie: ..." "http://localhost:3000/api/reports/export?type=accounts&format=csv"
```

---

### S4.3a: Export Button Component

**Est**: 30 min | **Files**: `src/components/reports/export-button.tsx`

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  type: 'accounts' | 'contacts' | 'meetings' | 'outreach';
  format?: 'csv' | 'json';
}

export function ExportButton({ type, format = 'csv' }: ExportButtonProps) {
  const handleExport = () => {
    window.location.href = `/api/reports/export?type=${type}&format=${format}`;
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Export {type}
    </Button>
  );
}
```

**Validation**: Click button, file downloads

---

### S4.3b: Reports Page with Export Buttons

**Est**: 30 min | **Files**: `src/app/dashboard/reports/page.tsx`

```typescript
import { ExportButton } from '@/components/reports/export-button';

export default function ReportsPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Reports & Exports</h1>

      <div className="grid gap-4">
        <div className="flex items-center justify-between p-4 border rounded">
          <div>
            <h3 className="font-medium">Target Accounts</h3>
            <p className="text-sm text-muted-foreground">Export all target accounts</p>
          </div>
          <ExportButton type="accounts" />
        </div>

        <div className="flex items-center justify-between p-4 border rounded">
          <div>
            <h3 className="font-medium">Contacts</h3>
            <p className="text-sm text-muted-foreground">Export all contacts</p>
          </div>
          <ExportButton type="contacts" />
        </div>

        <div className="flex items-center justify-between p-4 border rounded">
          <div>
            <h3 className="font-medium">Meetings</h3>
            <p className="text-sm text-muted-foreground">Export meeting history</p>
          </div>
          <ExportButton type="meetings" />
        </div>

        <div className="flex items-center justify-between p-4 border rounded">
          <div>
            <h3 className="font-medium">Outreach</h3>
            <p className="text-sm text-muted-foreground">Export outreach activity</p>
          </div>
          <ExportButton type="outreach" />
        </div>
      </div>
    </div>
  );
}
```

**Validation**: Navigate to /dashboard/reports, see all export buttons

---

### S4.4: Cohort Analysis API

**Est**: 60 min | **Files**: `src/app/api/analytics/cohorts/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { startOfWeek, subWeeks, format } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weeks = 8;
  const cohorts = [];

  for (let i = 0; i < weeks; i++) {
    const weekStart = startOfWeek(subWeeks(new Date(), i));
    const weekEnd = startOfWeek(subWeeks(new Date(), i - 1));

    const enrolled = await prisma.sequence_enrollments.count({
      where: {
        enrolled_at: { gte: weekStart, lt: weekEnd },
      },
    });

    const completed = await prisma.sequence_enrollments.count({
      where: {
        enrolled_at: { gte: weekStart, lt: weekEnd },
        status: "COMPLETED",
      },
    });

    const meetings = await prisma.Meeting.count({
      where: {
        createdAt: { gte: weekStart, lt: weekEnd },
      },
    });

    cohorts.push({
      week: format(weekStart, "MMM d"),
      enrolled,
      completed,
      completionRate: enrolled ? ((completed / enrolled) * 100).toFixed(1) : 0,
      meetings,
      meetingRate: enrolled ? ((meetings / enrolled) * 100).toFixed(1) : 0,
    });
  }

  return NextResponse.json({ cohorts: cohorts.reverse() });
}
```

**Validation**:

```bash
curl -H "Cookie: ..." http://localhost:3000/api/analytics/cohorts
```

---

### S4.5: Rate Limiting for Export API

**Est**: 30 min | **Files**: `src/lib/rate-limit.ts`, update export route

```typescript
// src/lib/rate-limit.ts
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const record = rateLimits.get(key);

  if (!record || record.resetAt < now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// Usage in export route:
const userId = session.user.id;
if (!checkRateLimit(`export:${userId}`, 10, 60000)) {
  // 10 per minute
  return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

**Validation**: Call export 11 times quickly, get 429 on 11th

---

### S4.6: Cohort Analysis Unit Test

**Est**: 30 min | **Files**: `tests/api/cohorts.test.ts`

```typescript
import { describe, it, expect } from "vitest";

describe("Cohort Analysis API", () => {
  it("should return 8 weeks of cohort data", async () => {
    // Test implementation
  });

  it("should calculate completion rates correctly", async () => {
    // Test implementation
  });
});
```

**Validation**:

```bash
npm run test -- tests/api/cohorts.test.ts
```

---

## S4 Sprint Demo

```bash
# 1. View funnel
curl http://localhost:3000/api/analytics/funnel

# 2. Export CSV
curl "http://localhost:3000/api/reports/export?type=accounts&format=csv" > accounts.csv
wc -l accounts.csv

# 3. View cohorts
curl http://localhost:3000/api/analytics/cohorts
```

---

# Sprint S5: Production Hardening

> **Goal**: Load test, monitoring, runbooks  
> **Estimate**: 6 hours  
> **Demo**: System handles 100 concurrent users  
> **Blocked By**: S1-S4

## Tasks

### S5.0: Install k6 Load Testing Tool

**Est**: 15 min | **Files**: `docs/current/LOAD_TESTING.md`

```bash
# On macOS
brew install k6

# On Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Validation**:

```bash
k6 version
```

---

### S5.1: Load Test Script

**Est**: 60 min | **Files**: `tests/load/k6-load-test.js`

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 }, // Ramp up
    { duration: "1m", target: 50 }, // Stay at 50
    { duration: "30s", target: 100 }, // Peak
    { duration: "30s", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% under 500ms
    http_req_failed: ["rate<0.01"], // <1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    "health status 200": (r) => r.status === 200,
  });

  // Accounts list
  const accountsRes = http.get(`${BASE_URL}/api/accounts`, {
    headers: { "x-service-key": __ENV.SERVICE_KEY },
  });
  check(accountsRes, {
    "accounts status 200": (r) => r.status === 200,
  });

  sleep(1);
}
```

**Validation**:

```bash
k6 run tests/load/k6-load-test.js
```

---

### S5.2: UptimeRobot Alerts for Worker

**Est**: 30 min | **Manual Step**

1. Go to UptimeRobot dashboard
2. Add monitor for Worker health endpoint
3. Configure alerting

**Document in**: `docs/current/MONITORING_SETUP.md`

---

### S5.3: Production Readiness Checklist

**Est**: 45 min | **Files**: `docs/current/GO_LIVE_CHECKLIST.md` (update)

Add final verification steps for each sprint completion.

---

### S5.4: Incident Runbook

**Est**: 60 min | **Files**: `docs/current/INCIDENT_RUNBOOK.md`

```markdown
# Incident Runbook

## Service Down

### Web App (502 errors)

1. Check Railway logs: `railway logs`
2. Verify DATABASE_URL is set
3. Restart service: Railway dashboard → Restart

### Worker Not Processing

1. Check Redis connection
2. Verify REDIS_URL
3. Check for stuck jobs: `redis-cli LLEN bull:agents:wait`

## Database Issues

### High Latency

1. Check connection pool: Look for "too many connections"
2. Restart with fresh pool
3. Consider scaling Postgres

### Migration Failed

1. `npx prisma migrate status`
2. `npx prisma migrate reset --force` (DEV ONLY)
3. Manual fix in production
```

---

### S5.5: Security Audit

**Est**: 30 min | **Files**: Terminal output

```bash
cd eventops
npm audit
npm audit fix
```

Document any unfixed vulnerabilities and mitigation plan.

---

### S5.6: Rollback Practice

**Est**: 45 min | **Manual Exercise**

1. Deploy a breaking change to staging (intentional)
2. Detect the issue via health check
3. Rollback using Railway: `railway down && railway up --previous`
4. Document lessons learned

**Note**: This repo uses Railway production only. Create a branch deployment for testing.

---

### S5.7: Update Seed Scripts

**Est**: 30 min | **Files**: `prisma/seed-production.ts`

Verify seed scripts work with current schema.

```bash
npm run db:seed:prod -- --dry-run
```

---

### S5.8: Final Documentation Update

**Est**: 45 min | **Files**: Multiple docs

Update all documentation to reflect completed work:

- STATUS.md
- ROADMAP.md
- GO_LIVE_CHECKLIST.md

---

## S5 Sprint Demo

```bash
# 1. Run load test
BASE_URL=https://yardflow-hitlist-production-2f41.up.railway.app \
  k6 run tests/load/k6-load-test.js

# 2. Verify thresholds pass
# - p95 latency < 500ms
# - Error rate < 1%

# 3. Show monitoring dashboard (UptimeRobot)

# 4. Execute one rollback scenario from runbook
```

---

# Appendix A: Environment Variables

## Railway (YardFlow-Hitlist)

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://yardflow-hitlist-production-2f41.up.railway.app
SERVICE_TO_SERVICE_SECRET=...
ALLOWED_ORIGINS=https://gtm-yard-flow.vercel.app
OPENAI_API_KEY=...
SENDGRID_API_KEY=...
```

## Vercel (gtm-yardflow)

```bash
RAILWAY_API_URL=https://yardflow-hitlist-production-2f41.up.railway.app
SERVICE_TO_SERVICE_SECRET=... (same as Railway)
```

---

# Appendix B: Validation Script

Run this after each sprint to verify completion:

```bash
#!/bin/bash
# scripts/validate-sprint.sh

set -e
cd eventops

echo "=== Sprint Validation ==="

echo "1. Checking npm scripts..."
npm run test:agents --dry-run || echo "WARN: test:agents not ready"

echo "2. Checking database..."
npx prisma migrate status

echo "3. Running smoke tests..."
npm run test:smoke:local || echo "WARN: smoke tests not passing"

echo "4. Checking health..."
curl -s http://localhost:3000/api/health | jq

echo "=== Validation Complete ==="
```

---

# Appendix C: Definition of Done

Every task must meet:

- [ ] Code committed to feature branch
- [ ] Tests pass locally
- [ ] PR created and reviewed
- [ ] Merged to main
- [ ] Deployed to production
- [ ] Health check passes
- [ ] Demo performed (if sprint demo)

---

**End of Sprint Backlog v2**

_Next action_: Execute S0 (Infrastructure Setup)
