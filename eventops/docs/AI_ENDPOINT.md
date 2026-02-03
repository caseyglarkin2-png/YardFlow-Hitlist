# AI Content Generation Endpoint

## Endpoint

`POST /api/ai/content/generate`

## Auth

Service-to-service only. Send header:

- `x-service-key: <SERVICE_TO_SERVICE_SECRET>`

Missing or invalid key returns:

```json
{ "error": "unauthorized" }
```

## Request

```json
{
  "type": "email",
  "context": {
    "prospectName": "Casey Larkin",
    "companyName": "FreightRoll",
    "title": "VP Operations",
    "tone": "luis",
    "goal": "Schedule meeting to discuss yard visibility"
  }
}
```

## Response

```json
{
  "content": "...",
  "subject": "..."
}
```

## Tones

- `luis`
- `professional`
- `challenger`

## Luis Constraints

Server enforces:

- Content length \(max 250 chars\)
- Includes Calendly link
- Includes at least one metric token (e.g. `$1M`, `4%`, `25 facilities`)
- Exactly one question mark

## Env Vars

- `SERVICE_TO_SERVICE_SECRET`
- `CALENDLY_LINK` (or `CALENDLY_URL`)
- `GEMINI_API_KEY`

## Observability

Logs include:

- requestId
- tone
- promptVersion
- latency
- validation errors
