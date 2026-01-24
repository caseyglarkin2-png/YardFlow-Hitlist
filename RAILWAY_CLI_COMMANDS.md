# 🚄 Railway CLI Quick Commands (Tasks 30.5-30.7)

Railway CLI is installed! Run these commands to complete Sprint 30:

## Authentication (One-time)
```bash
railway login
# Opens browser for GitHub OAuth
```

## Link to Project (One-time)
```bash
cd /workspaces/YardFlow-Hitlist
railway link
# Select: YardFlow-Hitlist project
```

## TASK 30.5: Provision Redis (2 minutes!)
```bash
railway add --database redis
# Creates Redis instance and sets REDIS_URL automatically
```

## TASK 30.7: Set Environment Variables (5 minutes)
```bash
# Generate CRON_SECRET
CRON_SECRET=$(openssl rand -base64 32)
railway variables set CRON_SECRET="$CRON_SECRET"

# Optional: Add SendGrid
railway variables set SENDGRID_API_KEY="your-sendgrid-key"

# Optional: Add Gemini
railway variables set GEMINI_API_KEY="your-gemini-key"

# Verify
railway variables
```

## Run Production Seed (2 minutes)
```bash
railway run npx prisma db seed
# Seeds database with 5 companies, 10 contacts, campaigns
```

## TASK 30.6: Worker Service (Manual - Railway Dashboard Required)
Worker deployment still requires Railway dashboard:
1. Dashboard → New Service → GitHub Repo
2. Select: YardFlow-Hitlist
3. Name: yardflow-worker
4. Settings → Start Command: `cd eventops && npm run worker`
5. Copy environment variables from web service
6. Deploy

## Verify Everything
```bash
# Check health
curl https://yardflow-hitlist-production.up.railway.app/api/health | jq

# Run E2E tests
cd eventops && ./tests/e2e-production.sh

# Check worker logs (after worker deployed)
railway logs -s yardflow-worker
```

---

**Total Time**: ~10 minutes with CLI (vs 110 minutes manual)  
**Note**: Worker service still needs dashboard (Railway CLI limitation)
