# Environment Variables

## Railway Backend

| Variable                       | Description                         | Required | Default                              |
| ------------------------------ | ----------------------------------- | -------- | ------------------------------------ |
| `DATABASE_URL`                 | PostgreSQL connection string        | Yes      | -                                    |
| `REDIS_URL`                    | Redis connection string             | Yes      | -                                    |
| `SERVICE_TO_SERVICE_SECRET`    | Secret key for S2S auth from Vercel | Yes      | -                                    |
| `ALLOWED_ORIGINS`              | CORS origins (comma separated)      | Yes      | -                                    |
| `YARDFLOW_CONTENT_HUB_URL`     | URL to Content Hub                  | No       | `https://flow-state-klbt.vercel.app` |
| `YARDFLOW_CONTENT_HUB_API_KEY` | Optional key for Hub API            | No       | -                                    |
| `OPENAI_API_KEY`               | For AI agents                       | Yes      | -                                    |
| `CRON_SECRET`                  | Legacy secret for cron jobs         | No       | -                                    |
| `NEXTAUTH_SECRET`              | For session encryption              | Yes      | -                                    |
| `NEXTAUTH_URL`                 | Canonical URL of the service        | Yes      | -                                    |

## Vercel Frontend (GTM)

| Variable                    | Description            | Required |
| --------------------------- | ---------------------- | -------- |
| `RAILWAY_API_URL`           | URL to Railway Backend | Yes      |
| `SERVICE_TO_SERVICE_SECRET` | Must match Backend     | Yes      |
