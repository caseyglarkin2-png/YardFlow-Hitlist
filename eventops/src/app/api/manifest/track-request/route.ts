import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Track when a meeting request is sent via Manifest app
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
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
      sentBy: session.user.id,
      notes: `Manifest meeting request sent at ${requestedAt || new Date().toISOString()}`,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, outreach });
}
