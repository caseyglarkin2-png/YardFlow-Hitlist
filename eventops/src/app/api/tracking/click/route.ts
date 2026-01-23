import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const trackingId = searchParams.get('id');
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
    }

    if (trackingId) {
      const [enrollmentId, stepNumber] = trackingId.split('_');

      await prisma.emailActivity.updateMany({
        where: {
          enrollmentId,
          stepNumber: parseInt(stepNumber),
          clickedAt: null,
        },
        data: {
          clickedAt: new Date(),
          status: 'clicked',
        },
      });

      logger.debug('Email click tracked', { enrollmentId, stepNumber, url });
    }

    return NextResponse.redirect(decodeURIComponent(url));
  } catch (error) {
    logger.error('Error tracking email click', { error });
    
    const url = new URL(req.url).searchParams.get('url');
    if (url) {
      return NextResponse.redirect(decodeURIComponent(url));
    }
    
    return NextResponse.json({ error: 'Tracking error' }, { status: 500 });
  }
}
