# EventOps - Sprint 18-24 Roadmap

**Last Updated**: January 21, 2026  
**Status**: Ready for Implementation  
**Foundation**: Sprints 0-17 Complete

---

## Sprint 18: Google Workspace Integration

**Goal**: Seamlessly integrate with Google Calendar, Contacts, and Gmail for automated activity tracking and contact management.

**Sprint Outcome**: Users can sync meetings from Google Calendar, import contacts, track email replies automatically, and manage all communications from a unified dashboard.

---

### Task 18.1: Google OAuth Setup

**Description**: Configure Google OAuth 2.0 with NextAuth, request necessary scopes, and store refresh tokens for long-term access.

**Files to Create/Modify**:
- `eventops/src/lib/google-auth.ts`
- `eventops/src/app/api/auth/[...nextauth]/route.ts` (modify)
- `eventops/.env.example` (add Google credentials)

**Implementation**:

```typescript
// src/lib/google-auth.ts
import { google } from 'googleapis';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

export async function getGoogleClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return oauth2Client;
}
```

**Database Changes**:
```prisma
model User {
  // Add to existing User model:
  googleAccessToken  String?  @db.Text
  googleRefreshToken String?  @db.Text
  googleTokenExpiry  DateTime?
  googleSyncEnabled  Boolean  @default(false)
  lastGoogleSync     DateTime?
}
```

**API Endpoints**:
- `GET /api/google/auth/connect` - Initiate OAuth flow
- `GET /api/google/auth/callback` - Handle OAuth callback
- `POST /api/google/auth/disconnect` - Revoke access

**Validation**:
```bash
# Test OAuth flow
curl http://localhost:3000/api/google/auth/connect

# Verify token storage
psql $DATABASE_URL -c "SELECT email, google_sync_enabled FROM users WHERE google_access_token IS NOT NULL;"
```

**Acceptance Criteria**:
- [ ] OAuth flow redirects to Google consent screen
- [ ] Tokens stored securely in database
- [ ] Refresh token auto-renews on expiry
- [ ] User can disconnect Google account
- [ ] Error handling for failed auth

---

### Task 18.2: Google Calendar Sync

**Description**: Import meetings from Google Calendar, create Meeting records, and enable two-way sync for Manifest bookings.

**Files to Create**:
- `eventops/src/lib/google-calendar.ts`
- `eventops/src/app/api/google/calendar/sync/route.ts`
- `eventops/src/app/api/google/calendar/create/route.ts`

**Implementation**:

```typescript
// src/lib/google-calendar.ts
import { google } from 'googleapis';
import { getGoogleClient } from './google-auth';
import { prisma } from './db';

export async function syncCalendarEvents(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.googleAccessToken || !user?.googleRefreshToken) {
    throw new Error('Google account not connected');
  }

  const auth = await getGoogleClient(user.googleAccessToken, user.googleRefreshToken);
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

  for (const event of events) {
    if (!event.start?.dateTime || !event.summary) continue;

    // Try to match event to a person (by email attendees)
    const attendees = event.attendees || [];
    const personEmail = attendees.find(a => a.email)?.email;
    
    let personId = null;
    if (personEmail) {
      const person = await prisma.person.findFirst({
        where: { email: personEmail },
      });
      personId = person?.id;
    }

    // Only import if we can match to a person
    if (!personId) continue;

    // Check if already imported
    const existing = await prisma.meeting.findFirst({
      where: { googleEventId: event.id },
    });

    if (existing) continue;

    // Create meeting
    const meeting = await prisma.meeting.create({
      data: {
        personId,
        scheduledAt: new Date(event.start.dateTime),
        duration: calculateDuration(event.start.dateTime, event.end?.dateTime),
        location: event.location || event.hangoutLink || null,
        status: 'SCHEDULED',
        meetingType: 'INTRO',
        notes: event.description || null,
        googleEventId: event.id,
        googleMeetLink: event.hangoutLink || null,
        createdBy: userId,
      },
    });

    imported.push(meeting);
  }

  // Update last sync time
  await prisma.user.update({
    where: { id: userId },
    data: { lastGoogleSync: new Date() },
  });

  return { imported: imported.length, total: events.length };
}

function calculateDuration(start: string, end?: string): number {
  if (!end) return 30; // Default 30 min
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(diff / 1000 / 60); // minutes
}
```

**Database Changes**:
```prisma
model Meeting {
  // Add to existing Meeting model:
  googleEventId  String?  @unique
  googleMeetLink String?
}
```

**API Endpoints**:
- `POST /api/google/calendar/sync` - Manual sync trigger
- `POST /api/google/calendar/create` - Create event in Google Calendar
- `GET /api/google/calendar/upcoming` - Fetch upcoming meetings

**Validation**:
```typescript
// tests/integration/google-calendar.test.ts
describe('Google Calendar Sync', () => {
  it('should import calendar events', async () => {
    const result = await syncCalendarEvents('user-id');
    expect(result.imported).toBeGreaterThan(0);
  });

  it('should not duplicate events', async () => {
    await syncCalendarEvents('user-id');
    const result = await syncCalendarEvents('user-id');
    expect(result.imported).toBe(0);
  });
});
```

**Acceptance Criteria**:
- [ ] Imports meetings from Google Calendar
- [ ] Matches events to Person records by email
- [ ] No duplicates on re-sync
- [ ] Handles recurring events correctly
- [ ] Creates Google Meet links automatically
- [ ] Updates existing meetings if changed in Google

---

### Task 18.3: Google Contacts Import

**Description**: Batch import Google Contacts, map to Person records, detect duplicates, and enable incremental sync.

**Files to Create**:
- `eventops/src/lib/google-contacts.ts`
- `eventops/src/app/api/google/contacts/import/route.ts`
- `eventops/src/app/dashboard/people/import-google/page.tsx`

**Implementation**:

```typescript
// src/lib/google-contacts.ts
import { google } from 'googleapis';
import { getGoogleClient } from './google-auth';
import { prisma } from './db';

export async function importGoogleContacts(userId: string, accountId?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { activeEvent: true },
  });

  if (!user?.googleAccessToken || !user?.googleRefreshToken) {
    throw new Error('Google account not connected');
  }

  if (!user.activeEventId) {
    throw new Error('No active event selected');
  }

  const auth = await getGoogleClient(user.googleAccessToken, user.googleRefreshToken);
  const people = google.people({ version: 'v1', auth });

  const response = await people.people.connections.list({
    resourceName: 'people/me',
    pageSize: 1000,
    personFields: 'names,emailAddresses,phoneNumbers,organizations',
  });

  const connections = response.data.connections || [];
  const results = { imported: 0, skipped: 0, errors: [] as string[] };

  for (const contact of connections) {
    try {
      const name = contact.names?.[0]?.displayName;
      const email = contact.emailAddresses?.[0]?.value;
      
      if (!name) {
        results.skipped++;
        continue;
      }

      // Check for duplicate
      if (email) {
        const existing = await prisma.person.findFirst({
          where: { email, account: { eventId: user.activeEventId } },
        });
        if (existing) {
          results.skipped++;
          continue;
        }
      }

      // Get or create account
      const companyName = contact.organizations?.[0]?.name || 'Unknown Company';
      let account = accountId
        ? await prisma.targetAccount.findUnique({ where: { id: accountId } })
        : await prisma.targetAccount.findFirst({
            where: { name: companyName, eventId: user.activeEventId },
          });

      if (!account) {
        account = await prisma.targetAccount.create({
          data: {
            eventId: user.activeEventId,
            name: companyName,
          },
        });
      }

      // Create person
      await prisma.person.create({
        data: {
          accountId: account.id,
          name,
          email: email || null,
          phone: contact.phoneNumbers?.[0]?.value || null,
          title: contact.organizations?.[0]?.title || null,
        },
      });

      results.imported++;
    } catch (error) {
      results.errors.push(`Failed to import ${contact.names?.[0]?.displayName}: ${error}`);
    }
  }

  return results;
}
```

**UI Component**:

```tsx
// src/app/dashboard/people/import-google/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportGoogleContactsPage() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/google/contacts/import', {
        method: 'POST',
      });
      const data = await res.json();
      setResults(data);
    } catch (error) {
      alert('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Import Google Contacts</h1>
      
      {!results ? (
        <button
          onClick={handleImport}
          disabled={importing}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {importing ? 'Importing...' : 'Import Contacts'}
        </button>
      ) : (
        <div className="bg-white p-6 rounded shadow">
          <h2 className="font-bold mb-4">Import Complete</h2>
          <p>Imported: {results.imported}</p>
          <p>Skipped: {results.skipped}</p>
          {results.errors.length > 0 && (
            <details className="mt-4">
              <summary>Errors ({results.errors.length})</summary>
              <ul className="text-sm text-red-600">
                {results.errors.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Imports all Google contacts
- [ ] Maps to existing accounts by company name
- [ ] Creates new accounts if needed
- [ ] Detects duplicate emails
- [ ] Shows import progress
- [ ] Handles errors gracefully

---

### Task 18.4: Gmail Integration

**Description**: Track sent emails automatically, update Outreach status on reply, enable thread tracking.

**Files to Create**:
- `eventops/src/lib/gmail.ts`
- `eventops/src/app/api/google/gmail/sync/route.ts`
- `eventops/src/app/api/google/gmail/send/route.ts`

**Implementation**:

```typescript
// src/lib/gmail.ts
import { google } from 'googleapis';
import { getGoogleClient } from './google-auth';
import { prisma } from './db';

export async function syncGmailThreads(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.googleAccessToken || !user?.googleRefreshToken) {
    throw new Error('Google account not connected');
  }

  const auth = await getGoogleClient(user.googleAccessToken, user.googleRefreshToken);
  const gmail = google.gmail({ version: 'v1', auth });

  // Get emails from last 7 days
  const query = `after:${Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60}`;
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 100,
  });

  const messages = response.data.messages || [];
  const updated = [];

  for (const message of messages) {
    const details = await gmail.users.messages.get({
      userId: 'me',
      id: message.id!,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Subject', 'Message-ID', 'In-Reply-To'],
    });

    const headers = details.data.payload?.headers || [];
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const inReplyTo = headers.find(h => h.name === 'In-Reply-To')?.value;

    // Extract email address
    const fromEmail = extractEmail(from);
    const toEmail = extractEmail(to);

    // Check if this is a reply to our outreach
    if (inReplyTo) {
      const outreach = await prisma.outreach.findFirst({
        where: { gmailMessageId: inReplyTo },
      });

      if (outreach && outreach.status !== 'RESPONDED') {
        await prisma.outreach.update({
          where: { id: outreach.id },
          data: {
            status: 'RESPONDED',
            respondedAt: new Date(parseInt(details.data.internalDate || '0')),
          },
        });
        updated.push(outreach.id);
      }
    }

    // Track sent emails (if we sent it)
    if (fromEmail === user.email) {
      const person = await prisma.person.findFirst({
        where: { email: toEmail },
      });

      if (person) {
        // Check if we already tracked this
        const existing = await prisma.outreach.findFirst({
          where: { gmailMessageId: message.id },
        });

        if (!existing) {
          await prisma.outreach.create({
            data: {
              personId: person.id,
              channel: 'EMAIL',
              status: 'SENT',
              subject: headers.find(h => h.name === 'Subject')?.value || '',
              message: '(Sent from Gmail)',
              gmailMessageId: message.id,
              gmailThreadId: details.data.threadId || null,
              sentAt: new Date(parseInt(details.data.internalDate || '0')),
              sentBy: user.email,
            },
          });
        }
      }
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastGoogleSync: new Date() },
  });

  return { messagesProcessed: messages.length, outreachUpdated: updated.length };
}

function extractEmail(header: string): string {
  const match = header.match(/<(.+?)>/);
  return match ? match[1] : header.trim();
}
```

**Database Changes**:
```prisma
model Outreach {
  // Add to existing Outreach model:
  gmailThreadId  String?
  gmailMessageId String?  @unique
}
```

**API Endpoints**:
- `POST /api/google/gmail/sync` - Sync recent emails
- `POST /api/google/gmail/send` - Send email via Gmail
- `GET /api/google/gmail/threads` - Get email threads

**Acceptance Criteria**:
- [ ] Syncs sent emails from Gmail
- [ ] Detects replies and updates status
- [ ] Links emails to Person records
- [ ] Handles email threads correctly
- [ ] Can send emails via Gmail API
- [ ] Avoids duplicate tracking

---

### Task 18.5: Unified Inbox Dashboard

**Description**: Create dashboard view showing all email replies, linked to outreach records, with quick response interface.

**Files to Create**:
- `eventops/src/app/dashboard/inbox/page.tsx`
- `eventops/src/components/inbox-thread.tsx`
- `eventops/src/components/quick-reply.tsx`

**Implementation**:

```tsx
// src/app/dashboard/inbox/page.tsx
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { InboxThread } from '@/components/inbox-thread';

export default async function InboxPage() {
  const session = await auth();
  
  const user = await prisma.user.findUnique({
    where: { email: session!.user.email! },
  });

  if (!user?.activeEventId) {
    return <div>No active event</div>;
  }

  // Get outreach with responses
  const threads = await prisma.outreach.findMany({
    where: {
      person: {
        account: { eventId: user.activeEventId },
      },
      status: 'RESPONDED',
      gmailThreadId: { not: null },
    },
    include: {
      person: {
        include: { account: true },
      },
    },
    orderBy: { respondedAt: 'desc' },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inbox</h1>
      
      <div className="bg-white rounded shadow divide-y">
        {threads.map(thread => (
          <InboxThread key={thread.id} outreach={thread} />
        ))}
        
        {threads.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No responses yet
          </div>
        )}
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Shows all email responses
- [ ] Groups by thread
- [ ] Shows person and company context
- [ ] Quick reply button
- [ ] Mark as read/unread
- [ ] Archive functionality

---

## Sprint 19: Bulk Dossier Generation

**Goal**: Generate AI research dossiers for all high-value accounts efficiently with queue management and progress tracking.

---

### Task 19.1: Bulk Research API

**Description**: Create bulk endpoint with queueing to handle rate limits and show progress.

**Files to Create**:
- `eventops/src/lib/research-queue.ts`
- `eventops/src/app/api/research/bulk/route.ts`

**Implementation**:

```typescript
// src/lib/research-queue.ts
import { prisma } from './db';
import { generateCompanyResearch } from './ai-research';

interface QueueItem {
  accountId: string;
  accountName: string;
  priority: number;
}

class ResearchQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private results: Map<string, { status: string; error?: string }> = new Map();

  async addBatch(accountIds: string[]) {
    const accounts = await prisma.targetAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true, icpScore: true },
    });

    accounts.forEach(account => {
      this.queue.push({
        accountId: account.id,
        accountName: account.name,
        priority: account.icpScore || 0,
      });
    });

    // Sort by priority (highest ICP score first)
    this.queue.sort((a, b) => b.priority - a.priority);

    if (!this.processing) {
      this.processQueue();
    }

    return { queued: accounts.length };
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const item = this.queue.shift()!;

    try {
      const account = await prisma.targetAccount.findUnique({
        where: { id: item.accountId },
      });

      if (!account) {
        this.results.set(item.accountId, { status: 'not_found' });
        return;
      }

      // Check if recent dossier exists
      const existing = await prisma.companyDossier.findFirst({
        where: { accountId: item.accountId },
      });

      const daysSince = existing
        ? Math.floor((Date.now() - existing.researchedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSince < 7) {
        this.results.set(item.accountId, { status: 'skipped', error: 'Recent dossier exists' });
        return;
      }

      // Generate research
      const research = await generateCompanyResearch(account.name, account.website || undefined);

      // Save dossier
      await prisma.companyDossier.upsert({
        where: { accountId: item.accountId },
        create: {
          accountId: item.accountId,
          companyOverview: research.companyOverview || null,
          recentNews: research.recentNews || null,
          industryContext: research.industryContext || null,
          keyPainPoints: research.keyPainPoints || null,
          companySize: research.companySize || null,
          facilityCount: research.facilityCount || null,
          locations: research.locations || null,
          operationalScale: research.operationalScale || null,
          rawData: JSON.stringify(research),
          researchedAt: new Date(),
          researchedBy: 'system',
        },
        update: {
          companyOverview: research.companyOverview || null,
          recentNews: research.recentNews || null,
          industryContext: research.industryContext || null,
          keyPainPoints: research.keyPainPoints || null,
          companySize: research.companySize || null,
          facilityCount: research.facilityCount || null,
          locations: research.locations || null,
          operationalScale: research.operationalScale || null,
          rawData: JSON.stringify(research),
          researchedAt: new Date(),
          researchedBy: 'system',
        },
      });

      this.results.set(item.accountId, { status: 'completed' });

      // Rate limit: 1 per second
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      this.results.set(item.accountId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      // Process next item
      this.processQueue();
    }
  }

  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      completed: Array.from(this.results.entries()).map(([id, result]) => ({
        accountId: id,
        ...result,
      })),
    };
  }
}

export const researchQueue = new ResearchQueue();
```

**API Endpoint**:

```typescript
// src/app/api/research/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { researchQueue } from '@/lib/research-queue';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { accountIds } = await req.json();

  if (!accountIds || accountIds.length === 0) {
    return NextResponse.json({ error: 'accountIds required' }, { status: 400 });
  }

  const result = await researchQueue.addBatch(accountIds);
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = researchQueue.getStatus();
  return NextResponse.json(status);
}
```

**Acceptance Criteria**:
- [ ] Queues multiple accounts
- [ ] Processes at 1/second to avoid rate limits
- [ ] Prioritizes by ICP score
- [ ] Returns progress status
- [ ] Handles errors gracefully
- [ ] Skips recent dossiers

---

### Task 19.2: Bulk Generation UI

**Description**: Create UI for selecting accounts and showing progress.

**Files to Create**:
- `eventops/src/app/dashboard/research/bulk/page.tsx`
- `eventops/src/components/bulk-research-progress.tsx`

**Implementation**:

```tsx
// src/app/dashboard/research/bulk/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function BulkResearchPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (processing) {
      interval = setInterval(checkStatus, 2000);
    }
    return () => clearInterval(interval);
  }, [processing]);

  const loadAccounts = async () => {
    const res = await fetch('/api/research/candidates');
    const data = await res.json();
    setAccounts(data.accounts);
  };

  const checkStatus = async () => {
    const res = await fetch('/api/research/bulk');
    const data = await res.json();
    setStatus(data);
    
    if (data.queueLength === 0 && !data.processing) {
      setProcessing(false);
    }
  };

  const startBulkResearch = async () => {
    setProcessing(true);
    const accountIds = Array.from(selected);
    
    await fetch('/api/research/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountIds }),
    });
  };

  const selectTop100 = () => {
    const top100 = accounts.slice(0, 100).map(a => a.id);
    setSelected(new Set(top100));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bulk Research Generation</h1>
        <div className="space-x-2">
          <button
            onClick={selectTop100}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Select Top 100
          </button>
          <button
            onClick={startBulkResearch}
            disabled={selected.size === 0 || processing}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-300"
          >
            {processing ? 'Processing...' : `Generate (${selected.size})`}
          </button>
        </div>
      </div>

      {processing && status && (
        <div className="bg-blue-50 p-4 rounded">
          <h2 className="font-bold mb-2">Progress</h2>
          <p>Queue: {status.queueLength} remaining</p>
          <p>Completed: {status.completed.length}</p>
          <div className="mt-2 bg-white rounded p-2 max-h-40 overflow-y-auto text-sm">
            {status.completed.map((r: any) => (
              <div key={r.accountId} className={r.status === 'error' ? 'text-red-600' : 'text-green-600'}>
                {r.accountId}: {r.status} {r.error ? `(${r.error})` : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === accounts.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(new Set(accounts.map(a => a.id)));
                    } else {
                      setSelected(new Set());
                    }
                  }}
                />
              </th>
              <th className="px-6 py-3 text-left">Company</th>
              <th className="px-6 py-3 text-left">ICP Score</th>
              <th className="px-6 py-3 text-left">Dossier Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(account => (
              <tr key={account.id}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(account.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selected);
                      if (e.target.checked) {
                        newSelected.add(account.id);
                      } else {
                        newSelected.delete(account.id);
                      }
                      setSelected(newSelected);
                    }}
                  />
                </td>
                <td className="px-6 py-4">{account.name}</td>
                <td className="px-6 py-4">{account.icpScore}</td>
                <td className="px-6 py-4">
                  {account.hasDossier ? (
                    <span className="text-green-600">✓ Has dossier</span>
                  ) : (
                    <span className="text-gray-500">No dossier</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Shows accounts needing research
- [ ] "Select Top 100" button
- [ ] Individual selection
- [ ] Real-time progress updates
- [ ] Shows errors inline
- [ ] Can't start while processing

---

## Sprint 20: Advanced Analytics & Reporting

**Goal**: Deep insights with conversion funnels, engagement heatmaps, campaign comparison, and predictive scoring.

---

### Task 20.1: Conversion Funnel Analytics

**Description**: Track and visualize LinkedIn → Email → Meeting → Deal pipeline with drop-off analysis.

**Files to Create**:
- `eventops/src/app/api/analytics/funnel/route.ts`
- `eventops/src/app/dashboard/analytics/funnel/page.tsx`
- `eventops/src/components/funnel-chart.tsx`

**Validation**:
```typescript
// Should return funnel data
const funnel = await fetch('/api/analytics/funnel?persona=ExecOps');
expect(funnel).toHaveProperty('stages');
expect(funnel.stages).toHaveLength(4);
```

**Acceptance Criteria**:
- [ ] Shows conversion rates between stages
- [ ] Filter by persona
- [ ] Filter by campaign
- [ ] Shows average time between stages
- [ ] Identifies drop-off points
- [ ] Visual funnel chart

---

### Task 20.2: Engagement Heatmap

**Description**: Analyze best days/times for outreach based on open rates and response rates.

**Implementation Notes**:
- Group outreach by day of week and hour
- Calculate open rate and response rate per time slot
- Display as heatmap (Monday-Sunday, 9am-5pm)
- Allow filtering by persona and campaign

**Acceptance Criteria**:
- [ ] Heatmap shows best times to send
- [ ] Separate views for opens vs responses
- [ ] Filter by persona
- [ ] Shows sample size per cell
- [ ] Export recommendations

---

### Task 20.3: Campaign Comparison Dashboard

**Description**: Side-by-side metrics for multiple campaigns with template effectiveness analysis.

**Acceptance Criteria**:
- [ ] Compare 2-4 campaigns side-by-side
- [ ] Metrics: sent, open rate, response rate, meetings
- [ ] Best performing templates highlighted
- [ ] Persona breakdown per campaign
- [ ] ROI calculation (meetings/effort)

---

### Task 20.4: Predictive Meeting Likelihood Score

**Description**: ML model to predict which contacts are most likely to take a meeting.

**Implementation Notes**:
- Train on historical data: ICP score, persona, engagement history, company size
- Use simple logistic regression or decision tree
- Score all people 0-100
- Prioritize outreach queue by score

**Acceptance Criteria**:
- [ ] Model trains on historical data
- [ ] Scores all contacts
- [ ] Accuracy >70% on test set
- [ ] Integrates with outreach queue
- [ ] Retrains weekly

---

## Sprint 21: Mobile Optimization for Manifest Event

**Goal**: Full mobile experience for on-site usage with PWA, offline mode, and quick actions.

---

### Task 21.1: Progressive Web App (PWA)

**Files to Create**:
- `eventops/public/manifest.json` (update)
- `eventops/public/sw.js` (service worker)
- `eventops/src/app/layout.tsx` (add PWA meta tags)

**Acceptance Criteria**:
- [ ] Install prompt appears on mobile
- [ ] App icon on home screen
- [ ] Splash screen
- [ ] Fullscreen mode
- [ ] Works offline (cached pages)

---

### Task 21.2: Mobile-First UI Redesign

**Acceptance Criteria**:
- [ ] Touch-friendly buttons (44px min)
- [ ] Swipe gestures (left = delete, right = complete)
- [ ] Bottom navigation
- [ ] Responsive tables (cards on mobile)
- [ ] Large tap targets

---

### Task 21.3: Quick Actions

**Features**:
- QR code scanner (scan attendee badges)
- Voice notes (meeting outcomes)
- Photo attachments (booth pictures)
- Quick meeting log

**Acceptance Criteria**:
- [ ] Camera access for QR
- [ ] Microphone for voice notes
- [ ] Photo upload to S3/Cloudinary
- [ ] All work offline, sync later

---

## Sprint 22: Testing & Quality Assurance

**Goal**: Production-ready reliability with 80%+ test coverage.

---

### Task 22.1: Unit Tests

**Coverage Target**: All `src/lib/*` functions

**Files to Create**:
- `eventops/tests/unit/ai-research.test.ts`
- `eventops/tests/unit/icp-calculator.test.ts`
- `eventops/tests/unit/email-scraper.test.ts`

**Tools**: Vitest, @testing-library/react

**Acceptance Criteria**:
- [ ] 80%+ code coverage
- [ ] All utility functions tested
- [ ] Edge cases covered
- [ ] CI runs tests on push

---

### Task 22.2: Integration Tests

**Coverage Target**: All API endpoints

**Example**:
```typescript
describe('POST /api/outreach/generate-ai', () => {
  it('should generate personalized outreach', async () => {
    const response = await fetch('/api/outreach/generate-ai', {
      method: 'POST',
      body: JSON.stringify({ personIds: ['person-1'], channel: 'EMAIL' }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.generated).toBeGreaterThan(0);
  });
});
```

---

### Task 22.3: E2E Tests

**Coverage Target**: Critical user flows

**Flows to Test**:
1. Login → View Dashboard → Create Account → Add Person
2. Generate AI Outreach → Send Email → Track Response
3. Import CSV → Map Columns → Import 100 records
4. Create Campaign → Add Sequence → Generate Outreach

**Tools**: Playwright

---

### Task 22.4: Performance Optimization

**Tasks**:
- Add database indexes on frequently queried fields
- Implement Redis caching for dossiers and analytics
- Lazy load dashboard components
- Optimize bundle size (code splitting)
- Compress images
- CDN for static assets

**Metrics**:
- [ ] Lighthouse score >90
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3s
- [ ] Bundle size <200KB (gzipped)

---

## Sprint 23: Security & Compliance

**Goal**: Enterprise-ready security and compliance.

---

### Task 23.1: Data Encryption

- Encrypt PII fields at rest (email, phone)
- Use Prisma middleware for transparent encryption
- Secure API keys in Vercel environment
- HTTPS everywhere (force SSL)

---

### Task 23.2: Rate Limiting

- API endpoint rate limits (100 req/min per user)
- DDoS protection via Vercel Edge
- Abuse detection (flag suspicious activity)

---

### Task 23.3: Audit Logging

- Log all data changes (who, what, when)
- Export audit logs to CSV
- Compliance reports (GDPR, CCPA)

---

### Task 23.4: Access Control

- Role-based permissions (Admin, Member, Viewer)
- Team management (invite, remove)
- Event-level data isolation
- API key scoping

---

## Sprint 24: Documentation

**Goal**: Complete user and developer documentation.

---

### Task 24.1: User Guide

- Feature walkthroughs with screenshots
- Video tutorials (5-10 min each)
- Best practices guide
- FAQ

---

### Task 24.2: API Documentation

- OpenAPI 3.0 spec
- Interactive docs (Swagger UI)
- Code examples (curl, JavaScript)
- Authentication guide

---

### Task 24.3: Developer Setup

- Contribution guide
- Architecture diagrams
- Database schema docs
- Local development guide

---

### Task 24.4: Video Tutorials

**Topics**:
1. Platform Overview (5 min)
2. Creating Your First Campaign (7 min)
3. AI Outreach Generation (8 min)
4. Manifest App Integration (6 min)
5. Analytics & Reporting (10 min)

---

## Implementation Timeline

| Sprint | Effort (days) | Priority | Dependencies |
|--------|---------------|----------|--------------|
| 18 - Google Workspace | 7-10 | High | Sprint 0-17 |
| 19 - Bulk Dossiers | 3-5 | High | Sprint 3 |
| 20 - Analytics | 5-7 | Medium | Sprint 7-9 |
| 21 - Mobile | 5-7 | Medium | Sprint 0-17 |
| 22 - Testing | 7-10 | High | All sprints |
| 23 - Security | 5-7 | High | All sprints |
| 24 - Documentation | 5-7 | Medium | All sprints |

**Total**: ~37-53 days of development work

---

## Success Metrics

### Pre-Event (Before Manifest 2026)
- [ ] 2,000+ accounts with dossiers generated
- [ ] 4,000+ contacts enriched (email found)
- [ ] 10+ campaigns created
- [ ] 500+ LinkedIn connections tracked
- [ ] Google Calendar synced for all users

### During Event
- [ ] 500+ meeting requests sent via Manifest app
- [ ] 100+ meetings booked
- [ ] 80%+ response rate on targeted outreach
- [ ] <2s page load on mobile

### Post-Event
- [ ] 50+ deals in pipeline
- [ ] $5M+ pipeline value
- [ ] 90% user satisfaction
- [ ] 10x ROI on platform development

---

**Next Steps**: Pick Sprint 18 or 19 to start implementation. Both are high priority and have minimal dependencies.
