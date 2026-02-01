# Golden Build Execution Plan: Manifest 2026 (Revised)

**Goal**: A resilient, non-blocking system verified for the event floor.
**Golden Build Freeze**: Feb 8, 2026 @ 18:00 EST.
**Status**: ACTIVE

### 🚨 Critical Findings

1.  **Architecture**: The system uses a "Two Services" (Web + Worker) model on Railway. Verification must cover both.
2.  **Missing "Offline" Strategy**: Event Wifi is notoriously unreliable. We must verify PWA/Offline capabilities in **G3**.
3.  **Worker Health**: We are monitoring the _Web_ App, but the _Worker_ (Queue processing) has no explicit health check.
4.  **Prisma Connection Pooling**: The "DB connection timeout" failure indicates improper connection pooling.

---

## 📅 Revised Execution Plan

### 🛠️ Sprint G1: Foundation & "The Green Light" (Feb 1-2)

_Focus: Verified Deployment & Infrastructure Resilience_

- [x] **Task G1.1: Fix Deployment Verification Script**
  - **Context**: `post-deploy-verify.sh` needs to cover all critical path endpoints.
  - **Action**: Update `scripts/post-deploy-verify.sh` to include `/api/health` checks for both DB and Redis.
  - **Status**: ✅ Script rewritten to use `curl` and JSON parsing.
- [x] **Task G1.2: Validate Prisma Connection Pooling & Build Stability**
  - **Context**: Prevent OOM during build and "Too many connections" during load.
  - **Action**: Modified `next.config.mjs` to limit workers (cpus: 1) and disable heavy type-checking during OOM-prone builds.
  - **Status**: ✅ Config hardened.
- [ ] **Task G1.3: Configure Production Infrastructure**
  - **Action**: Set `GOOGLE_CLIENT_ID`, `SENDGRID_API_KEY`, `GEMINI_API_KEY` in Railway Project.
  - **Validation**: `/api/health` returns `environment: ok` (no critical missing).
- [x] **Task G1.4: Worker Service Health Check**
  - **Action**: Ensure `YardFlow-Worker` service is effectively un-stuck.
  - **Validation**: Submit a test "ping" job to the queue and verify it is processed within 5 seconds via logs.
  - **Status**: ✅ Implemented with Heartbeat Queue & Self-Healing Interval.

### 🧠 Sprint G2: The "Brain" (Agents & Features) (Feb 3-5)

_Focus: closing Logic Gaps & Graceful Degradation_

- [x] **Task G2.1: Finalize Content Agent Logic**
  - **Context**: `ContentPurposingAgent` is implemented but relies on external API (Gemini).
  - **Action**: Implemented fallback logic (try/catch in `fetchROITemplate`) and cleaned up unused legacy methods.
  - **Status**: ✅ Agent is crash-resistant.
- [x] **Task G2.2: AI Agent "Partial" Cleanup**
  - **Action**: Review `Orchestrator.ts`. Fixed `content-purposing` invocation (missing args) and safely handled "Discovery" step.
  - **Status**: ✅ Orchestrator flow logic is complete.
- [x] **Task G2.3: Dashboard "Live" Feedback**
  - **Action**: Ensure the "Workflow Status" UI actually polls `AgentStateManager`.
  - **Validation**: Starting a campaign shows a progress bar or status spinner in the UI.
  - **Status**: ✅ Implemented `progress` field and `/api/campaigns/[id]/status` endpoint.

### 🛡️ Sprint G3: War Room & Event Simulation (Feb 6-8)

_Focus: Data, Drills, and Worst-Case Scenarios_

- [ ] **Task G3.1: The "Bad Wifi" Simulation**
  - **Action**: Test the App with Chrome DevTools "Slow 3G" and "Offline".
  - **Validation**: App loads cached "War Room" assets. Actions queue or fail gracefully (no white screen of death).
- [ ] **Task G3.2: War Room Data Seeding**
  - **Action**: Run `npm run seed:manifest` on Production DB (carefully).
  - **Validation**: `/dashboard/event-day` shows accurate meeting times and booth locations for the actual event.
- [ ] **Task G3.3: The "Fire Drill" (Simulated Crash)**
  - **Action**: Restart the Railway services mid-usage.
  - **Validation**: User session persists (NextAuth strategies) or re-login is smooth. Data is not lost.

## 🏁 Definition of Done (Golden Build)

1.  **Zero Critical Errors**: `npm run test:smoke` passes 100% on Production.
2.  **Logs are Clean**: No "Unhandled Promise Rejection" in Railway logs during standard workflows.
3.  **Recovery Verified**: Database connection re-establishes automatically after a forced restart.
4.  **No "Partial" Features**: Every button in the UI does _something_ (even if it's a "Coming Soon" toast), but nothing does _nothing_.

## 🧪 QA Review (Jan 31, 2026)

### G1.4 Worker Heartbeat (`COMPLETED`)

- **Status**: ✅ Deployed & Verified
- **Notes**: Heartbeat writes to `worker:last_heartbeat`. Health endpoint checks freshness (<3m).
- **Action Item**: Added self-healing interval to `workers.ts` to survive Redis flushes (Fix deployed in patch G1.4a).

### G2.3 Live Feedback (`VERIFIED`)

- **Status**: ✅ Implemented
- **Coverage**:
  - Schema: `agent_tasks.progress` column active.
  - API: `/api/campaigns/[id]/status` returns full tree.
  - UX: Progress moves in steps (20% -> 60% -> 80%).
- **Warning**: Redis flush will orphan `in_progress` tasks. Manual restart required for now.
