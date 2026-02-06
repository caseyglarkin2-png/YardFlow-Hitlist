import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { handleUnsubscribe } from '@/lib/outreach/compliance';
import { captureRouteError } from '@/lib/sentry-utils';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Rate limit: 10 req/min per IP (public endpoint)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateCheck = await checkRateLimit(rateLimitKey('unsubscribe', ip), 10, 60);
    if (!rateCheck.allowed) {
      return new NextResponse('Too many requests', { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return new NextResponse('Invalid unsubscribe link', { status: 400 });
    }

    const personId = token;

    const person = await prisma.people.findUnique({
      where: { id: personId },
      select: {
        id: true,
        email: true,
        name: true,
        unsubscribed: true,
      },
    });

    if (!person) {
      return new NextResponse('Invalid unsubscribe link', { status: 400 });
    }

    if (person.unsubscribed) {
      return new NextResponse(
        `<html><body><h1>Already Unsubscribed</h1><p>You have already been unsubscribed from our emails.</p></body></html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    await handleUnsubscribe(personId, 'user_request');

    logger.info('User unsubscribed via link', {
      personId,
      email: person.email,
    });

    return new NextResponse(
      `<html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h1>Successfully Unsubscribed</h1>
          <p>You have been unsubscribed from all future emails.</p>
          <p>We're sorry to see you go!</p>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    captureRouteError(error, {
      route: '/api/unsubscribe',
      method: 'GET',
    });
    logger.error('Error processing unsubscribe', { error });
    return new NextResponse('Error processing unsubscribe request', { status: 500 });
  }
}
