# Railway Deployment Fix & Platform Reunification Sprint Plan

> **Status**: ACTIVE - S0 VERIFIED ✅
> **Created**: January 31, 2026
> **Last Updated**: January 31, 2026
> **Philosophy**: Ship Fast, Ship Often - Atomic, testable tasks
> **Goal**: Fix Railway builds, stabilize Prisma 7, unify with GTM-YardFlow

---

## Executive Summary

### Current Status ✅

**YardFlow-Hitlist is ONLINE and HEALTHY!**

```json
{
  "status": "healthy",
  "database": { "status": "ok", "latencyMs": 62 },
  "redis": { "status": "ok", "latencyMs": 2 },
  "queues": { "status": "ok" }
}
```

Verified: January 31, 2026 via `curl /api/health`

### What Was Broken

Both Railway services (YardFlow-Hitlist and YardFlow-Worker) are failing to build due to Docker `COPY` commands not finding files. The root cause is **conflicting Railway configuration files**.

### Root Cause Chain

```
1. Railway has TWO config file types: .toml and .json
2. .toml files OVERRIDE .json files (undocumented behavior)
3. Our .toml files lacked `dockerfileContext` setting
4. Docker built from repo root instead of eventops/
5. COPY prisma ./prisma/ → looked at /prisma/ (doesn't exist)
6. Actual location: /eventops/prisma/
```

### Configuration File Conflict Matrix

| File                         | Location | Builder    | Context     | Status                   |
| ---------------------------- | -------- | ---------- | ----------- | ------------------------ |
| `.railway.toml`              | root     | DOCKERFILE | eventops ✅ | FIXED                    |
| `railway.json`               | root     | DOCKERFILE | eventops    | Overridden by .toml      |
| `railway-worker.json`        | root     | DOCKERFILE | eventops    | Overridden by .toml      |
| `railway-worker-config.json` | root     | NIXPACKS   | -           | DELETE                   |
| `eventops/railway.toml`      | eventops | dockerfile | . ✅        | FIXED                    |
| `eventops/nixpacks.toml`     | eventops | -          | -           | Not used with Dockerfile |

### Fix Applied (Commit ad0285b)

```toml
# /.railway.toml - Worker service
[build]
dockerfileContext = "eventops"  # ← ADDED

# /eventops/railway.toml - Web service
[build]
dockerfileContext = "."  # ← ADDED
```

---

## Sprint Overview

| Sprint   | Theme                   | Tasks | Demoable Outcome                          | Status  |
| -------- | ----------------------- | ----- | ----------------------------------------- | ------- |
| **S0**   | Emergency Build Fix     | 4     | Both services deploy successfully         | ✅ DONE |
| **S0.5** | Verify Build            | 1     | Health checks pass                        | ✅ DONE |
| **S3**   | Commit Uncommitted Work | 2     | All local changes safely committed        | ⏳ NEXT |
| **S1**   | Configuration Cleanup   | 2     | Single source of truth for Railway config | 🔜      |
| **S2**   | Prisma 7 Stabilization  | 3     | Database operations work in production    | 🔜      |
| **S4**   | Platform Reunification  | 4     | GTM-YardFlow can call Railway APIs        | 🔜      |

> **Sprint Order Changed**: S3 now comes before S1 (per TPM review)
> **Rationale**: Commit security fixes before deleting config files

---

## Sprint S0: Emergency Build Fix ✅ COMPLETED

**Goal**: Get both Railway services building successfully.

**Demo**: Railway dashboard shows both services as "Online".

### Task S0.1: Add dockerfileContext to Root .railway.toml ✅

- **File**: `/.railway.toml`
- **Change**: Add `dockerfileContext = "eventops"`
- **Commit**: ad0285b
- **Validation**:
  ```bash
  grep -q 'dockerfileContext.*eventops' .railway.toml && echo "PASS"
  ```

### Task S0.2: Add dockerfileContext to eventops/railway.toml ✅

- **File**: `/eventops/railway.toml`
- **Change**: Add `dockerfileContext = "."`
- **Commit**: ad0285b
- **Validation**:
  ```bash
  grep -q 'dockerfileContext' eventops/railway.toml && echo "PASS"
  ```

### Task S0.3: Add prisma.config.ts COPY to Both Dockerfiles ✅

- **Files**: `/Dockerfile.worker`, `/eventops/Dockerfile`
- **Change**: `COPY prisma.config.ts ./`
- **Commit**: ad0285b
- **Validation**:
  ```bash
  grep -q 'COPY prisma.config.ts' Dockerfile.worker && echo "Worker PASS"
  grep -q 'COPY prisma.config.ts' eventops/Dockerfile && echo "Web PASS"
  ```

### Task S0.4: Restore prisma.config.ts ✅

- **File**: `/eventops/prisma.config.ts`
- **Change**: Recreate file (was deleted in c78844d)
- **Commit**: ad0285b
- **Validation**:
  ```bash
  test -f eventops/prisma.config.ts && echo "PASS"
  ```

**Sprint S0 Validation**:

```bash
# Wait for Railway builds, then:
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq .
# Expected: {"status":"ok",...}
```

---

## Sprint S0.5: Verify Build Success ✅ COMPLETED

**Goal**: Confirm Railway builds succeeded before proceeding.

**Demo**: Health endpoints return healthy status.

### Task S0.5.1: Verify YardFlow-Hitlist Health ✅

- **Command**:
  ```bash
  curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq .
  ```
- **Result**:
  ```json
  {
    "status": "healthy",
    "database": { "status": "ok" },
    "redis": { "status": "ok" }
  }
  ```
- **Verified**: January 31, 2026

**Sprint S0.5 Validation**: ✅ PASSED

---

## Sprint S3: Commit Uncommitted Work (MOVED BEFORE S1)

**Goal**: Safely commit all local changes before cleanup.

**Demo**: `git status` shows clean working tree.

**Rationale**: TPM review recommended committing security fixes (auth on 12+ routes) before deleting config files.

### Task S3.1: Commit All Platform Reunification Changes

- **Files**: All 24 modified files
- **Command**:

  ```bash
  git add -A
  git commit -m "feat(platform): S2S auth, CORS, route protection, Prisma 7

  - Add authServiceOrSession to 12+ API routes
  - Configure CORS for GTM-YardFlow cross-origin
  - Update middleware OPTIONS handling
  - Prisma 7 driver adapter in db.ts
  - Content hub client centralization
  - Documentation updates"
  ```

- **Validation**: `git log --oneline -1` shows commit
- **Dependencies**: S0.5 verified

### Task S3.2: Push and Trigger Deploy

- **Command**: `git push origin main`
- **Validation**: Railway starts new build, health check still passes
- **Dependencies**: S3.1

**Sprint S3 Validation**:

```bash
git status
# Expected: "nothing to commit, working tree clean"
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq .status
# Expected: "healthy"
```

---

## Sprint S1: Configuration Cleanup (CONSOLIDATED)

**Goal**: Establish single source of truth for Railway configuration.

**Demo**: Only .toml config files remain, no conflicts.

### Task S1.1: Delete All Obsolete Railway JSON Files

- **Files to Delete**:
  - `/railway-worker-config.json` (uses NIXPACKS, conflicts)
  - `/railway.json` (overridden by .toml)
  - `/railway-worker.json` (overridden by .toml)
- **Command**:
  ```bash
  rm -f railway-worker-config.json railway.json railway-worker.json
  git add -A
  git commit -m "chore: remove obsolete railway .json configs - .toml is authoritative"
  git push origin main
  ```
- **Validation**:
  ```bash
  ls railway*.json 2>/dev/null | wc -l
  # Expected: 0
  ```
- **Dependencies**: S3 complete (uncommitted work saved first)

### Task S1.2: Document Configuration in README

- **File**: `/README.md`
- **Action**: Add section explaining Railway config file precedence
- **Content**:

  ```markdown
  ## Railway Configuration

  Railway config uses `.toml` files (which override `.json` files):

  - `/.railway.toml` → YardFlow-Worker service
  - `/eventops/railway.toml` → YardFlow-Hitlist (Web) service

  **CRITICAL**: Never create `.json` config files - they will be ignored.
  ```

- **Validation**: Manual review, commit pushed
- **Dependencies**: S1.1

**Sprint S1 Validation**:

```bash
# Count Railway config files
find . -name "railway*.json" -o -name "*.railway.toml" -o -name "railway.toml" 2>/dev/null | grep -v node_modules
# Expected: Only .railway.toml and eventops/railway.toml
```

---

## Sprint S2: Prisma 7 Stabilization (CONSOLIDATED)

**Goal**: Ensure Prisma 7 works correctly in production with driver adapter.

**Demo**: Database queries execute successfully in production.

### Task S2.1: Run Prisma 7 Verification Script

- **File**: `/eventops/scripts/verify-prisma-7.ts` (already exists)
- **Command**:
  ```bash
  cd eventops && npx tsx scripts/verify-prisma-7.ts
  ```
- **Expected Output**: All checks pass
- **Validation**: Exit code 0
- **Dependencies**: S3 committed (db.ts changes deployed)

### Task S2.2: Verify Production Database Connectivity

- **Command**:
  ```bash
  curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/events | jq 'length'
  ```
- **Expected**: Returns number (array length), not error
- **Validation**: Response is valid JSON array
- **Dependencies**: S2.1

### Task S2.3: Create Production Validation Script

- **File**: `/eventops/scripts/validate-production.sh`
- **Content**:

  ```bash
  #!/bin/bash
  set -e
  PROD_URL="https://yardflow-hitlist-production-2f41.up.railway.app"

  echo "=== Production Validation ==="

  echo "1. Health Check..."
  curl -sf "$PROD_URL/api/health" | jq -e '.status == "healthy"' > /dev/null && echo "✅ Health OK"

  echo "2. Database Check..."
  curl -sf "$PROD_URL/api/events" | jq -e 'type == "array"' > /dev/null && echo "✅ Database OK"

  echo "3. Prisma Version Check..."
  curl -sf "$PROD_URL/api/health" | jq -e '.checks.database.status == "ok"' > /dev/null && echo "✅ Prisma OK"

  echo "=== All Checks Passed ==="
  ```

- **Validation**: Script runs without errors
- **Dependencies**: S2.2

**Sprint S2 Validation**:

```bash
cd eventops && chmod +x scripts/validate-production.sh && ./scripts/validate-production.sh
# Expected: "All Checks Passed"
```

---

## Sprint S4: Platform Reunification Prep (CONSOLIDATED)

**Goal**: Enable GTM-YardFlow (Vercel) to call Railway APIs.

**Demo**: Browser fetch from gtm-yard-flow.vercel.app to Railway succeeds.

### Task S4.1: Set Environment Variables in Railway

- **Platform**: Railway Dashboard → YardFlow-Hitlist → Variables
- **Variables to Set**:
  | Variable | Value | Purpose |
  |----------|-------|---------|
  | `ALLOWED_ORIGINS` | `https://gtm-yard-flow.vercel.app,https://flow-state-klbt.vercel.app` | CORS allowed origins |
  | `SERVICE_TO_SERVICE_SECRET` | `openssl rand -base64 32` | S2S auth key |
- **Also Set In**: GTM-YardFlow Vercel project (same SERVICE_TO_SERVICE_SECRET)
- **Validation**: Check Railway dashboard shows variables
- **Dependencies**: S3 complete (CORS code deployed)

### Task S4.2: Test CORS Preflight

- **Command**:
  ```bash
  curl -I -X OPTIONS \
    -H "Origin: https://gtm-yard-flow.vercel.app" \
    https://yardflow-hitlist-production-2f41.up.railway.app/api/accounts
  ```
- **Expected Headers**:
  ```
  Access-Control-Allow-Origin: https://gtm-yard-flow.vercel.app
  Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
  ```
- **Validation**: Headers present in response
- **Dependencies**: S4.1

### Task S4.3: Test S2S Auth

- **Command**:
  ```bash
  curl -s \
    -H "x-service-key: $SERVICE_TO_SERVICE_SECRET" \
    -H "x-user-id: test@example.com" \
    https://yardflow-hitlist-production-2f41.up.railway.app/api/accounts | jq .
  ```
- **Expected**: 200 response with accounts data (not 401)
- **Validation**: Response is valid JSON, not auth error
- **Dependencies**: S4.1, S3.4 (auth code deployed)

### Task S4.4: Create Integration Test Script

- **File**: `/scripts/test-s2s-integration.sh`
- **Content**:

  ```bash
  #!/bin/bash
  set -e

  PROD_URL="https://yardflow-hitlist-production-2f41.up.railway.app"
  ORIGIN="https://gtm-yard-flow.vercel.app"

  echo "=== S2S Integration Test ==="

  # Test 1: CORS preflight
  echo "1. Testing CORS preflight..."
  CORS=$(curl -sf -I -X OPTIONS -H "Origin: $ORIGIN" "$PROD_URL/api/accounts" 2>&1)
  echo "$CORS" | grep -q "Access-Control-Allow-Origin" && echo "✅ CORS OK" || echo "❌ CORS FAIL"

  # Test 2: S2S auth (requires SECRET env var)
  if [ -n "$SERVICE_TO_SERVICE_SECRET" ]; then
    echo "2. Testing S2S auth..."
    STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
      -H "x-service-key: $SERVICE_TO_SERVICE_SECRET" \
      -H "x-user-id: test@example.com" \
      "$PROD_URL/api/accounts")
    [ "$STATUS" = "200" ] && echo "✅ S2S Auth OK" || echo "❌ S2S Auth FAIL (status: $STATUS)"
  else
    echo "2. Skipping S2S auth test (no SECRET set)"
  fi

  echo "=== Test Complete ==="
  ```

- **Validation**: `chmod +x scripts/test-s2s-integration.sh && ./scripts/test-s2s-integration.sh`
- **Dependencies**: S4.2, S4.3

**Sprint S4 Validation**:

```bash
# Full integration test
./scripts/test-s2s-integration.sh
# Expected: All tests pass
```

---

## Risk Register

| Risk                                    | Likelihood | Impact   | Mitigation                                                                 |
| --------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------- |
| Railway ignores .toml dockerfileContext | Medium     | High     | Test locally with `docker build --file Dockerfile.worker .` from eventops/ |
| Prisma 7 runtime errors                 | Low        | High     | Extensive local testing before deploy                                      |
| CORS blocks legitimate requests         | Medium     | Medium   | Log all CORS rejections, adjust ALLOWED_ORIGINS                            |
| S2S secret leaked                       | Low        | Critical | Rotate secret monthly, use Railway's secret management                     |
| Database connection pool exhaustion     | Low        | High     | Configure pool limits in db.ts, monitor connections                        |

---

## Rollback Procedures

### If S0 Fails (Build Errors)

```bash
# Revert to last known working commit
git revert ad0285b
git push origin main
```

### If S2 Fails (Prisma Errors)

```bash
# Downgrade to Prisma 5
cd eventops
npm install prisma@5.22.0 @prisma/client@5.22.0
npm uninstall @prisma/adapter-pg pg
# Update db.ts to remove driver adapter
# Delete prisma.config.ts
git add -A && git commit -m "revert: downgrade to Prisma 5" && git push
```

### If S4 Fails (CORS/Auth Errors)

```bash
# Disable CORS (allow all)
# In Railway: set ALLOWED_ORIGINS=*
# Or revert middleware changes
git revert <commit-hash>
git push origin main
```

---

## Validation Checklist

### Pre-Deploy

- [ ] All `.toml` files have `dockerfileContext`
- [ ] `prisma.config.ts` exists and has correct content
- [ ] `db.ts` uses PrismaPg driver adapter
- [ ] Local `npx prisma generate` succeeds
- [ ] Local `npm run build` succeeds in eventops/

### Post-Deploy

- [ ] Railway dashboard shows both services "Online"
- [ ] `/api/health` returns `{"status":"ok"}`
- [ ] `/api/events` returns data (not error)
- [ ] CORS preflight returns correct headers
- [ ] S2S auth with secret key works

### Integration

- [ ] GTM-YardFlow can fetch from Railway with S2S key
- [ ] Browser fetch from Vercel origin succeeds
- [ ] No console CORS errors in browser

---

## Appendix: File Location Reference

```
/workspaces/YardFlow-Hitlist/
├── .railway.toml              # Worker service config (AUTHORITATIVE)
├── Dockerfile.worker          # Worker Dockerfile
├── docs/
│   └── current/
│       ├── RAILWAY_FIX_SPRINT_PLAN.md  # This file
│       └── PLATFORM_REUNIFICATION_PLAN.md
└── eventops/
    ├── railway.toml           # Web service config (AUTHORITATIVE)
    ├── Dockerfile             # Web Dockerfile
    ├── prisma.config.ts       # Prisma 7 config
    ├── prisma/
    │   ├── schema.prisma      # Database schema
    │   └── migrations/
    ├── package.json           # Dependencies
    └── src/
        ├── lib/
        │   ├── db.ts          # Prisma client
        │   └── auth-service.ts # S2S auth helper
        └── app/
            └── api/           # API routes
```
