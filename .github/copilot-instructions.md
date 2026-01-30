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
// ✅ Correct: src/lib/db.ts (Prisma 7 with driver adapter)
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg({ pool });
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// ✅ Correct: Lazy Queue
export const agentQueue = {
  get queue() {
    if (!instance) instance = new Queue("agents"); // Init only when called!
    return instance;
  },
};
```

### Prisma 7 Configuration

**CRITICAL**: Prisma 7.3.0 requires specific configuration:
- **Schema**: `eventops/prisma/schema.prisma` - NO `url` in datasource block
- **Config**: `eventops/prisma.config.ts` - Contains `datasource.url`
- **Client**: Uses `@prisma/adapter-pg` driver adapter

```prisma
// ✅ Correct: schema.prisma (Prisma 7)
datasource db {
  provider = "postgresql"
  // NO url here - it's in prisma.config.ts
}
```

```typescript
// ✅ Correct: prisma.config.ts
import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL },
});
```

### Monorepo Structure (TWO package.json files)

**CRITICAL**: This repo has TWO package.json files:
1. **ROOT `/package.json`** - Minimal stub, NO dependencies. Just points to eventops.
2. **`/eventops/package.json`** - All actual dependencies including Prisma 7.3.0.

Railway's buildCommand (`railway.json`) runs `cd eventops && npm ci` to install from the correct location.

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
