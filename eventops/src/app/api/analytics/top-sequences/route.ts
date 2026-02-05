/**
 * Top Sequences API - Sprint 34.3
 * GET /api/analytics/top-sequences
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { performanceAnalytics } from '@/lib/analytics/performance-analytics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const topSequences = await performanceAnalytics.getTopSequences(limit);

  return NextResponse.json({ sequences: topSequences });
}
