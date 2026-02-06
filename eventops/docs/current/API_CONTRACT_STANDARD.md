# API Contract Standard

**Created**: Sprint 58  
**Purpose**: Standardize all API response shapes to prevent frontend errors  
**Root Cause**: `L.data.map is not a function` - frontend expected `{ data: [...] }` but backend returned inconsistent shapes

---

## Standard Response Shapes

### List Endpoints (GET collection)

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true,
    "nextCursor": "cursor_string"
  }
}
```

**Rules**:
- ✅ Always wrap arrays in `{ data: [...] }`
- ✅ Never return bare arrays `[...]`
- ✅ Never use entity-specific keys like `{ templates: [...] }`, `{ campaigns: [...] }`
- ✅ Pagination is optional but recommended for large collections

### Single Resource (GET /api/resource/:id)

```json
{
  "id": "...",
  "name": "...",
  ...
}
```

**Rules**:
- ✅ Return the resource object directly (no wrapper)
- ✅ 404 if not found: `{ "error": "Not found" }`

### Create Resource (POST)

```json
{
  "id": "new-id",
  "name": "...",
  ...
}
```

**Rules**:
- ✅ Return the created resource object directly
- ✅ Status code 201

### Update Resource (PUT/PATCH)

```json
{
  "id": "...",
  "name": "updated",
  ...
}
```

**Rules**:
- ✅ Return the updated resource object directly

### Delete Resource (DELETE)

```json
{
  "success": true
}
```

Or status 204 with no body.

---

## Error Response Shape

All errors use the same shape:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

**Properties**:
- `error` (required): Human-readable message
- `code` (optional): Machine-readable error code
- `details` (optional): Validation errors, context

**HTTP Status Codes**:
| Code | Meaning |
|------|---------|
| 400 | Bad Request (validation error) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Migration Status

| Endpoint | Old Shape | New Shape | Status |
|----------|-----------|-----------|--------|
| `/api/templates` | `{ templates: [...] }` | `{ data: [...] }` | ✅ Fixed |
| `/api/sequences` | `{ sequences: [...] }` | `{ data: [...] }` | ✅ Fixed |
| `/api/campaigns` | `{ campaigns: [...] }` | `{ data: [...] }` | ✅ Fixed |
| `/api/accounts` | `{ data: [...] }` | `{ data: [...] }` | ✅ Already correct |
| `/api/enrollments` | `{ data: [...] }` | `{ data: [...] }` | ✅ Already correct |
| `/api/prospects` | `{ data: [...] }` | `{ data: [...] }` | ✅ Already correct |
| `/api/outreach` | `{ data: [...] }` | `{ data: [...] }` | ✅ Already correct |
| `/api/events` | `[...]` | `{ data: [...] }` | ⏳ Sprint 58B |
| `/api/meetings` | `[...]` | `{ data: [...] }` | ⏳ Sprint 58B |
| `/api/people` | `{ people: [...] }` | `{ data: [...] }` | ⏳ Sprint 58B |
| `/api/team` | `[...]` | `{ data: [...] }` | ⏳ Sprint 58B |
| `/api/workflows` | `{ workflows: [...] }` | `{ data: [...] }` | ⏳ Sprint 58B |
| `/api/notifications` | `{ notifications: [...] }` | `{ data: [...] }` | ⏳ Sprint 58B |
| `/api/searches` | `[...]` | `{ data: [...] }` | ⏳ Sprint 58B |
| `/api/ab-tests` | `{ tests: [...] }` | `{ data: [...] }` | ⏳ Sprint 58B |

---

## Helper Usage

Use `buildPaginatedResponse()` from `@/lib/pagination.ts` for consistent paginated responses:

```typescript
import { buildPaginatedResponse } from '@/lib/pagination';

export async function GET(req: NextRequest) {
  const items = await prisma.items.findMany({ ... });
  const total = await prisma.items.count({ where });
  
  return buildPaginatedResponse(items, {
    total,
    limit: 50,
    offset: 0,
  });
}
```

---

## Testing

All list endpoints have contract tests in `tests/api/api-contract-consistency.test.ts`:

```bash
npm test -- tests/api/api-contract-consistency.test.ts
```

Tests verify:
1. List endpoints return `{ data: [...] }` not bare arrays or entity keys
2. Error responses always have `{ error: string }` property
3. Pagination object present when expected
