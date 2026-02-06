# Query Performance Audit — Sprint 53

**Date**: January 2026
**Scope**: Top query patterns used in production routes + Manifest 2026 event load

## Index Audit Results

### Added Indexes (Sprint 53)

| Model | Index | Query Pattern | Frequency |
|---|---|---|---|
| `outreach` | `@@index([sentAt])` | Email stats, Gmail worker, health check | High — every minute |
| `outreach` | `@@index([status, sentAt])` | `status='SENT' AND sentAt >= X` | High — 3 production paths |
| `outreach` | `@@index([updatedAt])` | List `orderBy: { updatedAt: 'desc' }`, health check | High |
| `outreach` | `@@index([createdAt])` | Dashboard list, cohort analysis `orderBy` | Medium |
| `outreach` | `@@index([channel])` | LinkedIn stats, outreach list filter | Medium |
| `outreach` | `@@index([sequenceId])` | FK without index; bulk ops | Low |
| `outreach` | `@@index([openedAt])` | AI next-actions follow-up detection | Low |
| `people` | `@@index([email])` | Webhook lookups: inbound, Calendly | Critical — real-time webhook |
| `target_accounts` | `@@index([icpScore])` | Dashboard filter/sort by ICP score | High — main accounts page |

### Pre-Existing Indexes (No Changes Needed)

| Model | Index | Notes |
|---|---|---|
| `outreach` | `@@index([personId])` | Already existed — person detail views |
| `outreach` | `@@index([campaignId])` | Already existed — campaign drill-down |
| `outreach` | `@@index([status])` | Already existed — status filtering |
| `outreach` | `@@index([status, lastChecked])` | Already existed — Gmail sync |
| `people` | `@@index([accountId])` | Already existed — account detail views |
| `target_accounts` | `@@index([eventId])` | Already existed — event scoping |
| `activities` | `@@index([entityType, entityId])` | Covers `accountId` pattern via `entityType='account'` |
| `sequence_steps` | `@@index([enrollment_id])` | Already existed |
| `SequenceEnrollment` | `@@index([sequenceId])` | Already existed |

### Roadmap Items Not Applicable

| Roadmap Item | Reason |
|---|---|
| `emailTracking.outreachId` | Model does not exist. `email_engagement` and `EmailActivity` both already indexed. |
| `activities.accountId` | No `accountId` field. Composite `@@index([entityType, entityId])` covers the pattern. |
| `sequenceSteps.sequenceId` | No such field. `sequence_steps.enrollment_id` already indexed. |

## Top 5 Query Patterns (for EXPLAIN ANALYZE)

These are the most common query patterns in production. Run `EXPLAIN ANALYZE` on a production read-replica when data volume exceeds 1000 rows.

### 1. Account List with Pagination

```sql
-- Route: GET /api/accounts
SELECT * FROM target_accounts
WHERE "eventId" = $1
ORDER BY "updatedAt" DESC
LIMIT 30 OFFSET 0;
-- Covered by: @@index([eventId])
-- Consider: composite @@index([eventId, updatedAt]) if EXPLAIN shows sort
```

### 2. People List by Account

```sql
-- Route: GET /api/people?accountId=X
SELECT * FROM people
WHERE "accountId" = $1
ORDER BY "createdAt" DESC;
-- Covered by: @@index([accountId])
```

### 3. Outreach List with Status Filter

```sql
-- Route: GET /api/outreach?status=SENT
SELECT * FROM outreach
WHERE "status" = $1
ORDER BY "updatedAt" DESC
LIMIT 50;
-- Covered by: @@index([status]) + new @@index([updatedAt])
-- Consider: composite @@index([status, updatedAt]) if used heavily
```

### 4. Email Stats Aggregation

```sql
-- Route: GET /api/email/stats
SELECT COUNT(*) FROM outreach
WHERE "status" = 'SENT' AND "sentAt" >= $1;
-- Covered by: new @@index([status, sentAt]) — composite index
```

### 5. Dashboard Stats (Counts Across Tables)

```sql
-- Route: GET /api/health checkEmailService()
-- Runs every healthcheck (every minute in Railway)
SELECT COUNT(*) FROM outreach WHERE "status" = 'BOUNCED' AND "updatedAt" >= $1;
SELECT COUNT(*) FROM outreach WHERE "status" = 'SENT' AND "sentAt" >= $1;
-- Covered by: @@index([status, sentAt]) and @@index([status]) + @@index([updatedAt])
```

## Connection Pool Configuration

| Setting | Value | Rationale |
|---|---|---|
| `max` | 15 | Railway shared PostgreSQL allows ~20 total. Web=15, Worker=5 headroom. |
| `idleTimeoutMillis` | 30000 | 30s — free idle connections quickly under burst load. |
| `connectionTimeoutMillis` | 5000 | 5s — fail fast if DB is unreachable. |

Pool metrics are now exposed in the `/api/health` response under `checks.database.pool`:
```json
{
  "checks": {
    "database": {
      "status": "ok",
      "latencyMs": 12,
      "pool": {
        "totalCount": 3,
        "idleCount": 2,
        "waitingCount": 0,
        "maxConnections": 15
      }
    }
  }
}
```

## Recommendations for Event Day

1. **Monitor pool utilization**: If `waitingCount > 0` persists, increase `max` to 20.
2. **EXPLAIN ANALYZE**: Run on production read-replica once data exceeds 1000 rows per table.
3. **Add composite index** `@@index([eventId, updatedAt])` on `target_accounts` if account list pagination shows sequential scan.
4. **Consider partial indexes** on `outreach` for `status = 'SENT'` if the table grows beyond 10k rows.
