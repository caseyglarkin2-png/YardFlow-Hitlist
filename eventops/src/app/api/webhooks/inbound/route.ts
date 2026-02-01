import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: string;
  spam_score?: string;
  envelope?: string;
}

interface EmailClassification {
  type: 'reply' | 'out_of_office' | 'bounce' | 'unknown';
  pauseTrigger?: string;
  resumeAt?: Date;
}

const OOO_PATTERNS = [
  /out of (the )?office/i,
  /on vacation/i,
  /away from (my )?email/i,
  /will (be |)return(ing)? on/i,
  /automatic reply/i,
  /auto(matic)?[ -]?reply/i,
  /i('m| am) (currently )?out/i,
  /currently (traveling|away|out)/i,
  /limited access to email/i,
  /will respond when i return/i,
];

const RETURN_DATE_PATTERNS = [
  /return(ing)? (on )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  /back (on )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  /return(ing)? (on )?(\d{1,2})[\/\-](\d{1,2})/i,
  /back (on )?(\d{1,2})[\/\-](\d{1,2})/i,
  /until (\d{1,2})[\/\-](\d{1,2})/i,
  /through (\d{1,2})[\/\-](\d{1,2})/i,
];

/**
 * Classify inbound email as reply, OOO, or other
 */
function classifyEmail(subject: string, body: string): EmailClassification {
  const fullText = `${subject} ${body}`.toLowerCase();

  // Check for OOO patterns
  for (const pattern of OOO_PATTERNS) {
    if (pattern.test(fullText)) {
      // Try to extract return date
      let resumeAt: Date | undefined;

      for (const datePattern of RETURN_DATE_PATTERNS) {
        const match = fullText.match(datePattern);
        if (match) {
          // Simplified date parsing - in production use a date parsing library
          const dayMatch = match[0].match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
          if (dayMatch) {
            // Calculate next occurrence of that day
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const targetDay = days.indexOf(dayMatch[1].toLowerCase());
            const today = new Date();
            const currentDay = today.getDay();
            let daysUntil = targetDay - currentDay;
            if (daysUntil <= 0) daysUntil += 7;
            resumeAt = new Date(today.getTime() + daysUntil * 24 * 60 * 60 * 1000);
          }
          break;
        }
      }

      // Default to 7 days if no return date found
      if (!resumeAt) {
        resumeAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }

      return {
        type: 'out_of_office',
        pauseTrigger: 'ooo_reply',
        resumeAt,
      };
    }
  }

  // Check for bounces
  const bouncePatterns = [
    /delivery (status notification|failure)/i,
    /undeliverable/i,
    /mail(box)? (is )?(full|unavailable)/i,
    /user unknown/i,
    /address rejected/i,
  ];

  for (const pattern of bouncePatterns) {
    if (pattern.test(fullText)) {
      return { type: 'bounce' };
    }
  }

  // Default to regular reply
  return { type: 'reply' };
}

/**
 * Extract email address from "From" header
 */
function extractEmail(from: string): string | null {
  const match = from.match(/<([^>]+)>/) || from.match(/([^\s<>@]+@[^\s<>@]+)/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * POST /api/webhooks/inbound
 * Receive inbound emails via SendGrid Inbound Parse
 * @see https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 */
export async function POST(req: NextRequest) {
  try {
    // SendGrid sends as form data
    const formData = await req.formData();

    const inboundEmail: InboundEmail = {
      from: formData.get('from') as string || '',
      to: formData.get('to') as string || '',
      subject: formData.get('subject') as string || '',
      text: formData.get('text') as string || undefined,
      html: formData.get('html') as string || undefined,
      headers: formData.get('headers') as string || undefined,
      spam_score: formData.get('spam_score') as string || undefined,
      envelope: formData.get('envelope') as string || undefined,
    };

    logger.info('Received inbound email', {
      from: inboundEmail.from,
      to: inboundEmail.to,
      subject: inboundEmail.subject,
    });

    // Extract sender email
    const senderEmail = extractEmail(inboundEmail.from);
    if (!senderEmail) {
      logger.warn('Could not extract sender email from From header');
      return NextResponse.json({ success: true, message: 'No valid sender email' });
    }

    // Classify the email
    const classification = classifyEmail(
      inboundEmail.subject,
      inboundEmail.text || ''
    );

    logger.info('Email classified', {
      senderEmail,
      type: classification.type,
      pauseTrigger: classification.pauseTrigger,
      resumeAt: classification.resumeAt?.toISOString(),
    });

    // Find person by email
    const person = await prisma.people.findFirst({
      where: {
        email: {
          equals: senderEmail,
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
      logger.info('Inbound: No matching person found', { senderEmail });
      return NextResponse.json({
        success: true,
        matched: false,
        message: 'No matching prospect found',
      });
    }

    // Update enrollments based on classification
    let enrollmentsUpdated = 0;

    for (const enrollment of person.sequence_enrollments) {
      if (classification.type === 'reply') {
        // Regular reply - stop the sequence
        await prisma.sequence_enrollments.update({
          where: { id: enrollment.id },
          data: {
            status: 'COMPLETED',
            completed_at: new Date(),
            exit_reason: 'reply_received',
          },
        });
        enrollmentsUpdated++;

        logger.info('Stopped enrollment due to reply', {
          enrollmentId: enrollment.id,
          personId: person.id,
        });
      } else if (classification.type === 'out_of_office') {
        // OOO - pause the sequence
        await prisma.sequence_enrollments.update({
          where: { id: enrollment.id },
          data: {
            status: 'PAUSED',
            exited_at: new Date(),
            exit_reason: classification.pauseTrigger || 'ooo_paused',
            resume_at: classification.resumeAt,
          },
        });
        enrollmentsUpdated++;

        logger.info('Paused enrollment due to OOO', {
          enrollmentId: enrollment.id,
          personId: person.id,
          resumeAt: classification.resumeAt?.toISOString(),
        });
      } else if (classification.type === 'bounce') {
        // Bounce - mark as failed
        await prisma.sequence_enrollments.update({
          where: { id: enrollment.id },
          data: {
            status: 'FAILED',
            exited_at: new Date(),
            exit_reason: 'email_bounced',
          },
        });
        enrollmentsUpdated++;

        // Also update the person's email status
        await prisma.people.update({
          where: { id: person.id },
          data: {
            emailStatus: 'bounced',
          },
        });

        logger.info('Marked enrollment as failed due to bounce', {
          enrollmentId: enrollment.id,
          personId: person.id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      matched: true,
      personId: person.id,
      classification: classification.type,
      enrollmentsUpdated,
      resumeAt: classification.resumeAt?.toISOString(),
    });
  } catch (error) {
    logger.error('Error processing inbound email', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/inbound
 * Health check for inbound email webhook
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/inbound',
    description: 'SendGrid Inbound Parse webhook for reply/OOO detection',
    events: ['reply', 'out_of_office', 'bounce'],
  });
}
