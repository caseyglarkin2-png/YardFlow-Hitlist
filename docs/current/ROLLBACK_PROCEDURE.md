# Rollback Procedure

> **Sprint**: U5.4 - Pre-Event Hardening  
> **Target Event**: Manifest 2026 (Feb 10-12, 2026)  
> **Critical**: Practice this procedure before the event!

---

## Quick Reference (Emergency)

```bash
# 1. Find last good deployment hash
railway deployment list | head -5

# 2. Rollback to specific deployment
railway rollback <DEPLOYMENT_ID>

# 3. Verify health
curl https://yardflow-hitlist-production-2f41.up.railway.app/api/health
```

---

## Detailed Rollback Steps

### Step 1: Identify the Problem

**Symptoms requiring rollback:**
- 502 Bad Gateway errors
- Health check returning 500
- Application crash loop
- Database migration failure

### Step 2: Get Deployment History

#### Via Railway CLI:
```bash
# List recent deployments
railway deployment list

# Output shows:
# ID                    STATUS    CREATED
# abc123-def456...      ACTIVE    5 min ago    ← current (broken)
# xyz789-uvw012...      SUCCESS   2 days ago   ← last known good
# ...
```

#### Via Railway Dashboard:
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select `YardFlow-Hitlist` service
3. Click "Deployments" tab
4. Find the last deployment with ✅ green checkmark

### Step 3: Execute Rollback

#### Via Dashboard (Recommended):
1. Find the target deployment
2. Click the **...** menu
3. Select **"Rollback to this deployment"**
4. Confirm the rollback

#### Via CLI:
```bash
# Replace DEPLOYMENT_ID with actual ID from step 2
railway rollback DEPLOYMENT_ID
```

### Step 4: Verify Recovery

```bash
# Check health endpoint
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq .

# Expected output:
{
  "status": "healthy",
  "database": { "status": "ok" },
  "redis": { "status": "ok" }
}
```

### Step 5: Notify Team

After successful rollback:
1. Send Slack/email: "Rollback complete, investigating root cause"
2. Do NOT merge new code until root cause identified
3. Document incident in [INCIDENT_LOG.md]

---

## Rollback Scenarios

### Scenario A: Bad Code Deployment

**Cause**: Push to main broke the app  
**Fix**: Rollback to previous deployment  
**Timeline**: < 5 minutes

```bash
# Find last good deployment
railway deployment list | grep SUCCESS | head -1

# Rollback
railway rollback <ID>
```

### Scenario B: Database Migration Failure

**Cause**: Prisma migration failed mid-way  
**Fix**: Rollback code + restore database backup  
**Timeline**: 15-30 minutes

```bash
# 1. Rollback code
railway rollback <LAST_GOOD_DEPLOYMENT>

# 2. If needed, restore database from backup
# (Contact Railway support if critical)
```

### Scenario C: Environment Variable Misconfiguration

**Cause**: Wrong env var caused crash  
**Fix**: Fix env var (no code rollback needed)  
**Timeline**: < 2 minutes

```bash
# Check current variables
railway variables

# Fix the problematic variable
railway variables set VAR_NAME="correct_value"

# Redeploy
railway up
```

---

## Rollback Practice Run

**DO THIS BEFORE MANIFEST 2026!**

### Practice Steps:

1. **Create a safe test branch**:
   ```bash
   git checkout -b test-rollback
   ```

2. **Make an intentionally broken commit**:
   ```typescript
   // Add syntax error to any file
   const broken = {;  // This will fail build
   ```

3. **Push and wait for failed deploy**:
   ```bash
   git add .
   git commit -m "test: intentional break for rollback practice"
   git push origin test-rollback
   # Merge to main (or configure Railway to deploy this branch)
   ```

4. **Execute rollback**:
   ```bash
   railway rollback <PREVIOUS_DEPLOYMENT>
   ```

5. **Verify**:
   ```bash
   curl https://yardflow-hitlist-production-2f41.up.railway.app/api/health
   ```

6. **Clean up**:
   ```bash
   git checkout main
   git branch -D test-rollback
   ```

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Primary Dev | Casey | casey@freightroll.com |
| Backup Dev | Jake | jake@freightroll.com |
| Railway Support | - | support@railway.app |

---

## Rollback Decision Tree

```
Is the app returning 502s or crashing?
├── YES → Go to Step 1: Identify deployment to rollback
│         └── Is there a recent deployment?
│             ├── YES → Rollback to previous deployment
│             └── NO → Check env vars, database, Redis
└── NO → Is the app slow/degraded?
         ├── YES → Check database latency, may need Railway scaling
         └── NO → Continue monitoring
```

---

## Post-Rollback Checklist

- [ ] Health check returns 200
- [ ] Can login to dashboard
- [ ] Key flows work (create account, view calendar)
- [ ] Team notified of rollback
- [ ] Root cause investigation started
- [ ] Fix identified before re-deploying

---

*Last Updated: January 31, 2026*
