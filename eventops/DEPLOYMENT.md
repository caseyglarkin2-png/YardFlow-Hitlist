# EventOps Deployment Guide - Vercel

## Quick Start (5 minutes)

### 1. Push to GitHub

```bash
cd /workspaces/YardFlow-Hitlist/eventops
git init
git add .
git commit -m "Initial commit - Sprint 0 foundation"
git branch -M main

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/eventops.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your `eventops` repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (or `eventops` if in monorepo)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
5. **Don't deploy yet** - we need to setup the database first

### 3. Create Vercel Postgres Database

1. In your Vercel project dashboard, go to the **Storage** tab
2. Click **Create Database**
3. Select **Postgres**
4. Choose a region close to your users
5. Click **Create**

Vercel will automatically add these environment variables to your project:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NO_SSL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### 4. Add Required Environment Variables

In Vercel project → **Settings** → **Environment Variables**, add:

```bash
# Auth (REQUIRED)
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
AUTH_URL=https://your-app.vercel.app

# Feature Flags
ENABLE_AUTO_ENRICHMENT=false

# Node Environment
NODE_ENV=production
```

**Generate AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 5. Deploy

Click **Deploy** in Vercel dashboard.

### 6. Run Database Migrations

After first deployment, run migrations:

#### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed
```

#### Option B: Via GitHub Action (Advanced)

Add `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - name: Run migrations
        env:
          POSTGRES_PRISMA_URL: ${{ secrets.POSTGRES_PRISMA_URL }}
        run: npx prisma migrate deploy
```

### 7. Test Your Deployment

1. Visit your Vercel URL (e.g., `https://eventops.vercel.app`)
2. Should see the EventOps landing page
3. Login with:
   - **Admin:** casey@eventops.com / password
   - **Member:** jake@eventops.com / password

---

## Local Development with Vercel Postgres

To use the Vercel Postgres database locally:

```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

---

## Alternative: Local Development with Docker

If you prefer local Postgres for development:

1. Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: eventops-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: eventops
      POSTGRES_PASSWORD: eventops
      POSTGRES_DB: eventops
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eventops"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

2. Update `.env`:

```bash
POSTGRES_PRISMA_URL="postgresql://eventops:eventops@localhost:5432/eventops"
POSTGRES_URL_NON_POOLING="postgresql://eventops:eventops@localhost:5432/eventops"
```

3. Start database:

```bash
docker compose up -d
npx prisma migrate dev
npx prisma db seed
npm run dev
```

---

## Continuous Deployment

Vercel automatically deploys when you push to `main`:

```bash
git add .
git commit -m "Add new feature"
git push
```

Each push creates a preview deployment. Merging to `main` deploys to production.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PRISMA_URL` | ✅ | Prisma connection string (with pgBouncer) |
| `POSTGRES_URL_NON_POOLING` | ✅ | Direct connection (for migrations) |
| `AUTH_SECRET` | ✅ | NextAuth secret (min 32 chars) |
| `AUTH_URL` | ✅ | App URL for callbacks |
| `ENABLE_AUTO_ENRICHMENT` | ⬜ | Enable AI enrichment (default: false) |
| `SERPAPI_KEY` | ⬜ | For Sprint 8 enrichment |
| `OPENAI_API_KEY` | ⬜ | For Sprint 8 enrichment |

---

## Troubleshooting

### Build Fails

```bash
# Check environment variables are set
vercel env ls

# Check logs
vercel logs

# Test build locally
npm run build
```

### Database Connection Issues

```bash
# Verify Prisma schema
npx prisma validate

# Test connection
npx prisma db execute --stdin <<< "SELECT 1"

# Regenerate client
npx prisma generate
```

### Migrations Stuck

```bash
# Reset migrations (WARNING: deletes data)
npx prisma migrate reset

# Or apply specific migration
npx prisma migrate deploy
```

---

## Production Checklist

Before going live:

- [ ] Strong `AUTH_SECRET` generated and set
- [ ] `AUTH_URL` points to production domain
- [ ] Database migrations applied
- [ ] Seed data loaded (or production data imported)
- [ ] Test login with both user roles
- [ ] Verify all pages load
- [ ] Check Vercel logs for errors
- [ ] Setup custom domain (optional)
- [ ] Enable Vercel Analytics (optional)

---

## Next Steps

After successful deployment:

1. **Sprint 1:** Implement Events + Accounts + People CRUD
2. **Sprint 2:** CSV ingestion and deduplication
3. **Sprint 3:** Scoring engine

See [EVENTOPS_SPRINT_PLAN.md](../EVENTOPS_SPRINT_PLAN.md) for detailed tasks.
