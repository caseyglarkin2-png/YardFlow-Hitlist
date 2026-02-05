# GTM-YardFlow Integration Guide - Sprint 34 Fixes

**Date**: February 5, 2026  
**Purpose**: Instructions for GTM-YardFlow (Vercel) to fix 403 errors when calling Railway API

---

## Problem Summary

The GTM-YardFlow frontend is receiving 403 Forbidden errors when calling:
- `/api/templates` (Railway proxied as `/api/railway/templates`)
- `/api/outreach/activity` (Railway proxied as `/api/railway/activit...`)

**Root Cause**: The S2S auth headers are either missing, malformed, or using incorrect values.

---

## Required Environment Variables (GTM-YardFlow Vercel)

Ensure these are set in Vercel:

```bash
# Railway backend URL
RAILWAY_API_URL=https://yardflow-hitlist-production-2f41.up.railway.app

# Auth - use ONE of these (CRON_SECRET recommended)
CRON_SECRET=<same value as Railway CRON_SECRET>
# OR
SERVICE_TO_SERVICE_SECRET=<same value as Railway SERVICE_TO_SERVICE_SECRET>
```

---

## Correct Auth Header Format

Railway accepts two authentication methods. Use **ONE** consistently:

### Option 1: Bearer Token (Recommended)
```typescript
const headers = {
  'Authorization': `Bearer ${process.env.CRON_SECRET}`,
  'Content-Type': 'application/json',
};
```

### Option 2: Service Key Header
```typescript
const headers = {
  'x-service-key': process.env.SERVICE_TO_SERVICE_SECRET,
  'x-user-id': 'gtm-frontend', // Optional: for audit logging
  'Content-Type': 'application/json',
};
```

---

## Fix: Railway Proxy Route

In GTM-YardFlow, locate the Railway proxy route (likely `/app/api/railway/[...path]/route.ts` or similar):

### Current (Broken) Pattern
```typescript
// ❌ Missing or incorrect auth headers
const response = await fetch(`${RAILWAY_URL}/api/${path}`, {
  method: req.method,
  headers: {
    'Content-Type': 'application/json',
    // Auth header missing or malformed!
  },
  body: req.body,
});
```

### Fixed Pattern
```typescript
// ✅ Correct S2S auth headers
export async function handler(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/railway/', '');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Add S2S auth - use whichever secret is available
  if (process.env.CRON_SECRET) {
    headers['Authorization'] = `Bearer ${process.env.CRON_SECRET}`;
  } else if (process.env.SERVICE_TO_SERVICE_SECRET) {
    headers['x-service-key'] = process.env.SERVICE_TO_SERVICE_SECRET;
  }
  
  // Optional: pass user context for audit logs
  const session = await getServerSession();
  if (session?.user?.id) {
    headers['x-user-id'] = session.user.id;
    headers['x-user-email'] = session.user.email || '';
  }
  
  const response = await fetch(`${process.env.RAILWAY_API_URL}/api/${path}`, {
    method: req.method,
    headers,
    body: req.method !== 'GET' ? JSON.stringify(await req.json()) : undefined,
  });
  
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

---

## Endpoint-Specific Notes

### GET /api/templates
```typescript
// Railway URL
const url = `${RAILWAY_URL}/api/templates`;

// Optional query params
const params = new URLSearchParams({
  tone: 'PROFESSIONAL',     // FREIGHTROLL | PROFESSIONAL | CHALLENGER
  channel: 'EMAIL',         // EMAIL | LINKEDIN | PHONE
  isActive: 'true',
});

const response = await fetch(`${url}?${params}`, {
  headers: { 'Authorization': `Bearer ${CRON_SECRET}` },
});

// Response: { templates: [...], total: number }
```

### POST /api/outreach/activity
```typescript
// Railway URL
const url = `${RAILWAY_URL}/api/outreach/activity`;

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    outreachId: 'outreach-uuid',
    type: 'OPENED',  // OPENED | CLICKED | REPLIED | BOUNCED
    metadata: {},    // Optional
  }),
});

// Response: { success: true, activity: {...} }
```

### POST /api/outreach/send-email
```typescript
// Railway URL
const url = `${RAILWAY_URL}/api/outreach/send-email`;

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    outreachId: 'outreach-uuid',
    force: false,  // Set true to bypass dedupe check
  }),
});

// Success: { success: true, messageId: 'sg-xxx', outreachId: '...' }
// Error 422: { error: 'Recipient has no email', code: 'MISSING_EMAIL' }
// Error 503: { error: 'Email service not configured', code: 'SERVICE_UNAVAILABLE' }
```

---

## Debug Checklist

If still getting 403:

### 1. Check Vercel Environment
```bash
vercel env ls
# Should show CRON_SECRET or SERVICE_TO_SERVICE_SECRET
```

### 2. Log Headers (Temporary Debug)
```typescript
// In your Railway proxy route
console.log('Outgoing headers:', {
  hasAuth: !!headers['Authorization'],
  authPrefix: headers['Authorization']?.substring(0, 10),
  hasServiceKey: !!headers['x-service-key'],
});
```

### 3. Test Direct (Bypass Proxy)
```bash
# From terminal, test Railway directly
curl -s "https://yardflow-hitlist-production-2f41.up.railway.app/api/templates" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" | jq '.templates | length'
```

### 4. Verify Secret Match
The `CRON_SECRET` value in Vercel **MUST** exactly match the value in Railway. Check for:
- Leading/trailing whitespace
- Different base64 encoding
- Escaped characters

---

## Railway API Contract Reference

See full API documentation: [RAILWAY_API_CONTRACT.md](https://github.com/caseyglarkin2-png/YardFlow-Hitlist/blob/main/docs/current/RAILWAY_API_CONTRACT.md)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | None | Public health check |
| `/api/templates` | GET | S2S | List email templates |
| `/api/outreach` | POST | S2S | Create outreach record |
| `/api/outreach/send-email` | POST | S2S | Send email via outreach |
| `/api/outreach/activity` | POST | S2S | Track email activity |
| `/api/ai/chat` | POST | S2S | Brain AI chat |
| `/api/ai/content/generate` | POST | S2S | Generate email content |

---

## SendGrid Webhook Setup (T34A.4)

To enable email tracking (opens, clicks, bounces):

1. Log into SendGrid dashboard
2. Go to **Settings → Mail Settings → Event Webhooks**
3. Add webhook URL: `https://yardflow-hitlist-production-2f41.up.railway.app/api/webhooks/sendgrid`
4. Enable events: `delivered`, `open`, `click`, `bounce`, `spamreport`, `unsubscribe`
5. (Optional) Enable signature verification and add `SENDGRID_WEBHOOK_VERIFICATION_KEY` to Railway

---

## Error Code Reference

### HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Response contains requested data |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Check request body/params - validation failed |
| 401 | Unauthorized | Auth header missing or malformed |
| 403 | Forbidden | Auth header present but invalid secret |
| 404 | Not Found | Resource doesn't exist (check ID) |
| 422 | Unprocessable | Business logic error (see error code) |
| 429 | Rate Limited | Wait and retry with exponential backoff |
| 500 | Server Error | Bug - report to Railway backend team |
| 503 | Service Unavailable | Infrastructure issue - retry later |

### Business Error Codes

Returned in the `code` field of error responses:

| Code | Endpoint | Meaning | Resolution |
|------|----------|---------|------------|
| `MISSING_EMAIL` | `/outreach/send-email` | Contact has no email address | Enrich contact first |
| `ALREADY_SENT` | `/outreach/send-email` | Email already sent to this contact | Use `force: true` to resend |
| `SERVICE_UNAVAILABLE` | `/outreach/send-email` | SendGrid not configured | Contact backend team |
| `INVALID_OUTREACH_ID` | `/outreach/send-email` | Outreach record not found | Check outreachId exists |
| `NO_ACTIVE_EVENT` | Various | User has no active event | Select an event first |
| `RATE_LIMITED` | AI endpoints | AI provider rate limited | Wait 60s and retry |

### Retry Strategy

For transient errors (429, 503), use exponential backoff:

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.ok) return response;
    
    if (response.status === 429 || response.status === 503) {
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    
    // Non-retryable error
    throw new Error(`API error: ${response.status}`);
  }
  throw new Error('Max retries exceeded');
}
```

---

## Test Commands

After making changes, verify the fix:

```bash
# 1. Test health (no auth needed)
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq '.status'

# 2. Test templates (should return 200)
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/templates \
  -H "Authorization: Bearer $CRON_SECRET" | jq '.templates | length'

# 3. Test from Vercel (through proxy)
curl -s https://gtm-yard-flow.vercel.app/api/railway/templates | jq
```

---

## Contact

Questions about Railway backend: Check [YardFlow-Hitlist issues](https://github.com/caseyglarkin2-png/YardFlow-Hitlist/issues)
