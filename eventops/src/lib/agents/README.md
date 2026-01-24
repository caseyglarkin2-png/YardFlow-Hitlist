# AI Agent Squad - EventOps GTM Automation

This directory contains specialized AI agents that work together to automate the entire Go-To-Market function for Manifest 2026 and beyond.

## Agent Architecture

Each agent is a standalone workflow that communicates via BullMQ job chains. Agents pull content from the [YardFlow Content Hub](https://flow-state-klbt.vercel.app/) for brand consistency.

### Agent Communication Flow
```
Prospecting Agent → Research Agent → Sequence Engineer
                                    ↓
Content Purposing ← Graphics Agent ← Socials Agent
                                    ↓
                            Contracting Agent
```

## Agents

### 1. Prospecting Agent (`prospecting-agent.ts`)
**Purpose**: Auto-discover and qualify leads from event attendee lists, web scraping  
**Inputs**: Event URLs, industry keywords, ICP criteria  
**Outputs**: Qualified leads with initial scoring  
**Status**: 🚧 Planned

### 2. Research Agent (`research-agent.ts`)
**Purpose**: Generate comprehensive company dossiers and competitive intelligence  
**Inputs**: Company domain, LinkedIn profile  
**Outputs**: Company overview, facility count, pain points, ROI opportunities  
**Status**: ✅ Partial (manual trigger via `/api/accounts/[id]/research`)

### 3. Sequence Engineer (`sequence-engineer-agent.ts`)
**Purpose**: Build multi-step, multi-channel campaigns based on persona/ICP score  
**Inputs**: Contact persona, ICP score, company dossier  
**Outputs**: Personalized sequence with optimal timing and channels  
**Status**: 🚧 Planned

### 4. Content Purposing Agent (`content-purposing-agent.ts`)
**Purpose**: Adapt YardFlow marketing assets to outreach campaigns  
**Inputs**: Persona, industry, campaign goal  
**Outputs**: Customized case studies, ROI calculators, email copy  
**Status**: 🚧 Planned

### 5. Graphics Agent (`graphics-agent.ts`)
**Purpose**: Generate visual content for social and email campaigns  
**Inputs**: Campaign theme, brand guidelines, target persona  
**Outputs**: Social graphics, email headers, presentation slides  
**Status**: 🚧 Planned

### 6. Socials Agent (`socials-agent.ts`)
**Purpose**: Coordinate LinkedIn/Twitter engagement and content distribution  
**Inputs**: Campaign content, target accounts, timing preferences  
**Outputs**: Scheduled social posts, engagement tracking  
**Status**: 🚧 Planned

### 7. Contracting Agent (`contracting-agent.ts`)
**Purpose**: Generate deal documentation, SOWs, legal templates  
**Inputs**: Deal terms, company details, pricing tier  
**Outputs**: Contract PDFs, SOW documents, MSA templates  
**Status**: 🚧 Planned

## Usage

### Running Individual Agents
```typescript
import { ProspectingAgent } from '@/lib/agents/prospecting-agent';

const agent = new ProspectingAgent();
const leads = await agent.discoverLeads({
  eventUrl: 'https://matchmaking.grip.events/manifestvegas2026/app',
  icpCriteria: { minScore: 70, personas: ['ExecOps', 'Ops'] }
});
```

### Orchestrated Workflow
```typescript
import { AgentOrchestrator } from '@/lib/agents/orchestrator';

const orchestrator = new AgentOrchestrator();
await orchestrator.runFullCampaign({
  eventId: 'manifest-2026',
  targetAccounts: ['account-1', 'account-2'],
  campaignType: 'booth-outreach'
});
```

## Job Queue Integration

Agents use BullMQ for asynchronous processing:
- **Queue**: `agent-tasks` (to be created)
- **Worker**: Runs in separate process alongside existing worker
- **State**: Tracked in `agent_tasks` table (to be created)

## Content Hub Integration

All agents pull from YardFlow marketing site:
- **ROI Calculators**: `https://flow-state-klbt.vercel.app/api/roi/calculate`
- **Case Studies**: `https://flow-state-klbt.vercel.app/api/case-studies`
- **Brand Messaging**: `https://flow-state-klbt.vercel.app/api/messaging/{persona}`
- **Graphics**: `https://flow-state-klbt.vercel.app/api/assets/{type}`

## Database Schema (Planned)

```sql
CREATE TABLE agent_tasks (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,
  status TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  error TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE agent_workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tasks TEXT[] NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Development Workflow

1. **Create Agent**: Implement interface in `{name}-agent.ts`
2. **Add Tests**: Create `__tests__/{name}-agent.test.ts`
3. **Register**: Add to orchestrator task registry
4. **Deploy**: Agents run in worker process, no separate deployment needed

## Future Enhancements

- **Agent Memory**: Store context between runs for learning
- **Feedback Loop**: Human-in-the-loop approvals for critical decisions
- **A/B Testing**: Agents can run experiments on message variants
- **Performance Tracking**: ROI attribution per agent contribution
