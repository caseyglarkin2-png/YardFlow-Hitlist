# 🚀 Deploy Worker Service to Railway

**Status**: Code ready, awaiting manual deployment  
**Time Required**: 10 minutes  
**Last Updated**: January 23, 2026

---

## ✅ Pre-Deployment Checklist

- ✅ Worker code with health check server (`workers.ts`)
- ✅ Railway worker config (`railway-worker.json`)
- ✅ Redis provisioned on Railway
- ✅ All commits pushed to main branch
- ✅ Main service running successfully

**Latest Commit**: `ade1dfd` - Worker config and health server ready

---

## 📋 Step-by-Step Deployment

### Step 1: Access Railway Dashboard

1. Open: https://railway.app/dashboard
2. Navigate to project: **airy-vibrancy**
3. Select environment: **production**

### Step 2: Create New Service

1. Click **"+ New"** button (top right)
2. Select **"Empty Service"**
3. Click **"GitHub Repo"**
4. Select: `caseyglarkin2-png/YardFlow-Hitlist`
5. Branch: `main` (should be auto-selected)

### Step 3: Configure Service

**Service Settings:**
- **Name**: `yardflow-worker`
- **Root Directory**: Leave empty (config handles it)
- **Watch Paths**: Leave default

**Build Settings:**
- Railway will automatically use `railway-worker.json` from repo root
- No manual build command needed

### Step 4: Verify Environment Variables

The worker needs these variables (should auto-inherit from main service):

**Required (Critical)**:
- ✅ `DATABASE_URL` - PostgreSQL connection
- ✅ `REDIS_URL` - Redis connection
- ✅ `AUTH_SECRET` - Authentication secret

**Optional (for full features)**:
- `SENDGRID_API_KEY` - Email sequences
- `SENDGRID_FROM_EMAIL` - Email sender
- `SENDGRID_FROM_NAME` - Email from name
- `OPENAI_API_KEY` - AI enrichment
- `GOOGLE_CLIENT_ID` - Google Calendar (if used)
- `GOOGLE_CLIENT_SECRET` - Google Calendar (if used)

**How to Verify**:
1. Click on the new worker service
2. Go to "Variables" tab
3. Check that DATABASE_URL, REDIS_URL, AUTH_SECRET are present
4. If missing, click "Add Variable" and copy from main service

### Step 5: Deploy

1. Click **"Deploy"** button
2. Wait for build to complete (~2-3 minutes)
3. Check logs for success messages

### Step 6: Verify Deployment

**Expected Logs** (click "Deployments" → latest deployment → "View Logs"):
```
✅ Starting worker service...
✅ Redis connection established
✅ Enrichment worker started
✅ Sequence worker started
✅ Worker health check server listening on port 8080
✅ Queue workers started
```

**Health Check** (after ~30 seconds):
```bash
# Get worker service URL from Railway dashboard
curl https://[worker-service-url]/health

# Expected response:
{
  "status": "healthy",
  "workers": {
    "enrichment": "running",
    "sequence": "running"
  },
  "timestamp": "2026-01-23T18:45:00.000Z"
}
```

---

## 🧪 Testing Worker

### Test 1: Enqueue a Job

```bash
# From your terminal
curl -X POST https://yardflow-hitlist-production.up.railway.app/api/queue/enrich \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-auth-cookie]" \
  -d '{
    "accountId": "test-account-123",
    "jobType": "email-pattern"
  }'

# Expected: Job enqueued successfully
```

### Test 2: Check Worker Logs

```bash
# In Railway dashboard:
1. Click on yardflow-worker service
2. Click "Deployments"
3. Click on latest deployment
4. Click "View Logs"

# Look for:
"Processing enrichment job" - Worker picked up the job
"Enrichment job completed" - Job finished successfully
```

### Test 3: Queue Stats

```bash
curl https://yardflow-hitlist-production.up.railway.app/api/queue/stats

# Expected response showing worker counts:
{
  "enrichment": {
    "active": 0,
    "completed": 1,
    "failed": 0,
    "waiting": 0,
    "workers": 1
  },
  "sequences": {
    ...
  }
}
```

---

## 🐛 Troubleshooting

### Issue: Build Fails

**Error**: "Cannot find module '@/lib/db'"
**Solution**: 
1. Check that `eventops` directory structure is correct
2. Verify `tsconfig.json` has correct paths
3. Re-trigger build

### Issue: Worker Crashes Immediately

**Error**: "Redis connection failed"
**Solution**:
1. Verify `REDIS_URL` is set in worker service variables
2. Check Redis service is running
3. Restart worker service

### Issue: No Jobs Processing

**Error**: Jobs stay in "waiting" state
**Solution**:
1. Check worker logs for errors
2. Verify worker service is running (not crashed)
3. Check health endpoint shows "running"
4. Restart worker service

### Issue: Health Check Fails

**Error**: 503 or timeout on /health
**Solution**:
1. Wait 30 seconds after deployment
2. Check worker logs for "listening on port 8080"
3. Verify PORT environment variable (Railway sets automatically)

---

## ✅ Success Criteria

You know the worker is deployed successfully when:

- ✅ Service appears in Railway dashboard as "Active"
- ✅ Logs show "Queue workers started"
- ✅ Health endpoint returns `{"status": "healthy"}`
- ✅ Test job gets processed (appears in logs)
- ✅ Queue stats show workers > 0
- ✅ No crash loops in deployment logs

---

## 📊 Post-Deployment

After successful deployment:

1. **Update Sprint 30 Doc**:
   - Mark Task 30.6 as ✅ Complete
   - Add deployment timestamp
   - Document any issues encountered

2. **Test End-to-End Flow**:
   - Create a sequence via UI
   - Enroll contacts
   - Verify emails are sent
   - Check job completion in logs

3. **Monitor for 24 Hours**:
   - Watch Railway dashboard for crashes
   - Check error rates
   - Verify memory/CPU usage is reasonable

4. **Proceed to Task 30.7**:
   - Verify all environment variables
   - Add any missing optional vars
   - Document production config

---

## 🔗 Quick Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Main Service**: https://yardflow-hitlist-production.up.railway.app
- **GitHub Repo**: https://github.com/caseyglarkin2-png/YardFlow-Hitlist
- **Sprint 30 Plan**: `docs/current/SPRINT_30_PRODUCTION_HARDENING.md`
- **Worker Code**: `eventops/src/lib/queue/workers.ts`
- **Worker Config**: `railway-worker.json`

---

## 📞 Need Help?

If you encounter issues:

1. Check Railway logs first (most issues are logged)
2. Review this troubleshooting section
3. Check Sprint 30 doc for known issues
4. Verify all environment variables are set
5. Try redeploying from scratch

**Common Quick Fixes**:
- Restart the service
- Re-trigger deployment
- Check environment variables
- Verify Redis is running

---

**Ready?** Head to Railway dashboard and create that worker service! 🚀
