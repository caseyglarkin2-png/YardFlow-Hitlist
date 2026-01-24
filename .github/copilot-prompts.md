# Copilot Prompts - YardFlow Hitlist

Common prompts for AI pair programming. Use with `@workspace` or file references for best results.

---

## Development Workflow

### Create New Feature
```
Create a new [feature name] following these patterns:
1. API route in app/api/[domain]/[action]/route.ts
2. Protected with NextAuth session check
3. Uses @/lib/db for Prisma access
4. Includes structured logging
5. Returns paginated results if applicable
6. Add corresponding test file

Reference: [similar feature file path]
```

### Add Database Model
```
Add a new Prisma model for [entity]:
1. Update schema.prisma with proper relations
2. Create migration: npx prisma migrate dev --name add_[entity]
3. Generate types: npx prisma generate
4. Update seed.ts with sample data
5. Add CRUD API routes in app/api/[entity]/route.ts

Fields needed: [list fields]
Relations: [list relations]
```

### Create Agent
```
Implement [agent name] following the agent architecture in src/lib/agents/:
1. Create [name]-agent.ts with proper interfaces
2. Integrate with YardFlow content hub (https://flow-state-klbt.vercel.app/)
3. Add to orchestrator.ts task registry
4. Include error handling and logging
5. Create __tests__/[name]-agent.test.ts

Purpose: [what the agent does]
Inputs: [what it takes]
Outputs: [what it produces]
```

---

## Debugging & Troubleshooting

### Debug Production Issue
```
Debug this production issue:
Symptom: [describe the issue]

Check in order:
1. /api/health endpoint status
2. Railway logs (web + worker)
3. Database connectivity
4. Redis connection (if queue-related)
5. Environment variables

Provide:
- Root cause analysis
- Fix with file paths
- Prevention strategy
```

### Fix Build Failure
```
Railway build is failing with: [error message]

Analyze:
1. Check for module-level connections (Redis, Prisma)
2. Verify Prisma generate in build command
3. Check Railway build logs for timeout
4. Review recent changes to dependencies

Provide fix with explanation of why it failed.
```

### Database Query Optimization
```
Optimize this Prisma query for performance:
[paste query]

Consider:
1. Using select instead of include where possible
2. Avoiding N+1 queries
3. Adding database indexes if needed
4. Using cursor-based pagination
5. Implementing caching strategy

Show optimized query with explanation.
```

---

## Manifest 2026 Features

### Generate Meeting Request
```
Create a Manifest meeting request for:
- Person: [name]
- Company: [company name]
- Persona: [ExecOps/Ops/Procurement]
- Facility count: [number]

Requirements:
- Max 250 characters
- Include ROI opportunity
- Reference company dossier if available
- Use YardFlow brand voice
```

### Calculate ICP Score
```
Calculate ICP score for account: [account name]

Show:
- Persona breakdown (0-40 pts)
- Executive count score (0-20 pts)
- Contact count score (0-20 pts)
- Data completeness score (0-20 pts)
- Total score with recommendation
```

### Design Outreach Sequence
```
Design a multi-step sequence for:
- Persona: [ExecOps/Ops/Procurement]
- ICP Score: [score]
- Campaign Goal: [meeting/demo/relationship]
- Urgency: [low/medium/high]

Include:
- Channel mix (EMAIL, LINKEDIN, MANIFEST)
- Timing between steps
- Personalization level
- Content themes
```

---

## Agent Workflows

### Run Prospecting Agent
```
Use prospecting agent to discover leads for:
- Event: [Manifest 2026]
- ICP criteria: [min score, personas, industries]
- Sources: [manifest, linkedin, web]

Show:
- Discovery strategy
- Qualification criteria
- Import plan
```

### Execute Research Agent
```
Generate company dossier for: [company name]

Deep dive: [yes/no]
Sources: [gemini, linkedin, wikipedia, web]

Output should include:
- Company overview
- Recent news
- Key pain points
- Facility count estimate
- Operational scale
- Competitive intelligence
```

### Orchestrate Full Campaign
```
Run complete GTM campaign for:
- Event: [Manifest 2026]
- Target accounts: [list or "discover new"]
- Campaign type: [booth-outreach/pre-event/post-event]

Workflow:
1. Prospecting → 2. Research → 3. Sequences → 4. Content → 5. Social → 6. Track

Show execution plan and expected timeline.
```

---

## Testing & Quality

### Write Tests
```
Write comprehensive tests for: [file path]

Include:
- Unit tests for core logic
- Mock Prisma client properly
- Test edge cases (empty data, errors)
- Integration tests if needed
- Use Vitest patterns from existing tests

Reference: src/lib/enrichment/__tests__/*.test.ts
```

### Add Integration Test
```
Create end-to-end test for user flow:
[describe flow]

Use Playwright patterns:
1. Setup test data
2. Navigate to page
3. Interact with elements
4. Verify outcomes
5. Cleanup

Save in: tests/e2e/[flow-name].spec.ts
```

---

## Deployment & DevOps

### Prepare for Deploy
```
Prepare this feature for production deploy:
[feature description]

Checklist:
- [ ] All tests passing
- [ ] Database migration created (if needed)
- [ ] Environment variables documented
- [ ] Health check still passes
- [ ] Worker service updated (if queue changes)
- [ ] Error handling robust
- [ ] Logging comprehensive

Generate commit message and verify readiness.
```

### Create Migration
```
Create safe database migration for:
[describe schema change]

Include:
1. Migration file with up/down
2. Data migration if needed
3. Index creation (concurrent if large table)
4. Rollback plan
5. Testing strategy

Reference existing migrations in prisma/migrations/
```

### Setup Cron Job
```
Create new cron job for: [task description]

Implementation:
1. API route: app/api/cron/[name]/route.ts
2. CRON_SECRET authentication
3. Error handling and logging
4. Railway cron schedule: [cron expression]
5. Local testing curl command

Similar to: /api/cron/google-sync
```

---

## Content & Marketing

### Fetch from Content Hub
```
Integrate YardFlow content hub for:
- Content type: [case-study/roi-calculator/messaging/graphics]
- Persona: [ExecOps/Ops/Procurement]
- Industry: [logistics/supply-chain/waste-management]
- Use case: [outreach/proposal/social]

API endpoint: https://flow-state-klbt.vercel.app/api/[endpoint]
Show implementation with error handling.
```

### Generate ROI Calculation
```
Calculate ROI for prospect:
- Facilities: [number]
- Operational scale: [regional/national/global]
- Company size: [startup/growth/enterprise]
- Persona: [ExecOps/Ops/Procurement]
- Industry: [logistics/3PL/retail]

Show:
- Annual savings estimate
- Payback period
- Assumptions
- Confidence level (LOW/MEDIUM/HIGH)
```

---

## Quick Reference

### Check Project Status
```
@workspace What's the current sprint? What tasks are in progress?
Check: docs/current/SPRINT_30_QUICK_REFERENCE.md
```

### Find Pattern Example
```
@workspace Show me an example of [pattern] in this codebase
Examples: lazy initialization, pagination, auth check, error handling
```

### Analyze Architecture Decision
```
@workspace Why does this codebase [architectural choice]?
Examples: use API routes not Server Actions, lazy init Redis, monorepo structure
```

### Generate Documentation
```
Document this feature: [feature name]
Include: purpose, usage, API endpoints, examples, edge cases
Format: Markdown for docs/current/
```

---

## AI Agent Specific

### Create Agent Integration
```
Integrate [external service] with agent architecture:
- Service: [name and purpose]
- Agent: [which agent uses it]
- API: [endpoint and auth]
- Data flow: [input → processing → output]
- Error handling: [retry logic, fallbacks]

Follow patterns in src/lib/agents/[similar-agent].ts
```

### Update Orchestrator
```
Add new workflow to orchestrator:
- Workflow: [name]
- Steps: [list of agent tasks]
- Dependencies: [which steps depend on others]
- Error strategy: [continue/halt/retry]

Update: src/lib/agents/orchestrator.ts
```

---

**Usage**: Copy prompt → Replace [placeholders] → Add @workspace or file references → Run
