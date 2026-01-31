# Pre-Event Checklist - Manifest 2026

> **Event**: Manifest 2026  
> **Dates**: February 10-12, 2026  
> **Location**: Las Vegas Convention Center  
> **Production URL**: https://yardflow-hitlist-production-2f41.up.railway.app  
> **Last Updated**: January 31, 2026

---

## 🗓️ 1 Week Before (Feb 3-7)

### Team Access & Credentials

- [ ] Verify login works for all team members (test each account)
- [ ] Confirm all team members can access `/dashboard/event-day` (War Room)
- [ ] Test War Room Mode fullscreen toggle on each device
- [ ] Distribute emergency access credentials to team leads

### Data Preparation

- [ ] Import final Manifest 2026 attendee list (`npx tsx prisma/seeds/manifest-2026.ts`)
- [ ] Verify accounts appear in `/dashboard/manifest`
- [ ] Run ICP scoring on all imported accounts
- [ ] Flag top 10 priority targets for executive meetings

### Content & Templates

- [ ] Create event-specific email templates for each tier
- [ ] Prepare LinkedIn connection request templates
- [ ] Draft meeting follow-up templates
- [ ] Review and update email signatures with event info

### Technical Verification

- [ ] Run full E2E smoke test (`npm run test:smoke`)
- [ ] Verify health endpoint: `curl /api/health`
- [ ] Test meeting creation workflow end-to-end
- [ ] Verify outreach sending (test with internal emails)
- [ ] Confirm auto-refresh works on Event Day dashboard

---

## 🗓️ 2-3 Days Before (Feb 7-9)

### Final Data Check

- [ ] Verify all target accounts have correct ICP scores
- [ ] Ensure key contacts have phone numbers for urgent outreach
- [ ] Review and prioritize meeting schedule for each day
- [ ] Cross-reference with official Manifest attendee list

### Device Preparation

- [ ] Test on booth laptop(s) at 1920x1080
- [ ] Test War Room Mode on large display/TV
- [ ] Verify mobile access on team phones/tablets
- [ ] Bookmark key pages (Event Day, Accounts, Quick Actions)

### Performance & Load

- [ ] Run load test: 50 concurrent users for 5 minutes
- [ ] Verify 95th percentile response time < 500ms
- [ ] Check Redis queue depth is manageable
- [ ] Monitor memory usage during load test

### Backup & Recovery

- [ ] Take database backup: `./scripts/backup-database.sh`
- [ ] Note current deployment hash for rollback
- [ ] Test rollback procedure (deploy → rollback → verify)
- [ ] Confirm incident runbook is accessible offline

---

## 🗓️ Day Before (Feb 9)

### Morning Checklist

- [ ] Team huddle: review priorities and assignments
- [ ] Final health check on production
- [ ] Verify all scheduled meetings are in system
- [ ] Test quick check-in workflow

### Afternoon Checklist

- [ ] Clear any failed jobs from queues
- [ ] Review analytics baseline for comparison
- [ ] Set up Slack/Teams channel for live event coordination
- [ ] Download offline copy of incident runbook

### Evening Checklist

- [ ] Final production health check
- [ ] Charge all devices
- [ ] Pack booth supplies (chargers, backup laptop)
- [ ] Set alarms for early start

---

## 🚀 Event Day (Feb 10-12)

### Morning Setup (Daily)

- [ ] Arrive 1 hour before show opens
- [ ] Boot up booth laptop, open Event Day dashboard
- [ ] Enter War Room Mode on large display
- [ ] Verify auto-refresh is working (30-second intervals)
- [ ] Quick health check: `curl /api/health`

### Throughout the Day

- [ ] Check in meetings immediately after they occur
- [ ] Log outreach within 5 minutes of sending
- [ ] Monitor "Responses Today" metric
- [ ] Take notes directly in account/people records
- [ ] Use Quick Actions for fast navigation

### Priority Actions

- [ ] Tier 1 accounts: Immediate executive outreach
- [ ] Tier 2 accounts: Schedule follow-up meetings
- [ ] Tier 3 accounts: Collect info for post-event nurture

### End of Day

- [ ] Review day's stats (meetings, outreach, responses)
- [ ] Export daily report for team
- [ ] Update notes on key conversations
- [ ] Plan tomorrow's priority targets

---

## 🆘 Emergency Procedures

### If Production Goes Down

1. **Don't panic** - check `/api/health` first
2. Check Railway dashboard for deployment status
3. Review Deploy Logs for startup errors
4. If needed, rollback to previous deployment
5. Alert team lead via Slack/phone

### If Health Check Fails

```bash
# Quick diagnostics
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health | jq .

# Check individual components
curl -s https://yardflow-hitlist-production-2f41.up.railway.app/api/health/deep
```

### If Slow Response Times

1. Check database query latency in health response
2. Monitor Redis queue depth
3. Scale up Railway service if needed
4. Clear any stuck jobs

### Rollback Procedure

1. Go to Railway → Deployments
2. Find last green deployment (note the hash beforehand!)
3. Click ... → Rollback
4. Verify `/api/health` returns 200
5. Test critical workflows

---

## 📊 Success Metrics

### Quantitative Goals

| Metric                | Target               | Tracking               |
| --------------------- | -------------------- | ---------------------- |
| Total Meetings Logged | 50+ over 3 days      | `/dashboard/analytics` |
| Meeting Check-ins     | 90%+ completion rate | Event Day stats        |
| Outreach Sent         | 100+ messages        | Outreach dashboard     |
| Response Rate         | 15%+                 | Event Day "Responses"  |
| New Accounts Added    | 25+                  | Accounts list          |
| New Contacts Added    | 75+                  | People list            |

### Qualitative Goals

- [ ] At least 3 meetings with Tier 1 executives
- [ ] Collect 10+ direct contact methods (personal cells, etc.)
- [ ] Identify 5+ potential partnership opportunities
- [ ] Get feedback on product from 20+ prospects

---

## 📱 Quick Reference

### Key URLs

- **War Room**: `/dashboard/event-day`
- **Accounts**: `/dashboard/accounts`
- **People**: `/dashboard/people`
- **Meetings**: `/dashboard/calendar`
- **Quick Actions**: `/dashboard/event-day` (bottom)

### Keyboard Shortcuts (War Room Mode)

- `Ctrl+Shift+F` or `F11`: Toggle fullscreen
- `Escape`: Exit fullscreen
- Browser refresh: Force data update

### Support Contacts

- **Tech Lead**: [Your Name] - [Phone]
- **Backup**: [Backup Name] - [Phone]
- **Railway Status**: https://status.railway.app

---

## ✅ Final Sign-Off

| Check                    | Owner | Date | ✓   |
| ------------------------ | ----- | ---- | --- |
| All team logins verified |       |      |     |
| Attendee data imported   |       |      |     |
| Load test passed         |       |      |     |
| Backup completed         |       |      |     |
| Devices tested           |       |      |     |
| Runbook reviewed         |       |      |     |

**Approved By**: ********\_\_******** **Date**: ********\_\_********

---

_Document Version: 1.0_  
_Created: January 31, 2026_  
_Event: Manifest 2026 (Feb 10-12, 2026)_
