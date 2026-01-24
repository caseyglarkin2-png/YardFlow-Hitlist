# 🚀 Sprint 30 - Manual Railway Setup Guide

**Status**: Tasks 30.5-30.7 require Railway dashboard access  
**Time Required**: 30 minutes total

---

## ✅ TASK 30.4 Complete

- [x] Created `seed-production.ts` with comprehensive demo data
- [x] Committed and deployed to Railway
- [x] **Next**: Run seed on Railway (see below)

---

## 📋 TASK 30.5: Provision Redis (20 minutes)

### Option A: Railway Dashboard (Recommended)
1. Go to https://railway.app/
2. Select your YardFlow-Hitlist project
3. Click "New Service" → "Database" → "Redis"
4. Name it: `yardflow-redis`
5. Railway auto-creates `REDIS_URL` environment variable
6. Verify in project settings → Variables

### Option B: Railway CLI
```bash
# Install CLI if not present
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Add Redis
railway add -d redis

# Verify
railway variables | grep REDIS_URL
```

### Verification
After adding Redis, both web and worker services will have access to `REDIS_URL` automatically.

---

## ⚙️ TASK 30.6: Deploy Worker Service (75 minutes)

### Step 1: Create Worker Service in Railway Dashboard

1. In Railway project, click "New Service" → "GitHub Repo"
2. Select `caseyglarkin2-png/YardFlow-Hitlist`
3. Name the service: `yardflow-worker`
4. In service settings:

   **Build Settings**:
   - Builder: Nixpacks
   - Build Command: `cd eventops && npm ci && npx prisma generate && npm run build`
   - Root Directory: `/` (monorepo root)

   **Deploy Settings**:
   - Start Command: `cd eventops && npm run worker`
   - Healthcheck: None (worker doesn't expose HTTP)
   - Restart Policy: ON_FAILURE
   - Max Retries: 10

5. **Environment Variables** (Copy from web service):
   - `DATABASE_URL` (from web service)
   - `REDIS_URL` (auto-populated after Task 30.5)
   - `NODE_ENV=production`
   - `GEMINI_API_KEY` (if using AI features)

6. **Deploy Branch**: `main`
7. Click "Deploy"

### Step 2: Verify Worker is Running

```bash
# Check worker logs (if you have Railway CLI)
railway logs -s yardflow-worker

# Or via dashboard:
# Go to worker service → Logs tab
# Should see: "Worker started, waiting for jobs..."
```

### Configuration File Reference

The `railway-worker.json` file has been created in the root directory as a reference:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd eventops && npm ci && npx prisma generate && npm run build"
  },
  "deploy": {
    "startCommand": "cd eventops && npm run worker",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

---

## 🔐 TASK 30.7: Set Environment Variables (15 minutes)

### Required Variables (Set in BOTH web and worker services)

#### 1. CRON_SECRET
```bash
# Generate a secure secret
openssl rand -base64 32

# Add to Railway:
# Project → Settings → Variables → Add Variable
# Name: CRON_SECRET
# Value: <generated secret>
```

#### 2. SENDGRID_API_KEY (Optional but recommended)
```bash
# Get from https://app.sendgrid.com/settings/api_keys
# Add to Railway:
# Name: SENDGRID_API_KEY
# Value: SG.xxxxxxxxxxxxx
```

#### 3. GEMINI_API_KEY (If not using OpenAI)
```bash
# Get from https://aistudio.google.com/app/apikey
# Add to Railway:
# Name: GEMINI_API_KEY  
# Value: AIzaSyxxxxxxxxxxxxx
```

#### 4. Verify Existing Variables
Ensure these are already set:
- ✅ `DATABASE_URL` (Railway PostgreSQL)
- ✅ `REDIS_URL` (from Task 30.5)
- ✅ `AUTH_SECRET` (NextAuth)
- ✅ `GOOGLE_CLIENT_ID` (OAuth)
- ✅ `GOOGLE_CLIENT_SECRET` (OAuth)

---

## 🌱 Run Production Seed (After Deploy)

### Option A: Railway Dashboard
1. Go to web service → Settings
2. Click "Deploy" dropdown → "Run Command"
3. Enter: `cd eventops && npx prisma db seed`
4. Click "Run"
5. Check logs for success message

### Option B: Railway CLI
```bash
railway run --service yardflow-hitlist-production npx prisma db seed
```

### Verification
```bash
# Test login
curl -X POST https://yardflow-hitlist-production.up.railway.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yardflow.com","password":"YardFlow2026!"}'

# Should return session/redirect
```

---

## 📊 TASK 30.8: End-to-End Testing (60 minutes)

### Test Checklist

#### 1. Authentication ✓
```bash
# Visit production site
open https://yardflow-hitlist-production.up.railway.app/

# Login with:
# Email: admin@yardflow.com
# Password: YardFlow2026!

# Should redirect to /dashboard
```

#### 2. Dashboard ✓
- View should load without errors
- Should see 5 target accounts
- ICP scores should be displayed
- No console errors

#### 3. Target Accounts ✓
```bash
# Navigate to /accounts
# Should see:
# - Sysco Corporation (ICP: 95)
# - Penske Logistics (ICP: 92)
# - XPO Logistics (ICP: 90)
# - Uline (ICP: 88)
# - Kenco Logistics (ICP: 85)
```

#### 4. People/Contacts ✓
```bash
# Navigate to /people
# Should see 10 contacts
# Personas: ExecOps, Ops, Procurement
# Email statuses should be VALID
```

#### 5. Campaigns & Sequences ✓
```bash
# Navigate to /campaigns
# Should see "Manifest 2026 - VP+ Outreach"
# Status: ACTIVE
# Click to view sequence details
```

#### 6. Health Endpoint ✓
```bash
curl https://yardflow-hitlist-production.up.railway.app/api/health | jq

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-01-24T...",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "auth": "healthy"
  },
  "version": "1.0.0"
}
```

#### 7. Queue Processing ✓ (After worker deployed)
```bash
# Test enrichment job
# 1. Go to /accounts
# 2. Click on an account
# 3. Click "Enrich"
# 4. Check worker logs for job processing
# 5. Reload page - should see updated dossier
```

#### 8. Company Dossiers ✓
```bash
# Navigate to account detail page
# Should see AI-generated:
# - Company overview
# - Key pain points
# - Tech stack
# - Facility count
# - Operational scale
```

#### 9. Sequence Enrollments ✓
```bash
# Navigate to /sequences
# Click "Manifest Exec - 5 Touch"
# Should see 3 enrolled contacts:
# - Michael Chen (Sysco)
# - Robert Johnson (Penske)
# - James Wilson (Kenco)
# Status: ACTIVE, Current Step: 1
```

#### 10. Error Handling ✓
```bash
# Test invalid login
# Try accessing /dashboard without auth
# Should redirect to /login

# Test 404
# Visit /nonexistent-page
# Should show Next.js 404 page
```

---

## 🎯 Success Criteria

### Sprint 30 is complete when:

- [x] TASK 30.1: Redis lazy initialization fixed
- [x] TASK 30.2: Dashboard session crashes fixed
- [x] TASK 30.3: Health endpoint enhanced
- [x] TASK 30.4: Production seed data created
- [ ] TASK 30.5: Redis provisioned on Railway
- [ ] TASK 30.6: Worker service deployed
- [ ] TASK 30.7: Environment variables set
- [ ] TASK 30.8: All E2E tests passing

### Production Ready Checklist:

- [ ] ✅ Health endpoint returns `healthy`
- [ ] ✅ Login → Dashboard works without errors
- [ ] ✅ Database has 5+ companies, 10+ contacts
- [ ] ✅ Queue jobs process (worker running)
- [ ] ✅ No console errors on any page
- [ ] ✅ All environment variables configured
- [ ] ✅ Redis connected and operational
- [ ] ✅ Background enrichment working

---

## 📞 Next Steps After Manual Setup

Once you've completed Tasks 30.5-30.7 via Railway dashboard:

1. **Confirm Completion**: Reply with "Tasks 30.5-30.7 complete"
2. **I'll Run**: Automated E2E testing (Task 30.8)
3. **Then**: Update STATUS.md and mark Sprint 30 complete
4. **Finally**: Plan Sprint 31 (Manifest 2026 features) or Sprint 32 (AI Agent Squad)

---

## 🆘 Troubleshooting

### Redis not connecting
- Verify `REDIS_URL` is set in both web + worker
- Check Redis service is running in Railway dashboard
- Look for connection errors in logs

### Worker not processing jobs
- Check worker service is deployed and running
- Verify worker has same env vars as web service
- Check worker logs for errors

### Seed script fails
- Ensure DATABASE_URL is correct
- Check for existing data conflicts
- Run with Railway CLI for detailed error logs

### Health check shows degraded
- Redis not provisioned → Complete Task 30.5
- Database connection issue → Check DATABASE_URL
- Auth not configured → Verify AUTH_SECRET set

---

**Ready for manual setup!** Complete Tasks 30.5-30.7 via Railway dashboard, then return for automated testing.
