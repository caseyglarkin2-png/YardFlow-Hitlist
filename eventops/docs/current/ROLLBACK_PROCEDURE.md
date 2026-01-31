# Emergency Rollback Procedure (SOP)

**Context**: Fast recovery during Manifest 2026.
**Standard**: "Fail Forward" is preferred, but "Rollback" is the safety net.

## 1. Railway Platform Rollback (Primary Method)
If a bad deploy hits production (e.g. White screen of death, 500 loop):

1.  **Open Railway Dashboard**: Go to [YardFlow - Hitlist Project](https://railway.app).
2.  **Select Service**: Click on `YardFlow-Hitlist` (Web App).
3.  **Deployments Tab**: Click the "Deployments" tab in the top bar.
4.  **Identify Last Good Build**: Look for the previous green checkmark ✅.
5.  **Trigger Rollback**:
    *   Click the three dots `...` on the right of the good deployment.
    *   Select **Rollback**.
6.  **Verify**: Watch the build logs. Once active, refresh the production URL.

## 2. Database Considerations
Railway code rollbacks **DO NOT** revert database migrations.

*   **Scenario A: Additive Change (Safe)**
    *   If the bad deploy added a table/column, rolling back code is safe. The old code just ignores the new DB schema.
*   **Scenario B: Destructive Change (Unsafe)**
    *   If you renamed/deleted a column, the old code might crash.
    *   **Action**: You must likely "Fix Forward" (deploy a fix) rather than rollback.

## 3. Communication
1.  **Notify**: Post in `#dev-alerts` (Slack).
2.  **Status**: "Rolling back to previous stable version due to [reason]."
