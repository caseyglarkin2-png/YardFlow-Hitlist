import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Track when a meeting request is sent via Manifest app
 */
export async function POST(req: NextRequest) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { personId, requestedAt } = await req.json();

  if (!personId) {
    return NextResponse.json({ error: 'personId required' }, { status: 400 });
  }

  // Create outreach record tracking the Manifest request
  const outreach = await prisma.outreach.create({
    data: {
      id: crypto.randomUUID(),
      personId,
      channel: 'LINKEDIN', // Closest analog - Manifest is networking platform
      status: 'SENT',
      message: 'Meeting request sent via Manifest app',
      sentAt: new Date(requestedAt || new Date()),
      sentBy: authResult.email || authResult.userId,
      notes: `Manifest meeting request sent at ${requestedAt || new Date().toISOString()}`,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, outreach });
}
