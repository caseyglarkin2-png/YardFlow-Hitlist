# Canonized Priority List - YardFlow Hitlist

> **Source of Truth for All Agents (User & AI)**
> **Last Updated**: January 31, 2026
> **Goal**: Unify development efforts towards Manifest 2026 success.

## 🚨 Top Priority: Platform Integration (Sprint U4/R7)

**Goal**: Enable GTM Frontend (Vercel) to successfully call Railway Backend APIs.

1.  **Environment Configuration** (P0)
    - Ensure `SERVICE_TO_SERVICE_SECRET` and `ALLOWED_ORIGINS` are set on Railway.
    - Ensure GTM Vercel project has `RAILWAY_API_URL` and `SERVICE_TO_SERVICE_SECRET`.
2.  **CORS Verification** (P0)
    - Confirm CORS Preflight (`OPTIONS`) returns correct headers for Vercel origin.
    - Confirm 200 OK for S2S authenticated requests.
3.  **Frontend Updates** (P1)
    - Update GTM Codebase (`gtm-yard-flow`) to use `railwayClient` (as defined in `GTM_INTEGRATION_GUIDE.md`).

## ⚠️ Secondary Priority: Pre-Event Hardening (Sprint U5)

**Goal**: Ensure system stability and data readiness for the event.

1.  **Data Import** (P0)
    - Seed "Manifest 2026" attendee list.
2.  **War Room Mode** (P0)
    - Verify full-screen toggle and readability improvements (Completed in U1, verify in prod).
3.  **Runbook & Monitoring** (P1)
    - Verify `api/health` and `api/queue/status` are monitoring correctly.

## 📝 Ongoing: Documentation & Standards

- **Architecture**: Default to "One Monorepo, Two Services" (Railway Backend + Vercel Frontend).
- **Code**: Use `authServiceOrSession` for all new API routes.
- **Tools**: Use `content-hub.ts` for asset management.
