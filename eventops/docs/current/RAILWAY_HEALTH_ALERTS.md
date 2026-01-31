# Railway Health & Alerting Strategy (U5.2)

## 🚨 Core Infrastructure Alerts (Railway)

We monitor **YardFlow-Hitlist** (Web) and **YardFlow-Worker** (Background) services.

### 1. Resource Thresholds
Configure these alerts in the Railway Project Settings -> Alerts:

| Metric | Threshold | Severity | Indication | Recommended Action |
|---|---|---|---|---|
| Memory Usage | > 85% | 🟠 High | Impending OOM Kill. Node heap limit is 4GB (`--max-old-space-size=4096`). | Scale vertically (add RAM) or investigate memory leaks. |
| CPU Usage | > 90% | 🔴 Critical | Stuck process / Loop | Restart service. Check logs for infinite loops in Worker. |
| Storage | > 80% | 🟡 Warning | Log bloat / Temp files | Prune logs or increase volume size. |
| Health Check | Failure | 🔴 Critical | Service Down | **IMMEDIATE ACTION**. See Runbook. |

### 2. Application Health Endpoint (`/api/health`)

We have implemented a custom health check that probes all dependencies.

**URL**: `https://<your-domain>/api/health`
**Method**: `GET`
**Frequency**: Every 1 minute (via UptimeRobot or Railway Health Check)

#### Response States

**✅ Healthy (200 OK)**
System is fully operational.
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "ok", "latencyMs": 12 },
    "redis": { "status": "ok", "latencyMs": 4 },
    "queues": { "enrichment": { ... } }
  }
}
```

**⚠️ Degraded (200 OK)**
Critical for Web App availability. Even if DB is slow/down, we serve the UI (static shell).
*   **Scenario**: Database timeout.
*   **Action**: Web App stays UP. Admin alerted.

**🔴 Critical (503 Service Unavailable)**
Missing environment variables or startup config.
*   **Scenario**: `DATABASE_URL` is missing.
*   **Action**: App cannot start.

## 📊 Queue Monitoring (Worker Service)

The worker service exposes queue metrics via the same `/api/health` endpoint (when queried on the web service which shares the Redis instance).

**Key Metrics to Watch in Logs:**
*   `Completed` vs `Failed` ratios in BullMQ.
*   `Stalled` jobs count (indicates Worker crashes).

## 📢 Notification Channels

1.  **Slack**: `#dev-alerts` (Integral P1)
2.  **Email**: DevOps team distro
