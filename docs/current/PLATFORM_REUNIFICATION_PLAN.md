# Platform Reunification Sprint Plan

> **Status**: ACTIVE  
> **Created**: January 30, 2026  
> **Last Updated**: January 30, 2026  
> **Reviewed By**: AI Senior TPM Subagent  
> **Philosophy**: Ship Fast, Ship Often - Atomic, testable tasks  
> **Goal**: Unify GTM Vercel frontend with Railway backend into cohesive platform

---

## Quick Wins Completed ✅

- [x] **R0.1**: Deleted `/api/debug/env` route (security vulnerability)
- [x] **R0.2**: Protected `/api/ai/dossier` with authServiceOrSession
- [x] **R0.3**: Protected analytics endpoints (cohort, funnel, predictions)
- [x] **R0.4**: Protected `/api/locks` with authServiceOrSession
- [x] **R1.1**: Created `src/lib/auth-service.ts` (S2S auth helper)
- [x] **R2.1**: Added CORS headers to next.config.mjs
- [x] **R2.2**: Updated middleware.ts with OPTIONS preflight handling
- [x] **R3.1**: Migrated core routes to authServiceOrSession (accounts, people, campaigns, events, sequences, templates)
- [x] **R4.1**: Created `src/lib/content-hub.ts` (centralized client)
- [x] **R4.2**: Updated agents to use content-hub.ts client

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   GTM Frontend      │ │   Content Hub       │ │   Direct Access     │
│   (Vercel)          │ │   (Vercel)          │ │   (Railway)         │
│                     │ │                     │ │                     │
│ gtm-yard-flow       │ │ flow-state-klbt     │ │ yardflow-hitlist    │
│ .vercel.app         │ │ .vercel.app         │ │ -production-2f41    │
│                     │ │                     │ │ .up.railway.app     │
└─────────┬───────────┘ └──────────┬──────────┘ └──────────┬──────────┘
          │                        │                       │
          │ API Calls              │ Content/Assets        │
          │ (S2S Auth)             │ (Public Read)         │
          ▼                        ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Railway Backend (eventops)                       │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Next.js    │  │  PostgreSQL │  │   Redis     │  │   BullMQ    │ │
│  │  API Routes │  │  (Prisma)   │  │   (Queues)  │  │   Workers   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Inventory Summary

| Category                 | Count   | Status             |
| ------------------------ | ------- | ------------------ |
| Total API Routes         | 150     | Audited            |
| Routes with Session Auth | 45      | ✅ Secure          |
| Routes with CRON_SECRET  | 5       | ✅ Secure          |
| Routes WITHOUT Auth      | 100     | ⚠️ Review needed   |
| Security Issues          | 5       | 🚨 Fix immediately |
| Hardcoded URLs           | 7 files | ❌ Extract to env  |

---

## Sprint R0: Security Hardening (CRITICAL)

**Goal**: Close security vulnerabilities before enabling cross-origin access.

**Demo**: All security endpoints return 401/403 without proper auth.

### Task R0.1: Remove Debug Env Endpoint

- **File**: `src/app/api/debug/env/route.ts`
- **Action**: Delete file or add admin-only auth
- **Risk**: Exposes all environment variables publicly
- **Test**: `curl /api/debug/env` → 401 or 404
- **Time**: 15 min

### Task R0.2: Protect Dossier Endpoint

- **File**: `src/app/api/ai/dossier/route.ts`
- **Action**: Add session auth check
- **Risk**: Leaks company research data
- **Test**: `curl /api/ai/dossier?company=test` without auth → 401
- **Time**: 15 min

### Task R0.3: Protect Analytics Endpoints

- **Files**: `src/app/api/analytics/cohort|funnel|predictions/route.ts`
- **Action**: Add session auth to each
- **Test**: Unauthenticated requests → 401
- **Time**: 30 min (3 files)

### Task R0.4: Protect Locks Endpoint

- **File**: `src/app/api/locks/route.ts`
- **Action**: Add CRON_SECRET or session auth
- **Test**: `curl /api/locks` without auth → 401
- **Time**: 15 min

### Task R0.5: Add SendGrid Webhook Verification

- **File**: `src/app/api/webhooks/sendgrid/route.ts`
- **Action**: Verify `X-Twilio-Email-Event-Webhook-Signature`
- **Docs**: https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
- **Test**: Fake signature → 403
- **Time**: 30 min

**Sprint R0 Validation Script**:

```bash
# All should return 401/403/404
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/debug/env | jq .
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/ai/dossier | jq .
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/analytics/cohort | jq .
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/locks | jq .
```

---

## Sprint R1: Service-to-Service Auth Infrastructure

**Goal**: Create reusable auth helper for Vercel→Railway calls.

**Demo**: GTM frontend can call Railway APIs with service key.

### Task R1.1: Create Auth Service Helper

- **File**: `src/lib/auth-service.ts` (NEW)
- **Content**:

```typescript
import { auth } from "@/auth";

export type AuthResult = {
  type: "session" | "service";
  userId: string;
  email?: string;
} | null;

/**
 * Authenticate request via session OR service-to-service key
 * Use for routes that GTM frontend calls
 */
export async function authServiceOrSession(
  request: Request,
): Promise<AuthResult> {
  // 1. Check service-to-service header
  const serviceKey = request.headers.get("x-service-key");
  if (serviceKey && serviceKey === process.env.SERVICE_TO_SERVICE_SECRET) {
    const userId = request.headers.get("x-user-id") || "service:gtm-frontend";
    const email = request.headers.get("x-user-email") || undefined;
    return { type: "service", userId, email };
  }

  // 2. Fall back to CRON_SECRET (for backward compat)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === process.env.CRON_SECRET) {
      return { type: "service", userId: "service:cron" };
    }
  }

  // 3. Fall back to NextAuth session
  const session = await auth();
  if (session?.user?.id) {
    return {
      type: "session",
      userId: session.user.id,
      email: session.user.email || undefined,
    };
  }

  return null;
}

/**
 * Require auth - returns error response if not authenticated
 */
export async function requireAuth(request: Request) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return {
      error: true,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { error: false, auth: authResult };
}
```

- **Test**: Unit test with mock headers
- **Time**: 30 min

### Task R1.2: Add Environment Variable

- **Platform**: Railway dashboard
- **Variable**: `SERVICE_TO_SERVICE_SECRET`
- **Value**: Generate with `openssl rand -base64 32`
- **Also add to**: GTM Vercel project env vars
- **Test**: `railway variables | grep SERVICE`
- **Time**: 10 min

### Task R1.3: Update ab-test Route (Reference Implementation)

- **File**: `src/app/api/ab-test/route.ts`
- **Action**: Refactor to use `authServiceOrSession()`
- **Before**: Manual CRON_SECRET check
- **After**: Clean helper function
- **Test**: Both session and service-key auth work
- **Time**: 20 min

### Task R1.4: Create Test Script for S2S Auth

- **File**: `scripts/test-s2s-auth.ts`
- **Content**:

```typescript
const BASE_URL = process.env.RAILWAY_URL || "http://localhost:3000";
const SERVICE_KEY = process.env.SERVICE_TO_SERVICE_SECRET;

async function testS2SAuth() {
  // Test without auth
  const noAuth = await fetch(`${BASE_URL}/api/ab-test`, { method: "GET" });
  console.log("No auth:", noAuth.status); // Should be 401

  // Test with service key
  const withKey = await fetch(`${BASE_URL}/api/ab-test`, {
    method: "GET",
    headers: {
      "x-service-key": SERVICE_KEY!,
      "x-user-id": "test-user-123",
    },
  });
  console.log("With service key:", withKey.status); // Should be 200
}

testS2SAuth();
```

- **Time**: 20 min

**Sprint R1 Validation**:

```bash
# From GTM server or local test
curl -H "x-service-key: $SERVICE_SECRET" \
     -H "x-user-id: casey@freightroll.com" \
     https://yardflow-hitlist-production-2f41.up.railway.app/api/ab-test
# → Should return 200
```

---

## Sprint R2: CORS Configuration

**Goal**: Enable GTM frontend to make browser-based API calls.

**Demo**: Browser fetch from gtm-yard-flow.vercel.app succeeds.

### Task R2.1: Add CORS Headers to next.config.mjs

- **File**: `next.config.mjs`
- **Action**: Add headers() configuration
- **Content**:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async headers() {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .filter(Boolean);

    // Default origins if not set
    const origins =
      allowedOrigins.length > 0
        ? allowedOrigins
        : [
            "https://gtm-yard-flow.vercel.app",
            "https://flow-state-klbt.vercel.app",
          ];

    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            // Note: Can't use multiple origins in header, use middleware for that
            value: origins[0],
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, x-service-key, x-user-id, x-user-email",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- **Test**: `curl -I -X OPTIONS /api/accounts` shows CORS headers
- **Time**: 30 min

### Task R2.2: Add ALLOWED_ORIGINS Env Var

- **Platform**: Railway dashboard
- **Variable**: `ALLOWED_ORIGINS`
- **Value**: `https://gtm-yard-flow.vercel.app,https://flow-state-klbt.vercel.app`
- **Time**: 5 min

### Task R2.3: Handle OPTIONS Preflight in Middleware

- **File**: `src/middleware.ts`
- **Action**: Add OPTIONS handler for CORS preflight
- **Content**:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./auth";

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || "https://gtm-yard-flow.vercel.app"
).split(",");

function corsHeaders(origin: string | null) {
  const headers = new Headers();

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-service-key, x-user-id, x-user-email",
    );
    headers.set("Access-Control-Max-Age", "86400");
  }

  return headers;
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders(origin),
    });
  }

  // Run NextAuth for dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    return (auth as any)(request);
  }

  // Add CORS headers to API responses
  if (request.nextUrl.pathname.startsWith("/api")) {
    const response = NextResponse.next();
    const cors = corsHeaders(origin);
    cors.forEach((value, key) => response.headers.set(key, value));
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
  runtime: "nodejs",
};
```

- **Test**: Browser console fetch from different origin works
- **Time**: 30 min

### Task R2.4: Create CORS Test Script

- **File**: `scripts/test-cors.ts`
- **Action**: Verify CORS from simulated browser
- **Time**: 20 min

**Sprint R2 Validation**:

```bash
# Test CORS headers
curl -i -X OPTIONS \
  -H "Origin: https://gtm-yard-flow.vercel.app" \
  https://yardflow-hitlist-production-2f41.up.railway.app/api/accounts

# Should show:
# Access-Control-Allow-Origin: https://gtm-yard-flow.vercel.app
# Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

---

## Sprint R3: Core Route Migration

**Goal**: Update high-priority routes to support S2S auth.

**Demo**: GTM frontend can fetch accounts, contacts, campaigns.

### Task R3.1: Update /api/accounts Routes

- **Files**: `src/app/api/accounts/route.ts`, `src/app/api/accounts/[id]/route.ts`
- **Action**: Replace session-only auth with `authServiceOrSession()`
- **Pattern**:

```typescript
import { authServiceOrSession } from "@/lib/auth-service";

export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of handler using authResult.userId
}
```

- **Test**: Both session and S2S auth work
- **Time**: 30 min

### Task R3.2: Update /api/people Routes

- **Files**: `src/app/api/people/route.ts`, `src/app/api/people/[id]/route.ts`
- **Action**: Same pattern as R3.1
- **Time**: 30 min

### Task R3.3: Update /api/campaigns Routes

- **Files**: `src/app/api/campaigns/route.ts`, `src/app/api/campaigns/[id]/route.ts`
- **Action**: Same pattern
- **Time**: 30 min

### Task R3.4: Update /api/events Routes

- **Files**: `src/app/api/events/route.ts`, `src/app/api/events/[id]/route.ts`
- **Action**: Same pattern
- **Time**: 30 min

### Task R3.5: Update /api/sequences Routes

- **Files**: `src/app/api/sequences/route.ts`, `src/app/api/sequences/[id]/route.ts`
- **Action**: Same pattern
- **Time**: 30 min

### Task R3.6: Update /api/templates Routes

- **Files**: `src/app/api/templates/route.ts`
- **Action**: Same pattern
- **Time**: 20 min

### Task R3.7: Update /api/dashboard/stats Route

- **File**: `src/app/api/dashboard/stats/route.ts`
- **Action**: Same pattern - critical for GTM dashboard
- **Time**: 20 min

**Sprint R3 Validation Script**:

```typescript
// scripts/test-core-routes.ts
const routes = [
  "/api/accounts",
  "/api/people",
  "/api/campaigns",
  "/api/events",
  "/api/sequences",
  "/api/templates",
  "/api/dashboard/stats",
];

for (const route of routes) {
  const res = await fetch(`${BASE_URL}${route}`, {
    headers: { "x-service-key": SERVICE_KEY, "x-user-id": "test" },
  });
  console.log(`${route}: ${res.status}`);
}
```

---

## Sprint R4: Content Hub Integration

**Goal**: Centralize Content Hub URLs and make configurable.

**Demo**: All Content Hub references use env var, fallback gracefully.

### Task R4.1: Create Centralized Content Hub Client

- **File**: `src/lib/content-hub.ts` (NEW)
- **Content**:

```typescript
const CONTENT_HUB_URL =
  process.env.YARDFLOW_CONTENT_HUB_URL || "https://flow-state-klbt.vercel.app";
const CONTENT_HUB_API_KEY = process.env.YARDFLOW_CONTENT_HUB_API_KEY;

export const contentHub = {
  baseUrl: CONTENT_HUB_URL,

  async fetchAsset(path: string): Promise<string> {
    return `${CONTENT_HUB_URL}/api/assets/${path}`;
  },

  async fetchContract(type: string): Promise<string> {
    return `${CONTENT_HUB_URL}/api/contracts/${type}`;
  },

  async fetchMessaging(persona: string): Promise<any> {
    const res = await fetch(`${CONTENT_HUB_URL}/api/messaging/${persona}`, {
      headers: CONTENT_HUB_API_KEY ? { "x-api-key": CONTENT_HUB_API_KEY } : {},
    });
    if (!res.ok) return null;
    return res.json();
  },

  async fetchCaseStudy(id: string): Promise<any> {
    const res = await fetch(`${CONTENT_HUB_URL}/api/case-studies/${id}`);
    if (!res.ok) return null;
    return res.json();
  },
};
```

- **Test**: Import and call in test script
- **Time**: 30 min

### Task R4.2: Update content-purposing-agent.ts

- **File**: `src/lib/agents/content-purposing-agent.ts`
- **Action**: Replace hardcoded URL with `contentHub.baseUrl`
- **Before**: `const CONTENT_HUB_BASE = 'https://flow-state-klbt.vercel.app/api';`
- **After**: `import { contentHub } from '@/lib/content-hub';`
- **Time**: 20 min

### Task R4.3: Update graphics-agent.ts

- **File**: `src/lib/agents/graphics-agent.ts`
- **Action**: Use `contentHub.fetchAsset()` for placeholder
- **Time**: 15 min

### Task R4.4: Update contracting-agent.ts

- **File**: `src/lib/agents/contracting-agent.ts`
- **Action**: Use `contentHub.fetchContract()` for placeholder
- **Time**: 15 min

### Task R4.5: Update README with Content Hub Config

- **File**: `src/lib/agents/README.md`
- **Action**: Update URLs to reference env var
- **Time**: 10 min

**Sprint R4 Validation**:

```bash
# Verify content hub connectivity
curl https://flow-state-klbt.vercel.app/api/health
# Should return 200
```

---

## Sprint R5: Analytics & Research Routes

**Goal**: Secure and enable S2S auth for analytics/research endpoints.

**Demo**: GTM can fetch analytics, dossiers work with auth.

### Task R5.1: Protect /api/analytics/cohort

- **File**: `src/app/api/analytics/cohort/route.ts`
- **Action**: Add `authServiceOrSession()` check
- **Time**: 15 min

### Task R5.2: Protect /api/analytics/funnel

- **File**: `src/app/api/analytics/funnel/route.ts`
- **Action**: Add auth check
- **Time**: 15 min

### Task R5.3: Protect /api/analytics/predictions

- **File**: `src/app/api/analytics/predictions/route.ts`
- **Action**: Add auth check
- **Time**: 15 min

### Task R5.4: Update /api/ai/dossier with S2S

- **File**: `src/app/api/ai/dossier/route.ts`
- **Action**: Add `authServiceOrSession()` (was unprotected)
- **Time**: 20 min

### Task R5.5: Update /api/research/\* Routes

- **Files**: All routes in `src/app/api/research/`
- **Action**: Verify auth and add S2S support
- **Time**: 30 min

### Task R5.6: Update /api/enrich/\* Routes

- **Files**: All routes in `src/app/api/enrich/`
- **Action**: Add S2S auth support
- **Time**: 20 min

**Sprint R5 Validation**:

```bash
# Test analytics with S2S
curl -H "x-service-key: $SECRET" \
     https://yardflow-hitlist-production-2f41.up.railway.app/api/analytics/cohort
# → Should return 200 with data
```

---

## Sprint R6: Agent & Automation Routes

**Goal**: Enable GTM to trigger agents and view status.

**Demo**: GTM can trigger research agent and poll status.

### Task R6.1: Update /api/agents/trigger

- **File**: `src/app/api/agents/trigger/route.ts`
- **Action**: Add S2S auth support
- **Time**: 20 min

### Task R6.2: Update /api/agents/status

- **File**: `src/app/api/agents/status/route.ts`
- **Action**: Add S2S auth support
- **Time**: 20 min

### Task R6.3: Update /api/agents/monitor

- **File**: `src/app/api/agents/monitor/route.ts`
- **Action**: Add S2S auth support
- **Time**: 20 min

### Task R6.4: Update /api/queues/status

- **File**: `src/app/api/queues/status/route.ts`
- **Action**: Verify CRON_SECRET works, add S2S as alternative
- **Time**: 15 min

### Task R6.5: Create Agent Integration Test

- **File**: `scripts/test-agent-integration.ts`
- **Action**: Test trigger → poll status flow
- **Time**: 30 min

---

## Sprint R7: GTM Frontend Integration

**Goal**: Update GTM Vercel project to call Railway APIs.

**Demo**: GTM dashboard loads data from Railway backend.

### Task R7.1: Create API Client in GTM

- **Repo**: gtm-yard-flow (Vercel)
- **File**: `lib/railway-client.ts`
- **Content**: Fetch wrapper with service key headers
- **Time**: 30 min

### Task R7.2: Configure GTM Environment

- **Platform**: Vercel dashboard
- **Variables**:
  - `RAILWAY_API_URL=https://yardflow-hitlist-production-2f41.up.railway.app`
  - `SERVICE_TO_SERVICE_SECRET=<same as Railway>`
- **Time**: 10 min

### Task R7.3: Update GTM Dashboard to Use Railway

- **Repo**: gtm-yard-flow
- **Action**: Replace any direct DB calls with Railway API calls
- **Time**: 2-4 hours (depends on GTM codebase)

### Task R7.4: Test GTM→Railway Flow End-to-End

- **Action**: Login to GTM, verify dashboard shows Railway data
- **Time**: 30 min

### Task R7.5: Set Up Shared Session (Optional)

- **Action**: Configure NextAuth to share sessions across domains
- **Note**: May require JWT tokens instead of database sessions
- **Time**: 2 hours (if needed)

---

## Sprint R8: Cleanup & Documentation

**Goal**: Archive old docs, update README, document architecture.

**Demo**: Single source of truth for platform architecture.

### Task R8.1: Archive Outdated Docs

- **Action**: Move to `docs/archive/` folder:
  - RESCUE_PLAN_MASTER.md (if resolved)
  - REVISED_ROADMAP.md (superseded)
  - Duplicate sprint plans
- **Time**: 15 min

### Task R8.2: Update Main README

- **File**: `eventops/README.md`
- **Action**:
  - Remove Vercel deployment references
  - Add Railway deployment section
  - Document S2S auth pattern
- **Time**: 30 min

### Task R8.3: Create Architecture Doc

- **File**: `docs/current/ARCHITECTURE.md`
- **Content**: Diagram + component descriptions
- **Time**: 30 min

### Task R8.4: Document Environment Variables

- **File**: `docs/current/ENV_VARS.md`
- **Content**: All required env vars with descriptions
- **Time**: 20 min

### Task R8.5: Create Runbook

- **File**: `docs/current/RUNBOOK.md`
- **Content**: Common operations, troubleshooting
- **Time**: 30 min

---

## Environment Variables Summary

### Railway (Backend)

```bash
# Existing
DATABASE_URL=
REDIS_URL=
AUTH_SECRET=
NEXTAUTH_URL=https://yardflow-hitlist-production-2f41.up.railway.app
CRON_SECRET=
GEMINI_API_KEY=
OPENAI_API_KEY=
SENDGRID_API_KEY=
HUBSPOT_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# NEW - Reunification
SERVICE_TO_SERVICE_SECRET=<generate with openssl rand -base64 32>
ALLOWED_ORIGINS=https://gtm-yard-flow.vercel.app,https://flow-state-klbt.vercel.app
YARDFLOW_CONTENT_HUB_URL=https://flow-state-klbt.vercel.app
```

### Vercel GTM (Frontend)

```bash
RAILWAY_API_URL=https://yardflow-hitlist-production-2f41.up.railway.app
SERVICE_TO_SERVICE_SECRET=<same as Railway>
```

---

## Sprint Execution Order

| Sprint | Theme                    | Blocks     | Est. Hours |
| ------ | ------------------------ | ---------- | ---------- |
| R0     | Security Hardening       | None       | 2h         |
| R1     | S2S Auth Infrastructure  | R0         | 1.5h       |
| R2     | CORS Configuration       | R1         | 1.5h       |
| R3     | Core Route Migration     | R1, R2     | 3h         |
| R4     | Content Hub Integration  | None       | 1.5h       |
| R5     | Analytics & Research     | R1         | 2h         |
| R6     | Agent Routes             | R1         | 2h         |
| R7     | GTM Frontend Integration | R3, R5, R6 | 4h         |
| R8     | Cleanup & Docs           | All        | 2h         |

**Total**: ~19.5 hours

---

## Success Criteria

1. ✅ All security vulnerabilities patched
2. ✅ GTM frontend can call Railway APIs with S2S auth
3. ✅ CORS properly configured for cross-origin requests
4. ✅ Content Hub URLs are configurable
5. ✅ Single source of truth documentation
6. ✅ End-to-end test passing: GTM login → Dashboard → Data from Railway

---

_Document Version: 1.0_
_Created: 2026-01-30_
