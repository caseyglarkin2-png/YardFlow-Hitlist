# Sprint 30 Quick Reference
**Production Hardening Checklist**

## 🎯 THE REAL ISSUES

### User Report: "Service Issue"
**Reality**: Site is UP and working!
- ✅ HTTP 307 redirect to /login (correct)
- ✅ Login page serving (HTTP 200)
- ❌ Dashboard crashes AFTER login ("Cannot read properties of undefined")

### Build Status
- ✅ Deploys to Railway successfully
- ❌ Hangs locally (Redis connection at module load)
- ⚠️ No health endpoint (hard to debug)

### Database Status
- ✅ Connected and working
- ❌ Empty (no users, no data)
- ❌ No seed script run

### Queue Features
- ✅ Code deployed (27 files)
- ❌ Redis not provisioned on Railway
- ❌ Worker process not deployed
- ⚠️ Features exist but can't function

---

## ⚡ CRITICAL PATH (Execute in Order)

### 1. Fix Build Hang (45 min) - TASK 30.1
**Problem**: `redisConnection = new Redis(config)` runs at import time  
**Solution**: Change to `getRedisConnection()` lazy initialization  
**Files**: `src/lib/queue/client.ts`, `queues.ts`, `workers.ts`

### 2. Fix Dashboard Crash (30 min) - TASK 30.2
**Problem**: `session!.user.id` without null check  
**Solution**: Add `if (!session?.user?.id) redirect('/login')`  
**Files**: `src/app/dashboard/page.tsx`, `settings/integrations/page.tsx`

### 3. Add Health Check (60 min) - TASK 30.3
**File**: `src/app/api/health/route.ts` (NEW)  
**Tests**: Database, Redis, env vars  
**URL**: `/api/health`

### 4. Seed Production (90 min) - TASK 30.4
**File**: `prisma/seed-production.ts` (NEW)  
**Creates**: Admin user, demo user, 5 companies, 5 contacts  
**Login**: `admin@yardflow.com / YardFlow2026!`

### 5. Add Redis (20 min) - TASK 30.5
```bash
railway add -d redis
railway variables  # Verify REDIS_URL
```

### 6. Deploy Worker (75 min) - TASK 30.6
**File**: `railway-worker.json` (NEW)  
**Service**: Separate Railway service for queue processing  
**Command**: `npm run worker`

### 7. Environment Variables (15 min) - TASK 30.7
```bash
railway variables --set SENDGRID_API_KEY='...'
railway variables --set OPENAI_API_KEY='...'
```

### 8. Test Everything (60 min) - TASK 30.8
Login → Dashboard → Accounts → People → Sequences → Health → Queue

---

## 🔥 IMMEDIATE ACTION

**If you have 2 hours right now:**
1. Execute Tasks 30.1 + 30.2 (P0 fixes - 75 min)
2. Deploy to Railway
3. Test login and dashboard
4. **Production will be usable**

**If you have 4 hours today:**
1. Execute Tasks 30.1 through 30.4 (225 min)
2. Run seed script: `railway run npx prisma db seed`
3. **Production will have demo data**

**If you have a full day:**
1. Execute all tasks (435 min = 7.25 hours)
2. **Production will be fully operational**

---

## 📋 VALIDATION COMMANDS

**After each deploy:**
```bash
# Site up?
curl -I https://yardflow-hitlist-production.up.railway.app/

# Health check?
curl https://yardflow-hitlist-production.up.railway.app/api/health | jq

# Worker running?
railway logs -s yardflow-worker

# Database seeded?
# Login at /login with admin@yardflow.com / YardFlow2026!
```

---

## 🚨 ROLLBACK

**If something breaks:**
```bash
git revert HEAD
git push origin main
# Railway auto-deploys previous version in ~3 minutes
```

---

## 📊 SUCCESS METRICS

**Before Sprint 30**:
- Site: Redirect to login ✅, but dashboard crashes ❌
- Health: No endpoint ❌
- Data: Empty database ❌
- Queues: Code exists but non-functional ❌

**After Sprint 30**:
- Site: Full login → dashboard flow ✅
- Health: `/api/health` returns 200 ✅
- Data: 5 companies, 5 contacts, 2 users ✅
- Queues: Redis + worker processing jobs ✅

---

## 📞 NEXT QUESTIONS TO ASK USER

1. **Do you have Railway CLI installed?**
   - `railway --version`
   - If not: `npm install -g @railway/cli`

2. **Do you have access to SendGrid API key?**
   - Needed for Task 30.7
   - If not, sequences will be disabled but app still works

3. **Do you have OpenAI API key?**
   - Needed for AI features
   - If not, AI features will be disabled but app still works

4. **How much time do you have today?**
   - 2 hours → P0 fixes only
   - 4 hours → P0 + data seeding
   - 8 hours → Complete Sprint 30

---

## 🎯 THE BOTTOM LINE

**What user sees**: "Service issue"  
**What's actually happening**: Dashboard crashes after successful login  
**Root cause**: `session!.user.id` without null check  
**Fix time**: 30 minutes (Task 30.2)  
**Bigger picture**: Need all 8 tasks for production-ready system

**START WITH TASK 30.1 (45 min) →** Fix Redis build hang!
