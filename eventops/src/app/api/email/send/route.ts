/**
 * API Route: Send Email
 * POST /api/email/send
 *
 * Sends a single email via SendGrid.
 * Used by GTM-YardFlow's bulk email feature.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { sendEmail } from '@/lib/sendgrid';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface SendEmailRequest {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  prospectId?: string;
  templateId?: string;
  sequenceId?: string;
  replyTo?: string;
}

export async function POST(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: SendEmailRequest = await request.json();
    const { to, toName, subject, htmlBody, textBody, prospectId, templateId, replyTo } = body;

    // Validate required fields
    if (!to || !subject || !htmlBody) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, htmlBody' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Create outreach record for tracking
    let outreachId: string | undefined;
    if (prospectId) {
      const outreach = await prisma.outreach.create({
        data: {
          id: crypto.randomUUID(),
          personId: prospectId,
          channel: 'EMAIL',
          status: 'SCHEDULED',
          subject,
          message: htmlBody,
          templateId,
          sentBy: authResult.userId,
          updatedAt: new Date(),
        },
      });
      outreachId = outreach.id;
    }

    // Send the email
    const result = await sendEmail({
      to,
      toName,
      subject,
      htmlBody,
      textBody,
      outreachId,
      replyTo,
    });

    if (!result.success) {
      logger.error('Email send failed', {
        to,
        error: result.error,
        userId: authResult.userId,
      });

      // Update outreach status if we created one
      if (outreachId) {
        await prisma.outreach.update({
          where: { id: outreachId },
          data: {
            status: 'BOUNCED',
            notes: `Send failed: ${result.error}`,
            bouncedAt: new Date(),
          },
        });
      }

      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update outreach status
    if (outreachId) {
      await prisma.outreach.update({
        where: { id: outreachId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          notes: result.messageId ? `SendGrid ID: ${result.messageId}` : undefined,
        },
      });
    }

    logger.info('Email sent successfully', {
      to,
      messageId: result.messageId,
      userId: authResult.userId,
      outreachId,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      outreachId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Email send error', { error: errorMessage });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/email/send - Check email service status
 */
export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasApiKey = !!process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'casey@freightroll.com';

  return NextResponse.json({
    status: hasApiKey ? 'configured' : 'not_configured',
    fromEmail,
    message: hasApiKey
      ? 'SendGrid is configured and ready'
      : 'SENDGRID_API_KEY environment variable is not set',
  });
}
