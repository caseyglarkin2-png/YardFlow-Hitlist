import { google } from 'googleapis';
import { getGoogleClient } from './auth';
import { prisma } from '@/lib/db';
import { withSyncLock } from './sync-lock';
import { logGoogleAPICall } from './telemetry';
import pLimit from 'p-limit';

export interface CalendarSyncResult {
  dryRun: boolean;
  imported: number;
  updated: number;
  skipped: number;
  events: Array<{
    id: string;
    summary: string;
    start: string;
    action: 'imported' | 'updated' | 'skipped';
  }>;
}

export async function syncCalendarEvents(
  userId: string,
  options: { dryRun?: boolean; days?: number } = {}
): Promise<CalendarSyncResult> {
  return withSyncLock(userId, 'calendar', async () => {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        googleSyncPaused: true,
        googleSyncDryRun: true,
        googleRateLimit: true,
        activeEventId: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.googleSyncPaused) {
      throw new Error('Google sync is paused for this user');
    }

    if (!user.activeEventId) {
      throw new Error('No active event selected');
    }

    const isDryRun = options.dryRun ?? user.googleSyncDryRun ?? false;
    const daysToSync = options.days || 90;

    const auth = await getGoogleClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    // Fetch events from the last 90 days
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - daysToSync);

    const allEvents: any[] = [];
    let pageToken: string | undefined;

    // Paginated fetch
    do {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
        pageToken,
      });

      await logGoogleAPICall(userId, 'calendar', 'events.list', {
        pageToken: !!pageToken,
        count: response.data.items?.length || 0,
      });

      allEvents.push(...(response.data.items || []));
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    const imported: CalendarSyncResult['events'] = [];
    const updated: CalendarSyncResult['events'] = [];
    const skipped: CalendarSyncResult['events'] = [];

    // Rate limiting
    const limit = pLimit(user.googleRateLimit || 10);

    await Promise.all(
      allEvents.map(event =>
        limit(async () => {
          const summary = event.summary || '(No title)';
          const startTime = event.start?.dateTime || event.start?.date;
          const endTime = event.end?.dateTime || event.end?.date;
          const description = event.description || null;
          const location = event.location || null;
          const attendees = event.attendees?.map((a: any) => a.email) || [];

          if (!startTime) {
            skipped.push({
              id: event.id,
              summary,
              start: 'unknown',
              action: 'skipped',
            });
            return;
          }

          // Check if event already exists
          const existing = await prisma.activities.findFirst({
            where: {
              userId,
              entityType: 'calendar_event',
              entityId: event.id,
            },
          });

          if (existing) {
            // Update existing
            if (!isDryRun) {
              await prisma.activities.update({
                where: { id: existing.id },
                data: {
                  description: summary,
                  metadata: {
                    start: startTime,
                    end: endTime,
                    description,
                    location,
                    attendees,
                    lastSynced: new Date().toISOString(),
                  },
                },
              });
            }

            updated.push({
              id: event.id,
              summary,
              start: startTime,
              action: 'updated',
            });
          } else {
            // Import new
            if (!isDryRun) {
              await prisma.activities.create({
                data: {
                  id: crypto.randomUUID(),
                  userId,
                  entityType: 'calendar_event',
                  entityId: event.id,
                  action: 'google_calendar_import',
                  description: summary,
                  metadata: {
                    start: startTime,
                    end: endTime,
                    description,
                    location,
                    attendees,
                    importedAt: new Date().toISOString(),
                  },
                },
              });
            }

            imported.push({
              id: event.id,
              summary,
              start: startTime,
              action: 'imported',
            });
          }
        })
      )
    );

    // Update last sync time
    if (!isDryRun) {
      await prisma.users.update({
        where: { id: userId },
        data: {
          lastGoogleSync: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    await logGoogleAPICall(userId, 'calendar', 'sync_complete', {
      dryRun: isDryRun,
      imported: imported.length,
      updated: updated.length,
      skipped: skipped.length,
    });

    return {
      dryRun: isDryRun,
      imported: imported.length,
      updated: updated.length,
      skipped: skipped.length,
      events: [...imported, ...updated, ...skipped],
    };
  });
}
