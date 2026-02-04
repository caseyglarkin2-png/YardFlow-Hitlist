# Environment Variables Reference

> Auto-generated audit for YardFlow Hitlist backend. Keep updated when adding new env vars.

## Critical (Build Breakers)

These variables MUST be set or the application will not start.

| Variable | Description | Example | Used In |
|----------|-------------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Prisma, all DB operations |
| `AUTH_SECRET` | NextAuth.js session encryption key | 32+ char random string | Auth, session management |
| `REDIS_URL` | Redis connection string | `redis://default:pass@host:6379` | BullMQ queues, worker |

## Authentication & Security

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CRON_SECRET` | Bearer token for cron job auth | - | Yes (for crons) |
| `SERVICE_TO_SERVICE_SECRET` | S2S auth between GTM↔Backend | - | Yes (for S2S) |
| `AUTH_URL` | Base URL for auth redirects | - | Yes |
| `NEXTAUTH_URL` | Alias for AUTH_URL | - | Optional |

## AI Providers

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | - | Yes (primary AI) |
| `OPENAI_API_KEY` | OpenAI API key | - | Recommended (fallback) |
| `PREFERRED_AI_PROVIDER` | Force specific provider | `gemini` | Optional |

## Email (SendGrid)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SENDGRID_API_KEY` | SendGrid API key | - | Yes (for emails) |
| `SENDGRID_FROM_EMAIL` | Sender email address | `casey@freightroll.com` | Optional |
| `SENDGRID_FROM_NAME` | Sender display name | `FreightRoll` | Optional |
| `SENDGRID_REPLY_TO` | Reply-to email address | Same as FROM_EMAIL | Optional |
| `SENDGRID_WEBHOOK_VERIFICATION_KEY` | Webhook signature key | - | For webhooks |

## External Services

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CALENDLY_LINK` | Calendly booking URL | - | Yes (AI content) |
| `CALENDLY_URL` | Alias for CALENDLY_LINK | - | Optional |
| `CALENDLY_WEBHOOK_SECRET` | Calendly webhook signing | - | For webhooks |
| `HUBSPOT_API_KEY` | HubSpot private app key | - | For CRM sync |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot OAuth token | - | For OAuth flow |

## Google Integration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - | For Gmail/Calendar |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - | For Gmail/Calendar |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | `{AUTH_URL}/api/google/callback` | Optional |

## Enrichment Services

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `HUNTER_API_KEY` | Hunter.io email finder | - | Optional |
| `CLEARBIT_API_KEY` | Clearbit enrichment | - | Optional |
| `SERPAPI_KEY` | SerpAPI for web search | - | Optional |

## Infrastructure

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_HOST` | Redis host (if not URL) | `localhost` | Optional |
| `REDIS_PORT` | Redis port (if not URL) | `6379` | Optional |
| `REDIS_PASSWORD` | Redis password (if not URL) | - | Optional |
| `PORT` | HTTP server port | `8080` | Worker only |
| `NODE_ENV` | Environment mode | `development` | Yes |

## App URLs

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_APP_URL` | Public app URL | `https://yardflow-hitlist-production-2f41.up.railway.app` | Yes |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://gtm-yard-flow.vercel.app` | Yes |

## Optional Integrations

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SLACK_WEBHOOK_URL` | Slack alert webhook | - | For alerts |
| `RESEND_API_KEY` | Resend email service | - | Alternative email |
| `YARDFLOW_CONTENT_HUB_URL` | Content hub URL | `https://flow-state-klbt.vercel.app` | Optional |
| `YARDFLOW_CONTENT_HUB_API_KEY` | Content hub auth | - | Optional |

## Email Sender Customization

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FROM_EMAIL` | Outreach sender email | `outreach@yardflow.com` | Optional |
| `FROM_NAME` | Outreach sender name | `YardFlow Outreach` | Optional |
| `COMPANY_ADDRESS` | CAN-SPAM footer address | `123 Main St...` | Yes (compliance) |

---

## Railway Service Configuration

### Web App (YardFlow-Hitlist)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
AUTH_SECRET=<random-32>
AUTH_URL=https://yardflow-hitlist-production-2f41.up.railway.app
NEXT_PUBLIC_APP_URL=https://yardflow-hitlist-production-2f41.up.railway.app
ALLOWED_ORIGINS=https://gtm-yard-flow.vercel.app
GEMINI_API_KEY=<key>
OPENAI_API_KEY=<key>
SENDGRID_API_KEY=<key>
CALENDLY_LINK=<calendly-url>
SERVICE_TO_SERVICE_SECRET=<s2s-secret>
CRON_SECRET=<cron-secret>
```

### Worker Service (YardFlow-Worker)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PORT=8080
NODE_ENV=production
```

---

## Validation on Startup

The health endpoint (`/api/health`) validates:

**Critical (cause 503)**:
- `DATABASE_URL`
- `AUTH_SECRET`
- `REDIS_URL`

**Optional (noted but not blocking)**:
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SENDGRID_API_KEY`
- `CRON_SECRET`

---

## Manifest 2026 Minimum Viable Set

For the event, ensure these are configured:

1. ✅ `DATABASE_URL` - Postgres
2. ✅ `REDIS_URL` - Queue processing
3. ✅ `AUTH_SECRET` - Sessions
4. ✅ `GEMINI_API_KEY` - AI content
5. ✅ `OPENAI_API_KEY` - AI fallback
6. ✅ `SENDGRID_API_KEY` - Email delivery
7. ✅ `CALENDLY_LINK` - Meeting booking
8. ✅ `SERVICE_TO_SERVICE_SECRET` - GTM integration
9. ✅ `CRON_SECRET` - Scheduled jobs
10. ✅ `ALLOWED_ORIGINS` - CORS for GTM

---

*Last updated: 2025-01-27*
