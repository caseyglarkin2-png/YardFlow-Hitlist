import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const TRACKING_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const trackingId = searchParams.get('id');

    if (trackingId) {
      const [enrollmentId, stepNumber] = trackingId.split('_');

      await prisma.emailActivity.updateMany({
        where: {
          enrollmentId,
          stepNumber: parseInt(stepNumber),
          openedAt: null,
        },
        data: {
          openedAt: new Date(),
          status: 'opened',
        },
      });

      logger.debug('Email open tracked', { enrollmentId, stepNumber });
    }

    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Error tracking email open', { error });
    
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
      },
    });
  }
}
