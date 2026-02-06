import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { eventId, startDate: _startDate, endDate: _endDate, limit = 50 } = await req.json();

    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    if (!process.env.HUBSPOT_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'HubSpot not configured' }, { status: 400 });
    }

    // Fetch call engagements from HubSpot
    const hubspotUrl = `https://api.hubapi.com/engagements/v1/engagements/paged`;
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    const response = await fetch(`${hubspotUrl}?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch HubSpot calls');
    }

    const data = await response.json();
    const imported = [];

    for (const engagement of data.results || []) {
      if (engagement.engagement?.type !== 'CALL') continue;

      const metadata = engagement.metadata || {};
      const recordingUrl = metadata.recordingUrl;

      if (!recordingUrl) continue;

      try {
        const content = await prisma.training_content.create({
          data: {
            id: crypto.randomUUID(),
            eventId,
            userId: authResult.userId,
            source: 'hubspot',
            type: 'audio',
            title:
              metadata.title ||
              `Call Recording - ${new Date(engagement.engagement.createdAt).toLocaleDateString()}`,
            description: metadata.body || null,
            url: recordingUrl,
            duration: metadata.durationMilliseconds
              ? Math.floor(metadata.durationMilliseconds / 1000)
              : null,
            sourceId: engagement.engagement.id.toString(),
            sourceLink: `https://app.hubspot.com/contacts/${engagement.engagement.portalId}/engagement/${engagement.engagement.id}`,
            metadata: {
              callOutcome: metadata.disposition,
              callStatus: metadata.status,
              fromNumber: metadata.fromNumber,
              toNumber: metadata.toNumber,
            },
            status: 'ready',
            processedAt: new Date(),
          },
        });

        imported.push({
          id: content.id,
          title: content.title,
          duration: content.duration,
        });
      } catch (error) {
        captureRouteError(error, {
          route: '/api/training/import/hubspot',
          method: 'POST',
        });
        console.error(`Error importing call ${engagement.engagement.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      count: imported.length,
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/training/import/hubspot',
      method: 'POST',
    });
    console.error('Error importing from HubSpot:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
