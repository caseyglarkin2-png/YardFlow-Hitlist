# Sprint 33: Rescue & Stabilize

## **Goal**
Restore production availability (200 OK) and establish a reliable verification pipeline.

## **Tasks**

### **33.1: Network Binding Fix (Production Access)**
- **Status**: Completed (Deployed)
- **Description**: Updated `start-production.sh` to bind via `HOSTNAME="0.0.0.0"`. Railway load balancers cannot reach `localhost`.
- **Validation**: `curl <prod_url>` returns 200 or 30x.

### **33.2: Liveness Probe (`/api/ping`)**
- **Status**: Completed (Deployed)
- **Description**: A zero-dependency endpoint that returns 200 OK if the Node.js process is active. Decouples "App is running" from "DB is working".
- **Validation**: `curl <prod_url>/api/ping` returns `{"status":"ok", "service":"yardflow-hitlist"}`.

### **33.3: Health Check Hardening (`/api/health`)**
- **Status**: Completed (Deployed)
- **Description**: Wrapped DB/Redis checks in strict `try/catch`. Endpoint now returns `503` (Degraded) instead of crashing with `500` if dependencies fail.
- **Validation**:
    - If DB is down: Returns 503 + `{"checks": {"database": {"status": "fatal"}}}`.
    - If DB is up: Returns 200 + `{"status": "healthy"}`.

### **33.4: DB Diagnostics Tooling**
- **Status**: Completed (Deployed)
- **Description**: Created `scripts/test-db-connection.ts` to run manual connectivity tests inside the container.
- **Validation**: Running `railway run npx tsx scripts/test-db-connection.ts` outputs connection latency.

---

## **Verification Routine**
Run this after deployment completes:

1. **Check Liveness**: `curl https://yardflow-hitlist-production-2f41.up.railway.app/api/ping`
2. **Check Health**: `curl https://yardflow-hitlist-production-2f41.up.railway.app/api/health`
3. **Attempt Login**: Go to `/login` and sign in.

## **Next Steps (Sprint 34)**
Once stable, proceed to:
1. Manifest Data Ingestion.
2. Worker Service Activation.
