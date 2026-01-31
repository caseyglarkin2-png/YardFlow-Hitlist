# Golden Build Execution Plan: Manifest 2026 (Revised)

**Goal**: A resilient, non-blocking system verified for the event floor.
**Golden Build Freeze**: Feb 8, 2026 @ 18:00 EST.
**Status**: ACTIVE

### 🚨 Critical Findings
1.  **Architecture**: The system uses a "Two Services" (Web + Worker) model on Railway. Verification must cover both.
2.  **Missing "Offline" Strategy**: Event Wifi is notoriously unreliable. We must verify PWA/Offline capabilities in **G3**.
3.  **Worker Health**: We are monitoring the *Web* App, but the *Worker* (Queue processing) has no explicit health check.
4.  **Prisma Connection Pooling**: The "DB connection timeout" failure indicates improper connection pooling.

---

## 📅 Revised Execution Plan

### 🛠️ Sprint G1: Foundation & "The Green Light" (Feb 1-2)
*Focus: Verified Deployment & Infrastructure Resilience*

- [ ] **Task G1.1: Fix Deployment Verification Script**
    - **Context**: `post-deploy-verify.sh` needs to cover all critical path endpoints.
    - **Action**: Update `scripts/post-deploy-verify.sh` to include `/api/health` checks for both DB and Redis.
    - **Validaton**: Script runs successfully against production.
- [ ] **Task G1.2: Validate Prisma Connection Pooling**
    - **Context**: Prevent "Too many connections" during high concurrent loads.
    - **Action**: Verify `src/lib/db.ts` uses `PrismaPg` with `pg.Pool`. Ensure `connection_limit` is set in headers or env vars appropriately for Railway.
    - **Validation**: `k6` load test shows stable connection count.
- [ ] **Task G1.3: Configure Production Infrastructure**
    - **Action**: Set `GOOGLE_CLIENT_ID`, `SENDGRID_API_KEY`, `GEMINI_API_KEY` in Railway Project.
    - **Validation**: `/api/health` returns `environment: ok` (no critical missing).
- [ ] **Task G1.4: Worker Service Health Check**
    - **Action**: Ensure `YardFlow-Worker` service is effectively un-stuck.
    - **Validation**: Submit a test "ping" job to the queue and verify it is processed within 5 seconds via logs.

### 🧠 Sprint G2: The "Brain" (Agents & Features) (Feb 3-5)
*Focus: closing Logic Gaps & Graceful Degradation*

- [ ] **Task G2.1: Finalize Content Agent Logic**
    - **Context**: `ContentPurposingAgent` is implemented but relies on external API (Gemini).
    - **Action**: Implement fallback logic. If Content Hub fails or returns empty, use a hardcoded "Safe Default" sequence blueprint.
    - **Validation**: Run agent with network disabled -> Returns default sequence (Doesn't crash).
- [ ] **Task G2.2: AI Agent "Partial" Cleanup**
    - **Action**: Review `Orchestrator.ts`, `SequenceAgent`, and `ResearchAgent`. Ensure all `TODO` comments that affect runtime are resolved or wrapped in `try/catch`.
    - **Validation**: `runFullCampaign` executes Steps 1-5 without throwing an unhandled exception.
- [ ] **Task G2.3: Dashboard "Live" Feedback**
    - **Action**: Ensure the "Workflow Status" UI actually polls `AgentStateManager`.
    - **Validation**: Starting a campaign shows a progress bar or status spinner in the UI.

### 🛡️ Sprint G3: War Room & Event Simulation (Feb 6-8)
*Focus: Data, Drills, and Worst-Case Scenarios*

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
4.  **No "Partial" Features**: Every button in the UI does *something* (even if it's a "Coming Soon" toast), but nothing does *nothing*.
