# HubSpot CRM Integration - Sprint 23

Production-ready HubSpot integration for YardFlow EventOps.

## 🎯 Overview

Complete HubSpot CRM integration that syncs contacts from HubSpot to your local Prisma database with:
- ✅ Rate limiting (100 req/10s)
- ✅ Retry logic with exponential backoff
- ✅ Pagination handling
- ✅ Upsert logic (create/update)
- ✅ Full TypeScript types
- ✅ Production error handling
- ✅ Comprehensive logging

## 📁 Files Created

```
eventops/src/lib/hubspot/
├── client.ts              # HubSpot client initialization
├── rate-limiter.ts        # Production rate limiter
└── sync-contacts.ts       # Contact sync logic

eventops/src/app/api/hubspot/sync/contacts/
└── route.ts               # API endpoint

eventops/scripts/
└── test-hubspot.ts        # Integration test script
```

## 🔧 Setup

### 1. Environment Variable

Already added to `.env.local`:
```bash
HUBSPOT_API_KEY=ffe089b9-5787-4a13-857b-f2e071851b8e
```

### 2. Dependencies

Already installed:
```bash
npm install @hubspot/api-client
```

## 🧪 Testing

### Quick Test (5 contacts)
```bash
cd eventops
npx tsx scripts/test-hubspot.ts
```

### Full Sync via API
```bash
# Start dev server
npm run dev

# In another terminal, test the endpoint:
curl -X POST http://localhost:3000/api/hubspot/sync/contacts \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

## 📡 API Endpoint

### POST `/api/hubspot/sync/contacts`

**Authentication:** Required (NextAuth v5 session)

**Request Body** (optional):
```json
{
  "limit": 100,           // Max contacts to sync (optional)
  "accountId": "acc-123"  // Default account ID (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "updated": 12,
    "total": 57,
    "errors": 0
  },
  "message": "Successfully synced 57 contacts (45 new, 12 updated)"
}
```

### GET `/api/hubspot/sync/contacts`

**Response:**
```json
{
  "success": true,
  "data": {
    "hubspotConfigured": true,
    "endpoint": "/api/hubspot/sync/contacts",
    "methods": ["GET", "POST"],
    "description": "HubSpot contact sync endpoint"
  }
}
```

## 🔄 Contact Mapping

HubSpot → Prisma `people` table:

| HubSpot Property | Prisma Field | Notes |
|-----------------|--------------|-------|
| `firstname` + `lastname` | `name` | Combined |
| `email` | `email` | Used for deduplication |
| `phone` | `phone` | |
| `jobtitle` | `title` | |
| `linkedin` | `linkedin` | |
| `company` | `accountId` | Generated from company name |
| `id` | `notes` | Stored as `hubspot_id:xxx` |

## 🎛️ Rate Limiting

**HubSpot Limits:**
- 100 requests per 10 seconds
- 429 errors when exceeded

**Our Implementation:**
- Queue-based rate limiter
- Automatic retry on 429 errors
- Exponential backoff (1s, 2s, 4s)
- Max 3 retries per request

**Status Monitoring:**
```typescript
import { hubspotRateLimiter } from '@/lib/hubspot/rate-limiter';

const status = hubspotRateLimiter.getStatus();
console.log(status);
// {
//   queueLength: 5,
//   requestsInWindow: 87,
//   maxRequests: 100,
//   processing: true
// }
```

## 📊 Sync Logic

### Deduplication Strategy

1. **By Email:** First tries to find existing person by email
2. **By HubSpot ID:** Checks notes field for `hubspot_id:xxx`
3. **Create or Update:** Upserts accordingly

### Account Creation

If contact's company doesn't exist as a `target_accounts` record:
- Creates account with company name
- Links to default event
- Sets ICP score to 0

### Notes Field

Stores HubSpot metadata:
```
hubspot_id:12345|synced:2026-01-23T10:30:00.000Z
```

## 🏗️ Architecture

### Client (`client.ts`)
- Initializes HubSpot SDK client
- Exports typed interfaces
- Connection testing utility

### Rate Limiter (`rate-limiter.ts`)
- Class-based implementation
- Singleton instance exported
- Thread-safe queue management
- Exponential backoff retry

### Sync (`sync-contacts.ts`)
- Pagination loop
- Contact processing
- Database upserts
- Error aggregation

### API Route (`route.ts`)
- NextAuth v5 authentication
- Request validation
- Response formatting
- Comprehensive logging

## 🔍 Logging

All operations are logged using Winston logger:

```typescript
logger.info('HubSpot contact sync completed', {
  imported: 45,
  updated: 12,
  errors: 0
});
```

**Log Levels:**
- `info`: Major operations (sync start/complete)
- `debug`: Individual contacts, pagination
- `warn`: Rate limits, retries
- `error`: Failures, exceptions

## 🛡️ Error Handling

### API Errors
- 401: Unauthorized (no session)
- 400: Invalid request (bad limit)
- 500: Sync failure, config issues

### Sync Errors
- Non-fatal errors are collected in `result.errors[]`
- Fatal errors throw and stop sync
- All errors logged with context

## 📈 Production Checklist

- [x] Rate limiting implemented
- [x] Retry logic with backoff
- [x] Pagination handling
- [x] Upsert logic
- [x] TypeScript types
- [x] Error handling
- [x] Logging
- [x] Authentication
- [x] API documentation
- [x] Test script

## 🚀 Usage Examples

### Programmatic Sync
```typescript
import { syncHubSpotContacts } from '@/lib/hubspot/sync-contacts';

// Sync all contacts
const result = await syncHubSpotContacts();

// Sync limited contacts to specific account
const result = await syncHubSpotContacts({
  limit: 50,
  accountId: 'account-acme-corp'
});

console.log(`Synced ${result.imported + result.updated} contacts`);
```

### Test Connection
```typescript
import { testHubSpotConnection } from '@/lib/hubspot/client';

const isConnected = await testHubSpotConnection();
if (!isConnected) {
  throw new Error('HubSpot connection failed');
}
```

### Custom Rate Limiter
```typescript
import { HubSpotRateLimiter } from '@/lib/hubspot/rate-limiter';

// Custom config for different API limits
const limiter = new HubSpotRateLimiter({
  maxRequests: 50,
  windowMs: 5000,
  maxRetries: 5,
  baseBackoffMs: 2000
});

await limiter.execute(async () => {
  // Your HubSpot API call
});
```

## 🔮 Next Steps (Sprint 24+)

- [ ] Push contacts to HubSpot (two-way sync)
- [ ] Update contact properties in HubSpot
- [ ] Company sync (accounts)
- [ ] Deal/opportunity sync
- [ ] Webhook listeners for real-time updates
- [ ] Conflict resolution UI
- [ ] Sync scheduling (cron jobs)
- [ ] Batch operations UI

## 📞 Support

For issues or questions:
1. Check logs: Winston logger outputs
2. Test connection: Run `scripts/test-hubspot.ts`
3. Verify API key: Check `.env.local`
4. Review errors: API returns detailed error info

## 🏆 Sprint 23 Complete!

All foundational tasks delivered:
- ✅ Task 1: HubSpot Client Setup
- ✅ Task 2: Rate Limiter
- ✅ Task 3: Contact Sync (Pull)
- ✅ Task 4: API Route

**Ready for production deployment!** 🚀
