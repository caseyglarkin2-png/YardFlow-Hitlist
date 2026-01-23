# 🚀 Sprint 18 - Production Deployment (5-Minute Checklist)

**Status:** Code deployed, ready for OAuth setup  
**Time Required:** ~5 minutes  
**Your CRON_SECRET:** `MgDJzgbdu0d+DFXnrqBbxZsqSCwriDNA2P4EuT6UB0k=`

---

## ⚡ Quick Start (Choose One)

### Option A: Automated Setup (Recommended)
```bash
cd /workspaces/YardFlow-Hitlist
./eventops/scripts/setup-google-production.sh
```
*(Will prompt you for Google credentials)*

### Option B: Manual Setup
Follow steps below ⬇️

---

## 📋 Manual Setup Steps

### 1. Google Cloud Console (2 minutes)
🔗 **Quick Link:** https://console.cloud.google.com/apis/credentials

1. Click "CREATE CREDENTIALS" → "OAuth client ID"
2. Application type: **Web application**
3. Name: `YardFlow Production`
4. Authorized redirect URIs:
   ```
   https://yard-flow-hitlist.vercel.app/api/google/callback
   ```
5. Click "CREATE"
6. **COPY** Client ID & Secret

**Enable APIs:** (if not already)
- https://console.cloud.google.com/apis/library/calendar-json.googleapis.com → ENABLE
- https://console.cloud.google.com/apis/library/gmail.googleapis.com → ENABLE
- https://console.cloud.google.com/apis/library/people.googleapis.com → ENABLE

### 2. Set Vercel Environment Variables (1 minute)
```bash
vercel env add GOOGLE_CLIENT_ID production
# Paste: xxxx.apps.googleusercontent.com

vercel env add GOOGLE_CLIENT_SECRET production
# Paste: your-secret

vercel env add CRON_SECRET production
# Paste: MgDJzgbdu0d+DFXnrqBbxZsqSCwriDNA2P4EuT6UB0k=
```

### 3. Redeploy (1 minute)
```bash
vercel deploy --prod
```

### 4. Test OAuth (1 minute)
1. Go to: https://yard-flow-hitlist.vercel.app/dashboard/settings/integrations
2. Click "Connect Google Account"
3. Sign in with your Google account
4. Review permissions (Calendar, Gmail, Contacts)
5. Click "Continue"
6. Should redirect back with "Connected" badge

---

## ✅ Verification

Run automated check:
```bash
./eventops/scripts/verify-production.sh
```

Or manual check:
```bash
# Should show Connected badge
open https://yard-flow-hitlist.vercel.app/dashboard/settings/integrations

# Should show 401 Unauthorized
curl https://yard-flow-hitlist.vercel.app/api/cron/google-sync
```

---

## 🧪 First Sync Test

1. In UI, verify "Dry-run Mode" badge is ON (should be by default)
2. Click "Sync Calendar"
3. Toast should show: "Dry-run complete - Would import X, update Y"
4. Toggle "Dry-run mode" OFF
5. Click "Sync Calendar" again
6. Toast should show: "Calendar synced - Imported X, updated Y"

---

## 📊 Monitor Cron Job

Cron runs every hour at :00 minutes. To monitor:

```bash
# View live logs
vercel logs --follow

# Check cron schedule
vercel crons ls

# Should show:
# /api/cron/google-sync    0 * * * *
```

Expected log output at top of hour:
```json
{
  "event": "cron_sync_complete",
  "totalUsers": 1,
  "successCount": 1,
  "failureCount": 0,
  "durationMs": 2341
}
```

---

## 🛑 Emergency Controls

### Global Kill Switch (Admin Only)
```bash
# Disable ALL syncs immediately
curl -X POST https://yard-flow-hitlist.vercel.app/api/admin/google-sync/control \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{"action":"disable"}'

# Re-enable
curl -X POST https://yard-flow-hitlist.vercel.app/api/admin/google-sync/control \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{"action":"enable"}'
```

### Per-User Pause (via UI)
- Dashboard → Settings → Integrations
- Toggle "Auto-sync enabled" OFF

---

## 🔍 Troubleshooting

### "OAuth redirect mismatch"
- Verify redirect URI in Google Console exactly matches:
  `https://yard-flow-hitlist.vercel.app/api/google/callback`

### "App isn't verified" warning
- Normal for apps in testing
- Click "Advanced" → "Go to YardFlow (unsafe)"

### No events syncing
- Check dry-run mode is OFF
- Verify you have events in Google Calendar (last 90 days)
- Check user's `googleSyncPaused` is `false` in database

### Cron not running
- Check `CRON_SECRET` is set in Vercel production environment
- Verify cron schedule in Vercel dashboard

**Full troubleshooting guide:** See [GOOGLE_CLOUD_SETUP.md](../GOOGLE_CLOUD_SETUP.md)

---

## 🎯 Success Criteria

- [ ] OAuth credentials created in Google Cloud
- [ ] 3 environment variables set in Vercel
- [ ] Redeployed to production
- [ ] Successfully connected Google account via UI
- [ ] Dry-run calendar sync shows preview
- [ ] Live calendar sync imports events
- [ ] "Connected" badge shows in Settings
- [ ] Cron job logged at next hour

---

## 📚 Documentation

- **Setup Guide:** [GOOGLE_CLOUD_SETUP.md](../GOOGLE_CLOUD_SETUP.md)
- **Sprint Summary:** [SPRINT_18_COMPLETE.md](../SPRINT_18_COMPLETE.md)
- **Philosophy:** [.yardflow-philosophy.md](../.yardflow-philosophy.md)

---

## 🔐 Security Notes

- ✅ Dry-run mode enabled by default (safe testing)
- ✅ Circuit breaker prevents API abuse
- ✅ Sync locks prevent concurrent runs
- ✅ Rate limiting (10 req/min per user)
- ✅ Global kill switch for emergencies
- ✅ Auto-pause on token revocation
- ✅ CRON_SECRET protects background jobs

**Never commit secrets to git!**

---

**Need help?** All scripts are in `eventops/scripts/`  
**Questions?** Check `GOOGLE_CLOUD_SETUP.md` for detailed walkthrough
