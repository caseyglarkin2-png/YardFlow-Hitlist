import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Track when a person is viewed in Manifest app
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { personId, viewedAt } = await req.json();

  if (!personId) {
    return NextResponse.json({ error: 'personId required' }, { status: 400 });
  }

  // Update person's notes with Manifest view timestamp
  const person = await prisma.person.update({
    where: { id: personId },
    data: {
      notes: {
        set: `Viewed in Manifest: ${viewedAt || new Date().toISOString()}`,
      },
    },
  });

  return NextResponse.json({ success: true, person });
}
