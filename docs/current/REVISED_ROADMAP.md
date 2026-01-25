# Revised Project Rescue Plan: YardFlow Hitlist

**Current Status**: Critical Instability ("System fails to respond").
**Immediate Priority**: Stabilization (Sprint 32) followed by Asynchronous Architecture (Sprint 33).

## Sprint 32: Operation "Pulse Check" (Stability & Observability)
**Goal**: A production environment that never "fails silently" and recovers automatically.

### Task 32.1: Deep Health Check Endpoint
- **Action**: Create `app/api/health/deep/route.ts`.
- **Implementation**:
  - Perform `Promise.all([prisma.$queryRaw\`SELECT 1\`, redis.ping()])`.
  - Set a 3-second timeout for the checks.
  - Return `200 OK` { status: 'healthy' } or `503 Service Unavailable` { status: 'unhealthy', details: ... }.
- **Verification**: `curl -f -v https://yardflow-hitlist-production-2f41.up.railway.app/api/health/deep` returns 200.

### Task 32.2: Database Connection Pooling
- **Action**: Optimize Prisma connection logic for Serverless/Container constraints.
- **Implementation**:
  - Update `DATABASE_URL` in Railway to append `&connection_limit=10` (or appropriate limit for the plan).
  - Ensure `src/lib/db.ts` uses the `globalThis` pattern (already present, verify usage).
  - **Validation**: Check Railway Metrics for active connections remaining flat during load test.
- **Verification**: Run `npm run test:smoke` and monitor `pg_stat_activity`.

### Task 32.3: Process Binding & Signal Handling
- **Action**: Update `start.sh` (or `railway.json` start command).
- **Implementation**:
  - Ensure explicitly binding to `0.0.0.0` (required for Docker networking).
  - Use `exec` to run the node process so it receives `SIGTERM` signals for graceful shutdown.
  - Command: `exec node .next/standalone/server.js` (for standalone build).
- **Verification**: Deploy and check logs for "Listening on 0.0.0.0:8080".

### Task 32.4: Structured Logging (JSON)
- **Action**: Replace `console.log` with a structured logger.
- **Implementation**:
  - Install `pino` and `pino-logfmt`.
  - Create `src/lib/logger.ts` configuration.
  - Middleware to log HTTP requests (method, url, duration, status).
- **Verification**: View Railway logs. Logs should be valid JSON objects, not plain text lines.

---

## Sprint 33: The Agent Engine
**Goal**: Reliable background processing decoupled from the web server.

### Task 33.1: Database Schema for Jobs
- **Action**: Add `AgentJob` model to `schema.prisma`.
- **Implementation**:
  ```prisma
  model AgentJob {
    id        String   @id @default(cuid())
    type      String   // e.g. "enrich_company", "generate_dossier"
    status    String   @default("pending") // pending, active, completed, failed
    payload   Json
    result    Json?
    error     String?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }
  ```
- **Verification**: `npx prisma migrate dev --name init_agent_job` && `npx prisma studio` shows the table.

### Task 33.2: Worker Infrastructure
- **Action**: Finalize the isolated Worker Service.
- **Implementation**:
  - Ensure `src/lib/queue/workers.ts` is the entry point.
  - Configure `concurrency` options in BullMQ Worker to prevent memory spikes (start with 1-5).
  - Ensure `railway-worker.json` points to this entry point.
- **Verification**: `npm run worker` locally prints "Worker started".

### Task 33.3: State Manager
- **Action**: Implement `AgentStateManager` class.
- **Implementation**:
  - `createJob(type, payload)`: Creates DB record -> add to Queue.
  - `updateStatus(jobId, status, data)`: Updates DB record.
  - Use Redis for immediate transient state if needed, but DB for persistence.
- **Verification**: Call `AgentStateManager.createJob()` in a script, check DB for new row.

### Task 33.4: Operator Dashboard
- **Action**: Simple UI to view Agent Jobs.
- **Implementation**:
  - Page `/ops/jobs`: Table of `AgentJob` rows.
  - Auto-refresh every 5s or use a Server Action `refresh()` button.
  - Show "JSON View" of payload/result.
- **Verification**: Visit `/ops/jobs` and see the "Hello World" job from Task 33.3.

---

## Sprint 34: Manifest Data Pipeline
**Goal**: High-throughput processing of the 2,000+ seeded companies.

### Task 34.1: Ingestion / Dispatch
- **Action**: "Bulk Dispatch" capability.
- **Implementation**:
  - Create script `scripts/dispatch-manifest-jobs.ts`.
  - Iterate all `ManifestCompany` entries.
  - Create an `enrich_company` job for each.
- **Verification**: Run script, observe queue count > 2000 in BullMQ/Redis.

### Task 34.2: Enrichment Agent Logic
- **Action**: Implement the `enrich_company` worker processor.
- **Implementation**:
  - Mock implementation first: Wait 1s, update `AgentJob.result` with `{ enriched: true }`.
  - Actual implementation: Fetch data, update `CompanyDossier`.
- **Verification**: Jobs move from `pending` -> `completed` in Dashboard.

### Task 34.3: Rate Limiting & Throttling
- **Action**: Protect external APIs.
- **Implementation**:
  - Configure BullMQ `limiter` option on the Queue: `{ max: 5, duration: 1000 }` (5 req/sec).
- **Verification**: Dispatch 100 jobs. Measure completion time (should be ~20s, not instant).

---

## Sprint 35: Campaign Activation
**Goal**: Generating value (Emails/PDFs).

### Task 35.1: Template Engine
- **Action**: Email generation logic.
- **Implementation**:
  - Use `react-email` or simple template literals.
  - Inject data from `CompanyDossier`.
- **Verification**: Generate a sample email, log the HTML output.

### Task 35.2: Approval UI
- **Action**: Human-in-the-loop workflow.
- **Implementation**:
  - Add `approvalStatus` to `Campaign` or `Outreach`.
  - UI buttons: "Approve for Sending", "Reject".
- **Verification**: Click "Approve", check DB status update.
