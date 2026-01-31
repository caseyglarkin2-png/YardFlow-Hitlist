# Prisma Major Version Upgrade Sprint

> **Status**: IN PROGRESS - DEPLOYMENT FIX APPLIED  
> **Created**: January 30, 2026  
> **Last Updated**: January 30, 2026 (5 failed builds → root cause found)  
> **Target**: Prisma 5.22.0 → 7.3.0  
> **Risk Level**: 🔴 HIGH - Two major version jumps  
> **Strategy**: Staged upgrade (5.x → 6.x → 7.x)

---

## 🔴 ROOT CAUSE ANALYSIS (5 Failed Builds)

### Problem
Railway builds failed with:
```
Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: Argument "url" is missing in data source block "db".
Prisma CLI Version : 5.22.0  ← OLD VERSION!
```

### Root Cause
**TWO package.json files with conflicting Prisma versions:**

| File | Prisma Version | Used By |
|------|---------------|---------|
| `/package.json` (ROOT) | `@prisma/client@5.18.0`, `prisma@5.18.0` | Nixpacks `npm ci` |
| `/eventops/package.json` | `@prisma/client@7.3.0`, `prisma@7.3.0` | Railway buildCommand |

**Failure Chain:**
1. Nixpacks sees ROOT `/package.json` → runs `npm ci`
2. ROOT has `postinstall: cd eventops && npx prisma generate`
3. postinstall runs with ROOT's Prisma 5.22.0 (from npm cache)
4. Prisma 5.x expects `url` in schema.prisma
5. Our schema has NO url (required for Prisma 7)
6. **BUILD FAILS**

### Fix Applied
```diff
- ROOT /package.json had all dependencies (including Prisma 5.18.0)
+ ROOT /package.json is now minimal stub with NO dependencies
+ All dependencies live in /eventops/package.json (Prisma 7.3.0)
```

---

## Executive Summary

Railway deployment logs show Prisma upgrade available: `5.22.0 → 7.3.0`. This is a **two major version upgrade** (skipping 6.x is not recommended). Prisma 7.x introduces significant breaking changes including:

- ESM-only modules
- Required driver adapters (no more built-in engine)
- New `prisma.config.ts` configuration file
- Database URL moved from schema to config

---

## Risk Assessment

| Factor | Risk | Mitigation |
|--------|------|------------|
| ESM migration | 🔴 HIGH | Next.js already ESM-compatible |
| Driver adapters | 🔴 HIGH | Use `@prisma/adapter-pg` |
| Import path changes | 🟡 MEDIUM | Update all `@prisma/client` imports |
| Build system | 🔴 HIGH | **TWO package.json files caused conflict** |
| Runtime | 🟢 LOW | Node 24.x exceeds requirements |
| Schema | 🟢 LOW | No reserved keyword conflicts |

---

## Pre-Flight Checklist

- [x] Node.js version: v24.11.1 (✅ exceeds v20.19.0 requirement)
- [x] TypeScript version: 5.5.0 (✅ exceeds v5.4.0 requirement)
- [x] No `$use()` middleware usage (✅ no migration needed)
- [x] No `NotFoundError` imports (✅ safe)
- [x] No Prisma `Bytes` fields (✅ Buffer changes won't affect us)
- [x] ROOT package.json stripped of dependencies
- [x] eventops/package.json has Prisma 7.3.0
- [x] db.ts uses getDatabaseUrl() helper
- [x] Dockerfiles copy prisma.config.ts
- [x] Verification script created (scripts/verify-prisma-7.ts)
- [ ] Railway build succeeds
- [ ] Production health check passes

---

## Commits Applied

| Commit | Description |
|--------|-------------|
| f79af57 | Strip ROOT package.json - was installing Prisma 5.18.0 |
| 3ae479a | Add root cause analysis to docs |
| 75403ed | Address subagent review findings (db.ts, Dockerfiles, verify script) |

---

## Stage 1: Upgrade to Prisma 6.x

**Goal**: Get to latest v6 as stable intermediate step.


### Task 1.1: Create Database Backup
```bash
cd eventops
npm run backup:create
```
- **Validation**: `backups/backup_*.sql` file created
- **Time**: 5 min

### Task 1.2: Create Feature Branch
```bash
git checkout -b feat/prisma-7-upgrade
```
- **Validation**: `git branch --show-current` returns `feat/prisma-7-upgrade`
- **Time**: 2 min

### Task 1.3: Upgrade Prisma Packages to v6
```bash
cd eventops
npm install @prisma/client@6
npm install -D prisma@6
```
- **Validation**: `npx prisma version` shows 6.x
- **Time**: 5 min

### Task 1.4: Generate Prisma Client v6
```bash
npx prisma generate
```
- **Validation**: No errors, client generated
- **Time**: 2 min

### Task 1.5: Test Local Build
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```
- **Validation**: "✓ Compiled successfully"
- **Time**: 5 min

### Task 1.6: Run Database Migration Check
```bash
npx prisma migrate status
```
- **Validation**: "Database schema is up to date"
- **Time**: 2 min

### Task 1.7: Test Dev Server
```bash
npm run dev &
sleep 5
curl http://localhost:3000/api/health
kill %1
```
- **Validation**: Health endpoint returns 200
- **Time**: 3 min

### Task 1.8: Run Unit Tests
```bash
npm run test:unit
```
- **Validation**: All tests pass
- **Time**: 5 min

**Stage 1 Checkpoint**: Prisma 6.x working locally ✅

---

## Stage 2: Upgrade to Prisma 7.x

**Goal**: Complete migration to v7 with driver adapters.

### Task 2.1: Install Prisma 7 and Driver Adapter
```bash
cd eventops
npm install @prisma/client@7 @prisma/adapter-pg
npm install -D prisma@7
npm install dotenv pg
```
- **Validation**: `npx prisma version` shows 7.x
- **Time**: 5 min

### Task 2.2: Create prisma.config.ts
Create file at `eventops/prisma.config.ts`:

```typescript
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  
  migrations: {
    path: 'prisma/migrations',
  },
  
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
```
- **Validation**: File exists and is valid TypeScript
- **Time**: 10 min

### Task 2.3: Update schema.prisma for v7
Modify `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Note**: Keep `url` in schema for backward compatibility during transition. Prisma 7 allows both approaches.

- **Validation**: `npx prisma validate` passes
- **Time**: 5 min

### Task 2.4: Update src/lib/db.ts for Driver Adapter
Update `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from './env';
import { logger } from '@/lib/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Lazy initialization following project patterns
function createPrismaClient(): PrismaClient {
  // Create connection pool
  const pool = globalForPrisma.pool ?? new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = pool;
  }

  // Create Prisma adapter
  const adapter = new PrismaPg({ pool });

  logger.info('🔌 Prisma Client Initialized with PrismaPg adapter');
  
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Alias for convenience
export const prisma = db;

// Graceful shutdown
export async function disconnectPrisma(): Promise<void> {
  await db.$disconnect();
  if (globalForPrisma.pool) {
    await globalForPrisma.pool.end();
  }
}
```
- **Validation**: TypeScript compiles without errors
- **Time**: 15 min

### Task 2.5: Add pg Types
```bash
npm install -D @types/pg
```
- **Validation**: No TS errors in db.ts
- **Time**: 2 min

### Task 2.6: Generate Prisma Client v7
```bash
npx prisma generate
```
- **Validation**: Client generated without errors
- **Time**: 3 min

### Task 2.7: Test Local Build
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```
- **Validation**: "✓ Compiled successfully"
- **Time**: 5 min

### Task 2.8: Test Database Connection
```bash
npx tsx scripts/test-db-connection.ts
```
- **Validation**: Script connects and queries successfully
- **Time**: 5 min

### Task 2.9: Test Dev Server with DB Operations
```bash
npm run dev &
sleep 5
curl http://localhost:3000/api/accounts
kill %1
```
- **Validation**: Returns accounts data (or 401 if auth required)
- **Time**: 5 min

### Task 2.10: Run Unit Tests
```bash
npm run test:unit
```
- **Validation**: All tests pass
- **Time**: 5 min

**Stage 2 Checkpoint**: Prisma 7.x working locally ✅

---

## Stage 3: Railway Deployment

**Goal**: Deploy v7 to production and validate.

### Task 3.1: Commit Changes
```bash
git add -A
git commit -m "feat(prisma): upgrade to Prisma 7.3.0 with driver adapter

BREAKING CHANGE: Prisma now uses PrismaPg driver adapter
- Upgraded from 5.22.0 → 6.x → 7.3.0
- Added @prisma/adapter-pg and pg pool
- Created prisma.config.ts
- Updated db.ts for driver adapter pattern
- All tests pass locally

Closes #prisma-upgrade"
```
- **Validation**: Commit created
- **Time**: 2 min

### Task 3.2: Push Feature Branch
```bash
git push -u origin feat/prisma-7-upgrade
```
- **Validation**: Branch pushed to GitHub
- **Time**: 2 min

### Task 3.3: Create PR and Merge to Main
```bash
git checkout main
git merge feat/prisma-7-upgrade
git push
```
- **Validation**: Main updated, Railway build triggered
- **Time**: 5 min

### Task 3.4: Monitor Railway Build
Watch Railway dashboard for build status.
- **Validation**: Build completes successfully
- **Time**: 10 min

### Task 3.5: Validate Production Health
```bash
curl https://yardflow-hitlist-production-2f41.up.railway.app/api/health
```
- **Validation**: Returns healthy status with database check
- **Time**: 2 min

### Task 3.6: Run Production Smoke Tests
```bash
cd eventops
npm run test:smoke:prod
```
- **Validation**: All smoke tests pass
- **Time**: 5 min

**Stage 3 Checkpoint**: Prisma 7.x deployed to Railway ✅

---

## Rollback Plan

If any stage fails:

### Stage 1 Rollback (Prisma 6):
```bash
git checkout main
npm install @prisma/client@5.22.0
npm install -D prisma@5.22.0
npx prisma generate
```

### Stage 2/3 Rollback (Prisma 7):
```bash
git revert HEAD  # Revert the upgrade commit
git push
# Railway will auto-deploy the reverted version
```

---

## Environment Variables (No Changes Needed)

Prisma 7 supports reading `DATABASE_URL` from:
1. `prisma.config.ts` (recommended)
2. `.env` file (still works)
3. Environment variables (Railway provides this)

No new env vars required for this upgrade.

---

## Post-Upgrade Cleanup

After successful deployment:

1. **Delete feature branch**: `git branch -d feat/prisma-7-upgrade`
2. **Update documentation**: Note Prisma 7 in tech stack
3. **Monitor for 24h**: Watch for any runtime errors

---

## Success Criteria

1. ✅ Prisma CLI shows version 7.3.0+
2. ✅ All API endpoints respond correctly
3. ✅ Database queries work (reads + writes)
4. ✅ Railway build succeeds
5. ✅ Production health check passes
6. ✅ Smoke tests pass
7. ✅ No runtime errors in Railway logs

---

## Estimated Timeline

| Stage | Tasks | Duration |
|-------|-------|----------|
| Stage 1 | Upgrade to v6 | 30 min |
| Stage 2 | Upgrade to v7 | 45 min |
| Stage 3 | Deploy | 25 min |
| **Total** | | **~100 min** |

---

*Document Version: 1.0*  
*Created: 2026-01-30*
