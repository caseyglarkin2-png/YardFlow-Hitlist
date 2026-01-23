import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { handleBounce, handleSpamComplaint, handleUnsubscribe } from '@/lib/outreach/compliance';
import { pauseEnrollment } from '@/lib/outreach/sequence-engine';

interface SendGridEvent {
  event: string;
  email: string;
  timestamp: number;
  'sg_message_id': string;
  enrollmentId?: string;
  stepNumber?: string;
  url?: string;
  reason?: string;
  status?: string;
}

export async function POST(req: NextRequest) {
  try {
    const events: SendGridEvent[] = await req.json();

    logger.info('Received SendGrid webhook', { eventCount: events.length });

    for (const event of events) {
      await processEvent(event);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Error processing SendGrid webhook', { error });
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

async function processEvent(event: SendGridEvent) {
  try {
    const messageId = event.sg_message_id;
    
    const emailActivity = await prisma.emailActivity.findUnique({
      where: { messageId },
      include: {
        enrollment: {
          include: {
            person: true,
          },
        },
      },
    });

    if (!emailActivity) {
      logger.warn('Email activity not found for message ID', { messageId });
      return;
    }

    const personId = emailActivity.enrollment.personId;
    if (!personId) {
      logger.warn('No person ID for email activity', { messageId });
      return;
    }

    switch (event.event) {
      case 'open':
        await prisma.emailActivity.update({
          where: { id: emailActivity.id },
          data: {
            openedAt: new Date(),
            status: 'opened',
          },
        });
        break;

      case 'click':
        await prisma.emailActivity.update({
          where: { id: emailActivity.id },
          data: {
            clickedAt: new Date(),
            status: 'clicked',
          },
        });
        break;

      case 'bounce':
        await prisma.emailActivity.update({
          where: { id: emailActivity.id },
          data: {
            bouncedAt: new Date(),
            status: 'bounced',
            errorMessage: event.reason,
          },
        });
        const bounceType = event.status?.includes('5.') ? 'hard' : 'soft';
        await handleBounce(personId, bounceType);
        await pauseEnrollment(emailActivity.enrollmentId, 'bounced');
        break;

      case 'dropped':
        await prisma.emailActivity.update({
          where: { id: emailActivity.id },
          data: {
            status: 'failed',
            errorMessage: `Dropped: ${event.reason}`,
          },
        });
        await pauseEnrollment(emailActivity.enrollmentId, 'dropped');
        break;

      case 'spamreport':
        await prisma.emailActivity.update({
          where: { id: emailActivity.id },
          data: {
            spamReportAt: new Date(),
            status: 'spam',
          },
        });
        await handleSpamComplaint(personId);
        await pauseEnrollment(emailActivity.enrollmentId, 'spam_complaint');
        break;

      case 'unsubscribe':
        await prisma.emailActivity.update({
          where: { id: emailActivity.id },
          data: {
            unsubscribedAt: new Date(),
            status: 'unsubscribed',
          },
        });
        await handleUnsubscribe(personId, 'sendgrid_webhook');
        await pauseEnrollment(emailActivity.enrollmentId, 'unsubscribed');
        break;

      default:
        logger.debug('Unhandled SendGrid event type', { eventType: event.event });
    }

    logger.info('Processed SendGrid event', {
      event: event.event,
      messageId,
      enrollmentId: emailActivity.enrollmentId,
    });
  } catch (error) {
    logger.error('Error processing individual event', { event, error });
  }
}
