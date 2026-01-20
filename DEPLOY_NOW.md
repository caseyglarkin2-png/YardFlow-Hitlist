# EventOps - Ready to Deploy! 🚀

## Current Status: Sprint 0 Complete ✅

Your EventOps application is fully built and ready for deployment to Vercel!

## What's Built

✅ **Next.js 14 Application** with TypeScript  
✅ **Prisma ORM** configured for Postgres  
✅ **Tailwind CSS** + design system  
✅ **Build tested** and passing  
✅ **Seed data** with test users  
✅ **Documentation** complete  

## Quick Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub

```bash
cd /workspaces/YardFlow-Hitlist

# Initialize Git in the eventops directory
cd eventops
git init
git add .
git commit -m "Sprint 0: EventOps foundation complete"

# Create a new repository on GitHub.com named "eventops"
# Then run:
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/eventops.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to **[vercel.com/new](https://vercel.com/new)**
2. Click "Import Git Repository"
3. Select your `eventops` repository
4. **Project Settings:**
   - Framework Preset: **Next.js**
   - Root Directory: `./` (keep default)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)

5. **DO NOT deploy yet** - click on **Environment Variables** first

### Step 3: Add Environment Variables

Click **Environment Variables** and add:

#### Required:

```bash
# Generate this first: openssl rand -base64 32
AUTH_SECRET=your-generated-secret-here

# Will auto-fill after first deploy
AUTH_URL=https://your-app.vercel.app
```

#### Important Notes:
- Vercel Postgres variables are added automatically in next step
- `NEXTAUTH_URL` will be set automatically by Vercel

### Step 4: Create Vercel Postgres Database

1. **Don't deploy yet!** Go to your project's **Storage** tab
2. Click **Create Database** → **Postgres**
3. Choose a name (e.g., "eventops-db")
4. Select a region (closest to your users)
5. Click **Create**

✅ Vercel automatically adds all required Postgres environment variables to your project

### Step 5: Deploy!

1. Go back to **Deployments** tab
2. Click **Redeploy** (or it may auto-deploy)
3. Wait for deployment (~2 minutes)

### Step 6: Run Database Migrations

After deployment succeeds:

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
cd /workspaces/YardFlow-Hitlist/eventops
vercel link

# Pull environment variables
vercel env pull .env.production

# Run migrations on production database
npx prisma migrate deploy

# Seed the database with test users
npx prisma db seed
```

### Step 7: Test Your App! 🎉

1. Visit your Vercel URL (shown in dashboard)
2. You should see the EventOps homepage
3. Login with:
   - **Admin:** casey@eventops.com / password
   - **Member:** jake@eventops.com / password

---

## Alternative: Local Development First

Want to test locally before deploying?

### Using Docker Postgres:

```bash
cd /workspaces/YardFlow-Hitlist/eventops

# Start Postgres
docker compose up -d

# Update .env with local connection:
# POSTGRES_PRISMA_URL="postgresql://eventops:eventops@localhost:5432/eventops"

# Run migrations
npx prisma migrate dev --name init

# Seed database
npx prisma db seed

# Start app
npm run dev
```

Visit: http://localhost:3000

---

## Generated AUTH_SECRET

Generate your secret (run this command):

```bash
openssl rand -base64 32
```

Example output: `xvZ9L7YhK2Tm8pN3Qa5wR1Sf6Uc4Vd0Ej9Hg2Bi8Nm7=`

**Use this value for AUTH_SECRET in Vercel!**

---

## Troubleshooting

### "Prisma Client not found"
```bash
cd eventops
npm install
npx prisma generate
```

### "Environment variables missing"
Check Vercel dashboard → Settings → Environment Variables  
Ensure `AUTH_SECRET` and Postgres variables are set

### "Database migration failed"
```bash
# Reset and retry
vercel env pull
npx prisma migrate reset
npx prisma migrate deploy
npx prisma db seed
```

### "Can't login"
- Check AUTH_URL matches your Vercel domain
- Verify AUTH_SECRET is set
- Check database has users (run seed script)

---

## Next Steps After Deployment

### 1. Verify Production Works
- ✅ Can access URL
- ✅ Can login as both users
- ✅ No console errors
- ✅ Database connected

### 2. Secure Your App
```bash
# Change default passwords!
# (Will add password change feature in Sprint 1)
```

### 3. Start Sprint 1
Begin building:
- Event management
- Account CRUD
- People management
- Filters and search

See `EVENTOPS_SPRINT_PLAN.md` for detailed tasks.

### 4. Setup Custom Domain (Optional)
1. Go to Vercel project → Settings → Domains
2. Add your domain
3. Update DNS records
4. Update `AUTH_URL` environment variable

---

## Project Files Reference

```
eventops/
├── src/app/                # Next.js pages
├── src/lib/                # Utilities (db, env, logger)
├── prisma/                 # Database schema & seed
├── .env                    # Local environment (gitignored)
├── .env.example            # Template
├── package.json            # Dependencies
├── DEPLOYMENT.md           # Full deployment guide
├── README.md               # Project overview
└── docker-compose.yml      # Local Postgres option
```

---

## Help & Resources

- 📚 [Deployment Guide](./eventops/DEPLOYMENT.md) - Detailed steps
- 📋 [Sprint Plan](./EVENTOPS_SPRINT_PLAN.md) - Development roadmap
- 🔍 [README](./eventops/README.md) - Project overview
- 💬 [Vercel Docs](https://vercel.com/docs) - Platform docs
- 🗄️ [Prisma Docs](https://www.prisma.io/docs) - Database ORM

---

## Success Criteria

Your deployment is successful when:

- [x] Build completes without errors
- [ ] App accessible at Vercel URL
- [ ] Can login with test credentials
- [ ] No errors in Vercel logs
- [ ] Database has seed data
- [ ] Environment variables all set

---

**Ready to deploy?** Follow the 7 steps above and you'll be live in 5 minutes!

**Questions?** Check `DEPLOYMENT.md` for detailed troubleshooting.

**Next:** Once deployed, start Sprint 1 to build Events, Accounts, and People management.
