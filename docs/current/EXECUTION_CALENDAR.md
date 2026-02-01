# YardFlow Hitlist - Day-by-Day Execution Calendar

> **Event**: Manifest 2026 - February 10, 2026  
> **Timeline**: 9 working days  
> **Working Hours**: ~5 hours/day  
> **Total Effort**: 38.5 hours

---

## Quick Reference

| Day | Date         | Sprint        | Key Milestone              | Hours |
| --- | ------------ | ------------- | -------------------------- | ----- |
| 1   | Feb 1 (Sat)  | S0 + S1 start | Test infrastructure fixed  | 5h    |
| 2   | Feb 2 (Sun)  | S1 continue   | Orchestrator tests pass    | 5h    |
| 3   | Feb 3 (Mon)  | S1 + S2 start | Agent E2E works            | 5h    |
| 4   | Feb 4 (Tue)  | S2 + S3 start | Email pipeline works       | 5h    |
| 5   | Feb 5 (Wed)  | S3 complete   | GTM can call all APIs      | 4h    |
| 6   | Feb 6 (Thu)  | S4 start      | Content adaptation working | 4h    |
| 7   | Feb 7 (Fri)  | S4 + S5 start | Sequence enrollment works  | 5h    |
| 8   | Feb 8 (Sat)  | S5 complete   | Load test passes           | 5h    |
| 9   | Feb 9 (Sun)  | S6 complete   | Final validation done      | 3h    |
| 10  | Feb 10 (Mon) | **EVENT**     | 🚀 Go Live                 | 0h    |

---

## Day 1: Saturday, February 1, 2026

### Morning Block (2.5 hours)

| Time  | Task ID | Task                                | Est |
| ----- | ------- | ----------------------------------- | --- |
| 09:00 | S0.1    | Fix Test Environment Configuration  | 30m |
| 09:30 | S0.2    | Add Integration Test Skip Logic     | 30m |
| 10:00 | S0.3    | Verify Production Health & SendGrid | 30m |
| 10:30 | S0.4    | Create Test Fixtures Directory      | 45m |
| 11:15 | S0.5    | Audit Existing Agent API Endpoints  | 30m |

**Morning Checkpoint** (11:45):

- [ ] `npm run test:integration` passes
- [ ] SendGrid test email received
- [ ] API inventory documented

### Afternoon Block (2.5 hours)

| Time  | Task ID | Task                                    | Est |
| ----- | ------- | --------------------------------------- | --- |
| 13:00 | S1.1    | Verify getWorkflowStatus Implementation | 45m |
| 13:45 | S1.2    | Verify Workflow Status API              | 30m |
| 14:15 | S1.3    | Fix Orchestrator eventId TODO           | 20m |
| 14:35 | S1.4    | Add Prospecting Output Propagation      | 45m |
| 15:20 | --      | Buffer / Review                         | 40m |

**End of Day 1 Checkpoint**:

- [ ] S0 Sprint Complete ✅
- [ ] Workflow status works
- [ ] Commit: `feat(S0): Foundation & test infrastructure`

---

## Day 2: Sunday, February 2, 2026

### Morning Block (2.5 hours)

| Time  | Task ID | Task                                      | Est |
| ----- | ------- | ----------------------------------------- | --- |
| 09:00 | S1.5    | Orchestrator Unit Tests - Core (3 tests)  | 45m |
| 09:45 | S1.6    | Orchestrator Unit Tests - Retry (2 tests) | 45m |
| 10:30 | S1.7    | Research Agent Tests (3 tests)            | 60m |
| 11:30 | --      | Break                                     | 15m |

**Morning Checkpoint** (11:45):

- [ ] 8 orchestrator/research tests pass
- [ ] No TODO placeholders remaining

### Afternoon Block (2.5 hours)

| Time  | Task ID | Task                           | Est |
| ----- | ------- | ------------------------------ | --- |
| 13:00 | S1.8    | Sequence Agent Tests (3 tests) | 60m |
| 14:00 | S1.9    | E2E Agent Flow Test Script     | 45m |
| 14:45 | S1.10   | E2E Agent Flow Validation      | 45m |
| 15:30 | --      | Buffer / Bug fixes             | 30m |

**End of Day 2 Checkpoint**:

- [ ] 11 agent tests pass
- [ ] E2E script exits 0
- [ ] Commit: `feat(S1): Core agent hardening - orchestrator & tests`

---

## Day 3: Monday, February 3, 2026

### Morning Block (2.5 hours)

| Time  | Task ID | Task                         | Est |
| ----- | ------- | ---------------------------- | --- |
| 09:00 | --      | Daily standup / Review Day 2 | 15m |
| 09:15 | S2.1    | Verify SendGrid Integration  | 30m |
| 09:45 | S2.2    | Create Email Send Queue Job  | 60m |
| 10:45 | S2.3    | Register Email Queue Worker  | 30m |
| 11:15 | --      | Test email queue locally     | 30m |

**Morning Checkpoint** (11:45):

- [ ] Email queue job exists
- [ ] Worker logs "Email worker started"

### Afternoon Block (2.5 hours)

| Time  | Task ID | Task                              | Est |
| ----- | ------- | --------------------------------- | --- |
| 13:00 | S2.4    | Wire Sequence Step to Email Queue | 60m |
| 14:00 | S2.5    | Verify Email Open Tracking        | 45m |
| 14:45 | S2.6    | Verify Email Click Tracking       | 45m |
| 15:30 | --      | Buffer                            | 30m |

**End of Day 3 Checkpoint**:

- [ ] Sequence step queues email
- [ ] Tracking endpoints work
- [ ] Commit: `feat(S2): Email pipeline - jobs & tracking`

**🚨 Alpha Checkpoint**: S0 + S1 complete?

- If YES: Continue to S2
- If NO: Weekend work required

---

## Day 4: Tuesday, February 4, 2026

### Morning Block (2.5 hours)

| Time  | Task ID | Task                               | Est |
| ----- | ------- | ---------------------------------- | --- |
| 09:00 | --      | Daily standup                      | 15m |
| 09:15 | S2.7    | Wire SendGrid Webhooks to Database | 45m |
| 10:00 | S2.8    | Email Stats API Enhancement        | 30m |
| 10:30 | S2.9    | Email Pipeline Integration Test    | 60m |
| 11:30 | --      | Review / Bug fixes                 | 15m |

**Morning Checkpoint** (11:45):

- [ ] Webhooks update DB
- [ ] Email pipeline test passes
- [ ] S2 Sprint Complete ✅

### Afternoon Block (2.5 hours)

| Time  | Task ID | Task                         | Est |
| ----- | ------- | ---------------------------- | --- |
| 13:00 | S3.1    | Create Campaign Start API    | 60m |
| 14:00 | S3.2    | Create Campaign Progress API | 45m |
| 14:45 | S3.3    | Create List Workflows API    | 45m |
| 15:30 | --      | Buffer                       | 30m |

**End of Day 4 Checkpoint**:

- [ ] S2 Sprint Complete ✅
- [ ] Campaign APIs created
- [ ] Commit: `feat(S2): Email pipeline complete` + `feat(S3): Campaign APIs`

---

## Day 5: Wednesday, February 5, 2026

### Morning Block (2.5 hours)

| Time  | Task ID | Task                          | Est |
| ----- | ------- | ----------------------------- | --- |
| 09:00 | --      | Daily standup                 | 15m |
| 09:15 | S3.4    | Create Workflow Cancel API    | 45m |
| 10:00 | S3.5    | Fix S2S Auth Tests            | 45m |
| 10:45 | S3.6    | GTM Integration Documentation | 30m |
| 11:15 | --      | End-to-end GTM test           | 30m |

**Morning Checkpoint** (11:45):

- [ ] All S2S tests pass
- [ ] Documentation complete

### Afternoon Block (1.5 hours)

| Time  | Task ID | Task                   | Est |
| ----- | ------- | ---------------------- | --- |
| 13:00 | --      | GTM team handoff call  | 30m |
| 13:30 | --      | Bug fixes from testing | 60m |

**End of Day 5 Checkpoint**:

- [ ] S3 Sprint Complete ✅
- [ ] GTM can start campaigns via API
- [ ] Commit: `feat(S3): GTM integration APIs complete`

**🚨 Beta Checkpoint**: S2 + S3 complete?

- If YES: Proceed with S4
- If NO: Descope S4.1, S4.2 (AI content)

---

## Day 6: Thursday, February 6, 2026

### Morning Block (2 hours)

| Time  | Task ID | Task                                    | Est |
| ----- | ------- | --------------------------------------- | --- |
| 09:00 | --      | Daily standup                           | 15m |
| 09:15 | S4.1a   | Content Adaptation - OpenAI Integration | 60m |
| 10:15 | S4.1b   | Content Adaptation - Personalization    | 45m |

### Afternoon Block (2 hours)

| Time  | Task ID | Task                            | Est |
| ----- | ------- | ------------------------------- | --- |
| 13:00 | S4.2    | Content Adaptation - Case Study | 60m |
| 14:00 | --      | Test content agent              | 30m |
| 14:30 | --      | Buffer                          | 30m |

**End of Day 6 Checkpoint**:

- [ ] Content agent generates real content
- [ ] OpenAI integration working
- [ ] Commit: `feat(S4): AI content adaptation`

---

## Day 7: Friday, February 7, 2026

### Morning Block (2.5 hours)

| Time  | Task ID | Task                     | Est |
| ----- | ------- | ------------------------ | --- |
| 09:00 | --      | Daily standup            | 15m |
| 09:15 | S4.3    | Sequence Enrollment Flow | 60m |
| 10:15 | S4.4    | Enrollment Pause/Resume  | 45m |
| 11:00 | S4.5    | Content Agent Tests      | 30m |

### Afternoon Block (2.5 hours)

| Time  | Task ID | Task                      | Est |
| ----- | ------- | ------------------------- | --- |
| 13:00 | S4.6    | Prospecting Agent Tests   | 45m |
| 13:45 | S5.1    | Agent Error Handling      | 60m |
| 14:45 | S5.2    | Workflow Timeout Handling | 60m |

**End of Day 7 Checkpoint**:

- [ ] S4 Sprint Complete ✅
- [ ] Error handling in place
- [ ] Commit: `feat(S4): Content & sequence polish` + `feat(S5): Error handling`

**🚨 RC Checkpoint**: S4 + half of S5 complete?

- If YES: Continue S5
- If NO: War room standby for Day 10

---

## Day 8: Saturday, February 8, 2026

### Morning Block (2.5 hours)

| Time  | Task ID | Task                          | Est |
| ----- | ------- | ----------------------------- | --- |
| 09:00 | S5.3    | Dead Letter Queue for Emails  | 60m |
| 10:00 | S5.4    | Rate Limiting for Email Sends | 45m |
| 10:45 | S5.5    | Health Check Enhancements     | 45m |
| 11:30 | --      | Break                         | 15m |

### Afternoon Block (2.5 hours)

| Time  | Task ID | Task                            | Est |
| ----- | ------- | ------------------------------- | --- |
| 13:00 | S5.6    | Alert Manager Integration       | 60m |
| 14:00 | S5.7a   | Load Test Script Creation       | 45m |
| 14:45 | S5.7b   | Load Test Execution             | 45m |
| 15:30 | S5.8    | Post-Deploy Verification Update | 30m |

**End of Day 8 Checkpoint**:

- [ ] S5 Sprint Complete ✅
- [ ] Load test P95 < 2s
- [ ] Health check shows all metrics
- [ ] Commit: `feat(S5): Production hardening complete`

---

## Day 9: Sunday, February 9, 2026

### Morning Block (2 hours)

| Time  | Task ID | Task                | Est |
| ----- | ------- | ------------------- | --- |
| 09:00 | S6.1    | War Room Status API | 60m |
| 10:00 | S6.2    | Export Enhancement  | 45m |
| 10:45 | --      | Break               | 15m |

### Afternoon Block (1.5 hours)

| Time  | Task ID | Task                             | Est |
| ----- | ------- | -------------------------------- | --- |
| 13:00 | S6.3    | Final Integration Test Script    | 45m |
| 13:45 | S6.4    | Final Integration Test Execution | 60m |

**End of Day 9 Checkpoint**:

- [ ] S6 Sprint Complete ✅
- [ ] Final E2E passes against production
- [ ] Commit: `feat(S6): Pre-event validation complete`

### Evening (Code Freeze)

| Time  | Activity                      |
| ----- | ----------------------------- |
| 17:00 | Code freeze - no more commits |
| 17:30 | Deploy to production          |
| 18:00 | Run post-deploy-verify.sh     |
| 18:30 | Smoke test all endpoints      |
| 19:00 | **READY FOR EVENT** 🎉        |

---

## Day 10: Monday, February 10, 2026 - EVENT DAY

### Pre-Event (Morning)

| Time  | Activity                    |
| ----- | --------------------------- |
| 07:00 | Health check production     |
| 07:30 | Verify worker heartbeat     |
| 08:00 | Clear any stale queue items |
| 08:30 | War room dashboard open     |
| 09:00 | **Event begins**            |

### During Event

- Monitor `/api/admin/war-room` dashboard
- Check Slack for alerts
- Be ready for hotfixes (but avoid if possible)

### War Room Metrics to Watch

| Metric            | Green   | Yellow  | Red     |
| ----------------- | ------- | ------- | ------- |
| Health endpoint   | 200     | Slow    | 5xx     |
| Queue depth       | < 500   | < 1000  | > 1000  |
| Email bounce rate | < 2%    | < 5%    | > 5%    |
| Worker heartbeat  | < 2 min | < 5 min | > 5 min |
| Error rate        | < 0.1%  | < 1%    | > 1%    |

---

## Rollback Plan

If critical issue on event day:

### Quick Rollback (< 5 min)

```bash
# Revert to last known good commit
git revert HEAD --no-commit
git push origin main

# Railway auto-deploys
```

### Full Rollback (< 15 min)

```bash
# Revert to specific commit
git log --oneline -10
git reset --hard <commit-sha>
git push origin main --force

# May need manual Railway deploy
```

### Fallback Mode

If all else fails:

1. Direct dashboard access still works
2. Manual email via SendGrid
3. Export CSVs for offline work

---

## Daily Commit Convention

```
feat(S#): [Sprint description]

- Task S#.#: [Description]
- Task S#.#: [Description]

Tested: [Test commands run]
```

Example:

```
feat(S1): Core agent hardening - orchestrator & tests

- Task S1.1: Verify getWorkflowStatus implementation
- Task S1.5: Add 3 orchestrator unit tests
- Task S1.9: Create E2E agent flow script

Tested:
- npm run test:agents -- 11 pass
- npx tsx scripts/test-agent-workflow.ts -- exit 0
```

---

## Emergency Contacts

| Role         | Contact         | When to Escalate  |
| ------------ | --------------- | ----------------- |
| Dev Lead     | @casey          | Any blocker       |
| GTM Lead     | TBD             | S3 completion     |
| Infra/DevOps | Railway Discord | Deployment issues |

---

## Document Version

- v1.0 - February 1, 2026 - Initial calendar created
