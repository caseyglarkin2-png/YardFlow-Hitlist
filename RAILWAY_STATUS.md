# Railway Deployment Status

## 🚀 Live URL
**https://yardflow-hitlist-production.up.railway.app**

## ✅ Configured Environment Variables

These are already set in Railway:

- `AUTH_SECRET` = `1c5fdaf03e1e1293c77ea5230d5dcd7348768bf259c613a12532f5deda098851`
- `NEXTAUTH_SECRET` = `1c5fdaf03e1e1293c77ea5230d5dcd7348768bf259c613a12532f5deda098851`
- `NEXTAUTH_URL` = `https://yardflow-hitlist-production.up.railway.app`
- `SENDGRID_FROM_EMAIL` = `casey@freightroll.com`
- `HUBSPOT_API_KEY` = `ffe089b9-5787-4a13-857b-f2e071851b8e`
- `CASEY_EMAIL` = `casey@freightroll.com`
- `JAKE_EMAIL` = `jake@freightroll.com`
- `NIXPACKS_BUILD_CMD` = `npm ci && npx prisma generate && npm run build`
- `NIXPACKS_START_CMD` = `npx prisma migrate deploy && npm start`
- `DATABASE_URL` = (Automatically set by Railway PostgreSQL service)

## ⚠️ MISSING - Add These API Keys

You need to add these two environment variables in the Railway dashboard:

### 1. SendGrid API Key
```bash
railway variables --set SENDGRID_API_KEY='your-sendgrid-api-key-here'
```

**To get your SendGrid API key:**
1. Go to https://app.sendgrid.com/settings/api_keys
2. Create a new API key with "Full Access" or "Mail Send" permissions
3. Copy the key
4. Run the command above or add it via Railway dashboard

### 2. OpenAI API Key
```bash
railway variables --set OPENAI_API_KEY='your-openai-api-key-here'
```

**To get your OpenAI API key:**
1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Copy the key
4. Run the command above or add it via Railway dashboard

## Alternative: Add via Railway Dashboard

1. Go to: https://railway.app/project/ccb7c86f-1bc7-4040-8703-832846c5883b
2. Click on "YardFlow-Hitlist" service
3. Go to "Variables" tab
4. Click "Add Variable"
5. Add `SENDGRID_API_KEY` with your SendGrid key
6. Add `OPENAI_API_KEY` with your OpenAI key
7. Click "Deploy" to redeploy with new variables

## 📊 Database

PostgreSQL database has been added to your Railway project and is automatically linked via `DATABASE_URL`.

The first deployment will run:
```bash
npx prisma migrate deploy
```

This will create all database tables from your Prisma schema.

## 🔄 Current Deployment Status

The app is building now. Once the build completes successfully (should take 2-3 minutes), your app will be live at:

**https://yardflow-hitlist-production.up.railway.app**

## 🐛 Troubleshooting

If deployment fails after adding API keys:
1. Check build logs: `railway logs`
2. Check that all environment variables are set: `railway variables`
3. Redeploy manually: `railway up --detach`

## ✅ Next Steps After Adding API Keys

1. Add the two missing API keys (SENDGRID_API_KEY and OPENAI_API_KEY)
2. Railway will automatically redeploy
3. Visit your live URL to test the app
4. Sign in with GitHub OAuth
5. Create your first event and start using EventOps!

## 📝 Notes

- GitHub OAuth is configured for `http://localhost:3000` - you'll need to add the production URL to your GitHub OAuth app settings
- Go to: https://github.com/settings/developers
- Add `https://yardflow-hitlist-production.up.railway.app/api/auth/callback/github` as an authorized callback URL
