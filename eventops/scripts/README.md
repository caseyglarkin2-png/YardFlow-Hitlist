# YardFlow Sprint Automation

This directory contains automation for sprint completion and performance tracking.

## Files

- **`complete-sprint.sh`** - Interactive script to complete a sprint
- **`baseline-metrics.json`** - Stores baseline metrics for comparison

## Sprint Completion Workflow

### Automated Email Notification

Every time a sprint completes, an email is automatically sent to **casey@freightroll.com** with:

📊 **Performance Metrics:**
- Build time (with % change from last sprint)
- API response times (p95, with % change)
- Bundle size (with % change)
- Test coverage (with % change)

✅ **Task Summary:**
- List of all completed tasks
- Validation results for each task

🚀 **Deployment Info:**
- Production URL
- Commit hash
- Deployment status

📝 **Notes:**
- Blockers encountered
- Technical debt identified
- Recommendations for next sprint

🎯 **Next Sprint Preview:**
- Sprint number and name
- Start date
- Goal statement

### How to Complete a Sprint

#### Option 1: Interactive Script (Recommended)

```bash
cd eventops
./scripts/complete-sprint.sh 18 "Google Workspace Integration"
```

The script will:
1. Collect build metrics automatically
2. Run tests and calculate coverage
3. Prompt for task details
4. Prompt for deployment info
5. Ask for optional notes
6. Send email to casey@freightroll.com
7. Update baseline metrics for next sprint

#### Option 2: API Call (Manual)

```bash
curl -X POST http://localhost:3000/api/sprints/complete \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "sprintNumber": 18,
    "sprintName": "Google Workspace Integration",
    "startDate": "Jan 23, 2026",
    "endDate": "Jan 27, 2026",
    "demo": "User connects Google account, sees synced meetings",
    "buildTime": 4250,
    "buildTimeChange": -12.5,
    "apiP95Response": 185,
    "apiP95Change": -8.2,
    "bundleSize": 1228.8,
    "bundleSizeChange": 3.1,
    "testCoverage": 78.5,
    "testCoverageChange": 5.2,
    "tasksCompleted": 6,
    "tasksTotal": 6,
    "taskDetails": [
      {
        "id": "18.1",
        "name": "Google OAuth Setup",
        "validation": "OAuth flow tested, tokens stored"
      }
    ],
    "productionUrl": "https://yard-flow-hitlist.vercel.app",
    "commitHash": "8b906ce",
    "deploymentStatus": "live",
    "nextSprint": {
      "number": 19,
      "name": "Bulk Operations & Performance",
      "startDate": "Jan 28, 2026",
      "goal": "High-performance bulk operations"
    }
  }'
```

#### Option 3: Programmatically

```typescript
import { sendSprintCompletionEmail } from '@/lib/email/sprint-completion';

const metrics = {
  sprintNumber: 18,
  sprintName: 'Google Workspace Integration',
  // ... other metrics
};

await sendSprintCompletionEmail(metrics);
```

## Environment Setup

### Required Environment Variables

Add to `.env`:

```bash
# Resend API Key for email notifications
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

### Get Resend API Key

1. Sign up at https://resend.com
2. Verify domain: freightroll.com
3. Create API key
4. Add to `.env`

## YardFlow Philosophy

Every sprint completion follows our core principles:

✅ **Atomic Tasks** - Each task is independently committable (2-6 hours)  
✅ **Clear Validation** - Every task has tests or manual verification  
✅ **Demoable Sprints** - Every sprint ships working software  
✅ **Performance Tracking** - Metrics measured and compared sprint-to-sprint  

See [`.yardflow-philosophy.md`](../../.yardflow-philosophy.md) for full details.

## Metrics Tracked

### Build Performance
- Compilation time (target: <5s)
- Bundle size (target: <2MB)
- Route generation time

### Runtime Performance
- API p50, p95, p99 response times (target: p95 <200ms)
- Database query execution
- Memory usage
- CPU utilization

### Code Quality
- TypeScript error count (target: 0)
- ESLint warning count
- Test coverage % (target: >80%)
- Cyclomatic complexity

### User Experience
- Time to Interactive (target: <3s)
- Largest Contentful Paint (target: <2.5s)
- First Input Delay (target: <100ms)
- Cumulative Layout Shift (target: <0.1)

## Troubleshooting

### Email not sending?

Check:
1. `RESEND_API_KEY` is set in `.env`
2. Domain is verified in Resend dashboard
3. Check API logs: `vercel logs --follow`

### Metrics seem wrong?

1. Delete `baseline-metrics.json`
2. Run script again to reset baseline
3. Or manually edit baseline values

### Script permission denied?

```bash
chmod +x scripts/complete-sprint.sh
```

## Integration with GitHub Actions

To automate sprint completion on merge to main:

```yaml
# .github/workflows/sprint-complete.yml
name: Sprint Completion Check

on:
  push:
    branches: [main]

jobs:
  check-sprint-complete:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check for sprint completion tag
        run: |
          if git log -1 --pretty=%B | grep -q "SPRINT_COMPLETE"; then
            echo "Sprint completion detected!"
            # Extract sprint number from commit message
            SPRINT=$(git log -1 --pretty=%B | grep -oP 'SPRINT_COMPLETE:\s*\K\d+')
            echo "Completing sprint $SPRINT..."
            # TODO: Call completion API
          fi
```

## Examples

### Example Email Subject
```
[YardFlow] Sprint 18 Complete: Google Workspace Integration
```

### Example Email Preview
```
Sprint 18: Google Workspace Integration - COMPLETE ✅

Duration: Jan 23, 2026 → Jan 27, 2026
Demo: User connects Google account, meetings auto-import

📊 Performance: Build -12.5%, API -8.2%, Coverage +5.2%
✅ Tasks: 6/6 completed
🚀 Deployed: https://yard-flow-hitlist.vercel.app
```

---

*"Atomic tasks. Clear validation. Demoable sprints. Every time."*
