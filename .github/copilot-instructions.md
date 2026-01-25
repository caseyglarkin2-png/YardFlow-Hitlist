# YardFlow Hitlist - AI Coding Agent Instructions

## Project Overview

Event-driven Account-Based Marketing (ABM) platform built for targeting high-value accounts at industry events (Manifest 2026). Core focus: **ship fast, ship often** with production deploys after every 60-120 min task.

**Production URL**: `https://yardflow-hitlist-production-2f41.up.railway.app`
**Tech Stack**: Next.js 14.2 (App Router), PostgreSQL, Prisma, Redis/BullMQ, NextAuth v5, Railway deployment, Nixpacks.  
**Philosophy**: Free services over paid ($0/month AI via Gemini Pro, pattern detection over Hunter.io API).

## Architecture Patterns

### Monorepo Structure

- **Root `/`**: deployment configs (`railway.json`, `Dockerfile.worker`)
- **App `/eventops`**: Next.js application & all source code
- **Protocol**:
  - Run all `npm` / `npx` commands from `/eventops` directory
  - Railway build commands: `cd eventops && ...`
  - Start Command: `HOST=0.0.0.0 PORT=8080 node .next/standalone/server.js`

### Database Access Pattern (`src/lib/db.ts`)

- **Rule**: Always import `prisma` from `@/lib/db`
- **Why**: Handles singleton pattern with `globalThis` caching to prevent connection exhaustion in serverless/dev environments.
- **Never**: Create new `new PrismaClient()` instances.

### Lazy Initialization (Critical for Railway/Nixpacks)

**Rule**: Never initialize Redis, database connections, or external API clients at module load time.
**Why**: Nixpacks builds hang if top-level code tries to connect to services.

```typescript
// ✅ CORRECT: Lazy accessor
let agentQueueInstance: Queue;
export const agentQueue = {
  get queue(): Queue {
    if (!agentQueueInstance) agentQueueInstance = new Queue('agents', { ... });
    return agentQueueInstance;
  },
  add: (...args) => agentQueue.queue.add(...args)
};

// ❌ WRONG: Top-level connection
export const queue = new Queue("name", { connection: redis }); // BLOCKS BUILD
```

### Agent Squad Architecture (EventOps GTM)

Independent AI workers coordinated via `agent_tasks` table and `BullMQ`.

**Component Map**:
- **State Manager**: `src/lib/agents/state-manager.ts` (Persists state to Postgres)
- **Orchestrator**: `src/lib/agents/orchestrator.ts` (Manages flow)
- **Workers**: `src/lib/queue/workers.ts` (Consumes jobs)

**Active Agents**:
1.  **Prospecting**: `prospecting-agent.ts` - Lead discovery & ICP scoring
2.  **Research**: `research-agent.ts` - Dossier generation (Redis cached)
3.  **Content**: `content-purposing-agent.ts` - Adaptation from Content Hub
4.  **Graphics**: `graphics-agent.ts` - Visual asset generation
5.  **Socials**: `socials-agent.ts` - LinkedIn post scheduling
6.  **Contracting**: `contracting-agent.ts` - Legal doc generation

**Integration**: Assets pulled from YardFlow Content Hub (`src/lib/yardflow-content-hub.ts`).

## Critical Workflows

## Deployment Critical Warnings

### Duplicate Services Warning
**CRITICAL**: Ensure there is only **ONE** web service running the main application (`YardFlow-Hitlist`).
Delete any duplicate services (e.g., `YardFlow-Web`) completely.
**Reason**: Multiple services booting simultaneously create race conditions during Prisma Migrations (`npx prisma migrate deploy`), causing database locks and boot crashes.

### Queue System (BullMQ)
- **Queues**: `enrichment`, `outreach`, `sequence-steps`, `agents`
- **Workers**: All defined in `src/lib/queue/workers.ts`
- **Add Job**: `await agentQueue.add("action-name", { ...data })`

### Testing
- **Unit**: `npm run test:unit` (Vitest)
- **E2E**: `npm run test:e2e` (Playwright)
- **Smoke**: `npm run test:smoke:local` (Bash script)

## Domain Rules & Gotchas

1.  **Agent Timeouts**: AI tasks run long. Do NOT set `timeout` in `defaultJobOptions` (deprecated in BullMQ v5). Handle concurrency in Worker options.
2.  **API Only**: Use `app/api/...` for backend logic. No Server Actions (Architecture decision).
3.  **Authentication**: Protect routes with `import { auth } from '@/auth'`.
4.  **Logging**: Use `import { logger } from '@/lib/logger'` for structured JSON logs (required for observability).
