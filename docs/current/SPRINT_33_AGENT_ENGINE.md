# Sprint 33: The Agent Engine (Foundation)

**Goal**: Reliable, database-backed asynchronous job execution.
**Context**: Moving away from "fire-and-forget" API routes to persistent `AgentJob` records.

## 📋 Task List

### Task 33.1: Database Schema & Migration
- **Type**: Database
- **Files**: `prisma/schema.prisma`
- **Spec**:
  - Add model `AgentJob` {
    id: String (uuid)
    type: String (enum: RESEARCH, OUTREACH, ENRICHMENT)
    status: String (enum: PENDING, RUNNING, COMPLETED, FAILED)
    input: Json
    output: Json?
    logs: Json[]
    createdAt: DateTime
    updatedAt: DateTime
  }
- **Verification**: `npx prisma migrate dev --name add_agent_job` succeeds.

### Task 33.2: Queue Infrastructure
- **Type**: Backend Pattern
- **Files**: `src/lib/queue/agent-queue.ts`, `src/lib/queue/agent-worker.ts`
- **Spec**:
  - `agentQueue`: New BullMQ Queue('agent-tasks').
  - `agentWorker`: New Worker that processes 'agent-tasks'.
  - **Critical**: Worker must be defined in a file that does NOT import Next.js app components (to avoid build loops).
- **Verification**: `await agentQueue.add('test', {})` -> Worker logs processing.

### Task 33.3: State Manager Service
- **Type**: Application Logic
- **Files**: `src/lib/agents/state-manager.ts`
- **Spec**:
  - `createJob(type, input)` -> Creates DB record + Adds to Queue.
  - `updateJobStatus(id, status, result?)` -> Updates DB.
- **Verification**: Unit test calling `createJob` creates both DB entry and BullMQ job.

### Task 33.4: Agent Dashboard
- **Type**: UI
- **Files**: `src/app/dashboard/agents/jobs/page.tsx`
- **Spec**:
  - Server Component rendering `prisma.agentJob.findMany()`.
  - Auto-refresh or "Refresh" button.
  - Show Status badges (Green/Red/Yellow).
- **Verification**: Visit `/dashboard/agents/jobs` and see the test jobs from 33.2.

## 🧪 Acceptance Criteria
1.  Developer can run `scripts/test-agent-flow.ts` which:
    - Creates a job.
    - Waits for completion.
    - Asserts DB status is COMPLETED.
    - Asserts Output is present.
