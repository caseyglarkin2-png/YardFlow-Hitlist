# Render.com Deployment Guide

## Quick Start (You already have a Render account!)

### Option A: Deploy via Blueprint (Recommended - 5 minutes)

1. **Connect your GitHub repo to Render**:
   ```
   https://dashboard.render.com/blueprints
   ```

2. **Create New → Blueprint**:
   - Repository: `caseyglarkin2-png/YardFlow-Hitlist`
   - Branch: `main`
   - Blueprint file: `render.yaml`

3. **Set Secret Environment Variables** (in Render dashboard after creation):
   ```bash
   AUTH_SECRET=1c5fdaf03e1e1293c77ea5230d5dcd7348768bf259c613a12532f5deda098851
   OPENAI_API_KEY=sk-proj-... (your key)
   SENDGRID_API_KEY=SG.DkXO7KrKSwuArdzG_fJc_A... (your key)
   ```

4. **Deploy** - Render will automatically:
   - Create PostgreSQL database (free tier)
   - Create Redis instance (free tier)
   - Deploy Next.js app
   - Deploy background worker
   - Wire everything together

### Option B: Manual Setup (if Blueprint doesn't work)

#### Step 1: Create PostgreSQL Database
```
1. Go to: https://dashboard.render.com/new/database
2. Name: yardflow-db
3. Database: yardflow
4. User: yardflow
5. Region: Oregon
6. Plan: Free
7. Click "Create Database"
8. Copy "Internal Database URL" (starts with postgresql://...)
```

#### Step 2: Create Redis Instance
```
1. Go to: https://dashboard.render.com/new/redis
2. Name: yardflow-redis
3. Region: Oregon  
4. Plan: Free (25MB)
5. Maxmemory Policy: noeviction
6. Click "Create Redis"
7. Copy "Internal Redis URL" (starts with redis://...)
```

#### Step 3: Deploy Next.js App
```
1. Go to: https://dashboard.render.com/new/web
2. Connect your GitHub: caseyglarkin2-png/YardFlow-Hitlist
3. Name: yardflow-app
4. Region: Oregon
5. Branch: main
6. Root Directory: eventops
7. Runtime: Docker
8. Dockerfile Path: ./Dockerfile (create if needed)
9. Instance Type: Free

Environment Variables:
- NODE_ENV=production
- DATABASE_URL=<from Step 1>
- REDIS_URL=<from Step 2>
- AUTH_SECRET=1c5fdaf03e1e1293c77ea5230d5dcd7348768bf259c613a12532f5deda098851
- OPENAI_API_KEY=<your key>
- SENDGRID_API_KEY=<your key>
- NEXTAUTH_URL=https://yardflow-app.onrender.com

10. Click "Create Web Service"
```

#### Step 4: Deploy Worker Service
```
1. Go to: https://dashboard.render.com/new/background-worker
2. Connect same repo
3. Name: yardflow-worker
4. Region: Oregon
5. Branch: main
6. Root Directory: . (project root)
7. Runtime: Docker
8. Dockerfile Path: ./Dockerfile.worker
9. Instance Type: Free

Environment Variables (same as app):
- NODE_ENV=production
- DATABASE_URL=<from Step 1>
- REDIS_URL=<from Step 2>
- AUTH_SECRET=<same>
- OPENAI_API_KEY=<same>
- SENDGRID_API_KEY=<same>

10. Click "Create Background Worker"
```

## Render vs Railway: Key Differences

### Advantages
- ✅ **No config overrides** - What you deploy is what runs
- ✅ **Better free tier** - Postgres + Redis free forever
- ✅ **Infrastructure as Code** - render.yaml version controlled
- ✅ **Native background workers** - No startCommand hacks
- ✅ **Better logs** - Clearer deployment feedback
- ✅ **Auto SSL** - Free HTTPS on *.onrender.com

### Things to Know
- ⏱️ **Free tier spins down** - Apps sleep after 15 min inactivity (wakes in ~30s)
- 🔄 **Deploy takes ~2-3 minutes** - Slower than Railway, but reliable
- 📦 **750 hours/month free** - Plenty for development

## Dockerfile for Next.js App

If you need to create `eventops/Dockerfile`:

```dockerfile
FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application code
COPY . .

# Build Next.js app
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## Post-Deployment Steps

1. **Run Database Migrations**:
   ```bash
   # In Render shell for yardflow-app
   npx prisma migrate deploy
   npx prisma db seed
   ```

2. **Verify Services**:
   - App: https://yardflow-app.onrender.com
   - Health: https://yardflow-app.onrender.com/api/health
   - Worker logs: Check Render dashboard

3. **Test Queue**:
   - Create a contact in the app
   - Check worker logs for job processing

## Monitoring

- **Logs**: https://dashboard.render.com → Select service → Logs tab
- **Metrics**: Free tier includes basic CPU/memory metrics
- **Alerts**: Set up in dashboard for crashes

## Scaling (When Ready)

```
Free Tier:
- Web: 512 MB RAM, shared CPU
- Worker: 512 MB RAM, shared CPU
- Postgres: 256 MB, 1 GB storage
- Redis: 25 MB

Paid Tier ($7/month per service):
- Web: 1 GB RAM, dedicated CPU
- Always-on (no spin down)
- 100 GB bandwidth
```

## Rollback

```bash
# Via dashboard
1. Go to service → Deploys
2. Click three dots on previous deploy
3. Click "Redeploy"
```

## Next Steps

1. Deploy via Blueprint (render.yaml)
2. Set secret environment variables
3. Verify all services online
4. Run migrations
5. Test end-to-end
