# Vercel Deployment Configuration

## Current Setup Summary

**Single Vercel Project**: `yard-flow-hitlist`  
**Project ID**: `prj_iMcKjd3qZn5AvweCfmop1YdXBckR`  
**Organization**: `team_TkAjtDWif68PlLtgaIYZ5PLr`  
**Live URL**: https://yard-flow-hitlist.vercel.app  
**Dashboard**: https://vercel.com/caseys-projects-2a50de81/yard-flow-hitlist

## ✅ Consolidated Configuration

You have **ONE Vercel project** (not two). The confusion comes from having vercel configs at two levels:

### Project Structure
```
/workspaces/YardFlow-Hitlist/          ← Root (wrapper/scripts)
├── vercel.json                         ← Root vercel config (REMOVE THIS)
├── .vercel/                            ← Root project link (REMOVE THIS)
└── eventops/                           ← Actual Next.js app (DEPLOY THIS)
    ├── vercel.json                     ← Active config ✅
    ├── .vercel/                        ← Active project link ✅
    ├── package.json                    ← Next.js app ✅
    ├── src/                            ← Application code ✅
    └── prisma/                         ← Database schema ✅
```

## Deployment Settings

### Root Directory
**Current Setting**: `eventops`  
**Status**: ✅ Correct

This tells Vercel to build from the `/eventops` subdirectory.

### Build Configuration

**Active Config** (`/eventops/vercel.json`):
```json
{
  "framework": "nextjs",
  "buildCommand": "npx prisma generate && npx next build"
}
```

### Build Commands
- **Install**: `npm install` (automatic)
- **Build**: `npx prisma generate && npx next build`
- **Output**: `.next` (automatic for Next.js)

## Environment Variables Configured

All set in Vercel dashboard:

- ✅ `DATABASE_URL` - Postgres connection
- ✅ `AUTH_SECRET` - NextAuth secret
- ✅ `OPENAI_API_KEY` - AI features
- ✅ `HUBSPOT_API_KEY` - CRM integration
- ✅ `SENDGRID_API_KEY` - Email sending
- ✅ `SENDGRID_FROM_EMAIL` - jake@freightroll.com
- ✅ `CASEY_EMAIL` - casey@freightroll.com
- ✅ `JAKE_EMAIL` - jake@freightroll.com

## Deployment Workflow

### Method 1: Git Push (Recommended)
```bash
git add .
git commit -m "Your changes"
git push origin main
```
Vercel automatically deploys on push to `main` branch.

### Method 2: Manual Deploy from Root
```bash
cd /workspaces/YardFlow-Hitlist
vercel --prod
```
This uses the root `.vercel/project.json` which points to `eventops/` as root directory.

### Method 3: Deploy from Eventops Directory
```bash
cd /workspaces/YardFlow-Hitlist/eventops
vercel --prod
```
This uses the `eventops/.vercel/project.json` directly.

## File Cleanup Recommended

To avoid confusion, remove duplicate configs at root level:

```bash
# Optional: Remove root-level vercel configs (not needed)
rm /workspaces/YardFlow-Hitlist/vercel.json
rm -rf /workspaces/YardFlow-Hitlist/.vercel
```

**Why?** The root-level configs point to the same project but can cause confusion. The Vercel project is already configured with `rootDirectory: "eventops"`, so deploying from the repository root will work correctly.

## Active Users

Both configured with full admin access:

1. **Casey Glarkin** - casey@freightroll.com
2. **Jake** - jake@freightroll.com

## Custom Domain Setup (Future)

To add custom domain `eventops.dwtb.dev`:

1. Go to: https://vercel.com/caseys-projects-2a50de81/yard-flow-hitlist/settings/domains
2. Add domain: `eventops.dwtb.dev`
3. Configure DNS:
   ```
   Type: CNAME
   Name: eventops.dwtb.dev
   Value: cname.vercel-dns.com
   ```

## Current Deployment Status

- ✅ Project linked to Vercel
- ✅ Root directory set to `eventops`
- ✅ Build command configured
- ✅ Environment variables set
- ✅ Database connected
- ✅ Auto-deployments enabled on main branch

## Troubleshooting

### If deployment fails:

1. **Check build logs**: https://vercel.com/caseys-projects-2a50de81/yard-flow-hitlist/deployments
2. **Verify root directory**: Should be `eventops` in Settings > General
3. **Check environment variables**: Settings > Environment Variables
4. **Test locally**: `cd eventops && npm run build`

### Common Issues:

- **Path not found error**: Root directory setting is wrong
- **Build fails**: Missing environment variables or Prisma generate failed
- **Runtime errors**: Database connection or environment variable issues

## Quick Reference

| Setting | Value |
|---------|-------|
| **Project Name** | yard-flow-hitlist |
| **Framework** | Next.js 14 |
| **Root Directory** | eventops |
| **Node Version** | 24.x |
| **Build Command** | `npx prisma generate && npx next build` |
| **Deploy Trigger** | Push to `main` branch |
| **Live URL** | https://yard-flow-hitlist.vercel.app |

---

**Last Updated**: January 21, 2026  
**Repository**: https://github.com/caseyglarkin2-png/YardFlow-Hitlist
