# Sprint 30: Brain Activation & AI Integration

**Date**: February 4, 2026  
**Status**: 🚀 IN PROGRESS  
**Goal**: Enable AI-powered Brain, Research, and Bulk Email functionality from Vercel frontend

---

## Executive Summary

| Component | Status | Action Required |
|-----------|--------|-----------------|
| **Railway Backend** | ✅ Healthy | AI endpoints updated with S2S auth |
| **S2S Auth** | ✅ Working | CRON_SECRET synced to Vercel |
| **AI Endpoints** | ✅ Ready | 5 endpoints updated for frontend access |
| **Frontend Brain** | ⚠️ Needs Config | Remove AI keys from Vercel, use Railway proxy |
| **Bulk Email** | ✅ Ready | `/api/outreach/send-email` accepts S2S |

---

## Architecture Clarification

### What's Where

| System | Role | AI Keys? |
|--------|------|----------|
| **Railway (this repo)** | API Backend, AI Processing, Email | ✅ GEMINI_API_KEY, OPENAI_API_KEY |
| **Vercel (GTM-YardFlow)** | UI Frontend, Proxies to Railway | ❌ NO AI KEYS - uses Railway proxy |

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

| Endpoint | Before | After |
|----------|--------|-------|
| `/api/ai/dossier/generate` | Session only | ✅ authServiceOrSession |
| `/api/ai/score-icp` | Session only | ✅ authServiceOrSession |
| `/api/ai/next-actions` | Session only | ✅ authServiceOrSession |
| `/api/ai/sentiment` | Session only | ✅ authServiceOrSession |
| `/api/accounts/[id]/research` | Session only | ✅ authServiceOrSession |
| `/api/ai/content/generate` | Already S2S | ✅ No change needed |

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
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId }),
    }).then(r => r.json());
  },

  async researchAccount(accountId: string) {
    return fetch(`${BASE_URL}/api/accounts/${accountId}/research`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_SECRET}`,
        'Content-Type': 'application/json',
      },
    }).then(r => r.json());
  },

  async scoreICP(accountId: string) {
    return fetch(`${BASE_URL}/api/ai/score-icp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId }),
    }).then(r => r.json());
  },

  async getNextActions() {
    return fetch(`${BASE_URL}/api/ai/next-actions`, {
      headers: {
        'Authorization': `Bearer ${API_SECRET}`,
      },
    }).then(r => r.json());
  },

  async generateContent(type: 'email', tone: string, context: object) {
    return fetch(`${BASE_URL}/api/ai/content/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, tone, context }),
    }).then(r => r.json());
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
**File**: `src/app/api/ai/chat/route.ts`  
**Effort**: 1 hr

For the "Brain" feature to work as a general assistant:

```typescript
// POST /api/ai/chat
// Body: { message: string, context?: { accountId?, personId?, pageContext? } }
// Returns: { response: string, suggestions?: string[] }
```

---

## 📋 What to Tell GTM-YardFlow Repo

Copy this to the GTM-YardFlow agent:

```markdown
## Railway Integration Update (February 4, 2026)

### S2S Auth is Working
- Railway accepts `Authorization: Bearer ${RAILWAY_API_SECRET}`
- All AI endpoints now support S2S auth

### Available AI Endpoints (via Railway proxy)

| Purpose | Endpoint | Method |
|---------|----------|--------|
| Company Dossier | `/api/accounts/{id}/research` | POST |
| AI Dossier Gen | `/api/ai/dossier/generate` | POST |
| ICP Scoring | `/api/ai/score-icp` | POST |
| Next Actions | `/api/ai/next-actions` | GET |
| Content Gen | `/api/ai/content/generate` | POST |
| Sentiment | `/api/ai/sentiment` | POST |
| Send Email | `/api/outreach/send-email` | POST |
| Bulk Update | `/api/outreach/bulk` | PATCH |

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

| Task | Est. Time | Priority |
|------|-----------|----------|
| T30A.1-3: Vercel config | 15 min | P0 |
| T30B.1: Railway AI client | 30 min | P0 |
| T30B.2: Wire AI Research button | 20 min | P0 |
| T30C.1: Verify bulk email | 30 min | P0 |
| T30D.1: AI chat endpoint | 1 hr | P1 |
| T30B.3: Brain chat interface | 1 hr | P1 |
| T30C.2: Bulk progress UI | 45 min | P2 |

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
