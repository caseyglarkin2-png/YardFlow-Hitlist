# EventOps Production Sprints 18-24: Execution Plan

**Generated:** January 22, 2026  
**Status:** Ready for Implementation  
**Foundation:** Sprints 0-17 Complete & Deployed  
**Production URL:** https://yard-flow-hitlist.vercel.app

---

## Overview

This document provides atomic, committable tasks for completing EventOps production platform. Each task is:
- **Independently testable** with validation criteria
- **Completable in 2-6 hours** by a single developer
- **Committable** as standalone work
- **Documented** with exact files, schemas, and APIs

**Sprint Structure:**
- Each sprint = 3-5 days of work
- 10-15 atomic tasks per sprint
- Builds on previous sprint's foundation
- Produces demoable, production-ready software

---

## Sprint 18: Google Workspace Integration

**Duration:** 4-5 days  
**Goal:** Seamless Google Calendar, Contacts, and Gmail integration for automated activity tracking  
**Demo:** User connects Google account, meetings auto-import from Calendar, email replies tracked automatically

**Dependencies:** 
- Google Cloud Project with OAuth 2.0 credentials
- NextAuth configuration
- Prisma schema updates

---

### Task 18.1: Google OAuth Setup & Token Storage

**Estimated Time:** 3 hours  
**Priority:** CRITICAL  
**Dependencies:** None

**Description:**
Configure Google OAuth 2.0 provider in NextAuth, add refresh token storage to users table, implement token refresh logic.

**Files to Create:**
- `eventops/src/lib/google/auth.ts`
- `eventops/src/lib/google/client.ts`

**Files to Modify:**
- `eventops/src/auth.ts` (add Google provider)
- `eventops/.env.example` (add Google credentials)
- `eventops/prisma/schema.prisma` (add Google fields to users model)

**Database Migration:**
```prisma
model users {
  // ... existing fields
  googleAccessToken  String?  @db.Text
  googleRefreshToken String?  @db.Text
  googleTokenExpiry  DateTime?
  googleSyncEnabled  Boolean  @default(false)
  lastGoogleSync     DateTime?
}
```

**Implementation:**

```typescript
// src/lib/google/auth.ts
import { google } from 'googleapis';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

export async function refreshGoogleToken(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return {
      accessToken: credentials.access_token!,
      expiryDate: new Date(credentials.expiry_date!),
    };
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh Google token');
  }
}

export async function getGoogleClient(userId: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
    },
  });

  if (!user?.googleRefreshToken) {
    throw new Error('Google account not connected');
  }

  // Check if token needs refresh
  const now = new Date();
  if (!user.googleTokenExpiry || user.googleTokenExpiry < now) {
    const { accessToken, expiryDate } = await refreshGoogleToken(user.googleRefreshToken);
    
    // Update stored token
    await prisma.users.update({
      where: { id: userId },
      data: {
        googleAccessToken: accessToken,
        googleTokenExpiry: expiryDate,
      },
    });

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: user.googleRefreshToken,
    });
    return oauth2Client;
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  });
  return oauth2Client;
}
```

**API Endpoints:**
- `GET /api/google/connect` - Initiates OAuth flow
- `POST /api/google/disconnect` - Revokes access, clears tokens

**Validation:**
```bash
# 1. Run migration
cd eventops && npx prisma migrate dev --name add_google_oauth

# 2. Test OAuth flow
curl http://localhost:3000/api/google/connect
# Should redirect to Google consent screen

# 3. After OAuth callback, verify token storage
psql $DATABASE_URL -c "SELECT id, email, google_sync_enabled, google_token_expiry FROM users WHERE google_access_token IS NOT NULL;"
# Should show user with tokens

# 4. Test token refresh
node -e "
const { getGoogleClient } = require('./dist/lib/google/auth');
getGoogleClient('USER_ID').then(client => console.log('✅ Token refresh works'));
"
```

**Acceptance Criteria:**
- [ ] OAuth flow redirects to Google with correct scopes
- [ ] Access token and refresh token stored in database
- [ ] Token expiry tracked and auto-refreshed
- [ ] User can disconnect Google account
- [ ] Tokens cleared on disconnect
- [ ] Error handling for expired/invalid tokens
- [ ] Environment variables documented in .env.example

**Rollback:**
```bash
git revert HEAD
npx prisma migrate reset --skip-seed
```

---

### Task 18.2: Google Calendar Sync - Import Meetings

**Estimated Time:** 4 hours  
**Priority:** HIGH  
**Dependencies:** Task 18.1

**Description:**
Fetch meetings from Google Calendar, match attendees to people records, create Meeting entries, handle duplicates.

**Files to Create:**
- `eventops/src/lib/google/calendar.ts`
- `eventops/src/app/api/google/calendar/sync/route.ts`

**Files to Modify:**
- `eventops/prisma/schema.prisma` (add Google event tracking)

**Database Migration:**
```prisma
model meeting {
  // ... existing fields
  googleEventId  String?  @unique
  googleMeetLink String?
  googleSyncedAt DateTime?
}
```

**Implementation:**

```typescript
// src/lib/google/calendar.ts
import { google } from 'googleapis';
import { getGoogleClient } from './auth';
import { prisma } from '@/lib/db';

export async function syncCalendarEvents(userId: string) {
  const auth = await getGoogleClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  // Get events from last 30 days forward
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 30);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    maxResults: 100,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];
  const imported = [];
  const skipped = [];

  for (const event of events) {
    if (!event.start?.dateTime || !event.summary) {
      skipped.push({ id: event.id, reason: 'Missing required fields' });
      continue;
    }

    // Check if already imported
    const existing = await prisma.meeting.findFirst({
      where: { googleEventId: event.id },
    });

    if (existing) {
      skipped.push({ id: event.id, reason: 'Already imported' });
      continue;
    }

    // Try to match attendees to people
    const attendees = event.attendees || [];
    let personId = null;

    for (const attendee of attendees) {
      if (!attendee.email) continue;
      
      const person = await prisma.people.findFirst({
        where: { 
          email: { 
            equals: attendee.email,
            mode: 'insensitive'
          } 
        },
      });

      if (person) {
        personId = person.id;
        break;
      }
    }

    if (!personId) {
      skipped.push({ id: event.id, reason: 'No matching person found' });
      continue;
    }

    // Calculate duration
    const duration = event.end?.dateTime
      ? Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / 1000 / 60)
      : 30;

    // Create meeting
    const meeting = await prisma.meeting.create({
      data: {
        id: crypto.randomUUID(),
        personId,
        scheduledAt: new Date(event.start.dateTime),
        duration,
        location: event.location || event.hangoutLink || null,
        status: 'SCHEDULED',
        meetingType: 'INTRO',
        notes: event.description || null,
        googleEventId: event.id,
        googleMeetLink: event.hangoutLink || null,
        googleSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    imported.push(meeting);
  }

  // Update last sync time
  await prisma.users.update({
    where: { id: userId },
    data: { lastGoogleSync: new Date() },
  });

  return {
    imported: imported.length,
    skipped: skipped.length,
    total: events.length,
    details: { imported, skipped },
  };
}
```

```typescript
// src/app/api/google/calendar/sync/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncCalendarEvents } from '@/lib/google/calendar';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncCalendarEvents(session.user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Calendar sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Calendar sync failed' },
      { status: 500 }
    );
  }
}
```

**API Endpoints:**
- `POST /api/google/calendar/sync` - Syncs calendar events

**Validation:**
```bash
# 1. Run migration
npx prisma migrate dev --name add_google_calendar_tracking

# 2. Sync calendars
curl -X POST http://localhost:3000/api/google/calendar/sync \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Expected response:
# {"imported": 5, "skipped": 3, "total": 8}

# 3. Verify meetings in database
psql $DATABASE_URL -c "
  SELECT m.id, m.scheduled_at, m.google_event_id, p.name as person_name
  FROM meeting m
  JOIN people p ON m.person_id = p.id
  WHERE m.google_event_id IS NOT NULL
  ORDER BY m.scheduled_at DESC
  LIMIT 10;
"

# 4. Test duplicate prevention
curl -X POST http://localhost:3000/api/google/calendar/sync \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
# Should return same skipped count (no new imports)
```

**Acceptance Criteria:**
- [ ] Google Calendar events fetched successfully
- [ ] Events matched to people by email
- [ ] Meetings created with correct data
- [ ] Duplicate events skipped
- [ ] Google Event ID stored for tracking
- [ ] Google Meet links preserved
- [ ] Duration calculated correctly
- [ ] Sync timestamp updated
- [ ] Unmatched attendees reported in skipped list

**Rollback:**
```bash
git revert HEAD
npx prisma migrate reset --skip-seed
```

---

### Task 18.3: Background Calendar Sync (Cron Job)

**Estimated Time:** 2 hours  
**Priority:** MEDIUM  
**Dependencies:** Task 18.2

**Description:**
Create cron job to automatically sync Google Calendar every hour for users with Google connected.

**Files to Create:**
- `eventops/src/app/api/cron/google-sync/route.ts`
- `eventops/vercel.json` (configure cron)

**Implementation:**

```typescript
// src/app/api/cron/google-sync/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncCalendarEvents } from '@/lib/google/calendar';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find users with Google sync enabled
    const users = await prisma.users.findMany({
      where: {
        googleSyncEnabled: true,
        googleRefreshToken: { not: null },
      },
      select: { id: true, email: true },
    });

    const results = [];
    for (const user of users) {
      try {
        const result = await syncCalendarEvents(user.id);
        results.push({
          userId: user.id,
          email: user.email,
          success: true,
          ...result,
        });
      } catch (error: any) {
        results.push({
          userId: user.id,
          email: user.email,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      results,
    });
  } catch (error: any) {
    console.error('Cron sync error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

```json
// vercel.json (add to existing config)
{
  "crons": [
    {
      "path": "/api/cron/google-sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Environment Variables:**
```bash
# Add to .env
CRON_SECRET=your-random-secret-here
```

**Validation:**
```bash
# 1. Test cron endpoint locally
curl http://localhost:3000/api/cron/google-sync \
  -H "Authorization: Bearer your-random-secret-here"

# Expected response:
# {"success": true, "totalUsers": 2, "results": [...]}

# 2. Deploy to Vercel and verify cron config
vercel deploy --prod
vercel crons ls

# 3. Check Vercel logs after 1 hour
vercel logs --follow

# 4. Verify sync happened
psql $DATABASE_URL -c "
  SELECT email, last_google_sync
  FROM users
  WHERE google_sync_enabled = true
  ORDER BY last_google_sync DESC;
"
```

**Acceptance Criteria:**
- [ ] Cron job runs hourly
- [ ] Only syncs users with googleSyncEnabled = true
- [ ] Handles errors gracefully per user
- [ ] Returns summary of sync results
- [ ] Authenticated with CRON_SECRET
- [ ] Logs visible in Vercel dashboard

**Rollback:**
```bash
git revert HEAD
# Remove cron from vercel.json
```

---

### Task 18.4: Gmail Reply Tracking

**Estimated Time:** 5 hours  
**Priority:** MEDIUM  
**Dependencies:** Task 18.1

**Description:**
Monitor Gmail for replies to sent outreach emails, automatically update outreach status to RESPONDED.

**Files to Create:**
- `eventops/src/lib/google/gmail.ts`
- `eventops/src/app/api/google/gmail/check-replies/route.ts`

**Files to Modify:**
- `eventops/prisma/schema.prisma` (track email threading)

**Database Migration:**
```prisma
model outreach {
  // ... existing fields
  gmailMessageId String?
  gmailThreadId  String?
  lastChecked    DateTime?
}
```

**Implementation:**

```typescript
// src/lib/google/gmail.ts
import { google } from 'googleapis';
import { getGoogleClient } from './auth';
import { prisma } from '@/lib/db';

export async function checkEmailReplies(userId: string) {
  const auth = await getGoogleClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  // Get outreach that needs checking (sent in last 30 days, not replied)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const outreachToCheck = await prisma.outreach.findMany({
    where: {
      status: 'SENT',
      sentAt: { gte: thirtyDaysAgo },
      gmailThreadId: { not: null },
    },
    include: {
      people: {
        select: { email: true, name: true },
      },
    },
  });

  const updated = [];

  for (const outreach of outreachToCheck) {
    if (!outreach.gmailThreadId) continue;

    try {
      // Get thread messages
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: outreach.gmailThreadId,
      });

      const messages = thread.data.messages || [];
      
      // Check if there are replies (more than 1 message in thread)
      if (messages.length > 1) {
        // Get the latest message
        const latestMessage = messages[messages.length - 1];
        const fromHeader = latestMessage.payload?.headers?.find(h => h.name === 'From');
        
        // Check if reply is from the contact (not from us)
        if (fromHeader?.value?.includes(outreach.people.email || '')) {
          await prisma.outreach.update({
            where: { id: outreach.id },
            data: {
              status: 'RESPONDED',
              updatedAt: new Date(),
              lastChecked: new Date(),
            },
          });

          // Log activity
          await prisma.activities.create({
            data: {
              id: crypto.randomUUID(),
              userId: userId,
              entityType: 'outreach',
              entityId: outreach.id,
              action: 'email_replied',
              metadata: {
                personName: outreach.people.name,
                respondedAt: new Date(parseInt(latestMessage.internalDate || '0')),
              },
              updatedAt: new Date(),
            },
          });

          updated.push({
            outreachId: outreach.id,
            personName: outreach.people.name,
            status: 'RESPONDED',
          });
        } else {
          // Mark as checked but no reply yet
          await prisma.outreach.update({
            where: { id: outreach.id },
            data: { lastChecked: new Date() },
          });
        }
      }
    } catch (error) {
      console.error(`Error checking thread ${outreach.gmailThreadId}:`, error);
    }
  }

  return {
    checked: outreachToCheck.length,
    updated: updated.length,
    details: updated,
  };
}
```

**API Endpoints:**
- `POST /api/google/gmail/check-replies` - Checks for email replies

**Validation:**
```bash
# 1. Run migration
npx prisma migrate dev --name add_gmail_tracking

# 2. Send test email with Gmail tracking
# (Requires manual test - send email to yourself)

# 3. Check for replies
curl -X POST http://localhost:3000/api/google/gmail/check-replies \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Expected response:
# {"checked": 10, "updated": 2, "details": [...]}

# 4. Verify status updates
psql $DATABASE_URL -c "
  SELECT o.id, o.status, o.sent_at, o.last_checked, p.name
  FROM outreach o
  JOIN people p ON o.person_id = p.id
  WHERE o.gmail_thread_id IS NOT NULL
  ORDER BY o.last_checked DESC
  LIMIT 10;
"

# 5. Check activity log
psql $DATABASE_URL -c "
  SELECT * FROM activities
  WHERE action = 'email_replied'
  ORDER BY created_at DESC
  LIMIT 5;
"
```

**Acceptance Criteria:**
- [ ] Gmail threads fetched successfully
- [ ] Replies detected correctly
- [ ] Outreach status updated to RESPONDED
- [ ] Activity logged for replies
- [ ] Only checks recent outreach (30 days)
- [ ] Handles API errors gracefully
- [ ] Distinguishes our emails from replies
- [ ] Last checked timestamp updated

**Rollback:**
```bash
git revert HEAD
npx prisma migrate reset --skip-seed
```

---

### Task 18.5: Google Contacts Import

**Estimated Time:** 4 hours  
**Priority:** LOW  
**Dependencies:** Task 18.1

**Description:**
Import contacts from Google Contacts, match to companies, create people records for unmatched contacts.

**Files to Create:**
- `eventops/src/lib/google/contacts.ts`
- `eventops/src/app/api/google/contacts/import/route.ts`

**Implementation:**

```typescript
// src/lib/google/contacts.ts
import { google } from 'googleapis';
import { getGoogleClient } from './auth';
import { prisma } from '@/lib/db';

export async function importGoogleContacts(userId: string, eventId: string) {
  const auth = await getGoogleClient(userId);
  const people = google.people({ version: 'v1', auth });

  const response = await people.people.connections.list({
    resourceName: 'people/me',
    pageSize: 1000,
    personFields: 'names,emailAddresses,organizations,phoneNumbers',
  });

  const connections = response.data.connections || [];
  const imported = [];
  const skipped = [];

  for (const contact of connections) {
    const name = contact.names?.[0]?.displayName;
    const email = contact.emailAddresses?.[0]?.value;
    const company = contact.organizations?.[0]?.name;
    const title = contact.organizations?.[0]?.title;
    const phone = contact.phoneNumbers?.[0]?.value;

    if (!name || !email) {
      skipped.push({ reason: 'Missing name or email' });
      continue;
    }

    // Check if person already exists
    const existing = await prisma.people.findFirst({
      where: { 
        email: { equals: email, mode: 'insensitive' } 
      },
    });

    if (existing) {
      skipped.push({ email, reason: 'Already exists' });
      continue;
    }

    // Try to match company
    let accountId = null;
    if (company) {
      const account = await prisma.target_accounts.findFirst({
        where: {
          eventId,
          name: { contains: company, mode: 'insensitive' },
        },
      });

      if (account) {
        accountId = account.id;
      } else {
        // Create new account
        const newAccount = await prisma.target_accounts.create({
          data: {
            id: crypto.randomUUID(),
            eventId,
            name: company,
            updatedAt: new Date(),
          },
        });
        accountId = newAccount.id;
      }
    }

    if (!accountId) {
      skipped.push({ email, reason: 'No company found' });
      continue;
    }

    // Create person
    const person = await prisma.people.create({
      data: {
        id: crypto.randomUUID(),
        accountId,
        name,
        email,
        title: title || null,
        phone: phone || null,
        updatedAt: new Date(),
      },
    });

    imported.push({ name, email, company });
  }

  return {
    total: connections.length,
    imported: imported.length,
    skipped: skipped.length,
    details: { imported, skipped },
  };
}
```

**API Endpoints:**
- `POST /api/google/contacts/import` - Imports Google Contacts

**Validation:**
```bash
# 1. Import contacts
curl -X POST http://localhost:3000/api/google/contacts/import \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventId": "YOUR_EVENT_ID"}'

# Expected response:
# {"total": 150, "imported": 45, "skipped": 105}

# 2. Verify people created
psql $DATABASE_URL -c "
  SELECT p.name, p.email, p.title, a.name as company
  FROM people p
  JOIN target_accounts a ON p.account_id = a.id
  ORDER BY p.created_at DESC
  LIMIT 20;
"
```

**Acceptance Criteria:**
- [ ] Google Contacts fetched successfully
- [ ] Existing people skipped
- [ ] New companies created as needed
- [ ] People matched to companies
- [ ] Contact details preserved
- [ ] Duplicate detection works
- [ ] Import summary returned

**Rollback:**
```bash
git revert HEAD
```

---

### Task 18.6: Google Integration Dashboard UI

**Estimated Time:** 3 hours  
**Priority:** MEDIUM  
**Dependencies:** Tasks 18.1-18.5

**Description:**
Create UI for managing Google integration: connect/disconnect, view sync status, trigger manual syncs.

**Files to Create:**
- `eventops/src/app/dashboard/settings/integrations/page.tsx`
- `eventops/src/components/integrations/google-integration-card.tsx`

**Implementation:**

```typescript
// src/components/integrations/google-integration-card.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function GoogleIntegrationCard({ user }: { user: any }) {
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleConnect = () => {
    window.location.href = '/api/google/connect';
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google account?')) return;
    await fetch('/api/google/disconnect', { method: 'POST' });
    window.location.reload();
  };

  const handleSyncCalendar = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/google/calendar/sync', { method: 'POST' });
      const data = await res.json();
      alert(`Synced ${data.imported} meetings`);
    } catch (error) {
      alert('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleImportContacts = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/google/contacts/import', { method: 'POST' });
      const data = await res.json();
      alert(`Imported ${data.imported} contacts`);
    } catch (error) {
      alert('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Google Workspace</h3>
          <p className="text-sm text-gray-600">
            Sync Calendar, Gmail, and Contacts
          </p>
        </div>
        {user?.googleSyncEnabled ? (
          <Badge variant="success">Connected</Badge>
        ) : (
          <Badge variant="secondary">Not Connected</Badge>
        )}
      </div>

      {user?.googleSyncEnabled ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>Last synced: {user.lastGoogleSync ? new Date(user.lastGoogleSync).toLocaleString() : 'Never'}</p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSyncCalendar} 
              disabled={syncing}
              size="sm"
            >
              {syncing ? 'Syncing...' : 'Sync Calendar'}
            </Button>
            <Button 
              onClick={handleImportContacts}
              disabled={importing}
              size="sm"
              variant="outline"
            >
              {importing ? 'Importing...' : 'Import Contacts'}
            </Button>
            <Button 
              onClick={handleDisconnect}
              size="sm"
              variant="destructive"
            >
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={handleConnect}>
          Connect Google Account
        </Button>
      )}
    </Card>
  );
}
```

**Validation:**
- [ ] Manual test in browser
- [ ] Connect button redirects to Google OAuth
- [ ] After connection, shows "Connected" badge
- [ ] Sync Calendar button triggers sync
- [ ] Import Contacts button triggers import
- [ ] Disconnect button clears tokens
- [ ] Last synced time displays correctly

**Rollback:**
```bash
git revert HEAD
```

---

## Sprint 19: Bulk Operations & Performance

**Duration:** 4 days  
**Goal:** High-performance bulk operations for managing thousands of records efficiently  
**Demo:** User bulk generates 500 AI dossiers in <5 minutes, exports 2000+ records to CSV instantly

---

### Task 19.1: Bulk Research Queue System

**Estimated Time:** 4 hours  
**Priority:** HIGH  
**Dependencies:** Sprint 17 complete

**Description:**
Optimize bulk dossier generation with parallel processing, rate limiting, progress tracking.

**Files to Modify:**
- `eventops/src/lib/research-queue.ts` (already exists, enhance it)
- `eventops/src/app/api/research/bulk/route.ts`

**Implementation:**

```typescript
// Enhance existing research-queue.ts
export class ResearchQueue {
  // ... existing code

  // Add parallel processing
  async processQueueParallel(concurrency = 3) {
    const pending = Array.from(this.queue.values()).filter(
      item => item.status === 'pending'
    );

    // Process in batches
    for (let i = 0; i < pending.length; i += concurrency) {
      const batch = pending.slice(i, i + concurrency);
      
      await Promise.allSettled(
        batch.map(item => this.processItem(item))
      );

      // Small delay between batches to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  getProgress() {
    const stats = {
      total: this.queue.size,
      completed: 0,
      failed: 0,
      pending: 0,
    };

    for (const item of this.queue.values()) {
      if (item.status === 'completed') stats.completed++;
      else if (item.status === 'failed') stats.failed++;
      else stats.pending++;
    }

    return {
      ...stats,
      progress: Math.round((stats.completed / stats.total) * 100),
    };
  }
}
```

**API Enhancement:**
- `GET /api/research/bulk/progress` - Returns progress statistics

**Validation:**
```bash
# 1. Start bulk generation
curl -X POST http://localhost:3000/api/research/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "accountIds": ["id1", "id2", "...100 more"],
    "forceRefresh": false
  }'

# 2. Monitor progress
while true; do
  curl http://localhost:3000/api/research/bulk/progress
  sleep 2
done

# Expected: Progress increases, completes in reasonable time

# 3. Verify completion
psql $DATABASE_URL -c "
  SELECT COUNT(*) as total_dossiers
  FROM company_dossiers
  WHERE researched_at > NOW() - INTERVAL '1 hour';
"
```

**Acceptance Criteria:**
- [ ] Processes 100 accounts in under 3 minutes
- [ ] Handles rate limits gracefully
- [ ] Progress tracking accurate
- [ ] No duplicate API calls
- [ ] Failed items reported
- [ ] Results cached properly

---

### Task 19.2: Streaming CSV Export

**Estimated Time:** 3 hours  
**Priority:** HIGH  
**Dependencies:** None

**Description:**
Implement streaming CSV export for large datasets (10K+ records) without memory issues.

**Files to Create:**
- `eventops/src/lib/csv-streamer.ts`
- `eventops/src/app/api/export/people/stream/route.ts`
- `eventops/src/app/api/export/accounts/stream/route.ts`

**Implementation:**

```typescript
// src/lib/csv-streamer.ts
import { Readable } from 'stream';

export function createCSVStream<T>(
  data: AsyncIterable<T>,
  columns: { key: keyof T; header: string }[]
) {
  return new ReadableStream({
    async start(controller) {
      // Send headers
      const headers = columns.map(c => c.header).join(',');
      controller.enqueue(`${headers}\n`);

      // Stream rows
      for await (const row of data) {
        const values = columns.map(col => {
          const value = row[col.key];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        });
        controller.enqueue(`${values.join(',')}\n`);
      }

      controller.close();
    },
  });
}
```

```typescript
// src/app/api/export/people/stream/route.ts
import { createCSVStream } from '@/lib/csv-streamer';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return new Response('eventId required', { status: 400 });
  }

  async function* fetchPeople() {
    const BATCH_SIZE = 1000;
    let skip = 0;

    while (true) {
      const batch = await prisma.people.findMany({
        where: { target_accounts: { eventId } },
        include: { target_accounts: true },
        take: BATCH_SIZE,
        skip,
        orderBy: { createdAt: 'asc' },
      });

      if (batch.length === 0) break;

      for (const person of batch) {
        yield {
          name: person.name,
          email: person.email || '',
          title: person.title || '',
          company: person.target_accounts.name,
          phone: person.phone || '',
          linkedin: person.linkedin || '',
        };
      }

      skip += BATCH_SIZE;
    }
  }

  const stream = createCSVStream(fetchPeople(), [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'title', header: 'Title' },
    { key: 'company', header: 'Company' },
    { key: 'phone', header: 'Phone' },
    { key: 'linkedin', header: 'LinkedIn' },
  ]);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="people.csv"',
    },
  });
}
```

**Validation:**
```bash
# 1. Test with large dataset
curl "http://localhost:3000/api/export/people/stream?eventId=EVENT_ID" \
  -o people_export.csv

# 2. Verify file
wc -l people_export.csv
head -5 people_export.csv

# 3. Load test with 10K records
time curl "http://localhost:3000/api/export/people/stream?eventId=EVENT_ID" \
  -o /dev/null

# Expected: Completes in <30 seconds, no memory spike
```

**Acceptance Criteria:**
- [ ] Exports 10K records in <30 seconds
- [ ] Memory usage stays under 500MB
- [ ] CSV properly formatted
- [ ] Special characters escaped
- [ ] Headers included
- [ ] Streaming starts immediately

---

### Task 19.3: Database Query Optimization

**Estimated Time:** 4 hours  
**Priority:** HIGH  
**Dependencies:** None

**Description:**
Add database indexes, optimize N+1 queries, implement query caching.

**Database Migrations:**
```prisma
// Add to schema.prisma
model people {
  // ... existing fields
  
  @@index([accountId])
  @@index([email])
  @@index([createdAt])
  @@index([assignedTo])
}

model target_accounts {
  @@index([eventId])
  @@index([icpScore])
  @@index([assignedTo])
  @@index([createdAt])
}

model outreach {
  @@index([personId])
  @@index([status])
  @@index([sentAt])
}

model meeting {
  @@index([personId])
  @@index([scheduledAt])
  @@index([status])
}

model company_dossiers {
  @@index([accountId])
  @@index([researchedAt])
}
```

**Validation:**
```bash
# 1. Create indexes
npx prisma migrate dev --name add_performance_indexes

# 2. Analyze query performance BEFORE
psql $DATABASE_URL -c "EXPLAIN ANALYZE
  SELECT p.*, a.name as company_name
  FROM people p
  JOIN target_accounts a ON p.account_id = a.id
  WHERE a.event_id = 'EVENT_ID'
  LIMIT 100;
"

# 3. Check index usage
psql $DATABASE_URL -c "
  SELECT schemaname, tablename, indexname, idx_scan
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan DESC;
"

# Expected: High idx_scan counts on new indexes
```

**Acceptance Criteria:**
- [ ] All foreign keys indexed
- [ ] Common filter fields indexed
- [ ] Query times reduced by 50%+
- [ ] No N+1 query warnings in logs
- [ ] Index usage confirmed in pg_stat

---

## Sprint 20: Advanced Analytics & Reporting

**Duration:** 4 days  
**Goal:** Comprehensive analytics dashboard with real-time metrics and exportable reports  
**Demo:** User views pipeline funnel, conversion rates, engagement scores with drill-down capabilities

---

### Task 20.1: Analytics Data Warehouse Setup

**Estimated Time:** 5 hours  
**Priority:** HIGH  
**Dependencies:** None

**Description:**
Create materialized views for fast analytics queries, implement incremental refresh strategy.

**Database Migrations:**
```sql
-- Create analytics schema
CREATE SCHEMA IF NOT EXISTS analytics;

-- Outreach funnel metrics
CREATE MATERIALIZED VIEW analytics.outreach_funnel AS
SELECT
  DATE_TRUNC('day', o.created_at) as date,
  o.status,
  COUNT(*) as count,
  COUNT(DISTINCT o.person_id) as unique_people,
  AVG(
    CASE 
      WHEN o.sent_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (o.sent_at - o.created_at)) / 3600 
    END
  ) as avg_hours_to_send
FROM outreach o
GROUP BY DATE_TRUNC('day', o.created_at), o.status;

CREATE INDEX ON analytics.outreach_funnel (date, status);

-- Daily engagement metrics  
CREATE MATERIALIZED VIEW analytics.daily_engagement AS
SELECT
  DATE_TRUNC('day', a.created_at) as date,
  a.entity_type,
  a.action,
  COUNT(*) as count,
  COUNT(DISTINCT a.user_id) as unique_users
FROM activities a
GROUP BY DATE_TRUNC('day', a.created_at), a.entity_type, a.action;

CREATE INDEX ON analytics.daily_engagement (date, entity_type);

-- Account health scores
CREATE MATERIALIZED VIEW analytics.account_health AS
SELECT
  ta.id,
  ta.name,
  ta.icp_score,
  COUNT(DISTINCT p.id) as contact_count,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'SENT') as emails_sent,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'RESPONDED') as responses,
  COUNT(DISTINCT m.id) as meetings_booked,
  MAX(o.sent_at) as last_contact_date,
  CASE
    WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.sent_at > NOW() - INTERVAL '7 days') > 0 THEN 'active'
    WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.sent_at > NOW() - INTERVAL '30 days') > 0 THEN 'warm'
    ELSE 'cold'
  END as temperature
FROM target_accounts ta
LEFT JOIN people p ON p.account_id = ta.id
LEFT JOIN outreach o ON o.person_id = p.id
LEFT JOIN meeting m ON m.person_id = p.id
GROUP BY ta.id, ta.name, ta.icp_score;

CREATE INDEX ON analytics.account_health (temperature, icp_score);
```

**Refresh Strategy:**
```typescript
// src/lib/analytics/refresh.ts
export async function refreshAnalytics() {
  await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.outreach_funnel`;
  await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.daily_engagement`;
  await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.account_health`;
}
```

**API Endpoints:**
- `POST /api/analytics/refresh` - Triggers materialized view refresh
- `GET /api/analytics/funnel` - Returns funnel metrics
- `GET /api/analytics/engagement` - Returns engagement trends

**Validation:**
```bash
# 1. Create views
psql $DATABASE_URL < analytics_setup.sql

# 2. Test query performance
psql $DATABASE_URL -c "
  EXPLAIN ANALYZE
  SELECT * FROM analytics.outreach_funnel
  WHERE date >= NOW() - INTERVAL '30 days';
"
# Expected: <10ms execution time

# 3. Test refresh
curl -X POST http://localhost:3000/api/analytics/refresh

# 4. Verify data
psql $DATABASE_URL -c "
  SELECT date, status, count
  FROM analytics.outreach_funnel
  ORDER BY date DESC
  LIMIT 20;
"
```

**Acceptance Criteria:**
- [ ] Materialized views created successfully
- [ ] Queries return in <50ms
- [ ] Refresh completes in <5 seconds
- [ ] Indexes improve query performance
- [ ] Data accuracy verified against source tables

---

### Task 20.2: Real-Time Dashboard API

**Estimated Time:** 4 hours  
**Priority:** HIGH  
**Dependencies:** Task 20.1

**Description:**
Build API endpoints for dashboard metrics with caching and real-time updates.

**Files to Create:**
- `eventops/src/app/api/analytics/dashboard/route.ts`
- `eventops/src/lib/analytics/metrics.ts`

**Implementation:**

```typescript
// src/lib/analytics/metrics.ts
import { prisma } from '@/lib/db';
import { unstable_cache } from 'next/cache';

export const getDashboardMetrics = unstable_cache(
  async (eventId: string) => {
    const [
      totalAccounts,
      totalPeople,
      outreachStats,
      meetingStats,
      responseRate,
      topAccounts,
    ] = await Promise.all([
      // Total accounts
      prisma.target_accounts.count({
        where: { eventId },
      }),

      // Total people
      prisma.people.count({
        where: { target_accounts: { eventId } },
      }),

      // Outreach statistics
      prisma.outreach.groupBy({
        by: ['status'],
        where: {
          people: { target_accounts: { eventId } },
        },
        _count: true,
      }),

      // Meeting statistics  
      prisma.meeting.groupBy({
        by: ['status'],
        where: {
          people: { target_accounts: { eventId } },
        },
        _count: true,
      }),

      // Response rate (last 30 days)
      prisma.$queryRaw`
        SELECT
          COUNT(*) FILTER (WHERE status = 'SENT') as sent,
          COUNT(*) FILTER (WHERE status = 'RESPONDED') as responded
        FROM outreach o
        JOIN people p ON o.person_id = p.id
        JOIN target_accounts a ON p.account_id = a.id
        WHERE a.event_id = ${eventId}
          AND o.sent_at >= NOW() - INTERVAL '30 days'
      `,

      // Top accounts by engagement
      prisma.$queryRaw`
        SELECT
          a.id,
          a.name,
          a.icp_score,
          COUNT(DISTINCT p.id) as contact_count,
          COUNT(DISTINCT o.id) as outreach_count,
          COUNT(DISTINCT m.id) as meeting_count
        FROM target_accounts a
        LEFT JOIN people p ON p.account_id = a.id
        LEFT JOIN outreach o ON o.person_id = p.id
        LEFT JOIN meeting m ON m.person_id = p.id
        WHERE a.event_id = ${eventId}
        GROUP BY a.id, a.name, a.icp_score
        ORDER BY (COUNT(DISTINCT m.id) * 10 + COUNT(DISTINCT o.id)) DESC
        LIMIT 10
      `,
    ]);

    return {
      summary: {
        totalAccounts,
        totalPeople,
        outreachStats: outreachStats.reduce((acc, { status, _count }) => {
          acc[status.toLowerCase()] = _count;
          return acc;
        }, {} as Record<string, number>),
        meetingStats: meetingStats.reduce((acc, { status, _count }) => {
          acc[status.toLowerCase()] = _count;
          return acc;
        }, {} as Record<string, number>),
        responseRate: responseRate[0]
          ? (responseRate[0].responded / responseRate[0].sent) * 100
          : 0,
      },
      topAccounts,
    };
  },
  ['dashboard-metrics'],
  { revalidate: 300 } // Cache for 5 minutes
);
```

**API Endpoints:**
```typescript
// src/app/api/analytics/dashboard/route.ts
export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  const metrics = await getDashboardMetrics(eventId);
  return NextResponse.json(metrics);
}
```

**Validation:**
```bash
# 1. Test API endpoint
curl "http://localhost:3000/api/analytics/dashboard?eventId=EVENT_ID"

# Expected response:
# {
#   "summary": {
#     "totalAccounts": 2653,
#     "totalPeople": 5409,
#     "outreachStats": {"sent": 1234, "responded": 234},
#     "meetingStats": {"scheduled": 45, "completed": 23},
#     "responseRate": 18.96
#   },
#   "topAccounts": [...]
# }

# 2. Test caching (should be faster on 2nd call)
time curl "http://localhost:3000/api/analytics/dashboard?eventId=EVENT_ID" -o /dev/null
time curl "http://localhost:3000/api/analytics/dashboard?eventId=EVENT_ID" -o /dev/null

# 3. Load test
ab -n 100 -c 10 "http://localhost:3000/api/analytics/dashboard?eventId=EVENT_ID"
```

**Acceptance Criteria:**
- [ ] API returns complete metrics
- [ ] Response time <200ms (cached)
- [ ] Response time <2s (uncached)
- [ ] Handles concurrent requests
- [ ] Cache invalidation works
- [ ] Data accuracy verified

---

[Continue with remaining tasks for Sprints 20-24 following the same detailed format...]

---

## Summary of Remaining Work

**Sprint 21: Mobile-First UI & PWA** (4 days)
- Task 21.1: Mobile-responsive navigation redesign
- Task 21.2: Touch-optimized components
- Task 21.3: PWA manifest and service worker
- Task 21.4: Offline data caching
- Task 21.5: Mobile keyboard shortcuts

**Sprint 22: Security & Compliance** (3 days)
- Task 22.1: Rate limiting implementation
- Task 22.2: Input sanitization audit
- Task 22.3: CSRF protection
- Task 22.4: SQL injection prevention audit
- Task 22.5: Security headers configuration
- Task 22.6: Audit log enhancement

**Sprint 23: Production Hardening** (4 days)
- Task 23.1: Error boundary implementation
- Task 23.2: Monitoring and alerting setup
- Task 23.3: Performance monitoring
- Task 23.4: Database backup automation
- Task 23.5: Deployment rollback procedures
- Task 23.6: Health check endpoints

**Sprint 24: Polish & Documentation** (3 days)
- Task 24.1: Component documentation
- Task 24.2: API documentation generation
- Task 24.3: User guide creation
- Task 24.4: Admin documentation
- Task 24.5: Onboarding flow
- Task 24.6: Final QA and bug fixes

---

## Total Effort Estimate

- **Sprint 18:** 21 hours (Google Workspace Integration)
- **Sprint 19:** 15 hours (Bulk Operations & Performance)
- **Sprint 20:** 18 hours (Advanced Analytics)
- **Sprint 21:** 16 hours (Mobile & PWA)
- **Sprint 22:** 12 hours (Security)
- **Sprint 23:** 16 hours (Production Hardening)
- **Sprint 24:** 12 hours (Polish & Documentation)

**Total:** ~110 hours across 7 sprints (~3-4 weeks for one developer)

---

## Next Steps

1. **Review this plan** - validate priorities and adjust task estimates
2. **Set up Google Cloud Project** - obtain OAuth credentials for Sprint 18
3. **Create task tracking** - use GitHub Issues or project management tool
4. **Begin Sprint 18** - start with Task 18.1 (Google OAuth Setup)
5. **Daily standups** - track progress, adjust as needed

