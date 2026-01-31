# Railway Health Check Alerts Configuration

> **Sprint**: U5.2 - Pre-Event Hardening  
> **Target Event**: Manifest 2026 (Feb 10-12, 2026)

---

## Overview

This document outlines the health monitoring configuration for YardFlow Hitlist on Railway.

## Health Check Endpoint

**URL**: `/api/health`  
**Expected Response**:
```json
{
  "status": "healthy",
  "database": { "status": "ok", "latencyMs": 50 },
  "redis": { "status": "ok" }
}
```

---

## Railway Dashboard Configuration

### Step 1: Navigate to Service Settings

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select project: `yardflow-hitlist-production`
3. Select service: `YardFlow-Hitlist`
4. Click "Settings" tab

### Step 2: Configure Health Check

| Setting | Value |
|---------|-------|
| **Health Check Path** | `/api/health` |
| **Check Interval** | 30 seconds |
| **Timeout** | 10 seconds |
| **Start Period** | 60 seconds |
| **Retries** | 3 |

### Step 3: Configure Restart Policy

| Setting | Value |
|---------|-------|
| **Restart on Failure** | Enabled |
| **Max Restarts** | 5 per hour |
| **Restart Delay** | 10 seconds |

---

## Alert Configuration

### Email Notifications

Railway sends automatic email notifications when:
- ❌ Health check fails 3 consecutive times
- ⚠️ Service restarts unexpectedly
- ✅ Service recovers after failure

**Team Emails**:
- `casey@freightroll.com` (Primary)
- `jake@freightroll.com` (Backup)

### External Monitoring (Recommended)

For Manifest 2026, add external monitoring via:

#### Option 1: UptimeRobot (Free)
1. Create account at [uptimerobot.com](https://uptimerobot.com)
2. Add HTTP monitor:
   - URL: `https://yardflow-hitlist-production-2f41.up.railway.app/api/health`
   - Interval: 5 minutes
   - Alert contacts: team emails

#### Option 2: Better Uptime (Free tier)
1. Create account at [betteruptime.com](https://betteruptime.com)
2. Add monitor with SMS alerts for critical failures

---

## Manual Health Check Commands

### Quick Check
```bash
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq .
```

### Detailed Check with Timing
```bash
curl -w "@-" -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health <<'EOF'
\n
    time_namelookup:  %{time_namelookup}s
       time_connect:  %{time_connect}s
    time_appconnect:  %{time_appconnect}s
   time_pretransfer:  %{time_pretransfer}s
      time_redirect:  %{time_redirect}s
 time_starttransfer:  %{time_starttransfer}s
                    ----------
         time_total:  %{time_total}s
EOF
```

### Watch Mode (Event Day)
```bash
# Check health every 60 seconds during event
watch -n 60 'curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq .'
```

---

## Alert Response Matrix

| Alert | Severity | Response Time | Action |
|-------|----------|---------------|--------|
| Health check failed (1x) | Low | 5 min | Monitor |
| Health check failed (3x) | High | Immediate | Check logs, restart |
| Service down > 5 min | Critical | Immediate | Rollback |
| Database latency > 1s | Medium | 15 min | Check queries |
| Redis disconnected | High | 5 min | Check Redis service |

---

## Event Day (Feb 10-12) Protocol

1. **Morning Check** (7:00 AM local)
   - Run manual health check
   - Verify database latency < 100ms
   - Check Railway dashboard for any warnings

2. **Hourly During Event**
   - Monitor `/api/health` response
   - Watch for error spikes in logs

3. **If Alert Fires**
   - Check Railway logs immediately
   - If 502: Rollback to last known good deployment
   - If database error: Check Postgres connection
   - Contact Casey immediately if unresolved in 5 minutes

---

## Verification Checklist

- [ ] Health check path configured in Railway
- [ ] Restart policy enabled
- [ ] Email notifications configured
- [ ] External monitor set up (UptimeRobot/Better Uptime)
- [ ] Team knows alert response procedures
- [ ] Rollback procedure documented (see ROLLBACK_PROCEDURE.md)

---

*Last Updated: January 31, 2026*
