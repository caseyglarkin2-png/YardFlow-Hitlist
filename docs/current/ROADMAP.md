# Product Roadmap & Execution Plan

**Current Phase**: Stabilization & Event Prep
**Target Event**: Manifest 2026 (Feb 10-12, 2026)

## 📌 Active Sprints

### Sprint 30: Production Hardening (CURRENT)
**Focus**: Deployment stability, observability, and "shipping fast" infrastructure.
- ✅ Railway Worker/Web Separation
- ✅ Health Checks & Monitoring (/api/health, /api/ping)
- 🔄 CI/CD Pipeline Gates (smoke tests)
- 🔄 Documentation Cleanup

### Sprint 31: Manifest Integration (NEXT)
**Focus**: Event-specific features for Manifest Vegas.
- [ ] Manifest Meeting Request Generator (250-char optimized)
- [ ] Facility Intelligence Integration (Warehouse counts)
- [ ] Booth Conversation Starters (AI-generated)
- [ ] "Meet us at Booth #1847" dynamic content

### Sprint 32: AI Agent Squad (PLANNED)
**Focus**: Automated GTM workflow agents.
- [ ] Prospecting Agent (Lead discovery)
- [ ] Research Agent (Dossier generation)
- [ ] Sequence Engineer (Campaign builder)

## 🔮 Future Phases

### Sprint 33: Content Hub Integration
**Focus**: Connecting to `flow-state-klbt.vercel.app` assets.
- ROI Calculator API integration
- Case study injection
- Dynamic asset personalization

### Sprint 34: Multi-Channel Orchestration
**Focus**: Coordinating Email, LinkedIn, and Phone steps.
- Sequence enrollment logic
- Cross-channel state tracking
- Reply detection & sentiment analysis

## 🏗️ Architecture Roadmap
- **Lazy Initialization**: Enforced for all external services (Redis, DB, AI).
- **Monorepo Strictness**: All ops in `/eventops`.
- **Testing**: Smoke tests -> Unit tests -> E2E.

---
*Last Updated: Jan 25, 2026 - Sprint 30*
