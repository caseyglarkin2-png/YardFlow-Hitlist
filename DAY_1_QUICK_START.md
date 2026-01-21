# YardFlow Hitlist - Day 1 Quick Start Guide

## 🚀 Your App is LIVE!

**Production URL:** https://yard-flow-hitlist-caseys-projects-2a50de81.vercel.app

**Login Credentials:**
- Casey: `casey@freightroll.com` / Password: `password`
- Jake: `jake@freightroll.com` / Password: `password`

---

## ✅ What's Already Configured

### API Keys (All Set!)
- ✅ SendGrid Email (automated outreach ready)
- ✅ HubSpot CRM (two-way sync enabled)
- ✅ OpenAI API (AI research, outreach generation)
- ✅ Database (Neon PostgreSQL - production ready)

### Features Live (30 Sprints Complete)
- ✅ Manifest app integration
- ✅ Email automation with tracking
- ✅ Meeting management with AI prep
- ✅ Real-time analytics dashboards
- ✅ LinkedIn automation
- ✅ HubSpot CRM two-way sync
- ✅ A/B testing for outreach
- ✅ Account engagement scoring
- ✅ Automated research refresh
- ✅ Notifications system
- ✅ Advanced search & filtering
- ✅ Data export (CSV/JSON)
- ✅ Bulk operations
- ✅ Workflow automation
- ✅ Real-time collaboration
- ✅ Advanced analytics (funnels, cohorts)
- ✅ Team management & permissions
- ✅ API webhooks
- ✅ Audit logs & compliance
- ✅ Custom dashboards
- ✅ Mobile optimization
- ✅ Performance & caching

---

## 🎯 First Steps Tomorrow Morning

### 1. Login and Verify (5 minutes)
```bash
1. Visit: https://yard-flow-hitlist-caseys-projects-2a50de81.vercel.app
2. Login with your credentials
3. Check dashboard loads
4. Navigate to Events page
```

### 2. Load Your Hitlist Data (10 minutes)

**Option A: Import CSV (Recommended)**
1. Click **Dashboard** → **Import**
2. Upload: `YardFlow_Manifest2026_Hitlist_v3.xlsx - Company Hitlist (1).csv`
3. Map columns:
   - `Company Name` → Account Name
   - `Website` → Website
   - `Industry` → Industry
   - `Headquarters` → Headquarters
4. Click **Import** (creates accounts automatically)

5. Upload: `YardFlow_Manifest2026_Hitlist_v3.xlsx - People Hitlist.csv`
6. Map columns:
   - `Name` → Person Name
   - `Title` → Title
   - `Email` → Email
   - `LinkedIn` → LinkedIn URL
   - `Company` → Account (will auto-match)
7. Click **Import**

**Option B: Use Sample Data**
```bash
cd /workspaces/YardFlow-Hitlist/eventops
npm run seed
```

### 3. Create Your First Campaign (15 minutes)
1. Go to **Campaigns** → **Create Campaign**
2. Name: "Manifest 2026 - Wave 1"
3. Select targets (filter by ICP score > 70)
4. Choose email template
5. Schedule send date
6. **Save as Draft** (don't send yet - test first!)

### 4. Test Email Automation (5 minutes)
1. Go to **Outreach** → **Generate AI Outreach**
2. Select a test account
3. Click **Generate** (AI creates personalized email)
4. Review output
5. **Send Test** to your own email first
6. Check tracking pixel works

### 5. Set Up Notifications (2 minutes)
1. Click your profile → **Settings**
2. Enable notifications for:
   - New responses
   - Meeting confirmations
   - Daily digest
3. Save settings

---

## ⚠️ Avoiding Common Day 1 Headaches

### Issue: "I don't see any data"
**Solution:** Import your CSVs or run `npm run seed` to create sample data.

### Issue: "Email sends are failing"
**Check:**
1. SendGrid API key is valid
2. Sender email `casey@freightroll.com` is verified in SendGrid
3. Check `/api/debug/env` to verify SENDGRID_API_KEY is set
4. Check browser console for errors

### Issue: "HubSpot sync not working"
**Check:**
1. HubSpot API key is valid: `ffe089b9-5787-4a13-857b-f2e071851b8e`
2. API key has contacts write permission
3. Go to **Settings** → **Integrations** → **HubSpot** → **Test Connection**

### Issue: "AI research/outreach not generating"
**Check:**
1. OpenAI API key is set
2. You have credits remaining
3. Check `/api/debug/env` to verify OPENAI_API_KEY
4. Try with a different account

### Issue: "Can't create meetings"
**Solution:** Make sure you've created at least one Person first. Meetings require a Person to be associated.

### Issue: "Workflows not triggering"
**Check:**
1. Workflow is **Active** (toggle in Workflows page)
2. Trigger condition is met (e.g., "New outreach sent")
3. Check **Activity** page for workflow execution logs

---

## 🧪 Recommended Testing Sequence

### Test 1: End-to-End Outreach Flow
1. Create test account: "ACME Logistics"
2. Add test person: yourself with your email
3. Generate AI outreach
4. Send email
5. Click tracking link in email
6. Verify "OPENED" status updates
7. Reply to email
8. Check if response is tracked

### Test 2: Meeting Workflow
1. Go to **Meetings** → **Create Meeting**
2. Select test person
3. Set date/time for tomorrow
4. Click **Prepare with AI** (generates briefing)
5. Review AI prep notes
6. Save meeting
7. Check notification appears

### Test 3: HubSpot Sync
1. Create a new account in YardFlow
2. Wait 30 seconds
3. Check HubSpot - should see new company
4. Update account in HubSpot
5. Wait 30 seconds
6. Refresh YardFlow - should see update

### Test 4: Analytics
1. Go to **Analytics** → **Funnels**
2. Verify funnel shows: Accounts → People → Outreach → Opens → Responses → Meetings
3. Go to **Event Day Dashboard**
4. Check today's metrics are accurate
5. Test export (CSV/JSON)

---

## 📊 Key Metrics to Monitor Day 1

### Health Check Dashboard
Visit: `/dashboard` to see:
- Total accounts loaded
- People imported
- Outreach sent today
- Open rate
- Response rate
- Meetings scheduled

### Red Flags to Watch For
- ❌ Send rate < 50% (check SendGrid quota)
- ❌ Open rate < 10% (tracking pixel issue)
- ❌ Response rate = 0% (email deliverability problem)
- ❌ API errors in browser console
- ❌ Slow page loads (> 3 seconds)

---

## 🔧 Troubleshooting Commands

### Check Environment Variables
```bash
curl https://yard-flow-hitlist-caseys-projects-2a50de81.vercel.app/api/debug/env
```

### Check Database Connection
```bash
cd /workspaces/YardFlow-Hitlist/eventops
npx prisma studio
# Opens database browser on localhost:5555
```

### Check Build Logs
```bash
cd /workspaces/YardFlow-Hitlist/eventops
vercel logs --follow
```

### Reset Database (Nuclear Option)
```bash
cd /workspaces/YardFlow-Hitlist/eventops
npx prisma migrate reset --force
npm run seed
```

---

## 💡 Power User Tips

### 1. Keyboard Shortcuts
- `/` - Quick search
- `Ctrl+K` - Command palette
- `Ctrl+N` - New (account/person/campaign depending on page)

### 2. Bulk Operations
1. Go to any list view (Accounts, People, Outreach)
2. Select multiple rows (checkbox)
3. Click **Actions** → **Bulk Edit/Delete/Export**

### 3. Custom Dashboards
1. Go to **Custom** in nav
2. Create dashboard: "Manifest 2026 Command Center"
3. Add widgets:
   - Today's Stats
   - Meeting Schedule
   - Top Responses
   - ICP Score Distribution
4. Save and set as default

### 4. Workflow Automation Examples
- **Auto-send follow-up:** When outreach opened → Wait 3 days → Send follow-up
- **Meeting reminder:** When meeting scheduled → Send email 1 day before
- **Hot lead alert:** When ICP score > 90 → Notify team in Slack

### 5. Advanced Search
Go to **Search** page and try:
- `icpScore > 80 AND industry = "Logistics"`
- `persona = "ExecOps" AND lastOutreach > 30 days ago`
- `meetingStatus = "COMPLETED" AND responsePositive = true`

---

## 📞 Need Help?

### Quick Reference
- **Database:** Neon PostgreSQL (connection string in .env)
- **Email:** SendGrid (25k/month free tier)
- **CRM:** HubSpot (2-way sync enabled)
- **AI:** OpenAI GPT-4 (research + outreach)

### Useful Links
- [Vercel Dashboard](https://vercel.com/caseys-projects-2a50de81/yard-flow-hitlist)
- [SendGrid Dashboard](https://app.sendgrid.com)
- [HubSpot Settings](https://app.hubspot.com/settings)
- [GitHub Repo](https://github.com/caseyglarkin2-png/YardFlow-Hitlist)

### Emergency Contacts
- **Deployment Issues:** Check Vercel logs
- **Email Issues:** Check SendGrid activity feed
- **Database Issues:** Check Neon dashboard
- **Code Issues:** Check GitHub commits

---

## 🎯 Success Criteria for Day 1

By end of day, you should have:
- ✅ Logged in successfully
- ✅ Imported your hitlist data (or loaded sample data)
- ✅ Sent at least 1 test email
- ✅ Verified tracking works (open/click)
- ✅ Created 1 meeting with AI prep
- ✅ Tested HubSpot sync (if using)
- ✅ Reviewed analytics dashboard
- ✅ No critical errors in console

---

## 🚀 Next Steps (Day 2+)

1. **Scale Up Outreach**
   - Create production campaigns
   - Set up A/B tests
   - Schedule automated sequences

2. **Optimize Workflows**
   - Build custom automation workflows
   - Set up webhooks for external tools
   - Configure team permissions

3. **Analyze Performance**
   - Review funnel analytics
   - Analyze cohort data
   - Export reports for stakeholders

4. **Team Onboarding**
   - Create additional user accounts
   - Set role permissions
   - Train team on key features

---

## 📝 Notes

- Database has sample users pre-seeded (Casey, Jake)
- All environment variables are configured in Vercel
- Email sending is live (be careful not to spam!)
- HubSpot sync runs every 30 seconds
- AI research refresh runs daily at midnight
- Cache clears automatically after 5 minutes

**Remember:** This is production! Test with your own email first before sending to real prospects.

---

*Generated: {{DATE}}*
*App Version: 1.0 (30 Sprints Complete)*
*Status: Production Ready ✅*
