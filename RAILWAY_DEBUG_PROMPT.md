# Railway Deployment Debug Protocol

**AGENT MISSION**: Get https://yardflow-hitlist-production.up.railway.app/ live and accessible

## 🔍 Systematic Debug Workflow

### PHASE 1: Verify Railway Service Status
```bash
# Check if Railway is responding at all
curl -I https://yardflow-hitlist-production.up.railway.app/ 2>&1

# Check specific routes
curl -s https://yardflow-hitlist-production.up.railway.app/login 2>&1 | head -20
curl -s https://yardflow-hitlist-production.up.railway.app/api/health 2>&1
```

**Expected Results**:
- HTTP 307 redirect to /login = ✅ App is running
- HTTP 502/503/504 = ❌ Service crashed or not deployed
- Connection timeout = ❌ Service doesn't exist or DNS issue
- HTML content = ✅ Pages are rendering

### PHASE 2: Check Local Build Status
```bash
cd /workspaces/YardFlow-Hitlist/eventops

# Test TypeScript compilation
npm run build 2>&1 | tee build-log.txt

# Check for specific errors:
# - Syntax errors (parsing errors)
# - Type errors (@typescript-eslint issues)
# - Missing dependencies
# - Module import failures
```

**Common Build Killers**:
1. **Syntax errors**: `Parsing error: ';' expected`
2. **Type errors**: `'X' is defined but never used` (if strict mode)
3. **Import errors**: Module not found
4. **Prisma schema**: Out of sync with migrations

### PHASE 3: Verify Environment Configuration
```bash
# Check what's deployed on Railway
git log --oneline -5
git diff HEAD~1 HEAD --name-only

# Verify Prisma schema is in sync
cd eventops
npx prisma validate
npx prisma format
```

**Files to Check**:
- `eventops/next.config.mjs` - TypeScript strict mode disabled?
- `eventops/tsconfig.json` - Proper paths configured?
- `eventops/package.json` - All dependencies installed?
- `railway.json` - Build/start commands correct?

### PHASE 4: Fix TypeScript Errors (Most Common Issue)

**Strategy**: Railway builds fail if TypeScript is strict. Check:

```bash
# Find all TypeScript errors
cd eventops
npm run build 2>&1 | grep -E "error TS|Error:" | head -30

# Or use VS Code errors API
# Look for: unused variables, 'any' types, missing imports
```

**Quick Fixes**:
1. **Unused imports**: Remove or prefix with `_`
2. **'any' types**: Add type definitions or disable rule
3. **Unreachable code**: Remove duplicate returns/throws
4. **Missing types**: Add proper interfaces

**Emergency Override** (if needed):
```typescript
// eventops/next.config.mjs
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // TEMPORARY FIX
  },
  eslint: {
    ignoreDuringBuilds: true, // TEMPORARY FIX
  },
};
```

### PHASE 5: Check Recent Code Changes

Look for errors in these recently modified files:
- `eventops/src/lib/agents/content-purposing-agent.ts`
- `eventops/src/lib/agents/prospecting-agent.ts`
- `eventops/src/lib/yardflow-content-hub.ts`
- `eventops/src/lib/agents/state-manager.ts`

**Common Issues**:
- Duplicate return statements
- Missing return statements in functions
- Syntax errors from multi-file edits
- Const variables being reassigned (use `let`)

### PHASE 6: Verify Railway Configuration

Check `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd eventops && npm ci && npx prisma generate && npm run build"
  },
  "deploy": {
    "startCommand": "cd eventops && npx prisma migrate deploy && npm start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300
  }
}
```

**Critical Settings**:
- All commands must `cd eventops` first (monorepo)
- `npx prisma generate` before build
- `npx prisma migrate deploy` before start
- Health check on `/` not `/api/health` (404 issue)

### PHASE 7: Database & Redis Connectivity

```bash
# Check if DATABASE_URL is configured
# This should be set in Railway dashboard under Variables

# Verify Prisma can connect (locally with Railway vars)
cd eventops
railway run npx prisma db execute --stdin <<< "SELECT 1;"

# Check Redis (if using)
railway run node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.ping().then(console.log);"
```

### PHASE 8: Nuclear Options (If Nothing Works)

**Option A: Disable Strict TypeScript**
```typescript
// eventops/next.config.mjs
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
```

**Option B: Rollback to Last Known Good**
```bash
git log --oneline -10
# Find last working commit (before 001b40e?)
git revert HEAD --no-commit
git commit -m "Rollback: Fix Railway deployment"
git push origin main
```

**Option C: Fresh Railway Deployment**
```bash
# In Railway dashboard:
# 1. Settings → Redeploy from latest commit
# 2. Or: Settings → Clear build cache → Trigger deploy
```

## 🎯 Agent Decision Tree

```
START: Railway unreachable
  ├─ Can curl return anything?
  │   ├─ YES (HTTP 307/200) → App is working, DNS issue?
  │   └─ NO (timeout/502/503) → App is crashed/not deployed
  │       ├─ Check Railway dashboard: Is service running?
  │       ├─ Check build logs: Did build succeed?
  │       └─ Fix build errors → Push → Wait 2 min → Retry
  │
  ├─ Does local build work?
  │   ├─ YES → Issue is Railway-specific (env vars, Prisma)
  │   └─ NO → Fix TypeScript/syntax errors first
  │       ├─ Find errors: npm run build 2>&1
  │       ├─ Fix syntax errors (duplicate returns, missing semicolons)
  │       ├─ Fix type errors (unused vars, 'any' types)
  │       ├─ Fix import errors (missing packages)
  │       └─ Test: npm run build succeeds
  │
  ├─ Are env vars set in Railway?
  │   ├─ DATABASE_URL → Required
  │   ├─ AUTH_SECRET → Required
  │   ├─ REDIS_URL → Required (if using queues)
  │   └─ GEMINI_API_KEY → Required (AI features)
  │
  └─ Is Prisma schema valid?
      ├─ npx prisma validate
      ├─ npx prisma generate
      └─ Check migrations are applied
```

## 🚨 Emergency Commit Template

When you fix the issue, commit with this format:

```bash
git add -A
git commit -m "HOTFIX: Railway deployment - [SPECIFIC ISSUE]

- Root cause: [What was broken]
- Fix: [What you changed]
- Verified: [How you tested]
- Deploy: Auto via Railway on push"

git push origin main
```

**Examples**:
- `HOTFIX: Railway deployment - Remove unreachable code in content-purposing-agent`
- `HOTFIX: Railway deployment - Fix syntax error on line 124`
- `HOTFIX: Railway deployment - Disable TypeScript strict mode`

## 📋 Agent Checklist

Execute these steps in order. Mark each with ✅ when complete:

- [ ] **Step 1**: Test Railway URL with curl
- [ ] **Step 2**: Check local build: `cd eventops && npm run build`
- [ ] **Step 3**: Review recent commits for breaking changes
- [ ] **Step 4**: Check TypeScript errors in VS Code or build output
- [ ] **Step 5**: Fix syntax/type errors in problem files
- [ ] **Step 6**: Verify Prisma schema: `npx prisma validate`
- [ ] **Step 7**: Test build locally: `npm run build` succeeds
- [ ] **Step 8**: Commit fixes with clear message
- [ ] **Step 9**: Push to main: Railway auto-deploys in ~2 min
- [ ] **Step 10**: Verify deployment: curl Railway URL again
- [ ] **Step 11**: If still failing, check Railway dashboard logs
- [ ] **Step 12**: If needed, disable TypeScript strict mode (nuclear option)

## 🔧 Quick Reference: Common Fixes

### Fix 1: Syntax Error in File
```bash
# Find the file with syntax error from build output
# Open file, locate line number
# Fix: Remove duplicate returns, fix comments, add missing semicolons
git add path/to/file.ts
git commit -m "Fix syntax error in [filename] line [number]"
git push
```

### Fix 2: TypeScript Strict Mode Issues
```typescript
// eventops/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Allows 'any' types and unused vars
  },
  eslint: {
    ignoreDuringBuilds: true, // Skips linting during build
  },
};

export default nextConfig;
```

### Fix 3: Unreachable Code
```typescript
// BAD: Two returns
try {
  return result;
} catch (error) {
  throw error;
}
return fallback; // ❌ UNREACHABLE

// GOOD: Single return path
try {
  return result;
} catch (error) {
  throw error;
}
```

### Fix 4: Const Reassignment
```typescript
// BAD
const emailsFound = 0;
emailsFound++; // ❌ ERROR

// GOOD
let emailsFound = 0;
emailsFound++; // ✅ OK
```

### Fix 5: Unused Imports/Variables
```typescript
// Option A: Remove unused imports
import { prisma } from '@/lib/db'; // If not used, delete this line

// Option B: Prefix with underscore
import { prisma as _prisma } from '@/lib/db'; // Tells linter it's intentionally unused
```

## 🎬 Action Plan for Agent Squad

**Agent 1 (Diagnostics)**:
1. Run curl tests on Railway URL
2. Run local build test
3. Collect error messages
4. Report findings to Agent 2

**Agent 2 (Code Analysis)**:
1. Review recent commits (last 5)
2. Identify files with TypeScript errors
3. Check for syntax errors, unreachable code
4. Create fix plan

**Agent 3 (Implementation)**:
1. Execute fixes from Agent 2's plan
2. Test local build after each fix
3. Commit with descriptive message
4. Push to trigger Railway deploy

**Agent 4 (Verification)**:
1. Wait 2 minutes for Railway deploy
2. Test Railway URL again
3. Confirm app is accessible
4. Report success or loop back to Agent 1

## 🏁 Success Criteria

**Deployment is SUCCESSFUL when**:
✅ `curl https://yardflow-hitlist-production.up.railway.app/` returns HTTP 307 redirect
✅ `curl https://yardflow-hitlist-production.up.railway.app/login` returns HTML
✅ Login page loads in browser
✅ No 502/503/504 errors
✅ Railway dashboard shows "Active" status

**Deployment is FAILING when**:
❌ Connection timeout
❌ HTTP 502 Bad Gateway
❌ HTTP 503 Service Unavailable
❌ Railway dashboard shows "Crashed" or "Build Failed"

---

**REMEMBER**: Railway auto-deploys on every push to main. Wait ~2-3 minutes after pushing before declaring failure.
