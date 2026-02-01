import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface CalendlyEvent {
  event: 'invitee.created' | 'invitee.canceled';
  payload: {
    email: string;
    name: string;
    uri: string;
    event?: string;
    scheduled_event?: {
      uri: string;
      name: string;
      start_time: string;
      end_time: string;
      location?: {
        type: string;
        location?: string;
        join_url?: string;
      };
    };
    cancel_url?: string;
    reschedule_url?: string;
    questions_and_answers?: Array<{
      question: string;
      answer: string;
    }>;
    tracking?: {
      utm_campaign?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_content?: string;
      utm_term?: string;
    };
  };
  created_at: string;
}

/**
 * Verify Calendly webhook signature
 * @see https://developer.calendly.com/api-docs/ZG9jOjM2MzE2MDM4-webhook-signatures
 */
function verifyCalendlySignature(
  webhookSignature: string,
  body: string,
  signingKey: string
): boolean {
  try {
    // Parse the signature header (format: t=timestamp,v1=signature)
    const parts = webhookSignature.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const signaturePart = parts.find((p) => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      logger.warn('Calendly webhook: Invalid signature format');
      return false;
    }

    const timestamp = timestampPart.substring(2);
    const signature = signaturePart.substring(3);

    // Check if webhook is too old (5 min tolerance)
    const timestampMs = parseInt(timestamp) * 1000;
    const now = Date.now();
    if (now - timestampMs > 5 * 60 * 1000) {
      logger.warn('Calendly webhook: Timestamp too old');
      return false;
    }

    // Compute expected signature
    const payload = `${timestamp}.${body}`;
    const expectedSignature = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (error) {
    logger.error('Calendly signature verification error', { error });
    return false;
  }
}

/**
 * POST /api/webhooks/calendly
 * Receive Calendly webhook events for meeting creation/cancellation
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const webhookEvent: CalendlyEvent = JSON.parse(rawBody);

    // Verify webhook signature if signing key is configured
    const signingKey = process.env.CALENDLY_WEBHOOK_SECRET;
    if (signingKey) {
      const signature = req.headers.get('Calendly-Webhook-Signature');

      if (!signature) {
        logger.warn('Calendly webhook: Missing signature header');
        return NextResponse.json({ error: 'Missing signature' }, { status: 403 });
      }

      const isValid = verifyCalendlySignature(signature, rawBody, signingKey);
      if (!isValid) {
        logger.warn('Calendly webhook: Signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      logger.warn('Calendly webhook: No signing key configured - accepting unverified webhooks');
    }

    logger.info('Received Calendly webhook', {
      event: webhookEvent.event,
      email: webhookEvent.payload.email,
    });

    const { event, payload } = webhookEvent;

    // Find person by email
    const person = await prisma.people.findFirst({
      where: {
        email: {
          equals: payload.email,
          mode: 'insensitive',
        },
      },
      include: {
        sequence_enrollments: {
          where: {
            status: { in: ['ACTIVE'] },
          },
        },
      },
    });

    if (!person) {
      logger.info('Calendly: No matching person found for email', { email: payload.email });
      // Still return 200 - we successfully processed the webhook
      return NextResponse.json({
        success: true,
        matched: false,
        message: 'No matching prospect found',
      });
    }

    if (event === 'invitee.created') {
      // Meeting was booked
      logger.info('Processing meeting booked', {
        personId: person.id,
        personName: person.name,
        meetingTime: payload.scheduled_event?.start_time,
      });

      // Create meeting record
      const scheduledAt = payload.scheduled_event?.start_time
        ? new Date(payload.scheduled_event.start_time)
        : new Date();

      const endTime = payload.scheduled_event?.end_time
        ? new Date(payload.scheduled_event.end_time)
        : new Date(scheduledAt.getTime() + 30 * 60 * 1000); // Default 30 min

      const durationMinutes = Math.round((endTime.getTime() - scheduledAt.getTime()) / 60000);

      const meeting = await prisma.meeting.create({
        data: {
          id: crypto.randomUUID(),
          personId: person.id,
          scheduledAt,
          duration: durationMinutes,
          meetingType: payload.scheduled_event?.name || 'Calendly Meeting',
          status: 'SCHEDULED',
          location:
            payload.scheduled_event?.location?.join_url ||
            payload.scheduled_event?.location?.location,
          notes: `Booked via Calendly. Reschedule: ${payload.reschedule_url || 'N/A'}`,
          updatedAt: new Date(),
        },
      });

      logger.info('Created meeting record', { meetingId: meeting.id });

      // Stop active sequence enrollments
      if (person.sequence_enrollments.length > 0) {
        for (const enrollment of person.sequence_enrollments) {
          await prisma.sequence_enrollments.update({
            where: { id: enrollment.id },
            data: {
              status: 'COMPLETED',
              completed_at: new Date(),
              exit_reason: 'meeting_booked',
            },
          });

          logger.info('Stopped enrollment due to meeting', {
            enrollmentId: enrollment.id,
            personId: person.id,
          });
        }
      }

      return NextResponse.json({
        success: true,
        matched: true,
        meetingId: meeting.id,
        enrollmentsStopped: person.sequence_enrollments.length,
      });
    } else if (event === 'invitee.canceled') {
      // Meeting was canceled
      logger.info('Processing meeting canceled', {
        personId: person.id,
        personName: person.name,
      });

      // Find and update the meeting if it exists
      const recentMeeting = await prisma.meeting.findFirst({
        where: {
          personId: person.id,
          status: 'SCHEDULED',
          scheduledAt: { gte: new Date() }, // Future meetings
        },
        orderBy: { scheduledAt: 'asc' },
      });

      if (recentMeeting) {
        await prisma.meeting.update({
          where: { id: recentMeeting.id },
          data: {
            status: 'CANCELLED',
            notes: `${recentMeeting.notes || ''}\n\nCanceled via Calendly at ${new Date().toISOString()}`,
            updatedAt: new Date(),
          },
        });

        logger.info('Marked meeting as cancelled', { meetingId: recentMeeting.id });
      }

      return NextResponse.json({
        success: true,
        matched: true,
        meetingCanceled: !!recentMeeting,
      });
    }

    // Unknown event type
    logger.warn('Calendly: Unknown event type', { event });
    return NextResponse.json({ success: true, message: 'Unknown event type' });
  } catch (error) {
    logger.error('Error processing Calendly webhook', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/calendly
 * Health check for Calendly webhook endpoint
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/calendly',
    configured: !!process.env.CALENDLY_WEBHOOK_SECRET,
    events: ['invitee.created', 'invitee.canceled'],
  });
}
