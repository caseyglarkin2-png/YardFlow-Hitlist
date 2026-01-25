# Sprint 32: Operation "Pulse Check" (Stability & Observability)

**Goal**: A production environment that never "fails silently" and recovers automatically.
**Context**: App currently experiencing "Failed to respond" errors.
**Theory**: Likely connection exhaustion (Prisma) or incorrect PORT binding in container.

## 📋 Task List

### Task 32.1: Deep Health Check Endpoint
- **Type**: Backend Feature
- **Files**: `src/app/api/health/deep/route.ts`
- **Spec**:
  - Implement GET `/api/health/deep`.
  - Check 1: `await prisma.$queryRaw\`SELECT 1\``
  - Check 2: `await redis.ping()`
  - Timeout: 5 seconds max.
  - Return: `200 OK` (JSON details) or `503 Service Unavailable`.
- **Verification**: `curl -f https://yardflow-hitlist-production-2f41.up.railway.app/api/health/deep` returns `{"status":"ok", "db":"connected", "redis":"connected"}`.

### Task 32.2: Database Connection Hardening
- **Type**: DevOps / Config
- **Files**: `src/lib/db.ts`, `.env.production`
- **Spec**:
  - Update `src/lib/db.ts` to log connection initialization.
  - Verification Script: Ensure `connection_limit` is set in connection string or constrained in `PrismaClient` initialization to max 5-10 (Railway shared limit is often low).
  - Ensure `globalForPrisma` pattern is strictly followed to prevent hot-reload connection leaks.
- **Verification**: Check logs for "Prisma Client Initialized". Run `bash scripts/verify-db-connection.sh` (needs creation).

### Task 32.3: Container Binding & Shutdown
- **Type**: DevOps
- **Files**: `start.sh`, `Dockerfile`
- **Spec**:
  - Update startup command to: `exec node server.js` (use `exec` to pass signals).
  - Explicitly set `HOSTNAME=0.0.0.0` in `railway.json` or `start.sh`.
  - Handle `SIGTERM` in `server.js` (if custom) or trust Next.js defaults.
- **Verification**: Deploy and verify logs show "Ready on 0.0.0.0:PORT".

### Task 32.4: Structured JSON Logging
- **Type**: Observability
- **Files**: `src/lib/logger.ts`
- **Spec**:
  - Replace `console.log` with a structured logger (`pino` or `winston`).
  - Output format: `{"level":"info","msg":"...","timestamp":"..."}`.
  - Why: Railway parses JSON logs for better filtering.
- **Verification**: Use `railway logs` CLI to see structured output.

### Task 32.5: Resilient Startup Strategy
- **Type**: DevOps
- **Files**: `eventops/start-production.sh`, `railway.json`
- **Spec**:
  - Script attempting database migrations but proceeding to start server on failure.
  - Ensures application becomes "healthy" (responding to HTTP) even if DB is down.
  - Allows `/api/health` to return 503 instead of 502/Crash.
  - Logs migration failures prominently in JSON format.
- **Verification**: Application starts even if `DATABASE_URL` is invalid (tested via env var override).

## 🧪 Acceptance Criteria
- [ ] `/api/health/deep` returns 200 on Production.
- [ ] No "Connection limit exceeded" errors in logs for 24h.
- [ ] Application recovers from Redis restart contentiously.
