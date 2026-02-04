# Sprint 30: Brain Activation & AI Integration

**Date**: February 4, 2026  
**Status**: ✅ RAILWAY BACKEND COMPLETE  
**Goal**: Enable AI-powered Brain, Research, and Bulk Email functionality from Vercel frontend

---

## Executive Summary

| Component           | Status          | Action Required                                 |
| ------------------- | --------------- | ----------------------------------------------- |
| **Railway Backend** | ✅ COMPLETE     | All AI endpoints updated, chat endpoint created |
| **S2S Auth**        | ✅ Working      | CRON_SECRET synced to Vercel                    |
| **AI Endpoints**    | ✅ All Tested   | 9 endpoints tested and passing                  |
| **AI Chat (Brain)** | ✅ NEW          | `/api/ai/chat` endpoint created                 |
| **Frontend Brain**  | ⚠️ Needs Config | Remove AI keys from Vercel, use Railway proxy   |
| **Bulk Email**      | ✅ Ready        | `/api/outreach/send-email` accepts S2S          |

---

## 🧪 Endpoint Test Results (All Passing)

| Endpoint                      | Method | Test Result | Notes                                   |
| ----------------------------- | ------ | ----------- | --------------------------------------- |
| `/api/health`                 | GET    | ✅ Pass     | Health check working                    |
| `/api/ai/dossier/generate`    | POST   | ✅ Pass     | Returns "Company not found" (expected)  |
| `/api/ai/score-icp`           | POST   | ✅ Pass     | Returns "Account not found" (expected)  |
| `/api/ai/next-actions`        | GET    | ✅ Pass     | Returns "No active event" (expected)    |
| `/api/ai/sentiment`           | POST   | ✅ Pass     | Returns sentiment analysis              |
| `/api/accounts/[id]/research` | POST   | ✅ Pass     | Returns "Account not found" (expected)  |
| `/api/ai/content/generate`    | POST   | ✅ Pass     | Returns AI-generated content (OpenAI)   |
| `/api/outreach/bulk`          | PATCH  | ✅ Pass     | Returns `{"updated": 0}`                |
| `/api/outreach/send-email`    | POST   | ✅ Pass     | Returns "Outreach not found" (expected) |
| `/api/ai/chat` (GET)          | GET    | ✅ Pass     | Returns capabilities list               |
| `/api/ai/chat` (POST)         | POST   | ✅ Pass     | Returns AI response with suggestions    |

**Test Command Used**:

```bash
curl -X POST https://yardflow-hitlist-production-2f41.up.railway.app/api/ai/chat \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is YardFlow?", "context": {"pageContext": "dashboard"}}'
```

---

## Architecture Clarification

### What's Where

| System                    | Role                              | AI Keys?                           |
| ------------------------- | --------------------------------- | ---------------------------------- |
| **Railway (this repo)**   | API Backend, AI Processing, Email | ✅ GEMINI_API_KEY, OPENAI_API_KEY  |
| **Vercel (GTM-YardFlow)** | UI Frontend, Proxies to Railway   | ❌ NO AI KEYS - uses Railway proxy |

### AI Request Flow

```
[Vercel Frontend]
    → POST /api/railway/accounts/{id}/research
    → [Vercel Proxy adds Auth header]
    → [Railway] /api/accounts/{id}/research
    → [Railway uses Gemini/OpenAI with fallback]
    → [Response returned to frontend]
```

---

## ✅ Completed Work (This Session)

### 1. S2S Auth Added to AI Endpoints

| Endpoint                      | Before       | After                   |
| ----------------------------- | ------------ | ----------------------- |
| `/api/ai/dossier/generate`    | Session only | ✅ authServiceOrSession |
| `/api/ai/score-icp`           | Session only | ✅ authServiceOrSession |
| `/api/ai/next-actions`        | Session only | ✅ authServiceOrSession |
| `/api/ai/sentiment`           | Session only | ✅ authServiceOrSession |
| `/api/accounts/[id]/research` | Session only | ✅ authServiceOrSession |
| `/api/ai/content/generate`    | Already S2S  | ✅ No change needed     |

### 2. Bulk Outreach S2S Auth

- `/api/outreach/bulk` - ✅ Updated with authServiceOrSession
- `/api/outreach/send-email` - ✅ Already had S2S auth

---

## 🎯 Sprint Tasks

### Sprint 30A: Vercel Configuration (IMMEDIATE)

#### T30A.1: Remove AI Keys from Vercel

**Status**: ⏳ WAITING ON USER  
**Effort**: 5 min  
**Owner**: Casey

**Action**:

1. Go to Vercel Dashboard → Settings → Environment Variables
2. **DELETE** `GEMINI_API_KEY` (if present)
3. **DELETE** `OPENAI_API_KEY` (if present)
4. These should ONLY exist in Railway

**Why**: AI calls should go through Railway for unified rate limiting, fallback, and cost tracking.

#### T30A.2: Verify RAILWAY_API_SECRET Matches

**Status**: ✅ DONE (fixed space issue)  
**Effort**: 5 min

Railway `CRON_SECRET` = Vercel `RAILWAY_API_SECRET` ✓

#### T30A.3: Redeploy Vercel

**Status**: ⏳ WAITING ON USER  
**Effort**: 2 min

After T30A.1, redeploy Vercel to pick up env var changes.

---

### Sprint 30B: Frontend Brain Integration (GTM-YardFlow Repo)

These tasks are for the **GTM-YardFlow** repo (Vercel frontend):

#### T30B.1: Create Railway AI Client

**Effort**: 30 min

Create `lib/railway-ai.ts` in GTM-YardFlow:

```typescript
// lib/railway-ai.ts
const BASE_URL = process.env.RAILWAY_API_URL;
const API_SECRET = process.env.RAILWAY_API_SECRET;

export const railwayAI = {
  async generateDossier(accountId: string) {
    return fetch(`${BASE_URL}/api/ai/dossier/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accountId }),
    }).then((r) => r.json());
  },

  async researchAccount(accountId: string) {
    return fetch(`${BASE_URL}/api/accounts/${accountId}/research`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_SECRET}`,
        "Content-Type": "application/json",
      },
    }).then((r) => r.json());
  },

  async scoreICP(accountId: string) {
    return fetch(`${BASE_URL}/api/ai/score-icp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accountId }),
    }).then((r) => r.json());
  },

  async getNextActions() {
    return fetch(`${BASE_URL}/api/ai/next-actions`, {
      headers: {
        Authorization: `Bearer ${API_SECRET}`,
      },
    }).then((r) => r.json());
  },

  async generateContent(type: "email", tone: string, context: object) {
    return fetch(`${BASE_URL}/api/ai/content/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, tone, context }),
    }).then((r) => r.json());
  },
};
```

#### T30B.2: Wire AI Research Button

**Effort**: 20 min

In GTM-YardFlow, find the "AI Research" button component and connect to `railwayAI.researchAccount()`.

#### T30B.3: Wire Brain Chat Interface

**Effort**: 1 hr

The Brain chat needs to call Railway AI endpoints. This may need a new Railway endpoint for general chat.

---

### Sprint 30C: Bulk Email Flow (GTM-YardFlow Repo)

#### T30C.1: Verify Bulk Email UI Flow

**Effort**: 30 min

1. Select multiple prospects in list
2. Click "Send Email"
3. Compose/preview email
4. Submit → calls Railway `/api/outreach/send-email`

#### T30C.2: Add Progress Indicator for Bulk Send

**Effort**: 45 min

Show X/Y progress when sending bulk emails.

---

### Sprint 30D: Backend AI Chat Endpoint (THIS REPO)

#### T30D.1: Create General AI Chat Endpoint

**Status**: ✅ COMPLETE  
**File**: `src/app/api/ai/chat/route.ts`  
**Effort**: 1 hr

The Brain feature now has a dedicated chat endpoint:

**GET /api/ai/chat** - Returns capabilities and status:

```json
{
  "status": "ready",
  "capabilities": ["account-research", "contact-insights", "email-generation", ...],
  "maxMessageLength": 2000,
  "maxHistoryMessages": 6,
  "providers": ["gemini", "openai"]
}
```

**POST /api/ai/chat** - AI chat with context:

```json
// Request
{
  "message": "How should I approach this account?",
  "context": {
    "accountId": "abc123",     // optional - enriches with account data
    "personId": "xyz789",      // optional - enriches with contact data
    "pageContext": "dashboard", // optional - tailors response
    "conversationHistory": []   // optional - maintains context (max 6)
  }
}

// Response
{
  "response": "Based on the account data...",
  "suggestions": ["Send intro email", "Research on LinkedIn"],
  "provider": "openai",
  "fallbackUsed": true
}
```

**Features**:

- Uses unified AI provider (Gemini → OpenAI fallback)
- Context-aware responses based on account/person data
- Conversation history support (last 6 messages)
- Extracts actionable suggestions from AI response
- Page-context hints for tailored responses

---

## 📋 What to Tell GTM-YardFlow Repo

Copy this to the GTM-YardFlow agent:

```markdown
## Railway Integration Update (February 4, 2026)

### S2S Auth is Working

- Railway accepts `Authorization: Bearer ${RAILWAY_API_SECRET}`
- All AI endpoints now support S2S auth

### Available AI Endpoints (via Railway proxy)

| Purpose         | Endpoint                      | Method   |
| --------------- | ----------------------------- | -------- |
| **Brain Chat**  | `/api/ai/chat`                | GET/POST |
| Company Dossier | `/api/accounts/{id}/research` | POST     |
| AI Dossier Gen  | `/api/ai/dossier/generate`    | POST     |
| ICP Scoring     | `/api/ai/score-icp`           | POST     |
| Next Actions    | `/api/ai/next-actions`        | GET      |
| Content Gen     | `/api/ai/content/generate`    | POST     |
| Sentiment       | `/api/ai/sentiment`           | POST     |
| Send Email      | `/api/outreach/send-email`    | POST     |
| Bulk Update     | `/api/outreach/bulk`          | PATCH    |

### CRITICAL: Remove AI Keys from Vercel

- DO NOT add GEMINI_API_KEY or OPENAI_API_KEY to Vercel
- All AI calls route through Railway proxy
- Railway handles Gemini→OpenAI fallback

### Auth Headers Required

All calls to Railway must include:
```

Authorization: Bearer ${RAILWAY_API_SECRET}

```

Optional context headers:
```

x-user-id: <firebase_user_id>
x-user-email: <user_email>

```

```

---

## Bulk Email Location

**Found at**:

- Single send: `POST /api/outreach/send-email` with `{ outreachId }`
- Bulk status update: `PATCH /api/outreach/bulk` with `{ ids, status }`

The flow is:

1. Create outreach records in database
2. Call `/api/outreach/send-email` for each (or queue via BullMQ)
3. Status updates go to `/api/outreach/bulk`

---

## Verification Commands

```bash
# Test AI dossier endpoint with S2S auth
curl -s -X POST https://yardflow-hitlist-production-2f41.up.railway.app/api/ai/dossier/generate \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"accountId": "test"}' | jq .

# Test research endpoint
curl -s -X POST https://yardflow-hitlist-production-2f41.up.railway.app/api/accounts/ACCOUNT_ID/research \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" | jq .

# Health check with AI status
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq '.checks.ai'
```

---

## Timeline

| Task                            | Est. Time | Priority |
| ------------------------------- | --------- | -------- |
| T30A.1-3: Vercel config         | 15 min    | P0       |
| T30B.1: Railway AI client       | 30 min    | P0       |
| T30B.2: Wire AI Research button | 20 min    | P0       |
| T30C.1: Verify bulk email       | 30 min    | P0       |
| T30D.1: AI chat endpoint        | 1 hr      | P1       |
| T30B.3: Brain chat interface    | 1 hr      | P1       |
| T30C.2: Bulk progress UI        | 45 min    | P2       |

**Total**: ~4-5 hours for full Brain activation

---

## Session Notes

- Railway is API-only, no UI
- Vercel (GTM-YardFlow) is the UI frontend
- AI keys should ONLY be in Railway
- S2S auth uses CRON_SECRET (Railway) = RAILWAY_API_SECRET (Vercel)
- Fixed extra space in Vercel env var
- Updated 5 AI endpoints to support S2S auth
- Pushed changes - Railway auto-deploying
