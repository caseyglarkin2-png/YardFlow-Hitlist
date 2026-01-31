import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { handleBounce, handleSpamComplaint, handleUnsubscribe } from '@/lib/outreach/compliance';
import { pauseEnrollment } from '@/lib/outreach/sequence-engine';
import crypto from 'crypto';

interface SendGridEvent {
  event: string;
  email: string;
  timestamp: number;
  sg_message_id: string;
  enrollmentId?: string;
  stepNumber?: string;
  url?: string;
  reason?: string;
  status?: string;
}

/**
 * Verify SendGrid webhook signature
 * @see https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
 */
function verifySendGridSignature(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  try {
    const timestampPayload = timestamp + payload;
    const decodedSignature = Buffer.from(signature, 'base64');

    const verifier = crypto.createVerify('SHA256');
    verifier.update(timestampPayload);

    return verifier.verify(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      decodedSignature
    );
  } catch (error) {
    logger.error('SendGrid signature verification error', { error });
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const events: SendGridEvent[] = JSON.parse(rawBody);

    // Verify webhook signature if verification key is configured
    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
    if (verificationKey) {
      const signature = req.headers.get('X-Twilio-Email-Event-Webhook-Signature');
      const timestamp = req.headers.get('X-Twilio-Email-Event-Webhook-Timestamp');

      if (!signature || !timestamp) {
        logger.warn('SendGrid webhook missing signature headers');
        return NextResponse.json({ error: 'Missing signature' }, { status: 403 });
      }

      const isValid = verifySendGridSignature(verificationKey, rawBody, signature, timestamp);
      if (!isValid) {
        logger.warn('SendGrid webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } else {
      // Log warning in production if verification is not configured
      if (process.env.NODE_ENV === 'production') {
        logger.warn('SendGrid webhook verification not configured - accepting unverified webhooks');
      }
    }

    logger.info('Received SendGrid webhook', { eventCount: events.length });

    for (const event of events) {
      await processEvent(event);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Error processing SendGrid webhook', { error });
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
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
