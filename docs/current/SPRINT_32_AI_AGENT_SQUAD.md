# Sprint 32: AI Agent Squad Implementation

**Duration**: 8-10 hours (480-600 minutes)  
**Goal**: Transform agent infrastructure from static modules into orchestrated workflow system with YardFlow content hub integration  
**Depends On**: Sprint 31 (Manifest integration), existing agent files in `src/lib/agents/`

## Context

Sprint 32 activates the AI Agent Squad vision outlined in `.github/copilot-instructions.md`. We have 9 agent files already created but they need:
1. **Database backing** - `agent_tasks` table for state persistence
2. **Workflow orchestration** - BullMQ job chains for multi-agent workflows
3. **Content hub integration** - Pull from https://flow-state-klbt.vercel.app/
4. **Testing & monitoring** - Observability for agent decision-making

## Architecture Changes

### Database Schema Addition
```prisma
model agent_tasks {
  id            String   @id @default(cuid())
  agent_type    String   // 'prospecting' | 'research' | 'sequence' | 'content' | 'graphics' | 'socials' | 'contracting'
  status        String   // 'pending' | 'in_progress' | 'completed' | 'failed'
  input_data    Json     // Agent-specific input parameters
  output_data   Json?    // Results from agent execution
  error_message String?
  account_id    String?  
  contact_id    String?
  parent_task_id String? // For chained workflows
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  completed_at  DateTime?
  
  target_account target_accounts? @relation(fields: [account_id], references: [id])
  contact        people?          @relation(fields: [contact_id], references: [id])
  
  @@index([agent_type, status])
  @@index([account_id])
  @@index([parent_task_id])
}
```

### YardFlow Content Hub API Client
```typescript
// src/lib/yardflow-content-hub.ts
interface ContentHubClient {
  getRoiCalculation(params: RoiParams): Promise<RoiData>;
  getCaseStudies(industry: string, companySize?: string): Promise<CaseStudy[]>;
  getBrandMessaging(persona: string): Promise<MessagingGuide>;
  getGraphics(assetType: string, filters?: object): Promise<GraphicAsset[]>;
  getSocialTemplates(platform: string): Promise<SocialTemplate[]>;
  getContractTemplates(dealType: string): Promise<ContractTemplate[]>;
}
```

### Agent Workflow Orchestration
```typescript
// src/lib/agents/orchestrator.ts enhancements
class AgentOrchestrator {
  // NEW: Multi-agent workflow definition
  async executeWorkflow(workflowType: string, input: any): Promise<WorkflowResult>;
  
  // NEW: Agent task state management
  async createAgentTask(agentType: string, input: any): Promise<AgentTask>;
  async updateAgentTaskStatus(taskId: string, status: string, output?: any): Promise<void>;
  
  // NEW: Workflow templates
  workflows = {
    'full_account_research': [
      'prospecting-agent',  // Find additional contacts
      'research-agent',     // Generate dossier
      'content-purposing-agent', // Pull relevant case studies
      'sequence-engineer-agent', // Build custom sequence
    ],
    'manifest_prep': [
      'research-agent',     // Company intel
      'content-purposing-agent', // Meeting talking points
      'graphics-agent',     // Booth materials
    ],
    'contract_preparation': [
      'research-agent',     // Deal context
      'contracting-agent',  // Generate SOW
    ],
  };
}
```

## Task Breakdown

### TASK 32.1: Agent State Management (120 min)
**Files**: 
- `eventops/prisma/schema.prisma` - Add `agent_tasks` model
- `eventops/src/lib/agents/state-manager.ts` - State persistence layer

**Implementation**:
1. Add `agent_tasks` table to Prisma schema
2. Create migration: `npx prisma migrate dev --name add_agent_tasks`
3. Implement `AgentStateManager` class:
   - `createTask(agentType, input, accountId?, contactId?)`
   - `updateTaskStatus(taskId, status, output?, error?)`
   - `getTaskHistory(accountId)` - All agent runs for an account
   - `getActiveWorkflows()` - Currently running multi-agent chains
4. Add BullMQ job completion hooks to update state
5. Unit tests for state transitions

**Acceptance Criteria**:
- Agent tasks persist across restarts
- Failed agents can be retried from last checkpoint
- Dashboard shows agent activity history

### TASK 32.2: YardFlow Content Hub Integration (90 min)
**Files**:
- `eventops/src/lib/yardflow-content-hub.ts` - API client
- `eventops/src/lib/agents/content-purposing-agent.ts` - Update to use hub

**Implementation**:
1. Create `YardFlowContentHubClient` with methods:
   - `getRoiCalculation()` - Fetch external ROI data
   - `getCaseStudies()` - Industry-filtered case studies
   - `getBrandMessaging()` - Persona-specific messaging guides
   - `getGraphics()` - Visual assets for campaigns
   - `getSocialTemplates()` - LinkedIn/Twitter templates
   - `getContractTemplates()` - SOW/proposal templates
2. Add caching layer (Redis, 24hr TTL) for content hub responses
3. Update `content-purposing-agent.ts` to pull from hub instead of static data
4. Fallback logic if hub unavailable (use local defaults)
5. Integration test with actual hub endpoint

**Acceptance Criteria**:
- Content hub data flows into agent outputs
- Case studies auto-inserted into sequences based on industry
- ROI calculations use external calculator when available

**Environment Variables**:
```bash
YARDFLOW_CONTENT_HUB_URL=https://flow-state-klbt.vercel.app
YARDFLOW_CONTENT_HUB_API_KEY=<optional_auth_token>
```

### TASK 32.3: Research Agent Enhancement (120 min)
**Files**:
- `eventops/src/lib/agents/research-agent.ts` - Enhance with multi-source research
- `eventops/src/lib/agents/__tests__/research-agent.test.ts` - Comprehensive tests

**Implementation**:
1. Multi-source research orchestration:
   - LinkedIn scraping (existing)
   - Website content extraction (new)
   - YardFlow content hub case studies (new)
   - Crunchbase/ZoomInfo API (future hook)
2. Structured dossier generation with sections:
   - Company Overview (size, industry, locations)
   - Key Executives (from LinkedIn + contacts table)
   - Recent News/Updates (web scraping)
   - Competitive Landscape (industry context)
   - Relevant Case Studies (from content hub)
   - Strategic Questions (for booth conversations)
3. Dossier storage in `target_accounts.ai_dossier` JSON field
4. Agent task tracking via `AgentStateManager`
5. Error handling for partial research failures

**Acceptance Criteria**:
- Dossiers include 5+ data sources
- Generation time < 60 seconds per company
- 90%+ success rate on major logistics companies
- Failed sources don't block dossier generation

### TASK 32.4: Sequence Engineer Agent (90 min)
**Files**:
- `eventops/src/lib/agents/sequence-engineer-agent.ts` - Build multi-step sequences
- `eventops/src/lib/outreach/sequence-templates.ts` - Template library

**Implementation**:
1. Sequence template library by use case:
   - `manifest_pre_event` - 3 emails + LinkedIn + Manifest request
   - `cold_outreach_exec` - 5 emails tailored for C-level
   - `warm_introduction` - 2 emails for mutual connections
   - `post_event_followup` - 2 emails + demo scheduling
2. Dynamic sequence generation based on:
   - ICP score (high = more aggressive cadence)
   - Persona (ExecOps vs Ops vs Procurement)
   - Data completeness (personalization level)
   - Event proximity (Manifest countdown)
3. Content hub integration:
   - Pull case studies for social proof
   - Insert ROI calculations in step 2
   - Use brand messaging for tone consistency
4. Auto-enrollment logic in `sequence-engine.ts`
5. A/B test framework for sequence variants

**Acceptance Criteria**:
- Generates sequences in < 10 seconds
- Content matches persona and use case
- Includes YardFlow brand assets from hub
- A/B testing enabled for step variations

### TASK 32.5: Workflow Orchestrator (90 min)
**Files**:
- `eventops/src/lib/agents/orchestrator.ts` - Multi-agent coordination
- `eventops/src/lib/queue/agent-workflows.ts` - BullMQ workflow jobs

**Implementation**:
1. Workflow definition DSL:
```typescript
const manifestPrepWorkflow = {
  name: 'manifest_prep',
  steps: [
    { agent: 'research-agent', input: { accountId } },
    { agent: 'content-purposing-agent', input: { accountId, useCase: 'manifest' } },
    { agent: 'sequence-engineer-agent', input: { accountId, template: 'manifest_pre_event' } },
    { agent: 'graphics-agent', input: { accountId, assetType: 'booth_materials' } },
  ],
  onFailure: 'continue', // or 'abort'
};
```
2. BullMQ job chains for step orchestration
3. Parallel agent execution where possible (research + graphics)
4. Workflow status API endpoint: `/api/agents/workflows/:workflowId`
5. Dashboard UI component to visualize workflow progress

**Acceptance Criteria**:
- Can execute 3+ predefined workflows
- Failures in one agent don't crash entire workflow
- Workflow status visible in dashboard
- Retry logic for transient failures

### TASK 32.6: Agent Monitoring & Observability (60 min)
**Files**:
- `eventops/src/app/api/agents/status/route.ts` - Agent health dashboard
- `eventops/src/lib/agents/telemetry.ts` - Agent execution metrics

**Implementation**:
1. Agent execution telemetry:
   - Success/failure rates per agent type
   - Average execution time
   - Token usage (for AI agents)
   - Error frequency by type
2. Dashboard API endpoint returning:
   - Active workflows
   - Recent task history
   - Agent performance metrics
   - Queue depth per agent type
3. Logging enhancements:
   - Structured JSON logs for agent decisions
   - Input/output samples for debugging
   - Decision reasoning (why agent chose X)
4. Alerting hooks for agent failures (future: Slack integration)

**Acceptance Criteria**:
- Dashboard shows real-time agent activity
- Can debug why agent made specific decision
- Performance metrics tracked per agent type

### TASK 32.7: Testing & Documentation (60 min)
**Files**:
- `eventops/src/lib/agents/__tests__/*.test.ts` - Comprehensive agent tests
- `docs/current/AGENT_SQUAD_GUIDE.md` - User documentation

**Implementation**:
1. Unit tests for each agent:
   - Mock external APIs (LinkedIn, content hub)
   - Test error handling paths
   - Validate output structure
2. Integration tests for workflows:
   - End-to-end workflow execution
   - Multi-agent coordination
   - State persistence
3. Documentation:
   - Agent capabilities reference
   - Workflow examples
   - How to add new agents
   - Troubleshooting guide
4. Example scripts in `scripts/test-agent-workflow.ts`

**Acceptance Criteria**:
- 80%+ test coverage on agent code
- All 7 agents have passing integration tests
- Documentation includes 5+ workflow examples

## Testing Strategy

### Local Development
```bash
cd eventops

# Run agent unit tests
npm test -- src/lib/agents/__tests__

# Test individual agent
npx tsx scripts/test-agent-workflow.ts --agent=research --accountId=acc_123

# Test full workflow
npx tsx scripts/test-agent-workflow.ts --workflow=manifest_prep --accountId=acc_123

# Check agent task history
npx prisma studio  # Browse agent_tasks table
```

### Production Validation
```bash
# Deploy with agent infrastructure
git commit -m "Sprint 32: AI Agent Squad"
git push origin main

# Verify agent endpoints
curl https://yardflow-hitlist-production.up.railway.app/api/agents/status

# Test research agent via API
curl -X POST https://yardflow-hitlist-production.up.railway.app/api/agents/research \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountId": "acc_xyz"}'

# Monitor agent task queue
railway run npx tsx scripts/check-agent-queue.ts
```

## Environment Variables

```bash
# Add to Railway web + worker services:
YARDFLOW_CONTENT_HUB_URL=https://flow-state-klbt.vercel.app
YARDFLOW_CONTENT_HUB_API_KEY=<optional_future_auth>
ENABLE_AGENT_WORKFLOWS=true
AGENT_MAX_RETRIES=3
AGENT_TIMEOUT_MS=120000  # 2 minutes per agent
```

## Deployment Checklist

- [ ] Create `agent_tasks` migration
- [ ] Deploy Prisma schema changes
- [ ] Seed content hub API credentials
- [ ] Deploy web service (agent API routes)
- [ ] Deploy worker service (agent job processors)
- [ ] Verify agent status endpoint
- [ ] Test research agent workflow
- [ ] Monitor agent task queue
- [ ] Check logs for agent execution errors
- [ ] Update dashboard to show agent activity

## Success Metrics

- **Agent Reliability**: 95%+ success rate per agent type
- **Workflow Completion**: 90%+ of multi-agent workflows complete successfully
- **Performance**: Average workflow completion < 5 minutes
- **Content Quality**: 85%+ of generated sequences include content hub data
- **Observability**: All agent decisions logged with reasoning

## Integration Points

- **Manifest Integration** (Sprint 31): Research agent generates strategic questions for booth conversations
- **Sequence Engine** (existing): Sequence engineer agent creates multi-step campaigns
- **Email Enrichment** (existing): Prospecting agent uses pattern detector to find contacts
- **ICP Scoring** (existing): High-score accounts trigger auto-research workflows
- **YardFlow Content Hub**: All agents pull brand assets, case studies, ROI data

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Content hub API downtime | Sequences lack personalization | Fallback to local content templates |
| Agent failures cascade | Workflows abort prematurely | `onFailure: 'continue'` mode for resilience |
| Slow AI API responses | User-facing timeouts | 120s timeout + async processing via BullMQ |
| Token usage explosion | High Gemini API costs | Rate limiting per agent type, caching |

## Future Enhancements (Post-Sprint 32)

1. **Agentic Decision-Making**: Agents choose next steps based on results (true autonomy)
2. **Human-in-the-Loop**: Review gates for high-value accounts before auto-enrollment
3. **Multi-Model Support**: GPT-4, Claude integration alongside Gemini
4. **Learning & Optimization**: Track which agent outputs lead to meetings/deals
5. **Voice of Customer Analysis**: Socials agent analyzes LinkedIn conversations for pain points
6. **Competitive Intelligence**: Research agent monitors competitor booth locations at Manifest

## Time Estimates

| Task | Estimated Time | Dependencies |
|------|---------------|--------------|
| 32.1 - Agent State Management | 120 min | Prisma schema |
| 32.2 - Content Hub Integration | 90 min | External API access |
| 32.3 - Research Agent Enhancement | 120 min | Task 32.1, 32.2 |
| 32.4 - Sequence Engineer Agent | 90 min | Task 32.2 |
| 32.5 - Workflow Orchestrator | 90 min | Task 32.1 |
| 32.6 - Agent Monitoring | 60 min | Task 32.1, 32.5 |
| 32.7 - Testing & Documentation | 60 min | All tasks |
| **Total** | **630 min (10.5 hours)** | |

## Sprint Completion Criteria

- [ ] All 7 agents operational with state persistence
- [ ] Content hub integration live with caching
- [ ] 3+ multi-agent workflows executable
- [ ] Agent status dashboard deployed
- [ ] 80%+ test coverage on agent code
- [ ] Documentation complete with examples
- [ ] Production deployment successful
- [ ] Zero regression in existing features
