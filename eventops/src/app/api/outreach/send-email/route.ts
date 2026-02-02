import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { isValidEmail } from '@/lib/sendgrid';
import { getRedisConnection } from '@/lib/queue/client';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// ============================================================================
// Request validation schema
// ============================================================================
const SendEmailSchema = z.object({
  outreachId: z.string().min(1, 'outreachId is required'),
  force: z.boolean().optional().default(false), // Skip dedupe check
});

// Dedupe window: reject same outreach send within 5 minutes
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;

// Rate limiting: max emails per user per minute
const RATE_LIMIT_WINDOW_SECONDS = 60;
const MAX_SENDS_PER_WINDOW = 10;

/**
 * Check rate limit using Redis
 */
async function checkRateLimit(
  userId: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const redis = getRedisConnection();
    const key = `ratelimit:email:${userId}`;

    const count = await redis.incr(key);

    // Set expiry on first increment
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }

    if (count > MAX_SENDS_PER_WINDOW) {
      const ttl = await redis.ttl(key);
      return { allowed: false, retryAfter: ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS };
    }

    return { allowed: true };
  } catch (error) {
    // If Redis fails, allow the request but log
    logger.warn('[send-email] Rate limit check failed', { error, userId });
    return { allowed: true };
  }
}

/**
 * POST /api/outreach/send-email
 *
 * Send email via SendGrid for a given outreachId.
 *
 * Request:
 *   { outreachId: string, force?: boolean }
 *
 * Response 200:
 *   { success: true, messageId: string, outreachId: string }
 *
 * Response 4xx:
 *   { error: string, code: string, details?: string }
 *
 * Response 5xx:
 *   { error: string, code: string, errorId: string, details?: string }
 */
export async function POST(req: NextRequest) {
  const errorId = crypto.randomUUID().slice(0, 8);

  // -------------------------------------------------------------------------
  // 1. Auth: Service-to-service OR user session
  // -------------------------------------------------------------------------
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  // -------------------------------------------------------------------------
  // 1.5 Rate limiting (skip for service accounts)
  // -------------------------------------------------------------------------
  if (authResult.type === 'session' && authResult.userId) {
    const rateCheck = await checkRateLimit(authResult.userId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Try again in ${rateCheck.retryAfter} seconds.`,
          code: 'RATE_LIMITED',
          retryAfter: rateCheck.retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter) },
        }
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. Parse and validate request body
  // -------------------------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'INVALID_JSON' }, { status: 400 });
  }

  const parseResult = SendEmailSchema.safeParse(body);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((i) => i.message).join('; ');
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: issues },
      { status: 400 }
    );
  }

  const { outreachId, force } = parseResult.data;

  // -------------------------------------------------------------------------
  // 3. Fetch outreach with person details
  // -------------------------------------------------------------------------
  const outreach = await prisma.outreach.findUnique({
    where: { id: outreachId },
    include: {
      people: {
        include: {
          target_accounts: true,
        },
      },
    },
  });

  if (!outreach) {
    return NextResponse.json({ error: 'Outreach not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  // -------------------------------------------------------------------------
  // 4. Validate email presence and format
  // -------------------------------------------------------------------------
  if (!outreach.people?.email) {
    return NextResponse.json(
      {
        error: 'Recipient has no email address. Import or update contact first.',
        code: 'MISSING_EMAIL',
      },
      { status: 422 }
    );
  }

  if (!isValidEmail(outreach.people.email)) {
    return NextResponse.json(
      {
        error: `Invalid email format: ${outreach.people.email}`,
        code: 'INVALID_EMAIL',
      },
      { status: 422 }
    );
  }

  // -------------------------------------------------------------------------
  // 5. Validate channel is EMAIL
  // -------------------------------------------------------------------------
  if (outreach.channel !== 'EMAIL') {
    return NextResponse.json(
      { error: `Outreach channel is ${outreach.channel}, not EMAIL`, code: 'WRONG_CHANNEL' },
      { status: 400 }
    );
  }

  // -------------------------------------------------------------------------
  // 6. Validate subject and message exist
  // -------------------------------------------------------------------------
  if (!outreach.subject || outreach.subject.trim().length === 0) {
    return NextResponse.json(
      { error: 'Email subject is required', code: 'MISSING_SUBJECT' },
      { status: 422 }
    );
  }

  if (!outreach.message || outreach.message.trim().length === 0) {
    return NextResponse.json(
      { error: 'Email body is required', code: 'MISSING_BODY' },
      { status: 422 }
    );
  }

  // -------------------------------------------------------------------------
  // 7. Dedupe check: prevent double-sends within window
  // -------------------------------------------------------------------------
  if (!force && outreach.sentAt) {
    const timeSinceSent = Date.now() - new Date(outreach.sentAt).getTime();
    if (timeSinceSent < DEDUPE_WINDOW_MS) {
      const secondsAgo = Math.floor(timeSinceSent / 1000);
      return NextResponse.json(
        {
          error: `Email already sent ${secondsAgo}s ago. Use force=true to resend.`,
          code: 'ALREADY_SENT',
          sentAt: outreach.sentAt,
        },
        { status: 409 }
      );
    }
  }

  // -------------------------------------------------------------------------
  // 8. Check SendGrid configuration
  // -------------------------------------------------------------------------
  if (!process.env.SENDGRID_API_KEY) {
    logger.error('SendGrid not configured', { errorId });
    return NextResponse.json(
      {
        error: 'Email service not configured',
        code: 'SERVICE_UNAVAILABLE',
        errorId,
      },
      { status: 503 }
    );
  }

  // -------------------------------------------------------------------------
  // 9. Send email via SendGrid
  // -------------------------------------------------------------------------
  try {
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);

    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'casey@freightroll.com';
    const fromName = process.env.SENDGRID_FROM_NAME || 'FreightRoll';
    const replyTo = process.env.SENDGRID_REPLY_TO || fromEmail;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://yardflow-hitlist-production-2f41.up.railway.app';

    // Tracking pixel for open tracking
    const trackingPixel = `<img src="${appUrl}/api/outreach/track/${outreach.id}/open" width="1" height="1" style="display:none;" alt="" />`;

    // Unsubscribe footer (deliverability best practice)
    const unsubscribeFooter = `
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#666;">
        <p>You received this email because you're attending Manifest 2026.</p>
        <p><a href="${appUrl}/api/unsubscribe/${outreach.id}" style="color:#666;">Unsubscribe</a></p>
      </div>
    `;

    const htmlContent = outreach.message + unsubscribeFooter + trackingPixel;

    const msg = {
      to: outreach.people.email,
      from: { email: fromEmail, name: fromName },
      replyTo,
      subject: outreach.subject,
      html: htmlContent,
      trackingSettings: {
        clickTracking: { enable: false }, // We track our own clicks
        openTracking: { enable: false }, // We track our own opens
      },
    };

    const [response] = await sgMail.default.send(msg);
    const messageId = (response.headers['x-message-id'] as string) || crypto.randomUUID();

    // Update outreach with success
    await prisma.outreach.update({
      where: { id: outreachId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentBy: authResult.userId,
        notes: outreach.notes
          ? `${outreach.notes}\nSent: messageId=${messageId}`
          : `Sent: messageId=${messageId}`,
      },
    });

    logger.info('Email sent successfully', {
      outreachId,
      messageId,
      to: outreach.people.email,
      userId: authResult.userId,
    });

    return NextResponse.json({
      success: true,
      messageId,
      outreachId,
      status: 'SENT',
    });
  } catch (error: unknown) {
    const err = error as {
      response?: { body?: { errors?: Array<{ message: string; field?: string }> } };
      message?: string;
      code?: number;
    };

    const sgError =
      err.response?.body?.errors?.[0]?.message || err.message || 'Unknown SendGrid error';

    logger.error('SendGrid send failed', {
      errorId,
      outreachId,
      error: sgError,
      statusCode: err.code,
    });

    // Update outreach with failure
    await prisma.outreach.update({
      where: { id: outreachId },
      data: {
        status: 'BOUNCED',
        bouncedAt: new Date(),
        notes: outreach.notes
          ? `${outreach.notes}\nFailed [${errorId}]: ${sgError}`
          : `Failed [${errorId}]: ${sgError}`,
      },
    });

    return NextResponse.json(
      {
        error: 'Failed to send email',
        code: 'SEND_FAILED',
        errorId,
        details: sgError,
      },
      { status: 500 }
    );
  }
}
