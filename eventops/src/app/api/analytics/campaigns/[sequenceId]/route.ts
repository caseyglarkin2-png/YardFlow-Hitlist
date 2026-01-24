/**
 * Performance Analytics API - Sprint 34.3
 * GET /api/analytics/campaigns/{sequenceId} - Campaign metrics
 * GET /api/analytics/top-sequences - Top performing sequences
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { performanceAnalytics } from '@/lib/analytics/performance-analytics';
import { logger } from '@/lib/logger';

export async function GET(request: Request, { params }: { params: { sequenceId: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sequenceId } = params;
    const { searchParams } = new URL(request.url);

    // Parse time range from query params
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const timeRange =
      startParam && endParam
        ? {
            start: new Date(startParam),
            end: new Date(endParam),
          }
        : undefined;

    const metrics = await performanceAnalytics.getCampaignMetrics(sequenceId, timeRange);

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('Campaign metrics failed', { error });
    return NextResponse.json({ error: 'Metrics failed' }, { status: 500 });
  }
}
