# Sprint 31: Brain Enhancements - Execution Plan

**Date**: February 4, 2026  
**Status**: 🟢 READY TO EXECUTE  
**Estimated Time**: 10-12 hours  
**Goal**: Railway AI endpoints that power smarter Brain features in GTM-YardFlow  
**Review Grade**: B+ → A (after incorporating review feedback)

---

## ⚠️ Critical Patterns (ALL new files MUST follow)

Every new API route file **MUST** include:

```typescript
// 1. Force dynamic export
export const dynamic = 'force-dynamic';

// 2. Lazy Redis access (never top-level instantiation)
const redis = getRedisConnection(); // ✅ INSIDE function, not at module scope

// 3. Proper error handling (NO `any` types)
catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error('Operation failed', { error: message });
}

// 4. Auth check
const authResult = await authServiceOrSession(request);
if (!authResult) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// 5. Zod validation for body
const validationResult = RequestSchema.safeParse(body);
if (!validationResult.success) {
  return NextResponse.json({ error: 'Invalid request', details: validationResult.error.errors }, { status: 400 });
}

// 6. Structured logging
import { logger } from '@/lib/logger';
logger.info('Operation started', { userId: authResult.userId, ... });
```

---

## Current State Audit

### ✅ What's Already Built (Sprint 30)

| File                                       | Status     | Capability                     |
| ------------------------------------------ | ---------- | ------------------------------ |
| `src/app/api/ai/chat/route.ts`             | ✅ Working | Chat with context, suggestions |
| `src/app/api/ai/dossier/generate/route.ts` | ✅ Working | Company dossier generation     |
| `src/app/api/ai/content/generate/route.ts` | ✅ Working | Email/content generation       |
| `src/app/api/ai/content/sequence/route.ts` | ✅ Working | Multi-step sequences           |
| `src/app/api/ai/score-icp/route.ts`        | ✅ Working | ICP scoring                    |
| `src/app/api/ai/sentiment/route.ts`        | ✅ Working | Sentiment analysis             |
| `src/lib/ai/provider.ts`                   | ✅ Working | Gemini → OpenAI fallback       |
| `src/lib/ai/dossier-generator.ts`          | ✅ Working | Basic dossier generation       |
| `src/lib/queue/client.ts`                  | ✅ Working | Redis lazy initialization      |

### ❌ What's NOT Built Yet (From Sprint 31 Plan)

| Component                | Files Needed                              | Status            |
| ------------------------ | ----------------------------------------- | ----------------- |
| Brain Actions Types      | `src/types/brain-actions.ts`              | ❌ Does not exist |
| Action Parser            | `src/lib/ai/action-parser.ts`             | ❌ Does not exist |
| Conversation Store       | `src/lib/ai/conversation-store.ts`        | ❌ Does not exist |
| Enhanced Dossier Schema  | `prisma/schema.prisma` changes            | ❌ Missing fields |
| Dossier Refresh Endpoint | `src/app/api/ai/dossier/refresh/route.ts` | ❌ Does not exist |
| Batch Research Endpoint  | `src/app/api/ai/research/batch/route.ts`  | ❌ Does not exist |
| AI Status Endpoint       | `src/app/api/ai/status/route.ts`          | ❌ Does not exist |
| Conversation Endpoints   | `src/app/api/ai/conversations/route.ts`   | ❌ Does not exist |

---

## Sprint Architecture (Optimized Order)

The task order has been optimized to minimize merge conflicts and ensure dependencies are met:

```
Phase 1: Foundation (3 hours)
├─ T31A.1: Define action types
├─ T31A.2: Create action parser
├─ T31A.3: Parser unit tests
├─ T31C.1: Create conversation store (parallel with 31A)
└─ T31C.2: Conversation store tests

Phase 2: Chat Integration (1.5 hours)
├─ T31A.4: Wire actions to chat endpoint
├─ T31A.5: Add confidence scoring
├─ T31C.3: Wire conversation to chat (same file, do together)
└─ T31C.4: Conversation CRUD endpoints

Phase 3: Enhanced Dossiers (2.5 hours)
├─ T31B.0: Prisma schema migration (CRITICAL)
├─ T31B.1: Extend dossier interface
├─ T31B.2: Update dossier prompt
├─ T31B.3: Enrich from contacts
├─ T31B.4: Create refresh endpoint
└─ T31B.5: Add staleness check

Phase 4: Provider Monitoring (1 hour) - Track before Status
├─ T31E.2: Track provider usage (MUST come first)
├─ T31E.1: Create AI status endpoint
└─ T31E.3: Add to health endpoint

Phase 5: Batch Research (1.5 hours) - Independent
├─ T31D.1: Create batch endpoint
├─ T31D.2: Add rate limiting (atomic Redis)
└─ T31D.3: Batch endpoint tests

Phase 6: Integration Tests (1 hour) - NEW
└─ T31F.1: Full flow integration tests
```

---

## Sprint 31A: Brain Actions

**Goal**: Brain returns structured actions the frontend can execute  
**Demo**: `POST /api/ai/chat` → response includes `action: { type: 'filter', tier: 'Tier 1' }`

### T31A.1: Define Action Types

**File**: `eventops/src/types/brain-actions.ts` (NEW FILE)  
**Effort**: 20 minutes  
**Dependencies**: None  
**Validation**: `npm run lint` passes, types export correctly

```typescript
// Types to create:
// - BrainActionType (union of action strings)
// - NavigateAction, FilterAction, SearchAction, ResearchAction, EmailAction, ExplainAction
// - BrainAction (union of all action interfaces)
// - BrainResponse (message + optional action)
```

**Acceptance Criteria**:

- [ ] File exists at `src/types/brain-actions.ts`
- [ ] All action types compile without errors
- [ ] Types can be imported: `import { BrainAction } from '@/types/brain-actions'`

**Commit**: `feat(ai): add brain action type definitions`

---

### T31A.2: Create Action Parser

**File**: `eventops/src/lib/ai/action-parser.ts` (NEW FILE)  
**Effort**: 30 minutes  
**Dependencies**: T31A.1  
**Validation**: Unit tests pass

```typescript
// Functions to create:
// - parseActionFromResponse(response: string): BrainAction | undefined
// - normalizeDestination(dest: string): NavigateAction['destination']
// - parseFilterAction(text: string): FilterAction

// Regex patterns for:
// - Navigation: "go to|show me|open|navigate to" + destination
// - Filter: "filter|show|find" + tier/email criteria
// - Search: "search|find|look for" + query
// - Research: "research|analyze" + company name
// - Email: "send|write|compose" + email
```

**Acceptance Criteria**:

- [ ] File exists at `src/lib/ai/action-parser.ts`
- [ ] Exports `parseActionFromResponse` function
- [ ] Parses navigation commands correctly
- [ ] Parses filter commands with tier and email criteria
- [ ] Returns `undefined` for non-actionable responses

**Commit**: `feat(ai): create action parser for brain responses`

---

### T31A.3: Action Parser Unit Tests

**File**: `eventops/tests/ai/action-parser.test.ts` (NEW FILE)  
**Effort**: 25 minutes  
**Dependencies**: T31A.2  
**Validation**: `npm test tests/ai/action-parser.test.ts` all pass

```typescript
// Test cases:
describe("parseActionFromResponse", () => {
  describe("navigation", () => {
    it('parses "go to prospects"');
    it('parses "show me the dashboard"');
    it('parses "navigate to accounts"');
  });

  describe("filtering", () => {
    it('parses "show tier 1 prospects"');
    it('parses "filter prospects with email"');
    it('parses "find tier 2 without email"');
  });

  describe("search", () => {
    it('parses "search for Acme Corp"');
    it("handles quoted search terms");
  });

  describe("research", () => {
    it('parses "research company XYZ Logistics"');
  });

  describe("no action", () => {
    it("returns undefined for explanatory text");
    it("returns undefined for questions");
  });
});
```

**Acceptance Criteria**:

- [ ] Test file exists at `tests/ai/action-parser.test.ts`
- [ ] All 10+ test cases pass
- [ ] Edge cases covered (quoted strings, mixed case)

**Commit**: `test(ai): add action parser unit tests`

---

### T31A.4: Wire Actions to Chat Endpoint

**File**: `eventops/src/app/api/ai/chat/route.ts` (MODIFY)  
**Effort**: 30 minutes  
**Dependencies**: T31A.2  
**Validation**: Curl returns `action` in response

**Changes**:

1. Import `parseActionFromResponse` from `@/lib/ai/action-parser`
2. Add action instruction to system prompt
3. Parse AI response for actions after generation
4. Include `action` field in JSON response

```typescript
// Add to response:
return NextResponse.json({
  response: result.content,
  action, // NEW: parsed action
  suggestions,
  provider: result.provider,
  fallbackUsed: result.fallbackUsed,
});
```

**Acceptance Criteria**:

- [ ] Chat endpoint imports action parser
- [ ] System prompt includes action phrasing hints
- [ ] Response includes `action` field (may be undefined)
- [ ] Curl test returns action for "show me tier 1 prospects"

**Validation Command**:

```bash
curl -X POST https://yardflow-hitlist-production-2f41.up.railway.app/api/ai/chat \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me Tier 1 prospects"}' | jq '.action'
```

**Commit**: `feat(ai): wire action parser to chat endpoint`

---

### T31A.5: Add Confidence Scoring

**File**: `eventops/src/lib/ai/action-parser.ts` (MODIFY)  
**Effort**: 15 minutes  
**Dependencies**: T31A.4  
**Validation**: Confidence returned with actions

**Changes**:

1. Add `ParseResult` interface with `action` and `confidence`
2. Create `parseActionWithConfidence` function
3. Calculate confidence based on explicit intent phrases

```typescript
export interface ParseResult {
  action?: BrainAction;
  confidence: number; // 0-1
}

// Confidence boosters:
// - "I'll" / "Let me" / "I will" → +0.3
// - Specific tier mentioned → +0.1
// - Navigation (unambiguous) → +0.1
```

**Acceptance Criteria**:

- [ ] `parseActionWithConfidence` exported
- [ ] Returns confidence between 0-1
- [ ] Higher confidence for explicit phrasing

**Commit**: `feat(ai): add confidence scoring to action parser`

---

## Sprint 31B: Enhanced Dossiers

**Goal**: Richer company research with actionable intelligence  
**Demo**: Dossier includes talking points, competitors, outreach angles

### T31B.0: Prisma Schema Migration (CRITICAL)

**File**: `eventops/prisma/schema.prisma` (MODIFY)  
**Effort**: 20 minutes  
**Dependencies**: None  
**Validation**: `npx prisma migrate dev --name enhance_dossiers` succeeds

**⚠️ REVIEW FIX**: Make `updatedAt` nullable initially to handle existing data.

**Current `company_dossiers` fields**:

```prisma
model company_dossiers {
  id               String  @id
  accountId        String  @unique
  companyOverview  String?
  recentNews       String?
  industryContext  String?
  keyPainPoints    String?
  techStack        String?
  companySize      String?
  socialPresence   String?
  rawData          String?
  researchedAt     DateTime @default(now())
  researchedBy     String?
  facilityCount    String?
  locations        String?
  operationalScale String?
}
```

**Fields to ADD**:

```prisma
  // New enhanced fields (all nullable for existing data)
  talkingPoints    String?  // JSON: {opener, painPoint, valueHook, nextStep}
  competitors      String?  // JSON: [{name, differentiator}]
  decisionMakers   String?  // JSON: [{title, likelyPriorities}]
  outreachAngles   String?  // JSON: [{angle, emailSubject, openingLine}]
  manifestContext  String?  // JSON: {likelyToAttend, boothConversationStarter, followUpTiming}
  updatedAt        DateTime? @updatedAt  // ⚠️ Nullable first, then backfill
```

**Rollback SQL** (if needed):

```sql
ALTER TABLE company_dossiers
  DROP COLUMN IF EXISTS talkingPoints,
  DROP COLUMN IF EXISTS competitors,
  DROP COLUMN IF EXISTS decisionMakers,
  DROP COLUMN IF EXISTS outreachAngles,
  DROP COLUMN IF EXISTS manifestContext,
  DROP COLUMN IF EXISTS "updatedAt";
```

**Acceptance Criteria**:

- [ ] Schema includes new fields
- [ ] Migration created and applied
- [ ] `npm run lint` passes
- [ ] `npx prisma generate` succeeds

**Commit**: `feat(db): add enhanced dossier fields to schema`

---

### T31B.1: Extend Dossier Interface

**File**: `eventops/src/lib/ai/dossier-generator.ts` (MODIFY)  
**Effort**: 15 minutes  
**Dependencies**: T31B.0  
**Validation**: TypeScript compiles

**Add interface**:

```typescript
export interface EnhancedDossier {
  // Existing
  companyOverview: string;
  industryContext: string;
  keyPainPoints: string[];
  techStack?: string[];
  companySize?: string;
  facilityIntelligence?: FacilityIntelligence;

  // NEW
  talkingPoints: {
    opener: string;
    painPoint: string;
    valueHook: string;
    nextStep: string;
  };

  competitors: Array<{
    name: string;
    differentiator: string;
  }>;

  decisionMakers: Array<{
    title: string;
    likelyPriorities: string[];
  }>;

  outreachAngles: Array<{
    angle: string;
    emailSubject: string;
    openingLine: string;
  }>;

  manifestContext: {
    likelyToAttend: boolean;
    boothConversationStarter: string;
    followUpTiming: string;
  };
}
```

**Acceptance Criteria**:

- [ ] `EnhancedDossier` interface defined
- [ ] Compiles without errors
- [ ] Matches Prisma schema JSON structure

**Commit**: `feat(ai): define enhanced dossier interface`

---

### T31B.2: Update Dossier Prompt

**File**: `eventops/src/lib/ai/dossier-generator.ts` (MODIFY)  
**Effort**: 30 minutes  
**Dependencies**: T31B.1  
**Validation**: Generated dossier includes new fields

**Changes**:

1. Update prompt to request all new fields
2. Parse new fields from AI response
3. Store as JSON strings in database

**Acceptance Criteria**:

- [ ] Prompt includes all new field requests
- [ ] AI returns `talkingPoints`, `competitors`, `outreachAngles`, `manifestContext`
- [ ] Fields saved to database correctly

**Validation Command**:

```bash
curl -X POST https://yardflow-hitlist-production-2f41.up.railway.app/api/ai/dossier/generate \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"accountId": "<valid-account-id>"}' | jq '.dossier | keys'
```

**Commit**: `feat(ai): update dossier prompt for enhanced fields`

---

### T31B.3: Enrich Dossier from Contacts

**File**: `eventops/src/lib/ai/dossier-generator.ts` (MODIFY)  
**Effort**: 25 minutes  
**Dependencies**: T31B.2  
**Validation**: Dossier context includes known contacts

**Add method**:

```typescript
private buildEnrichedContext(company: TargetAccountWithRelations): string {
  const parts: string[] = [];

  // Company basics
  parts.push(`Company: ${company.name}`);
  // ... existing fields

  // NEW: Include known contacts
  if (company.people?.length > 0) {
    parts.push('\nKnown Contacts:');
    for (const person of company.people.slice(0, 5)) {
      const roles = [];
      if (person.isExecOps) roles.push('ExecOps');
      if (person.isOps) roles.push('Ops');
      // ... etc
      parts.push(`- ${person.name}, ${person.title} [${roles.join(', ')}]`);
    }
  }

  return parts.join('\n');
}
```

**Acceptance Criteria**:

- [ ] Context includes contacts with titles and personas
- [ ] Limited to 5 contacts to avoid prompt bloat
- [ ] AI uses contact info in dossier generation

**Commit**: `feat(ai): enrich dossier context with known contacts`

---

### T31B.4: Create Dossier Refresh Endpoint

**File**: `eventops/src/app/api/ai/dossier/refresh/route.ts` (NEW FILE)  
**Effort**: 20 minutes  
**Dependencies**: T31B.2  
**Validation**: Curl returns `refreshed: true`

```typescript
// POST /api/ai/dossier/refresh
// Body: { accountId: string }
// Returns: { success, dossier, refreshed: true, timestamp }

// Logic:
// 1. Delete existing dossier for accountId
// 2. Generate fresh dossier
// 3. Save and return
```

**Acceptance Criteria**:

- [ ] Endpoint exists at `/api/ai/dossier/refresh`
- [ ] Deletes old dossier before regenerating
- [ ] Returns `refreshed: true` in response
- [ ] Protected by `authServiceOrSession`

**Validation Command**:

```bash
curl -X POST .../api/ai/dossier/refresh \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"accountId": "<id>"}' | jq '.refreshed'
```

**Commit**: `feat(ai): add dossier refresh endpoint`

---

### T31B.5: Add Dossier Staleness Check

**File**: `eventops/src/lib/ai/dossier-generator.ts` (MODIFY)  
**Effort**: 15 minutes  
**Dependencies**: T31B.0 (needs `updatedAt` field)  
**Validation**: API returns `isStale` and `daysOld`

**Add method**:

```typescript
export interface DossierWithAge {
  dossier: EnhancedDossier;
  isStale: boolean;  // > 7 days old
  daysOld: number;
  generatedAt: Date;
}

async getDossierWithAge(accountId: string): Promise<DossierWithAge | null> {
  const dossier = await prisma.company_dossiers.findUnique({
    where: { accountId },
  });

  if (!dossier) return null;

  const updatedAt = dossier.updatedAt || dossier.researchedAt;
  const daysOld = Math.floor(
    (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    dossier: this.parseDossier(dossier),
    isStale: daysOld > 7,
    daysOld,
    generatedAt: updatedAt,
  };
}
```

**Acceptance Criteria**:

- [ ] `getDossierWithAge` method exists
- [ ] Returns `isStale: true` for dossiers > 7 days old
- [ ] Returns accurate `daysOld` count

**Commit**: `feat(ai): add dossier staleness detection`

---

## Sprint 31C: Conversation Memory

**Goal**: Brain remembers conversation context across messages  
**Demo**: "What did I ask earlier?" → Brain recalls previous messages

### T31C.1: Create Conversation Store

**File**: `eventops/src/lib/ai/conversation-store.ts` (NEW FILE)  
**Effort**: 30 minutes  
**Dependencies**: `src/lib/queue/client.ts` (Redis)  
**Validation**: Unit tests pass

**⚠️ SECURITY FIX**: All functions must verify userId ownership to prevent data leakage.

**⚠️ LAZY INIT**: Redis connection MUST be retrieved inside functions, not at module scope.

```typescript
import { randomUUID } from "crypto";
import { getRedisConnection } from "@/lib/queue/client";
import type { BrainAction } from "@/types/brain-actions";

// Interfaces:
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  action?: BrainAction;
}

export interface Conversation {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: number;
  lastMessageAt: number;
}

// Constants:
const CONVERSATION_TTL = 60 * 60 * 24; // 24 hours
const MAX_MESSAGES = 20;

// ID generation:
export function generateConversationId(): string {
  return `conv_${randomUUID()}`;
}

// Functions (all verify userId ownership):
export async function getConversation(
  conversationId: string,
  userId: string,
): Promise<Conversation | null> {
  const redis = getRedisConnection(); // ✅ Lazy - inside function
  const data = await redis.get(`conversation:${conversationId}`);
  if (!data) return null;

  const conversation = JSON.parse(data) as Conversation;
  if (conversation.userId !== userId) {
    return null; // ⚠️ Don't leak other users' conversations
  }
  return conversation;
}

export async function saveConversation(
  conversation: Conversation,
): Promise<void>;
export async function addMessage(
  conversationId: string,
  userId: string,
  message: ConversationMessage,
): Promise<Conversation>;
export async function clearConversation(
  conversationId: string,
  userId: string,
): Promise<void>;
export async function getUserConversations(userId: string): Promise<string[]>;
```

**Acceptance Criteria**:

- [ ] File exists at `src/lib/ai/conversation-store.ts`
- [ ] Uses `getRedisConnection()` INSIDE functions (not module scope)
- [ ] All functions verify userId ownership
- [ ] TTL set to 24 hours
- [ ] Max 20 messages per conversation (trims oldest)
- [ ] `generateConversationId()` exported

**Commit**: `feat(ai): create redis-backed conversation store`

---

### T31C.2: Conversation Store Unit Tests

**File**: `eventops/tests/ai/conversation-store.test.ts` (NEW FILE)  
**Effort**: 20 minutes  
**Dependencies**: T31C.1  
**Validation**: `npm test tests/ai/conversation-store.test.ts`

```typescript
// Test cases:
describe("ConversationStore", () => {
  describe("addMessage", () => {
    it("creates new conversation on first message");
    it("appends to existing conversation");
    it("trims to MAX_MESSAGES limit");
  });

  describe("getConversation", () => {
    it("returns null for unknown ID");
    it("returns full conversation for known ID");
  });

  describe("clearConversation", () => {
    it("removes conversation from Redis");
    it("does not error for unknown ID");
  });
});
```

**Acceptance Criteria**:

- [ ] Test file exists
- [ ] Mocks Redis correctly
- [ ] All tests pass

**Commit**: `test(ai): add conversation store unit tests`

---

### T31C.3: Wire Conversation Store to Chat

**File**: `eventops/src/app/api/ai/chat/route.ts` (MODIFY)  
**Effort**: 30 minutes  
**Dependencies**: T31C.1  
**Validation**: Curl test with `conversationId`

**Changes**:

1. Import conversation store functions
2. Accept `conversationId` in request body
3. Load existing conversation if ID provided
4. Add user message to conversation
5. Add assistant response to conversation
6. Return `conversationId` in response

**Request schema update**:

```typescript
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(), // NEW
  context: z.object({...}).optional(),
});
```

**Response update**:

```typescript
return NextResponse.json({
  response: result.content,
  action,
  conversationId: newConversationId, // NEW
  messageCount: conversation?.messages.length || 2, // NEW
  suggestions,
  provider: result.provider,
  fallbackUsed: result.fallbackUsed,
});
```

**Acceptance Criteria**:

- [ ] `conversationId` accepted in request
- [ ] Conversation loaded from Redis if ID provided
- [ ] Messages persisted after response
- [ ] `conversationId` returned for tracking

**Validation**:

```bash
# First message - get conversationId
ID=$(curl -s -X POST .../api/ai/chat -d '{"message": "Hello"}' | jq -r '.conversationId')

# Second message - use conversationId
curl -s -X POST .../api/ai/chat -d "{\"message\": \"What did I say?\", \"conversationId\": \"$ID\"}" | jq
```

**Commit**: `feat(ai): persist conversations in chat endpoint`

---

### T31C.4: Conversation CRUD Endpoints

**File**: `eventops/src/app/api/ai/conversations/route.ts` (NEW FILE)  
**File**: `eventops/src/app/api/ai/conversations/[id]/route.ts` (NEW FILE)  
**Effort**: 20 minutes  
**Dependencies**: T31C.1  
**Validation**: Curl CRUD operations

```typescript
// GET /api/ai/conversations - List user's conversations
// Response: { conversations: string[] }

// GET /api/ai/conversations/[id] - Get specific conversation
// Response: { conversation: Conversation }

// DELETE /api/ai/conversations/[id] - Clear conversation
// Response: { cleared: true }
```

**Acceptance Criteria**:

- [ ] List endpoint returns user's conversation IDs
- [ ] Get endpoint returns full conversation
- [ ] Delete endpoint clears from Redis
- [ ] All protected by `authServiceOrSession`

**Commit**: `feat(ai): add conversation management endpoints`

---

## Sprint 31D: Batch Research

**Goal**: Research multiple companies in one request  
**Demo**: POST 10 company IDs → get 10 dossiers

### T31D.1: Create Batch Research Endpoint

**File**: `eventops/src/app/api/ai/research/batch/route.ts` (NEW FILE)  
**Effort**: 30 minutes  
**Dependencies**: `src/lib/ai/dossier-generator.ts`  
**Validation**: Batch returns multiple results

```typescript
// POST /api/ai/research/batch
// Body: { accountIds: string[] }
// Returns: { results: DossierResult[], stats: { total, success, failed } }

// Constraints:
const MAX_BATCH_SIZE = 10;

// Uses Promise.allSettled for parallel processing
// Returns partial results if some fail
```

**Acceptance Criteria**:

- [ ] Endpoint exists at `/api/ai/research/batch`
- [ ] Validates `accountIds` is array
- [ ] Enforces `MAX_BATCH_SIZE` of 10
- [ ] Returns `stats` with success/failure counts
- [ ] Protected by `authServiceOrSession`

**Validation Command**:

```bash
curl -X POST .../api/ai/research/batch \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"accountIds": ["id1", "id2", "id3"]}' | jq '.stats'
```

**Commit**: `feat(ai): add batch research endpoint`

---

### T31D.2: Add Rate Limiting (Atomic Redis)

**File**: `eventops/src/app/api/ai/research/batch/route.ts` (MODIFY)  
**Effort**: 20 minutes  
**Dependencies**: T31D.1  
**Validation**: 429 returned when limit exceeded

**⚠️ REVIEW FIX**: Use atomic Redis operations to prevent race conditions.

```typescript
// Redis-based rate limiting with ATOMIC operations:
const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX = 50; // Max 50 accounts per minute per user

async function checkAndIncrementRateLimit(
  userId: string,
  count: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const redis = getRedisConnection();
  const key = `ratelimit:batch:${userId}`;

  // Use INCR for atomicity (prevents race conditions)
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }

  if (current > RATE_LIMIT_MAX) {
    const ttl = await redis.ttl(key);
    return { allowed: false, retryAfter: ttl > 0 ? ttl : RATE_LIMIT_WINDOW };
  }

  return { allowed: true };
}

// Returns 429 with retryAfter header when exceeded:
if (!rateCheck.allowed) {
  return NextResponse.json(
    { error: "Rate limit exceeded", retryAfter: rateCheck.retryAfter },
    { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } },
  );
}
```

**Acceptance Criteria**:

- [ ] Rate limit checked before processing
- [ ] Uses atomic INCR (not GET then SET)
- [ ] Returns 429 with `retryAfter` in body and header
- [ ] Rate limit per user, not global
- [ ] Uses Redis for tracking

**Commit**: `feat(ai): add atomic rate limiting to batch research`

---

### T31D.3: Batch Research Tests

**File**: `eventops/tests/ai/research-batch.test.ts` (NEW FILE)  
**Effort**: 20 minutes  
**Dependencies**: T31D.1, T31D.2  
**Validation**: All tests pass

```typescript
describe("POST /api/ai/research/batch", () => {
  it("requires authentication");
  it("validates accountIds is array");
  it("rejects empty array");
  it("enforces max batch size of 10");
  it("returns stats with success/failure counts");
  it("returns partial results when some fail"); // NEW
  it("returns 429 when rate limited");
  it("includes Retry-After header on 429"); // NEW
});
```

**Acceptance Criteria**:

- [ ] Test file exists
- [ ] All test cases pass
- [ ] Mocks properly (prisma, AI provider)

**Commit**: `test(ai): add batch research endpoint tests`

---

## Sprint 31E: Provider Monitoring

**Goal**: Expose AI provider health for dashboard  
**Demo**: `/api/ai/status` shows Gemini/OpenAI health

### T31E.1: Create AI Status Endpoint

**File**: `eventops/src/app/api/ai/status/route.ts` (NEW FILE)  
**Effort**: 25 minutes  
**Dependencies**: `src/lib/queue/client.ts` (Redis)  
**Validation**: Returns provider status

```typescript
// GET /api/ai/status
// Response:
{
  "providers": {
    "gemini": {
      "status": "ok" | "degraded" | "down",
      "latencyMs": number | null,
      "rateLimited": boolean,
      "callsToday": number
    },
    "openai": { ... }
  },
  "preferred": "gemini" | "openai",
  "fallbacksToday": number,
  "timestamp": string
}
```

**Acceptance Criteria**:

- [ ] Endpoint exists at `/api/ai/status`
- [ ] Returns status for both providers
- [ ] Reads health data from Redis
- [ ] Protected by `authServiceOrSession`

**Validation Command**:

```bash
curl -s .../api/ai/status -H "Authorization: Bearer $CRON_SECRET" | jq '.providers'
```

**Commit**: `feat(ai): add AI status endpoint`

---

### T31E.2: Track Provider Usage

**File**: `eventops/src/lib/ai/provider.ts` (MODIFY)  
**Effort**: 20 minutes  
**Dependencies**: None  
**Validation**: Stats increment on AI calls

**⚠️ REVIEW FIX**: Use fire-and-forget pattern - don't block on tracking.

**Add tracking function**:

```typescript
async function trackProviderCall(
  provider: AIProvider,
  latencyMs: number,
  error?: string,
): Promise<void> {
  try {
    const redis = getRedisConnection();
    const today = new Date().toISOString().split("T")[0];

    // Increment daily call counter
    await redis.incr(`ai:stats:${provider}:calls:${today}`);
    await redis.expire(`ai:stats:${provider}:calls:${today}`, 86400 * 2);

    // Store latency
    await redis.set(`ai:health:${provider}:latency`, latencyMs.toString());

    // Track errors
    if (error) {
      await redis.set(`ai:health:${provider}:lastError`, error);
      await redis.expire(`ai:health:${provider}:lastError`, 300); // 5 min
    } else {
      await redis.del(`ai:health:${provider}:lastError`);
    }

    // Track fallbacks
    if (provider === "openai" && error?.includes("fallback")) {
      await redis.incr(`ai:stats:fallback:count:${today}`);
    }
  } catch (trackingError) {
    // Don't fail on tracking errors - fire and forget
    logger.warn("Failed to track provider call", {
      error: trackingError instanceof Error ? trackingError.message : "Unknown",
    });
  }
}
```

**Call in `generateContent` (fire-and-forget)**:

```typescript
const startTime = Date.now();
try {
  const result = await generateWithProvider(prompt, options);
  // ⚠️ Fire-and-forget - don't await, don't block
  trackProviderCall(provider, Date.now() - startTime).catch(() => {});
  return result;
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  trackProviderCall(provider, Date.now() - startTime, message).catch(() => {});
  throw error;
}
```

**Acceptance Criteria**:

- [ ] `trackProviderCall` function added with internal try/catch
- [ ] Called without await (fire-and-forget pattern)
- [ ] Tracking failures don't block AI responses
- [ ] Stats stored in Redis with TTL

**Commit**: `feat(ai): track provider usage and latency`

---

### T31E.3: Add AI Status to Health Endpoint

**File**: `eventops/src/app/api/health/route.ts` (MODIFY)  
**Effort**: 15 minutes  
**Dependencies**: T31E.1  
**Validation**: Health includes AI summary

**Add to health response**:

```typescript
// In checks object:
ai: {
  gemini: { status: 'ok' | 'degraded' | 'down' },
  openai: { status: 'ok' | 'degraded' | 'down' },
  preferredProvider: 'gemini' | 'openai',
  fallbacksToday: number,
}
```

**Acceptance Criteria**:

- [ ] Health endpoint includes `ai` check
- [ ] Shows status for both providers
- [ ] Includes fallback count

**Commit**: `feat(health): add AI provider status to health check`

---

## Summary: Complete Task List

| ID     | Phase | Task                      | Effort | Files                                     | Validation          |
| ------ | ----- | ------------------------- | ------ | ----------------------------------------- | ------------------- |
| T31A.1 | 1     | Define Action Types       | 20m    | `src/types/brain-actions.ts`              | Lint passes         |
| T31A.2 | 1     | Create Action Parser      | 30m    | `src/lib/ai/action-parser.ts`             | Unit tests          |
| T31A.3 | 1     | Parser Unit Tests         | 25m    | `tests/ai/action-parser.test.ts`          | Tests pass          |
| T31C.1 | 1     | Conversation Store        | 30m    | `src/lib/ai/conversation-store.ts`        | Unit tests          |
| T31C.2 | 1     | Store Unit Tests          | 20m    | `tests/ai/conversation-store.test.ts`     | Tests pass          |
| T31A.4 | 2     | Wire Actions to Chat      | 30m    | `src/app/api/ai/chat/route.ts`            | Curl test           |
| T31A.5 | 2     | Confidence Scoring        | 15m    | `src/lib/ai/action-parser.ts`             | Confidence returned |
| T31C.3 | 2     | Wire Conversation to Chat | 30m    | `src/app/api/ai/chat/route.ts`            | Curl test           |
| T31C.4 | 2     | Conversation CRUD         | 20m    | `src/app/api/ai/conversations/*.ts`       | CRUD works          |
| T31B.0 | 3     | **Prisma Migration** ⚠️   | 20m    | `prisma/schema.prisma`                    | Migrate succeeds    |
| T31B.1 | 3     | Extend Interface          | 15m    | `src/lib/ai/dossier-generator.ts`         | TS compiles         |
| T31B.2 | 3     | Update Prompt             | 30m    | `src/lib/ai/dossier-generator.ts`         | New fields present  |
| T31B.3 | 3     | Enrich from Contacts      | 25m    | `src/lib/ai/dossier-generator.ts`         | Contacts in context |
| T31B.4 | 3     | Refresh Endpoint          | 20m    | `src/app/api/ai/dossier/refresh/route.ts` | Curl test           |
| T31B.5 | 3     | Staleness Check           | 15m    | `src/lib/ai/dossier-generator.ts`         | isStale returned    |
| T31E.2 | 4     | Track Usage ⚠️            | 20m    | `src/lib/ai/provider.ts`                  | Stats in Redis      |
| T31E.1 | 4     | Status Endpoint           | 25m    | `src/app/api/ai/status/route.ts`          | Curl test           |
| T31E.3 | 4     | Add to Health             | 15m    | `src/app/api/health/route.ts`             | AI in health        |
| T31D.1 | 5     | Batch Endpoint            | 30m    | `src/app/api/ai/research/batch/route.ts`  | Curl test           |
| T31D.2 | 5     | Rate Limiting (atomic)    | 20m    | `src/app/api/ai/research/batch/route.ts`  | 429 returned        |
| T31D.3 | 5     | Batch Tests               | 20m    | `tests/ai/research-batch.test.ts`         | Tests pass          |
| T31F.1 | 6     | Integration Tests         | 45m    | `tests/integration/ai-brain.test.ts`      | All pass            |

**Total: 23 tasks, ~11-13 hours**

### ⚠️ Tasks marked with warnings require extra care:

- **T31B.0**: Make `updatedAt` nullable for existing data
- **T31E.2**: Must come BEFORE T31E.1 (writes data that status reads)

---

## Sprint Demos

### Sprint 31A Demo: Brain Actions

```bash
# Brain returns action for navigation
curl -X POST .../api/ai/chat -d '{"message": "Show me tier 1 prospects"}' | jq
# Expected: { "response": "I'll filter for Tier 1 prospects...", "action": {"type": "filter", "tier": "Tier 1"}, "confidence": 0.8 }
```

### Sprint 31B Demo: Enhanced Dossiers

```bash
# Generate enhanced dossier
curl -X POST .../api/ai/dossier/generate -d '{"accountId": "xxx"}' | jq '.dossier.talkingPoints'
# Expected: { "opener": "...", "painPoint": "...", "valueHook": "...", "nextStep": "..." }
```

### Sprint 31C Demo: Conversation Memory

```bash
# Multi-turn conversation
ID=$(curl -s -X POST .../api/ai/chat -d '{"message": "Tell me about Tier 1"}' | jq -r '.conversationId')
curl -X POST .../api/ai/chat -d "{\"message\": \"What did I just ask?\", \"conversationId\": \"$ID\"}"
# Expected: Brain recalls previous message
```

### Sprint 31D Demo: Batch Research

```bash
# Research 3 companies at once
curl -X POST .../api/ai/research/batch -d '{"accountIds": ["a1", "a2", "a3"]}' | jq '.stats'
# Expected: { "total": 3, "success": 3, "failed": 0 }
```

### Sprint 31E Demo: Provider Monitoring

```bash
# Check AI health
curl .../api/ai/status | jq '.providers'
# Expected: { "gemini": {"status": "ok", ...}, "openai": {...} }
```

---

## Rollback Procedures

| Sprint | Rollback                                                      |
| ------ | ------------------------------------------------------------- |
| 31A    | Chat still works, `action` field just undefined               |
| 31B    | Revert migration (see SQL above), use existing dossier fields |
| 31C    | Disable Redis conversation store, in-memory fallback          |
| 31D    | Disable endpoint, use single research                         |
| 31E    | Remove from health response, no data loss                     |

---

## Sprint 31F: Integration Tests (NEW - from Review)

**Goal**: End-to-end integration tests for the full Brain flow  
**Demo**: `npm test tests/integration/ai-brain.test.ts` passes

### T31F.1: Full Flow Integration Tests

**File**: `eventops/tests/integration/ai-brain.test.ts` (NEW FILE)  
**Effort**: 45 minutes  
**Dependencies**: All other sprints  
**Validation**: All integration tests pass

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Brain Integration Tests", () => {
  describe("Chat with Actions", () => {
    it('returns action for "show tier 1 prospects"', async () => {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
        body: JSON.stringify({ message: "Show me Tier 1 prospects" }),
      });
      const data = await res.json();
      expect(data.action).toBeDefined();
      expect(data.action.type).toBe("filter");
    });

    it("persists conversation to Redis", async () => {
      const res1 = await fetch("/api/ai/chat", {
        /* ... */
      });
      const { conversationId } = await res1.json();

      const res2 = await fetch("/api/ai/chat", {
        body: JSON.stringify({
          message: "What did I ask?",
          conversationId,
        }),
      });
      const data2 = await res2.json();
      expect(data2.messageCount).toBeGreaterThan(2);
    });
  });

  describe("Dossier Generation", () => {
    it("generates enhanced dossier with talkingPoints", async () => {
      const res = await fetch("/api/ai/dossier/generate", {
        method: "POST",
        body: JSON.stringify({ accountId: testAccountId }),
      });
      const data = await res.json();
      expect(data.dossier.talkingPoints).toBeDefined();
      expect(data.dossier.outreachAngles).toBeDefined();
    });

    it("refresh clears and regenerates", async () => {
      const res = await fetch("/api/ai/dossier/refresh", {
        method: "POST",
        body: JSON.stringify({ accountId: testAccountId }),
      });
      const data = await res.json();
      expect(data.refreshed).toBe(true);
    });
  });

  describe("Batch Research", () => {
    it("researches multiple accounts", async () => {
      const res = await fetch("/api/ai/research/batch", {
        method: "POST",
        body: JSON.stringify({ accountIds: [testAccountId] }),
      });
      const data = await res.json();
      expect(data.stats.total).toBe(1);
    });

    it("rate limits excessive requests", async () => {
      // Make many requests to trigger rate limit
      // Expect 429 response
    });
  });

  describe("Provider Monitoring", () => {
    it("returns provider status", async () => {
      const res = await fetch("/api/ai/status");
      const data = await res.json();
      expect(data.providers.gemini).toBeDefined();
      expect(data.providers.openai).toBeDefined();
    });
  });
});
```

**Acceptance Criteria**:

- [ ] Test file exists at `tests/integration/ai-brain.test.ts`
- [ ] Tests run against real or mock endpoints
- [ ] Covers chat + actions, conversations, dossiers, batch, status
- [ ] All tests pass

**Commit**: `test(ai): add brain integration tests`

---

## Cross-Repo Notes (GTM-YardFlow)

After each sprint, GTM-YardFlow can integrate:

| Sprint | Frontend Integration                                         |
| ------ | ------------------------------------------------------------ |
| 31A    | Add `useBrainActions` hook to execute `action` from response |
| 31B    | Display `talkingPoints`, `outreachAngles` in DossierPanel    |
| 31C    | Track `conversationId`, add "Clear Chat" button              |
| 31D    | Add "Research Selected" bulk action                          |
| 31E    | Show AI health status in footer/settings                     |
| 31F    | Run integration tests before releases                        |
