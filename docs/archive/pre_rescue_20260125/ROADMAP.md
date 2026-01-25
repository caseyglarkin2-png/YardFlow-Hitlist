# Product Roadmap & Execution Plan

**Current Phase**: Stabilization & Rescue
**Target Event**: Manifest 2026 (Feb 10-12, 2026)
**Production URL**: [https://yardflow-hitlist-production-2f41.up.railway.app](https://yardflow-hitlist-production-2f41.up.railway.app)

> **Status Update (Jan 2026)**: Project shifted to "Rescue Mode" to address production instability. Sprints re-aligned to prioritize health/logging before feature expansion.

## 📌 Active Sprints

### Sprint 32: Operation "Pulse Check" (Stability) - **CURRENT**
**Goal**: Production environment that is observable, resilient, and fails gracefully.
**Why**: Fix "Application failed to respond" errors.
**Tasks**:
- [ ] 32.1: Deep Health Check (/api/health/deep)
- [ ] 32.2: Database Connection Hardening
- [ ] 32.3: Container Binding & Shutdown
- [ ] 32.4: Structured JSON Logging

### Sprint 33: The Agent Engine (Foundation)
**Goal**: Reliable, database-backed asynchronous job execution.
**Tasks**:
- [ ] 33.1: `AgentJob` Schema
- [ ] 33.2: Queue Infrastructure & Worker Isolation
- [ ] 33.3: State Manager
- [ ] 33.4: Task Dashboard

### Sprint 34: Manifest Data Pipeline
**Goal**: High-throughput processing of the 2,000+ seeded companies.
**Tasks**:
- [ ] 34.1: Bulk Dispatcher
- [ ] 34.2: Enrichment Logic
- [ ] 34.3: Rate Limiting

### Sprint 35: Campaign Activation
**Goal**: Output generation and approval.
**Tasks**:
- [ ] 35.1: Template Engine
- [ ] 35.2: Approval Workflow

## 🏗️ Technical Principles
1.  **Atomicity**: Every task must be deployable and testable in isolation.
2.  **Validation**: No task is done without a purely automated verification step.
3.  **Observability**: If it breaks, logs must show *why* immediately.

---
*Last Updated: Jan 25, 2026*
