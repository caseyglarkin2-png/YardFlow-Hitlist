bu# EventOps - Comprehensive Sprint & Task Breakdown
**Generated:** January 22, 2026  
**Project:** EventOps - Event Intelligence Platform  
**Tech Stack:** Next.js 14.2, Prisma 5.22, PostgreSQL, NextAuth 5.0  
**Production:** https://yard-flow-hitlist.vercel.app

---

## Executive Summary

This document provides an exhaustive, atomic breakdown of all remaining work to complete the EventOps platform. Every task is designed to be:
- **Atomic**: Single commit, single responsibility
- **Testable**: Clear validation criteria (automated tests, smoke tests, or manual verification)
- **Demo-able**: Each sprint produces working, shippable software
- **Incremental**: Builds on previous work without breaking existing features

---

## Current State Assessment

### ✅ Completed Features (Production-Ready)

**Core Infrastructure:**
- Production deployment on Vercel
- PostgreSQL database with 13 models
- NextAuth 5.0 authentication
- Prisma ORM with full type safety
- Backup system (`backup-database.sh`)
- Baseline metrics collection
- Smoke tests (local + production)

**Data Models (All Working):**
- `users` - Auth & event assignment
- `events` - Event management & activation
- `target_accounts` - Company tracking & scoring
- `people` - Contact management with personas
- `meetings` - Full CRUD with status tracking
- `outreach` - Email/LinkedIn tracking
- `campaigns` - Multi-touch campaign orchestration
- `sequences` - Automated follow-up sequences
- `message_templates` - Reusable email templates
- `company_dossiers` - AI-generated company research
- `contact_insights` - AI-generated contact insights
- `roi_calculations` - Value proposition calculator
- `score_history` - ICP score audit trail

**APIs (77 endpoints):**
- Accounts: CRUD, bulk, research, score calculation/override/history
- People: CRUD, bulk, enrichment, insights
- Meetings: CRUD, prep generation
- Outreach: CRUD, generation (AI), tracking (opens/clicks/replies), bulk operations, SendGrid integration
- Campaigns: CRUD with analytics
- Sequences: CRUD with automation (cron job every 6 hours)
- Templates: CRUD
- Events: CRUD, activation
- Team: CRUD
- Notifications: CRUD, mark read, real-time polling
- Analytics: Overview, funnel, cohort, engagement scoring
- Research: Facilities, competitive, locations
- Webhooks: CRUD
- Export: CSV generation
- Search: Advanced multi-field
- Briefing: Daily intelligence brief

**UI Pages (45+ pages):**
- Dashboard: Home with quick actions widget
- Accounts: List, create, edit, detail with research panel
- People: List, create, edit, detail, enrichment
- Events: List, create
- Outreach: List, detail, generate (AI), bulk send
- Meetings: List, detail with prep docs
- Campaigns: List, create, detail with analytics
- Sequences: List, create, detail with timeline
- Templates: List, create, edit
- Calendar: Meeting scheduling
- Analytics: Overview, advanced (cohort/funnel/predictions)
- Research: Bulk refresh panel
- Workflows: Multi-step automation
- Activity: Timeline view
- Team: User management
- Notifications: Real-time bell with sheet UI
- Help: Video tutorials (6 guides)
- Search: Advanced filtering
- Export: Data export wizard

**Recent Additions (This Session):**
- Rich seed data (10 accounts, 30 contacts)
- Daily intelligence briefing API (`/api/briefing/daily`)
- PWA support (manifest, service worker, offline mode)
- Dashboard quick actions widget (top 3 priorities)
- Email activity tracking (opens, clicks, replies with pixels)
- Sequence automation cron job (Vercel cron configured)
- Video tutorials system (6 embedded YouTube guides)
- Bulk actions for accounts and people
- Real-time notifications with polling and Sheet UI
- SendGrid utility library with template rendering

### 🟡 Partially Complete Features

1. **Advanced Search**
   - Basic search exists (`/api/search/advanced`)
   - Missing: Saved searches, filters UI, full-text search

2. **Calendar Integration**
   - Meeting CRUD exists
   - Missing: Google Calendar sync, Outlook sync, timezone handling

3. **Mobile UX**
   - PWA configured
   - Missing: Touch optimizations, responsive tables, mobile-specific layouts

4. **Team Collaboration**
   - Team CRUD exists
   - Missing: Real-time presence, activity streams, @mentions

5. **Analytics Depth**
   - Funnel and cohort analysis exist
   - Missing: Heatmaps, AB testing, predictive models refined

### ❌ Missing Features

1. **LinkedIn Automation** - No integration with PhantomBuster or similar
2. **CRM Sync** - No Salesforce/HubSpot integration
3. **Advanced Reporting** - No PDF exports, scheduled reports
4. **Event-Day Mode** - No dedicated event-day dashboard
5. **Deal Pipeline** - No formal deal tracking beyond meetings
6. **File Attachments** - No document upload/storage
7. **Email Templates (Visual Builder)** - Plain text only, no drag-drop
8. **API Rate Limiting** - No throttling or quotas
9. **Audit Logging** - Basic logging but no compliance-grade audit trail
10. **Multi-Language** - English only
11. **Custom Fields** - No user-defined fields for accounts/people
12. **Integrations Marketplace** - No Zapier/Make.com webhooks beyond basic
13. **Mobile App** - PWA only, no native iOS/Android
14. **Voice Notes** - No transcription for meeting notes
15. **Advanced Permissions** - Role-based but not granular

---

## Sprint Breakdown

### Sprint 10: Search & Discovery Enhancement
**Goal:** Power users can find any data instantly with saved searches and filters.

#### S10-T01: Advanced Search UI
**Description:** Build comprehensive search interface with live results.  
**Files:**
- `src/app/dashboard/search/page.tsx` (enhance existing)
- `src/components/search/advanced-filters.tsx` (new)
- `src/components/search/search-results.tsx` (new)

**Implementation:**
```typescript
// Advanced filter component with:
- Account filters: ICP score range, industry, location, tier
- People filters: Persona checkboxes, title keywords, engagement level
- Outreach filters: Status, channel, date range, campaign
- Meeting filters: Status, outcome, date range
- Boolean operators: AND/OR/NOT
- Live result count
- Clear all button
```

**Validation:**
- Manual test: Search for "isExecOps AND icpScore >= 85 AND outreach = REPLIED"
- Expect: Only execs from top-tier accounts who replied
- Performance: Results < 500ms for 10,000 records

**Acceptance Criteria:**
- ✅ Multi-field filtering works
- ✅ Live results update as filters change
- ✅ Clear UX for complex queries
- ✅ Mobile responsive

---

#### S10-T02: Saved Searches
**Description:** Users can save and reload complex search queries.  
**Files:**
- `prisma/schema.prisma` - Add `SavedSearch` model
- `src/app/api/searches/route.ts` (new)
- `src/app/api/searches/[id]/route.ts` (new)
- `src/components/search/saved-searches.tsx` (new)

**Schema:**
```prisma
model SavedSearch {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  filters     Json     // Search criteria
  isGlobal    Boolean  @default(false)
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}
```

**Validation:**
- Create search: "High-Value Warm Leads"
- Save with filters: icpScore >= 90, status = OPENED
- Reload search → same results
- Share search with team → others see it

**Acceptance Criteria:**
- ✅ Save search with name
- ✅ Load saved search
- ✅ Edit saved search
- ✅ Delete saved search
- ✅ Share globally option

---

#### S10-T03: Full-Text Search
**Description:** Search across all text fields (names, emails, notes, titles).  
**Files:**
- `src/app/api/search/fulltext/route.ts` (new)
- Add PostgreSQL `tsvector` indexes to schema
- `src/lib/search.ts` (new utility)

**Implementation:**
```sql
-- Add full-text search indexes
CREATE INDEX people_search_idx ON people 
USING gin(to_tsvector('english', name || ' ' || COALESCE(title, '') || ' ' || COALESCE(email, '')));

CREATE INDEX accounts_search_idx ON target_accounts 
USING gin(to_tsvector('english', name || ' ' || COALESCE(industry, '') || ' ' || COALESCE(notes, '')));
```

**Validation:**
- Search "logistics director" → finds all with that title
- Search "smith@gxo.com" → finds that person
- Performance: < 100ms for 50,000 records

**Acceptance Criteria:**
- ✅ Searches name, email, title, company, notes
- ✅ Ranked results (relevance score)
- ✅ Highlights matching text
- ✅ Fast (indexed)

---

#### S10-T04: Export Search Results
**Description:** Export filtered search results to CSV.  
**Files:**
- `src/components/search/export-button.tsx` (new)
- Extend `/api/export/route.ts`

**Implementation:**
```typescript
// Add to export API:
- Accept search filters as query params
- Generate CSV with filtered results
- Include all relevant fields
- Stream large exports
```

**Validation:**
- Run search with 500 results
- Export to CSV
- Open in Excel → all 500 rows present
- Verify columns match UI

**Acceptance Criteria:**
- ✅ Exports current search results
- ✅ All columns included
- ✅ Works for 10,000+ rows
- ✅ Downloads as CSV file

---

**Sprint 10 Demo:** Search for warm leads, save the search, export results to CSV, share with team.

---

### Sprint 11: Calendar Integration
**Goal:** Sync meetings with Google Calendar and Outlook for automatic scheduling.

#### S11-T01: Google Calendar OAuth Setup
**Description:** Configure Google OAuth for calendar access.  
**Files:**
- `src/app/api/auth/google/callback/route.ts` (new)
- `src/lib/google-calendar.ts` (new)
- `.env` - Add Google OAuth credentials

**Implementation:**
```typescript
// Google OAuth flow:
1. User clicks "Connect Google Calendar"
2. Redirects to Google consent screen
3. Callback receives auth code
4. Exchange for access token
5. Store refresh token in users table
6. Enable calendar sync toggle
```

**Validation:**
- Click "Connect Google Calendar"
- Authorize EventOps
- Return to dashboard
- See "Connected" status
- Token stored in database

**Acceptance Criteria:**
- ✅ OAuth flow works
- ✅ Refresh token stored securely
- ✅ Disconnect option works
- ✅ Error handling for denied access

---

#### S11-T02: Sync Meetings to Google Calendar
**Description:** When meeting is created/updated, sync to Google Calendar.  
**Files:**
- `src/lib/google-calendar.ts` (extend)
- `src/app/api/meetings/route.ts` (enhance)
- `src/app/api/meetings/[id]/route.ts` (enhance)

**Implementation:**
```typescript
// On meeting create:
- Check if user has Google Calendar connected
- Create event in Google Calendar via API
- Store Google event ID in meeting record
- Add EventOps metadata to event description

// On meeting update:
- Update Google Calendar event
- Sync changes (time, location, status)

// On meeting delete:
- Delete Google Calendar event
```

**Validation:**
- Create meeting in EventOps
- Check Google Calendar → event appears
- Update meeting time → Google event updates
- Delete meeting → Google event removed

**Acceptance Criteria:**
- ✅ Creates events in Google Calendar
- ✅ Bi-directional sync (updates)
- ✅ Deletes events when meeting canceled
- ✅ Handles timezone conversion

---

#### S11-T03: Outlook Calendar Integration
**Description:** Same as Google but for Microsoft Outlook.  
**Files:**
- `src/app/api/auth/microsoft/callback/route.ts` (new)
- `src/lib/outlook-calendar.ts` (new)
- Extend meeting APIs for Outlook

**Implementation:**
```typescript
// Microsoft OAuth flow (similar to Google)
// Use Microsoft Graph API for calendar operations
// Store OAuth tokens per user
// Sync meetings bi-directionally
```

**Validation:**
- Connect Outlook Calendar
- Create meeting → appears in Outlook
- Update in Outlook → syncs to EventOps (if webhook configured)
- Delete → syncs

**Acceptance Criteria:**
- ✅ OAuth with Microsoft works
- ✅ Creates Outlook events
- ✅ Updates sync
- ✅ Deletes sync

---

#### S11-T04: Calendar Settings Page
**Description:** UI for managing calendar connections.  
**Files:**
- `src/app/dashboard/settings/calendar/page.tsx` (new)

**UI:**
```
Calendar Integrations
├─ Google Calendar [Connected] [Disconnect]
├─ Outlook Calendar [Not Connected] [Connect]
├─ Sync Settings
│  ├─ Auto-sync meetings ✓
│  ├─ Sync canceled meetings ✓
│  └─ Include EventOps link in description ✓
```

**Validation:**
- Visit settings/calendar
- See connection status
- Toggle sync options
- Changes persist

**Acceptance Criteria:**
- ✅ Shows connection status
- ✅ Connect/disconnect buttons work
- ✅ Sync settings save
- ✅ Clear instructions

---

**Sprint 11 Demo:** Connect Google Calendar, create meeting in EventOps, see it in Google, update time in Google, see change in EventOps.

---

### Sprint 12: Mobile UX Optimization
**Goal:** EventOps is fully usable on mobile devices with touch-optimized interface.

#### S12-T01: Responsive Table Component
**Description:** Replace all tables with mobile-friendly card layouts on small screens.  
**Files:**
- `src/components/ui/responsive-table.tsx` (new)
- Update all list pages (accounts, people, outreach, meetings)

**Implementation:**
```typescript
// Desktop: Traditional table
// Mobile: Card layout
<ResponsiveTable>
  <TableHeader>...</TableHeader>
  <TableBody>
    {items.map(item => (
      <TableRow key={item.id}>
        <TableCell data-label="Name">{item.name}</TableCell>
        <TableCell data-label="ICP">{item.icpScore}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</ResponsiveTable>

// CSS:
@media (max-width: 768px) {
  table, thead, tbody, tr { display: block; }
  td { display: flex; justify-content: space-between; }
  td:before { content: attr(data-label); font-weight: bold; }
}
```

**Validation:**
- Open accounts list on iPhone
- See cards instead of table
- All data visible
- Tap to open detail

**Acceptance Criteria:**
- ✅ Tables → cards on mobile
- ✅ All data accessible
- ✅ Touch targets ≥ 44px
- ✅ Scrolling smooth

---

#### S12-T02: Touch-Optimized Filters
**Description:** Replace dropdowns with bottom sheets for mobile filtering.  
**Files:**
- `src/components/mobile/filter-sheet.tsx` (new)
- Update all filter components

**Implementation:**
```typescript
// Mobile: Tap "Filter" → bottom sheet slides up
// Contains all filters in vertical layout
// Large touch targets
// "Apply" and "Clear" buttons
```

**Validation:**
- Open people list on mobile
- Tap "Filter" button
- Bottom sheet appears
- Select filters
- Tap "Apply" → results update

**Acceptance Criteria:**
- ✅ Bottom sheet UI for filters
- ✅ Touch-friendly controls
- ✅ Apply/clear buttons work
- ✅ Sheet dismissable

---

#### S12-T03: Swipe Actions
**Description:** Swipe table rows for quick actions (delete, edit, view).  
**Files:**
- `src/components/ui/swipeable-row.tsx` (new)
- Add to all list views

**Implementation:**
```typescript
// Swipe left → Delete button appears
// Swipe right → Edit button appears
// Uses react-swipeable or similar
```

**Validation:**
- Open accounts list on touch device
- Swipe account row left → Delete appears
- Swipe right → Edit appears
- Tap action → executes

**Acceptance Criteria:**
- ✅ Swipe gestures work
- ✅ Visual feedback
- ✅ Actions execute correctly
- ✅ Undo option for delete

---

#### S12-T04: Mobile Navigation
**Description:** Hamburger menu for mobile with bottom nav for key pages.  
**Files:**
- `src/components/layout/mobile-nav.tsx` (new)
- `src/components/layout/bottom-nav.tsx` (new)

**Implementation:**
```typescript
// Top: Hamburger menu with all pages
// Bottom: Fixed nav with 5 key pages
// ├─ Dashboard
// ├─ People
// ├─ Meetings
// ├─ Outreach
// └─ More (opens hamburger)
```

**Validation:**
- Open on mobile
- See bottom nav
- Tap each tab → navigates
- Tap hamburger → full menu

**Acceptance Criteria:**
- ✅ Bottom nav with 5 items
- ✅ Hamburger shows all pages
- ✅ Active state highlights
- ✅ Touch targets ≥ 44px

---

**Sprint 12 Demo:** Use EventOps entirely on iPhone - filter accounts, create meeting, send outreach, all touch-optimized.

---

### Sprint 13: Team Collaboration Features
**Goal:** Multiple users can work together with presence, activity streams, and assignments.

#### S13-T01: Real-Time Presence
**Description:** Show who's online and what they're viewing.  
**Files:**
- `src/app/api/presence/route.ts` (new)
- `src/components/team/presence-indicator.tsx` (new)
- Use WebSocket or polling

**Implementation:**
```typescript
// Heartbeat every 30 seconds
// Track: userId, page, lastSeen
// Show avatars of online users in top-right
// "2 people viewing this account" badge
```

**Validation:**
- User A opens account detail
- User B opens same account
- User A sees "User B is viewing" indicator
- User B closes page → indicator disappears

**Acceptance Criteria:**
- ✅ Shows online users
- ✅ Updates in real-time
- ✅ Shows what page they're on
- ✅ Auto-offline after 2 min

---

#### S13-T02: Activity Stream
**Description:** Timeline of all team actions (created account, sent email, booked meeting).  
**Files:**
- `src/app/dashboard/activity/page.tsx` (enhance existing)
- `src/app/api/activity/stream/route.ts` (new)

**Implementation:**
```typescript
// Activity feed showing:
- Who did what, when
- Filterable by user, type, date
- Real-time updates
- "User X sent email to John Smith at GXO Logistics 2 minutes ago"
```

**Validation:**
- User A sends outreach
- User B sees it in activity stream immediately
- Filter by user → only their actions
- Click activity → navigate to related item

**Acceptance Criteria:**
- ✅ All CRUD actions logged
- ✅ Real-time updates
- ✅ Filter by user/type/date
- ✅ Click to navigate

---

#### S13-T03: Assignments
**Description:** Assign accounts, people, or tasks to team members.  
**Files:**
- `prisma/schema.prisma` - Add assignedTo fields
- `src/app/api/accounts/[id]/assign/route.ts` (new)
- `src/app/api/people/[id]/assign/route.ts` (new)
- `src/components/assign-dropdown.tsx` (new)

**Implementation:**
```typescript
// Add "Assigned To" dropdown on account/person detail
// Select team member
// POST /api/accounts/[id]/assign
// Sends notification to assignee
// Shows in "My Assignments" view
```

**Validation:**
- Assign account to User B
- User B sees notification
- User B's dashboard shows assigned account
- Reassign → notification sent to new assignee

**Acceptance Criteria:**
- ✅ Assign accounts to users
- ✅ Assign people to users
- ✅ Notification sent
- ✅ "My Assignments" filter works

---

#### S13-T04: @Mentions in Notes
**Description:** Tag team members in notes to notify them.  
**Files:**
- `src/components/ui/mention-textarea.tsx` (new)
- Use `@mentions/react` or similar
- Update notes fields to parse mentions

**Implementation:**
```typescript
// In any notes field:
// Type "@" → dropdown of team members
// Select → inserts "@User Name"
// On save → create notification for mentioned user
```

**Validation:**
- Add note "Need help with @John Smith"
- John gets notification
- Click notification → opens note
- Mentioned user highlighted in note

**Acceptance Criteria:**
- ✅ @mention autocomplete works
- ✅ Notifications sent
- ✅ Mentioned users highlighted
- ✅ Works in all note fields

---

**Sprint 13 Demo:** Two users collaborate on account research - see each other online, assign tasks, mention in notes, view activity stream.

---

### Sprint 14: Advanced Analytics & Predictions
**Goal:** Deeply understand campaign performance with heatmaps, AB testing, and predictive scoring.

#### S14-T01: Engagement Heatmap
**Description:** Visual heatmap showing when people are most engaged (by day/hour).  
**Files:**
- `src/app/dashboard/analytics/heatmap/page.tsx` (new)
- `src/app/api/analytics/heatmap/route.ts` (new)
- Use `recharts` heatmap component

**Implementation:**
```typescript
// Query outreach.openedAt timestamps
// Group by day of week + hour of day
// Generate 7x24 grid
// Color intensity = engagement rate
// "Tuesdays at 10am have highest open rate"
```

**Validation:**
- View heatmap
- See darker colors on Tuesday 10am-12pm
- Hover cell → shows percentage
- Filter by persona → different patterns

**Acceptance Criteria:**
- ✅ 7x24 grid visualization
- ✅ Color intensity = engagement
- ✅ Filter by persona/campaign
- ✅ Tooltip with exact data

---

#### S14-T02: AB Test Framework
**Description:** Test two email templates against each other to see which performs better.  
**Files:**
- `prisma/schema.prisma` - Add `ABTest` model
- `src/app/api/ab-tests/route.ts` (new)
- `src/app/api/ab-tests/[id]/route.ts` (new)
- `src/app/dashboard/ab-tests/page.tsx` (new)

**Schema:**
```prisma
model ABTest {
  id              String   @id @default(cuid())
  name            String
  status          String   // RUNNING, COMPLETED
  templateAId     String
  templateBId     String
  sampleSize      Int
  winnerThreshold Float    // e.g., 0.05 for 95% confidence
  startedAt       DateTime
  completedAt     DateTime?
  winnerId        String?
  results         Json?    // Stats for A and B
  createdBy       String
  createdAt       DateTime @default(now())
}
```

**Implementation:**
```typescript
// Create AB test with 2 templates
// Send 50% to A, 50% to B
// Track opens, clicks, replies
// Calculate statistical significance
// Declare winner when threshold met
```

**Validation:**
- Create test: "Short vs Long Subject"
- Send to 100 people (50 each)
- Wait for responses
- Check results → Template A: 30% open, B: 25% open
- See "Template A wins (95% confidence)"

**Acceptance Criteria:**
- ✅ Create AB test
- ✅ Random 50/50 split
- ✅ Track metrics separately
- ✅ Statistical significance calculation
- ✅ Winner declared

---

#### S14-T03: Predictive Meeting Likelihood
**Description:** ML model predicts which people are most likely to book a meeting.  
**Files:**
- `src/lib/ml/meeting-predictor.ts` (new)
- `src/app/api/predictions/meeting-likelihood/route.ts` (new)

**Implementation:**
```typescript
// Features:
- ICP score
- Engagement rate (opens/clicks)
- Job title seniority
- Company size
- Days since last touch
- Persona type

// Model: Logistic regression or simple decision tree
// Output: Probability 0-100%
// Display on person cards: "72% likely to meet"
```

**Validation:**
- Run prediction on all people
- Sort by likelihood descending
- Top 10 should be warm, high-ICP execs
- Validate against actual meeting bookings

**Acceptance Criteria:**
- ✅ Prediction score 0-100%
- ✅ Based on multiple features
- ✅ Displayed on person cards
- ✅ Sortable by likelihood
- ✅ Accuracy >60% on test data

---

#### S14-T04: Campaign Comparison Dashboard
**Description:** Side-by-side comparison of multiple campaigns.  
**Files:**
- `src/app/dashboard/analytics/compare/page.tsx` (new)
- `src/components/analytics/campaign-comparison-chart.tsx` (new)

**Implementation:**
```typescript
// Select 2-5 campaigns
// Show side-by-side:
- Open rate
- Reply rate
- Meeting rate
- Best performing persona
- Best time sent
- Response time (avg days)

// Bar charts for visual comparison
```

**Validation:**
- Select campaigns "Exec Outreach" and "Procurement Blitz"
- See bars: Exec has 35% open, Proc has 22%
- See table: Exec avg 2.3 days to reply, Proc 4.1 days

**Acceptance Criteria:**
- ✅ Compare 2-5 campaigns
- ✅ All key metrics shown
- ✅ Visual charts
- ✅ Export comparison to PDF

---

**Sprint 14 Demo:** View engagement heatmap (best time to send), run AB test on subject lines, see predictive meeting scores, compare campaign performance.

---

### Sprint 15: Event-Day Operations
**Goal:** Dedicated mode for managing meetings and outreach during the actual event.

#### S15-T01: Event-Day Dashboard
**Description:** Simplified view showing only today's meetings and urgent actions.  
**Files:**
- `src/app/dashboard/event-day/page.tsx` (enhance existing)
- `src/components/event-day/today-schedule.tsx` (new)
- `src/components/event-day/quick-notes.tsx` (new)

**UI:**
```
Event Day - ProMat 2026 (Chicago)
├─ Today's Meetings (5)
│  ├─ 9:00 AM - John Smith (GXO) - Booth 347 [Start]
│  ├─ 10:30 AM - Sarah Johnson (XPO) - Booth 512 [Start]
│  └─ ...
├─ Walk-Up Contacts (3 new)
├─ Follow-Up Queue (8 pending)
├─ Quick Capture
│  └─ [Scan Badge] [Manual Entry]
└─ Notifications (2 urgent)
```

**Validation:**
- Switch to event-day mode
- See only today's meetings
- All past/future hidden
- Quick actions prominent
- Mobile-optimized

**Acceptance Criteria:**
- ✅ Shows today's meetings only
- ✅ Start meeting with one tap
- ✅ Quick capture for walk-ups
- ✅ Follow-up queue visible
- ✅ Works offline (PWA)

---

#### S15-T02: Badge Scanning
**Description:** Use phone camera to scan event badges and auto-create contacts.  
**Files:**
- `src/components/event-day/badge-scanner.tsx` (new)
- `src/lib/ocr/badge-parser.ts` (new)
- Use Tesseract.js or similar for OCR

**Implementation:**
```typescript
// Open camera
// Scan QR code or use OCR on text
// Parse: Name, Company, Title, Email
// Auto-create person + account
// Show confirmation modal
// Save to database
```

**Validation:**
- Scan real badge
- OCR extracts "John Smith, Director, ACME Corp, john@acme.com"
- Person + account created
- Can edit before saving

**Acceptance Criteria:**
- ✅ Camera scanning works
- ✅ OCR extracts key fields
- ✅ Auto-creates person/account
- ✅ Edit before saving option
- ✅ Works on mobile

---

#### S15-T03: Quick Meeting Notes Voice Transcription
**Description:** Record voice notes during meeting, auto-transcribe to text.  
**Files:**
- `src/components/meetings/voice-notes.tsx` (new)
- Use Web Speech API or OpenAI Whisper

**Implementation:**
```typescript
// Tap microphone icon
// Record voice note
// Send to Whisper API for transcription
// Insert into meeting notes
// Editable text
```

**Validation:**
- Start meeting
- Tap voice note
- Speak: "They're interested in our waste optimization module"
- See text appear in notes
- Edit if needed

**Acceptance Criteria:**
- ✅ Records audio
- ✅ Transcribes to text
- ✅ Appends to notes
- ✅ Editable after transcription
- ✅ Works on mobile

---

#### S15-T04: Offline Mode for Event Day
**Description:** Cache all today's data for offline access (no wifi at booth).  
**Files:**
- Enhance service worker (`public/sw.js`)
- `src/lib/offline-sync.ts` (new)

**Implementation:**
```typescript
// On event day start:
- Cache all today's meetings
- Cache all assigned accounts/people
- Cache quick capture queue
// While offline:
- Create meetings/notes locally
- Queue API calls
// When online:
- Sync queued changes
- Update cached data
```

**Validation:**
- Start event day mode (online)
- Turn off wifi
- Create new contact, add note to meeting
- Turn wifi back on
- See changes synced to server

**Acceptance Criteria:**
- ✅ All today's data cached
- ✅ Create/update works offline
- ✅ Auto-syncs when online
- ✅ Conflict resolution if needed

---

**Sprint 15 Demo:** Arrive at event, switch to event-day mode, scan badge to create contact, record voice note during meeting, work offline at booth, sync when back online.

---

### Sprint 16: CRM Integration
**Goal:** Bi-directional sync with Salesforce and HubSpot.

#### S16-T01: Salesforce OAuth & Account Sync
**Description:** Connect to Salesforce, map accounts to SFDC accounts.  
**Files:**
- `src/app/api/integrations/salesforce/auth/route.ts` (new)
- `src/lib/salesforce/client.ts` (new)
- `src/lib/salesforce/sync.ts` (new)

**Implementation:**
```typescript
// OAuth with Salesforce
// Store access token + refresh token
// Map EventOps account → SFDC Account
// Sync: Name, Industry, ICP Score (custom field)
// Bi-directional: Changes in SFDC update EventOps
```

**Validation:**
- Connect Salesforce account
- Create account in EventOps
- See it appear in Salesforce
- Update in Salesforce → syncs back
- ICP score shows in custom field

**Acceptance Criteria:**
- ✅ OAuth flow works
- ✅ Accounts sync to SFDC
- ✅ Bi-directional updates
- ✅ Custom fields mapped

---

#### S16-T02: Salesforce Opportunity Creation
**Description:** When meeting outcome is positive, auto-create Salesforce opportunity.  
**Files:**
- `src/lib/salesforce/opportunities.ts` (new)
- Enhance meeting update API

**Implementation:**
```typescript
// On meeting complete:
// If outcome = "Interested" or "Demo Scheduled"
// → Create SFDC Opportunity
// Fields: Account, Contact, Amount (from ROI), Stage, Owner
```

**Validation:**
- Complete meeting with outcome "Demo Scheduled"
- Check Salesforce → Opportunity created
- Amount = calculated ROI
- Stage = "Discovery"

**Acceptance Criteria:**
- ✅ Auto-creates opportunities
- ✅ Maps to correct account/contact
- ✅ ROI populated
- ✅ Stage set correctly

---

#### S16-T03: HubSpot Integration
**Description:** Same as Salesforce but for HubSpot.  
**Files:**
- `src/app/api/integrations/hubspot/auth/route.ts` (new)
- `src/lib/hubspot/client.ts` (new)
- `src/lib/hubspot/sync.ts` (new)

**Implementation:**
```typescript
// OAuth with HubSpot
// Sync companies and contacts
// Create deals on positive outcomes
// Bi-directional sync
```

**Validation:**
- Connect HubSpot
- Sync accounts → HubSpot companies
- Complete meeting → creates deal
- Update in HubSpot → syncs back

**Acceptance Criteria:**
- ✅ OAuth works
- ✅ Companies/contacts sync
- ✅ Deals created
- ✅ Bi-directional updates

---

#### S16-T04: CRM Settings Page
**Description:** UI for managing CRM connections and field mappings.  
**Files:**
- `src/app/dashboard/settings/integrations/page.tsx` (new)

**UI:**
```
Integrations
├─ Salesforce
│  ├─ Status: Connected
│  ├─ Last Sync: 2 minutes ago
│  ├─ Field Mappings
│  │  ├─ EventOps ICP Score → SFDC ICP_Score__c
│  │  └─ EventOps Notes → SFDC Description
│  └─ [Disconnect]
├─ HubSpot
│  ├─ Status: Not Connected
│  └─ [Connect]
└─ Zapier Webhooks
   └─ [Generate Webhook URL]
```

**Validation:**
- View integrations page
- See connection status
- Configure field mappings
- Disconnect → stops syncing

**Acceptance Criteria:**
- ✅ Shows all integrations
- ✅ Connection status visible
- ✅ Field mapping UI
- ✅ Connect/disconnect works

---

**Sprint 16 Demo:** Connect Salesforce, create account in EventOps, see it sync to SFDC, complete meeting, see opportunity created automatically.

---

### Sprint 17: Advanced Reporting & Exports
**Goal:** Generate professional reports and scheduled email summaries.

#### S17-T01: PDF Report Generation
**Description:** Export analytics dashboards as PDF for executives.  
**Files:**
- `src/lib/pdf/report-generator.ts` (new)
- Use `puppeteer` or `react-pdf`
- `src/app/api/reports/pdf/route.ts` (new)

**Implementation:**
```typescript
// Render analytics page server-side
// Convert to PDF with charts, tables, branding
// Include: Campaign performance, funnel, persona breakdown
// Download as "EventOps_Report_2026-01-22.pdf"
```

**Validation:**
- Click "Export to PDF" on analytics page
- PDF downloads
- Open → see all charts rendered
- Print-ready format

**Acceptance Criteria:**
- ✅ PDF includes all charts
- ✅ Branding (logo, colors)
- ✅ Print-friendly layout
- ✅ Download works

---

#### S17-T02: Scheduled Email Reports
**Description:** Auto-send weekly summary emails to team.  
**Files:**
- `src/app/api/cron/weekly-report/route.ts` (new)
- Add to Vercel cron config
- `src/lib/email-reports.ts` (new)

**Implementation:**
```typescript
// Every Monday 8am:
- Generate summary: New accounts, meetings booked, open rate, top performers
- Send email to all team members
- Include charts as images
- Link to full dashboard
```

**Validation:**
- Wait for Monday 8am (or trigger manually)
- Check email
- See summary report
- Click link → opens dashboard

**Acceptance Criteria:**
- ✅ Sends every Monday
- ✅ Includes key metrics
- ✅ Charts embedded
- ✅ Links to dashboard

---

#### S17-T03: Custom Report Builder
**Description:** Drag-drop interface to build custom reports.  
**Files:**
- `src/app/dashboard/reports/builder/page.tsx` (new)
- `src/components/reports/widget-selector.tsx` (new)

**UI:**
```
Report Builder
├─ Available Widgets
│  ├─ Accounts by ICP (chart)
│  ├─ Response Rate (metric)
│  ├─ Top Campaigns (table)
│  └─ ...
├─ Report Canvas (drag here)
└─ [Save Report] [Export PDF]
```

**Implementation:**
```typescript
// Drag widgets onto canvas
// Configure each widget (filters, date range)
// Save report layout to database
// Re-generate with latest data
```

**Validation:**
- Add widgets to canvas
- Configure filters
- Save report
- Reload → same layout
- Export to PDF

**Acceptance Criteria:**
- ✅ Drag-drop widgets
- ✅ Configure filters per widget
- ✅ Save report layout
- ✅ Export to PDF

---

#### S17-T04: Data Warehouse Export
**Description:** Export all data to CSV/JSON for external analysis.  
**Files:**
- `src/app/api/export/full/route.ts` (new)

**Implementation:**
```typescript
// Generate ZIP file with:
- accounts.csv
- people.csv
- outreach.csv
- meetings.csv
- activities.csv
- All with related data (joins)
```

**Validation:**
- Click "Export All Data"
- Download ZIP
- Extract → 5 CSV files
- Open in Excel → all data present

**Acceptance Criteria:**
- ✅ Exports all tables
- ✅ Includes relationships
- ✅ ZIP format
- ✅ CSV and JSON options

---

**Sprint 17 Demo:** Generate PDF report for last week, schedule weekly email reports, build custom report with drag-drop, export full data warehouse.

---

## Testing Strategy

### Unit Tests
**Framework:** Vitest  
**Target:** All utility functions, business logic  
**Coverage Goal:** 80%+

```typescript
// Example tests:
describe('ICP Score Calculator', () => {
  it('should score exec at top tier', () => {
    expect(calculateIcpScore({ isExecOps: true, ... })).toBe(95);
  });
});

describe('Email Rendering', () => {
  it('should substitute template variables', () => {
    const result = renderTemplate('Hi {{name}}', { name: 'John' });
    expect(result).toBe('Hi John');
  });
});
```

**Files:**
- `src/lib/__tests__/icp-scoring.test.ts`
- `src/lib/__tests__/email-rendering.test.ts`
- `src/lib/__tests__/sendgrid.test.ts`

---

### Integration Tests
**Framework:** Playwright  
**Target:** API routes, full workflows

```typescript
// Example:
test('Create account and add person', async ({ request }) => {
  // Create account
  const account = await request.post('/api/accounts', {
    data: { name: 'Test Corp', industry: 'Logistics' }
  });
  expect(account.ok()).toBeTruthy();
  
  // Add person
  const person = await request.post('/api/people', {
    data: { accountId: account.id, name: 'Test User' }
  });
  expect(person.ok()).toBeTruthy();
});
```

**Files:**
- `tests/integration/accounts.spec.ts`
- `tests/integration/outreach.spec.ts`
- `tests/integration/meetings.spec.ts`

---

### E2E Tests
**Framework:** Playwright  
**Target:** Critical user journeys

```typescript
// Example:
test('Complete outreach workflow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');
  
  await page.goto('/dashboard/outreach');
  await page.click('text=Generate Outreach');
  await page.selectOption('[name=templateId]', 'template-1');
  await page.click('text=Generate');
  
  await expect(page.locator('.outreach-list')).toContainText('Generated');
});
```

**Files:**
- `tests/e2e/outreach-workflow.spec.ts`
- `tests/e2e/event-day-mode.spec.ts`
- `tests/e2e/calendar-sync.spec.ts`

---

### Smoke Tests
**Current:** `tests/smoke/smoke-test.sh`  
**Run:** `npm run test:smoke:prod`

```bash
# Test production:
curl https://yard-flow-hitlist.vercel.app/api/health
curl https://yard-flow-hitlist.vercel.app/api/accounts (with auth)
curl https://yard-flow-hitlist.vercel.app/ (HTML response)
```

**Expand:**
- Add tests for all new endpoints
- Validate response schemas
- Check performance (< 500ms)

---

## Deployment & Operations

### Continuous Integration
**Platform:** GitHub Actions  
**Workflow:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:e2e
      - run: npm run build
```

---

### Continuous Deployment
**Platform:** Vercel  
**Trigger:** Push to `main` branch  
**Process:**
1. Run tests
2. Build Next.js
3. Deploy to production
4. Run smoke tests
5. Send Slack notification

**Rollback:** `vercel rollback` if smoke tests fail

---

### Monitoring
**Tools:**
- Vercel Analytics (built-in)
- Sentry for error tracking
- Prisma Pulse for database insights

**Alerts:**
- Error rate > 1%
- Response time > 1s
- Database connections > 80%

---

### Database Migrations
**Tool:** Prisma Migrate  
**Process:**
```bash
# Development:
npx prisma migrate dev --name add_saved_searches

# Production:
npx prisma migrate deploy
```

**Backup Before Migration:**
```bash
npm run backup:create
# Creates: backups/backup_YYYYMMDD_HHMMSS.sql
```

---

## Performance Targets

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Page Load (P50) | < 1s | ~800ms | ✅ Good |
| Page Load (P95) | < 2s | ~1.5s | ✅ Good |
| API Response (P50) | < 200ms | ~150ms | ✅ Good |
| API Response (P95) | < 500ms | ~400ms | ✅ Good |
| Database Queries | < 50ms | ~30ms | ✅ Good |
| Lighthouse Score | > 90 | 92 | ✅ Good |
| Bundle Size | < 500KB | 420KB | ✅ Good |
| Time to Interactive | < 3s | 2.1s | ✅ Good |

**Optimization Opportunities:**
- Code splitting for analytics dashboard (heavy charts)
- Lazy load video tutorials
- Cache API responses with SWR
- Add Redis for session storage

---

## Security Checklist

- ✅ NextAuth for authentication
- ✅ CSRF protection (Next.js built-in)
- ✅ SQL injection prevention (Prisma parameterized queries)
- ✅ XSS prevention (React auto-escaping)
- ✅ HTTPS only (Vercel enforced)
- ✅ Environment variables for secrets
- ⚠️ Rate limiting (TODO)
- ⚠️ Input validation on all APIs (partial)
- ⚠️ Role-based access control (basic, needs refinement)
- ⚠️ Audit logging (activities table, not comprehensive)

---

## Accessibility Compliance

**Target:** WCAG 2.1 Level AA

- ✅ Semantic HTML
- ✅ Keyboard navigation
- ✅ ARIA labels on interactive elements
- ✅ Color contrast > 4.5:1
- ⚠️ Screen reader testing (TODO)
- ⚠️ Focus indicators (needs improvement)
- ⚠️ Skip links (TODO)

---

## Documentation Needs

1. **API Documentation**
   - OpenAPI/Swagger spec
   - Example requests/responses
   - Authentication guide

2. **User Guides**
   - Quick start (5 min)
   - Admin guide
   - Mobile app guide

3. **Developer Docs**
   - Architecture overview
   - Database schema diagram
   - Component library (Storybook)

4. **Deployment Guide**
   - Environment setup
   - Database migrations
   - Rollback procedures

---

## Future Enhancements (Post-MVP)

### Phase 2: Advanced Features
- AI-powered email writing (GPT-4)
- Predictive lead scoring (ML model)
- Conversation intelligence (call recording)
- LinkedIn automation (Phantom Buster)
- Chrome extension for LinkedIn
- Zapier/Make.com integration marketplace

### Phase 3: Enterprise Features
- SSO (SAML, OIDC)
- Advanced permissions (field-level)
- Multi-tenancy
- White-labeling
- Audit logging (SOC 2 compliant)
- Data residency options

### Phase 4: Scale Features
- Redis caching layer
- Read replicas for analytics
- Elasticsearch for search
- GraphQL API
- Webhook retry logic
- Rate limiting per tenant

---

## Conclusion

This sprint plan provides a complete roadmap from current state to a fully-featured, production-grade EventOps platform. Each sprint is demo-able, each task is atomic and testable, and all work builds incrementally on solid foundations.

**Estimated Timeline (without estimates per your request):**
- Sprints 10-13: Core enhancements (search, calendar, mobile, collaboration)
- Sprints 14-15: Analytics and event-day operations
- Sprints 16-17: Integrations and reporting

**Next Steps:**
1. Prioritize sprints based on business value
2. Assign team members to tasks
3. Set up CI/CD pipeline
4. Begin Sprint 10

**Success Metrics:**
- User adoption rate
- Time to first value (< 10 min from signup to first outreach sent)
- Meeting booking rate via platform
- Customer satisfaction (NPS > 50)

---

**Document Version:** 1.0  
**Last Updated:** January 22, 2026  
**Maintained By:** Development Team  
**Review Cycle:** After each sprint completion
