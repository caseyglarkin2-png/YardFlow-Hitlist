# YardFlow Hitlist - Comprehensive Sprint Plan v2.1

> **Generated**: January 27, 2026  
> **Philosophy**: Ship Fast, Ship Often - 60-120 min atomic tasks  
> **Production URL**: https://yardflow-hitlist-production-2f41.up.railway.app  
> **Target Event**: Manifest 2026 (Feb 10-12, 2026) - **14 DAYS AWAY**

---

## Executive Summary

YardFlow Hitlist is an event-driven ABM (Account-Based Marketing) platform. This document defines **12 sprints** with **atomic, testable tasks** that build incrementally toward a production-ready system for Manifest 2026.

### Current State (85-90% feature-complete)
- ✅ Core CRUD (Accounts, Contacts, Events, Campaigns, Sequences)
- ✅ AI Research (Gemini, OpenAI)
- ✅ Email Sending (SendGrid)
- ✅ Queue System (BullMQ)
- ⚠️ Google Integration (OAuth works, sync needs verification)
- ⚠️ Sequence Automation (cron job is **STUBBED** - critical fix needed)
- ⚠️ HubSpot Sync (contacts work, deals/activities not synced)
- ❌ LinkedIn Automation (placeholder)
- ❌ Graphics Generation (placeholder)
- ❌ Badge OCR (exists but untested)

### ⚠️ Critical Stubs Requiring Implementation
| Component | File | Status |
|-----------|------|--------|
| Sequence Cron | `/api/cron/sequences/route.ts` | Returns "not implemented" |
| Webhooks | `/api/webhooks/route.ts` | Returns 501 |
| Badge OCR | `/api/ocr/badge/route.ts` | Exists, untested |

---

## Sprint Priority Matrix (Manifest 2026 Focus)

### 🔴 MUST HAVE (Complete by Feb 8)
| Sprint | Theme | Hours | Priority |
|--------|-------|-------|----------|
| 2 | Auth & Users | 2h | Login works |
| 3 | Core Data | 2h | Account/Contact CRUD |
| 5 | Outreach | 3h | Send tracked emails |
| 9 | Manifest | 3h | **Meeting requests (core value)** |
| 4 | Research | 3h | Dossiers for prep |

### 🟡 SHOULD HAVE (Complete by Feb 9)
| Sprint | Theme | Hours | Priority |
|--------|-------|-------|----------|
| 6 | Sequences | 4h | Basic automation |
| 8 | Google | 4h | Reply detection |

### 🟢 NICE TO HAVE (Post-event)
| Sprint | Theme | Hours | Priority |
|--------|-------|-------|----------|
| 7 | Campaigns | 3h | Complex orchestration |
| 10 | Analytics | 3h | Can use manual SQL |
| 11 | Advanced Agents | 6h | Future automation |
| 12 | Polish | 4h | Incremental improvements |

---

## Sprint 0: Build Pipeline Repair ✅ COMPLETE

**Goal**: Railway builds succeed without timeouts.

| ID | Task | Time | Validation |
|----|------|------|------------|
| 0.1 | Remove duplicate `npm ci` (nixpacks.toml vs railway.json) | 15m | Single npm ci in logs |
| 0.2 | Remove duplicate `prisma generate` (postinstall vs build) | 15m | Single prisma generate |
| 0.3 | Add `--omit=dev --no-audit` flags | 10m | 725 packages installed |
| 0.4 | Increase heap to 8GB | 10m | No OOM errors |
| 0.5 | Verify standalone output | 10m | App starts on 8080 |

**✅ Verification**: `curl /api/ping` → `{"status":"ok"}`

---

## Sprint 1: Infrastructure Hardening ✅ COMPLETE

**Goal**: Health checks report accurate system status.

| ID | Task | Time | Validation |
|----|------|------|------------|
| 1.1 | Separate critical vs optional env vars | 20m | 200 when DB+Redis work |
| 1.2 | Fix Redis lazy initialization | 20m | No connection errors |
| 1.3 | Verify queue health reporting | 15m | Queue counts in response |
| 1.4 | Add structured startup logs | 15m | JSON logs with timestamps |
| 1.5 | Create verification script | 20m | Script passes |

**✅ Verification**: `/api/health` → `{"status":"healthy","checks":{...}}`

---

## Sprint 2: Auth & User Management ✅ SEEDING COMPLETE

**Goal**: Users can authenticate via credentials and Google OAuth.

**✅ Users Created (Jan 27, 2026)**:
- **casey@freightroll.com** / `FreightRoll2026!` (ADMIN)
- **jake@freightroll.com** / `FreightRoll2026!` (ADMIN)

| ID | Task | Time | Validation | Test |
|----|------|------|------------|------|
| 2.1 | ✅ Create admin seed endpoint | 30m | `/api/admin/seed` exists | `curl POST /api/admin/seed?secret=xxx` |
| 2.2 | ✅ Seed casey@freightroll.com | 10m | User in DB | Verified via API |
| 2.3 | ✅ Seed jake@freightroll.com | 10m | User in DB | Verified via API |
| 2.4 | ⏳ Verify credentials login | 20m | Session returned | Login form → dashboard redirect |
| 2.5 | ⏳ Verify Google OAuth callback | 30m | Google login works | Click "Continue with Google" |
| 2.6 | ⏳ Verify session persistence | 15m | Session survives refresh | Refresh page, still logged in |
| 2.7 | ⏳ Verify logout clears session | 10m | Redirects to login | Click logout, verify redirect |
| 2.8 | ⏳ Verify role-based protection | 20m | Admin routes require ADMIN | Non-admin can't access /admin |
| 2.9 | ⏳ Configure test:unit with Vitest | 20m | Tests run | `npm run test:unit` passes |
| 2.10 | ⏳ Create test fixtures for auth | 15m | Fixtures exist | Mock user sessions work |

**Tests**:
```typescript
// tests/auth/login.test.ts
describe('Auth', () => {
  it('should login with valid credentials', async () => {
    const res = await fetch('/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({ email: 'casey@freightroll.com', password: 'FreightRoll2026!' })
    });
    expect(res.status).toBe(200);
    expect(res.cookies).toContain('next-auth.session-token');
  });
});
```

**Demo**: Login at https://yardflow-hitlist-production-2f41.up.railway.app with casey@freightroll.com

---

## Sprint 3: Core Data Layer

**Goal**: CRUD operations work end-to-end with proper validation.

| ID | Task | Time | Validation | Test |
|----|------|------|------------|------|
| 3.1 | Verify accounts GET/list with pagination | 20m | Returns paginated results | `GET /api/accounts?page=1&limit=20` |
| 3.2 | Verify accounts POST creates with ICP score | 20m | Account created, score calculated | Create account, verify score 0-100 |
| 3.3 | Verify accounts PUT updates | 15m | Account updated | Update account, verify changes |
| 3.4 | Verify accounts DELETE soft-deletes | 15m | Account marked deleted | Delete, verify not in list |
| 3.5 | Verify contacts GET/list with filters | 20m | Filters work (persona, status) | `GET /api/contacts?persona=exec` |
| 3.6 | Verify contacts POST creates | 15m | Contact created | Create contact |
| 3.7 | Verify contacts PUT updates | 15m | Contact updated | Update contact |
| 3.8 | Verify contacts DELETE | 10m | Contact removed | Delete contact |
| 3.9 | Verify events CRUD | 20m | Full CRUD works | Create/edit/delete event |
| 3.10 | Verify bulk select/update | 25m | Bulk operations process | Select 50, update tier |
| 3.11 | Add accounts API tests | 30m | Tests pass | `npm test -- accounts` |
| 3.12 | Add contacts API tests | 30m | Tests pass | `npm test -- contacts` |

**Tests**:
```typescript
// tests/api/accounts.test.ts
describe('Accounts API', () => {
  it('should create account with ICP score', async () => {
    const res = await POST('/api/accounts', { 
      name: 'Test Corp', 
      industry: 'Logistics', 
      size: 'Enterprise' 
    });
    expect(res.status).toBe(201);
    expect(res.body.icpScore).toBeGreaterThan(0);
  });

  it('should filter by tier', async () => {
    const res = await GET('/api/accounts?tier=TIER_1');
    expect(res.body.every(a => a.tier === 'TIER_1')).toBe(true);
  });
});
```

**Demo**: Create account in UI, see it in list with calculated ICP score.

---

## Sprint 4: Research & Enrichment

**Goal**: AI-powered research generates actionable dossiers.

| ID | Task | Time | Validation | Test |
|----|------|------|------------|------|
| 4.1 | Verify GEMINI_API_KEY configured | 10m | Key in env | Health check shows Gemini OK |
| 4.2 | Verify Gemini client initialization | 20m | Client connects | `geminiClient.generateContent()` works |
| 4.3 | Verify single dossier generation | 30m | Dossier created | `POST /api/research` → dossier saved |
| 4.4 | Verify bulk research (10 accounts) | 30m | All dossiers created | `POST /api/research/bulk` |
| 4.5 | Verify ROI calculation | 20m | ROI saved | roi_calculations populated |
| 4.6 | Verify email pattern detection | 25m | Patterns detected | email_patterns has entries |
| 4.7 | Verify email generation from patterns | 20m | Emails generated | Contacts have generated emails |
| 4.8 | Verify LinkedIn profile search | 25m | Profiles found | linkedin_profiles populated |
| 4.9 | Verify YardFlow Content Hub fetch | 20m | Case studies loaded | Case studies in dossier |
| 4.10 | Add research queue tests | 30m | Tests pass | `npm test -- research` |

**Tests**:
```typescript
// tests/lib/research.test.ts
describe('Research Agent', () => {
  it('should generate company dossier', async () => {
    const dossier = await researchAgent.generateDossier('account-123');
    expect(dossier.summary).toBeDefined();
    expect(dossier.painPoints).toHaveLength(3);
    expect(dossier.recommendations).toHaveLength(3);
  });
});
```

**Demo**: Click "Research" on account, see AI-generated dossier appear.

---

## Sprint 5: Outreach Engine

**Goal**: Send tracked emails, manage templates.

| ID | Task | Time | Validation | Test |
|----|------|------|------------|------|
| 5.1 | Verify SENDGRID_API_KEY configured | 10m | Key in env | Health check shows SendGrid OK |
| 5.2 | Verify SendGrid client initialization | 15m | Client connects | Test email sends |
| 5.3 | Verify single email send | 25m | Email delivered | Check inbox for email |
| 5.4 | Verify bulk email (50 contacts) | 30m | All sent | Check outreach records |
| 5.5 | Verify tracking pixel injection | 20m | Pixel in HTML | View email source |
| 5.6 | Verify click tracking wrapping | 20m | Links wrapped | View email source |
| 5.7 | Verify open tracking endpoint | 20m | Opens recorded | Open email, check DB |
| 5.8 | Verify click tracking endpoint | 20m | Clicks recorded | Click link, check DB |
| 5.9 | Verify template CRUD | 25m | Templates work | Create/edit template |
| 5.10 | Verify variable substitution | 20m | Variables replaced | {{firstName}} → "Casey" |
| 5.11 | Verify unsubscribe flow | 20m | Unsubscribe works | Click unsubscribe, verify |
| 5.12 | Add outreach tests | 30m | Tests pass | `npm test -- outreach` |

**Tests**:
```typescript
// tests/api/outreach.test.ts
describe('Outreach', () => {
  it('should send email with tracking', async () => {
    const res = await POST('/api/outreach/send', { 
      contactId: 'test-contact',
      subject: 'Test',
      body: 'Hello {{firstName}}'
    });
    expect(res.status).toBe(200);
    expect(res.body.trackingPixelInjected).toBe(true);
  });

  it('should record opens', async () => {
    await GET('/api/track/open?id=outreach-123');
    const engagement = await prisma.email_engagement.findFirst({
      where: { outreachId: 'outreach-123', event: 'open' }
    });
    expect(engagement).toBeDefined();
  });
});
```

**Demo**: Send email, open it, see "Opened" status in UI.

---

## Sprint 6: Sequence Automation

**Goal**: Multi-step sequences execute automatically.

| ID | Task | Time | Validation | Test |
|----|------|------|------------|------|
| 6.1 | Verify sequence CRUD | 20m | Create/edit/delete work | UI flows work |
| 6.2 | Verify step builder UI | 25m | Steps saved correctly | Add 3 steps with delays |
| 6.3 | Verify contact enrollment | 20m | Enrollment created | Enroll contact, see in DB |
| 6.4 | Verify CAN-SPAM compliance | 20m | Unsubscribed blocked | Try enroll unsubscribed |
| 6.5 | Verify step scheduling | 25m | Jobs queued | Check BullMQ queue |
| 6.6 | Verify step execution by worker | 30m | Email sent on schedule | Wait for step, check inbox |
| 6.7 | Verify step completion tracking | 15m | Status updated | sequence_steps marked complete |
| 6.8 | Verify enrollment completion | 15m | Enrollment done | All steps done → enrollment complete |
| 6.9 | Verify pause/resume | 20m | Enrollment paused | Pause, verify no more sends |
| 6.10 | Implement sequence cron trigger | 45m | Cron processes pending | `/api/cron/sequences` works |
| 6.11 | Verify reply detection stops sequence | 30m | Reply → paused | Reply to email, verify paused |
| 6.12 | Add sequence tests | 35m | Tests pass | `npm test -- sequences` |

**Tests**:
```typescript
// tests/sequences/automation.test.ts
describe('Sequence Automation', () => {
  it('should schedule steps with correct delays', async () => {
    const enrollment = await enrollContact(sequenceId, contactId);
    const jobs = await sequenceQueue.getJobs(['delayed']);
    expect(jobs.length).toBe(3); // 3 steps
    expect(jobs[0].opts.delay).toBe(0); // immediate
    expect(jobs[1].opts.delay).toBe(2 * 24 * 60 * 60 * 1000); // 2 days
  });

  it('should stop on reply', async () => {
    await simulateReply(outreachId);
    const enrollment = await prisma.sequence_enrollments.findUnique({
      where: { id: enrollmentId }
    });
    expect(enrollment.status).toBe('PAUSED');
  });
});
```

**Demo**: Create sequence, enroll contact, watch steps execute over time.

---

## Sprint 7: Campaign Orchestration

**Goal**: Full campaign workflows with agent coordination.

| ID | Task | Time | Validation | Test |
|----|------|------|------------|------|
| 7.1 | Verify campaign CRUD | 20m | All operations work | Create campaign in UI |
| 7.2 | Verify account linking | 15m | Accounts attached | Add accounts to campaign |
| 7.3 | Verify sequence linking | 15m | Sequences attached | Add sequence to campaign |
| 7.4 | Verify AgentOrchestrator init | 20m | No errors on start | Orchestrator loads |
| 7.5 | Verify start-campaign action | 30m | Triggers agent chain | Watch agent_tasks |
| 7.6 | Verify research agent step | 20m | Dossiers generated | Dossiers for all accounts |
| 7.7 | Verify content agent step | 20m | Content personalized | Content for personas |
| 7.8 | Verify sequence agent step | 20m | Contacts enrolled | Enrollments created |
| 7.9 | Verify task parent-child links | 20m | Hierarchy correct | Subtasks linked |
| 7.10 | Verify retry logic | 25m | Failed tasks retry | Simulate failure, verify retry |
| 7.11 | Verify agent dashboard | 20m | Live status shown | /dashboard/agents works |
| 7.12 | Add orchestrator tests | 35m | Tests pass | `npm test -- orchestrator` |

**Tests**:
```typescript
// tests/agents/orchestrator.test.ts
describe('Campaign Orchestration', () => {
  it('should execute full campaign workflow', async () => {
    const campaign = await createCampaign({ accounts: ['acc-1', 'acc-2'] });
    await triggerCampaign(campaign.id);
    
    // Wait for agent completion
    await waitForAgentCompletion(campaign.id, { timeout: 60000 });
    
    const tasks = await prisma.agent_tasks.findMany({
      where: { metadata: { path: ['campaignId'], equals: campaign.id } }
    });
    
    expect(tasks.every(t => t.status === 'completed')).toBe(true);
  });
});
```

**Demo**: Start campaign, watch agent dashboard as tasks progress.

---

## Sprint 8: Google Workspace Integration

**Goal**: Gmail reply detection, Calendar sync, Drive content.

| ID | Task | Time | Validation | Test |
|----|------|------|------------|------|
| 8.1 | Verify Google OAuth flow | 25m | Connect succeeds | Click Connect Google |
| 8.2 | Verify token storage | 15m | Tokens in DB | Check users table |
| 8.3 | Verify token refresh | 25m | Refresh works | Force refresh, verify |
| 8.4 | Verify Gmail read access | 20m | Read inbox | List recent emails |
| 8.5 | Verify Gmail reply detection | 30m | Replies detected | Reply, check outreach status |
| 8.6 | Implement Gmail send (optional) | 30m | Send via Gmail | Option in outreach form |
| 8.7 | Verify Calendar read sync | 25m | Events displayed | See calendar events |
| 8.8 | Implement Calendar write | 30m | Create meetings | Create meeting from app |
| 8.9 | Verify Drive content access | 25m | Content loaded | Training from Drive |
| 8.10 | Verify sync lock | 20m | No concurrent syncs | Trigger 2 syncs, 1 waits |
| 8.11 | Verify circuit breaker | 25m | Backoff on 429 | Simulate rate limit |
| 8.12 | Add Google tests | 35m | Tests pass | `npm test -- google` |

**Tests**:
```typescript
// tests/lib/google.test.ts
describe('Google Integration', () => {
  it('should detect email replies', async () => {
    // Simulate incoming reply
    await simulateGmailReply(outreachId);
    
    // Trigger sync
    await triggerGmailSync(userId);
    
    const outreach = await prisma.outreach.findUnique({ 
      where: { id: outreachId } 
    });
    expect(outreach.status).toBe('RESPONDED');
  });

  it('should create calendar event', async () => {
    const event = await createCalendarEvent({
      userId, 
      title: 'Meeting with Prospect',
      startTime: new Date()
    });
    expect(event.googleEventId).toBeDefined();
  });
});
```

**Demo**: Connect Google, see calendar, reply to email, see it detected.

---

## Sprint 9: Manifest 2026 Integration

**Goal**: Full integration with Manifest conference app.

| ID | Task | Time | Validation | Test |
|----|------|------|------------|------|
| 9.1 | Verify attendee data import | 30m | Attendees as contacts | Import attendees |
| 9.2 | Verify deep link generation | 20m | Links work | Click link opens Manifest |
| 9.3 | Verify meeting request (250 char) | 25m | Request generated | Generate request |
| 9.4 | Verify strategic questions | 20m | Questions per persona | View questions |
| 9.5 | Verify view/request tracking | 20m | Actions logged | Check activity log |
| 9.6 | Verify Manifest templates | 20m | Templates work | Send Manifest outreach |
| 9.7 | Implement attendee matching | 30m | Accounts matched | Auto-match attendees |
| 9.8 | Add booth location data | 20m | Booth in dossier | See booth info |
| 9.9 | Add session attendance | 25m | Sessions listed | See contact's sessions |
| 9.10 | Add Manifest tests | 30m | Tests pass | `npm test -- manifest` |

**Tests**:
```typescript
// tests/lib/manifest.test.ts
describe('Manifest Integration', () => {
  it('should generate meeting request under 250 chars', async () => {
    const request = await generateManifestRequest(contactId);
    expect(request.length).toBeLessThanOrEqual(250);
    expect(request).toContain('Manifest');
  });

  it('should match attendees to accounts', async () => {
    const matches = await matchAttendeesToAccounts();
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].confidence).toBeGreaterThan(0.8);
  });
});
```

**Demo**: Generate meeting request for attendee, see personalized talking points.

---

## Sprint 10: Analytics & Reporting

**Goal**: Actionable dashboards and metrics.

| ID | Task | Time | Validation | Test |
|----|------|------|------------|------|
| 10.1 | Verify funnel analytics | 25m | Conversions calculated | View funnel |
| 10.2 | Verify cohort analysis | 25m | Cohorts compared | View cohort chart |
| 10.3 | Verify engagement heatmap | 20m | Heatmap renders | View heatmap |
| 10.4 | Verify AI predictions | 25m | Predictions shown | View predictions |
| 10.5 | Verify chart rendering | 20m | Recharts works | All charts load |
| 10.6 | Implement A/B auto-assignment | 25m | Random assignment | Contacts split 50/50 |
| 10.7 | Verify A/B winner calculation | 20m | Winner determined | See winning variant |
| 10.8 | Implement CSV export | 25m | Download works | Export analytics |
| 10.9 | Add email performance dashboard | 25m | Rates displayed | Open/click rates |
| 10.10 | Add analytics tests | 30m | Tests pass | `npm test -- analytics` |

**Tests**:
```typescript
// tests/api/analytics.test.ts
describe('Analytics', () => {
  it('should calculate funnel conversions', async () => {
    const funnel = await GET('/api/analytics/funnel?startDate=2026-01-01');
    expect(funnel.stages).toHaveLength(5);
    expect(funnel.stages[0].conversionRate).toBeDefined();
  });

  it('should determine A/B winner', async () => {
    const result = await GET('/api/ab-tests/test-123/results');
    expect(result.winner).toMatch(/A|B/);
    expect(result.confidence).toBeGreaterThan(0.95);
  });
});
```

**Demo**: View analytics dashboard with real data.

---

## Sprint 11: Advanced Agents

**Goal**: Full AI automation capabilities.

| ID | Task | Time | Validation | Test |
|----|------|------|------------|------|
| 11.1 | Implement ProspectingAgent real data | 45m | Finds leads | New contacts created |
| 11.2 | Add Manifest scraper | 45m | Attendees scraped | Auto-import attendees |
| 11.3 | Add LinkedIn Sales Nav API | 60m | Profiles enriched | Rich profile data |
| 11.4 | Implement GraphicsAgent DALL-E | 45m | Images generated | Visual content created |
| 11.5 | Implement SocialsAgent LinkedIn | 45m | Posts to LinkedIn | Post published |
| 11.6 | Add post scheduling | 30m | Schedule works | Post at future time |
| 11.7 | Implement ContractingAgent SOW | 45m | SOW generated | Download SOW PDF |
| 11.8 | Add agent performance metrics | 30m | Metrics tracked | View success rates |
| 11.9 | Add agent cost tracking | 25m | Costs tracked | View API costs |
| 11.10 | Add agent tests | 40m | Tests pass | `npm test -- agents` |

**Tests**:
```typescript
// tests/agents/prospecting.test.ts
describe('Prospecting Agent', () => {
  it('should discover new leads', async () => {
    const leads = await prospectingAgent.discover({
      industry: 'Logistics',
      event: 'Manifest 2026'
    });
    expect(leads.length).toBeGreaterThan(0);
    expect(leads[0].source).toBeDefined();
  });
});
```

**Demo**: Trigger prospecting, see new leads appear with source attribution.

---

## Sprint 12: Polish & Launch Prep

**Goal**: Production-ready for Manifest 2026.

| ID | Task | Time | Validation | Test |
|----|------|------|------------|------|
| 12.1 | Performance audit - pages | 30m | <2s load time | Lighthouse scores |
| 12.2 | Performance audit - APIs | 30m | <500ms p95 | Response time metrics |
| 12.3 | Security audit - auth | 30m | No bypasses | Penetration test |
| 12.4 | Security audit - rate limits | 25m | Limits enforced | Test rate limiting |
| 12.5 | Security audit - validation | 25m | Inputs sanitized | XSS/SQLi tests |
| 12.6 | Implement onboarding wizard | 45m | Guides new users | Complete wizard |
| 12.7 | Add help tooltips | 30m | Contextual help | Hover for help |
| 12.8 | Add keyboard shortcuts | 25m | Power user shortcuts | Use shortcuts |
| 12.9 | Load test 100 users | 45m | No degradation | Concurrent test |
| 12.10 | Create incident runbook | 30m | Documented | Runbook complete |
| 12.11 | Full E2E test suite | 60m | All pass | `npm run test:e2e` |
| 12.12 | Go-live checklist | 30m | All verified | Checklist complete |

**Tests**:
```typescript
// tests/e2e/full-flow.test.ts
describe('E2E Flow', () => {
  it('should complete full ABM workflow', async () => {
    // Login
    await page.goto('/login');
    await page.fill('[name=email]', 'casey@freightroll.com');
    await page.fill('[name=password]', 'FreightRoll2026!');
    await page.click('button[type=submit]');
    
    // Create campaign
    await page.goto('/dashboard/campaigns');
    await page.click('text=New Campaign');
    // ... full flow
    
    expect(await page.textContent('.success')).toContain('Campaign started');
  });
});
```

**Demo**: Full walkthrough of platform capabilities.

---

## Appendix A: User Credentials

### Production Users (after Sprint 2 seeding)
| Email | Password | Role |
|-------|----------|------|
| casey@freightroll.com | FreightRoll2026! | ADMIN |
| jake@freightroll.com | FreightRoll2026! | ADMIN |

---

## Appendix B: Environment Variables

### Required
```bash
DATABASE_URL          # PostgreSQL (Railway provides)
AUTH_SECRET           # NextAuth secret (32+ chars)
REDIS_URL             # Redis (Railway provides)
NEXTAUTH_URL          # https://yardflow-hitlist-production-2f41.up.railway.app
```

### For Features
```bash
GOOGLE_CLIENT_ID      # Google OAuth
GOOGLE_CLIENT_SECRET  # Google OAuth
SENDGRID_API_KEY      # Email sending
GEMINI_API_KEY        # AI research
OPENAI_API_KEY        # AI research (backup)
HUBSPOT_API_KEY       # HubSpot sync
```

---

## Appendix C: Key File Locations

| Area | Primary Files |
|------|---------------|
| Auth | `src/auth.ts`, `src/lib/auth.ts`, `src/middleware.ts` |
| Database | `src/lib/db.ts`, `prisma/schema.prisma` |
| Queues | `src/lib/queue/queues.ts`, `src/lib/queue/workers.ts` |
| Agents | `src/lib/agents/orchestrator.ts`, `src/lib/agents/*.ts` |
| Google | `src/lib/google/auth.ts`, `src/lib/google/gmail.ts` |
| AI | `src/lib/ai/gemini-client.ts`, `src/lib/ai-research.ts` |
| Email | `src/lib/sendgrid.ts` |
| Manifest | `src/lib/manifest-integration.ts` |

---

## Appendix D: Testing Commands

```bash
cd eventops

# Unit tests
npm run test:unit

# Specific test file
npm test -- accounts

# Integration tests
npm run test:integration

# E2E tests (requires server)
npm run test:e2e

# Smoke tests against production
npm run test:smoke:production

# Coverage
npm run test:coverage
```

---

## Appendix E: Deployment Checklist

- [x] All environment variables set in Railway
- [x] Database migrations applied
- [x] Redis connected
- [x] Health check returns 200
- [x] Users seeded (casey@freightroll.com, jake@freightroll.com)
- [ ] Google OAuth configured
- [ ] SendGrid verified sender
- [ ] Gemini API key active
- [ ] E2E tests passing
- [ ] Monitoring dashboard accessible

---

## Appendix F: Manifest 2026 Go-Live Checklist

**Must Complete by Feb 8, 2026**

### Authentication
- [ ] casey@freightroll.com can login
- [ ] jake@freightroll.com can login
- [ ] Google OAuth login works
- [ ] Session persists across page refresh

### Data
- [ ] At least 50 Manifest attendees imported
- [ ] Attendees matched to target accounts
- [ ] Contact personas assigned (Exec, Ops, Procurement)

### Core Functionality
- [ ] 5 meeting requests generated successfully
- [ ] 10 company dossiers created via AI
- [ ] 5 emails sent with tracking
- [ ] Open/click tracking verified

### Integrations
- [ ] Gmail connected and detecting replies
- [ ] Calendar events visible
- [ ] SendGrid emails delivering (not spam)

### Mobile & Offline
- [ ] Mobile UI tested on iPhone Safari
- [ ] Mobile UI tested on Android Chrome
- [ ] PWA installable (manifest.json works)

### Emergency Preparedness
- [ ] Emergency contact info documented
- [ ] Rollback procedure documented
- [ ] Database backup verified
- [ ] Team Slack channel for incidents

---

## Appendix G: Incident Runbook

### 1. How to Restart Railway Services
```bash
cd /workspaces/YardFlow-Hitlist/eventops
railway redeploy --yes
```

### 2. How to Run Database Migrations Manually
```bash
railway run npx prisma migrate deploy
```

### 3. How to Check Redis Queue Health
```bash
curl https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq '.checks.queues'
```

### 4. How to Resend Failed Emails
```sql
-- Find failed outreach
SELECT id, contact_id, status FROM outreach WHERE status = 'FAILED' LIMIT 10;

-- Manually retry via API
-- POST /api/outreach/retry with outreachId
```

### 5. How to Manually Mark Outreach as Responded
```sql
UPDATE outreach SET status = 'RESPONDED', updated_at = NOW() 
WHERE id = 'outreach-xxx';
```

### 6. How to Add Emergency User Mid-Event
```bash
# Trigger seed endpoint (won't recreate existing users)
curl -X POST "https://yardflow-hitlist-production-2f41.up.railway.app/api/admin/seed?secret=<AUTH_SECRET_FIRST_16_CHARS>"
```

---

*Document Version: 2.1*  
*Last Updated: January 27, 2026*
