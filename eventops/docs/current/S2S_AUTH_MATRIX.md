# Service-to-Service Authentication Matrix

> Reference document for GTM-YardFlow ↔ YardFlow-Hitlist integration

## Overview

YardFlow-Hitlist supports three authentication methods:

| Method | Header | Use Case |
|--------|--------|----------|
| **S2S Key** | `x-service-key: <SECRET>` | GTM frontend → Backend API calls |
| **Bearer Token** | `Authorization: Bearer <CRON_SECRET>` | Cron jobs, scheduled tasks |
| **Session** | Cookie-based (NextAuth) | Dashboard UI, direct access |

## Authentication Flow

```
┌─────────────────┐     x-service-key      ┌──────────────────┐
│  GTM-YardFlow   │ ─────────────────────► │ YardFlow-Hitlist │
│   (Vercel)      │                        │    (Railway)     │
└─────────────────┘                        └──────────────────┘
        │                                          │
        │ Optional headers:                        │
        │ • x-user-id: <userId>                    │
        │ • x-user-email: <email>                  │
        └──────────────────────────────────────────┘
```

## Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `SERVICE_TO_SERVICE_SECRET` | Both | Shared secret for S2S auth |
| `CRON_SECRET` | Backend | Bearer token for cron jobs |
| `AUTH_SECRET` | Backend | NextAuth session encryption |

## API Routes by Auth Type

### S2S-Enabled Routes (42 routes)

These routes accept `x-service-key` header via `authServiceOrSession()`:

#### Core Data APIs
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/accounts` | GET, POST | Account CRUD |
| `/api/people` | GET, POST | Person CRUD |
| `/api/enrollments` | GET, POST | Sequence enrollments |
| `/api/sequences` | GET, POST | Outreach sequences |
| `/api/templates` | GET, POST | Message templates |
| `/api/templates/[id]` | GET, PUT, DELETE | Template by ID |

#### AI & Content
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/ai/content/generate` | POST | Generate email content |
| `/api/ai/dossier` | POST | Generate account dossier |

#### Email & Outreach
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/outreach/send-email` | POST | Send single email |
| `/api/outreach/send-bulk` | POST | Send bulk emails |
| `/api/outreach/bulk` | POST | Bulk outreach operations |
| `/api/outreach/[id]/status` | GET | Outreach status |
| `/api/email/test` | POST, GET | Test email sending |
| `/api/email/stats` | GET | Email statistics |

#### Analytics
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/analytics/cohort` | GET | Cohort analysis |
| `/api/analytics/funnel` | GET | Funnel metrics |
| `/api/analytics/predictions` | GET | Predictive analytics |
| `/api/dashboards/stats` | GET | Dashboard statistics |
| `/api/dashboards/email` | GET | Email dashboard |

#### Agents & Workflows
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/agents/trigger` | POST | Trigger agent workflow |
| `/api/agents/status` | GET, POST | Agent status |
| `/api/agents/control` | POST | Start/stop agents |
| `/api/agents/monitor` | GET | Agent monitoring |
| `/api/agents/workflow/[id]` | GET, PATCH | Workflow management |

#### Research & Enrichment
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/research/bulk` | POST | Bulk research |
| `/api/research/candidates` | POST | Candidate research |
| `/api/research/competitive` | POST | Competitive research |
| `/api/research/facilities` | POST | Facility research |
| `/api/research/locations` | POST | Location research |
| `/api/research/refresh` | POST | Refresh research data |
| `/api/enrichment/company/batch` | POST | Batch company enrichment |
| `/api/enrichment/company/enrich` | POST | Single company enrichment |
| `/api/enrichment/email` | POST | Email enrichment |
| `/api/enrichment/linkedin/discover` | POST | LinkedIn discovery |

#### Utility
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/export` | GET | Export data |
| `/api/locks` | GET, POST | Distributed locks |
| `/api/queue/status` | GET | Queue status |
| `/api/events` | GET, POST | Event tracking |
| `/api/ab-test` | GET, POST | A/B test management |

### Public Routes (No Auth Required)

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/health` | GET | Health check |
| `/api/health/deep` | GET | Deep health check (optional CRON_SECRET) |
| `/api/webhooks/calendly` | POST | Calendly webhook |
| `/api/webhooks/sendgrid` | POST | SendGrid webhook |

### Cron-Only Routes (Bearer Token)

| Route | Auth Header | Description |
|-------|-------------|-------------|
| `/api/cron/sequences` | `Authorization: Bearer <CRON_SECRET>` | Process sequences |
| `/api/cron/google-sync` | `Authorization: Bearer <CRON_SECRET>` | Sync Google data |

### Session-Only Routes

These routes require NextAuth session (dashboard access):

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth/*` | Various | NextAuth endpoints |
| `/api/google/connect` | GET | Google OAuth initiation |
| `/api/google/callback` | GET | Google OAuth callback |

---

## Implementation Guide

### GTM Frontend (Caller)

```typescript
// utils/backend-client.ts
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const S2S_SECRET = process.env.SERVICE_TO_SERVICE_SECRET;

export async function callBackend(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': S2S_SECRET,
      ...options.headers,
    },
  });
}

// With user context
export async function callBackendAsUser(
  path: string,
  userId: string,
  userEmail: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': S2S_SECRET,
      'x-user-id': userId,
      'x-user-email': userEmail,
      ...options.headers,
    },
  });
}
```

### Backend (Receiver)

```typescript
// src/app/api/example/route.ts
import { authServiceOrSession } from '@/lib/auth-service';

export async function POST(req: NextRequest) {
  const authResult = await authServiceOrSession(req);
  
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // authResult.type: 'session' | 'service'
  // authResult.userId: user ID or 'service:gtm-frontend'
  // authResult.email: optional email
  
  // Your logic here...
}
```

---

## Request ID Tracing

All API responses include `x-request-id` header for debugging:

```bash
curl -i https://yardflow-hitlist.../api/health
# Response headers include:
# x-request-id: lxyz123-a1b2c3
```

Pass `x-request-id` from GTM to correlate logs:

```typescript
const response = await fetch(url, {
  headers: {
    'x-service-key': S2S_SECRET,
    'x-request-id': generateRequestId(), // Optional: your own ID
  },
});

// Response will echo back the ID
const requestId = response.headers.get('x-request-id');
```

---

## Security Checklist

- [ ] `SERVICE_TO_SERVICE_SECRET` is at least 32 characters
- [ ] Secret is different between staging and production
- [ ] Secret is stored in Railway/Vercel env vars, not code
- [ ] HTTPS only (Railway provides this automatically)
- [ ] CORS configured for `https://gtm-yard-flow.vercel.app`

---

## Troubleshooting

### 401 Unauthorized

1. Check `x-service-key` header is present
2. Verify `SERVICE_TO_SERVICE_SECRET` matches on both services
3. Check for typos in header name (lowercase `x-service-key`)

### 403 Forbidden

1. Route may require session auth only
2. Check if route uses `authServiceOrSession` or just `auth()`

### CORS Errors

1. Verify `ALLOWED_ORIGINS` includes GTM domain
2. Check preflight OPTIONS response

---

*Last updated: 2025-02-04*
