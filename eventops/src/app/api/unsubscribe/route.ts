import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { handleUnsubscribe } from '@/lib/outreach/compliance';

export async function GET(req: NextRequest) {
  try {
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
        firstName: true,
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
  } catch (error: any) {
    logger.error('Error processing unsubscribe', { error });
    return new NextResponse('Error processing unsubscribe request', { status: 500 });
  }
}
