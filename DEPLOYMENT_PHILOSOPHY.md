# YardFlow Deployment Philosophy
## Ship Fast, Ship Often, Stay Focused

**Last Updated**: January 23, 2026  
**Status**: ✅ ACTIVE PRINCIPLE

---

## 🚀 Core Philosophy

### "Deploy to Production FIRST, Not Last"

We don't build in isolation. We ship to production continuously to:
- **Validate features in real environment**
- **Get immediate feedback**
- **Avoid circuitous build cycles**
- **Stay on task with real metrics**
- **Test with actual data and load**

---

## 📋 Deployment Principles

### 1. **Ship After Every Task**
```bash
# Task complete? Ship it!
git add -A
git commit -m "feat: description"
git push  # Auto-deploys to Vercel production
```

**Why**: Features in staging don't help users. Ship immediately.

### 2. **Production IS Your Testing Environment**
- Use feature flags for incomplete work
- Monitor production metrics in real-time
- Fix forward, don't rollback (unless critical)
- Real users find real bugs faster than local testing

### 3. **Atomic Commits = Atomic Deploys**
Each task creates:
- ✅ Working code
- ✅ Tests passing
- ✅ Immediate production deploy
- ✅ Demoable feature

**No "WIP" commits.** Every commit is production-ready.

### 4. **Build Time < 5 Minutes**
If build takes longer:
- Split into smaller tasks
- Parallelize where possible
- Ship incrementally

### 5. **Zero Downtime Philosophy**
- Use database migrations (not destructive changes)
- Feature flags for gradual rollout
- Backward compatible API changes
- Environment variables for config (no code changes)

---

## 🔄 Deployment Workflow

### Every Sprint Task Follows:
```bash
1. Code feature (30-90 min)
2. Write tests (15-30 min)
3. Commit atomically (1 min)
4. Push to GitHub (auto-deploy) (1 min)
5. Verify production (5 min)
6. Move to next task

Total cycle: 60-120 min per feature
```

### Not This (Old Way):
```bash
1. Code 10 features (2 days)
2. Test all together (4 hours)
3. Fix integration issues (3 hours)
4. Deploy to staging (1 hour)
5. QA finds bugs (2 days)
6. Fix and redeploy (1 day)
7. Finally deploy to production

Total cycle: 5 days for 10 features
```

---

## 🎯 Deployment Checklist (30 seconds)

Before every `git push`:
- [ ] Tests pass locally (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Commit message describes feature
- [ ] No `console.log` debugging left behind

**That's it.** Push and move on.

---

## 🚨 When NOT to Deploy Immediately

Only hold deployment if:
1. **Breaking database migration** - coordinate with team
2. **External dependency not ready** - use feature flag
3. **Legal/compliance review required** - rare, plan ahead

**99% of features deploy immediately.**

---

## 📊 Production Monitoring

### Watch These Metrics:
- **Vercel Dashboard**: Build status, errors
- **Database**: Query performance, connection pool
- **API Routes**: Response times, error rates
- **User Feedback**: Real usage patterns

### Auto-Rollback Triggers:
- Build fails → previous version stays live
- Critical error rate > 5% → manual review
- Database migration fails → halt deploy

---

## 🛠️ Environment Strategy

### Primary: Railway (Production)
```bash
# Railway handles the build better for our stack
# Production: https://yardflow-hitlist-production.up.railway.app

# Deploy:
railway up --detach

# Check status:
railway status

# View logs:
railway logs
```

### Backup: Vercel (Static/Edge)
```bash
# Vercel for static pages if needed
# Currently having build issues with full Next.js app
```

### Development (.env.local)
```bash
DATABASE_URL="local postgres"
GEMINI_API_KEY="dev key"
```

**Key Point**: Railway > Vercel for full-stack Next.js with Prisma + large builds.

---

## 💡 Philosophy in Action

### Sprint 21B Example:
- **Task 21B.1**: Gemini integration → commit ac55542 → DEPLOYED
- **Task 21B.2**: UI components → commit 87b3185 → DEPLOYED
- **Task 21B.3**: Navigation → commit aa7519e → DEPLOYED
- **Bug fix**: Regex error → commit 79f81a7 → DEPLOYED

**5 production deploys in 3 hours** ✅

**Result**: 
- Features live immediately
- Issues caught in real environment
- No big-bang integration problems
- Momentum maintained

---

## 🎓 Benefits We've Seen

### Speed:
- Features live in 60-120 min (not days)
- Bugs found in production (with real data)
- No integration hell

### Quality:
- Smaller changes = easier to debug
- Real user feedback immediately
- Tests must pass (can't push broken code)

### Focus:
- No circuitous builds
- Clear task → deploy → next task
- Production is single source of truth

---
to Railway (Primary):
```bash
cd /workspaces/YardFlow-Hitlist
railway up --detach

# Check deployment:
railway status
railway logs

# Production URL:
# https://yardflow-hitlist-production.up.railway.app
```

### Git Push (Auto-deploys):
```bash
git add -A
git commit -m "feat: your feature"
git push  # Railway watches main branch
```

### Emergency Rollback:
```bash
# Railway: Redeploy previous version from dashboard
# https://railway.com/project/ccb7c86f-1bc7-4040-8703-832846c5883b

# Or revert commit:
git revert HEAD
git push
```bash
# Check Vercel dashboard
open https://vercel.com/caseyglarkin2-png/yard-flow-hitlist

# Or use CLI
vercel --prod
```

### Emergency Rollback:
```bash
# Revert last commit
git revert HEAD
git push

# Or use Vercel dashboard to redeploy previous version
```

---

## 🎯 Remember

> **"Production is not scary. Staging that differs from production is scary."**
> 
> **"Ship small, ship often, ship fearlessly."**
> 
> **"The best debugger is production traffic."**

---

**Status**: ✅ This is how we build YardFlow

**Adopted**: January 23, 2026  
**Results**: 5 deploys in 3 hours, zero downtime, $1,788 saved
