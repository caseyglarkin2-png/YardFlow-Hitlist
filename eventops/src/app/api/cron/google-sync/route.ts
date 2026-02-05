import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncCalendarEvents } from '@/lib/google/calendar';
import { logGoogleAPICall } from '@/lib/google/telemetry';
import { getGlobalSyncEnabled } from '@/lib/google/sync-state';
import { captureRouteError } from '@/lib/sentry-utils';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!getGlobalSyncEnabled()) {
    return NextResponse.json({
      success: true,
      message: 'Global sync disabled',
      totalUsers: 0,
      results: [],
    });
  }

  const startTime = Date.now();

  try {
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
          imported: result.imported,
          updated: result.updated,
          skipped: result.skipped,
        });

        successCount++;

        await logGoogleAPICall(user.id, 'calendar', 'cron_sync_success', {
          imported: result.imported,
          updated: result.updated,
          skipped: result.skipped,
        });
      } catch (error) {
        captureRouteError(error, {
          route: '/api/cron/google-sync',
          method: 'GET',
        });
        console.error(`Sync failed for user ${user.id}:`, error);

        results.push({
          userId: user.id,
          email: user.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        failureCount++;

        const errMsg = error instanceof Error ? error.message : String(error);
        await logGoogleAPICall(
          user.id,
          'calendar',
          'cron_sync_failure',
          {
            error: errMsg,
          },
          false
        );

        if (errMsg.includes('refresh failed') || errMsg.includes('revoked')) {
          await prisma.users.update({
            where: { id: user.id },
            data: { googleSyncPaused: true },
          });
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      JSON.stringify({
        event: 'cron_sync_complete',
        totalUsers: users.length,
        successCount,
        failureCount,
        durationMs: duration,
      })
    );

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      successCount,
      failureCount,
      durationMs: duration,
      results,
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/cron/google-sync',
      method: 'GET',
    });
    console.error('Cron sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalUsers: 0,
      },
      { status: 500 }
    );
  }
}
