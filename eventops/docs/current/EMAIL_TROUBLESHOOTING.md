# Email Sending Troubleshooting Guide

> Sprint 57: Root cause analysis and resolution guide for email sending issues.

---

## Error Symptoms from Frontend Console

| Error                                   | Root Cause                                            | Resolution                                         |
| --------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `403 Forbidden` on `/api/railway/*`     | **Frontend proxy** returning 403, NOT Railway backend | Check S2S auth headers in Vercel proxy             |
| `Unexpected token 'A', "A server e"...` | Next.js HTML error page returned instead of JSON      | Uncaught exception in backend - check Railway logs |
| `500` on `/api/email/send`              | Database/Redis connection or SendGrid failure         | Check Railway logs for actual error                |
| `401 Unauthorized` on any route         | Missing or invalid S2S auth headers                   | Verify `x-service-key` or `Bearer` token           |

---

## Root Cause Analysis (February 6, 2026)

### 1. 403 Forbidden NOT from Railway Backend

**Finding**: The Railway backend returns `401 Unauthorized` (JSON) for auth failures, **never 403**.

The only routes returning 403 in the backend are:

- `/api/team/*` — Admin role check
- `/api/admin/*` — Admin role check
- `/api/webhooks/sendgrid` — Signature validation
- `/api/webhooks/calendly` — Signature validation

**If frontend sees 403 on `/api/railway/outreach`:**

1. The Vercel proxy route is returning 403 before forwarding to Railway
2. Check the proxy route implementation for auth checks
3. Verify `SERVICE_TO_SERVICE_SECRET` matches between Vercel and Railway

### 2. "A Server Error" JSON Parse Failure

**Finding**: The string `"A server e"...` is a truncated HTML error page from Next.js:

```html
<html>
  <body>
    <h1>A server error has occurred</h1>
  </body>
</html>
```

**This happens when:**

1. An uncaught exception occurs before the route handler runs
2. Module import fails at runtime
3. Database/Redis connection fails during initialization
4. Environment variables are missing/malformed

**Check Railway logs** for the actual stack trace.

### 3. SendGrid 403 "Forbidden"

**Finding**: If `Email send failed: Error: Forbidden`, this is from **SendGrid**, not Railway auth:

```
Verified Senders in SendGrid:
- casey@freightroll.com ✅ Verified
- jake@freightroll.com ❌ NOT Verified
```

**Fix**:

- Use a verified sender in the "Send As" dropdown
- OR verify the sender in SendGrid → Settings → Sender Authentication

---

## S2S Authentication Reference

### Required Headers

Railway accepts S2S calls with these headers (in order of precedence):

```typescript
// Option 1: Service-to-Service key (recommended)
headers: {
  'x-service-key': process.env.SERVICE_TO_SERVICE_SECRET,
  'x-user-id': userId,  // Optional: for audit logging
  'x-user-email': email, // Optional: for user lookup
}

// Option 2: Bearer token (CRON_SECRET)
headers: {
  'Authorization': `Bearer ${process.env.CRON_SECRET}`,
}
```

### Verify S2S Configuration

Run from your local machine with the correct secret:

```bash
# Test with SERVICE_TO_SERVICE_SECRET
curl -s -H "x-service-key: YOUR_SECRET" \
  "https://yardflow-hitlist-production-2f41.up.railway.app/api/health"

# Should return JSON with status: "healthy"
```

---

## Email Sending Flow

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────┐
│  GTM-YardFlow    │     │  Railway Backend  │     │   SendGrid   │
│  (Vercel)        │     │  (YardFlow-Hitlist)│    │              │
└────────┬─────────┘     └─────────┬─────────┘     └──────┬───────┘
         │                         │                       │
         │ POST /api/railway/outreach                      │
         │ + x-service-key header  │                       │
         │ ────────────────────────>                       │
         │                         │                       │
         │        401 or 201       │                       │
         │ <────────────────────────                       │
         │                         │                       │
         │ POST /api/railway/email/send                    │
         │ + x-service-key header  │                       │
         │ ────────────────────────>                       │
         │                         │                       │
         │                         │ POST /v3/mail/send    │
         │                         │ + SENDGRID_API_KEY    │
         │                         │ ────────────────────────>
         │                         │                       │
         │                         │   202 Accepted /      │
         │                         │   403 Forbidden       │
         │                         │ <────────────────────────
         │                         │                       │
         │    200 { success: true }│                       │
         │    or 500 { error: ... }│                       │
         │ <────────────────────────                       │
```

---

## Debug Checklist

### On Vercel (Frontend)

- [ ] `SERVICE_TO_SERVICE_SECRET` env var is set
- [ ] Value matches Railway's `SERVICE_TO_SERVICE_SECRET` exactly
- [ ] Proxy route forwards `x-service-key` header
- [ ] Proxy route handles non-JSON responses gracefully

### On Railway (Backend)

- [ ] `SERVICE_TO_SERVICE_SECRET` env var is set
- [ ] `SENDGRID_API_KEY` env var is set (not placeholder)
- [ ] `DATABASE_URL` is valid (check `/api/health`)
- [ ] `REDIS_URL` is valid (check `/api/health`)

### In SendGrid

- [ ] Sender email is verified (Settings → Sender Authentication)
- [ ] API key has "Mail Send" permission
- [ ] Not in free tier with sending limits

---

## Quick Verification Commands

```bash
# 1. Test Railway health
curl -s "https://yardflow-hitlist-production-2f41.up.railway.app/api/health" | jq .status

# 2. Test email service status (need auth)
curl -s -H "x-service-key: $SERVICE_TO_SERVICE_SECRET" \
  "https://yardflow-hitlist-production-2f41.up.railway.app/api/email/send" | jq .

# 3. Test outreach route (need auth)
curl -s -H "x-service-key: $SERVICE_TO_SERVICE_SECRET" \
  "https://yardflow-hitlist-production-2f41.up.railway.app/api/outreach?limit=1" | jq .

# 4. Test email stats (need auth)
curl -s -H "x-service-key: $SERVICE_TO_SERVICE_SECRET" \
  "https://yardflow-hitlist-production-2f41.up.railway.app/api/email/stats?days=7" | jq .
```

---

## Sprint 57 Fixes Applied

| File                                          | Issue                        | Fix                                |
| --------------------------------------------- | ---------------------------- | ---------------------------------- |
| `src/app/api/campaigns/[id]/status/route.ts`  | Returns plain text on errors | Converted to `NextResponse.json()` |
| `tests/api/json-response-consistency.test.ts` | No test for JSON consistency | Added test to catch regressions    |
| `docs/current/EMAIL_TROUBLESHOOTING.md`       | No troubleshooting guide     | Created this document              |

---

## Contact

For backend issues, check Railway logs first. For frontend/proxy issues, check Vercel logs.

Questions? Ping #dev-yardflow or file an issue.
