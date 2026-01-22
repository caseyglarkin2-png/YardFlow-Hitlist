import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Transparent 1x1 pixel GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const outreachId = searchParams.get('id');

  if (!outreachId) {
    return new NextResponse(TRACKING_PIXEL, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Expires': '0',
      },
    });
  }

  try {
    // Find the outreach record
    const outreach = await prisma.outreach.findUnique({
      where: { id: outreachId },
    });

    if (outreach) {
      // Update to mark as opened if not already
      if (outreach.status === 'SENT') {
        await prisma.outreach.update({
          where: { id: outreachId },
          data: {
            status: 'OPENED',
            openedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Log the activity
        await prisma.activities.create({
          data: {
            id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            personId: outreach.personId,
            type: 'EMAIL_OPENED',
            timestamp: new Date(),
            metadata: JSON.stringify({
              outreachId,
              subject: outreach.subject,
            }),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.error('Error tracking email open:', error);
  }

  // Always return the tracking pixel
  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Expires': '0',
    },
  });
}
