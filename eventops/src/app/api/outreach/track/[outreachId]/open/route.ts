import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Track email opens via tracking pixel
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { outreachId: string } }
) {
  const outreachId = params.outreachId;

  try {
    // Update outreach status to OPENED if currently SENT
    await prisma.outreach.updateMany({
      where: {
        id: outreachId,
        status: 'SENT',
      },
      data: {
        status: 'OPENED',
        openedAt: new Date(),
      },
    });

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error tracking email open:', error);
    
    // Still return pixel even on error
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/gif',
      },
    });
  }
}
