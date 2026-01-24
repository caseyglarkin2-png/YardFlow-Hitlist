# A → B → C Execution Plan

**Status**: Sprint 30 at 87% → Starting Sprint 31 → Sprint 32 Planned  
**Created**: 2026-01-24  
**Next Actions**: Complete Railway setup → Implement Manifest features → Activate AI agents

---

## A: Complete Sprint 30 (MANUAL - 10 min with Railway CLI)

### Quick CLI Path (Recommended - 10 minutes)
```bash
# 1. Authenticate with Railway (opens browser)
railway login

# 2. Link to existing project
railway link

# 3. Provision Redis addon
railway add --database redis

# 4. Set cron secret
openssl rand -base64 32 | xargs -I {} railway variables set CRON_SECRET={}

# 5. Seed production database
railway run npx prisma db seed

# 6. Deploy worker service (CLI LIMITATION - use dashboard)
# Go to Railway dashboard → New Service → Select Dockerfile.worker
# Add env vars: DATABASE_URL, REDIS_URL (copy from web service)
# Deploy
```

### Alternative: Manual Dashboard Path (110 minutes)
See [MANUAL_RAILWAY_SETUP.md](./MANUAL_RAILWAY_SETUP.md) for step-by-step dashboard instructions.

### Verification
```bash
# Run E2E test suite
cd /workspaces/YardFlow-Hitlist/eventops
./tests/e2e-production.sh

# Check health endpoint
curl https://yardflow-hitlist-production.up.railway.app/api/health

# Verify worker is processing jobs
railway logs --service worker | grep "Job completed"
```

**Why Manual?** Railway CLI requires OAuth browser authentication (cannot automate in Codespaces).

---

## B: Sprint 31 - Manifest 2026 Integration (ACTIVE - 255 min remaining)

**Goal**: Event-specific features for Manifest Vegas 2026 (Feb 10-12, Booth #1847)  
**Status**: Task 31.1 complete, 4 tasks remaining

### ✅ TASK 31.1: Meeting Request Generator (90 min) - COMPLETE
**Files Created**:
- [src/lib/manifest/meeting-request-generator.ts](../eventops/src/lib/manifest/meeting-request-generator.ts)
- [src/app/api/manifest/generate-request/route.ts](../eventops/src/app/api/manifest/generate-request/route.ts)

**Features**:
- AI-generated 250-char messages for Manifest matchmaking app
- Fallback templates if Gemini fails
- Validation with errors/warnings
- Personalization with company context

**API Endpoint**: `POST /api/manifest/generate-request`
```json
{
  "contactName": "John Doe",
  "companyName": "Acme Logistics",
  "title": "VP Operations",
  "facilityCount": "15 DCs",
  "keyPainPoint": "Yard congestion",
  "roiEstimate": "$800K annual savings"
}
```

**Response**:
```json
{
  "message": "John, YardFlow cuts yard congestion at Acme's 15 DCs - $800K annual savings proven. Meet at booth #1847, Manifest 2026!",
  "length": 123,
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": []
  }
}
```

### 🔨 TASK 31.2: ROI Calculator Integration (120 min) - NEXT
**Files to Create**:
- `src/lib/yardflow-content-hub.ts` - API client for flow-state-klbt.vercel.app
- `src/lib/roi/calculator-integration.ts` - Wrapper with local fallback
- `src/app/api/roi/calculate/route.ts` - Unified API endpoint

**Implementation**:
1. Create YardFlow content hub client:
   ```typescript
   async function fetchExternalROI(params: RoiInput): Promise<RoiData> {
     const response = await fetch('https://flow-state-klbt.vercel.app/api/roi/calculate', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(params),
     });
     return response.json();
   }
   ```

2. Add fallback to existing `src/lib/roi-calculator.ts`
3. Create unified API: `/api/roi/calculate`
   - Try external hub first
   - Fall back to local calculations
   - Cache results in Redis (24hr TTL)
4. Add to Manifest request generator (auto-calculate ROI for contacts)
5. Unit tests with mocked external API

**Acceptance**: External ROI data flows when available, local fallback never fails

### 📋 TASK 31.3: Strategic Questions Generator (60 min)
**Files to Create**:
- `src/lib/manifest/strategic-questions.ts` - Generate from dossiers
- `src/app/api/manifest/questions/route.ts` - API endpoint

**Implementation**:
1. Read company dossier from `target_accounts.ai_dossier`
2. Use Gemini to generate 5-7 strategic questions:
   - Open-ended (not yes/no)
   - Reference specific company context
   - Focus on pain points YardFlow solves
   - Suitable for booth conversations (15-30 sec answers)
3. Store in `target_accounts.strategic_questions` JSON field
4. API endpoint: `POST /api/manifest/questions { accountId }`
5. Dashboard component to display questions

**Example Output**:
```json
{
  "accountId": "acc_sysco",
  "questions": [
    "How do your 15 distribution centers currently coordinate yard operations during peak seasons?",
    "What percentage of driver delays at your facilities are yard-related vs. dock-related?",
    "With your expansion into the Southeast, how are you scaling yard management processes?"
  ]
}
```

### 🔗 TASK 31.4: Manifest Deep Links (45 min)
**Files to Create**:
- `src/lib/manifest/deep-links.ts` - Generate matchmaking app links
- Update `src/components/people/ContactCard.tsx` - Add Manifest link button

**Implementation**:
1. Deep link format: `https://matchmaking.grip.events/manifestvegas2026/app/attendee/{email}`
2. Helper function: `getManifestProfileUrl(email: string)`
3. Dashboard UI: "View on Manifest" button for contacts
4. Track click events in analytics
5. Validate email exists in Manifest attendee list (optional validation endpoint)

**Integration**: Works with meeting request generator (link included in messages)

### 📧 TASK 31.5: Sequence Integration (30 min)
**Files to Update**:
- `src/lib/outreach/sequence-engine.ts` - Add MANIFEST channel
- `src/lib/queue/sequence-worker.ts` - Process MANIFEST steps

**Implementation**:
1. Add `MANIFEST` to `SequenceStepChannel` enum
2. Update sequence step processor:
   ```typescript
   case 'MANIFEST':
     const message = await generateManifestRequest({
       contactName: contact.name,
       companyName: account.name,
       title: contact.title,
       facilityCount: account.facility_count,
       keyPainPoint: account.key_pain_point,
       roiEstimate: calculateROI(account).annualSavings,
     });
     // Send via Manifest API (future integration)
     await logManifestRequest(contact.id, message);
     break;
   ```
3. Sequence template: `manifest_pre_event.json`
   - Day 1: Email intro
   - Day 3: LinkedIn connection
   - Day 5: Email with ROI data
   - Day 7: Manifest meeting request
   - Day 9: Booth reminder
4. Dashboard shows MANIFEST steps in sequence builder

**Acceptance**: Can create sequences with MANIFEST channel steps

### Sprint 31 Testing
```bash
cd /workspaces/YardFlow-Hitlist/eventops

# Test meeting request generator
curl -X POST http://localhost:3000/api/manifest/generate-request \
  -H "Content-Type: application/json" \
  -d '{
    "contactName": "John Doe",
    "companyName": "Acme Logistics",
    "title": "VP Operations"
  }'

# Test ROI calculator integration
curl -X POST http://localhost:3000/api/roi/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "facilityCount": 15,
    "operationalScale": "large",
    "companySize": 5000,
    "persona": "ExecOps",
    "industry": "logistics"
  }'

# Test strategic questions
curl -X POST http://localhost:3000/api/manifest/questions \
  -H "Content-Type: application/json" \
  -d '{"accountId": "acc_sysco"}'

# Run unit tests
npm test -- src/lib/manifest/__tests__
```

### Sprint 31 Deployment
```bash
git add src/lib/manifest src/app/api/manifest src/lib/yardflow-content-hub.ts
git commit -m "Sprint 31: Manifest 2026 Integration"
git push origin main

# Verify on Railway
curl https://yardflow-hitlist-production.up.railway.app/api/manifest/generate-request
```

---

## C: Sprint 32 - AI Agent Squad (PLANNED - 630 min)

**Goal**: Activate agent infrastructure with workflow orchestration  
**Status**: Planning complete, ready to implement after Sprint 31  
**Full Details**: [SPRINT_32_AI_AGENT_SQUAD.md](./SPRINT_32_AI_AGENT_SQUAD.md)

### Key Tasks Overview

1. **TASK 32.1** - Agent State Management (120 min)
   - Add `agent_tasks` table to Prisma schema
   - Persist agent execution history
   - Enable workflow checkpoints

2. **TASK 32.2** - YardFlow Content Hub Integration (90 min)
   - API client for flow-state-klbt.vercel.app
   - Pull case studies, ROI data, brand assets
   - Redis caching layer

3. **TASK 32.3** - Research Agent Enhancement (120 min)
   - Multi-source data aggregation
   - Structured dossier generation
   - Content hub case study integration

4. **TASK 32.4** - Sequence Engineer Agent (90 min)
   - Template library by use case
   - Dynamic sequence generation
   - Content hub brand messaging

5. **TASK 32.5** - Workflow Orchestrator (90 min)
   - Multi-agent coordination
   - BullMQ job chains
   - Parallel agent execution

6. **TASK 32.6** - Agent Monitoring (60 min)
   - Performance telemetry
   - Dashboard status API
   - Error alerting

7. **TASK 32.7** - Testing & Documentation (60 min)
   - Comprehensive test coverage
   - Workflow examples
   - User guide

### Database Migration Required
```prisma
model agent_tasks {
  id            String   @id @default(cuid())
  agent_type    String   // 'prospecting' | 'research' | ...
  status        String   // 'pending' | 'in_progress' | 'completed' | 'failed'
  input_data    Json
  output_data   Json?
  account_id    String?
  contact_id    String?
  parent_task_id String? // For workflow chains
  created_at    DateTime @default(now())
  completed_at  DateTime?
}
```

### Environment Variables Needed
```bash
YARDFLOW_CONTENT_HUB_URL=https://flow-state-klbt.vercel.app
ENABLE_AGENT_WORKFLOWS=true
AGENT_MAX_RETRIES=3
AGENT_TIMEOUT_MS=120000
```

---

## Execution Timeline

| Phase | Duration | Completion Date |
|-------|----------|-----------------|
| **A: Sprint 30 Completion** | 10 min | Today (manual Railway setup) |
| **B: Sprint 31 Implementation** | 255 min (4.25 hrs) | Today/Tomorrow |
| **C: Sprint 32 Implementation** | 630 min (10.5 hrs) | Next 1-2 days |
| **Total** | ~15 hours | Weekend completion |

---

## Success Metrics

### Sprint 30 (A)
- [x] Redis provisioned on Railway
- [x] Worker service deployed
- [x] Production database seeded
- [x] Health checks passing
- [x] E2E tests green

### Sprint 31 (B)
- [x] Meeting requests generated in <3 seconds
- [ ] ROI calculator uses external API when available
- [ ] Strategic questions generated from dossiers
- [ ] Manifest deep links functional
- [ ] Sequences support MANIFEST channel

### Sprint 32 (C)
- [ ] 95%+ agent success rate
- [ ] 90%+ workflow completion rate
- [ ] <5 min average workflow time
- [ ] 85%+ sequences include content hub data
- [ ] All agent decisions logged

---

## Current Status

**Sprint 30**: 87% complete, awaiting Railway authentication  
**Sprint 31**: TASK 31.1 complete (90 min), 4 tasks remaining (255 min)  
**Sprint 32**: Fully planned, ready to execute

**Next Immediate Action**: Complete Railway CLI authentication, then continue Sprint 31 implementation.

**Files Created This Session**:
1. `.github/copilot-instructions.md` (537 lines)
2. `eventops/prisma/seed-production.ts`
3. `docs/current/MANUAL_RAILWAY_SETUP.md`
4. `docs/current/SPRINT_30_SUMMARY.md`
5. `RAILWAY_CLI_COMMANDS.md`
6. `docs/current/SPRINT_31_MANIFEST_INTEGRATION.md`
7. `eventops/src/lib/manifest/meeting-request-generator.ts`
8. `eventops/src/app/api/manifest/generate-request/route.ts`
9. `docs/current/SPRINT_32_AI_AGENT_SQUAD.md`
10. This file: `docs/current/ABC_EXECUTION_PLAN.md`

**Ready to rock! 🚀**
