# GitHub Copilot Chat - Conversation Instructions

## Role & Context
You are assisting with YardFlow Hitlist, an ABM platform for Manifest 2026. Every task should align with the "ship fast, ship often" philosophy - production deploys after 60-120 min tasks.

## Interaction Style
- **Be Direct**: Skip pleasantries, get to the solution
- **Show Code**: Provide working code over explanations
- **Reference Files**: Always cite actual file paths from this codebase
- **Atomic Changes**: Each suggestion should be independently committable
- **Production First**: Assume code goes to production immediately

## Before Every Response
1. Check if you need to read sprint docs: `docs/current/SPRINT_*_QUICK_REFERENCE.md`
2. Verify you're in `/eventops` for npm commands
3. Confirm lazy initialization for external services
4. Check if Railway worker service needs updates too

## Common Tasks

### Creating New Features
- Read existing patterns from similar files first
- Use `@/lib/db` for Prisma access (never create new PrismaClient)
- Add structured logging with `logger.info()`, `logger.error()`
- Include NextAuth session checks for protected routes
- Write tests in `__tests__` directory next to source files

### Debugging Issues
- Start with `/api/health` endpoint check
- Check Railway logs: web and worker services separately
- Verify env vars are set (Railway dashboard)
- For build issues, check for module-level connections
- Prisma issues: run `npx prisma generate` first

### Database Changes
- Always create migration: `npx prisma migrate dev --name descriptive_name`
- Update seed data if needed: `prisma/seed.ts`
- Never use raw SQL without `$queryRaw`
- Remember to `npx prisma generate` after schema changes

### Queue/Worker Tasks
- Add jobs via `addEnrichmentJob()` or `addSequenceJob()`
- Worker runs in separate Railway service
- Both services need DATABASE_URL and REDIS_URL
- Check worker logs separately from web logs

### Deployment
- Every commit triggers Railway auto-deploy
- Verify health endpoint after deploy: `/api/health`
- Rollback if needed: `railway rollback`
- Monitor logs: `railway logs --service web`

## Domain Knowledge Quick Reference

### Manifest 2026 Context
- Supply chain & logistics conference
- Target personas: ExecOps (10pts), Ops (5pts), Procurement (3pts)
- Facility count = ROI opportunity
- 250-char meeting requests for Manifest app

### ICP Scoring Formula
```
Total Score (0-100) = 
  Persona Match (0-40) +
  Executive Count (0-20) +
  Total Contacts (0-20) +
  Data Completeness (0-20)
```

### ROI Calculation
```
Annual Savings = 
  (facilities × shipments/day × 250 days × $12) × 
  (15-20% efficiency gain) ×
  (persona multiplier)
```

## Code Patterns to Follow

### API Route Structure
```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // ... logic
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('Operation failed', { error });
    return NextResponse.json({ error: 'Message' }, { status: 500 });
  }
}
```

### Lazy Initialization
```typescript
let client: SomeClient | null = null;
export function getClient(): SomeClient {
  if (!client) {
    client = new SomeClient(config);
  }
  return client;
}
```

### Pagination
```typescript
import { parsePaginationParams, buildPaginatedResponse } from '@/lib/pagination';

const { cursor, limit } = parsePaginationParams(searchParams);
const items = await prisma.people.findMany({ ...cursor, take: limit });
return NextResponse.json(buildPaginatedResponse(items, limit));
```

## What NOT to Do
- ❌ Don't create Server Actions (use API routes)
- ❌ Don't initialize connections at module level
- ❌ Don't create new PrismaClient instances
- ❌ Don't skip session null checks
- ❌ Don't commit without tests for complex logic
- ❌ Don't use generic env vars without checking `src/lib/env.ts`

## Agent Squad Architecture
When working on agents (`src/lib/agents/`):
- Each agent is independent (can run solo or orchestrated)
- All agents pull content from https://flow-state-klbt.vercel.app/
- Agents communicate via BullMQ job chains
- State tracked in `agent_tasks` table (planned)
- See `src/lib/agents/README.md` for full architecture

## Response Format Preferences
- For bugs: Show the fix with file path and exact location
- For features: Provide implementation with all necessary imports
- For architecture questions: Reference existing patterns from codebase
- For deployments: Include verification steps

## Links to Reference
- **Primary Docs**: `docs/current/SPRINT_30_PRODUCTION_HARDENING.md`
- **Principles**: `docs/current/PROJECT_PRINCIPLES.md`
- **Health Check**: https://yardflow-hitlist-production.up.railway.app/api/health
- **YardFlow Hub**: https://flow-state-klbt.vercel.app/

## Quality Checklist
Before suggesting code, verify:
- [ ] Follows existing patterns from similar files
- [ ] Includes error handling and logging
- [ ] Uses lazy initialization for external services
- [ ] Has proper TypeScript types (use Prisma-generated when possible)
- [ ] Protected with auth if needed
- [ ] Can be committed and deployed independently
- [ ] Tested (or test included for complex logic)
