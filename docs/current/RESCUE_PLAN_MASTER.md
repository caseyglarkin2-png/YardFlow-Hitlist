# OPERATION GREEN LIGHT: RESCUE PLAN MASTER

> **STATUS**: CRITICAL
> **DATE**: 2026-01-25
> **DRIVER**: GitHub Copilot (Technical Program Manager)
> **OBJECTIVE**: Resolve Production 502 Errors & Establish Reliable Delivery Pipeline.

## 0. EXECUTIVE SUMMARY
We are currently in a **deployment crisis**. The Railway production environment reports "Success" on build but fails at runtime with `502 Bad Gateway` / `Application Error`. This implies the process starts but is unreachable by the Railway load balancer.

**Root Cause Hypothesis**: Next.js Standalone mode defaults to `localhost` (`127.0.0.1`), but Dockerized environments generally require binding to `0.0.0.0` to accept external traffic from the reverse proxy.

**Decision**: All previous sprint plans (30-32) are effectively frozen. We are pivoting to **Sprint 33: Rescue & stabilize**.

---

## 📅 SPRINT 33: THE RESCUE (Current)
**Goal**: Get a generic "Hello World" or Health Check responding 200 OK on Production.

### 🔴 TASK 33.1: FIX NETWORK BINDING (HIGHEST PRIORITY)
The `start-production.sh` script executes `node server.js` without explicit host binding.
- **Action**: Modify `eventops/start-production.sh`.
- **Change**: Ensure `HOSTNAME` environment variable is set to `0.0.0.0`.
- **Reference**: `exec env HOSTNAME="0.0.0.0" node server.js`
- **Verification**: Logs must show "Listening on 0.0.0.0:3000".

### 🟡 TASK 33.2: VERIFY HEALTH CHECK
Ensure we have a route that creates zero database load for validity checks.
- **Action**: Verify/Create `src/app/api/health/route.ts`.
- **Requirement**: Return `{ status: 'ok', env: 'production' }`.
- **Verification**: `curl <prod_url>/api/health` returns 200.

### 🟡 TASK 33.3: DATABASE CONNECTIVITY CHECK
Once the web server is reachable (no 502), we will immediately face DB connection issues as the app boots.
- **Action**: Run `prisma migrate status` or a custom DB check script in the production container context.
- **Verification**: App logs do not show `P1001` or connection timeouts on boot.

### 🟢 TASK 33.4: SMOKE TEST LOGIN
- **Action**: Log in manually using the Google Auth provider (NextAuth).
- **Verification**: Successful redirect to Dashboard.

---

## 🔮 FUTURE SPRINTS (Post-Rescue)

### SPRINT 34: DATA INGESTION (Next)
*Prerequisite: Stable Production Environment*
1.  **Manifest Upload**: Admin UI to upload CSV.
2.  **Parsing Logic**: Backend processing of CSV to DB.
3.  **HubSpot Sync**: Hourly sync of "Target" accounts.

### SPRINT 35: AGENT ACTIVATION
1.  **Worker Service**: Enable `YardFlow-Worker`.
2.  **Agent Queue**: Connect BullMQ to Redis.
3.  **Scrapers**: Enable Python/Node scrapers for LinkedIn/Website data.

---

## 📂 DOCUMENTATION CLEANUP STRATEGY
The following documentation is declared **OBSOLETE** and will be moved to `docs/archive/pre_rescue_20260125/`:

- `docs/current/SPRINT_30_*`
- `docs/current/SPRINT_31_*`
- `docs/current/SPRINT_32_*`
- `docs/current/COMPREHENSIVE_SPRINT_PLAN.md`
- `docs/current/REVISED_ROADMAP.md` (Replaced by this Master Plan)
- `docs/current/ROADMAP.md`

**Retained in `docs/current/`**:
- `RESCUE_PLAN_MASTER.md` (This file)
- `ARCHITECTURE_STANDARD.md` (Still valid)
- `PROJECT_PRINCIPLES.md` (Still valid)
- `MANUAL_RAILWAY_SETUP.md` (Reference)
- `STATUS.md` (Needs update, but keep for history)

---

## 🛠️ IMMEDIATE EXECUTION COMMANDS

```bash
# 1. Archive old docs
mkdir -p docs/archive/pre_rescue_20260125
mv docs/current/SPRINT_* docs/archive/pre_rescue_20260125/
mv docs/current/*ROADMAP* docs/archive/pre_rescue_20260125/
mv docs/current/COMPREHENSIVE_SPRINT_PLAN.md docs/archive/pre_rescue_20260125/

# 2. Apply Fix (Agent to perform)
# Edit eventops/start-production.sh
```
