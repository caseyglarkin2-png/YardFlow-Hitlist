# Job Queue Setup Guide
**Sprint 24 Complete** - Redis + BullMQ Infrastructure

## Overview
Production-ready job queue system for YardFlow background processing.

## Architecture
- **Redis**: Message broker (Railway provisioned)
- **BullMQ**: Queue management with retry logic
- **4 Queues**: enrichment, outreach, emails, sequences
- **Workers**: Concurrent job processing with rate limiting

## Quick Start

### 1. Install Dependencies
```bash
npm install redis@^4.6.13 bullmq@^5.1.9 ioredis@^5.3.2
```

### 2. Environment Variables
```bash
# Railway auto-generates REDIS_URL
REDIS_URL=redis://default:password@host:port

# Or use individual variables
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

### 3. Local Redis (Docker)
```bash
docker run -d --name yardflow-redis -p 6379:6379 redis:7-alpine
```

### 4. Start Worker
```bash
# Add to package.json scripts:
"worker": "tsx src/lib/queue/workers.ts"

# Run worker (separate terminal):
npm run worker
```

### 5. Test API
```bash
# Enqueue email pattern detection
curl -X POST http://localhost:3000/api/queue/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "email-pattern",
    "accountId": "account_xyz"
  }'

# Check queue stats
curl http://localhost:3000/api/queue/stats
```

## API Endpoints

### POST /api/queue/enrich
Enqueue enrichment jobs.

**Request**:
```json
{
  "jobType": "email-pattern" | "linkedin-enrichment" | "generate-emails",
  "accountId": "string",
  "limit": 50,  // optional, for linkedin-enrichment
  "force": false  // optional, for generate-emails
}
```

**Response**:
```json
{
  "success": true,
  "jobId": "job_id",
  "jobType": "email-pattern",
  "accountId": "account_xyz",
  "queuedAt": "2026-01-23T14:30:00.000Z"
}
```

### GET /api/queue/status/[jobId]
Get job status and result.

**Response**:
```json
{
  "jobId": "job_id",
  "name": "email-pattern",
  "queue": "enrichment",
  "state": "completed",
  "progress": 100,
  "data": { "accountId": "xyz" },
  "result": {
    "success": true,
    "domain": "company.com",
    "patternsDetected": 3
  }
}
```

### GET /api/queue/stats
Monitor all queues.

**Response**:
```json
{
  "timestamp": "2026-01-23T14:30:00.000Z",
  "queues": {
    "enrichment": {
      "active": 2,
      "waiting": 5,
      "completed": 150,
      "failed": 3,
      "recentFailures": []
    }
  },
  "totals": {
    "active": 10,
    "waiting": 15,
    "completed": 500,
    "failed": 8
  }
}
```

## Job Types

### email-pattern
Detect email patterns for a company.
- **Duration**: 30-60 seconds
- **Rate Limit**: 10/second
- **Retries**: 3 with exponential backoff

### linkedin-enrichment
Discover LinkedIn profiles for people.
- **Duration**: 1-5 minutes (50 people)
- **Rate Limit**: 1 request/second (external API)
- **Retries**: 3

### generate-emails
Generate emails using detected patterns.
- **Duration**: 30-90 seconds
- **Retries**: 3
- **Options**: `force` (skip dry run), `minConfidence` (70%)

### sequence-step
Execute outreach sequence step (Sprint 29).
- **Duration**: 5-15 seconds per email
- **Retries**: 3
- **Delays**: Configurable per step

## Production Deployment

### Railway Setup
1. Add Redis database:
   ```bash
   railway add redis
   ```

2. Configure worker service:
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm run worker",
       "healthcheckPath": "/",
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```

3. Environment variables (auto-generated):
   - `REDIS_URL` - Railway provides this

### Monitoring
```bash
# Check queue stats
curl https://your-domain.com/api/queue/stats

# Check specific job
curl https://your-domain.com/api/queue/status/job_id

# View worker logs
railway logs -s worker
```

## Troubleshooting

### Redis Connection Issues
```typescript
// Check Redis connection
import { redisConnection } from '@/lib/queue/client';
console.log(redisConnection.status); // Should be 'ready'
```

### Jobs Stuck in Waiting
- Ensure worker is running: `npm run worker`
- Check worker logs for errors
- Verify Redis connection

### High Failure Rate
- Check job processor logic
- Review retry settings
- Verify external API limits (LinkedIn, etc.)

## Next Steps
- ✅ Queue infrastructure complete
- 🔄 Sprint 29: Sequences integration
- 📊 BullBoard UI for queue monitoring
- 🔔 Slack notifications for job failures

**Status**: Production Ready ✅
**Created**: January 23, 2026
