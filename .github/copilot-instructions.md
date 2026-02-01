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
npm run lint      # Check for strict type errors
npm run dev       # Start local server
```

## 🔍 Codebase Patterns & Standards

### 1. Strict Typing & Linting (Non-Negotiable)
The project enforces strict ESLint rules that function as build breakers.
- **No Explicit Any**: Never use `: any`. Define interfaces or use constrained types (e.g., `Record<string, unknown>`).
  - *Bad*: `catch (error: any)`
  - *Good*: `catch (error)` check `if (error instanceof Error)`
- **Unused Variables**: Must be prefixed with `_`.
  - *Bad*: `export async function GET(req: NextRequest)` if `req` isn't used.
  - *Good*: `export async function GET(_req: NextRequest)`

### 2. Database & Redis (Lazy Init)
**CRITICAL**: Never initialize connections at the top level. It breaks build steps (Nixpacks).
Always use the singleton pattern with lazy getters.

```typescript
// ✅ Correct: src/lib/db.ts
// Import usage: import { prisma } from '@/lib/db';
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
```

### 3. API Route Standards
All API routes (`src/app/api/**/route.ts`) follow a strict pattern:
- **Dynamic Mode**: `export const dynamic = 'force-dynamic';`
- **Auth**: Use `authServiceOrSession(req)` to handle both User Sessions and Service-to-Service calls.
- **Error Handling**: Standardized JSON error responses.

```typescript
// ✅ Standard Entry Point
import { authServiceOrSession } from '@/lib/auth-service';

export async function POST(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ... logic
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### 4. AI Agents & Progress Reporting
Agents (in `src/lib/agents`) are long-running stateful processes.
- **State**: Use `AgentStateManager` to persist headers and task status.
- **Progress**: Agents **must** report progress % during execution via `agentStateManager.updateTaskStatus`.

### 5. Worker Integrity
- **Heartbeat**: The `getHeartbeatWorker` runs every 60s.
- **Self-Healing**: Workers include a `setInterval` loop to re-assert critical jobs.
- **Graceful Shutdown**: All workers listen for `SIGTERM`.

## 🚀 Deployment & Integrity
- **Verification**: Run `scripts/post-deploy-verify.sh` after major changes.
- **War Room Diagnostics**: Use `/api/email/stats` and `/api/health` to verify system pulse.
- **Duplicate Services**: **NEVER** create a duplicate Web service (e.g., `YardFlow-Web`).

## 🧪 Testing Patterns

- **Runner**: Vitest with `@/` path alias support.
- **Location**: `eventops/tests/`.
- **Mocking**: Use `vi.mock('@/lib/db', ...)` for database isolation.

## 🔐 Authentication Patterns

### Service-to-Service (S2S)
Used for communication between the Vercel Frontend and this Railway Backend.
- Headers: `x-service-key`, `x-user-id`.
- Handled transparently by `authServiceOrSession`.

### NextAuth v5 (Internal)
Used for direct dashboard access and internal tools.
- Helper: `import { auth } from '@/auth'`.

## 📁 Key File Locations

| Purpose | Path |
|---------|------|
| Database client | `src/lib/db.ts` |
| Auth Helper | `src/lib/auth-service.ts` |
| Redis connection | `src/lib/queue/client.ts` |
| Queue definitions | `src/lib/queue/queues.ts` |
| Worker processors | `src/lib/queue/workers.ts` |
| Agent implementations | `src/lib/agents/*.ts` |
| State manager | `src/lib/agents/state-manager.ts` |
| API Routes | `src/app/api/**/route.ts` |

## ⚠️ Common Pitfalls

1. **Lint Errors Blocking Build**: `any` types and unused variables (without `_`) will fail the build. Fix them proactively.
2. **Top-level Init**: Instantiating DB/Redis clients at module scope crashes the build.
3. **Missing `cd eventops`**: Commands fail silently at repo root.
4. **Environment Variables**: S2S calls fail without `SERVICE_TO_SERVICE_SECRET`.
