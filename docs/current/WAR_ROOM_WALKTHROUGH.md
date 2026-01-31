# War Room Walkthrough

> **Sprint**: U5.7 - Pre-Event Hardening  
> **Target Event**: Manifest 2026 (Feb 10-12, 2026)  
> **Purpose**: Dry run of day-of event procedures

---

## Overview

This document walks through the War Room experience as if it were event day. Complete this walkthrough at least once before Feb 10.

---

## Prerequisites

Before starting the walkthrough:

- [ ] Logged into https://yardflow-hitlist-production-2f41.up.railway.app
- [ ] Using Chrome/Firefox on laptop (1920x1080 or larger)
- [ ] Manifest 2026 data seeded (run `manifest-2026.ts` seed)
- [ ] Health check passing

---

## Walkthrough Steps

### Step 1: Access the War Room (2 minutes)

1. **Navigate to Event Day**
   - Go to `/dashboard/event-day`
   - Or click "Event Day" in the navigation

2. **Enter War Room Mode**
   - Click the "War Room Mode" button (top-right corner)
   - Or press `Ctrl+Shift+F` (keyboard shortcut)
   - Screen should go fullscreen
   - Navigation should hide
   - Text should be 25% larger

3. **Verify Readability**
   - Can you read meeting titles from 3 feet away?
   - Are contact names visible without squinting?
   - Are action buttons large enough to tap?

**✅ Pass Criteria**: All text readable, fullscreen works, keyboard shortcuts work

---

### Step 2: Review Today's Stats (2 minutes)

1. **Check Stats Cards**
   - Verify stats are loading (not showing "Loading...")
   - Note the current counts:
     - Target Accounts
     - People/Contacts
     - Meetings Today
     - Outreach Sent

2. **Verify Data Freshness**
   - Stats should auto-refresh every 30 seconds
   - If data seems stale, refresh the page

**✅ Pass Criteria**: All 4 stat cards show real numbers

---

### Step 3: Check Upcoming Meetings (3 minutes)

1. **View Meeting List**
   - Scroll to "Upcoming Meetings" section
   - Verify meetings appear in chronological order

2. **Click on a Meeting**
   - Click any meeting to view details
   - Verify contact info is visible
   - Verify company name is visible

3. **Check-In to a Meeting** (if applicable)
   - Find a test meeting
   - Click "Check In" button
   - Verify status changes

**✅ Pass Criteria**: Meetings visible, clickable, check-in works

---

### Step 4: Quick Account Lookup (3 minutes)

1. **Search for an Account**
   - Press `Escape` to exit War Room Mode (if in fullscreen)
   - Navigate to `/dashboard/accounts`
   - Use the search box to find "Flexport" or any seeded account

2. **View Account Dossier**
   - Click on the account
   - Verify company info loads
   - Verify associated contacts are listed

3. **Return to War Room**
   - Navigate back to `/dashboard/event-day`
   - Re-enter War Room Mode

**✅ Pass Criteria**: Search works, dossier loads, navigation smooth

---

### Step 5: Create Quick Outreach (3 minutes)

1. **Open Outreach Form**
   - From Event Day, find the "Quick Outreach" or "+" button
   - Or navigate to `/dashboard/outreach`

2. **Create Draft Email**
   - Select a contact (from the Manifest list)
   - Choose a template (or write custom)
   - Save as draft

3. **Verify in Outreach List**
   - Navigate to `/dashboard/outreach`
   - Confirm your draft appears

**✅ Pass Criteria**: Outreach creation works, drafts saved

---

### Step 6: Export a Report (2 minutes)

1. **Go to Analytics**
   - Navigate to `/dashboard/analytics`
   - Wait for charts to load

2. **Review Key Metrics**
   - ICP score distribution
   - Outreach by status
   - Meeting conversion

3. **Export Data** (if feature available)
   - Click export button
   - Download CSV/PDF

**✅ Pass Criteria**: Analytics loads, export works (if available)

---

### Step 7: Exit War Room (1 minute)

1. **Exit Fullscreen**
   - Click "Exit War Room" button
   - Or press `Escape` key
   - Or press `F11`

2. **Verify Normal Mode**
   - Navigation should reappear
   - Text should return to normal size

**✅ Pass Criteria**: Clean exit, normal mode restored

---

## Troubleshooting During Walkthrough

### Problem: War Room Mode button not appearing

**Cause**: Component may not be integrated into event-day page  
**Fix**: Check that `<WarRoomToggle />` is in `event-day/page.tsx`

### Problem: Stats show 0 or "Loading..."

**Cause**: API not returning data  
**Fix**:
```bash
# Check health
curl https://yardflow-hitlist-production-2f41.up.railway.app/api/health

# Check stats endpoint
curl https://yardflow-hitlist-production-2f41.up.railway.app/api/analytics/stats
```

### Problem: Meetings not appearing

**Cause**: No meetings in database for today  
**Fix**: Create a test meeting via `/dashboard/calendar`

### Problem: Keyboard shortcuts not working

**Cause**: Browser may be capturing shortcuts  
**Fix**: Try different browser or use the button instead

---

## Event Day Reminders

### Morning Setup (8:00 AM)
1. Open War Room dashboard on booth laptop
2. Enter fullscreen mode
3. Verify all stats loading
4. Have backup laptop ready

### During Event
- Check stats every 30 minutes
- Log meetings as they happen
- Create outreach immediately after conversations

### End of Day
- Export analytics for the day
- Review meeting outcomes
- Prepare for next day

---

## Final Walkthrough Checklist

| Step | Description | Pass? |
|------|-------------|-------|
| 1 | Access War Room | ☐ |
| 2 | Review Stats | ☐ |
| 3 | Check Meetings | ☐ |
| 4 | Account Lookup | ☐ |
| 5 | Create Outreach | ☐ |
| 6 | Export Report | ☐ |
| 7 | Exit War Room | ☐ |

**Overall Result**: ☐ PASS / ☐ NEEDS FIXES

**Walkthrough Completed By**: ________________  
**Date**: ________________  
**Issues Found**: 



---

*Last Updated: January 31, 2026*
