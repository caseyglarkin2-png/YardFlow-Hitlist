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
| `GEMINI_API_KEY`               | Primary AI provider (Gemini 2.0)    | Yes      | -                                    |
| `OPENAI_API_KEY`               | Fallback AI provider (GPT-4o-mini)  | Yes      | -                                    |
| `SENDGRID_API_KEY`             | SendGrid API key for email          | Yes      | -                                    |
| `CALENDLY_LINK`                | Calendly booking link for CTAs      | Yes      | -                                    |
| `CRON_SECRET`                  | Legacy secret for cron jobs         | No       | -                                    |
| `NEXTAUTH_SECRET`              | For session encryption              | Yes      | -                                    |
| `NEXTAUTH_URL`                 | Canonical URL of the service        | Yes      | -                                    |

## Vercel Frontend (GTM)

| Variable                    | Description            | Required |
| --------------------------- | ---------------------- | -------- |
| `RAILWAY_API_URL`           | URL to Railway Backend | Yes      |
| `SERVICE_TO_SERVICE_SECRET` | Must match Backend     | Yes      |

---

## SendGrid Configuration

### Required Verified Senders

Before sending email, these sender addresses must be verified in SendGrid:

| Email                 | Purpose            | Status    |
| --------------------- | ------------------ | --------- |
| jake@freightroll.com  | Primary sales      | ⚠️ Verify |
| casey@freightroll.com | Account management | ⚠️ Verify |
| team@freightroll.com  | General outreach   | ⚠️ Verify |

### Verification Steps

1. Log into [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to **Settings → Sender Authentication**
3. Click **Verify a Single Sender**
4. Enter each email address above
5. Check inbox and click verification link
6. Update status in this document

### Testing Email

```bash
# Test email delivery after verification
curl -X POST $RAILWAY_URL/api/email/test \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test from FreightRoll"}'
```
