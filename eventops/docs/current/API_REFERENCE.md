# API Reference — FreightRoll Platform

> For GTM-YardFlow (Vercel frontend) integration.
> All endpoints require authentication via `Authorization: Bearer <RAILWAY_API_SECRET>` (S2S) or NextAuth session.
> Base URL: `https://yardflow-hitlist-production-2f41.up.railway.app`

## Authentication

All requests must include one of:
- **S2S**: `Authorization: Bearer <CRON_SECRET>` header + optional `x-user-id` header
- **Session**: NextAuth session cookie (browser-based requests)

S2S calls go through `authServiceOrSession()` which validates the Bearer token.

---

## Core Entities

### Accounts

#### `GET /api/accounts`

List target accounts for the active event.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cursor` | string | — | Pagination cursor (account ID) |
| `limit` | number | 50 | Max 100 |
| `search` | string | — | Search by name |
| `tier` | string | — | Filter by tier |
| `industry` | string | — | Filter by industry |
| `minScore` | number | — | Minimum ICP score |

**Response** (`200`): `AccountsResponse`
```json
{
  "data": [{ "id": "...", "name": "...", "icpScore": 85, "_count": { "people": 12 } }],
  "hasMore": true,
  "nextCursor": "acc_xyz",
  "total": 142
}
```

#### `POST /api/accounts`
Create a new target account. Body: `{ name, website?, industry?, eventId }`

#### `GET /api/accounts/[id]`
Get single account with people count.

#### `PATCH /api/accounts/[id]`
Update account fields. Body: partial account object.

#### `DELETE /api/accounts/[id]`
Delete account.

---

### People (Prospects)

#### `GET /api/people`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 100 | Max 500 |
| `skip` | number | 0 | Offset |
| `search` | string | — | Search name/email |
| `accountId` | string | — | Filter by account |

**Response** (`200`): `PeopleResponse`
```json
{
  "people": [{ "id": "...", "name": "...", "email": "...", "title": "..." }],
  "pagination": { "limit": 100, "skip": 0, "total": 450, "hasMore": true }
}
```

#### `PUT /api/prospects/[id]`
Update a prospect. Body validated by `UpdateProspectSchema` (Zod). Email must be valid format.

#### `POST /api/prospects/batch`
Bulk create/upsert. Body validated by `BatchRequestSchema`: `{ prospects: [...], mode: 'create' | 'upsert' }`. Max 1000 per batch.

---

### Campaigns

#### `GET /api/campaigns`
List campaigns for active event.

**Response** (`200`): `CampaignsResponse`
```json
{
  "campaigns": [{ "id": "...", "name": "...", "status": "ACTIVE", "_count": { "outreach": 45, "sequences": 2 } }]
}
```

#### `POST /api/campaigns`
Create campaign. Body validated by `CreateCampaignSchema`:
```json
{ "name": "Manifest Outreach", "description": "...", "startDate": "2026-02-10T00:00:00Z" }
```

#### `GET /api/campaigns/[id]`
Get campaign with outreach metrics.

#### `PATCH /api/campaigns/[id]`
Update campaign. Body validated by `UpdateCampaignSchema`. Status enum: `DRAFT | ACTIVE | PAUSED | COMPLETED`.

#### `DELETE /api/campaigns/[id]`
Delete campaign.

---

### Sequences

#### `GET /api/sequences`

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status |

**Response** (`200`): `SequencesResponse`
```json
{
  "sequences": [{ "id": "...", "name": "...", "status": "active", "steps": [...], "totalEnrolled": 12 }]
}
```

#### `POST /api/sequences`
Create sequence. Body validated by `CreateSequenceSchema`:
```json
{
  "name": "Welcome Drip",
  "steps": [
    { "subject": "Intro", "emailBody": "Hello...", "delayHours": 0 },
    { "subject": "Follow Up", "emailBody": "Checking in...", "delayHours": 48 }
  ]
}
```
Steps are also checked for CAN-SPAM compliance (post-Zod validation).

#### `PUT /api/sequences/[id]`
Update sequence. Body validated by `UpdateSequenceSchema`. All fields optional.

#### `DELETE /api/sequences/[id]`
Delete sequence. Fails if active enrollments exist (400).

---

### Enrollments

#### `GET /api/enrollments`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `prospectId` | string | — | Filter by prospect |
| `sequenceId` | string | — | Filter by sequence |
| `status` | string | — | Filter by status |
| `cursor` | string | — | Pagination cursor |
| `limit` | number | 25 | Max 100 |

**Response** (`200`): `EnrollmentsResponse`
```json
{
  "data": [{ "id": "...", "prospectId": "...", "status": "active", "metrics": { "emailsSent": 3 } }],
  "pagination": { "hasMore": false, "nextCursor": null }
}
```

#### `POST /api/enrollments`
Enroll a prospect in a sequence. Body validated by `CreateEnrollmentSchema`:
```json
{ "prospectId": "p-123", "flowId": "seq-456" }
```
Returns `409` if already enrolled.

#### `POST /api/enrollments/[id]/pause`
Pause an enrollment.

#### `POST /api/enrollments/[id]/resume`
Resume a paused enrollment.

---

### Outreach

#### `GET /api/outreach`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 50 | Max 200 |
| `skip` | number | 0 | Offset |
| `status` | string | — | Filter by status |
| `channel` | string | — | EMAIL, LINKEDIN, PHONE |

**Response** (`200`): `OutreachResponse`
```json
{
  "data": [{ "id": "...", "subject": "...", "status": "SENT", "people": { "name": "..." } }],
  "pagination": { "limit": 50, "skip": 0, "total": 230, "hasMore": true }
}
```

#### `POST /api/outreach/send-email`
Send an email via SendGrid.

#### `POST /api/outreach/generate`
Generate outreach content with AI.

---

## AI Endpoints (Brain)

All AI endpoints use S2S auth. All AI keys live on Railway — **never on Vercel**.

### `POST /api/ai/chat`
Brain assistant chat with context awareness.

**Request**: `{ message: string, conversationId?: string, context?: object }`

**Response** (`200`): `BrainChatResponse`
```json
{
  "response": "I found 3 accounts matching...",
  "action": { "type": "filter", "tier": "Tier 1" },
  "suggestions": ["Show me their contacts", "Generate outreach"],
  "conversationId": "conv_abc"
}
```

### `GET /api/ai/chat`
Get Brain capabilities.

### `POST /api/ai/content/generate`
Generate email content with FreightRoll brand voice.

**Rate Limit**: 30 requests/minute per service key (Redis-backed).

### `POST /api/ai/dossier/generate`
Generate company research dossier.

### `POST /api/ai/score-icp`
Score a company against ICP criteria.

### `POST /api/ai/sentiment`
Analyze email sentiment.

---

## Dashboards

### `GET /api/dashboards/stats`
Platform-wide dashboard statistics.

**Response** (`200`): `DashboardStatsResponse` (accounts, people, campaigns, meetings counts + recent activity)

### `GET /api/dashboards/email`

| Param | Type | Default |
|-------|------|---------|
| `days` | number | 7 |

**Response** (`200`): `EmailDashboardResponse` (send/open/response rates, daily breakdown, top accounts)

---

## System

### `GET /api/health`
Health check endpoint. No auth required.

### `GET /api/email/stats`
Email system pulse.

---

## Error Format

All error responses follow:
```json
{
  "error": "Human-readable error message",
  "details": [{ "path": "name", "message": "Name is required" }]
}
```

Status codes:
| Code | Meaning |
|------|---------|
| 400 | Validation error / Bad request |
| 401 | Unauthorized (missing/invalid auth) |
| 403 | Forbidden (e.g., seed in production) |
| 404 | Not found |
| 409 | Conflict (e.g., duplicate enrollment) |
| 429 | Rate limited (AI endpoints) |
| 500 | Internal server error |
| 501 | Not implemented (stub routes) |

---

## Type Definitions

All response types are defined in [`src/types/api-contracts.ts`](../../eventops/src/types/api-contracts.ts).

Import and use:
```typescript
import type { AccountsResponse, BrainChatResponse } from '@/types/api-contracts';
```
