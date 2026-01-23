# Sprint 18: Google Workspace Integration (REVISED)

**Philosophy Compliant:** ✅ All tasks follow YardFlow Philosophy v1.0  
**Status:** Ready for Implementation  
**Foundation:** Sprints 0-17 Complete & Deployed  
**Production URL:** https://yard-flow-hitlist.vercel.app

---

## Sprint Overview

**Goal:** Seamless, safe Google Workspace integration with automated activity tracking  
**Demo:** User connects Google account in dry-run mode, reviews proposed changes, enables live sync, sees meetings/emails automatically tracked

**Safety-First Approach:**
- All automation starts in DRY-RUN mode
- User-level kill switches for all sync operations
- Idempotent operations prevent duplicates
- Rate limiting protects API quotas
- Full audit trail of all actions

---

## Task 18.1: Google OAuth Setup & Safety Infrastructure

**Priority:** CRITICAL  
**Dependencies:** None

**Description:**  
Configure Google OAuth 2.0 with NextAuth, add token storage with safety controls (kill switch, dry-run mode, rate limits, audit logging).

**Scope Boundaries (What this does NOT include):**
- Service account authentication (user OAuth only)
- Domain-wide delegation
- Multiple calendar support (primary calendar only in future tasks)
- Offline access beyond refresh token
- Google Admin SDK integration
- Shared calendar permissions

**Files to Create:**
- `eventops/src/lib/google/auth.ts` (OAuth client + token refresh)
- `eventops/src/lib/google/circuit-breaker.ts` (Rate limit protection)
- `eventops/src/lib/google/telemetry.ts` (Audit logging)
- `eventops/src/app/api/google/connect/route.ts` (OAuth initiation)
- `eventops/src/app/api/google/disconnect/route.ts` (Revoke access)

**Files to Modify:**
- `eventops/src/auth.ts` (add Google provider to NextAuth)
- `eventops/.env.example` (add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- `eventops/prisma/schema.prisma` (add users fields + sync locks table)

**Database Migration:**
```prisma
model users {
  // ... existing fields
  
  // OAuth tokens
  googleAccessToken  String?  @db.Text
  googleRefreshToken String?  @db.Text
  googleTokenExpiry  DateTime?
  
  // Sync control
  googleSyncEnabled  Boolean  @default(false)
  googleSyncPaused   Boolean  @default(false)  // KILL SWITCH
  googleSyncDryRun   Boolean  @default(true)   // START SAFE
  googleRateLimit    Int      @default(10)     // API calls/min
  
  // Audit
  lastGoogleSync     DateTime?
  googleSyncAuditLog Json[]   @default([])
  
  @@index([googleSyncEnabled, googleSyncPaused])
}

// Idempotency locks
model google_sync_locks {
  id          String   @id
  userId      String
  lockType    String   // 'calendar', 'gmail', 'contacts'
  acquiredAt  DateTime @default(now())
  expiresAt   DateTime
  
  @@unique([userId, lockType])
  @@index([expiresAt]) // For cleanup cron
}

// API call telemetry
model google_api_logs {
  id        String   @id
  userId    String
  apiType   String   // 'calendar', 'gmail', 'contacts'
  action    String
  success   Boolean
  metadata  Json
  timestamp DateTime @default(now())
  
  @@index([userId, timestamp])
  @@index([apiType, timestamp])
}
```

**Implementation:**

```typescript
// src/lib/google/auth.ts
import { google } from 'googleapis';
import { prisma } from '@/lib/db';

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
    
    // If refresh fails, disable sync (likely revoked)
    throw new Error('Google token refresh failed - access may be revoked');
  }
}

export async function getGoogleClient(userId: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
      googleSyncPaused: true,
    },
  });

  if (!user?.googleRefreshToken) {
    throw new Error('Google account not connected');
  }

  // KILL SWITCH: Check if paused
  if (user.googleSyncPaused) {
    throw new Error('Google sync is paused for this user');
  }

  // Check if token needs refresh (with 5min buffer)
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;
  const needsRefresh = !user.googleTokenExpiry || 
    user.googleTokenExpiry.getTime() - bufferMs < now.getTime();

  if (needsRefresh) {
    try {
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
    } catch (error) {
      // Auto-disable on refresh failure
      await prisma.users.update({
        where: { id: userId },
        data: {
          googleSyncEnabled: false,
          googleSyncPaused: true,
        },
      });
      throw error;
    }
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  });
  return oauth2Client;
}
```

```typescript
// src/lib/google/circuit-breaker.ts
export class CircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailure = new Map<string, number>();
  private readonly maxFailures = 5;
  private readonly cooldownMs = 5 * 60 * 1000; // 5 minutes

  async call<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const failures = this.failures.get(userId) || 0;

    // Circuit OPEN: Too many failures
    if (failures >= this.maxFailures) {
      const lastFail = this.lastFailure.get(userId) || 0;
      
      if (Date.now() - lastFail < this.cooldownMs) {
        throw new Error(`Circuit breaker open for user ${userId} - cooling down`);
      }

      // Reset after cooldown
      this.failures.delete(userId);
      this.lastFailure.delete(userId);
    }

    try {
      const result = await fn();
      this.failures.set(userId, 0); // Success resets counter
      return result;
    } catch (error) {
      this.failures.set(userId, failures + 1);
      this.lastFailure.set(userId, Date.now());
      throw error;
    }
  }

  getStatus(userId: string) {
    const failures = this.failures.get(userId) || 0;
    const lastFail = this.lastFailure.get(userId) || 0;
    const isOpen = failures >= this.maxFailures && 
      Date.now() - lastFail < this.cooldownMs;

    return {
      state: isOpen ? 'open' : failures > 0 ? 'half-open' : 'closed',
      failures,
      lastFailure: lastFail ? new Date(lastFail) : null,
    };
  }
}

export const googleCircuitBreaker = new CircuitBreaker();
```

```typescript
// src/lib/google/telemetry.ts
import { prisma } from '@/lib/db';

export async function logGoogleAPICall(
  userId: string,
  apiType: 'calendar' | 'gmail' | 'contacts',
  action: string,
  metadata: Record<string, any> = {},
  success: boolean = true
) {
  // Database log
  await prisma.google_api_logs.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      apiType,
      action,
      success,
      metadata,
      timestamp: new Date(),
    },
  }).catch(err => {
    // Don't fail operation if logging fails
    console.error('Failed to log Google API call:', err);
  });

  // Console log for Vercel monitoring
  console.log(JSON.stringify({
    event: 'google_api_call',
    userId,
    apiType,
    action,
    success,
    ...metadata,
  }));
}
```

```typescript
// src/app/api/google/connect/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect('/login');
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/auth/callback/google`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GOOGLE_SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  return NextResponse.redirect(authUrl.toString());
}
```

```typescript
// src/app/api/google/disconnect/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Clear all Google data
  await prisma.users.update({
    where: { id: session.user.id },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleSyncEnabled: false,
      googleSyncPaused: false,
      googleSyncDryRun: true,
      lastGoogleSync: null,
    },
  });

  // Clean up locks
  await prisma.google_sync_locks.deleteMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
```

**API Endpoints:**
- `GET /api/google/connect` - Initiates OAuth flow
- `POST /api/google/disconnect` - Revokes access, clears all Google data

**Validation:**

```bash
# 1. Run migration
cd eventops
npx prisma migrate dev --name add_google_oauth_with_safety_rails

# 2. Verify schema
npx prisma studio
# Check users table has all new fields with correct defaults

# 3. Test OAuth flow (manual - requires browser)
curl http://localhost:3000/api/google/connect
# Should redirect to Google OAuth consent screen

# 4. After OAuth callback, verify token storage
psql $DATABASE_URL -c "
  SELECT 
    id, email, 
    google_sync_enabled,
    google_sync_paused,
    google_sync_dry_run,
    google_token_expiry,
    google_rate_limit
  FROM users 
  WHERE google_access_token IS NOT NULL;
"
# Expected: user with google_sync_dry_run = true (safe default)

# 5. Test token refresh
node -e "
const { getGoogleClient } = require('./dist/lib/google/auth');
getGoogleClient('USER_ID').then(() => console.log('✅ Token refresh works'));
"

# 6. Test kill switch
psql $DATABASE_URL -c "
  UPDATE users SET google_sync_paused = true WHERE id = 'USER_ID';
"

node -e "
const { getGoogleClient } = require('./dist/lib/google/auth');
getGoogleClient('USER_ID').catch(err => 
  console.log('✅ Kill switch works:', err.message)
);
"
# Expected: Error "Google sync is paused for this user"

# 7. Test circuit breaker
node -e "
const { googleCircuitBreaker } = require('./dist/lib/google/circuit-breaker');
async function test() {
  for (let i = 0; i < 6; i++) {
    try {
      await googleCircuitBreaker.call('user-123', async () => {
        throw new Error('Simulated failure');
      });
    } catch (err) {
      console.log(\`Attempt \${i + 1}: \${err.message}\`);
    }
  }
}
test();
"
# Expected: After 5 failures, "Circuit breaker open" message

# 8. Test disconnect
curl -X POST http://localhost:3000/api/google/disconnect \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

psql $DATABASE_URL -c "
  SELECT 
    google_access_token, 
    google_refresh_token, 
    google_sync_enabled 
  FROM users 
  WHERE id = 'USER_ID';
"
# Expected: All Google fields NULL or false
```

**Acceptance Criteria:**
- [ ] OAuth flow redirects to Google with all required scopes
- [ ] Access token and refresh token stored encrypted
- [ ] Token expiry tracked and auto-refreshed with 5min buffer
- [ ] Token refresh failure auto-disables sync
- [ ] User can disconnect Google account completely
- [ ] All Google data cleared on disconnect
- [ ] Kill switch (googleSyncPaused) prevents all operations
- [ ] Dry-run mode defaults to enabled (safe by default)
- [ ] Circuit breaker opens after 5 consecutive failures
- [ ] Circuit breaker cooldown works (5min)
- [ ] Telemetry logs all API calls
- [ ] Environment variables documented in .env.example

**Failure Modes & Edge Cases:**

1. **Token Refresh Fails (401/403)**
   - Scenario: User revokes access in Google account
   - Handling: Auto-disable sync, set `googleSyncPaused = true`
   - User notification: Show "Reconnect Google" message in UI

2. **OAuth Callback Timeout**
   - Scenario: User abandons OAuth flow
   - Handling: No DB changes, user can retry
   - Cleanup: No cleanup needed (no state created)

3. **Concurrent Token Refresh**
   - Scenario: Two requests need refresh simultaneously
   - Handling: Prisma transaction ensures only one refresh
   - Verification: Check logs for single refresh API call

4. **Circuit Breaker Open**
   - Scenario: 5+ consecutive Google API failures
   - Handling: Block further calls for 5 minutes
   - Recovery: Automatic after cooldown, manual reset via disconnect/reconnect

5. **Database Migration Rollback**
   - Scenario: Need to revert OAuth implementation
   - Handling: See rollback plan below
   - Data preservation: Optionally keep imported data

**Rollback Plan:**

```bash
# IMMEDIATE: Disable OAuth provider (prevents new connections)
# 1. Comment out Google provider in src/auth.ts

# 2. Pause all active syncs (safety measure)
psql $DATABASE_URL -c "
  UPDATE users 
  SET google_sync_paused = true 
  WHERE google_sync_enabled = true;
"

# 3. Create down migration
npx prisma migrate dev --name rollback_google_oauth_down --create-only

# Edit migration file:
# -- Remove tables
# DROP TABLE IF EXISTS google_api_logs;
# DROP TABLE IF EXISTS google_sync_locks;
# 
# -- Remove columns from users
# ALTER TABLE users DROP COLUMN IF EXISTS google_access_token;
# ALTER TABLE users DROP COLUMN IF EXISTS google_refresh_token;
# ALTER TABLE users DROP COLUMN IF EXISTS google_token_expiry;
# ALTER TABLE users DROP COLUMN IF EXISTS google_sync_enabled;
# ALTER TABLE users DROP COLUMN IF EXISTS google_sync_paused;
# ALTER TABLE users DROP COLUMN IF EXISTS google_sync_dry_run;
# ALTER TABLE users DROP COLUMN IF EXISTS google_rate_limit;
# ALTER TABLE users DROP COLUMN IF EXISTS last_google_sync;
# ALTER TABLE users DROP COLUMN IF EXISTS google_sync_audit_log;

# 4. Run down migration
npx prisma migrate deploy

# 5. Remove Google API files
git rm -r src/lib/google/
git rm src/app/api/google/

# 6. Optional: Clean up Google-synced data
# If want to preserve:
psql $DATABASE_URL -c "
  UPDATE meeting SET google_event_id = NULL, google_meet_link = NULL, google_synced_at = NULL;
  UPDATE outreach SET gmail_message_id = NULL, gmail_thread_id = NULL, last_checked = NULL;
"

# If want to delete:
psql $DATABASE_URL -c "
  DELETE FROM meeting WHERE google_event_id IS NOT NULL;
  DELETE FROM outreach WHERE gmail_thread_id IS NOT NULL;
"

# 7. Revert code changes
git revert <commit-sha-of-task-18.1>

# 8. Verify cleanup
npx prisma studio
# Check: No Google-related fields in users table
```

---

## Task 18.2: Calendar Sync with Full Safety Rails

**Priority:** HIGH  
**Dependencies:** Task 18.1

**Description:**  
Fetch meetings from Google Calendar, match attendees to people, create meetings with idempotent upsert, full dry-run support, rate limiting, and pagination.

**Scope Boundaries (What this does NOT include):**
- Syncing deleted events (deletion tracking)
- Bi-directional sync (Google → EventOps only, not reverse)
- All-day events (only timed events with start/end times)
- Event updates/rescheduling after initial import
- Cancelled meeting detection and status updates
- Multiple calendar support (primary calendar only)
- Tentative/declined RSVP status handling
- Event attachments, descriptions, or rich formatting
- Recurring event expansion (syncs master event only)

**Files to Create:**
- `eventops/src/lib/google/calendar.ts` (Sync logic with safety rails)
- `eventops/src/app/api/google/calendar/sync/route.ts` (API endpoint)
- `eventops/src/__tests__/google-calendar.test.ts` (Unit tests)

**Files to Modify:**
- `eventops/prisma/schema.prisma` (add Google fields to meeting table)

**Database Migration:**
```prisma
model meeting {
  // ... existing fields
  
  googleEventId  String?  @unique
  googleMeetLink String?
  googleSyncedAt DateTime?
  
  @@index([googleEventId])
  @@index([googleSyncedAt])
}
```

**Implementation:**

```typescript
// src/lib/google/calendar.ts
import { google } from 'googleapis';
import { getGoogleClient } from './auth';
import { prisma } from '@/lib/db';
import { logGoogleAPICall } from './telemetry';
import pLimit from 'p-limit'; // npm install p-limit

export interface CalendarSyncOptions {
  dryRun?: boolean;
  force?: boolean; // Re-import even if already synced
  daysBack?: number; // How far back to sync (default: 30)
}

export interface CalendarSyncResult {
  dryRun: boolean;
  imported: number;
  updated: number;
  skipped: number;
  total: number;
  details: {
    imported: any[];
    updated: any[];
    skipped: Array<{ id: string; reason: string }>;
  };
}

export async function syncCalendarEvents(
  userId: string,
  options: CalendarSyncOptions = {}
): Promise<CalendarSyncResult> {
  // 1. IDEMPOTENCY: Acquire lock
  const lockId = await acquireSyncLock(userId, 'calendar', 300);
  if (!lockId) {
    throw new Error('Calendar sync already in progress for this user');
  }

  try {
    // Get user settings
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        googleSyncPaused: true,
        googleSyncDryRun: true,
        googleRateLimit: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 2. KILL SWITCH: Check if paused
    if (user.googleSyncPaused) {
      throw new Error('Google sync is paused - enable in settings');
    }

    const isDryRun = options.dryRun ?? user.googleSyncDryRun ?? false;
    const daysBack = options.daysBack ?? 30;

    // 3. RATE LIMITING: Setup throttle
    const rateLimit = user.googleRateLimit || 10;
    const limit = pLimit(rateLimit);

    const auth = await getGoogleClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    // 4. PAGINATION: Fetch all events
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - daysBack);

    let pageToken: string | undefined;
    const allEvents = [];
    let apiCallCount = 0;

    do {
      const response = await limit(async () => {
        apiCallCount++;
        const result = await calendar.events.list({
          calendarId: 'primary',
          timeMin: timeMin.toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: 'startTime',
          pageToken,
        });

        await logGoogleAPICall(userId, 'calendar', 'events.list', {
          pageToken: !!pageToken,
          itemsReturned: result.data.items?.length || 0,
        });

        return result;
      });

      allEvents.push(...(response.data.items || []));
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    const imported = [];
    const updated = [];
    const skipped = [];

    for (const event of allEvents) {
      // EDGE CASE 1: Validate required fields
      if (!event.id || !event.start?.dateTime || !event.summary) {
        skipped.push({
          id: event.id || 'unknown',
          reason: 'Missing required fields (id, start.dateTime, or summary)',
        });
        continue;
      }

      // EDGE CASE 2: Skip all-day events (scope boundary)
      if (event.start.date && !event.start.dateTime) {
        skipped.push({
          id: event.id,
          reason: 'All-day event (not supported)',
        });
        continue;
      }

      // EDGE CASE 3: Skip recurring instances (sync master only)
      if (event.recurringEventId && event.id !== event.recurringEventId) {
        skipped.push({
          id: event.id,
          reason: 'Recurring instance (master event synced separately)',
        });
        continue;
      }

      // EDGE CASE 4: Skip cancelled events
      if (event.status === 'cancelled') {
        skipped.push({
          id: event.id,
          reason: 'Event cancelled in Google Calendar',
        });
        continue;
      }

      // Check if already synced
      const existing = await prisma.meeting.findFirst({
        where: { googleEventId: event.id },
      });

      if (existing && !options.force) {
        skipped.push({
          id: event.id,
          reason: 'Already synced (use force: true to re-import)',
        });
        continue;
      }

      // EDGE CASE 5: Match attendees to people (handle multiple matches)
      const attendees = event.attendees?.filter(a => a.email) || [];
      
      if (attendees.length === 0) {
        skipped.push({
          id: event.id,
          reason: 'No attendees found',
        });
        continue;
      }

      const attendeeEmails = attendees.map(a => a.email).filter(Boolean) as string[];
      
      const matchedPeople = await prisma.people.findMany({
        where: {
          email: {
            in: attendeeEmails,
            mode: 'insensitive',
          },
        },
      });

      if (matchedPeople.length === 0) {
        skipped.push({
          id: event.id,
          reason: `No matching people found for emails: ${attendeeEmails.join(', ')}`,
        });
        continue;
      }

      // EDGE CASE 6: Handle multiple person matches (take first, log others)
      if (matchedPeople.length > 1) {
        console.warn(`Multiple people matched for event ${event.id}:`, {
          eventId: event.id,
          matches: matchedPeople.map(p => ({ id: p.id, email: p.email })),
          chosen: matchedPeople[0].id,
        });
      }

      const personId = matchedPeople[0].id;

      // EDGE CASE 7: Parse duration safely (handle timezone issues)
      let duration = 30; // default
      if (event.end?.dateTime) {
        try {
          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.warn(`Invalid date format for event ${event.id}`);
          } else {
            duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 1000 / 60));
          }
        } catch (err) {
          console.error(`Failed to parse duration for event ${event.id}:`, err);
        }
      }

      // DRY RUN MODE: Don't write to DB
      if (isDryRun) {
        (existing ? updated : imported).push({
          dryRun: true,
          action: existing ? 'update' : 'create',
          eventId: event.id,
          personId,
          summary: event.summary,
          start: event.start.dateTime,
          duration,
          existing: !!existing,
        });
        continue;
      }

      // 5. IDEMPOTENCY: Upsert pattern
      const meeting = await prisma.meeting.upsert({
        where: { googleEventId: event.id },
        create: {
          id: crypto.randomUUID(),
          personId,
          scheduledAt: new Date(event.start.dateTime),
          duration,
          location: event.location || event.hangoutLink || null,
          status: 'SCHEDULED',
          meetingType: 'INTRO',
          notes: event.description?.slice(0, 1000) || null, // Limit description length
          googleEventId: event.id,
          googleMeetLink: event.hangoutLink || null,
          googleSyncedAt: new Date(),
          updatedAt: new Date(),
        },
        update: {
          scheduledAt: new Date(event.start.dateTime),
          duration,
          location: event.location || event.hangoutLink || null,
          googleMeetLink: event.hangoutLink || null,
          googleSyncedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      (existing ? updated : imported).push(meeting);
    }

    // 6. AUDIT TRAIL: Log sync
    await prisma.users.update({
      where: { id: userId },
      data: {
        lastGoogleSync: new Date(),
        googleSyncAuditLog: {
          push: {
            timestamp: new Date().toISOString(),
            type: 'calendar_sync',
            dryRun: isDryRun,
            imported: imported.length,
            updated: updated.length,
            skipped: skipped.length,
            total: allEvents.length,
            apiCalls: apiCallCount,
          },
        },
      },
    });

    await logGoogleAPICall(userId, 'calendar', 'sync_complete', {
      dryRun: isDryRun,
      imported: imported.length,
      updated: updated.length,
      skipped: skipped.length,
      totalEvents: allEvents.length,
      apiCalls: apiCallCount,
    });

    return {
      dryRun: isDryRun,
      imported: imported.length,
      updated: updated.length,
      skipped: skipped.length,
      total: allEvents.length,
      details: { imported, updated, skipped },
    };
  } finally {
    // 7. IDEMPOTENCY: Always release lock
    await releaseSyncLock(lockId);
  }
}

// Helper: Acquire sync lock with timeout
async function acquireSyncLock(
  userId: string,
  lockType: string,
  timeoutSeconds: number
): Promise<string | null> {
  const lockId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + timeoutSeconds * 1000);

  try {
    await prisma.google_sync_locks.create({
      data: {
        id: lockId,
        userId,
        lockType,
        expiresAt,
      },
    });
    return lockId;
  } catch (err) {
    // Lock already exists - check if expired
    const existingLock = await prisma.google_sync_locks.findUnique({
      where: { userId_lockType: { userId, lockType } },
    });

    if (existingLock && existingLock.expiresAt < new Date()) {
      // Expired lock - clean up and retry
      await prisma.google_sync_locks.delete({
        where: { id: existingLock.id },
      });
      
      return acquireSyncLock(userId, lockType, timeoutSeconds);
    }

    return null; // Lock held by another process
  }
}

// Helper: Release sync lock
async function releaseSyncLock(lockId: string): Promise<void> {
  await prisma.google_sync_locks.delete({
    where: { id: lockId },
  }).catch(err => {
    console.error('Failed to release sync lock:', lockId, err);
  });
}
```

```typescript
// src/app/api/google/calendar/sync/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncCalendarEvents } from '@/lib/google/calendar';
import { googleCircuitBreaker } from '@/lib/google/circuit-breaker';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { dryRun, force, daysBack } = body;

    // Use circuit breaker to prevent cascading failures
    const result = await googleCircuitBreaker.call(
      session.user.id,
      () => syncCalendarEvents(session.user.id, { dryRun, force, daysBack })
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Calendar sync error:', error);

    // Check circuit breaker status
    const cbStatus = googleCircuitBreaker.getStatus(session.user.id);
    
    return NextResponse.json(
      {
        error: error.message || 'Calendar sync failed',
        circuitBreaker: cbStatus,
      },
      { status: cbStatus.state === 'open' ? 429 : 500 }
    );
  }
}
```

**API Endpoints:**
- `POST /api/google/calendar/sync` - Syncs calendar events (supports dry-run)

**Validation:**

```bash
# 1. Run migration
cd eventops
npx prisma migrate dev --name add_google_calendar_fields

# 2. Unit tests
npm test -- src/__tests__/google-calendar.test.ts
# Expected: All test cases pass

# 3. Dry-run mode (default)
curl -X POST http://localhost:3000/api/google/calendar/sync \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Expected response:
# {
#   "dryRun": true,
#   "imported": 5,
#   "updated": 0,
#   "skipped": 3,
#   "total": 8,
#   "details": {
#     "imported": [
#       {"dryRun": true, "action": "create", "eventId": "...", ...}
#     ],
#     "skipped": [
#       {"id": "...", "reason": "All-day event (not supported)"}
#     ]
#   }
# }

# 4. Verify NO database writes in dry-run
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM meeting WHERE google_event_id IS NOT NULL;
"
# Expected: 0 (or unchanged count if ran before)

# 5. Live sync (dry-run: false)
curl -X POST http://localhost:3000/api/google/calendar/sync \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'

# Expected response:
# {
#   "dryRun": false,
#   "imported": 5,
#   "updated": 0,
#   "skipped": 3,
#   "total": 8
# }

# 6. Verify database writes
psql $DATABASE_URL -c "
  SELECT 
    m.id, 
    m.scheduled_at, 
    m.google_event_id, 
    p.name as person_name
  FROM meeting m
  JOIN people p ON m.person_id = p.id
  WHERE m.google_event_id IS NOT NULL
  ORDER BY m.google_synced_at DESC
  LIMIT 10;
"
# Expected: Newly imported meetings visible

# 7. Test idempotency (run sync twice)
curl -X POST http://localhost:3000/api/google/calendar/sync \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'

# Expected: All events in "skipped" with reason "Already synced"

# 8. Test pagination (>100 events)
# If user has >100 events, verify all are synced
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM meeting WHERE google_event_id IS NOT NULL;
"
# Expected: Count matches total events from Google Calendar

# 9. Data integrity check
psql $DATABASE_URL -c "
  -- Check for orphaned meetings
  SELECT COUNT(*) FROM meeting m
  LEFT JOIN people p ON m.person_id = p.id
  WHERE m.google_event_id IS NOT NULL AND p.id IS NULL;
"
# Expected: 0

# 10. Duplicate detection
psql $DATABASE_URL -c "
  SELECT google_event_id, COUNT(*) 
  FROM meeting 
  WHERE google_event_id IS NOT NULL
  GROUP BY google_event_id 
  HAVING COUNT(*) > 1;
"
# Expected: 0 rows (no duplicates)

# 11. Performance test (<30s for 100 events)
time curl -X POST http://localhost:3000/api/google/calendar/sync \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false, "force": true}'

# Expected: Completes in <30 seconds

# 12. Test kill switch
psql $DATABASE_URL -c "
  UPDATE users SET google_sync_paused = true WHERE id = 'USER_ID';
"

curl -X POST http://localhost:3000/api/google/calendar/sync \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Expected: {"error": "Google sync is paused - enable in settings"}

# 13. Test concurrent sync protection
# Run two syncs simultaneously in different terminals
curl -X POST http://localhost:3000/api/google/calendar/sync & \
curl -X POST http://localhost:3000/api/google/calendar/sync &

# Expected: One succeeds, other returns error about sync in progress

# 14. Check audit log
psql $DATABASE_URL -c "
  SELECT 
    id, 
    email, 
    last_google_sync,
    jsonb_array_length(google_sync_audit_log) as sync_count
  FROM users 
  WHERE google_sync_enabled = true;
"
# Expected: Audit log has entries for each sync
```

**Acceptance Criteria:**
- [ ] Dry-run mode works (no DB writes, returns preview)
- [ ] Live mode creates meetings correctly
- [ ] Idempotency prevents duplicate imports
- [ ] Pagination handles >100 events (tested with large calendar)
- [ ] Kill switch blocks sync when paused
- [ ] Rate limiting enforced (check logs for throttling)
- [ ] Concurrent sync prevented by lock
- [ ] Lock expires after timeout (300s)
- [ ] Circuit breaker opens after 5 failures
- [ ] All-day events skipped
- [ ] Recurring instances skipped (master only)
- [ ] Cancelled events skipped
- [ ] Multiple person matches handled (first used, warning logged)
- [ ] Invalid dates handled gracefully
- [ ] Audit trail logged to users table
- [ ] Telemetry logged to google_api_logs table
- [ ] No orphaned meetings (FK integrity maintained)
- [ ] No duplicate google_event_id values
- [ ] Performance: <30s for 100 events
- [ ] Upsert updates existing meetings correctly

**Failure Modes & Edge Cases:**

1. **Google Calendar API Rate Limit (429)**
   - Scenario: Exceeds quota (10,000 requests/day)
   - Handling: p-limit throttles requests, respects user.googleRateLimit
   - Recovery: Automatic retry with exponential backoff in circuit breaker

2. **Invalid/Malformed Event Data**
   - Scenario: Event has null start.dateTime or invalid timezone
   - Handling: Try-catch around date parsing, skip event, log to skipped array
   - User impact: Event not synced, visible in skipped list

3. **Large Calendar (>1000 Events)**
   - Scenario: Pagination returns many pages
   - Handling: Process all pages with rate limiting
   - Performance: May take several minutes, lock prevents timeout

4. **Person Deleted Mid-Sync**
   - Scenario: Contact deleted while sync running
   - Handling: FK constraint fails, event skipped, logged
   - Recovery: Next sync will retry if person restored

5. **Concurrent Sync Attempts**
   - Scenario: User clicks sync button multiple times
   - Handling: Lock prevents second sync, returns "already in progress"
   - UX: Button disabled during sync (handled in Task 18.6)

6. **Lock Never Released (Crash)**
   - Scenario: Server crashes mid-sync
   - Handling: Lock has 300s timeout, auto-expires
   - Cleanup: Cron job (future task) cleans expired locks

7. **Multiple Person Matches**
   - Scenario: Event attendee email matches 2+ people records
   - Handling: Use first match, log warning with all matches
   - Data quality: Indicates duplicate person records (admin should merge)

8. **OAuth Token Expired Mid-Sync**
   - Scenario: Token expires during long sync
   - Handling: getGoogleClient auto-refreshes, sync continues
   - Error case: If refresh fails, circuit breaker catches, sync stops

**Rollback Plan:**

```bash
# IMMEDIATE: Pause calendar sync for all users
psql $DATABASE_URL -c "
  UPDATE users SET google_sync_paused = true;
"

# OPTIONS FOR DATA CLEANUP:

# Option 1: Keep imported meetings, remove Google linking
psql $DATABASE_URL -c "
  UPDATE meeting 
  SET 
    google_event_id = NULL, 
    google_meet_link = NULL, 
    google_synced_at = NULL
  WHERE google_event_id IS NOT NULL;
"

# Option 2: Delete all Google-synced meetings
psql $DATABASE_URL -c "
  DELETE FROM meeting WHERE google_event_id IS NOT NULL;
"

# Rollback migration
npx prisma migrate dev --name rollback_google_calendar_fields --create-only

# Edit migration file:
# ALTER TABLE meeting DROP COLUMN IF EXISTS google_event_id;
# ALTER TABLE meeting DROP COLUMN IF EXISTS google_meet_link;
# ALTER TABLE meeting DROP COLUMN IF EXISTS google_synced_at;

npx prisma migrate deploy

# Remove code files
git rm src/lib/google/calendar.ts
git rm src/app/api/google/calendar/
git rm src/__tests__/google-calendar.test.ts

# Revert commit
git revert <commit-sha-of-task-18.2>

# Verify cleanup
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM meeting WHERE google_event_id IS NOT NULL;
"
# Expected: Error (column doesn't exist) OR 0
```

---

## Task 18.3: Background Calendar Sync (Cron Job)

**Priority:** MEDIUM  
**Dependencies:** Task 18.2

**Description:**  
Create cron job to automatically sync Google Calendar every hour for users with sync enabled and not paused. Includes global kill switch and monitoring.

**Scope Boundaries (What this does NOT include):**
- Per-user custom sync schedules (fixed hourly for all users)
- Webhook-based real-time sync (polling only)
- Sync retry logic for failed users (logs error, continues)
- Email notifications on sync failures
- Sync status dashboard (Task 18.6)
- Manual sync override during cron run

**Files to Create:**
- `eventops/src/app/api/cron/google-sync/route.ts` (Cron endpoint)
- `eventops/src/app/api/admin/google-sync/control/route.ts` (Global kill switch)

**Files to Modify:**
- `eventops/vercel.json` (add cron schedule)
- `eventops/.env.example` (add CRON_SECRET)

**Implementation:**

```typescript
// src/app/api/cron/google-sync/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncCalendarEvents } from '@/lib/google/calendar';
import { logGoogleAPICall } from '@/lib/google/telemetry';

// Global kill switch (can be toggled via admin endpoint)
let GLOBAL_SYNC_ENABLED = true;

export function setGlobalSyncEnabled(enabled: boolean) {
  GLOBAL_SYNC_ENABLED = enabled;
}

export function getGlobalSyncEnabled() {
  return GLOBAL_SYNC_ENABLED;
}

export async function GET(request: Request) {
  // 1. AUTHENTICATION: Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. GLOBAL KILL SWITCH: Check if globally disabled
  if (!GLOBAL_SYNC_ENABLED) {
    return NextResponse.json({
      success: true,
      message: 'Global sync disabled',
      totalUsers: 0,
      results: [],
    });
  }

  const startTime = Date.now();

  try {
    // 3. Find users ready for sync
    const users = await prisma.users.findMany({
      where: {
        googleSyncEnabled: true,
        googleSyncPaused: false,
        googleRefreshToken: { not: null },
      },
      select: { id: true, email: true, googleSyncDryRun: true },
    });

    console.log(`Starting cron sync for ${users.length} users`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // 4. Process each user (with error isolation)
    for (const user of users) {
      try {
        const result = await syncCalendarEvents(user.id, {
          dryRun: user.googleSyncDryRun,
        });

        results.push({
          userId: user.id,
          email: user.email,
          success: true,
          dryRun: result.dryRun,
          ...result,
        });
        
        successCount++;

        await logGoogleAPICall(user.id, 'calendar', 'cron_sync_success', {
          imported: result.imported,
          updated: result.updated,
          skipped: result.skipped,
        });
      } catch (error: any) {
        // ERROR ISOLATION: Don't let one user's failure stop others
        console.error(`Sync failed for user ${user.id}:`, error);
        
        results.push({
          userId: user.id,
          email: user.email,
          success: false,
          error: error.message,
        });

        failureCount++;

        await logGoogleAPICall(user.id, 'calendar', 'cron_sync_failure', {
          error: error.message,
        }, false);

        // If token refresh failed, pause sync for this user
        if (error.message.includes('refresh failed') || error.message.includes('revoked')) {
          await prisma.users.update({
            where: { id: user.id },
            data: { googleSyncPaused: true },
          });
        }
      }
    }

    const duration = Date.now() - startTime;

    // 5. OBSERVABILITY: Log summary
    console.log(JSON.stringify({
      event: 'cron_sync_complete',
      totalUsers: users.length,
      successCount,
      failureCount,
      durationMs: duration,
    }));

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      successCount,
      failureCount,
      durationMs: duration,
      results,
    });
  } catch (error: any) {
    console.error('Cron sync error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        totalUsers: 0,
      },
      { status: 500 }
    );
  }
}
```

```typescript
// src/app/api/admin/google-sync/control/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { setGlobalSyncEnabled, getGlobalSyncEnabled } from '@/app/api/cron/google-sync/route';

export async function POST(request: Request) {
  const session = await auth();
  
  // TODO: Add proper admin role check
  if (!session?.user?.email?.endsWith('@freightroll.com')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { action } = await request.json();

  if (action === 'enable') {
    setGlobalSyncEnabled(true);
  } else if (action === 'disable') {
    setGlobalSyncEnabled(false);
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    globalSyncEnabled: getGlobalSyncEnabled(),
  });
}

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.email?.endsWith('@freightroll.com')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return NextResponse.json({
    globalSyncEnabled: getGlobalSyncEnabled(),
  });
}
```

```json
// vercel.json (add or update)
{
  "crons": [
    {
      "path": "/api/cron/google-sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

```bash
# .env.example (add)
# Cron Job Authentication
CRON_SECRET=generate-random-secret-here
```

**API Endpoints:**
- `GET /api/cron/google-sync` - Hourly cron job (Vercel only)
- `POST /api/admin/google-sync/control` - Global kill switch (admin)
- `GET /api/admin/google-sync/control` - Check global status

**Validation:**

```bash
# 1. Generate CRON_SECRET
openssl rand -base64 32
# Add to .env and Vercel environment variables

# 2. Test cron endpoint locally
curl http://localhost:3000/api/cron/google-sync \
  -H "Authorization: Bearer $(grep CRON_SECRET .env | cut -d= -f2)"

# Expected response:
# {
#   "success": true,
#   "totalUsers": 2,
#   "successCount": 2,
#   "failureCount": 0,
#   "durationMs": 4523,
#   "results": [...]
# }

# 3. Test unauthorized access
curl http://localhost:3000/api/cron/google-sync

# Expected: {"error": "Unauthorized"}

# 4. Deploy to Vercel
vercel deploy --prod

# 5. Verify cron configuration
vercel crons ls

# Expected output:
# path                      schedule
# /api/cron/google-sync     0 * * * *

# 6. Test global kill switch
curl -X POST http://localhost:3000/api/admin/google-sync/control \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "disable"}'

# Expected: {"success": true, "globalSyncEnabled": false}

# 7. Verify sync disabled
curl http://localhost:3000/api/cron/google-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Expected: {"success": true, "message": "Global sync disabled", "totalUsers": 0}

# 8. Re-enable and verify
curl -X POST http://localhost:3000/api/admin/google-sync/control \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "enable"}'

# 9. Check Vercel logs after first cron run
vercel logs --follow | grep "cron_sync"

# Expected: Log entries for each user sync

# 10. Verify error isolation (pause one user)
psql $DATABASE_URL -c "
  UPDATE users 
  SET google_refresh_token = 'invalid-token' 
  WHERE id = 'USER_ID';
"

# Run cron, check that other users still sync successfully

# 11. Verify auto-pause on token failure
psql $DATABASE_URL -c "
  SELECT id, email, google_sync_paused
  FROM users
  WHERE google_refresh_token = 'invalid-token';
"
# Expected: google_sync_paused = true
```

**Acceptance Criteria:**
- [ ] Cron runs hourly on schedule
- [ ] Only syncs users with googleSyncEnabled = true AND googleSyncPaused = false
- [ ] CRON_SECRET authentication works
- [ ] Unauthorized requests blocked
- [ ] Global kill switch disables all syncs
- [ ] Global kill switch persists across requests (in-memory state)
- [ ] Error isolation: one user's failure doesn't stop others
- [ ] Failed token refresh auto-pauses user
- [ ] Summary logged with success/failure counts
- [ ] Individual results include error messages
- [ ] Respects dry-run mode per user
- [ ] Admin endpoint requires authentication
- [ ] Vercel cron configuration deployed

**Failure Modes & Edge Cases:**

1. **Cron Times Out (30s Vercel limit)**
   - Scenario: >30 users with slow syncs
   - Handling: Process users in batches, return partial results
   - Future: Move to background queue (Task 19)

2. **Global Kill Switch Reset on Deploy**
   - Scenario: Redeploy resets in-memory state
   - Handling: Document as known limitation
   - Future: Store in database flag

3. **Invalid CRON_SECRET**
   - Scenario: Secret mismatch or missing
   - Handling: Return 401, log attempt
   - Security: Rate limit this endpoint

4. **User Revokes Access Mid-Cron**
   - Scenario: Token refresh fails during run
   - Handling: Auto-pause user, continue to next
   - User impact: No sync until manual reconnect

5. **Concurrent Manual Sync During Cron**
   - Scenario: User clicks manual sync while cron running
   - Handling: Sync lock prevents duplicate (from Task 18.2)
   - Result: Manual sync returns "already in progress"

**Rollback Plan:**

```bash
# IMMEDIATE: Disable cron in Vercel
vercel env rm CRON_SECRET production

# This breaks authentication, effectively disabling cron
# OR use global kill switch:

curl -X POST https://yard-flow-hitlist.vercel.app/api/admin/google-sync/control \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "disable"}'

# Remove cron from vercel.json
git diff vercel.json
# Delete the crons section or remove google-sync entry

# Deploy to remove cron
vercel deploy --prod

# Verify cron removed
vercel crons ls
# Should not list /api/cron/google-sync

# Remove cron endpoint file
git rm src/app/api/cron/google-sync/route.ts
git rm src/app/api/admin/google-sync/control/route.ts

# Revert code
git revert <commit-sha-of-task-18.3>

# Manual sync still works
# Users can still trigger sync via dashboard (Task 18.6)
```

---

## Task 18.4: Gmail Reply Tracking

**Priority:** MEDIUM  
**Dependencies:** Task 18.1

**Description:**  
Monitor Gmail for replies to sent outreach emails using thread IDs, automatically update outreach status to RESPONDED, log activity.

**Scope Boundaries (What this does NOT include):**
- Tracking emails sent outside EventOps (only tracks our outreach)
- Sentiment analysis of reply content
- Auto-categorizing reply types (interested/not interested)
- Reply notification webhooks (polling only)
- Marking emails as read/unread in Gmail
- Email parsing for meeting requests (manual review)
- Bi-directional email sending (read-only tracking)

**Files to Create:**
- `eventops/src/lib/google/gmail.ts` (Gmail tracking logic)
- `eventops/src/app/api/google/gmail/check-replies/route.ts` (API endpoint)
- `eventops/src/__tests__/gmail-tracking.test.ts` (Unit tests with mocks)

**Files to Modify:**
- `eventops/prisma/schema.prisma` (add Gmail fields to outreach table)

**Database Migration:**
```prisma
model outreach {
  // ... existing fields
  
  gmailMessageId String?
  gmailThreadId  String?
  lastChecked    DateTime?
  
  @@index([gmailThreadId])
  @@index([lastChecked])
  @@index([status, lastChecked]) // For efficient queries
}
```

**Implementation:**

```typescript
// src/lib/google/gmail.ts
import { google } from 'googleapis';
import { getGoogleClient } from './auth';
import { prisma } from '@/lib/db';
import { logGoogleAPICall } from './telemetry';
import pLimit from 'p-limit';

const MAX_MESSAGES_PER_THREAD = 10; // Only check recent messages

export async function checkEmailReplies(userId: string): Promise<{
  checked: number;
  updated: number;
  details: Array<{ outreachId: string; personName: string; respondedAt: Date }>;
}> {
  const auth = await getGoogleClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  // Get outreach needing check
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const outreachToCheck = await prisma.outreach.findMany({
    where: {
      status: 'SENT',
      sentAt: { gte: thirtyDaysAgo },
      gmailThreadId: { not: null },
      OR: [
        { lastChecked: null },
        { lastChecked: { lt: new Date(Date.now() - 3600000) } }, // Not checked in last hour
      ],
    },
    include: {
      people: {
        select: { email: true, name: true },
      },
    },
    take: 50, // Batch size to prevent timeout
  });

  if (outreachToCheck.length === 0) {
    return { checked: 0, updated: 0, details: [] };
  }

  // Rate limiting
  const limit = pLimit(5); // 5 concurrent thread fetches
  const updated = [];

  await Promise.all(
    outreachToCheck.map(outreach =>
      limit(async () => {
        if (!outreach.gmailThreadId) return;

        try {
          // Fetch thread messages
          const thread = await gmail.users.threads.get({
            userId: 'me',
            id: outreach.gmailThreadId,
            format: 'metadata',
            metadataHeaders: ['From', 'Date'],
          });

          await logGoogleAPICall(userId, 'gmail', 'threads.get', {
            threadId: outreach.gmailThreadId,
            messageCount: thread.data.messages?.length || 0,
          });

          const messages = thread.data.messages || [];

          // EDGE CASE: Limit to last 10 messages for performance
          const recentMessages = messages.slice(-MAX_MESSAGES_PER_THREAD);

          // Check for replies from contact
          for (const message of recentMessages) {
            const headers = message.payload?.headers || [];
            const fromHeader = headers.find(h => h.name === 'From');
            const dateHeader = headers.find(h => h.name === 'Date');

            if (!fromHeader?.value) continue;

            // EDGE CASE: Extract email from "Name <email>" format
            const emailMatch = fromHeader.value.match(/<([^>]+)>/);
            const fromEmail = emailMatch ? emailMatch[1] : fromHeader.value;

            // Check if reply is from the contact (case-insensitive)
            if (
              outreach.people.email &&
              fromEmail.toLowerCase().includes(outreach.people.email.toLowerCase())
            ) {
              // Found a reply!
              const respondedAt = dateHeader?.value 
                ? new Date(dateHeader.value)
                : new Date(parseInt(message.internalDate || '0'));

              // Update outreach status
              await prisma.outreach.update({
                where: { id: outreach.id },
                data: {
                  status: 'RESPONDED',
                  lastChecked: new Date(),
                  updatedAt: new Date(),
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
                    respondedAt: respondedAt.toISOString(),
                    threadId: outreach.gmailThreadId,
                  },
                  updatedAt: new Date(),
                },
              });

              updated.push({
                outreachId: outreach.id,
                personName: outreach.people.name || 'Unknown',
                respondedAt,
              });

              break; // Found reply, stop checking this thread
            }
          }

          // No reply found - just update lastChecked
          if (!updated.find(u => u.outreachId === outreach.id)) {
            await prisma.outreach.update({
              where: { id: outreach.id },
              data: { lastChecked: new Date() },
            });
          }
        } catch (error: any) {
          // EDGE CASE: Thread might be deleted or access revoked
          console.error(`Error checking thread ${outreach.gmailThreadId}:`, error);

          await logGoogleAPICall(userId, 'gmail', 'threads.get', {
            threadId: outreach.gmailThreadId,
            error: error.message,
          }, false);

          // Mark as checked anyway to avoid retry loops
          await prisma.outreach.update({
            where: { id: outreach.id },
            data: { lastChecked: new Date() },
          }).catch(() => {});
        }
      })
    )
  );

  return {
    checked: outreachToCheck.length,
    updated: updated.length,
    details: updated,
  };
}
```

```typescript
// src/app/api/google/gmail/check-replies/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkEmailReplies } from '@/lib/google/gmail';
import { googleCircuitBreaker } from '@/lib/google/circuit-breaker';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await googleCircuitBreaker.call(
      session.user.id,
      () => checkEmailReplies(session.user.id)
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Gmail reply check error:', error);

    const cbStatus = googleCircuitBreaker.getStatus(session.user.id);

    return NextResponse.json(
      {
        error: error.message || 'Gmail reply check failed',
        circuitBreaker: cbStatus,
      },
      { status: cbStatus.state === 'open' ? 429 : 500 }
    );
  }
}
```

**API Endpoints:**
- `POST /api/google/gmail/check-replies` - Checks for email replies

**Validation:**

```bash
# 1. Run migration
cd eventops
npx prisma migrate dev --name add_gmail_tracking_fields

# 2. Unit tests with mocked Gmail API
npm test -- src/__tests__/gmail-tracking.test.ts

# Expected: All test cases pass

# 3. Manual setup (requires sent outreach with Gmail tracking)
# Send a test outreach email and manually set gmailThreadId

psql $DATABASE_URL -c "
  UPDATE outreach 
  SET 
    gmail_thread_id = 'THREAD_ID_FROM_GMAIL',
    status = 'SENT'
  WHERE id = 'OUTREACH_ID';
"

# 4. Check for replies
curl -X POST http://localhost:3000/api/google/gmail/check-replies \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Expected response:
# {
#   "checked": 10,
#   "updated": 2,
#   "details": [
#     {
#       "outreachId": "...",
#       "personName": "John Doe",
#       "respondedAt": "2026-01-23T10:30:00Z"
#     }
#   ]
# }

# 5. Verify status updated
psql $DATABASE_URL -c "
  SELECT 
    o.id, 
    o.status, 
    o.last_checked,
    p.name as person_name
  FROM outreach o
  JOIN people p ON o.person_id = p.id
  WHERE o.gmail_thread_id IS NOT NULL
  ORDER BY o.last_checked DESC
  LIMIT 10;
"

# Expected: Updated outreach has status = 'RESPONDED'

# 6. Verify activity logged
psql $DATABASE_URL -c "
  SELECT * FROM activities
  WHERE action = 'email_replied'
  ORDER BY created_at DESC
  LIMIT 5;
"

# Expected: Activity entry with metadata including respondedAt

# 7. Test rate limiting (run multiple times rapidly)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/google/gmail/check-replies \
    -H "Cookie: next-auth.session-token=YOUR_TOKEN" &
done
wait

# Check logs for rate limiting behavior

# 8. Test with deleted thread (edge case)
psql $DATABASE_URL -c "
  UPDATE outreach 
  SET gmail_thread_id = 'invalid-thread-id' 
  WHERE id = 'TEST_OUTREACH_ID';
"

curl -X POST http://localhost:3000/api/google/gmail/check-replies \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Should not crash, logs error, continues to next thread

# 9. Performance test (50 threads)
# Create 50 outreach records with thread IDs
time curl -X POST http://localhost:3000/api/google/gmail/check-replies \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Expected: Completes in <20 seconds

# 10. Verify idempotency (run twice)
curl -X POST http://localhost:3000/api/google/gmail/check-replies \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

curl -X POST http://localhost:3000/api/google/gmail/check-replies \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Second run should check=0 (all checked within last hour)
```

**Acceptance Criteria:**
- [ ] Gmail threads fetched successfully with metadata
- [ ] Replies detected by matching contact email
- [ ] Outreach status updated to RESPONDED
- [ ] Activity logged with person name and reply timestamp
- [ ] Only checks recent outreach (30 days)
- [ ] Only checks unchecked or stale (>1 hour old)
- [ ] Batch size limited to 50 to prevent timeout
- [ ] Rate limiting (5 concurrent requests)
- [ ] Last checked timestamp updated even if no reply
- [ ] Handles deleted/inaccessible threads gracefully
- [ ] Email extraction from "Name <email>" format
- [ ] Case-insensitive email matching
- [ ] Limits to last 10 messages per thread
- [ ] Circuit breaker protects against repeated failures
- [ ] Unit tests cover all edge cases

**Failure Modes & Edge Cases:**

1. **Null/Invalid Thread ID**
   - Scenario: Outreach created before Gmail tracking
   - Handling: WHERE clause filters `gmailThreadId: { not: null }`
   - Impact: These outreach won't be checked

2. **Gmail API Rate Limit (429)**
   - Scenario: >250 requests/user/second
   - Handling: p-limit throttles to 5 concurrent
   - Recovery: Circuit breaker opens, retry later

3. **Malformed Email Headers**
   - Scenario: `From` header missing or invalid
   - Handling: Skip message, continue to next
   - Logging: Warning logged, no crash

4. **Large Thread (>100 messages)**
   - Scenario: Long email conversation
   - Handling: Slice to last 10 messages only
   - Performance: Prevents memory/time issues

5. **Reply from Different Email**
   - Scenario: Contact replies from personal email
   - Handling: Currently missed (known limitation)
   - Future: Add email alias matching feature

6. **Deleted Thread in Gmail**
   - Scenario: User deletes thread in Gmail
   - Handling: 404 error caught, lastChecked updated
   - Impact: Won't retry this thread repeatedly

7. **Access Revoked Mid-Check**
   - Scenario: Token expires during batch processing
   - Handling: getGoogleClient auto-refreshes
   - Failure: Circuit breaker catches if refresh fails

**Rollback Plan:**

```bash
# Pause Gmail tracking for all users
psql $DATABASE_URL -c "
  UPDATE users SET google_sync_paused = true;
"

# OPTIONS FOR DATA CLEANUP:

# Option 1: Keep data, remove Gmail links
psql $DATABASE_URL -c "
  UPDATE outreach 
  SET 
    gmail_message_id = NULL,
    gmail_thread_id = NULL,
    last_checked = NULL
  WHERE gmail_thread_id IS NOT NULL;
"

# Option 2: Revert status changes (if needed)
psql $DATABASE_URL -c "
  -- Find recently updated to RESPONDED via Gmail
  UPDATE outreach 
  SET status = 'SENT'
  WHERE status = 'RESPONDED'
    AND updated_at > NOW() - INTERVAL '1 hour'
    AND gmail_thread_id IS NOT NULL;
"

# Rollback migration
npx prisma migrate dev --name rollback_gmail_tracking --create-only

# Edit migration:
# ALTER TABLE outreach DROP COLUMN IF EXISTS gmail_message_id;
# ALTER TABLE outreach DROP COLUMN IF EXISTS gmail_thread_id;
# ALTER TABLE outreach DROP COLUMN IF EXISTS last_checked;

npx prisma migrate deploy

# Remove code
git rm src/lib/google/gmail.ts
git rm src/app/api/google/gmail/
git rm src/__tests__/gmail-tracking.test.ts

# Revert commit
git revert <commit-sha-of-task-18.4>

# Verify cleanup
psql $DATABASE_URL -c "
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'outreach' 
    AND column_name LIKE 'gmail%';
"
# Expected: No results
```

---

## Task 18.5: Google Contacts Import

**Priority:** LOW  
**Dependencies:** Task 18.1

**Description:**  
Import contacts from Google Contacts, match to existing companies, create new people records for contacts with company information.

**Scope Boundaries (What this does NOT include):**
- Continuous sync (one-time import only)
- Contact photo/avatar import
- Custom contact fields beyond standard
- Contact groups/labels
- Shared contacts (personal contacts only)
- Contact merge/deduplication UI
- Automatic company creation for every contact
- Phone number formatting/validation
- Importing contacts without company info

**Files to Create:**
- `eventops/src/lib/google/contacts.ts` (Contacts import logic)
- `eventops/src/app/api/google/contacts/import/route.ts` (API endpoint)

**Implementation:**

```typescript
// src/lib/google/contacts.ts
import { google } from 'googleapis';
import { getGoogleClient } from './auth';
import { prisma } from '@/lib/db';
import { logGoogleAPICall } from './telemetry';

export async function importGoogleContacts(
  userId: string,
  eventId: string,
  options: { dryRun?: boolean } = {}
): Promise<{
  dryRun: boolean;
  total: number;
  imported: number;
  skipped: number;
  details: {
    imported: Array<{ name: string; email: string; company: string }>;
    skipped: Array<{ email?: string; reason: string }>;
  };
}> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { googleSyncPaused: true, googleSyncDryRun: true },
  });

  if (user?.googleSyncPaused) {
    throw new Error('Google sync is paused');
  }

  const isDryRun = options.dryRun ?? user?.googleSyncDryRun ?? false;

  const auth = await getGoogleClient(userId);
  const people = google.people({ version: 'v1', auth });

  // Fetch all connections with pagination
  let pageToken: string | undefined;
  const allConnections = [];

  do {
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      pageToken,
      personFields: 'names,emailAddresses,organizations,phoneNumbers',
    });

    await logGoogleAPICall(userId, 'contacts', 'connections.list', {
      pageToken: !!pageToken,
      count: response.data.connections?.length || 0,
    });

    allConnections.push(...(response.data.connections || []));
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  const imported = [];
  const skipped = [];

  for (const contact of allConnections) {
    const name = contact.names?.[0]?.displayName;
    const email = contact.emailAddresses?.[0]?.value;
    const company = contact.organizations?.[0]?.name;
    const title = contact.organizations?.[0]?.title;
    const phone = contact.phoneNumbers?.[0]?.value;

    // SCOPE BOUNDARY: Skip contacts without name or email
    if (!name || !email) {
      skipped.push({ email, reason: 'Missing name or email' });
      continue;
    }

    // SCOPE BOUNDARY: Skip contacts without company (explicit)
    if (!company) {
      skipped.push({ email, reason: 'No company information' });
      continue;
    }

    // Check if person already exists
    const existing = await prisma.people.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
    });

    if (existing) {
      skipped.push({ email, reason: 'Person already exists' });
      continue;
    }

    // Try to match company (improved matching)
    let accountId = null;
    
    // Strategy 1: Exact match
    let account = await prisma.target_accounts.findFirst({
      where: {
        eventId,
        name: { equals: company, mode: 'insensitive' },
      },
    });

    // Strategy 2: Contains match (if exact fails)
    if (!account) {
      account = await prisma.target_accounts.findFirst({
        where: {
          eventId,
          name: { contains: company, mode: 'insensitive' },
        },
      });
    }

    if (account) {
      accountId = account.id;
    } else if (!isDryRun) {
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

    if (!accountId && isDryRun) {
      // In dry-run, simulate account creation
      imported.push({
        dryRun: true,
        name,
        email,
        company,
        accountAction: 'would_create',
      });
      continue;
    }

    if (!accountId) {
      skipped.push({ email, reason: 'Failed to create account' });
      continue;
    }

    if (isDryRun) {
      imported.push({
        dryRun: true,
        name,
        email,
        company,
        accountAction: account ? 'matched_existing' : 'would_create',
      });
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

  await logGoogleAPICall(userId, 'contacts', 'import_complete', {
    dryRun: isDryRun,
    total: allConnections.length,
    imported: imported.length,
    skipped: skipped.length,
  });

  return {
    dryRun: isDryRun,
    total: allConnections.length,
    imported: imported.length,
    skipped: skipped.length,
    details: { imported, skipped },
  };
}
```

```typescript
// src/app/api/google/contacts/import/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { importGoogleContacts } from '@/lib/google/contacts';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { eventId, dryRun } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      );
    }

    const result = await importGoogleContacts(session.user.id, eventId, { dryRun });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Contacts import error:', error);
    return NextResponse.json(
      { error: error.message || 'Contacts import failed' },
      { status: 500 }
    );
  }
}
```

**API Endpoints:**
- `POST /api/google/contacts/import` - Imports Google Contacts (one-time)

**Validation:**

```bash
# 1. Dry-run import
curl -X POST http://localhost:3000/api/google/contacts/import \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "YOUR_EVENT_ID",
    "dryRun": true
  }'

# Expected response:
# {
#   "dryRun": true,
#   "total": 150,
#   "imported": 45,
#   "skipped": 105,
#   "details": {
#     "imported": [...],
#     "skipped": [...]
#   }
# }

# 2. Review dry-run results
# Check details.imported for contacts that would be created
# Check details.skipped for reason why contacts were skipped

# 3. Live import
curl -X POST http://localhost:3000/api/google/contacts/import \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "YOUR_EVENT_ID",
    "dryRun": false
  }'

# 4. Verify people created
psql $DATABASE_URL -c "
  SELECT 
    p.name, 
    p.email, 
    p.title, 
    a.name as company
  FROM people p
  JOIN target_accounts a ON p.account_id = a.id
  WHERE p.created_at > NOW() - INTERVAL '5 minutes'
  ORDER BY p.created_at DESC
  LIMIT 20;
"

# 5. Verify new accounts created
psql $DATABASE_URL -c "
  SELECT 
    a.name, 
    COUNT(p.id) as contact_count,
    a.created_at
  FROM target_accounts a
  LEFT JOIN people p ON p.account_id = a.id
  WHERE a.created_at > NOW() - INTERVAL '5 minutes'
  GROUP BY a.id, a.name, a.created_at
  ORDER BY a.created_at DESC;
"

# 6. Test duplicate prevention
curl -X POST http://localhost:3000/api/google/contacts/import \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "YOUR_EVENT_ID",
    "dryRun": false
  }'

# Expected: All previously imported contacts in "skipped" list

# 7. Test without eventId (validation)
curl -X POST http://localhost:3000/api/google/contacts/import \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: {"error": "eventId is required"}
```

**Acceptance Criteria:**
- [ ] Google Contacts fetched with pagination (>1000)
- [ ] Dry-run mode works (no DB writes)
- [ ] Existing people skipped (by email)
- [ ] New people created with all available fields
- [ ] Companies matched by exact name first, then contains
- [ ] New companies created when no match found
- [ ] Contacts without company skipped (explicit boundary)
- [ ] Contacts without name/email skipped
- [ ] Duplicate detection works (case-insensitive email)
- [ ] Import summary includes reasons for skipped contacts
- [ ] Telemetry logs import results

**Failure Modes & Edge Cases:**

1. **Contacts Without Company**
   - Scenario: Personal contacts, not business
   - Handling: Skipped with reason "No company information"
   - Rationale: EventOps is B2B focused

2. **Ambiguous Company Matching**
   - Scenario: "Apple" could match "Apple Inc" or "Pineapple Corp"
   - Handling: First match used (could be wrong)
   - Mitigation: User can manually reassign

3. **Large Contact List (>5000)**
   - Scenario: Import takes >30 seconds
   - Handling: API timeout possible
   - Future: Background job processing

4. **Invalid Email Format**
   - Scenario: Contact has malformed email
   - Handling: Prisma validation rejects, skipped
   - Logging: Error logged to skipped array

**Rollback Plan:**

```bash
# No migration needed - uses existing schema

# To remove imported contacts (if needed):
psql $DATABASE_URL -c "
  -- Find recently imported people (within last hour)
  DELETE FROM people 
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND id IN (
      SELECT p.id FROM people p
      JOIN target_accounts a ON p.account_id = a.id
      -- Add more specific filters if needed
    );
"

# Remove code files
git rm src/lib/google/contacts.ts
git rm src/app/api/google/contacts/

# Revert commit
git revert <commit-sha-of-task-18.5>
```

---

## Task 18.6: Google Integration Dashboard UI

**Priority:** MEDIUM  
**Dependencies:** Tasks 18.1-18.5

**Description:**  
Create settings page UI for managing Google integration: connect/disconnect, view sync status, trigger manual syncs, toggle dry-run mode, kill switches.

**Scope Boundaries (What this does NOT include):**
- Sync history visualization (future analytics task)
- Per-sync-type scheduling (all sync on same schedule)
- Granular permission management (all-or-nothing OAuth)
- Sync conflict resolution UI
- Email preview/read interface
- Meeting editing from synced data

**Files to Create:**
- `eventops/src/app/dashboard/settings/integrations/page.tsx` (Main settings page)
- `eventops/src/components/integrations/google-integration-card.tsx` (Google card component)
- `eventops/src/components/integrations/sync-status-badge.tsx` (Status indicators)

**Implementation:**

```typescript
// src/components/integrations/google-integration-card.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export function GoogleIntegrationCard({ user, onUpdate }: {
  user: any;
  onUpdate: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleConnect = () => {
    window.location.href = '/api/google/connect';
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google account? Synced data will be preserved but future syncs disabled.')) return;
    
    const res = await fetch('/api/google/disconnect', { method: 'POST' });
    if (res.ok) {
      toast({ title: 'Google account disconnected' });
      onUpdate();
    } else {
      toast({ title: 'Disconnect failed', variant: 'destructive' });
    }
  };

  const handleSyncCalendar = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/google/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: user.googleSyncDryRun }),
      });
      
      const data = await res.json();
      
      if (data.dryRun) {
        toast({
          title: `Dry-run complete`,
          description: `Would import ${data.imported}, update ${data.updated}, skip ${data.skipped}`,
        });
      } else {
        toast({
          title: 'Calendar synced',
          description: `Imported ${data.imported}, updated ${data.updated}`,
        });
      }
      
      onUpdate();
    } catch (error) {
      toast({ title: 'Sync failed', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleCheckReplies = async () => {
    try {
      const res = await fetch('/api/google/gmail/check-replies', { method: 'POST' });
      const data = await res.json();
      
      toast({
        title: 'Email check complete',
        description: `Checked ${data.checked} emails, found ${data.updated} replies`,
      });
      
      onUpdate();
    } catch (error) {
      toast({ title: 'Check failed', variant: 'destructive' });
    }
  };

  const handleImportContacts = async () => {
    const eventId = prompt('Enter Event ID to import contacts into:');
    if (!eventId) return;

    setImporting(true);
    try {
      const res = await fetch('/api/google/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, dryRun: user.googleSyncDryRun }),
      });
      
      const data = await res.json();
      
      if (data.dryRun) {
        toast({
          title: 'Dry-run complete',
          description: `Would import ${data.imported} contacts (${data.skipped} skipped)`,
        });
      } else {
        toast({
          title: 'Contacts imported',
          description: `Imported ${data.imported} contacts`,
        });
      }
      
      onUpdate();
    } catch (error) {
      toast({ title: 'Import failed', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleTogglePause = async () => {
    const res = await fetch('/api/google/sync/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: user.googleSyncPaused ? 'resume' : 'pause' }),
    });

    if (res.ok) {
      toast({
        title: user.googleSyncPaused ? 'Sync resumed' : 'Sync paused',
      });
      onUpdate();
    }
  };

  const handleToggleDryRun = async () => {
    const res = await fetch('/api/google/sync/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: user.googleSyncDryRun ? 'live' : 'dry-run' }),
    });

    if (res.ok) {
      toast({
        title: user.googleSyncDryRun ? 'Live mode enabled' : 'Dry-run mode enabled',
        description: user.googleSyncDryRun 
          ? 'Changes will now be saved to database'
          : 'Changes will be previewed only',
      });
      onUpdate();
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
          <div className="flex gap-2">
            <Badge variant={user.googleSyncPaused ? "destructive" : "success"}>
              {user.googleSyncPaused ? 'Paused' : 'Connected'}
            </Badge>
            {user.googleSyncDryRun && (
              <Badge variant="warning">Dry-run Mode</Badge>
            )}
          </div>
        ) : (
          <Badge variant="secondary">Not Connected</Badge>
        )}
      </div>

      {user?.googleSyncEnabled ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-1">
            <p>Last synced: {user.lastGoogleSync 
              ? new Date(user.lastGoogleSync).toLocaleString() 
              : 'Never'}</p>
            <p>Syncs: {user.googleSyncAuditLog?.length || 0} total</p>
          </div>

          {/* Control Switches */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-sync enabled</Label>
                <p className="text-xs text-gray-500">Hourly background sync</p>
              </div>
              <Switch
                checked={!user.googleSyncPaused}
                onCheckedChange={handleTogglePause}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Dry-run mode</Label>
                <p className="text-xs text-gray-500">Preview changes without saving</p>
              </div>
              <Switch
                checked={user.googleSyncDryRun}
                onCheckedChange={handleToggleDryRun}
              />
            </div>
          </div>

          {/* Manual Actions */}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button 
              onClick={handleSyncCalendar} 
              disabled={syncing}
              size="sm"
            >
              {syncing ? 'Syncing...' : 'Sync Calendar'}
            </Button>
            
            <Button 
              onClick={handleCheckReplies}
              size="sm"
              variant="outline"
            >
              Check Email Replies
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
        <Button onClick={handleConnect} className="w-full">
          Connect Google Account
        </Button>
      )}
    </Card>
  );
}
```

```typescript
// src/app/dashboard/settings/integrations/page.tsx
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GoogleIntegrationCard } from '@/components/integrations/google-integration-card';
import { redirect } from 'next/navigation';

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: {
      googleSyncEnabled: true,
      googleSyncPaused: true,
      googleSyncDryRun: true,
      lastGoogleSync: true,
      googleSyncAuditLog: true,
    },
  });

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Integrations</h1>
      
      <div className="space-y-6">
        <GoogleIntegrationCard 
          user={user}
          onUpdate={() => {
            // Trigger revalidation
            window.location.reload();
          }}
        />

        {/* Future: HubSpot, Salesforce, etc. */}
      </div>
    </div>
  );
}
```

**Validation:**
- [ ] Manual browser testing (no automated validation possible)
- [ ] Connect button redirects to Google OAuth
- [ ] After connection, shows "Connected" badge
- [ ] Sync Calendar button triggers sync (shows toast with results)
- [ ] Dry-run toggle works (affects sync behavior)
- [ ] Pause toggle works (disables cron sync)
- [ ] Check Email Replies button works
- [ ] Import Contacts button works (prompts for event ID)
- [ ] Disconnect button clears all Google data
- [ ] Last synced time displays correctly
- [ ] Audit log count displays
- [ ] UI is responsive on mobile

**Rollback Plan:**

```bash
# No database changes - just UI

# Remove files
git rm src/app/dashboard/settings/integrations/
git rm src/components/integrations/

# Revert commit
git revert <commit-sha-of-task-18.6>
```

---

## Sprint Summary

**Total Tasks:** 6  
**Estimated Effort:** See individual task complexity  
**Demo Checklist:**
- [ ] User connects Google account (OAuth flow)
- [ ] User sees dry-run preview of calendar sync
- [ ] User enables live sync, meetings imported
- [ ] User pauses sync via kill switch, sync stops
- [ ] Email replies auto-detected and tracked
- [ ] Contacts imported and matched to companies
- [ ] Integration dashboard shows sync status

**Safety Verification:**
- [ ] All automations start in dry-run mode
- [ ] Kill switches work for all sync types
- [ ] Idempotency prevents duplicates
- [ ] Rate limiting protects APIs
- [ ] Circuit breaker opens after failures
- [ ] Audit trail logs all actions
- [ ] Rollback procedures documented and tested

---

*"Atomic tasks. Clear validation. Demoable sprints. No drama."*
