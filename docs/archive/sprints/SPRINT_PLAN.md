# EventOps - Manifest 2026 Execution Platform
## Comprehensive Sprint Plan & Technical Roadmap

---

## Executive Summary

**Project Goal**: Build an intelligent event execution platform that combines AI-powered research, personalized outreach, ROI-driven sales strategy, and Manifest app integration to maximize meeting conversions at Manifest 2026.

**Current State**: 
- ✅ Core CRUD functionality (Events, Accounts, People)
- ✅ CSV import with 2,653 companies and 5,409 contacts
- ✅ ICP scoring system with auto-calculation
- ✅ AI-powered company research (dossiers with facility count, locations, operational scale)
- ✅ AI-powered outreach generation (personalized, not template-based)
- 🚧 OpenAI integration needs debugging (API key configuration)

**Strategic Approach**:
1. Use AI research to identify high-value accounts based on facility count and operational scale
2. Calculate contact-specific ROI using YardFlow calculator data
3. Generate hyper-personalized outreach at the individual contact level
4. Integrate with Manifest app for direct meeting requests
5. Track and optimize conversion rates across personas and account tiers

---

## Sprint 0: Foundation & Data Quality ✅ COMPLETED

**Goal**: Establish solid technical foundation with clean data and working authentication.

### Task 0.1: Project Setup
- **Description**: Initialize Next.js 14 project with TypeScript, Prisma, PostgreSQL
- **Validation**: `npm run dev` starts without errors, database connection successful
- **Acceptance**: Repository initialized, dependencies installed, .env configured
- **Status**: ✅ Complete

### Task 0.2: Authentication System
- **Description**: Implement NextAuth v5 with JWT-based credentials provider
- **Validation**: User can login at `/login`, session persists across requests
- **Acceptance**: Role-based access control working, AUTH_SECRET configured
- **Status**: ✅ Complete

### Task 0.3: Database Schema Design
- **Description**: Design and implement core models (User, Event, TargetAccount, Person, ScoreHistory, Outreach)
- **Validation**: `npx prisma db push` executes without errors
- **Acceptance**: All relationships defined, indexes created, seed data works
- **Status**: ✅ Complete

---

## Sprint 1: Core CRUD & Data Management ✅ COMPLETED

**Goal**: Build functional UI for managing events, accounts, and contacts with full CRUD operations.

### Task 1.1: Events Management
- **Description**: Create `/dashboard/events` with list, create, edit, delete functionality
- **Validation**: Can create event, view list, edit details, delete event (cascade)
- **Acceptance**: Form validation working, search/filter by date and status
- **Status**: ✅ Complete

### Task 1.2: Accounts Management
- **Description**: Create `/dashboard/accounts` with company CRUD and ICP score display
- **Validation**: Can manage 2,653 accounts, search by name, filter by ICP score
- **Acceptance**: Pagination working, bulk delete with confirmation
- **Status**: ✅ Complete

### Task 1.3: People Management
- **Description**: Create `/dashboard/people` with contact CRUD and persona flags
- **Validation**: Can manage 5,409 contacts, filter by persona (ExecOps, Ops, Proc, Sales, Tech, Non-Ops)
- **Acceptance**: Account linking works, persona checkboxes functional
- **Status**: ✅ Complete

### Task 1.4: Bulk Delete Functionality
- **Description**: Add checkbox selection and bulk delete with confirmation dialogs
- **Validation**: Can select multiple items, confirmation dialog appears, cascade delete works
- **Acceptance**: Optimistic UI updates, error handling for failed deletions
- **Status**: ✅ Complete

---

## Sprint 2: CSV Import & Data Enrichment ✅ COMPLETED

**Goal**: Import existing hitlist data with smart column mapping and duplicate detection.

### Task 2.1: CSV Upload Component
- **Description**: Build file upload UI with drag-drop, CSV parsing using PapaParse
- **Validation**: Can upload CSV, preview shows first 5 rows, file size limit enforced
- **Acceptance**: Supports .csv and .xlsx, handles large files (5k+ rows)
- **Status**: ✅ Complete

### Task 2.2: Column Mapping Interface
- **Description**: Auto-detect columns, allow manual mapping to database fields
- **Validation**: Auto-mapping detects "Company Name" → "name", manual override works
- **Acceptance**: Supports all Person fields including persona flags (isExecOps, isOps, etc.)
- **Status**: ✅ Complete

### Task 2.3: Duplicate Detection
- **Description**: Check for existing companies/contacts by name+email, offer merge/skip/replace
- **Validation**: Detects duplicates, shows merge UI, doesn't create duplicates
- **Acceptance**: Fuzzy matching for company names (case-insensitive, trim whitespace)
- **Status**: ✅ Complete

### Task 2.4: Bulk Import Execution
- **Description**: Process CSV rows in batches, show progress bar, error reporting
- **Validation**: Can import 2,653 companies + 5,409 contacts without timeout
- **Acceptance**: Progress updates every 100 rows, detailed error log for failed rows
- **Status**: ✅ Complete

---

## Sprint 3: ICP Scoring & Prioritization ✅ COMPLETED

**Goal**: Automatically calculate and track ICP/TAM scores for account prioritization.

### Task 3.1: ICP Scoring Algorithm
- **Description**: Calculate weighted score based on: industry match, company size, tech stack, engagement
- **Validation**: Top accounts (Unilever, Thrive Market, Fabletics) score 87-91
- **Acceptance**: Configurable weights, score updates on account data change
- **Status**: ✅ Complete

### Task 3.2: Score History Tracking
- **Description**: Store score changes in ScoreHistory model with audit trail
- **Validation**: Can view score history for an account, see who/when/why it changed
- **Acceptance**: Automatic tracking on account updates, manual score override option
- **Status**: ✅ Complete

### Task 3.3: Account List Sorting/Filtering
- **Description**: Sort accounts by ICP score, filter by score range (e.g., 90+, 75-89, <75)
- **Validation**: Sorting works, filter shows correct counts, URL params persist filters
- **Acceptance**: Top tier (90+), Mid tier (75-89), Low tier (<75) filters
- **Status**: ✅ Complete

---

## Sprint 4: AI-Powered Research System ✅ COMPLETED

**Goal**: Generate comprehensive company dossiers using AI to inform personalized outreach.

### Task 4.1: OpenAI Integration Setup
- **Description**: Install OpenAI SDK, configure API key, create research utility functions
- **Validation**: `generateCompanyResearch()` returns JSON with company data
- **Acceptance**: Error handling for API failures, rate limiting consideration
- **Status**: ✅ Complete

### Task 4.2: CompanyDossier Model
- **Description**: Add CompanyDossier model with fields: overview, news, pain points, facility count, locations, operational scale
- **Validation**: `npx prisma db push` adds table, 1:1 relation with TargetAccount works
- **Acceptance**: Stores JSON rawData, tracks researchedAt/researchedBy
- **Status**: ✅ Complete

### Task 4.3: Research Generation API
- **Description**: Create `/api/accounts/[id]/research` POST endpoint to generate/cache dossiers
- **Validation**: Generates dossier on first call, returns cached data on subsequent calls (7-day TTL)
- **Acceptance**: Includes facility count estimation, geographic markets, operational scale
- **Status**: ✅ Complete

### Task 4.4: Research UI Trigger
- **Description**: Add "Generate Research" button on account detail page
- **Validation**: Button triggers research, shows loading spinner, displays dossier when complete
- **Acceptance**: Error messages for API failures, retry option on failure
- **Status**: 🚧 Partially complete (button exists, needs enhanced UI)

---

## Sprint 5: AI-Powered Outreach Generation ✅ COMPLETED

**Goal**: Replace template-based outreach with AI-generated personalized messages.

### Task 5.1: Personalized Outreach Algorithm
- **Description**: Create `generatePersonalizedOutreach()` using company dossier + contact persona
- **Validation**: Generated messages reference company-specific pain points and context
- **Acceptance**: Natural tone (not salesy), appropriate length for channel (Email vs LinkedIn)
- **Status**: ✅ Complete

### Task 5.2: Bulk Outreach Generation API
- **Description**: Create `/api/outreach/generate-ai` POST endpoint for bulk generation
- **Validation**: Can generate 10+ messages in one request, uses cached dossiers
- **Acceptance**: Returns success count, detailed results, error handling per contact
- **Status**: ✅ Complete (needs debugging)

### Task 5.3: Outreach Generation UI
- **Description**: Build generation form with persona filters, ICP score filter, channel selection
- **Validation**: Preview shows filtered contact count, confirmation for large batches (>20)
- **Acceptance**: AI branding (sparkles icon, gradient), status updates during generation
- **Status**: ✅ Complete

### Task 5.4: Outreach List View
- **Description**: Display generated outreach with filtering, export to CSV
- **Validation**: Can view all drafts, filter by status/channel/persona, export selected
- **Acceptance**: Pagination, bulk status updates, delete functionality
- **Status**: ✅ Complete

---

## Sprint 6: 🚀 PRIORITY - Contact-Level Intelligence & ROI Integration

**Goal**: Generate contact-specific insights and ROI calculations to maximize outreach effectiveness.

### Task 6.1: Contact Research Enhancement
- **Description**: Extend AI research to generate contact-specific talking points based on title and persona
- **Technical Details**:
  - Create `generateContactInsights(personName, title, persona, companyDossier)` function
  - Add ContactInsights model: `personId`, `roleContext`, `likelyPainPoints`, `suggestedApproach`, `roiOpportunity`
  - Store insights in database with 30-day cache
- **Validation**: Test with ExecOps contact at GXO (14 people), verify different insights for Ops vs Procurement
- **Acceptance Criteria**:
  - ✅ Different insights for same company, different personas
  - ✅ ROI opportunity estimation specific to role (e.g., "20% reduction in carrier costs" for Procurement)
  - ✅ Caching works to avoid redundant API calls
- **Tests**: 
  - Unit test: `generateContactInsights()` returns valid JSON
  - Integration test: API endpoint creates ContactInsights record
  - E2E test: UI shows contact-specific insights on person detail page

### Task 6.2: ROI Calculator Integration
- **Description**: Integrate YardFlow ROI calculator to generate account-specific value propositions
- **Technical Details**:
  - Create `/api/roi/calculate` endpoint that calls YardFlow ROI API
  - Input: `facilityCount`, `operationalScale`, `companySize`, `persona`
  - Output: Estimated annual savings, payback period, key metrics
  - Store ROI calculations in new `RoiCalculation` model linked to account
- **Validation**: For Unilever (91 ICP score, large scale), calculate ROI based on facility count
- **Acceptance Criteria**:
  - ✅ API calls YardFlow calculator: `https://flow-state-klbt-fq6evafym-caseys-projects-2a50de81.vercel.app/roi/`
  - ✅ Stores calculation results (annual savings, payback, assumptions)
  - ✅ UI displays ROI on account detail page
  - ✅ ROI data included in AI outreach generation context
- **Tests**:
  - Unit test: ROI calculation logic with mock facility count
  - Integration test: API endpoint returns valid ROI data
  - E2E test: Account detail page shows ROI card

### Task 6.3: Enhanced Outreach with ROI Data
- **Description**: Update AI outreach generation to include ROI-driven value propositions
- **Technical Details**:
  - Modify `generatePersonalizedOutreach()` to accept `roiData` parameter
  - Prompt engineering: Include ROI metrics in outreach generation context
  - Example: "Based on your 15 facilities, we've seen similar companies save $2.3M annually..."
- **Validation**: Generate outreach for Procurement persona at account with ROI data, verify ROI mentioned
- **Acceptance Criteria**:
  - ✅ Outreach references specific ROI metrics when available
  - ✅ Falls back gracefully if ROI data not calculated
  - ✅ ROI numbers are realistic and relevant to persona
- **Tests**:
  - Unit test: Outreach generation with/without ROI data
  - Integration test: Full flow - research → ROI → outreach with ROI context

### Task 6.4: Contact Insight UI
- **Description**: Build person detail page showing contact-specific insights and suggested approach
- **Technical Details**:
  - Create `/dashboard/people/[id]` page
  - Display: Contact info, account context, company dossier summary, contact insights, ROI opportunity
  - Add "Generate Insights" button to trigger research
  - Add "Generate Outreach" button with channel selector
- **Validation**: View person detail for "North Winship" at Shiplify, see role-specific insights
- **Acceptance Criteria**:
  - ✅ Shows company dossier (if available)
  - ✅ Shows contact insights (if generated)
  - ✅ Shows ROI opportunity specific to role
  - ✅ Quick action buttons: Generate Insights, Generate Outreach, View in Manifest
- **Tests**:
  - E2E test: Navigate to person detail, click Generate Insights, verify insights appear

---

## Sprint 7: 🚀 PRIORITY - Email Enrichment & Manifest Integration

**Goal**: Find contact emails and integrate with Manifest app for direct meeting requests.

### Task 7.1: Email Enrichment Research
- **Description**: Research and integrate email finding APIs (Hunter.io, Apollo.io, Clearbit, or RocketReach)
- **Technical Details**:
  - Evaluate APIs: Hunter.io (most common), Apollo.io (best for B2B), Clearbit (enterprise)
  - Choose based on: pricing, accuracy, rate limits, API simplicity
  - Create `/api/enrichment/email` endpoint
  - Input: `name`, `companyName`, `companyDomain`
  - Output: `email`, `confidence`, `source`
- **Validation**: Test with 10 contacts from Manifest app list, verify email accuracy
- **Acceptance Criteria**:
  - ✅ API selected and integrated
  - ✅ Rate limiting implemented (avoid burning credits)
  - ✅ Confidence score stored (0-100)
  - ✅ Emails validated (basic regex + DNS check)
- **Tests**:
  - Unit test: Email validation logic
  - Integration test: API returns email for known contact (test account)
  - E2E test: Bulk enrichment for 10 contacts

### Task 7.2: Bulk Email Enrichment
- **Description**: Add bulk enrichment UI to find emails for multiple contacts
- **Technical Details**:
  - Create `/dashboard/people/enrich` page
  - Filter contacts: Missing email, by persona, by ICP score
  - Queue-based processing (avoid rate limits)
  - Store enrichment results: `emailFound`, `confidence`, `enrichedAt`, `enrichedBy`
- **Validation**: Enrich 50 contacts missing emails, verify results stored
- **Acceptance Criteria**:
  - ✅ Shows contact count before enrichment
  - ✅ Progress bar during enrichment
  - ✅ Results table: name, company, email found, confidence
  - ✅ Option to review/approve before saving
- **Tests**:
  - Integration test: Queue processes 50 contacts without rate limit errors
  - E2E test: UI shows progress, displays results

### Task 7.3: Manifest App Integration Research
- **Description**: Reverse-engineer Manifest app API to enable programmatic meeting requests
- **Technical Details**:
  - Analyze Manifest app network requests (browser DevTools)
  - Identify: Authentication method, API endpoints, request format
  - Document: POST `/api/meetings/request` endpoint structure
  - Test: Send meeting request via API (if possible)
  - Alternative: Generate formatted text for manual paste (250 char limit)
- **Validation**: Send test meeting request to dummy account via Manifest API (or format for manual use)
- **Acceptance Criteria**:
  - ✅ API endpoints documented (or manual workflow defined)
  - ✅ 250 character constraint handled
  - ✅ Persona-specific templates for meeting requests
  - ✅ Fallback: Export meeting request text to clipboard
- **Tests**:
  - Manual test: Send meeting request via Manifest app
  - Integration test: API call succeeds (if API access available)

### Task 7.4: Manifest Meeting Request Generator
- **Description**: Build UI to generate 250-char meeting requests for Manifest app
- **Technical Details**:
  - Create `/dashboard/manifest/requests` page
  - Filter: Contacts with emails, by persona, by ICP score
  - Generate short, compelling meeting request using AI
  - Prompt: "Write a 250-character meeting request for {name} at {company}. Persona: {persona}. Company context: {dossier summary}. Include clear value prop."
  - Copy to clipboard functionality
  - Track: Requested, Accepted, Declined status
- **Validation**: Generate requests for 10 top-tier contacts, verify under 250 chars
- **Acceptance Criteria**:
  - ✅ AI-generated requests are concise and compelling
  - ✅ Character count shown in real-time
  - ✅ Copy to clipboard works
  - ✅ Batch generation for multiple contacts
  - ✅ Export to CSV for bulk processing
- **Tests**:
  - Unit test: 250-char limit enforced
  - E2E test: Generate request, copy to clipboard, verify format

### Task 7.5: Manifest App Deep Link Integration
- **Description**: Create deep links to Manifest app profiles (if supported)
- **Technical Details**:
  - Research Manifest app URL structure: `matchmaking.grip.events/manifestvegas2026/app/home/network/interested-in-you`
  - Create deep link helper: `getManifestProfileUrl(personName)`
  - Add "View in Manifest" button on person detail page
  - Track: Last viewed in Manifest, meeting request sent
- **Validation**: Click "View in Manifest" button, verify opens correct profile
- **Acceptance Criteria**:
  - ✅ Deep link opens Manifest app (web or mobile)
  - ✅ Falls back to search if direct link not possible
  - ✅ Tracks last viewed timestamp
- **Tests**:
  - E2E test: Click button, verify Manifest app opens

---

## Sprint 8: 🆕 Campaign Management & Execution Tracking

**Goal**: Build campaign orchestration to manage multi-touch outreach across channels.

### Task 8.1: Campaign Model & Planning
- **Description**: Create Campaign model to group outreach efforts by goal/timeline
- **Technical Details**:
  - Add Campaign model: `name`, `description`, `targetPersonas`, `minIcpScore`, `startDate`, `endDate`, `status`, `goals`
  - Relationships: Campaign hasMany Outreach (link existing outreach to campaigns)
  - Add campaign selection during outreach generation
  - Campaign goals: Meeting requests, email replies, LinkedIn connections
- **Validation**: Create "Top Tier Outreach" campaign targeting Procurement at 90+ ICP accounts
- **Acceptance Criteria**:
  - ✅ Can create campaign with filters
  - ✅ Outreach linked to campaigns
  - ✅ Campaign dashboard shows progress
- **Tests**:
  - Unit test: Campaign model validation
  - Integration test: Create campaign, generate outreach, verify linkage
  - E2E test: Campaign dashboard displays metrics

### Task 8.2: Multi-Touch Sequences
- **Description**: Define outreach sequences (e.g., LinkedIn → Email → Manifest Request)
- **Technical Details**:
  - Add Sequence model: `name`, `steps` (JSON array of touchpoints)
  - Each step: `channel`, `delayDays`, `templateType`
  - Link Outreach to SequenceStep
  - Auto-schedule next touchpoint based on previous response
  - Example sequence: Day 0 (LinkedIn), Day 3 (Email if no response), Day 7 (Manifest request)
- **Validation**: Create 3-touch sequence, verify automated scheduling
- **Acceptance Criteria**:
  - ✅ Sequences defined in UI
  - ✅ Auto-scheduling based on rules (if no response after X days)
  - ✅ Manual override option
  - ✅ Sequence pause/resume functionality
- **Tests**:
  - Unit test: Sequence scheduling logic
  - Integration test: Create sequence, generate outreach, verify next step scheduled
  - E2E test: View sequence progress in UI

### Task 8.3: Outreach Status Tracking
- **Description**: Track outreach lifecycle from draft → sent → responded
- **Technical Details**:
  - Expand OutreachStatus enum: DRAFT, SCHEDULED, SENT, OPENED, RESPONDED, BOUNCED, NO_RESPONSE
  - Add tracking fields: `sentAt`, `openedAt`, `respondedAt`, `bouncedAt`
  - Manual status updates (until email/LinkedIn integration built)
  - Bulk status updates (e.g., mark 10 as SENT)
- **Validation**: Update status for 20 outreach records, verify audit trail
- **Acceptance Criteria**:
  - ✅ Status transitions valid (can't go from SENT to DRAFT)
  - ✅ Timestamps auto-populated
  - ✅ Bulk update UI functional
  - ✅ Status history tracked
- **Tests**:
  - Unit test: Status transition validation
  - Integration test: Bulk status update API
  - E2E test: Update status via UI, verify in database

### Task 8.4: Campaign Analytics Dashboard
- **Description**: Build analytics view showing campaign performance metrics
- **Technical Details**:
  - Create `/dashboard/campaigns/[id]/analytics` page
  - Metrics: Total outreach, sent count, response rate, meeting requests, by persona breakdown
  - Charts: Response rate over time, channel performance, persona effectiveness
  - Use Recharts or Chart.js for visualizations
- **Validation**: View analytics for "Top Tier Outreach" campaign, verify metrics accurate
- **Acceptance Criteria**:
  - ✅ Real-time metrics (not cached)
  - ✅ Date range filter
  - ✅ Export to PDF/CSV
  - ✅ Persona comparison chart
- **Tests**:
  - Unit test: Metric calculation functions
  - Integration test: API returns correct aggregated data
  - E2E test: Dashboard loads, charts render

---

## Sprint 9: 🆕 Advanced Research & Facility Intelligence

**Goal**: Deep-dive research on facility count, locations, and operational scale for targeted ROI pitches.

### Task 9.1: Facility Count Data Enrichment
- **Description**: Enhance AI research to accurately estimate facility count from public data
- **Technical Details**:
  - Improve research prompt: Ask for specific sources (e.g., "Check Manta, ZoomInfo, LinkedIn company page")
  - Cross-reference multiple sources
  - Add confidence score to facility count estimate
  - Store data source attribution
- **Validation**: Research 10 companies, manually verify facility count accuracy
- **Acceptance Criteria**:
  - ✅ Facility count within 20% accuracy for 80% of researched companies
  - ✅ Confidence score stored (LOW, MEDIUM, HIGH)
  - ✅ Sources cited in dossier
- **Tests**:
  - Manual validation test: Compare AI estimates to known facility counts
  - Integration test: Research endpoint returns confidence score

### Task 9.2: Location Mapping
- **Description**: Map facility locations to identify geographic clusters
- **Technical Details**:
  - Extract city/state from location data
  - Geocode locations (Google Maps API or Mapbox)
  - Add Location model: `accountId`, `address`, `city`, `state`, `zip`, `lat`, `lng`, `facilityType`
  - Display locations on map (Mapbox GL JS or Google Maps)
- **Validation**: Map shows Unilever's facilities across regions
- **Acceptance Criteria**:
  - ✅ Locations geocoded accurately
  - ✅ Map displays facility pins
  - ✅ Cluster visualization for companies with 10+ facilities
  - ✅ Filter by facility type (warehouse, DC, retail, manufacturing)
- **Tests**:
  - Integration test: Geocoding API returns lat/lng
  - E2E test: Map renders with facility pins

### Task 9.3: Operational Scale Classification
- **Description**: Classify companies by operational scale for targeted messaging
- **Technical Details**:
  - Create scale categories: Local (<5 facilities), Regional (5-25), National (25-100), Global (100+)
  - Auto-classify based on facility count and locations
  - Store classification in `operationalScale` field
  - Use in outreach generation: Different pitch for local vs global
- **Validation**: Verify Unilever classified as "Global", Shiplify as "Regional"
- **Acceptance Criteria**:
  - ✅ Auto-classification accurate
  - ✅ Manual override option
  - ✅ Scale-specific messaging templates
  - ✅ Filter accounts by scale
- **Tests**:
  - Unit test: Classification algorithm
  - Integration test: Bulk re-classification of existing accounts
  - E2E test: Account list filtered by scale

### Task 9.4: Competitive Intelligence
- **Description**: Research competitors and tech stack for each account
- **Technical Details**:
  - Expand AI research: "Who are {company}'s main competitors? What technologies do they likely use?"
  - Add fields to CompanyDossier: `competitors` (JSON array), `techStack` (JSON array)
  - Use tech stack for personalization: "We integrate with your existing WMS..."
- **Validation**: Research Unilever, verify competitors (P&G, Nestlé) and tech stack (SAP, Oracle)
- **Acceptance Criteria**:
  - ✅ Competitors list accurate
  - ✅ Tech stack includes WMS, TMS, ERP systems
  - ✅ Data used in outreach personalization
- **Tests**:
  - Manual validation: Compare AI research to known competitors/tech
  - Integration test: Research API returns competitors and tech stack

---

## Sprint 10: 🆕 Automation & Integration

**Goal**: Automate repetitive tasks and integrate with external tools (CRM, email, LinkedIn).

### Task 10.1: Email Integration (SendGrid/Mailgun)
- **Description**: Send emails directly from EventOps instead of manual copy-paste
- **Technical Details**:
  - Choose email provider: SendGrid (simple API) or Mailgun (better deliverability)
  - Create `/api/outreach/send-email` endpoint
  - Track email opens (tracking pixel) and clicks (link wrapping)
  - Auto-update outreach status: SENT → OPENED → RESPONDED
  - Handle bounces and unsubscribes
- **Validation**: Send test email, verify tracking works
- **Acceptance Criteria**:
  - ✅ Emails sent successfully
  - ✅ Open tracking works (pixel loaded)
  - ✅ Click tracking works (links wrapped)
  - ✅ Status auto-updates based on tracking events
  - ✅ Unsubscribe link included
- **Tests**:
  - Integration test: Send email via API, verify delivery
  - E2E test: Send email, open it, verify status updates to OPENED

### Task 10.2: LinkedIn Integration (Phantom Buster or Manual)
- **Description**: Automate LinkedIn connection requests and messages
- **Technical Details**:
  - Option A: Use Phantom Buster API for automation (requires LinkedIn account)
  - Option B: Generate LinkedIn message, copy to clipboard (manual send)
  - Track LinkedIn connection status: PENDING, CONNECTED, DECLINED
  - Track message sent/replied status
- **Validation**: Send 5 LinkedIn messages via Phantom Buster, track responses
- **Acceptance Criteria**:
  - ✅ LinkedIn messages generated (Option B minimum)
  - ✅ Phantom Buster integration working (Option A if feasible)
  - ✅ Connection status tracked
  - ✅ Respects LinkedIn daily limits (20-30 requests/day)
- **Tests**:
  - Manual test: Send LinkedIn message, verify delivery
  - Integration test: Phantom Buster API call succeeds (if using)

### Task 10.3: CRM Sync (HubSpot/Salesforce)
- **Description**: Sync contacts and activities to CRM for sales team visibility
- **Technical Details**:
  - Choose CRM: HubSpot (easier API) or Salesforce (enterprise)
  - Sync contacts: Person → CRM Contact, TargetAccount → CRM Company
  - Sync activities: Outreach → CRM Activity (Email Sent, Meeting Requested)
  - Bi-directional sync: CRM updates flow back to EventOps
- **Validation**: Create contact in EventOps, verify appears in HubSpot
- **Acceptance Criteria**:
  - ✅ Contacts synced with all fields
  - ✅ Activities logged in CRM
  - ✅ Sync runs automatically (webhook or cron)
  - ✅ Conflict resolution (e.g., both systems updated same contact)
- **Tests**:
  - Integration test: Create contact, verify CRM API called
  - E2E test: Contact appears in CRM dashboard

### Task 10.4: Automated Research Refresh
- **Description**: Automatically refresh company dossiers periodically
- **Technical Details**:
  - Create cron job (Vercel Cron or GitHub Actions)
  - Schedule: Weekly research refresh for top 100 accounts (ICP 75+)
  - Detect changes: Compare new research to old, flag significant changes
  - Alert: Email notification if major news (e.g., merger, expansion)
- **Validation**: Cron runs weekly, refreshes 100 dossiers, sends alert for 1 company with news
- **Acceptance Criteria**:
  - ✅ Cron job runs on schedule
  - ✅ Only researches accounts with old data (>7 days)
  - ✅ Change detection works (diff algorithm)
  - ✅ Alerts sent via email
- **Tests**:
  - Integration test: Cron job trigger, verify API calls
  - Unit test: Change detection algorithm

---

## Sprint 11: 🆕 Event Day Execution & Meeting Management

**Goal**: Build tools for managing meetings and tasks during the actual Manifest 2026 event.

### Task 11.1: Meeting Scheduler
- **Description**: Calendar view of scheduled meetings with contacts
- **Technical Details**:
  - Add Meeting model: `personId`, `scheduledAt`, `duration`, `location`, `status`, `notes`, `meetingType`
  - Integration with calendar (Google Calendar API or iCal export)
  - Drag-drop scheduling interface (FullCalendar.js)
  - Send calendar invites to contacts
- **Validation**: Schedule 5 meetings, export to Google Calendar, verify sync
- **Acceptance Criteria**:
  - ✅ Calendar view shows all meetings
  - ✅ Drag-drop to reschedule
  - ✅ Send invites via email
  - ✅ Sync with Google/Outlook calendar
  - ✅ Conflict detection (double-booking)
- **Tests**:
  - Integration test: Create meeting, export to iCal
  - E2E test: Calendar UI loads, drag-drop works

### Task 11.2: Meeting Preparation
- **Description**: Auto-generate meeting prep notes for each contact
- **Technical Details**:
  - Create `/api/meetings/[id]/prep` endpoint
  - Generate prep doc: Company dossier summary, contact insights, ROI talking points, questions to ask
  - Export to PDF or print view
  - Track: Prep doc generated, viewed, printed
- **Validation**: Generate prep doc for Unilever meeting, verify includes ROI data
- **Acceptance Criteria**:
  - ✅ Prep doc concise (1 page)
  - ✅ Includes key talking points
  - ✅ ROI data highlighted
  - ✅ Questions tailored to persona
  - ✅ PDF export works
- **Tests**:
  - Unit test: Prep doc generation
  - E2E test: Generate and download PDF

### Task 11.3: Post-Meeting Follow-Up
- **Description**: Track meeting outcomes and auto-generate follow-up tasks
- **Technical Details**:
  - Add meeting outcome fields: `outcome`, `nextSteps`, `followUpDate`, `dealStage`
  - Generate follow-up email based on meeting notes
  - Create tasks from next steps (e.g., "Send pricing proposal by Friday")
  - Link to CRM deal stage
- **Validation**: Log meeting outcome, verify follow-up email generated
- **Acceptance Criteria**:
  - ✅ Outcome dropdown: Interested, Not Interested, Follow-Up Needed, Deal Opportunity
  - ✅ Follow-up email auto-generated
  - ✅ Tasks created with due dates
  - ✅ CRM deal stage updated
- **Tests**:
  - Integration test: Log outcome, verify email API called
  - E2E test: Create tasks from meeting notes

### Task 11.4: Event Day Dashboard
- **Description**: Real-time dashboard for event execution team
- **Technical Details**:
  - Create `/dashboard/event-day` page
  - Display: Today's meetings, pending tasks, outreach sent, responses received
  - Live updates (WebSocket or polling)
  - Quick actions: Check-in for meeting, mark task complete, send follow-up
  - Team collaboration: Assign tasks, share notes
- **Validation**: Open dashboard during event, verify real-time updates
- **Acceptance Criteria**:
  - ✅ Real-time updates (5-second refresh)
  - ✅ Mobile-responsive (use on phone/tablet)
  - ✅ Quick actions work without leaving page
  - ✅ Team member activity visible
- **Tests**:
  - Integration test: WebSocket connection established
  - E2E test: Dashboard updates when meeting status changes

---

## Sprint 12: 🆕 Reporting & Optimization

**Goal**: Build comprehensive reporting to measure ROI and optimize future events.

### Task 12.1: Campaign Performance Report
- **Description**: Detailed analytics on outreach effectiveness by persona, channel, and account tier
- **Technical Details**:
  - Create `/dashboard/reports/campaigns` page
  - Metrics: Response rate, meeting conversion, deal pipeline, revenue attributed
  - Breakdowns: By persona, by channel, by ICP tier, by campaign
  - Export to CSV/PDF
  - Date range filter
- **Validation**: Generate report for all campaigns, verify metrics match database
- **Acceptance Criteria**:
  - ✅ All metrics accurate
  - ✅ Visual charts (bar, line, pie)
  - ✅ Export to CSV/PDF
  - ✅ Shareable link (read-only)
- **Tests**:
  - Unit test: Metric calculation functions
  - E2E test: Generate report, export to PDF

### Task 12.2: Account Engagement Score
- **Description**: Score accounts based on engagement level (emails opened, meetings attended, responses)
- **Technical Details**:
  - Calculate engagement score: Opens (5 pts), Clicks (10 pts), Replies (20 pts), Meetings (50 pts)
  - Store in TargetAccount: `engagementScore`, `lastEngagedAt`
  - Use to prioritize follow-up
  - Alert: High-engagement account not followed up in 7 days
- **Validation**: Top engaged accounts (score >100) match accounts with most activity
- **Acceptance Criteria**:
  - ✅ Score auto-calculated
  - ✅ Leaderboard view (top 50 accounts)
  - ✅ Alerts for high-engagement, no follow-up
  - ✅ Score history tracked
- **Tests**:
  - Unit test: Engagement score calculation
  - Integration test: Score updates on new activity
  - E2E test: Leaderboard displays correctly

### Task 12.3: A/B Testing Framework
- **Description**: Test different outreach messages to optimize conversion
- **Technical Details**:
  - Add variant field to Outreach: `variant` (A, B, C)
  - Generate multiple message variations for same contact
  - Track performance by variant
  - Declare winner based on response rate
  - Apply winning variant to remaining contacts
- **Validation**: Create A/B test with 2 variations, send to 50 contacts each, measure winner
- **Acceptance Criteria**:
  - ✅ Can define test variants
  - ✅ Random assignment to variant
  - ✅ Statistical significance test (Chi-square)
  - ✅ Winner declared automatically
  - ✅ Apply winner to remaining contacts
- **Tests**:
  - Unit test: Random assignment algorithm
  - Integration test: Create A/B test, verify variant distribution
  - E2E test: View test results, declare winner

### Task 12.4: Event ROI Report
- **Description**: Calculate overall event ROI (cost vs pipeline generated)
- **Technical Details**:
  - Track event costs: Registration, travel, staff time, software
  - Track pipeline: Meetings held, deals created, revenue attributed
  - Calculate ROI: (Pipeline Value - Event Cost) / Event Cost * 100
  - Benchmark against previous events
  - Export to executive summary PDF
- **Validation**: Generate ROI report, verify numbers match finance data
- **Acceptance Criteria**:
  - ✅ All costs tracked
  - ✅ Pipeline value attributed to event
  - ✅ ROI calculation accurate
  - ✅ Executive summary PDF professional
  - ✅ Comparison to previous events
- **Tests**:
  - Unit test: ROI calculation
  - Integration test: Query all costs and pipeline
  - E2E test: Generate PDF, verify formatting

---

## Technical Architecture Decisions

### Database Schema Additions

```prisma
// New models for Sprint 6-12

model ContactInsights {
  id                String   @id @default(cuid())
  personId          String   @unique
  roleContext       String?  // e.g., "Oversees 15-person ops team managing 5 DCs"
  likelyPainPoints  String?  // JSON array of pain points specific to role
  suggestedApproach String?  // How to pitch to this persona
  roiOpportunity    String?  // Estimated value prop for this role
  confidence        String?  // LOW, MEDIUM, HIGH
  generatedAt       DateTime @default(now())
  generatedBy       String?
  person            Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  @@index([personId])
  @@map("contact_insights")
}

model RoiCalculation {
  id              String   @id @default(cuid())
  accountId       String
  facilityCount   Int?
  operationalScale String?
  annualSavings   Float?   // Estimated $ saved per year
  paybackPeriod   Int?     // Months to ROI
  assumptions     String?  // JSON of calculation inputs
  calculatedAt    DateTime @default(now())
  calculatedBy    String?
  account         TargetAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  @@index([accountId])
  @@map("roi_calculations")
}

model Campaign {
  id             String   @id @default(cuid())
  name           String
  description    String?
  targetPersonas String?  // JSON array: ["ExecOps", "Procurement"]
  minIcpScore    Int?
  startDate      DateTime
  endDate        DateTime
  status         String   @default("PLANNING") // PLANNING, ACTIVE, COMPLETED, PAUSED
  goals          String?  // JSON: {meetingRequests: 50, emailReplies: 20}
  createdBy      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  outreach       Outreach[]
  @@map("campaigns")
}

model Sequence {
  id        String   @id @default(cuid())
  name      String
  steps     String   // JSON array of steps: [{channel: "LINKEDIN", delayDays: 0}, {channel: "EMAIL", delayDays: 3}]
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("sequences")
}

model Meeting {
  id           String   @id @default(cuid())
  personId     String
  scheduledAt  DateTime
  duration     Int      // Minutes
  location     String?  // Booth number, room name, virtual link
  status       String   @default("SCHEDULED") // SCHEDULED, COMPLETED, CANCELLED, NO_SHOW
  meetingType  String?  // INTRO, DEMO, NEGOTIATION, FOLLOW_UP
  outcome      String?
  nextSteps    String?
  followUpDate DateTime?
  dealStage    String?
  notes        String?
  createdBy    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  person       Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  @@index([personId])
  @@index([scheduledAt])
  @@map("meetings")
}

model Location {
  id           String   @id @default(cuid())
  accountId    String
  address      String?
  city         String?
  state        String?
  zip          String?
  country      String?
  lat          Float?
  lng          Float?
  facilityType String?  // WAREHOUSE, DC, RETAIL, MANUFACTURING, OFFICE
  createdAt    DateTime @default(now())
  account      TargetAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  @@index([accountId])
  @@map("locations")
}

// Update existing models

model TargetAccount {
  // ... existing fields
  engagementScore Int?
  lastEngagedAt   DateTime?
  // ... new relations
  roiCalculations RoiCalculation[]
  locations       Location[]
}

model Person {
  // ... existing fields
  // ... new relations
  insights        ContactInsights?
  meetings        Meeting[]
}

model Outreach {
  // ... existing fields
  campaignId      String?
  sequenceId      String?
  sequenceStep    Int?
  variant         String?  // For A/B testing: A, B, C
  openedAt        DateTime?
  clickedAt       DateTime?
  bouncedAt       DateTime?
  // ... new relations
  campaign        Campaign? @relation(fields: [campaignId], references: [id])
}
```

### API Endpoints

```typescript
// Sprint 6: Contact Intelligence & ROI
POST   /api/contact/[id]/insights        // Generate contact-specific insights
GET    /api/contact/[id]/insights        // Retrieve cached insights
POST   /api/roi/calculate                // Calculate ROI for account
GET    /api/accounts/[id]/roi            // Get ROI calculations

// Sprint 7: Email Enrichment & Manifest
POST   /api/enrichment/email             // Find email for contact
POST   /api/enrichment/bulk              // Bulk email enrichment
POST   /api/manifest/request             // Generate Manifest meeting request

// Sprint 8: Campaign Management
GET    /api/campaigns                    // List all campaigns
POST   /api/campaigns                    // Create campaign
GET    /api/campaigns/[id]               // Get campaign details
PUT    /api/campaigns/[id]               // Update campaign
DELETE /api/campaigns/[id]               // Delete campaign
GET    /api/campaigns/[id]/analytics     // Campaign metrics

POST   /api/sequences                    // Create sequence
GET    /api/sequences                    // List sequences
GET    /api/outreach/bulk-status         // Bulk update status

// Sprint 9: Advanced Research
POST   /api/research/facility-count      // Deep research on facilities
POST   /api/research/locations           // Research and geocode locations
POST   /api/research/competitors         // Competitive intelligence

// Sprint 10: Automation
POST   /api/outreach/send-email          // Send email via SendGrid
POST   /api/outreach/send-linkedin       // Send LinkedIn message (Phantom Buster)
POST   /api/crm/sync                     // Sync to CRM
POST   /api/cron/research-refresh        // Cron job for research refresh

// Sprint 11: Event Day
POST   /api/meetings                     // Create meeting
GET    /api/meetings                     // List meetings
GET    /api/meetings/[id]/prep           // Generate prep doc
PUT    /api/meetings/[id]/outcome        // Log meeting outcome
GET    /api/event-day/dashboard          // Real-time event dashboard

// Sprint 12: Reporting
GET    /api/reports/campaigns            // Campaign performance report
GET    /api/reports/engagement           // Engagement leaderboard
POST   /api/reports/ab-test              // Create A/B test
GET    /api/reports/roi                  // Event ROI report
```

### Testing Strategy

**Unit Tests**:
- All utility functions (ROI calculation, scoring algorithms, text generation)
- Data transformations and validations
- Business logic (sequence scheduling, status transitions)

**Integration Tests**:
- API endpoints (request → database → response)
- External API calls (OpenAI, email enrichment, CRM sync)
- Database operations (Prisma queries, transactions)

**E2E Tests** (Playwright or Cypress):
- Critical user flows:
  - Import CSV → Generate research → Generate outreach → Send email
  - Create campaign → Generate outreach → Track responses → View analytics
  - Schedule meeting → Generate prep doc → Log outcome → Create follow-up
- UI interactions: Forms, filters, bulk actions, exports

**Manual Validation**:
- AI-generated content quality (research dossiers, outreach messages)
- Email deliverability and tracking
- CRM sync accuracy
- Event day dashboard real-time updates

### Performance Considerations

**Caching**:
- Company dossiers: 7-day cache (refresh on demand)
- Contact insights: 30-day cache
- ROI calculations: Cache until account data changes
- Analytics: 5-minute cache for dashboards

**Rate Limiting**:
- OpenAI API: 3,500 requests/min (GPT-4o-mini)
- Email enrichment: 1,000/day (Hunter.io free tier)
- Email sending: 100/day (SendGrid free tier)
- Implement queues for bulk operations

**Database Optimization**:
- Indexes on frequently queried fields (accountId, personId, status, campaignId)
- Pagination for large lists (100 items/page)
- Aggregate tables for analytics (pre-calculate daily stats)

**Scalability**:
- Current: 2,653 accounts, 5,409 contacts (well within limits)
- Future: 10k+ accounts, 50k+ contacts
- Consider: Redis for caching, PostgreSQL read replicas, background jobs (Bull queue)

---

## Sprint Prioritization for Manifest 2026

Given that Manifest 2026 is the immediate goal, here's the recommended execution order:

### Phase 1: CRITICAL (Complete before event)
1. ✅ Sprints 0-5: Foundation + AI Research + Outreach Generation (DONE)
2. 🚀 **Sprint 6: Contact-Level Intelligence & ROI** (CRITICAL - informs all outreach)
3. 🚀 **Sprint 7: Email Enrichment & Manifest Integration** (CRITICAL - enables direct contact)
4. **Sprint 8: Campaign Management** (organize outreach execution)
5. **Sprint 11: Event Day Execution** (meeting scheduler, prep docs, follow-up)

### Phase 2: HIGH PRIORITY (Complete within 30 days post-event)
6. **Sprint 12: Reporting & Optimization** (measure success, optimize for next event)
7. **Sprint 10: Automation** (reduce manual work, scale operations)

### Phase 3: ENHANCEMENT (Future iterations)
8. **Sprint 9: Advanced Research** (facility mapping, competitive intel)
9. Additional features based on Phase 1-2 learnings

---

## Success Metrics

### Sprint 6 Success:
- ✅ 100% of top-tier accounts (ICP 90+) have ROI calculations
- ✅ Contact insights generated for 80% of key personas
- ✅ Outreach includes ROI data for 90% of messages

### Sprint 7 Success:
- ✅ Emails found for 70% of contacts missing email
- ✅ 200+ Manifest meeting requests generated
- ✅ 50+ meetings scheduled via Manifest app

### Sprint 8 Success:
- ✅ 3+ campaigns created (Top Tier, Mid Tier, Procurement Focus)
- ✅ Multi-touch sequences defined (3-touch minimum)
- ✅ Campaign analytics show >15% response rate

### Sprint 11 Success:
- ✅ 100+ meetings scheduled during Manifest 2026
- ✅ Prep docs generated for all meetings
- ✅ Post-meeting follow-ups sent within 24 hours
- ✅ 30% meeting → deal conversion rate

### Sprint 12 Success:
- ✅ Event ROI report shows positive ROI (>200%)
- ✅ Engagement scores identify top 50 hot leads
- ✅ A/B testing improves response rate by 20%+

---

## Next Immediate Actions

### 1. Fix Current Error (NOW)
- **Issue**: "Failed to generate outreach" error
- **Likely Cause**: OPENAI_API_KEY not set or invalid
- **Action**: 
  1. Verify OPENAI_API_KEY in Vercel environment variables
  2. Check OpenAI account has credits
  3. Test locally: `OPENAI_API_KEY=sk-... node test-ai.js`
  4. Review error logs for specific error message

### 2. Deploy Fixes (TODAY)
- **Changes**: Enhanced error messages, facility count research, operational scale
- **Action**: `git push origin main` → Vercel auto-deploys
- **Validation**: Test generation with 2-3 contacts, verify new fields populated

### 3. Start Sprint 6 (THIS WEEK)
- **Focus**: Contact-level intelligence and ROI integration
- **First Task**: Implement ContactInsights model and generation
- **Goal**: Generate insights for top 20 contacts by Friday

### 4. Email Enrichment Research (THIS WEEK)
- **Action**: Sign up for Hunter.io trial, test API with 10 contacts
- **Decision**: Choose email enrichment provider
- **Setup**: Integrate API, create enrichment endpoint

### 5. Manifest App Analysis (THIS WEEK)
- **Action**: Use browser DevTools to capture Manifest app API calls
- **Deliverable**: Document API endpoints, authentication, request format
- **Backup**: Create manual workflow (copy-paste meeting requests)

---

## File Structure

```
eventops/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── accounts/[id]/research/          # Company research
│   │   │   ├── contact/[id]/insights/           # NEW: Contact insights
│   │   │   ├── roi/calculate/                   # NEW: ROI calculator
│   │   │   ├── enrichment/email/                # NEW: Email finding
│   │   │   ├── manifest/request/                # NEW: Manifest integration
│   │   │   ├── campaigns/                       # NEW: Campaign management
│   │   │   ├── meetings/                        # NEW: Meeting scheduler
│   │   │   └── reports/                         # NEW: Analytics
│   │   └── dashboard/
│   │       ├── contact/[id]/                    # NEW: Contact detail
│   │       ├── campaigns/                       # NEW: Campaign UI
│   │       ├── manifest/requests/               # NEW: Manifest requests
│   │       ├── event-day/                       # NEW: Event dashboard
│   │       └── reports/                         # NEW: Analytics UI
│   ├── lib/
│   │   ├── ai-research.ts                       # Company research
│   │   ├── ai-contact-insights.ts               # NEW: Contact research
│   │   ├── roi-calculator.ts                    # NEW: ROI calculations
│   │   ├── email-enrichment.ts                  # NEW: Email finding
│   │   └── manifest-api.ts                      # NEW: Manifest integration
│   └── components/
│       ├── contact-insights-card.tsx            # NEW: Display insights
│       ├── roi-display.tsx                      # NEW: ROI card
│       ├── campaign-builder.tsx                 # NEW: Campaign UI
│       └── meeting-scheduler.tsx                # NEW: Calendar
├── prisma/
│   └── schema.prisma                            # Updated with new models
└── tests/
    ├── unit/                                    # Unit tests
    ├── integration/                             # API tests
    └── e2e/                                     # Playwright tests
```

---

## Conclusion

This sprint plan provides a comprehensive roadmap from current state (working AI research and outreach) to a fully-featured event execution platform. Each sprint builds on the previous, with clear goals, atomic tasks, and validation criteria.

**Key Differentiators**:
1. **Contact-level intelligence**: Not just company research, but persona-specific insights
2. **ROI-driven outreach**: Quantify value proposition for each account
3. **Manifest integration**: Direct path to meeting requests
4. **Campaign orchestration**: Manage multi-touch sequences
5. **Event day tools**: Prep docs, real-time dashboard, follow-up automation

**Timeline Recommendation**:
- **Weeks 1-2**: Sprints 6-7 (Contact Intelligence + Email Enrichment)
- **Weeks 3-4**: Sprints 8 + 11 (Campaign Management + Event Day)
- **Post-Event**: Sprints 12 + 10 (Reporting + Automation)

This positions EventOps as not just a database, but an intelligent sales execution engine that maximizes ROI from Manifest 2026 and future events.
