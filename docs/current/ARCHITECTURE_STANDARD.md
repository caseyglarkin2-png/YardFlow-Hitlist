# YardFlow Hitlist - Architecture Standard

## "One Monorepo, Two Services" Pattern

To ensure stability and scalability, YardFlow Hitlist uses a split-service architecture within a single monorepo. This allows us to scale the user-facing application independently from the background processing workers.

### 1. The Services

We deploy two distinct services on Railway from the same codebase:

1.  **Web App (`YardFlow-Hitlist`)**
    *   **Function**: Serves the Next.js UI and API routes.
    *   **Entry Point**: `eventops/start-production.sh`
    *   **Scaling**: Scales based on HTTP traffic.
    *   **Criticality**: Must remain responsive at all times.

2.  **Worker (`YardFlow-Worker`)**
    *   **Function**: Processes background jobs (BullMQ), runs AI agents.
    *   **Entry Point**: `eventops/start-worker.sh`
    *   **Scaling**: Scales based on Queue/CPU load.
    *   **Criticality**: Can be restarted without affecting user UX.

### 2. Configuration Rules

*   **Environment Variables**: Both services MUST share the same `DATABASE_URL`, `REDIS_URL`, and other core secrets.
*   **Build**: Both services build from the `eventops/` directory.
    *   Web App uses `next build` (standalone output).
    *   Worker uses the same source files (TSX/Node).

### 3. Deployment Configuration

**`railway.json` is the Source of Truth.**

Do not rely on default start commands inferred by buildpacks (Nixpacks/Heroku). We explicitly define start commands in `railway.json`:

*   **Web**: `"startCommand": "cd eventops && ./start-production.sh"`
*   **Worker**: Defined in separate Railway service settings or `railway-worker.json` if applicable.

### 4. Code & Directory Structure

*   All application code resides in `/eventops`.
*   Commands are run from `/eventops` (e.g., `npm run worker`).
*   **Lazy Initialization**: As per project instructions, database and Redis connections must be lazily initialized to prevent build-time failures.

### 5. Troubleshooting 502/Bad Gateway

If the Web App returns 502:
1.  **Check Port**: Ensure the app is binding to `0.0.0.0` and the correct `$PORT`.
2.  **Check Start Command**: Ensure it is NOT running `npm start` (which runs standard Next.js) but rather the Standalone server (`node .next/standalone/server.js`).
3.  **Check Logs**: Look for "BINDING TO PORT: XXXX" in the startup logs.
