import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    const content = await prisma.training_content.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    // Convert BigInt to string for JSON serialization
    const serialized = content.map((item) => ({
      ...item,
      fileSize: item.fileSize ? item.fileSize.toString() : null,
    }));

    return NextResponse.json({
      content: serialized,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch content' },
      { status: 500 }
    );
  }
}
