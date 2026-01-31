# YardFlow Hitlist - AI Coding Agent Instructions

## 🎯 Project Overview

**YardFlow Hitlist** is an event-driven Account-Based Marketing (ABM) platform.

- **Goal**: Target high-value accounts at events (Manifest 2026).
- **Core Philosophy**: **Ship Fast, Ship Often**. Deploy production updates incrementally.
- **Production URL**: `https://yardflow-hitlist-production-2f41.up.railway.app`
- **Stack**: Next.js 14.2 (App Router), PostgreSQL (Prisma), Redis (BullMQ), NextAuth v5.

## 🏗️ Architecture: "One Monorepo, Two Services"

All code lives in `/eventops`, but runs as two distict services on Railway.

### 1. Web App (`YardFlow-Hitlist`)
- **Role**: Serves UI and API routes.
- **Entry**: `eventops/start-production.sh` (Using Next.js Standalone mode).
- **Criticality**: Must never block. 502s are unacceptable.

### 2. Worker Service (`YardFlow-Worker`)
- **Role**: Process async jobs, AI agents, and scrapers.
- **Entry**: `eventops/start-worker.sh`.
- **Scaling**: Independent from web traffic.
- **Liveness**: Must run a "Heartbeat" job every 60s to `worker:last_heartbeat`.

## 🛠️ Developer Workflow

**ROOT RULE**: All commands must be run from the `eventops` directory.

```bash
cd eventops
npm install       # Install deps
npm run dev       # Start local server
npm run build     # Test production build (single-threaded: cpus:1)
```

## 🔍 Codebase Patterns

### 1. Database & Redis (Lazy Init)
**CRITICAL**: Never initialize connections at the top level. It breaks build steps (Nixpacks).
Always use the singleton pattern with lazy getters.

```typescript
// ✅ Correct: src/lib/db.ts
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// ✅ Correct: src/lib/queue/queues.ts
export const agentQueue = {
  get queue() {
    if (!instance) instance = new Queue("agents");
    return instance;
  },
};
```

### 2. Prisma 7 Configuration
**CRITICAL**: Prisma 7.3.0 requires specific configuration:
- **Schema**: `eventops/prisma/schema.prisma` - NO `url` in datasource block.
- **Config**: `eventops/prisma.config.ts` - Contains `datasource.url`.
- **Client**: Uses `@prisma/adapter-pg`.

### 3. AI Agents & Progress Reporting
Agents (in `src/lib/agents`) are long-running stateful processes.
- **State**: Use `AgentStateManager` to persist headers.
- **Progress**: Agents **must** report progress % during execution.

```typescript
// ✅ Correct: Reporting progress in orchestrator
await agentStateManager.updateTaskStatus(taskId, 'in_progress', undefined, undefined, 20); // 20%
```

### 4. Worker Integrity
- **Heartbeat**: The `getHeartbeatWorker` runs every 60s.
- **Self-Healing**: Workers include a `setInterval` loop to re-assert critical jobs (surviving Redis flushes).
- **Graceful Shutdown**: All workers listen for `SIGTERM`.

### 5. Next.js App Router Rules
- **Route Handlers**: `src/app/api/**/route.ts`.
- **No Server Actions**: Use API Routes for backend logic.
- **Auth**: Protect routes with `auth()` from `src/auth.ts`.

## 🚀 Deployment & Integrity
- **Verification**: Run `scripts/post-deploy-verify.sh` after major changes.
- **War Room Diagnostics**: Use `/api/email/stats` and `/api/health` to verify system pulse.
- **Duplicate Services**: **NEVER** create a duplicate Web service (e.g., `YardFlow-Web`).

## 🧪 Testing Patterns

### Test Framework
- **Runner**: Vitest with `@/` path alias support.
- **Location**: `eventops/tests/` with subdirectories:
  - `agents/` - Unit tests for AI agents
  - `integration/` - API and database integration tests
  - `smoke/` - Quick production health checks
  - `e2e/` - End-to-end flows

### Running Tests
```bash
cd eventops
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test agents/            # Run agent tests only
```

### Test Patterns
```typescript
// ✅ Correct: Use describe/it from vitest
import { describe, it, expect, vi } from 'vitest';

describe('AgentOrchestrator', () => {
  it('should execute workflow steps', async () => {
    // Mock external dependencies
    vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
  });
});
```

## 🤖 AI Agent Architecture

### Agent Types (8 Total)
| Agent | Purpose | Status |
|-------|---------|--------|
| `ProspectingAgent` | Discover leads from events | ✅ Implemented |
| `ResearchAgent` | Generate company dossiers | ✅ Implemented |
| `SequenceEngineerAgent` | Design outreach sequences | ✅ Implemented |
| `ContentPurposingAgent` | Adapt marketing content | 🚧 Stub |
| `GraphicsAgent` | Generate visual assets | 🚧 Stub |
| `SocialsAgent` | Social media coordination | 🚧 Stub |
| `ContractingAgent` | Generate deal documents | 🚧 Stub |
| `AgentOrchestrator` | Coordinates all agents | ✅ Implemented |

### Agent State Management
All agents use `AgentStateManager` for:
- Task creation and tracking via `agent_tasks` table
- Progress reporting (0-100%)
- Retry logic with exponential backoff
- Parent-child task relationships

```typescript
// Creating a task
const task = await agentStateManager.createTask({
  agentType: 'research',
  inputData: { accountId: 'xxx' },
  accountId: 'xxx',
});

// Updating status with progress
await agentStateManager.updateTaskStatus(task.id, 'in_progress', undefined, undefined, 50);
```

### Workflow API
- **GET** `/api/agents/workflow/[workflowId]` - Get workflow status
- **POST** `/api/agents/workflow/[workflowId]` - Retry failed step (body: `{ stepName }`)

## 🔐 Authentication Patterns

### NextAuth v5 (Internal Users)
```typescript
import { auth } from '@/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Use session.user.id
}
```

### Service-to-Service Auth (External Services)
For calls from `gtm-yardflow` (Vercel frontend):
```typescript
// Required headers
const headers = {
  'x-service-key': process.env.SERVICE_TO_SERVICE_SECRET,
  'x-user-id': userId,
  'x-user-email': userEmail, // Optional
};
```

## 📊 Logging Standards

Use the structured JSON logger for all operations:
```typescript
import { logger } from '@/lib/logger';

logger.info('Processing request', { accountId, action: 'research' });
logger.error('Failed to process', { error: error.message, stack: error.stack });
```

## 📁 Key File Locations

| Purpose | Path |
|---------|------|
| Database client | `src/lib/db.ts` |
| Redis connection | `src/lib/queue/client.ts` |
| Queue definitions | `src/lib/queue/queues.ts` |
| Worker processors | `src/lib/queue/workers.ts` |
| Agent implementations | `src/lib/agents/*.ts` |
| State manager | `src/lib/agents/state-manager.ts` |
| Orchestrator | `src/lib/agents/orchestrator.ts` |
| Rate limiter | `src/lib/rate-limit.ts` |
| Auth config | `src/lib/auth.ts` |
| Prisma schema | `prisma/schema.prisma` |

## ⚠️ Common Pitfalls

1. **Top-level DB/Redis init**: Causes build failures. Always use lazy initialization.
2. **Missing `cd eventops`**: Commands fail silently at repo root.
3. **Server Actions**: Not used. All backend logic in API routes.
4. **Duplicate package.json edits**: Only edit `eventops/package.json`.
5. **Hardcoded URLs**: Use environment variables for all external services.
6. **Missing progress updates**: Long-running agents must report progress %.

