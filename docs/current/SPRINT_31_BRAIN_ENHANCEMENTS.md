# Sprint 31: Railway Brain Enhancements

**Date**: February 4, 2026  
**Status**: � READY TO START  
**Goal**: Enhance Railway AI endpoints to power smarter Brain features in GTM-YardFlow  
**North Star**: "Backend intelligence that makes the Brain smarter"

---

## ⚡ Cross-Repo Status (GTM-YardFlow)

**Railway Build**: ✅ FIXED (February 4, 2026)  
**Frontend Waiting**: GTM-YardFlow B0 & B1 complete, waiting on Railway

### GTM-YardFlow Completed Work

| Sprint                      | Status      | What Was Done                                             |
| --------------------------- | ----------- | --------------------------------------------------------- |
| **B0: Railway AI Proxy**    | ✅ COMPLETE | `/api/ai/chat.ts`, `/api/ai/research.ts` proxy to Railway |
| **B1: Brain System Prompt** | ✅ COMPLETE | `brainSystemPrompt.ts`, page context awareness            |

### GTM-YardFlow Files Changed

- `api/ai/chat.ts` - Proxies to Railway `/api/ai/content/generate`
- `api/ai/research.ts` - Proxies to Railway `/api/ai/dossier/generate`
- `src/components/panels/ChatPanel.tsx` - Removed direct Gemini calls
- `src/App.tsx` - Removed geminiApiKey
- `src/config/brainSystemPrompt.ts` - Rich system prompt created
- `CompanyResearchService` - Updated to use Railway proxy

### Frontend Cleanup Done (7/7 tasks)

- ✅ Fix TemplateGenerator.ts Gemini calls
- ✅ Fix ChatPanel.tsx fallback Gemini code
- ✅ Remove geminiApiKey from ChatPanel
- ✅ Remove geminiApiKey from App.tsx
- ✅ Fix GeminiService.ts callGeminiAPI
- ✅ Clean up dead code in CompanyResearchService

### Next Steps (Frontend - Now Unblocked!)

1. Test Brain chat end-to-end
2. Test AI Research button
3. Test template generation
4. Implement B2 (Brain Actions) - navigation/filtering

---

## Executive Summary

This sprint enhances the Railway backend to provide richer AI capabilities for the GTM-YardFlow Brain system. The frontend relies on Railway for all AI processing - our enhancements here directly improve the Brain's intelligence.

### Current State (Sprint 30 Complete - Build Fixed!)

| Endpoint                      | Status     | Function                  | Tested |
| ----------------------------- | ---------- | ------------------------- | ------ |
| `/api/ai/chat`                | ✅ Working | General chat with context | Feb 4  |
| `/api/ai/dossier/generate`    | ✅ Working | Company dossiers          | Feb 4  |
| `/api/ai/content/generate`    | ✅ Working | Email/content generation  | Feb 4  |
| `/api/ai/score-icp`           | ✅ Working | ICP scoring               | Feb 4  |
| `/api/ai/content/sequence`    | ✅ Working | Multi-step sequences      | Feb 4  |
| `/api/accounts/[id]/research` | ✅ Working | Company research          | Feb 4  |

**Build Status**: Railway build passing after type fix in sequence logging

### Enhancement Goals

1. **Brain Actions** - Return structured commands the frontend can execute
2. **Rich Dossiers** - Add talking points, competitors, recent news
3. **Conversation Memory** - Redis-backed conversation persistence
4. **Batch Operations** - Research multiple companies at once
5. **Provider Health** - Monitor and expose AI provider status

---

## Sprint Overview

| Sprint   | Focus               | Endpoints                               | Demo                             |
| -------- | ------------------- | --------------------------------------- | -------------------------------- |
| **S31A** | Brain Actions       | `/api/ai/chat`                          | Brain returns executable actions |
| **S31B** | Enhanced Dossiers   | `/api/ai/dossier/generate`              | Richer research data             |
| **S31C** | Conversation Memory | `/api/ai/chat`, `/api/ai/conversations` | Multi-turn context               |
| **S31D** | Batch Research      | `/api/ai/research/batch`                | Research 10 companies at once    |
| **S31E** | Provider Monitoring | `/api/ai/status`                        | Health dashboard data            |

---

## Sprint S31A: Brain Actions (2 hours)

**Goal**: Brain returns structured actions the frontend can execute  
**Demo**: POST to chat → response includes `action: { type: 'filter', tier: 'Tier 1' }`

### T31A.1: Define Action Types

**File**: `src/types/brain-actions.ts`  
**Effort**: 20 min  
**Test**: TypeScript compiles

Create type definitions for all Brain actions:

```typescript
// src/types/brain-actions.ts
export type BrainActionType =
  | "navigate" // Go to a tab
  | "filter" // Apply filters
  | "search" // Search prospects
  | "select" // Select specific items
  | "research" // Trigger research
  | "email" // Open email composer
  | "explain"; // Just explain (no action)

export interface NavigateAction {
  type: "navigate";
  destination: "dashboard" | "prospects" | "sequences" | "import" | "accounts";
}

export interface FilterAction {
  type: "filter";
  tier?: "Tier 1" | "Tier 2" | "Tier 3";
  hasEmail?: boolean;
  industry?: string;
  icpScoreMin?: number;
}

export interface SearchAction {
  type: "search";
  query: string;
}

export interface ResearchAction {
  type: "research";
  companyName?: string;
  accountId?: string;
}

export interface EmailAction {
  type: "email";
  recipientIds?: string[];
  templateType?: "intro" | "followup" | "meeting";
}

export interface ExplainAction {
  type: "explain";
  topic: string;
}

export type BrainAction =
  | NavigateAction
  | FilterAction
  | SearchAction
  | ResearchAction
  | EmailAction
  | ExplainAction;

export interface BrainResponse {
  message: string;
  action?: BrainAction;
  suggestions?: string[];
  confidence?: number; // 0-1 how confident in the action
}
```

**Validation**: `npm run lint` passes, types export correctly

---

### T31A.2: Create Action Parser

**File**: `src/lib/ai/action-parser.ts`  
**Effort**: 30 min  
**Test**: Unit tests for parsing

Parse AI responses to extract structured actions:

```typescript
// src/lib/ai/action-parser.ts
import { BrainAction } from "@/types/brain-actions";

const ACTION_PATTERNS = {
  navigate:
    /\b(go to|show me|open|navigate to)\s+(dashboard|prospects|sequences|import|accounts)/i,
  filter:
    /\b(filter|show|find)\s+.*(tier\s*[123]|with email|without email|no email)/i,
  search: /\b(search|find|look for)\s+["']?([^"']+)["']?/i,
  research: /\b(research|analyze|look up)\s+(?:company\s+)?["']?([^"']+)["']?/i,
  email: /\b(send|write|compose|email)\s+.*email/i,
};

export function parseActionFromResponse(
  response: string,
): BrainAction | undefined {
  // Check for navigation
  const navMatch = response.match(ACTION_PATTERNS.navigate);
  if (navMatch) {
    return { type: "navigate", destination: normalizeDestination(navMatch[2]) };
  }

  // Check for filter
  const filterMatch = response.match(ACTION_PATTERNS.filter);
  if (filterMatch) {
    return parseFilterAction(filterMatch[0]);
  }

  // Check for search
  const searchMatch = response.match(ACTION_PATTERNS.search);
  if (searchMatch) {
    return { type: "search", query: searchMatch[2].trim() };
  }

  // Check for research
  const researchMatch = response.match(ACTION_PATTERNS.research);
  if (researchMatch) {
    return { type: "research", companyName: researchMatch[2].trim() };
  }

  // Check for email
  if (ACTION_PATTERNS.email.test(response)) {
    return { type: "email" };
  }

  return undefined;
}

function normalizeDestination(dest: string): NavigateAction["destination"] {
  const normalized = dest.toLowerCase().trim();
  const mapping: Record<string, NavigateAction["destination"]> = {
    dashboard: "dashboard",
    prospects: "prospects",
    sequences: "sequences",
    import: "import",
    accounts: "accounts",
  };
  return mapping[normalized] || "dashboard";
}

function parseFilterAction(text: string): FilterAction {
  const action: FilterAction = { type: "filter" };

  const tierMatch = text.match(/tier\s*([123])/i);
  if (tierMatch) {
    action.tier = `Tier ${tierMatch[1]}` as FilterAction["tier"];
  }

  if (/with\s*email/i.test(text)) action.hasEmail = true;
  if (/without\s*email|no\s*email/i.test(text)) action.hasEmail = false;

  return action;
}
```

**Validation**:

```bash
npm test -- --grep "action-parser"
```

---

### T31A.3: Create Action Parser Tests

**File**: `tests/lib/ai/action-parser.test.ts`  
**Effort**: 25 min  
**Test**: All tests pass

```typescript
// tests/lib/ai/action-parser.test.ts
import { describe, it, expect } from "vitest";
import { parseActionFromResponse } from "@/lib/ai/action-parser";

describe("parseActionFromResponse", () => {
  describe("navigation", () => {
    it('parses "go to prospects"', () => {
      const action = parseActionFromResponse(
        "I'll go to prospects to show you",
      );
      expect(action).toEqual({ type: "navigate", destination: "prospects" });
    });

    it('parses "show me the dashboard"', () => {
      const action = parseActionFromResponse("Let me show you the dashboard");
      expect(action).toEqual({ type: "navigate", destination: "dashboard" });
    });
  });

  describe("filtering", () => {
    it('parses "show tier 1 prospects"', () => {
      const action = parseActionFromResponse("I'll show tier 1 prospects");
      expect(action).toEqual({ type: "filter", tier: "Tier 1" });
    });

    it('parses "filter prospects with email"', () => {
      const action = parseActionFromResponse(
        "Let me filter prospects with email",
      );
      expect(action).toEqual({ type: "filter", hasEmail: true });
    });

    it('parses "find tier 2 without email"', () => {
      const action = parseActionFromResponse("I'll find tier 2 without email");
      expect(action).toEqual({
        type: "filter",
        tier: "Tier 2",
        hasEmail: false,
      });
    });
  });

  describe("search", () => {
    it('parses "search for Acme Corp"', () => {
      const action = parseActionFromResponse('I\'ll search for "Acme Corp"');
      expect(action).toEqual({ type: "search", query: "Acme Corp" });
    });
  });

  describe("research", () => {
    it('parses "research company XYZ"', () => {
      const action = parseActionFromResponse(
        'Let me research company "XYZ Logistics"',
      );
      expect(action).toEqual({
        type: "research",
        companyName: "XYZ Logistics",
      });
    });
  });

  describe("no action", () => {
    it("returns undefined for explanations", () => {
      const action = parseActionFromResponse(
        "The tier system works like this...",
      );
      expect(action).toBeUndefined();
    });
  });
});
```

**Validation**: `npm test tests/lib/ai/action-parser.test.ts`

---

### T31A.4: Update Chat Endpoint with Actions

**File**: `src/app/api/ai/chat/route.ts`  
**Effort**: 30 min  
**Test**: Curl returns action in response

Enhance chat endpoint to parse and return actions:

```typescript
// Add to imports
import { parseActionFromResponse } from "@/lib/ai/action-parser";
import { BrainAction, BrainResponse } from "@/types/brain-actions";

// Add action instruction to system prompt
const ACTION_INSTRUCTION = `
When the user asks you to do something in the app, phrase your response to include action words:
- To navigate: "I'll show you the prospects page" or "Let me open the dashboard"
- To filter: "I'll filter for Tier 1 prospects" or "Let me find prospects with email"
- To search: "I'll search for 'Acme Corp'"
- To research: "Let me research company XYZ"

This helps me understand what action to take.
`;

// In POST handler, after AI response:
const action = parseActionFromResponse(result.content);

return NextResponse.json({
  response: result.content,
  action, // NEW: structured action
  suggestions,
  provider: result.provider,
  fallbackUsed: result.fallbackUsed,
});
```

**Validation**:

```bash
curl -X POST https://yardflow-hitlist-production-2f41.up.railway.app/api/ai/chat \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me Tier 1 prospects", "context": {"pageContext": "dashboard"}}' | jq '.action'
```

Expected: `{ "type": "filter", "tier": "Tier 1" }`

---

### T31A.5: Add Action Confidence Scoring

**File**: `src/lib/ai/action-parser.ts`  
**Effort**: 15 min  
**Test**: Confidence returned with actions

Add confidence scoring based on match quality:

```typescript
export interface ParseResult {
  action?: BrainAction;
  confidence: number; // 0-1
}

export function parseActionWithConfidence(response: string): ParseResult {
  const action = parseActionFromResponse(response);

  if (!action) {
    return { confidence: 0 };
  }

  // Calculate confidence based on explicit action words
  let confidence = 0.5; // Base confidence

  if (/I'll|Let me|I will/i.test(response)) {
    confidence += 0.3; // Explicit intent
  }

  if (action.type === "filter" && action.tier) {
    confidence += 0.1; // Specific tier
  }

  if (action.type === "navigate") {
    confidence += 0.1; // Navigation is usually clear
  }

  return { action, confidence: Math.min(confidence, 1) };
}
```

**Validation**: Add test case, verify confidence values

---

## Sprint S31B: Enhanced Dossiers (2 hours)

**Goal**: Richer company research with actionable intelligence  
**Demo**: Dossier includes talking points, competitors, and outreach angles

### T31B.1: Extend Dossier Interface

**File**: `src/lib/ai/dossier-generator.ts`  
**Effort**: 15 min  
**Test**: TypeScript compiles

Add new fields to dossier output:

```typescript
export interface EnhancedDossier {
  // Existing fields
  companyOverview: string;
  industryContext: string;
  keyPainPoints: string[];

  // NEW: Actionable intelligence
  talkingPoints: {
    opener: string; // Conversation starter
    painPoint: string; // Pain point to explore
    valueHook: string; // How YardFlow helps
    nextStep: string; // CTA for the call
  };

  competitors: {
    name: string;
    differentiator: string; // How we're different
  }[];

  recentNews?: {
    headline: string;
    relevance: string; // Why this matters for outreach
    date?: string;
  }[];

  decisionMakers: {
    title: string;
    likelyPriorities: string[];
  }[];

  outreachAngles: {
    angle: string;
    emailSubject: string;
    openingLine: string;
  }[];

  // Manifest 2026 specific
  manifestContext: {
    likelyToAttend: boolean;
    boothConversationStarter: string;
    followUpTiming: string;
  };
}
```

**Validation**: `npm run lint` passes

---

### T31B.2: Update Dossier Prompt

**File**: `src/lib/ai/dossier-generator.ts`  
**Effort**: 30 min  
**Test**: Generate dossier with new fields

Enhance the AI prompt to request new fields:

```typescript
const ENHANCED_DOSSIER_PROMPT = `You are a B2B sales intelligence analyst researching {companyName} for the Manifest 2026 trade show.

COMPANY INFORMATION:
{context}

Generate a comprehensive sales dossier in JSON format. Focus on ACTIONABLE intelligence that helps a sales rep have a great conversation.

Return this exact JSON structure:
{
  "companyOverview": "2-3 paragraph overview",
  "industryContext": "Industry analysis and trends",
  "keyPainPoints": ["pain 1", "pain 2", "pain 3"],
  
  "talkingPoints": {
    "opener": "Conversation starter that shows you did research",
    "painPoint": "Specific pain point to explore in conversation",
    "valueHook": "How YardFlow yard management solves their problem",
    "nextStep": "Specific call-to-action for the meeting"
  },
  
  "competitors": [
    { "name": "Competitor A", "differentiator": "How YardFlow is better" }
  ],
  
  "decisionMakers": [
    { "title": "VP Operations", "likelyPriorities": ["efficiency", "visibility"] }
  ],
  
  "outreachAngles": [
    {
      "angle": "Efficiency gains",
      "emailSubject": "Subject line for this angle",
      "openingLine": "First line of email"
    }
  ],
  
  "manifestContext": {
    "likelyToAttend": true/false,
    "boothConversationStarter": "What to say when they walk up",
    "followUpTiming": "Best time to follow up after event"
  }
}

Make it specific to this company. No generic fluff. Return ONLY valid JSON.`;
```

**Validation**: Generate dossier and verify new fields present

---

### T31B.3: Add Dossier Enrichment from People

**File**: `src/lib/ai/dossier-generator.ts`  
**Effort**: 25 min  
**Test**: Dossier includes contact intelligence

Include contact data in dossier generation:

```typescript
private buildEnrichedContext(company: any): string {
  const parts: string[] = [];

  // Company basics
  parts.push(`Company: ${company.name}`);
  if (company.website) parts.push(`Website: ${company.website}`);
  if (company.industry) parts.push(`Industry: ${company.industry}`);
  if (company.icpScore) parts.push(`ICP Score: ${company.icpScore}/100`);

  // Contacts at company
  if (company.people?.length > 0) {
    parts.push('\nKnown Contacts:');
    for (const person of company.people.slice(0, 5)) {
      const roles = [];
      if (person.isExecOps) roles.push('ExecOps');
      if (person.isOps) roles.push('Ops');
      if (person.isProc) roles.push('Procurement');
      parts.push(`- ${person.name}, ${person.title} [${roles.join(', ')}]`);
    }
  }

  // Existing dossier data
  if (company.company_dossiers?.companyOverview) {
    parts.push(`\nExisting Research:\n${company.company_dossiers.companyOverview}`);
  }

  return parts.join('\n');
}
```

**Validation**: Dossier references known contacts

---

### T31B.4: Create Dossier Refresh Endpoint

**File**: `src/app/api/ai/dossier/refresh/route.ts`  
**Effort**: 20 min  
**Test**: Curl refreshes stale dossiers

Force-refresh dossier even if cached:

```typescript
// src/app/api/ai/dossier/refresh/route.ts
export async function POST(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accountId } = await request.json();

  // Delete existing dossier
  await prisma.company_dossiers.deleteMany({
    where: { accountId },
  });

  // Generate fresh
  const generator = new AIDossierGenerator();
  const result = await generator.generateDossier(accountId);

  if (result.success && result.dossier) {
    await generator.saveDossier(accountId, result.dossier);
  }

  return NextResponse.json({
    ...result,
    refreshed: true,
    timestamp: new Date().toISOString(),
  });
}
```

**Validation**:

```bash
curl -X POST .../api/ai/dossier/refresh -d '{"accountId": "xxx"}' | jq '.refreshed'
```

---

### T31B.5: Add Dossier Age Check

**File**: `src/lib/ai/dossier-generator.ts`  
**Effort**: 15 min  
**Test**: Stale check works correctly

Return staleness indicator:

```typescript
export interface DossierWithAge extends EnhancedDossier {
  generatedAt: Date;
  isStale: boolean;       // > 7 days old
  daysOld: number;
}

async getDossierWithAge(accountId: string): Promise<DossierWithAge | null> {
  const dossier = await prisma.company_dossiers.findUnique({
    where: { accountId },
  });

  if (!dossier) return null;

  const daysOld = Math.floor(
    (Date.now() - dossier.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    ...dossier,
    isStale: daysOld > 7,
    daysOld,
  };
}
```

**Validation**: Check dossier age in response

---

## Sprint S31C: Conversation Memory (2 hours)

**Goal**: Brain remembers conversation context across messages  
**Demo**: "What did I ask earlier?" → Brain recalls previous messages

### T31C.1: Create Conversation Store

**File**: `src/lib/ai/conversation-store.ts`  
**Effort**: 30 min  
**Test**: Store/retrieve works

Redis-backed conversation storage:

```typescript
// src/lib/ai/conversation-store.ts
import { getRedisConnection } from "@/lib/queue/client";

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

const CONVERSATION_TTL = 60 * 60 * 24; // 24 hours
const MAX_MESSAGES = 20;

export async function getConversation(
  conversationId: string,
): Promise<Conversation | null> {
  const redis = getRedisConnection();
  const data = await redis.get(`conversation:${conversationId}`);
  return data ? JSON.parse(data) : null;
}

export async function saveConversation(
  conversation: Conversation,
): Promise<void> {
  const redis = getRedisConnection();

  // Trim to max messages
  if (conversation.messages.length > MAX_MESSAGES) {
    conversation.messages = conversation.messages.slice(-MAX_MESSAGES);
  }

  await redis.setex(
    `conversation:${conversation.id}`,
    CONVERSATION_TTL,
    JSON.stringify(conversation),
  );
}

export async function addMessage(
  conversationId: string,
  userId: string,
  message: ConversationMessage,
): Promise<Conversation> {
  let conversation = await getConversation(conversationId);

  if (!conversation) {
    conversation = {
      id: conversationId,
      userId,
      messages: [],
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    };
  }

  conversation.messages.push(message);
  conversation.lastMessageAt = Date.now();

  await saveConversation(conversation);
  return conversation;
}

export async function clearConversation(conversationId: string): Promise<void> {
  const redis = getRedisConnection();
  await redis.del(`conversation:${conversationId}`);
}
```

**Validation**: Unit test store operations

---

### T31C.2: Create Conversation Tests

**File**: `tests/lib/ai/conversation-store.test.ts`  
**Effort**: 20 min  
**Test**: All tests pass

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getConversation,
  addMessage,
  clearConversation,
} from "@/lib/ai/conversation-store";

// Mock Redis
vi.mock("@/lib/queue/client", () => ({
  getRedisConnection: () => ({
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  }),
}));

describe("ConversationStore", () => {
  it("creates new conversation on first message", async () => {
    const conv = await addMessage("conv-1", "user-1", {
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    });

    expect(conv.id).toBe("conv-1");
    expect(conv.messages).toHaveLength(1);
  });

  it("appends messages to existing conversation", async () => {
    // Add first message
    await addMessage("conv-2", "user-1", {
      role: "user",
      content: "First",
      timestamp: Date.now(),
    });

    // Add second message
    const conv = await addMessage("conv-2", "user-1", {
      role: "assistant",
      content: "Response",
      timestamp: Date.now(),
    });

    expect(conv.messages).toHaveLength(2);
  });

  it("trims messages at max limit", async () => {
    // Add 25 messages
    for (let i = 0; i < 25; i++) {
      await addMessage("conv-3", "user-1", {
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
        timestamp: Date.now(),
      });
    }

    const conv = await getConversation("conv-3");
    expect(conv?.messages.length).toBeLessThanOrEqual(20);
  });
});
```

**Validation**: `npm test tests/lib/ai/conversation-store.test.ts`

---

### T31C.3: Update Chat Endpoint for Conversations

**File**: `src/app/api/ai/chat/route.ts`  
**Effort**: 30 min  
**Test**: Conversation persists across requests

Wire conversation store to chat:

```typescript
// Add to POST handler
const { message, context, conversationId } = validationResult.data;

// Load or create conversation
let conversation: Conversation | null = null;
if (conversationId) {
  conversation = await getConversation(conversationId);
}

const newConversationId = conversationId || `conv-${Date.now()}-${authResult.userId}`;

// Add user message to history
await addMessage(newConversationId, authResult.userId, {
  role: 'user',
  content: message,
  timestamp: Date.now(),
});

// Include history in prompt
const history = conversation?.messages.slice(-6) || [];
const fullPrompt = buildMessages(systemPrompt, message, contextData, history);

// Generate response...

// Add assistant response to history
await addMessage(newConversationId, authResult.userId, {
  role: 'assistant',
  content: result.content,
  timestamp: Date.now(),
  action,
});

return NextResponse.json({
  response: result.content,
  action,
  conversationId: newConversationId,  // Return for frontend to track
  messageCount: (conversation?.messages.length || 0) + 2,
  ...
});
```

**Validation**:

```bash
# First message
curl -X POST .../api/ai/chat -d '{"message": "Hello"}' | jq '.conversationId'
# Use that ID in next request
curl -X POST .../api/ai/chat -d '{"message": "What did I say?", "conversationId": "conv-xxx"}'
```

---

### T31C.4: Add Conversation Management Endpoints

**File**: `src/app/api/ai/conversations/route.ts`  
**Effort**: 20 min  
**Test**: CRUD operations work

```typescript
// GET /api/ai/conversations - List user's conversations
// GET /api/ai/conversations/[id] - Get specific conversation
// DELETE /api/ai/conversations/[id] - Clear conversation

export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await getUserConversations(authResult.userId);
  return NextResponse.json({ conversations });
}

export async function DELETE(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("id");

  if (conversationId) {
    await clearConversation(conversationId);
    return NextResponse.json({ cleared: true });
  }

  return NextResponse.json(
    { error: "Conversation ID required" },
    { status: 400 },
  );
}
```

**Validation**: Delete clears conversation from Redis

---

### T31C.5: Add Conversation Summary

**File**: `src/lib/ai/conversation-store.ts`  
**Effort**: 20 min  
**Test**: Summary generated correctly

Generate summary for long conversations:

```typescript
export function getConversationSummary(conversation: Conversation): string {
  if (conversation.messages.length === 0) return "Empty conversation";

  const topics = new Set<string>();
  const actions: BrainAction[] = [];

  for (const msg of conversation.messages) {
    if (msg.action) actions.push(msg.action);

    // Extract topics from keywords
    const keywords = extractKeywords(msg.content);
    keywords.forEach((k) => topics.add(k));
  }

  return (
    `Discussed: ${Array.from(topics).slice(0, 5).join(", ")}. ` +
    `Actions taken: ${actions.length}. ` +
    `Messages: ${conversation.messages.length}.`
  );
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const keywords = [
    "tier",
    "prospect",
    "email",
    "research",
    "account",
    "filter",
  ];
  return words.filter((w) => keywords.some((k) => w.includes(k)));
}
```

**Validation**: Summary returned in conversation endpoint

---

## Sprint S31D: Batch Research (1.5 hours)

**Goal**: Research multiple companies in one request  
**Demo**: POST 10 company IDs → get 10 dossiers

### T31D.1: Create Batch Research Endpoint

**File**: `src/app/api/ai/research/batch/route.ts`  
**Effort**: 30 min  
**Test**: Batch returns multiple results

```typescript
// POST /api/ai/research/batch
// Body: { accountIds: string[] }
// Returns: { results: DossierResult[], stats: { success: number, failed: number } }

import { NextRequest, NextResponse } from "next/server";
import { authServiceOrSession } from "@/lib/auth-service";
import { AIDossierGenerator } from "@/lib/ai/dossier-generator";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const MAX_BATCH_SIZE = 10;

export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountIds } = await request.json();

    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json(
        { error: "accountIds array required" },
        { status: 400 },
      );
    }

    if (accountIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: `Max batch size is ${MAX_BATCH_SIZE}`,
        },
        { status: 400 },
      );
    }

    logger.info("Batch research started", {
      userId: authResult.userId,
      count: accountIds.length,
    });

    const generator = new AIDossierGenerator();
    const results = await Promise.allSettled(
      accountIds.map((id) => generator.generateDossier(id)),
    );

    const processed = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return {
        accountId: accountIds[index],
        companyName: "Unknown",
        success: false,
        error: result.reason?.message || "Unknown error",
      };
    });

    const stats = {
      total: processed.length,
      success: processed.filter((r) => r.success).length,
      failed: processed.filter((r) => !r.success).length,
    };

    logger.info("Batch research complete", {
      userId: authResult.userId,
      stats,
    });

    return NextResponse.json({ results: processed, stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Batch research failed";
    logger.error("Batch research error", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Validation**:

```bash
curl -X POST .../api/ai/research/batch \
  -d '{"accountIds": ["id1", "id2", "id3"]}' | jq '.stats'
```

---

### T31D.2: Add Rate Limiting for Batch

**File**: `src/app/api/ai/research/batch/route.ts`  
**Effort**: 20 min  
**Test**: Rate limit enforced

```typescript
import { getRedisConnection } from "@/lib/queue/client";

const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX = 50; // Max 50 accounts per minute

async function checkRateLimit(userId: string, count: number): Promise<boolean> {
  const redis = getRedisConnection();
  const key = `ratelimit:research:${userId}`;

  const current = await redis.get(key);
  const used = current ? parseInt(current, 10) : 0;

  if (used + count > RATE_LIMIT_MAX) {
    return false;
  }

  await redis.incrby(key, count);
  await redis.expire(key, RATE_LIMIT_WINDOW);
  return true;
}

// In handler:
const allowed = await checkRateLimit(authResult.userId, accountIds.length);
if (!allowed) {
  return NextResponse.json(
    {
      error: "Rate limit exceeded. Max 50 accounts per minute.",
      retryAfter: RATE_LIMIT_WINDOW,
    },
    { status: 429 },
  );
}
```

**Validation**: Hit rate limit with large batch

---

### T31D.3: Add Batch Progress Tracking

**File**: `src/app/api/ai/research/batch/route.ts`  
**Effort**: 20 min  
**Test**: Progress queryable during batch

For large batches, allow progress checking:

```typescript
// For batches > 5, queue and return job ID
if (accountIds.length > 5) {
  const jobId = await queueBatchResearch(accountIds, authResult.userId);
  return NextResponse.json({
    jobId,
    status: "queued",
    checkUrl: `/api/ai/research/batch/status/${jobId}`,
  });
}

// GET /api/ai/research/batch/status/[jobId]
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const status = await getBatchStatus(params.jobId);
  return NextResponse.json(status);
}
```

**Validation**: Large batch returns job ID

---

### T31D.4: Add Batch Research Tests

**File**: `tests/api/ai/research-batch.test.ts`  
**Effort**: 20 min  
**Test**: All tests pass

```typescript
import { describe, it, expect } from "vitest";

describe("POST /api/ai/research/batch", () => {
  it("requires authentication", async () => {
    const res = await fetch("/api/ai/research/batch", {
      method: "POST",
      body: JSON.stringify({ accountIds: ["a"] }),
    });
    expect(res.status).toBe(401);
  });

  it("validates accountIds array", async () => {
    const res = await authFetch("/api/ai/research/batch", {
      method: "POST",
      body: JSON.stringify({ accountIds: "not-array" }),
    });
    expect(res.status).toBe(400);
  });

  it("enforces max batch size", async () => {
    const res = await authFetch("/api/ai/research/batch", {
      method: "POST",
      body: JSON.stringify({ accountIds: Array(15).fill("id") }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Max batch size");
  });

  it("returns results for valid batch", async () => {
    const res = await authFetch("/api/ai/research/batch", {
      method: "POST",
      body: JSON.stringify({ accountIds: ["acc-1", "acc-2"] }),
    });
    const data = await res.json();
    expect(data.results).toHaveLength(2);
    expect(data.stats.total).toBe(2);
  });
});
```

**Validation**: `npm test tests/api/ai/research-batch.test.ts`

---

## Sprint S31E: Provider Monitoring (1 hour)

**Goal**: Expose AI provider health for dashboard  
**Demo**: `/api/ai/status` shows Gemini/OpenAI health

### T31E.1: Create AI Status Endpoint

**File**: `src/app/api/ai/status/route.ts`  
**Effort**: 25 min  
**Test**: Returns provider status

```typescript
// GET /api/ai/status
// Returns: { providers: { gemini: {...}, openai: {...} }, preferred: string }

import { NextRequest, NextResponse } from "next/server";
import { authServiceOrSession } from "@/lib/auth-service";
import { getProviderStatus, getPreferredProvider } from "@/lib/ai/provider";
import { getRedisConnection } from "@/lib/queue/client";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const redis = getRedisConnection();

    // Get current provider status
    const geminiStatus = await getProviderHealth("gemini");
    const openaiStatus = await getProviderHealth("openai");

    // Get usage stats from Redis
    const geminiCalls = (await redis.get("ai:stats:gemini:calls")) || "0";
    const openaiCalls = (await redis.get("ai:stats:openai:calls")) || "0";
    const fallbackCount = (await redis.get("ai:stats:fallback:count")) || "0";

    return NextResponse.json({
      providers: {
        gemini: {
          status: geminiStatus.status,
          latencyMs: geminiStatus.latencyMs,
          rateLimited: geminiStatus.rateLimited,
          callsToday: parseInt(geminiCalls, 10),
        },
        openai: {
          status: openaiStatus.status,
          latencyMs: openaiStatus.latencyMs,
          rateLimited: openaiStatus.rateLimited,
          callsToday: parseInt(openaiCalls, 10),
        },
      },
      preferred: getPreferredProvider(),
      fallbacksToday: parseInt(fallbackCount, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Status check failed";
    logger.error("AI status error", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function getProviderHealth(provider: "gemini" | "openai") {
  const redis = getRedisConnection();
  const lastError = await redis.get(`ai:health:${provider}:lastError`);
  const lastLatency = await redis.get(`ai:health:${provider}:latency`);

  return {
    status: lastError ? "degraded" : "ok",
    latencyMs: lastLatency ? parseInt(lastLatency, 10) : null,
    rateLimited: lastError?.includes("rate") || false,
    lastError: lastError || null,
  };
}
```

**Validation**:

```bash
curl .../api/ai/status | jq '.providers'
```

---

### T31E.2: Track Provider Usage

**File**: `src/lib/ai/provider.ts`  
**Effort**: 20 min  
**Test**: Stats increment on calls

Add tracking to provider calls:

```typescript
// Add to generateContent function
async function trackProviderCall(
  provider: string,
  latencyMs: number,
  error?: string,
) {
  try {
    const redis = getRedisConnection();
    const today = new Date().toISOString().split("T")[0];

    // Increment call counter
    await redis.incr(`ai:stats:${provider}:calls:${today}`);
    await redis.expire(`ai:stats:${provider}:calls:${today}`, 86400 * 2);

    // Track latency
    await redis.set(`ai:health:${provider}:latency`, latencyMs.toString());

    // Track errors
    if (error) {
      await redis.set(`ai:health:${provider}:lastError`, error);
      await redis.expire(`ai:health:${provider}:lastError`, 300); // 5 min
    } else {
      await redis.del(`ai:health:${provider}:lastError`);
    }

    // Track fallback
    if (provider === "openai" && error?.includes("fallback")) {
      await redis.incr(`ai:stats:fallback:count:${today}`);
    }
  } catch {
    // Don't fail on tracking errors
  }
}
```

**Validation**: Make AI call, check stats incremented

---

### T31E.3: Add Provider Health to /api/health

**File**: `src/app/api/health/route.ts`  
**Effort**: 15 min  
**Test**: Health includes AI summary

Add AI summary to existing health endpoint:

```typescript
// In health check response
const aiStatus = await getAISummary();

return NextResponse.json({
  status: "healthy",
  checks: {
    // ... existing checks
    ai: {
      gemini: { status: aiStatus.gemini.status },
      openai: { status: aiStatus.openai.status },
      preferredProvider: aiStatus.preferred,
      fallbacksToday: aiStatus.fallbacksToday,
    },
  },
});
```

**Validation**: Health endpoint shows AI status

---

## Summary: Full Task List

| ID     | Sprint     | Task                          | Effort | Test                     |
| ------ | ---------- | ----------------------------- | ------ | ------------------------ |
| T31A.1 | Actions    | Define Action Types           | 20 min | TS compiles              |
| T31A.2 | Actions    | Create Action Parser          | 30 min | Unit tests               |
| T31A.3 | Actions    | Action Parser Tests           | 25 min | Tests pass               |
| T31A.4 | Actions    | Update Chat for Actions       | 30 min | Curl test                |
| T31A.5 | Actions    | Action Confidence Scoring     | 15 min | Confidence returned      |
| T31B.1 | Dossiers   | Extend Dossier Interface      | 15 min | TS compiles              |
| T31B.2 | Dossiers   | Update Dossier Prompt         | 30 min | New fields present       |
| T31B.3 | Dossiers   | Enrich from People            | 25 min | Contacts in dossier      |
| T31B.4 | Dossiers   | Create Refresh Endpoint       | 20 min | Curl test                |
| T31B.5 | Dossiers   | Add Age Check                 | 15 min | Staleness returned       |
| T31C.1 | Memory     | Create Conversation Store     | 30 min | Store/retrieve works     |
| T31C.2 | Memory     | Conversation Tests            | 20 min | Tests pass               |
| T31C.3 | Memory     | Update Chat for Conversations | 30 min | Persists across requests |
| T31C.4 | Memory     | Conversation Endpoints        | 20 min | CRUD works               |
| T31C.5 | Memory     | Conversation Summary          | 20 min | Summary generated        |
| T31D.1 | Batch      | Create Batch Endpoint         | 30 min | Batch returns results    |
| T31D.2 | Batch      | Add Rate Limiting             | 20 min | Rate limit enforced      |
| T31D.3 | Batch      | Progress Tracking             | 20 min | Job ID for large batches |
| T31D.4 | Batch      | Batch Tests                   | 20 min | Tests pass               |
| T31E.1 | Monitoring | Create Status Endpoint        | 25 min | Returns provider status  |
| T31E.2 | Monitoring | Track Provider Usage          | 20 min | Stats increment          |
| T31E.3 | Monitoring | Add to Health                 | 15 min | Health shows AI          |

**Total Estimated Time**: ~8 hours

---

## Cross-Repo Integration Notes

### What GTM-YardFlow Gets

| Enhancement     | Endpoint                   | Frontend Benefit                       |
| --------------- | -------------------------- | -------------------------------------- |
| Brain Actions   | `/api/ai/chat`             | `action` field enables auto-navigation |
| Rich Dossiers   | `/api/ai/dossier/generate` | Talking points, outreach angles        |
| Conversations   | `/api/ai/chat`             | `conversationId` for multi-turn        |
| Batch Research  | `/api/ai/research/batch`   | Research 10 companies at once          |
| Provider Status | `/api/ai/status`           | Show AI health in UI                   |

### Frontend Changes Needed

1. **ChatPanel**: Handle `action` in response, execute via `useBrainActions`
2. **DossierPanel**: Display new fields (talkingPoints, outreachAngles)
3. **ChatPanel**: Pass `conversationId` for multi-turn
4. **BulkActions**: Use batch research endpoint
5. **StatusBar**: Show AI provider health

---

## Rollback Plan

### Per Sprint Rollback

| Sprint          | Rollback                               |
| --------------- | -------------------------------------- |
| S31A Actions    | Return empty `action` field            |
| S31B Dossiers   | Use existing prompt, ignore new fields |
| S31C Memory     | Disable Redis conversation store       |
| S31D Batch      | Disable endpoint, use single research  |
| S31E Monitoring | Remove from health response            |

### Feature Flags

```typescript
// src/lib/config.ts
export const FEATURE_FLAGS = {
  BRAIN_ACTIONS: process.env.BRAIN_ACTIONS_ENABLED !== "false",
  CONVERSATION_MEMORY: process.env.CONVERSATION_MEMORY_ENABLED !== "false",
  BATCH_RESEARCH: process.env.BATCH_RESEARCH_ENABLED !== "false",
};
```
