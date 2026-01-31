# YardFlow Platform: Complete Sprint Backlog

> **Status**: ACTIVE  
> **Created**: January 31, 2026  
> **Philosophy**: Ship Fast, Ship Often - Every task atomic, testable, committable  
> **Architecture**: Two-Repo Platform (Railway + Vercel)

---

## Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USERS                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   GTM Frontend      │ │   Content Hub       │ │   Direct Access     │
│   gtm-yard-flow     │ │   flow-state-klbt   │ │   yardflow-hitlist  │
│   (Vercel)          │ │   (Vercel)          │ │   (Railway)         │
│                     │ │                     │ │                     │
│   REPO: gtm-yardflow│ │   (Static assets)   │ │   REPO: YardFlow-   │
│                     │ │                     │ │         Hitlist     │
└─────────┬───────────┘ └──────────┬──────────┘ └──────────┬──────────┘
          │                        │                       │
          │ S2S API Calls          │ CDN                   │ Direct API
          │ x-service-key          │                       │ NextAuth
          ▼                        ▼                       ▼
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

| Sprint | Name                          | Goal                                       | Demo                                    |
| ------ | ----------------------------- | ------------------------------------------ | --------------------------------------- |
| **S1** | Agent Orchestrator Completion | Full campaign workflow executes end-to-end | Trigger campaign, watch agents complete |
| **S2** | GTM Frontend Integration      | Vercel frontend calls Railway APIs         | GTM dashboard shows Railway data        |
| **S3** | Email & Outreach Pipeline     | Emails send via SendGrid, tracking works   | Send email, see open/click events       |
| **S4** | Analytics & Reporting         | Real-time metrics, exportable reports      | Dashboard shows live stats              |
| **S5** | Production Hardening          | Load tested, monitored, documented         | 50 concurrent users, all green          |

---

## Sprint S1: Agent Orchestrator Completion

**Goal**: Complete the agent orchestration pipeline so full campaigns execute end-to-end.  
**Demo**: Trigger a `booth-outreach` campaign, watch all 5 agent steps complete in the dashboard.  
**Validation**: `npm run test:agents` passes, campaign creates sequences and outreach.

### S1.1: Complete Orchestrator Step 3 (Sequence Design)

**Files**: `eventops/src/lib/agents/orchestrator.ts`  
**Problem**: Line 141 has `// TODO: Get contacts for each account and design sequences`

**Implementation**:

```typescript
// Step 3: Design sequences for contacts
const contacts = await prisma.people.findMany({
  where: { accountId: { in: params.targetAccounts } },
  take: 10, // Limit to prevent runaway
});

for (const contact of contacts) {
  const sequenceTask = await this.executeTask({
    id: "",
    agentType: "sequence-engineer",
    input: { personId: contact.id, campaignGoal: "meeting", urgency: "high" },
    status: "pending",
    parentTaskId: rootTask.id,
  });
  workflow.tasks.push(sequenceTask);
}
```

**Test**:

```typescript
// tests/agents/orchestrator-step3.test.ts
it("should design sequences for account contacts", async () => {
  const result = await orchestrator.runFullCampaign({
    eventId: "test",
    targetAccounts: ["acc-1"],
    campaignType: "booth-outreach",
  });
  expect(result.tasks.some((t) => t.agentType === "sequence-engineer")).toBe(
    true,
  );
});
```

**Validation**: Sequences created in `sequences` table with contact associations.

---

### S1.2: Complete Orchestrator Step 4 (Content Generation)

**Files**: `eventops/src/lib/agents/orchestrator.ts`  
**Problem**: Line 144 has `// TODO: Use content purposing agent for campaign materials`

**Implementation**:

```typescript
// Step 4: Generate content for each sequence
for (const sequenceTask of workflow.tasks.filter(
  (t) => t.agentType === "sequence-engineer",
)) {
  const contentTask = await this.executeTask({
    id: "",
    agentType: "content-purposing",
    input: {
      accountId: params.targetAccounts?.[0],
      sequenceId: (sequenceTask.output as any)?.sequenceId,
      contentType: "email",
    },
    status: "pending",
    parentTaskId: sequenceTask.id,
  });
  workflow.tasks.push(contentTask);
}
```

**Test**:

```typescript
it('should generate content after sequences', async () => {
  const result = await orchestrator.runFullCampaign({ ... });
  expect(result.tasks.some(t => t.agentType === 'content-purposing')).toBe(true);
});
```

**Validation**: `templates` or `sequence_steps` populated with content.

---

### S1.3: Complete Orchestrator Step 5 (Social Scheduling)

**Files**: `eventops/src/lib/agents/orchestrator.ts`  
**Problem**: Line 147 has `// TODO: Plan and schedule social posts`

**Implementation**:

```typescript
// Step 5: Schedule social posts
if (params.campaignType !== "post-event") {
  const socialTask = await this.executeTask({
    id: "",
    agentType: "socials",
    input: {
      accountIds: params.targetAccounts,
      campaignId: workflow.id,
      platforms: ["LINKEDIN"],
    },
    status: "pending",
    parentTaskId: rootTask.id,
  });
  workflow.tasks.push(socialTask);
}
```

**Test**:

```typescript
it('should schedule social posts for pre-event campaigns', async () => {
  const result = await orchestrator.runFullCampaign({
    campaignType: 'pre-event', ...
  });
  expect(result.tasks.some(t => t.agentType === 'socials')).toBe(true);
});
```

**Validation**: Social posts queued (or stubbed with mock data).

---

### S1.4: Implement Workflow Status Retrieval

**Files**: `eventops/src/lib/agents/orchestrator.ts`  
**Problem**: Line 253 has `// TODO: Fetch from database`

**Implementation**:

```typescript
async getWorkflowStatus(workflowId: string): Promise<CampaignWorkflow | null> {
  const rootTask = await prisma.agent_tasks.findUnique({
    where: { id: workflowId },
    include: {
      children: true, // Requires relation in schema
    },
  });

  if (!rootTask) return null;

  const tasks: AgentTask[] = await prisma.agent_tasks.findMany({
    where: { parentTaskId: workflowId },
  });

  return {
    id: workflowId,
    name: rootTask.inputData?.campaignType || 'Campaign',
    tasks: tasks.map(t => ({
      id: t.id,
      agentType: t.agentType,
      input: t.inputData,
      output: t.outputData,
      status: t.status as AgentTask['status'],
      startedAt: t.startedAt || undefined,
      completedAt: t.completedAt || undefined,
      error: t.error || undefined,
    })),
    status: rootTask.status as CampaignWorkflow['status'],
    progress: {
      completed: tasks.filter(t => t.status === 'completed').length,
      total: tasks.length,
    },
  };
}
```

**Test**:

```typescript
it('should retrieve workflow status from database', async () => {
  const workflow = await orchestrator.runFullCampaign({ ... });
  const status = await orchestrator.getWorkflowStatus(workflow.id);
  expect(status).not.toBeNull();
  expect(status?.tasks.length).toBeGreaterThan(0);
});
```

**Validation**: `/api/workflows/[id]/status` returns real data.

---

### S1.5: Wire Prospecting Output to Research Input

**Files**: `eventops/src/lib/agents/orchestrator.ts`  
**Problem**: Line 124-126 has TODO about retrieving discovered accounts

**Implementation**:

```typescript
// After prospecting task completes
if (prospectingTask.status === "completed") {
  const prospectOutput = prospectingTask.output as
    | { accountIds?: string[] }
    | undefined;
  if (prospectOutput?.accountIds?.length) {
    params.targetAccounts = prospectOutput.accountIds;
  }
}
```

**Test**:

```typescript
it("should pass discovered accounts to research step", async () => {
  // Mock prospecting to return account IDs
  jest.spyOn(prospectingAgent, "run").mockResolvedValue({
    accountIds: ["discovered-1", "discovered-2"],
  });

  const result = await orchestrator.runFullCampaign({
    eventId: "test",
    campaignType: "booth-outreach",
    // No targetAccounts - should discover
  });

  expect(result.tasks.filter((t) => t.agentType === "research").length).toBe(2);
});
```

**Validation**: Prospecting → Research pipeline flows data correctly.

---

### S1.6: Add Retry Logic for Failed Tasks

**Files**: `eventops/src/lib/agents/orchestrator.ts`  
**Problem**: GO_LIVE_CHECKLIST notes "Recovery Logic: ⚠️ Placeholder error handling"

**Implementation**:

```typescript
private async executeTaskWithRetry(task: AgentTask, maxRetries = 3): Promise<AgentTask> {
  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < maxRetries) {
    attempts++;
    try {
      return await this.executeTask(task);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn('Agent task failed, retrying', {
        taskId: task.id,
        attempt: attempts,
        error: lastError.message,
      });
      await new Promise(r => setTimeout(r, 1000 * attempts)); // Exponential backoff
    }
  }

  task.status = 'failed';
  task.error = `Failed after ${maxRetries} attempts: ${lastError?.message}`;
  return task;
}
```

**Test**:

```typescript
it('should retry failed tasks up to 3 times', async () => {
  let callCount = 0;
  jest.spyOn(researchAgent, 'generateDossier').mockImplementation(() => {
    callCount++;
    if (callCount < 3) throw new Error('Transient failure');
    return Promise.resolve({ ... });
  });

  const result = await orchestrator.executeTaskWithRetry({ agentType: 'research', ... });
  expect(result.status).toBe('completed');
  expect(callCount).toBe(3);
});
```

**Validation**: Transient failures don't crash workflow.

---

### S1.7: Create Agent Integration Test Suite

**Files**: `eventops/tests/agents/integration.test.ts` (NEW)

**Implementation**:

```typescript
describe('Agent Orchestration Integration', () => {
  beforeAll(async () => {
    // Seed test data
    await seedTestAccounts();
  });

  it('should execute full booth-outreach campaign', async () => {
    const orchestrator = new AgentOrchestrator();
    const workflow = await orchestrator.runFullCampaign({
      eventId: 'manifest-2026',
      targetAccounts: ['test-account-1'],
      campaignType: 'booth-outreach',
    });

    expect(workflow.status).toBe('completed');
    expect(workflow.tasks.length).toBeGreaterThanOrEqual(3);

    // Verify database state
    const sequences = await prisma.sequences.count({
      where: { campaignId: workflow.id },
    });
    expect(sequences).toBeGreaterThan(0);
  });

  it('should handle partial failures gracefully', async () => {
    // Force one agent to fail
    jest.spyOn(graphicsAgent, 'generateGraphic').mockRejectedValue(new Error('API down'));

    const workflow = await orchestrator.runFullCampaign({ ... });

    // Workflow should still complete with partial success
    expect(workflow.status).toBe('completed');
    expect(workflow.tasks.some(t => t.status === 'failed')).toBe(true);
    expect(workflow.tasks.some(t => t.status === 'completed')).toBe(true);
  });
});
```

**Test**: `npm run test:agents`

**Validation**: All integration tests pass.

---

### S1.8: Update Agent Dashboard with Live Status

**Files**: `eventops/src/app/dashboard/agents/page.tsx`

**Implementation**:

- Add real-time polling every 5 seconds
- Show task tree with parent-child relationships
- Add "Retry Failed" button for individual tasks

**Test**: Manual - Dashboard updates as workflow progresses

**Validation**: Can watch campaign execute in real-time.

---

### S1 Sprint Validation Script

```bash
#!/bin/bash
# scripts/validate-s1.sh

echo "=== S1: Agent Orchestrator Validation ==="

# 1. Run unit tests
npm run test:agents || exit 1

# 2. Trigger test campaign
CAMPAIGN_ID=$(curl -s -X POST http://localhost:3000/api/workflows/launch \
  -H "Content-Type: application/json" \
  -d '{"type":"booth-outreach","accountId":"test-1"}' | jq -r '.workflowId')

echo "Campaign started: $CAMPAIGN_ID"

# 3. Poll until complete (max 60 seconds)
for i in {1..12}; do
  STATUS=$(curl -s "http://localhost:3000/api/workflows/$CAMPAIGN_ID/status" | jq -r '.status')
  echo "Status: $STATUS"
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  sleep 5
done

# 4. Verify artifacts created
SEQUENCES=$(curl -s "http://localhost:3000/api/sequences?campaignId=$CAMPAIGN_ID" | jq '.length')
echo "Sequences created: $SEQUENCES"

[ "$STATUS" = "completed" ] && [ "$SEQUENCES" -gt 0 ] && echo "✅ S1 PASSED" || echo "❌ S1 FAILED"
```

---

## Sprint S2: GTM Frontend Integration

**Goal**: Connect gtm-yardflow Vercel frontend to Railway backend via S2S auth.  
**Demo**: GTM dashboard displays accounts, people, and campaigns from Railway.  
**Validation**: Browser fetch from Vercel to Railway succeeds without CORS errors.

### S2.1: Create Railway API Client in GTM Repo

**Repo**: `gtm-yardflow`  
**Files**: `src/lib/railway-client.ts` (NEW)

**Implementation**:

```typescript
// gtm-yardflow/src/lib/railway-client.ts
const RAILWAY_URL =
  process.env.RAILWAY_API_URL ||
  "https://yardflow-hitlist-production-2f41.up.railway.app";
const SERVICE_KEY = process.env.SERVICE_TO_SERVICE_SECRET;

export async function railwayFetch<T>(
  path: string,
  options: RequestInit = {},
  userId?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("x-service-key", SERVICE_KEY!);
  headers.set("x-user-id", userId || "gtm-frontend");
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${RAILWAY_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Railway API error: ${response.status}`);
  }

  return response.json();
}

// Typed API methods
export const railwayApi = {
  accounts: {
    list: (params?: { eventId?: string }) =>
      railwayFetch<Account[]>(`/api/accounts?${new URLSearchParams(params)}`),
    get: (id: string) => railwayFetch<Account>(`/api/accounts/${id}`),
  },
  people: {
    list: (params?: { accountId?: string }) =>
      railwayFetch<Person[]>(`/api/people?${new URLSearchParams(params)}`),
  },
  campaigns: {
    list: () => railwayFetch<Campaign[]>("/api/campaigns"),
    trigger: (id: string) =>
      railwayFetch<void>(`/api/campaigns/${id}/trigger`, { method: "POST" }),
  },
  workflows: {
    launch: (data: WorkflowInput) =>
      railwayFetch<{ workflowId: string }>("/api/workflows/launch", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    status: (id: string) =>
      railwayFetch<WorkflowStatus>(`/api/workflows/${id}/status`),
  },
};
```

**Test**:

```typescript
// gtm-yardflow/tests/railway-client.test.ts
it("should fetch accounts from Railway", async () => {
  const accounts = await railwayApi.accounts.list();
  expect(Array.isArray(accounts)).toBe(true);
});
```

**Validation**: Client works in both server and browser contexts.

---

### S2.2: Set Environment Variables in Vercel

**Platform**: Vercel Dashboard → gtm-yardflow → Environment Variables

**Variables**:

```bash
RAILWAY_API_URL=https://yardflow-hitlist-production-2f41.up.railway.app
SERVICE_TO_SERVICE_SECRET=<same as Railway>
NEXT_PUBLIC_RAILWAY_URL=https://yardflow-hitlist-production-2f41.up.railway.app
```

**Test**:

```bash
# Verify via Vercel CLI
vercel env ls
```

**Validation**: Variables visible in Vercel dashboard.

---

### S2.3: Create GTM Accounts Page

**Repo**: `gtm-yardflow`  
**Files**: `src/app/accounts/page.tsx` (NEW or UPDATE)

**Implementation**:

```typescript
// Server component fetches from Railway
import { railwayApi } from '@/lib/railway-client';

export default async function AccountsPage() {
  const accounts = await railwayApi.accounts.list();

  return (
    <div>
      <h1>Target Accounts</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Industry</th>
            <th>ICP Score</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map(account => (
            <tr key={account.id}>
              <td>{account.name}</td>
              <td>{account.industry}</td>
              <td>{account.icpScore}</td>
              <td>
                <Link href={`/accounts/${account.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Test**: Navigate to `/accounts`, verify data from Railway displays.

**Validation**: No CORS errors in browser console.

---

### S2.4: Create GTM Campaign Launch UI

**Repo**: `gtm-yardflow`  
**Files**: `src/app/campaigns/launch/page.tsx` (NEW)

**Implementation**:

```typescript
'use client';

import { useState } from 'react';
import { railwayApi } from '@/lib/railway-client';

export default function LaunchCampaignPage() {
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState<'idle' | 'launching' | 'success' | 'error'>('idle');
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  async function handleLaunch() {
    setStatus('launching');
    try {
      const result = await railwayApi.workflows.launch({
        type: 'booth-outreach',
        accountId,
      });
      setWorkflowId(result.workflowId);
      setStatus('success');
    } catch (error) {
      setStatus('error');
    }
  }

  return (
    <div>
      <h1>Launch Campaign</h1>
      <input
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        placeholder="Account ID"
      />
      <button onClick={handleLaunch} disabled={status === 'launching'}>
        {status === 'launching' ? 'Launching...' : 'Launch'}
      </button>
      {workflowId && <p>Workflow ID: {workflowId}</p>}
    </div>
  );
}
```

**Test**: Launch campaign from GTM, verify workflow starts in Railway.

**Validation**: `agent_tasks` table shows new records.

---

### S2.5: Add CORS Test to E2E Suite

**Files**: `eventops/scripts/e2e-production.ts`

**Implementation**:

```typescript
async function testCORSFromVercel() {
  console.log("Testing CORS from Vercel origin...");

  const response = await fetch(`${PROD_URL}/api/accounts`, {
    headers: {
      Origin: "https://gtm-yard-flow.vercel.app",
      "x-service-key": process.env.SERVICE_TO_SERVICE_SECRET!,
      "x-user-id": "e2e-test",
    },
  });

  const corsHeader = response.headers.get("access-control-allow-origin");
  assert(
    corsHeader === "https://gtm-yard-flow.vercel.app",
    "CORS header matches Vercel origin",
  );
  assert(response.ok, "Request succeeds with S2S auth");

  console.log("✅ CORS test passed");
}
```

**Validation**: E2E suite includes CORS verification.

---

### S2.6: Document GTM Integration Guide

**Files**: `docs/current/GTM_INTEGRATION_GUIDE.md` (UPDATE)

**Content**:

- Environment variable setup for both repos
- Railway client usage examples
- Error handling patterns
- Troubleshooting CORS issues

**Validation**: New developer can set up GTM→Railway in 30 minutes.

---

### S2 Sprint Validation Script

```bash
#!/bin/bash
# scripts/validate-s2.sh

echo "=== S2: GTM Frontend Integration Validation ==="

# 1. Test S2S auth from command line
ACCOUNTS=$(curl -s \
  -H "x-service-key: $SERVICE_TO_SERVICE_SECRET" \
  -H "x-user-id: test" \
  https://yardflow-hitlist-production-2f41.up.railway.app/api/accounts)

echo "Accounts from Railway: $(echo $ACCOUNTS | jq length)"

# 2. Test CORS preflight
PREFLIGHT=$(curl -s -I -X OPTIONS \
  -H "Origin: https://gtm-yard-flow.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  https://yardflow-hitlist-production-2f41.up.railway.app/api/accounts)

echo "$PREFLIGHT" | grep -i "access-control-allow-origin" && echo "✅ CORS OK" || echo "❌ CORS FAIL"

# 3. Verify Vercel deployment
curl -s https://gtm-yard-flow.vercel.app/api/health && echo "✅ GTM Healthy" || echo "❌ GTM Down"

echo "✅ S2 PASSED"
```

---

## Sprint S3: Email & Outreach Pipeline

**Goal**: Emails send via SendGrid with open/click tracking.  
**Demo**: Send email to test address, see delivery and open events in dashboard.  
**Validation**: SendGrid webhook fires, email_events table populated.

### S3.1: Verify SendGrid API Key Configuration

**Platform**: Railway Dashboard → Variables

**Action**: Ensure `SENDGRID_API_KEY` is set.

**Test**:

```bash
curl -s -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@yardflow.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
```

**Validation**: No 401 error from SendGrid.

---

### S3.2: Implement Email Send Queue Job

**Files**: `eventops/src/lib/queue/jobs/send-email.ts` (UPDATE)

**Implementation**:

```typescript
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function processSendEmail(job: Job<EmailJobData>) {
  const { to, subject, html, trackingId } = job.data;

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL || "noreply@yardflow.com",
    subject,
    html,
    customArgs: {
      trackingId,
    },
  };

  const [response] = await sgMail.send(msg);

  // Log delivery
  await prisma.email_events.create({
    data: {
      trackingId,
      eventType: "delivered",
      timestamp: new Date(),
      metadata: { sgMessageId: response.headers["x-message-id"] },
    },
  });

  return { success: true, messageId: response.headers["x-message-id"] };
}
```

**Test**:

```typescript
it("should send email via SendGrid", async () => {
  const result = await processSendEmail({
    data: {
      to: "test@test.com",
      subject: "Test",
      html: "<p>Test</p>",
      trackingId: "track-1",
    },
  });
  expect(result.success).toBe(true);
});
```

**Validation**: Email arrives in inbox.

---

### S3.3: Implement SendGrid Webhook Handler

**Files**: `eventops/src/app/api/webhooks/sendgrid/route.ts` (UPDATE)

**Implementation**:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  // Verify webhook signature
  const signature = request.headers.get(
    "x-twilio-email-event-webhook-signature",
  );
  const timestamp = request.headers.get(
    "x-twilio-email-event-webhook-timestamp",
  );
  const body = await request.text();

  if (!verifySignature(body, signature, timestamp)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const events = JSON.parse(body);

  for (const event of events) {
    await prisma.email_events.create({
      data: {
        trackingId: event.trackingId || event.sg_message_id,
        eventType: event.event, // open, click, bounce, etc.
        timestamp: new Date(event.timestamp * 1000),
        metadata: event,
      },
    });

    logger.info("Email event received", {
      event: event.event,
      trackingId: event.trackingId,
    });
  }

  return NextResponse.json({ received: events.length });
}

function verifySignature(
  body: string,
  signature: string | null,
  timestamp: string | null,
): boolean {
  if (!signature || !timestamp) return false;
  const webhookKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
  if (!webhookKey) return true; // Skip verification if key not set

  const payload = timestamp + body;
  const expectedSignature = crypto
    .createHmac("sha256", webhookKey)
    .update(payload)
    .digest("base64");

  return signature === expectedSignature;
}
```

**Test**:

```typescript
it("should process SendGrid webhook events", async () => {
  const response = await POST(
    mockRequest([
      { event: "open", trackingId: "track-1", timestamp: Date.now() / 1000 },
    ]),
  );
  expect(response.status).toBe(200);

  const event = await prisma.email_events.findFirst({
    where: { trackingId: "track-1" },
  });
  expect(event?.eventType).toBe("open");
});
```

**Validation**: Webhook endpoint processes events without errors.

---

### S3.4: Create Email Analytics View

**Files**: `eventops/src/app/dashboard/outreach/analytics/page.tsx` (NEW)

**Implementation**:

```typescript
export default async function OutreachAnalyticsPage() {
  const stats = await prisma.email_events.groupBy({
    by: ['eventType'],
    _count: true,
  });

  const delivered = stats.find(s => s.eventType === 'delivered')?._count || 0;
  const opened = stats.find(s => s.eventType === 'open')?._count || 0;
  const clicked = stats.find(s => s.eventType === 'click')?._count || 0;

  return (
    <div>
      <h1>Outreach Analytics</h1>
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Delivered" value={delivered} />
        <StatCard title="Opened" value={opened} rate={opened / delivered * 100} />
        <StatCard title="Clicked" value={clicked} rate={clicked / opened * 100} />
      </div>
    </div>
  );
}
```

**Test**: Navigate to `/dashboard/outreach/analytics`, verify stats display.

**Validation**: Real-time email metrics visible.

---

### S3.5: Add Email to Sequence Automation

**Files**: `eventops/src/lib/queue/jobs/sequence-step.ts` (UPDATE)

**Implementation**:

```typescript
// When sequence step is EMAIL type, queue email send
if (step.channelType === "EMAIL") {
  await emailQueue.add("send-email", {
    to: contact.email,
    subject: step.subject,
    html: step.content,
    trackingId: `seq-${enrollment.id}-step-${step.order}`,
  });
}
```

**Test**:

```typescript
it("should queue email for EMAIL sequence steps", async () => {
  await processSequenceStepJob({
    data: { enrollmentId: "enr-1", stepOrder: 1 },
  });
  const jobs = await emailQueue.getJobs(["waiting"]);
  expect(jobs.some((j) => j.data.trackingId.startsWith("seq-enr-1"))).toBe(
    true,
  );
});
```

**Validation**: Sequence steps trigger email sends.

---

### S3 Sprint Validation Script

```bash
#!/bin/bash
# scripts/validate-s3.sh

echo "=== S3: Email Pipeline Validation ==="

# 1. Check SendGrid API
curl -s -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"test@yardflow.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}' \
  && echo "✅ SendGrid OK" || echo "❌ SendGrid FAIL"

# 2. Test webhook endpoint
curl -s -X POST https://yardflow-hitlist-production-2f41.up.railway.app/api/webhooks/sendgrid \
  -H "Content-Type: application/json" \
  -d '[{"event":"test","trackingId":"test-123"}]' \
  && echo "✅ Webhook OK"

# 3. Check email events table
psql $DATABASE_URL -c "SELECT COUNT(*) FROM email_events;"

echo "✅ S3 PASSED"
```

---

## Sprint S4: Analytics & Reporting

**Goal**: Real-time analytics dashboard with exportable reports.  
**Demo**: Dashboard shows live conversion funnel, export CSV of meeting outcomes.  
**Validation**: Analytics API returns accurate data, export downloads successfully.

### S4.1: Implement Funnel Analytics API

**Files**: `eventops/src/app/api/analytics/funnel/route.ts` (UPDATE)

**Implementation**:

```typescript
export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) return unauthorized();

  const eventId = request.nextUrl.searchParams.get("eventId");

  const stages = await Promise.all([
    prisma.target_accounts.count({ where: { eventId } }),
    prisma.people.count({ where: { target_accounts: { eventId } } }),
    prisma.sequence_enrollments.count({
      where: {
        people: { target_accounts: { eventId } },
        status: { not: "DRAFT" },
      },
    }),
    prisma.meetings.count({ where: { eventId } }),
    prisma.meetings.count({ where: { eventId, outcome: "WON" } }),
  ]);

  return NextResponse.json({
    funnel: [
      { stage: "Accounts", count: stages[0] },
      { stage: "Contacts", count: stages[1] },
      { stage: "Outreach", count: stages[2] },
      { stage: "Meetings", count: stages[3] },
      { stage: "Won", count: stages[4] },
    ],
    conversionRates: {
      accountsToContacts: stages[0] ? stages[1] / stages[0] : 0,
      contactsToOutreach: stages[1] ? stages[2] / stages[1] : 0,
      outreachToMeetings: stages[2] ? stages[3] / stages[2] : 0,
      meetingsToWon: stages[3] ? stages[4] / stages[3] : 0,
    },
  });
}
```

**Test**:

```typescript
it("should return funnel analytics", async () => {
  const response = await GET(mockRequest({ eventId: "manifest-2026" }));
  const data = await response.json();
  expect(data.funnel).toHaveLength(5);
  expect(data.conversionRates).toBeDefined();
});
```

**Validation**: Funnel chart displays accurate conversion rates.

---

### S4.2: Implement Report Export API

**Files**: `eventops/src/app/api/reports/export/route.ts` (NEW)

**Implementation**:

```typescript
export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) return unauthorized();

  const reportType = request.nextUrl.searchParams.get("type");
  const format = request.nextUrl.searchParams.get("format") || "csv";

  let data: Record<string, unknown>[];

  switch (reportType) {
    case "meetings":
      data = await prisma.meetings.findMany({
        include: { people: true, target_accounts: true },
      });
      break;
    case "outreach":
      data = await prisma.sequence_enrollments.findMany({
        include: { people: true, sequences: true },
      });
      break;
    default:
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 },
      );
  }

  if (format === "csv") {
    const csv = convertToCSV(data);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${reportType}-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? "")).join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
```

**Test**:

```typescript
it("should export meetings as CSV", async () => {
  const response = await GET(mockRequest({ type: "meetings", format: "csv" }));
  expect(response.headers.get("content-type")).toBe("text/csv");
  const csv = await response.text();
  expect(csv).toContain("id,");
});
```

**Validation**: CSV downloads and opens in Excel correctly.

---

### S4.3: Create Analytics Dashboard Page

**Files**: `eventops/src/app/dashboard/analytics/page.tsx` (UPDATE)

**Implementation**:

- Funnel visualization component
- Time-series charts for email activity
- Export buttons for each report type
- Real-time refresh every 30 seconds

**Test**: Manual - Dashboard loads in < 2 seconds, charts render correctly.

**Validation**: Analytics visible at a glance.

---

### S4.4: Add Cohort Analysis

**Files**: `eventops/src/app/api/analytics/cohort/route.ts` (UPDATE - add auth + real data)

**Implementation**:

```typescript
export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) return unauthorized();

  // Group accounts by creation week
  const accounts = await prisma.target_accounts.findMany({
    include: {
      meetings: true,
      people: {
        include: { sequence_enrollments: true },
      },
    },
  });

  const cohorts = groupByWeek(accounts);

  return NextResponse.json({ cohorts });
}
```

**Test**: Cohort chart shows week-over-week progression.

**Validation**: Can identify which acquisition cohorts convert best.

---

### S4 Sprint Validation Script

```bash
#!/bin/bash
# scripts/validate-s4.sh

echo "=== S4: Analytics Validation ==="

# 1. Test funnel API
FUNNEL=$(curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/analytics/funnel \
  -H "x-service-key: $SERVICE_TO_SERVICE_SECRET")
echo "Funnel stages: $(echo $FUNNEL | jq '.funnel | length')"

# 2. Test export
curl -s -o /tmp/meetings.csv https://yardflow-hitlist-production-2f41.up.railway.app/api/reports/export?type=meetings&format=csv \
  -H "x-service-key: $SERVICE_TO_SERVICE_SECRET"
wc -l /tmp/meetings.csv

# 3. Dashboard load time
START=$(date +%s%N)
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/dashboard/analytics > /dev/null
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))
echo "Dashboard load: ${DURATION}ms"

[ $DURATION -lt 3000 ] && echo "✅ S4 PASSED" || echo "❌ S4 TOO SLOW"
```

---

## Sprint S5: Production Hardening

**Goal**: Load tested, monitored, fully documented for Manifest 2026.  
**Demo**: 50 concurrent users, all metrics green, runbook complete.  
**Validation**: k6 load test passes, all checklists complete.

### S5.1: Run Load Test

**Files**: `eventops/scripts/load-test.js`

**Action**:

```bash
k6 run eventops/scripts/load-test.js
```

**Pass Criteria**:

- p95 response time < 500ms
- Error rate < 1%
- No memory leaks

**Validation**: k6 output shows all thresholds passed.

---

### S5.2: Configure Railway Health Alerts

**Platform**: Railway Dashboard + UptimeRobot

**Action**:

1. Set health check path to `/api/health`
2. Configure restart on 3 failures
3. Set up UptimeRobot for external monitoring

**Validation**: Receive test alert email.

---

### S5.3: Complete Pre-Event Checklist

**Files**: `docs/current/PRE_EVENT_CHECKLIST.md`

**Action**: Execute every checklist item, mark complete.

**Validation**: All checkboxes ticked.

---

### S5.4: Run Full E2E Test Suite

**Command**:

```bash
npx tsx eventops/scripts/e2e-production.ts
```

**Pass Criteria**: All 30+ tests pass.

**Validation**: Green checkmarks for all test categories.

---

### S5.5: Execute War Room Walkthrough

**Files**: `docs/current/WAR_ROOM_WALKTHROUGH.md`

**Action**: Complete all 7 walkthrough steps.

**Validation**: Final checklist signed off.

---

### S5.6: Practice Rollback Procedure

**Files**: `docs/current/ROLLBACK_PROCEDURE.md`

**Action**:

1. Create test branch with intentional break
2. Deploy to staging (or feature branch)
3. Execute rollback
4. Verify recovery

**Validation**: Rollback completes in < 5 minutes.

---

### S5.7: Seed Production Data

**Command**:

```bash
cd eventops && npx tsx prisma/seeds/manifest-2026.ts
```

**Validation**: 15 accounts, 22 contacts visible in dashboard.

---

### S5 Sprint Validation Script

```bash
#!/bin/bash
# scripts/validate-s5.sh

echo "=== S5: Production Hardening Validation ==="

# 1. Load test
k6 run eventops/scripts/load-test.js || exit 1

# 2. Health check
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq '.status' | grep -q "healthy" || exit 1

# 3. E2E tests
npx tsx eventops/scripts/e2e-production.ts || exit 1

# 4. Verify data
ACCOUNTS=$(curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/accounts \
  -H "x-service-key: $SERVICE_TO_SERVICE_SECRET" | jq 'length')
[ "$ACCOUNTS" -ge 15 ] || exit 1

echo "✅ S5 PASSED - READY FOR MANIFEST 2026"
```

---

## Appendix: Test Commands

```bash
# Run all unit tests
cd eventops && npm test

# Run agent tests only
npm run test:agents

# Run E2E against production
npx tsx scripts/e2e-production.ts

# Run smoke tests
bash tests/smoke/smoke-test.sh

# Run load test
k6 run scripts/load-test.js

# Run S2S integration test
bash ../scripts/test-s2s-integration.sh
```

---

## Appendix: Environment Variables

### Railway (YardFlow-Hitlist)

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
AUTH_SECRET=...
SERVICE_TO_SERVICE_SECRET=...
ALLOWED_ORIGINS=https://gtm-yard-flow.vercel.app
SENDGRID_API_KEY=SG....
GEMINI_API_KEY=...
```

### Vercel (gtm-yardflow)

```bash
RAILWAY_API_URL=https://yardflow-hitlist-production-2f41.up.railway.app
SERVICE_TO_SERVICE_SECRET=<same as Railway>
NEXT_PUBLIC_RAILWAY_URL=https://yardflow-hitlist-production-2f41.up.railway.app
```

---

_Document Version: 1.0_  
_Created: January 31, 2026_
