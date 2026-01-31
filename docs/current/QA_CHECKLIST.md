# QA Checklist - Manifest 2026

> **Last Updated**: January 31, 2026  
> **Event**: Manifest 2026 (Feb 10-12, 2026)  
> **Production**: https://yardflow-hitlist-production-2f41.up.railway.app

---

## 🔐 Login Flow

### Authentication Tests
- [ ] Navigate to `/login` page loads correctly
- [ ] Login with valid credentials: `casey@freightroll.com` / `FreightRoll2026!`
- [ ] Verify redirect to `/dashboard` after successful login
- [ ] Verify user email displayed in navigation header
- [ ] Refresh page - session should persist
- [ ] Click "Sign Out" - verify redirect to login page
- [ ] Verify protected routes redirect to login when unauthenticated

### Session Tests
- [ ] Open dashboard in new incognito window - should redirect to login
- [ ] Leave tab open for 30+ minutes - session should still be valid
- [ ] Close browser and reopen - session should persist (if "remember me")

---

## 📊 Accounts Module

### Account List (`/dashboard/accounts`)
- [ ] Page loads without errors
- [ ] Accounts display in table format
- [ ] Columns visible: Name, Industry, ICP Score, HQ, Status
- [ ] Sorting works on each column header
- [ ] Search filter works (type "XPO" - should filter)
- [ ] Pagination works (if >10 accounts)
- [ ] No horizontal scroll issues on desktop (1920x1080)

### Account CRUD Operations
- [ ] **Create**: Click "Add Account" → form loads
- [ ] **Create**: Fill form and submit → new account appears in list
- [ ] **Read**: Click account row → account detail page loads
- [ ] **Update**: Edit account details → changes saved
- [ ] **Delete**: Delete test account → removed from list

### Account Detail Page
- [ ] Company dossier displays (if researched)
- [ ] People associated with account listed
- [ ] Meetings for account visible
- [ ] Outreach history shown
- [ ] Research status indicator visible

---

## 👥 People Module

### People List (`/dashboard/people`)
- [ ] Page loads without errors
- [ ] People display in table format
- [ ] Columns visible: Name, Title, Company, Email, Status
- [ ] Sorting works on each column header
- [ ] Search filter works
- [ ] Names NOT truncated at desktop resolution
- [ ] Pagination works

### People CRUD Operations
- [ ] **Create**: Click "Add Person" → form loads
- [ ] **Create**: Fill form with name, title, email, linked account
- [ ] **Create**: Submit → person appears in list
- [ ] **Read**: Click person row → detail view loads
- [ ] **Update**: Edit title, email → changes saved
- [ ] **Delete**: Delete test person → removed from list

### Person Detail Page
- [ ] Contact insights display (if generated)
- [ ] Meeting history visible
- [ ] Outreach history visible
- [ ] LinkedIn profile link works (if populated)

---

## 📅 Meetings Module

### Calendar View (`/dashboard/calendar`)
- [ ] Calendar loads without errors
- [ ] Current month displayed by default
- [ ] Navigate to previous/next month works
- [ ] Existing meetings display on correct dates
- [ ] Click on meeting → detail modal opens

### Meeting CRUD Operations
- [ ] **Create**: Click on date → "New Meeting" form opens
- [ ] **Create**: Select person, set time, duration, location
- [ ] **Create**: Submit → meeting appears on calendar
- [ ] **Update**: Click meeting → edit details → save
- [ ] **Delete**: Delete test meeting → removed from calendar

### Meeting to War Room Flow
- [ ] Create meeting for TODAY
- [ ] Navigate to `/dashboard/event-day`
- [ ] Verify meeting appears in "Upcoming Meetings" section
- [ ] Meeting shows: person name, time, location

---

## 📧 Outreach Module

### Outreach List (`/dashboard/outreach`)
- [ ] Page loads without errors
- [ ] Outreach items display with status
- [ ] Filter by status (DRAFT, SENT, RESPONDED)
- [ ] Filter by channel (EMAIL, LINKEDIN)

### Outreach CRUD Operations
- [ ] **Create**: Click "New Outreach" → form loads
- [ ] **Create**: Select person, channel, write message
- [ ] **Create**: Submit as draft → appears in list as DRAFT
- [ ] **Read**: Click outreach → view full message
- [ ] **Update**: Edit message content → save
- [ ] **Send**: (If SendGrid configured) Send email → status changes to SENT

### Email Status Tracking
- [ ] Check outreach detail shows send timestamp
- [ ] Bounced emails marked appropriately
- [ ] Response tracking updates status

---

## 🎯 Event Day / War Room (`/dashboard/event-day`)

### Dashboard Load
- [ ] Page loads without errors
- [ ] Auto-refresh every 30 seconds (check network tab)
- [ ] Stats overview shows correct counts:
  - [ ] Total Meetings
  - [ ] Completed count
  - [ ] Upcoming count
  - [ ] Outreach sent today

### Meeting Display
- [ ] Upcoming meetings visible with:
  - [ ] Person name (NOT truncated)
  - [ ] Company name
  - [ ] Time
  - [ ] Location
- [ ] Completed meetings in separate section
- [ ] Meeting check-in button works

### War Room Mode (U1.5)
- [ ] "War Room Mode" button visible
- [ ] Click button → enters fullscreen
- [ ] Navigation hidden in fullscreen
- [ ] Text is 25% larger (readable from 3 feet)
- [ ] Press Escape → exits fullscreen
- [ ] Press F11 → toggles fullscreen
- [ ] Press Ctrl+Shift+F → toggles fullscreen
- [ ] Exit button shows "Exit War Room Mode"

### Outreach Panel
- [ ] Recent outreach visible
- [ ] Status badges display correctly (Draft, Sent, etc.)
- [ ] Click outreach → navigates to detail

---

## 🧭 Navigation Tests

### Desktop Navigation (1920x1080)
- [ ] All core nav items visible: Dashboard, Event Day, Accounts, People, Calendar, Outreach
- [ ] "More" dropdown shows additional items
- [ ] Active page highlighted in nav
- [ ] No horizontal overflow at 1920px
- [ ] No horizontal overflow at 1366px

### Mobile Navigation (<640px)
- [ ] Hamburger menu icon visible
- [ ] Tap hamburger → slide-out nav opens
- [ ] All nav items accessible in mobile menu
- [ ] Tap nav item → navigates and closes menu
- [ ] Tap outside menu → closes menu

### Navigation Edge Cases
- [ ] Resize browser 1920px → 640px → 1920px - nav transitions correctly
- [ ] Deep link to `/dashboard/accounts/[id]` → correct nav item highlighted
- [ ] Back button works correctly

---

## ⚡ Performance Tests

### Page Load Times (Target: <3s on 4G)
- [ ] `/dashboard` loads in <3s
- [ ] `/dashboard/event-day` loads in <3s
- [ ] `/dashboard/accounts` loads in <3s
- [ ] `/dashboard/people` loads in <3s

### Health Endpoint
- [ ] `GET /api/health` returns 200
- [ ] Response includes: `{ status: "healthy", database: {...}, redis: {...} }`
- [ ] Database latency <100ms
- [ ] Redis latency <20ms

---

## 🐛 Error Handling

### Graceful Failures
- [ ] Invalid URL → 404 page displayed
- [ ] API error → user-friendly error message (not stack trace)
- [ ] Network offline → appropriate offline indicator

### Form Validation
- [ ] Required fields show error if empty
- [ ] Email fields validate format
- [ ] Submit button disabled during loading

---

## ✅ Final Sign-Off

| Test Area | Status | Tester | Date |
|-----------|--------|--------|------|
| Login Flow | ⬜ | | |
| Accounts | ⬜ | | |
| People | ⬜ | | |
| Meetings | ⬜ | | |
| Outreach | ⬜ | | |
| Event Day / War Room | ⬜ | | |
| Navigation | ⬜ | | |
| Performance | ⬜ | | |
| Error Handling | ⬜ | | |

**All tests passed**: ⬜  
**Ready for Manifest 2026**: ⬜  

---

## Notes

_Add any additional observations or issues found during testing:_

```
Date: 
Tester:
Notes:


```
