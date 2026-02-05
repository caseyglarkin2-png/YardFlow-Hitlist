import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

/**
 * API Route: Get Top Targets
 * GET /api/targets/top
 *
 * TODO: Refactor to work with current Prisma schema
 */
export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);

  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    {
      success: true,
      targets: [],
      summary: {
        total: 0,
        hotLeads: 0,
        withEmail: 0,
        withLinkedIn: 0,
        avgIcpScore: 0,
      },
    },
    { status: 200 }
  );
}
