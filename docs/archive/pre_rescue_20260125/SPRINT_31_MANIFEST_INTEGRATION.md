# Sprint 31: Manifest Intelligence

**Goal**: Turn raw seeded data into actionable booth intelligence for Manifest 2026.
**Timeline**: Jan 25 - Jan 28, 2026
**Production URL**: [https://yardflow-web-production.up.railway.app](https://yardflow-web-production.up.railway.app)

## 📋 Execution Plan (Atomic Tasks)

### 31.1: Schema Expansion (Est: 45 min)
*   **Context**: Need to store logistics-specific data points for ROI calc.
*   **Changes**:
    *   Update `schema.prisma`: Add `booth_number` (String?), `warehouse_count` (Int?), `facility_locations` (String[]).
    *   Run `npx prisma migrate dev`.
*   **Validation**: 
    *   `scripts/verify-db-schema.ts` (Check fields exist in Prisma client).

### 31.2: Meeting Request Logic & Prompt (Est: 90 min)
*   **Context**: Core agent feature. Generating 250-char pitch.
*   **Changes**:
    *   Create `src/lib/ai/meeting-request.ts`.
    *   Implement `generateMeetingRequest(company, location)`.
    *   Strict prompt engineering for character limits.
*   **Validation**:
    *   `tests/ai/prompts.test.ts` (Run 10 examples, assert length < 280).

### 31.3: Request Generation Worker (Est: 90 min)
*   **Context**: Background processing to avoid timeout on batch ops.
*   **Changes**:
    *   Create `manifest-request-job` in BullMQ configuration.
    *   Implement worker processor handling the AI call and DB update.
    *   Add rate limiting (Gemini free tier protection).
*   **Validation**:
    *   Script: Enqueue 5 jobs -> Poll DB until `notes` field updates.

### 31.4: Sync UI Integration (Est: 60 min)
*   **Context**: Frontend trigger for the worker.
*   **Changes**:
    *   API: `POST /api/manifest/generate-batch` (Accepts IDs).
    *   UI: Connect "Sync Requests" button.
    *   UI: Add loading state/toast notifications.
*   **Validation**:
    *   Manual: Select 3 rows -> Click Sync -> Verify toast -> Verify DB update.

### 31.5: Mobile "Booth Mode" View (Est: 120 min)
*   **Context**: Walking the floor needs a different view than desktop dashboard.
*   **Changes**:
    *   New route `/dashboard/booth`.
    *   Card-based UI: Large Company Name, Booth #, "One-Liner".
    *   Search/Filter by "Next to me".
*   **Validation**:
    *   Mobile viewport smoke test.
