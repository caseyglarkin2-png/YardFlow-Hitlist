# Sprint 32: Railway ↔ GTM-YardFlow Alignment

**Date**: February 4, 2026  
**Status**: ✅ COMPLETE  
**Completed**: February 4, 2026  
**Goal**: Ensure Railway backend API responses match exactly what GTM-YardFlow frontend expects  
**North Star**: "Zero translation layer - frontend can consume Railway responses directly"

---

## ✅ Completion Summary

### Railway Build Status
- **Build**: ✅ Passing (commit `5d62eb2`)
- **Deploy**: ✅ Live at `yardflow-hitlist-production-2f41.up.railway.app`
- **Tests**: 123 passing, 0 failing
- **Lint**: 0 errors

### Alignment Verification (Subagent Review)
All 17 frontend-expected fields are now properly aligned:

| Category | Fields | Status |
|----------|--------|--------|
| Core | `description`, `website` | ✅ Aligned |
| Profile | `facilityCount`, `industryCategory`, `distributionFootprint`, `headquarters`, `revenueEstimate`, `isYardIntensive` | ✅ Aligned |
| Arrays | `yardPainPoints`, `talkingPoints`, `competitors`, `decisionMakers` | ✅ Aligned |
| Metadata | `confidence.overall`, `researchedAt`, `sources`, `error` | ✅ Aligned |
| Chat | `action`, `confidence`, `conversationId`, `suggestions` | ✅ Aligned |

### Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/types/dossier-response.ts` | ✅ Created | Frontend-compatible types |
| `src/lib/ai/dossier-transformer.ts` | ✅ Created | Response transformation |
| `src/lib/ai/dossier-generator.ts` | ✅ Modified | Updated prompt for all fields |
| `src/app/api/ai/dossier/generate/route.ts` | ✅ Modified | Uses transformer |
| `src/app/api/ai/dossier/refresh/route.ts` | ✅ Created | Force refresh endpoint |
| `tests/ai/dossier-transformer.test.ts` | ✅ Created | 12 transformer tests |
| `src/types/brain-actions.ts` | ✅ Fixed | Type alias instead of empty interface |

---

## Gap Analysis: DossierPanel vs Railway Dossier Generator

### GTM-YardFlow DossierPanel Expects (from `ResearchedCompanyData`):

```typescript
interface ResearchedCompanyData {
  // Core fields
  description: string;
  website: string;
  
  // Company profile grid
  facilityCount: string;              // e.g., "12 facilities"
  industryCategory: string;           // e.g., "Logistics & Distribution"
  distributionFootprint: string;      // e.g., "National"
  headquarters: string;               // e.g., "Dallas, TX"
  revenueEstimate: string;            // e.g., "$50M-100M"
  isYardIntensive: boolean;           // true/false
  
  // Rich content arrays
  yardPainPoints: string[];           // Pain points specific to yard management
  talkingPoints: string[];            // Conversation starters
  competitors: string[];              // Competitor company names
  decisionMakers: string[];           // Target titles to find
}

interface CompanyResearchResult {
  success: boolean;
  data: ResearchedCompanyData | null;
  confidence?: {
    overall: 'high' | 'medium' | 'low';
  };
  researchedAt: string;               // ISO date
  sources?: string[];                 // Source URLs/names
  error?: string;
}
```

### Railway DossierGenerationResult Returns:

```typescript
interface DossierGenerationResult {
  accountId: string;
  companyName: string;
  success: boolean;
  dossier?: {
    companyOverview: string;          // ✅ → description
    industryContext: string;          // ⚠️ Different from industryCategory
    keyPainPoints: string[];          // ⚠️ Generic, not yard-specific
    techStack?: string[];             // ❌ Not used by frontend
    companySize?: string;             // ⚠️ Different from revenueEstimate
    facilityIntelligence?: {          // ⚠️ Nested, frontend expects flat
      estimatedYardCount: number;     // ⚠️ Number, not string
      confidenceLevel: string;
      reasoning: string;
      networkBreakdown: {...};
      operationalScale: string;       // ✅ → distributionFootprint
    };
    strategicQuestions?: string[];    // ❌ Not used by frontend
    manifestOpportunities?: string[]; // ❌ Not used by frontend
    talkingPoints?: string[];         // ✅ Matches
    competitors?: string[];           // ✅ Matches
    outreachAngles?: string[];        // ❌ Not used by frontend
    manifestContext?: string;         // ❌ Not used by frontend
  };
  error?: string;
  tokensUsed?: number;
}
```

### Field Mapping Table

| GTM-YardFlow Field | Railway Field | Status | Action |
|-------------------|---------------|--------|--------|
| `description` | `companyOverview` | ⚠️ Rename | Map in response |
| `website` | (from account) | ❌ Missing | Include from account |
| `facilityCount` | `facilityIntelligence.estimatedYardCount` | ⚠️ Transform | Convert number to string |
| `industryCategory` | `industryContext` | ⚠️ Extract | Parse category from context |
| `distributionFootprint` | `facilityIntelligence.operationalScale` | ⚠️ Nested | Flatten |
| `headquarters` | (from account) | ❌ Missing | Include from account |
| `revenueEstimate` | `companySize` | ⚠️ Different | Generate both |
| `isYardIntensive` | (compute) | ❌ Missing | Add to prompt |
| `yardPainPoints` | `keyPainPoints` | ⚠️ Generic | Make yard-specific |
| `talkingPoints` | `talkingPoints` | ✅ Match | Keep |
| `competitors` | `competitors` | ✅ Match | Keep |
| `decisionMakers` | (missing) | ❌ Missing | Add to prompt |
| `confidence.overall` | `facilityIntelligence.confidenceLevel` | ⚠️ Transform | Map to enum |
| `researchedAt` | (missing) | ❌ Missing | Add timestamp |
| `sources` | (missing) | ❌ Missing | Add to prompt |

---

## Sprint 32 Tasks

### Phase 1: Response Format Alignment (2 hours)

#### T32.1: Create Frontend-Compatible Response Interface
**File**: `src/types/dossier-response.ts` (NEW)  
**Effort**: 15 min  
**Validation**: TypeScript compiles

```typescript
// Create interface matching exactly what GTM-YardFlow expects
export interface FrontendDossierResponse {
  success: boolean;
  data: {
    description: string;
    website: string;
    facilityCount: string;
    industryCategory: string;
    distributionFootprint: string;
    headquarters: string;
    revenueEstimate: string;
    isYardIntensive: boolean;
    yardPainPoints: string[];
    talkingPoints: string[];
    competitors: string[];
    decisionMakers: string[];
  } | null;
  confidence?: {
    overall: 'high' | 'medium' | 'low';
  };
  researchedAt: string;
  sources?: string[];
  error?: string;
}
```

**Commit**: `feat(types): add frontend-compatible dossier response interface`

---

#### T32.2: Update Dossier Generator Prompt
**File**: `src/lib/ai/dossier-generator.ts`  
**Effort**: 30 min  
**Validation**: Generated dossier includes all required fields

Update prompt to request ALL fields the frontend needs:
- `isYardIntensive: boolean`
- `yardPainPoints: string[]` (not generic keyPainPoints)
- `decisionMakers: string[]`
- `revenueEstimate: string`
- `industryCategory: string` (single category, not context)
- `sources: string[]`

**Commit**: `feat(ai): update dossier prompt for frontend compatibility`

---

#### T32.3: Create Response Transformer
**File**: `src/lib/ai/dossier-transformer.ts` (NEW)  
**Effort**: 30 min  
**Validation**: Unit tests pass

```typescript
export function transformToFrontendFormat(
  result: DossierGenerationResult,
  account: { website?: string; headquarters?: string }
): FrontendDossierResponse {
  // Transform Railway format → Frontend format
}
```

**Commit**: `feat(ai): add dossier response transformer for frontend compatibility`

---

#### T32.4: Transformer Unit Tests
**File**: `tests/ai/dossier-transformer.test.ts` (NEW)  
**Effort**: 25 min  
**Validation**: `npm test tests/ai/dossier-transformer.test.ts` passes

Test cases:
- Transforms successful dossier correctly
- Handles missing optional fields
- Maps confidence levels correctly
- Includes account data (website, HQ)
- Formats facilityCount as string

**Commit**: `test(ai): add dossier transformer unit tests`

---

#### T32.5: Update Dossier Generate Endpoint
**File**: `src/app/api/ai/dossier/generate/route.ts`  
**Effort**: 20 min  
**Validation**: Curl returns frontend-compatible format

Update endpoint to:
1. Generate dossier
2. Transform to frontend format
3. Return `FrontendDossierResponse`

**Commit**: `feat(api): return frontend-compatible dossier format`

---

### Phase 2: Chat Response Alignment (1 hour)

#### T32.6: Verify Chat Response Format
**File**: `src/app/api/ai/chat/route.ts`  
**Effort**: 15 min  
**Validation**: Response includes all expected fields

Verify response includes:
```typescript
{
  response: string;           // ✅ Already present
  action?: BrainAction;       // ✅ Already present
  confidence?: number;        // ✅ Already present
  conversationId?: string;    // ✅ Already present
  suggestions?: string[];     // ✅ Already present
  metadata?: {
    provider?: string;        // ✅ Already present
    fallbackUsed?: boolean;   // ✅ Already present
  }
}
```

**Commit**: `docs: verify chat response format alignment`

---

#### T32.7: Add BrainAction Type Export
**File**: `src/types/brain-actions.ts`  
**Effort**: 10 min  
**Validation**: Types can be imported by frontend

Ensure `RailwayAIAction` interface is exported for frontend mapping:
```typescript
export type RailwayAIAction = BrainAction;
```

**Commit**: `feat(types): export RailwayAIAction for frontend consumption`

---

### Phase 3: Content Generate Alignment (1 hour)

#### T32.8: Verify Content Generate Response
**File**: `src/app/api/ai/content/generate/route.ts`  
**Effort**: 20 min  
**Validation**: Response matches frontend expectations

Frontend expects:
```typescript
{
  content: string;      // Email body
  subject: string;      // Email subject
  provider: string;     // Which AI provider
}
```

**Commit**: `feat(api): verify content generate response format`

---

#### T32.9: Add Error Response Standardization
**File**: `src/lib/api-response.ts` (NEW)  
**Effort**: 20 min  
**Validation**: All AI endpoints return consistent errors

```typescript
export interface APIErrorResponse {
  error: string;
  details?: string;
  code?: string;
  retryAfter?: number;  // For rate limits
}
```

**Commit**: `feat(lib): add standardized API error response helper`

---

### Phase 4: Integration Testing (1 hour)

#### T32.10: End-to-End Dossier Flow Test
**File**: `tests/integration/dossier-flow.test.ts` (NEW)  
**Effort**: 30 min  
**Validation**: Test passes

Test flow:
1. POST `/api/ai/dossier/generate` with valid accountId
2. Verify response has all FrontendDossierResponse fields
3. Verify data types match (string, boolean, arrays)

**Commit**: `test(integration): add end-to-end dossier flow test`

---

#### T32.11: End-to-End Chat Action Test
**File**: `tests/integration/chat-action-flow.test.ts` (NEW)  
**Effort**: 30 min  
**Validation**: Test passes

Test flow:
1. POST `/api/ai/chat` with navigation request
2. Verify response includes `action` with correct type
3. Verify `conversationId` returned for stateful chat

**Commit**: `test(integration): add end-to-end chat action flow test`

---

### Phase 5: Railway Build Verification (30 min)

#### T32.12: Local Build Verification
**Command**: `npm run build`  
**Effort**: 15 min  
**Validation**: Build completes without errors

If OOM, use: `NODE_OPTIONS='--max-old-space-size=4096' npm run build`

**Commit**: N/A (verification only)

---

#### T32.13: Push and Monitor Railway Deploy
**Command**: `git push origin main`  
**Effort**: 15 min  
**Validation**: Railway build succeeds, endpoints respond

Verify:
1. Build log shows success
2. `/api/health` returns healthy
3. `/api/ai/status` returns provider stats

**Commit**: N/A (deployment verification)

---

## Success Criteria

| Criteria | Target | Validation |
|----------|--------|------------|
| Railway build succeeds | Green | Railway dashboard |
| Dossier format matches frontend | 100% | Unit tests |
| Chat returns actions | ✅ | Integration test |
| All 100+ tests pass | 100% | `npm test` |
| No type errors | 0 | `npm run lint` |

---

## Rollback Plan

If Railway build fails:
1. Check build logs for specific error
2. Run `npm run lint` locally to catch type errors
3. Fix and push again

If frontend integration fails:
1. Compare response formats with curl
2. Check field names case-sensitivity
3. Verify JSON structure matches interface

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types/dossier-response.ts` | CREATE | Frontend-compatible types |
| `src/lib/ai/dossier-transformer.ts` | CREATE | Response transformation |
| `src/lib/ai/dossier-generator.ts` | MODIFY | Update prompt for all fields |
| `src/app/api/ai/dossier/generate/route.ts` | MODIFY | Use transformer |
| `tests/ai/dossier-transformer.test.ts` | CREATE | Transformer tests |
| `tests/integration/dossier-flow.test.ts` | CREATE | E2E dossier test |

---

## Cross-Repo Coordination

### What GTM-YardFlow Needs After Sprint 32

1. **No changes needed** - Railway will return exactly what DossierPanel expects
2. **Remove translation layer** - `mapRailwayAction()` can use response directly
3. **Verify caching** - Firestore cache should work with new format

### What Railway Provides

| Endpoint | Response Format | Status |
|----------|----------------|--------|
| `POST /api/ai/dossier/generate` | `FrontendDossierResponse` | 🔄 Sprint 32 |
| `POST /api/ai/chat` | `BrainResponse` | ✅ Done |
| `POST /api/ai/content/generate` | `{ content, subject, provider }` | ✅ Done |

