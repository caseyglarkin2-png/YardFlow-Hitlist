# Google Cloud Console Setup - Step by Step

## 1. Create/Select Project
1. Go to: https://console.cloud.google.com/
2. Click project dropdown (top left)
3. Click "NEW PROJECT"
4. Name: `YardFlow-EventOps`
5. Click "CREATE"

## 2. Enable Required APIs
1. Go to: https://console.cloud.google.com/apis/library
2. Search and enable each:
   - **Google Calendar API** → Click "ENABLE"
   - **Gmail API** → Click "ENABLE"  
   - **People API** → Click "ENABLE"

## 3. Configure OAuth Consent Screen
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Select **External** user type → Click "CREATE"
3. Fill in:
   - App name: `YardFlow EventOps`
   - User support email: `casey@freightroll.com`
   - Developer contact: `casey@freightroll.com`
4. Click "SAVE AND CONTINUE"
5. **Scopes:** Click "ADD OR REMOVE SCOPES"
   - Search: `calendar.readonly` → Check box
   - Search: `gmail.readonly` → Check box
   - Search: `contacts.readonly` → Check box
   - Click "UPDATE" → "SAVE AND CONTINUE"
6. **Test users:** Click "ADD USERS"
   - Add: `casey@freightroll.com`
   - Click "SAVE AND CONTINUE"
7. Click "BACK TO DASHBOARD"

## 4. Create OAuth 2.0 Credentials
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "CREATE CREDENTIALS" → "OAuth client ID"
3. Application type: **Web application**
4. Name: `YardFlow EventOps Production`
5. **Authorized redirect URIs** → Click "ADD URI":
   - `https://yard-flow-hitlist.vercel.app/api/google/callback`
   - (Optional for testing) `http://localhost:3000/api/google/callback`
6. Click "CREATE"
7. **COPY IMMEDIATELY:**
   - Client ID: `xxxx.apps.googleusercontent.com`
   - Client Secret: `xxxx`
8. Click "OK"

## 5. Set Vercel Environment Variables

```bash
cd /workspaces/YardFlow-Hitlist

# Run automated setup script
chmod +x eventops/scripts/setup-google-production.sh
./eventops/scripts/setup-google-production.sh

# OR manually:
vercel env add GOOGLE_CLIENT_ID production
# Paste: your-client-id.apps.googleusercontent.com

vercel env add GOOGLE_CLIENT_SECRET production
# Paste: your-client-secret

vercel env add CRON_SECRET production
# Paste: (generated via openssl rand -base64 32)
```

## 6. Deploy to Production

```bash
vercel deploy --prod
```

## 7. Test OAuth Flow

1. Navigate to: https://yard-flow-hitlist.vercel.app/dashboard/settings/integrations
2. Click "Connect Google Account"
3. Should redirect to Google OAuth consent screen
4. Select your test user account
5. Review permissions (Calendar, Gmail, Contacts)
6. Click "Continue" (may show "App isn't verified" warning - click "Advanced" → "Go to YardFlow")
7. Redirects back with success message
8. Should see "Connected" badge with "Dry-run Mode" badge

## 8. Verify Setup

```bash
# Check Vercel env vars are set
vercel env ls

# Expected output:
# GOOGLE_CLIENT_ID (production)
# GOOGLE_CLIENT_SECRET (production)
# CRON_SECRET (production)

# Test cron endpoint (should fail with 401 if CRON_SECRET not in request)
curl https://yard-flow-hitlist.vercel.app/api/cron/google-sync

# Expected: {"error":"Unauthorized"}

# View deployment logs
vercel logs --follow
```

## 9. First Sync Test

1. In UI, toggle "Dry-run mode" to ON (should already be on)
2. Click "Sync Calendar"
3. Should show toast: "Dry-run complete - Would import X, update Y, skip Z"
4. Check browser console for any errors
5. Verify audit log count increased

## 10. Go Live

1. Toggle "Dry-run mode" to OFF
2. Click "Sync Calendar"
3. Should show toast: "Calendar synced - Imported X, updated Y"
4. Check database:
   ```bash
   # Verify events imported
   psql $DATABASE_URL -c "
     SELECT count(*) 
     FROM activities 
     WHERE entity_type = 'calendar_event';
   "
   ```

## 11. Monitor Cron

1. Wait until top of next hour
2. Check logs:
   ```bash
   vercel logs --follow | grep "cron_sync"
   ```
3. Expected output:
   ```
   cron_sync_complete: {totalUsers: 1, successCount: 1, failureCount: 0}
   ```

## Troubleshooting

### OAuth redirect mismatch error
- Verify redirect URI in Google Console exactly matches:
  `https://yard-flow-hitlist.vercel.app/api/google/callback`
- No trailing slash
- Must use HTTPS in production

### "App isn't verified" warning
- Normal for apps in testing mode
- Click "Advanced" → "Go to YardFlow (unsafe)"
- Or submit app for verification (takes weeks)

### Cron not running
- Check Vercel dashboard → Project → Settings → Crons
- Should show: `/api/cron/google-sync` with schedule `0 * * * *`
- Verify CRON_SECRET is set in production environment

### No events synced
- Verify user has events in Google Calendar (last 90 days)
- Check dry-run mode is OFF
- Check circuit breaker status (might be open after failures)
- Check user's `googleSyncPaused` is `false`

### Circuit breaker open
- Reset via:
  ```bash
  # Toggle pause/resume to reset state
  curl -X POST https://yard-flow-hitlist.vercel.app/api/google/sync/control \
    -H "Cookie: next-auth.session-token=..." \
    -d '{"action":"pause"}'
  
  curl -X POST https://yard-flow-hitlist.vercel.app/api/google/sync/control \
    -H "Cookie: next-auth.session-token=..." \
    -d '{"action":"resume"}'
  ```

## Security Notes

- Never commit `GOOGLE_CLIENT_SECRET` to git
- Rotate secrets if exposed
- Use test users only until app verified
- Monitor audit logs for suspicious activity
- Rate limits: 10 requests/min per user (configurable)
