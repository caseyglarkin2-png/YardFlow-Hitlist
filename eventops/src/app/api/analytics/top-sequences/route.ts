/**
 * Top Sequences API - Sprint 34.3
 * GET /api/analytics/top-sequences
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { performanceAnalytics } from '@/lib/analytics/performance-analytics';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const topSequences = await performanceAnalytics.getTopSequences(limit);

  return NextResponse.json({ sequences: topSequences });
}
