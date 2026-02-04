# YardFlow Hitlist - AI Coding Agent Instructions

## 🎯 Project Overview

**YardFlow Hitlist** is an event-driven Account-Based Marketing (ABM) platform backend.

- **Goal**: Target high-value accounts at events (Manifest 2026).
- **Core Philosophy**: **Ship Fast, Ship Often**. Deploy production updates incrementally via "Golden Deployments".
- **Production URL**: `https://yardflow-hitlist-production-2f41.up.railway.app`
- **Stack**: Next.js 14.2 (App Router), PostgreSQL (Prisma), Redis (BullMQ), NextAuth v5.

## 🏗️ Architecture: "One Monorepo, Two Services"

All code lives in `/eventops`, but runs as two distict services on Railway.

### 1. Web App (`YardFlow-Hitlist`)

- **Role**: Serves UI and API routes (Headless).
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
npm run lint      # Check for strict type errors (BUILD BREAKER)
npm run dev       # Start local server
```

**Verification Protocol**:

- Trust `npm run lint` over VS Code UI markers.
- Run `scripts/post-deploy-verify.sh` for integration sanity checks.

## 🔍 Codebase Patterns & Standards

### 1. Strict Typing & Linting (Non-Negotiable)

The project enforces strict ESLint rules that function as build breakers.

- **No Explicit Any**: Never use `: any`. Define interfaces or use constrained types (e.g., `Record<string, unknown>`).
  - _Bad_: `catch (error: any)`
  - _Good_: `catch (error)` check `if (error instanceof Error)`
- **Unused Variables**: Must be prefixed with `_`.
  - _Bad_: `export async function GET(req: NextRequest)` if `req` isn't used.
  - _Good_: `export async function GET(_req: NextRequest)`

### 2. Database & Redis (Lazy Initialization)

**CRITICAL**: Always use lazy initialization for external services. Top-level instantiation breaks Nixpacks builds.

```typescript
// ✅ Correct: src/lib/db.ts - lazy initialization pattern
// Import usage: import { prisma } from '@/lib/db';
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// ✅ Correct: src/lib/queue/client.ts - lazy getter
let redisConnection: Redis | null = null;
export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(config);
  }
  return redisConnection;
}
```

### 3. API Route Standards

All API routes (`src/app/api/**/route.ts`) follow a strict pattern:

- **Dynamic Mode**: `export const dynamic = 'force-dynamic';`
- **Auth**: Use `authServiceOrSession(req)` to handle both User Sessions and Service-to-Service calls.
- **Error Handling**: Standardized JSON error responses.

```typescript
// ✅ Standard Entry Point
import { authServiceOrSession } from "@/lib/auth-service";

export async function POST(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // ... logic
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### 4. AI Agents & Progress Reporting

Agents (in `src/lib/agents`) are long-running stateful processes.

- **Architecture**: Specialized squad (Prospecting, Research, Sequence, Content).
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

Used for communication between the Vercel Frontend (`GTM-YardFlow`) and this Railway Backend.

- **Primary Method**: `Authorization: Bearer <CRON_SECRET>` (Preferred for automated jobs/webhooks).
- **Secondary Method**: `x-service-key: <SERVICE_TO_SERVICE_SECRET>` (Internal services).
- **Context Headers**: `x-user-id` (optional) can be passed to impersonate users.
- Handled transparently by `authServiceOrSession`.

### NextAuth v5 (Internal)

Used for direct dashboard access and internal tools.

```typescript
// ✅ Session check pattern
import { auth } from "@/auth";

const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

## 📁 Key File Locations

| Purpose               | Path                              |
| --------------------- | --------------------------------- |
| Database client       | `src/lib/db.ts`                   |
| Auth Helper           | `src/lib/auth-service.ts`         |
| Redis connection      | `src/lib/queue/client.ts`         |
| Queue definitions     | `src/lib/queue/queues.ts`         |
| Worker processors     | `src/lib/queue/workers.ts`        |
| Agent implementations | `src/lib/agents/*.ts`             |
| State manager         | `src/lib/agents/state-manager.ts` |
| API Routes            | `src/app/api/**/route.ts`         |
| Webhooks              | `src/app/api/webhooks/**/*.ts`    |
| **AI Provider**       | `src/lib/ai/provider.ts`          |
| **AI Dossier Gen**    | `src/lib/ai/dossier-generator.ts` |
| **AI Chat Endpoint**  | `src/app/api/ai/chat/route.ts`    |

## ⚠️ Common Pitfalls

1. **Lint Errors Blocking Build**: `any` types and unused variables (without `_`) will fail the build. Fix them proactively.
2. **Top-level Init**: Instantiating DB/Redis clients at module scope crashes the build.
3. **Missing `cd eventops`**: Commands fail silently at repo root.
4. **Environment Variables**: S2S calls fail without `CRON_SECRET` or `SERVICE_TO_SERVICE_SECRET`. Ensure `SENDGRID_API_KEY` is present for email features.
5. **Prisma Model Access**: Use lowercase for Prisma client access (`prisma.meeting` not `prisma.Meeting`), even if model is defined as `model Meeting`. The `@@map("meetings")` directive maps to table name.
6. **Prisma Enums**: Import enums from `@prisma/client` (e.g., `import { OutreachStatus } from '@prisma/client'`), don't use string literals.

---

## 🤖 AI Endpoints (Brain System)

This backend powers the "Brain" AI assistant in the GTM-YardFlow frontend. **All AI API keys live here, not in Vercel.**

### AI Provider Architecture
- **Primary**: Gemini Pro via `GEMINI_API_KEY`
- **Fallback**: OpenAI via `OPENAI_API_KEY`  
- **Unified Provider**: `src/lib/ai/provider.ts` handles fallback automatically

### AI Endpoints (S2S Auth Required)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/chat` | GET/POST | Brain chat with context |
| `/api/ai/dossier/generate` | POST | Generate company dossiers |
| `/api/ai/content/generate` | POST | Email/content generation |
| `/api/ai/content/sequence` | POST | Multi-step email sequences |
| `/api/ai/score-icp` | POST | ICP scoring |
| `/api/ai/sentiment` | POST | Sentiment analysis |
| `/api/accounts/[id]/research` | POST | Company research |

### Cross-Repo Integration (GTM-YardFlow)
The Vercel frontend proxies all AI calls through Railway:
```
[GTM-YardFlow] → POST /api/ai/chat (Vercel proxy)
              → Authorization: Bearer RAILWAY_API_SECRET
              → [Railway] /api/ai/chat
              → [Gemini/OpenAI with fallback]
              → Response
```

**Critical**: GTM-YardFlow has NO AI API keys. All AI routes through Railway.

---

## Critical Patterns

### Database Access

- Use lazy initialization for Prisma client
- Always use: `import { prisma } from '@/lib/db'`

### Authentication

- Check auth in API routes: `const session = await auth()`
- Protect routes with session checks

### Deployment

- Railway deployment with auto-deploy from main
- All code lives in `/eventops` directory
