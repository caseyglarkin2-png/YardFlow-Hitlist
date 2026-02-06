import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { researchQueue } from '@/lib/research-queue';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/research/bulk
 * Start bulk research generation for multiple accounts
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountIds, forceRefresh } = await req.json();

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json({ error: 'accountIds array required' }, { status: 400 });
    }

    if (accountIds.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 accounts per batch' }, { status: 400 });
    }

    const result = await researchQueue.addBatch(accountIds, forceRefresh || false);

    return NextResponse.json({
      success: true,
      queued: result.queued,
      message: `${result.queued} accounts queued for research`,
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/research/bulk',
      method: 'POST',
    });
    console.error('Error starting bulk research:', error);
    return NextResponse.json({ error: 'Failed to start bulk research' }, { status: 500 });
  }
}

/**
 * GET /api/research/bulk
 * Get current status of bulk research queue
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = researchQueue.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/research/bulk',
      method: 'GET',
    });
    console.error('Error getting bulk research status:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

/**
 * DELETE /api/research/bulk
 * Clear completed results
 */
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    researchQueue.clearResults();
    return NextResponse.json({ success: true, message: 'Results cleared' });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/research/bulk',
      method: 'DELETE',
    });
    console.error('Error clearing results:', error);
    return NextResponse.json({ error: 'Failed to clear results' }, { status: 500 });
  }
}
