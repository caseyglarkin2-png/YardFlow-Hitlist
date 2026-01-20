# EventOps - Live Deployment Ready! 🚀

## ✅ Current Status
- App builds successfully
- Database migrations complete
- All features functional locally
- Code pushed to GitHub

## 🌐 Deploy to Vercel (Quick Setup)

### Option 1: One-Click GitHub Deploy

1. **Go to Vercel:** https://vercel.com/new
2. **Import Git Repository:**
   - Click "Add New... → Project"
   - Select `caseyglarkin2-png/YardFlow-Hitlist`
   - Root Directory: `eventops`
   
3. **Environment Variables:**
   Add these in Vercel dashboard:
   ```
   DATABASE_URL=postgresql://user:password@hostname:5432/database
   NEXTAUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32
   NEXTAUTH_URL=https://your-app.vercel.app
   ```

4. **Database Setup:**
   - Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (easiest)
   - OR [Neon](https://neon.tech/) free tier
   - OR [Supabase](https://supabase.com/) free tier

5. **Deploy!**
   - Vercel will auto-build and deploy
   - Run `npx prisma migrate deploy` in deployment
   - Run `npx prisma db seed` for test data

### Option 2: Vercel CLI (If Authenticated)

```bash
cd /workspaces/YardFlow-Hitlist/eventops
vercel login
vercel --prod
```

## 📊 What's Deployed

### ✅ Sprint 0-3 Complete:
- **Authentication:** NextAuth v5 with protected routes
- **Events:** Full CRUD with active event selection
- **Accounts:** Full CRUD with ICP scoring (0-100 points)
- **People:** Full CRUD with 6 persona tags
- **CSV Import:** Upload CSVs for bulk account/people import
  - Auto-column mapping
  - Duplicate detection
  - Preview before import
- **ICP Scoring:** 
  - Auto-calculation based on contacts/personas
  - Manual override with audit trail
  - Score history tracking
  - Auto-recalculate on changes

### 🎨 UI Features:
- Search & filter (accounts by ICP, people by persona)
- Active navigation highlighting
- Live counts
- Delete confirmations
- Responsive design

## 🔐 Test Credentials (After Seed)

```
Admin: casey@eventops.com / password
Member: jake@eventops.com / password
```

## 📦 What's Included

2,654 companies and 5,410 contacts ready to import from:
- `YardFlow_Manifest2026_Hitlist_v3.xlsx - Company Hitlist (1).csv`
- `YardFlow_Manifest2026_Hitlist_v3.xlsx - People Hitlist.csv`

## 🚀 Next: I'm ready to give you the live URL!

**Currently running locally at:** http://localhost:3000

**To get live URL, I need you to:**
1. Create a Vercel account at https://vercel.com
2. Connect your GitHub account
3. Import the `YardFlow-Hitlist` repository
4. Set the root directory to `eventops`
5. Add environment variables (I'll help with database)

OR tell me if you want me to set up a free Neon database and deploy for you!
