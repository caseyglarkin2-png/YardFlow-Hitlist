# Product Roadmap & Execution Plan

**Current Phase**: Stabilization & Event Prep
**Target Event**: Manifest 2026 (Feb 10-12, 2026)
**Production URL**: [https://yardflow-web-production.up.railway.app](https://yardflow-web-production.up.railway.app)

## 📌 Active Sprints

### Sprint 31: Manifest Intelligence (CURRENT)
**Focus**: Turn raw seeded data into actionable booth intelligence for Manifest 2026.
**Key Deliverables**:
- Manifest Meeting Request Generator (AI-powered)
- Sync Requests UI & Worker
- Mobile "Booth Mode" View
- Enriched Facility Data Schema

### Sprint 32: Agent Orchestration (NEXT)
**Focus**: Robust, observable, database-backed AI Agent entities.
**Key Deliverables**:
- `BaseAgent` Architecture & Database Schema
- BullMQ Dispatch System
- Agent Observability Dashboard
- Migration of Research Logic to Agent Pattern

### Sprint 33: Content Integration (PLANNED)
**Focus**: Inject external marketing assets from Flow State.
**Key Deliverables**:
- Content Hub Client with Redis Caching
- ROI Logic Service
- Content Purposing Agent

## 🏗️ Architecture Roadmap
- **Monorepo Strictness**: All ops in `/eventops`.
- **Agent Pattern**: Moving away from ad-hoc API routes to structured `AgentTask` records managed by background workers.
- **Validation**: Every atomic task requires a specific verification script or test.
- **Fail-Safe**: Rate limiting for AI services (Gemini).

---
*Last Updated: Jan 25, 2026*
