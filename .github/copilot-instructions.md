# YardFlow Hitlist - AI Coding Agent Instructions

## 🎯 Project Overview
**YardFlow Hitlist** is an event-driven Account-Based Marketing (ABM) platform.
- **Goal**: Target high-value accounts at events (Manifest 2026).
- **Core Philosophy**: **Ship Fast, Ship Often**. Deploy production updates incrementally (60-120 min tasks).
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

## 🛠️ Developer Workflow
**ROOT RULE**: All commands must be run from the `eventops` directory.

```bash
cd eventops
npm install       # Install deps
npm run dev       # Start local server
npm run build     # Test production build
```

## 🔍 Codebase Patterns

### Database & Redis (Lazy Init)
**CRITICAL**: Never initialize connections at the top level. It breaks build steps (Nixpacks).
Always use the singleton pattern with lazy getters.

```typescript
// ✅ Correct: src/lib/db.ts
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// ✅ Correct: Lazy Queue
export const agentQueue = {
  get queue() {
    if (!instance) instance = new Queue('agents'); // Init only when called!
    return instance;
  }
}
```

### Next.js App Router Rules
1.  **Route Handlers**: `src/app/api/**/route.ts`
    - **MUST ONLY EXPORT**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, and config consts (`dynamic`, `revalidate`).
    - **FORBIDDEN**: Exporting utility functions or types. Move them to `src/lib/`.
2.  **Server Actions**: Forbidden. Use API Routes (`src/app/api`) for all backend logic to keep architecture clean and decoupled.

### AI Agent Squad (`src/lib/agents`)
- **Structure**: Independent agents coordinated via **BullMQ**.
- **State**: Persisted in Postgres via `AgentStateManager`.
- **Communication**: Queue-based (Prospecting -> Research -> Content).

## 🚀 Deployment & Config
- **Source of Truth**: `railway.json` dictates the build/start commands.
- **Build**: `output: 'standalone'` in `next.config.mjs` is required.
- **Memory**: Builds run with 4GB heap (`NODE_OPTIONS="--max-old-space-size=4096"`).
- **Duplicate Services**: **NEVER** create a duplicate Web service (e.g., `YardFlow-Web`). It causes race conditions during DB migrations.

## 🧪 Testing Strategy
- **Unit**: `npm run test:unit` (Vitest)
- **Validation**: Every task requires a verification script in `scripts/` (e.g., `verify-health-check-local.ts`).
- **Smoke**: `npm run test:smoke:local`

## 📝 Logging
- **Format**: Structured JSON via `src/lib/logger.ts`.
- **Usage**: `logger.info('Event occurred', { metadata })` instead of `console.log`.
