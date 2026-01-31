# Runbook

## Deployment

### Backend (Railway)

Push to `main` branch on `caseyglarkin2-png/YardFlow-Hitlist`.
Railway automatically builds and deploys.

- **Check logs**: Railway Dashboard -> Service -> Deployments -> Logs.
- **Restart**: Railway Dashboard -> Service -> Restart.

### Frontend (Vercel)

Push to `main` branch on `gtm-yard-flow`.
Vercel automatically deploys.

## Common Issues

### 502 Bad Gateway (Railway)

Usually means the app crashed or port binding failed.

1. Check logs for crash.
2. Verify `start-production.sh` is used.
3. Check `DATABASE_URL` connectivity.

### S2S 401 Unauthorized

1. Check `SERVICE_TO_SERVICE_SECRET` matches on both Vercel and Railway.
2. Verify `x-service-key` header is being sent.

### Agent Stuck

1. Check Redis connection.
2. Restart Worker service in Railway.
3. Check `/api/queue/status` (Updated to support S2S auth).

## Database Management

All commands from `/eventops` directory:

```bash
# Migration
npx prisma migrate dev --name <name>

# Push (Schema only)
npx prisma db push

# Studio
npx prisma studio
```
