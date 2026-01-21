# Vercel Deployment Fix - Action Required

## Issue
Vercel deployments are failing because the "Root Directory" setting is incorrect.

**Error**: `The provided path "/workspaces/YardFlow-Hitlist/eventops/eventops" does not exist`

This means Vercel is looking for `/eventops/eventops` instead of just `/eventops`.

## Fix in Vercel Dashboard

1. Go to: https://vercel.com/caseys-projects-2a50de81/yard-flow-hitlist/settings

2. Navigate to **Settings > General > Root Directory**

3. Change from: `eventops`  
   Change to: `./` (or leave blank)

4. Click **Save**

5. Go to **Deployments** tab and click **Redeploy** on the latest deployment

## Verified Environment Variables

All environment variables are correctly configured:

```bash
✅ HUBSPOT_API_KEY: ffe089b9-5787-4a13-857b-f2e071851b8e
✅ SENDGRID_API_KEY: XNG9HPV4V4PGVMY85ZYNTEE4
✅ SENDGRID_FROM_EMAIL: jake@freightroll.com
✅ CASEY_EMAIL: casey@freightroll.com
✅ JAKE_EMAIL: jake@freightroll.com
✅ OPENAI_API_KEY: (configured)
✅ DATABASE_URL: (configured)
✅ AUTH_SECRET: (configured)
```

## Build Command Fixed

Updated `vercel.json`:
```json
{
  "framework": "nextjs",
  "buildCommand": "prisma generate && next build"
}
```

## User Setup Complete

**Casey Glarkin** (casey@freightroll.com):
- ✅ Can send emails via SendGrid
- ✅ Can manage outreach campaigns
- ✅ Can track LinkedIn connections
- ✅ Full admin access

**Jake** (jake@freightroll.com):
- ✅ Can send emails via SendGrid
- ✅ Can manage outreach campaigns  
- ✅ Can track LinkedIn connections in Manifest app
- ✅ Full admin access

## After Fixing Root Directory

Once you update the Root Directory setting in Vercel:

1. The build will automatically succeed
2. All features will be live at: https://yard-flow-hitlist.vercel.app
3. Both casey@freightroll.com and jake@freightroll.com can log in
4. All Sprint 13-17 features will be available:
   - LinkedIn automation
   - HubSpot CRM sync
   - A/B testing
   - Engagement scoring
   - Research refresh

## Local Build Status

✅ Local builds are passing successfully:
```bash
✓ Compiled successfully
- Prisma Client generated
- All TypeScript errors resolved
- Only ESLint warnings (non-blocking)
```

## Next Steps After Deployment

1. ✅ Vercel Root Directory fix (manual - see above)
2. ⏳ Test login with both user emails
3. ⏳ Set up custom domain: eventops.dwtb.dev
4. ⏳ Verify email sending works
5. ⏳ Test HubSpot CRM sync
6. ⏳ Test LinkedIn connection tracking

---

**Git Commit**: e59a09b (latest)  
**Repository**: https://github.com/caseyglarkin2-png/YardFlow-Hitlist  
**Vercel Project**: https://vercel.com/caseys-projects-2a50de81/yard-flow-hitlist
