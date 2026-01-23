# Railway Deployment

This app is configured for Railway deployment.

## Environment Variables Required

Set these in Railway dashboard:

```
DATABASE_URL=postgresql://...
AUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=your-secret-key
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=casey@freightroll.com
HUBSPOT_API_KEY=ffe089b9-5787-4a13-857b-f2e071851b8e
OPENAI_API_KEY=your-openai-key
CASEY_EMAIL=casey@freightroll.com
JAKE_EMAIL=jake@freightroll.com
```

## Deploy to Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login:
```bash
railway login
```

3. Link project:
```bash
railway link
```

4. Deploy:
```bash
railway up
```

## Or use GitHub integration:
1. Push to GitHub
2. Connect repo in Railway dashboard
3. Railway will auto-deploy

## Database Setup

Railway provides PostgreSQL:
1. Add PostgreSQL service in Railway
2. Copy DATABASE_URL to environment variables
3. Run migrations on first deploy
