import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { sendBulkEmails, isValidEmail } from '@/lib/sendgrid';
import { OutreachStatus } from '@prisma/client';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// ============================================================================
// Request validation schema
// ============================================================================
const SendBulkEmailSchema = z.object({
  outreachIds: z.array(z.string().min(1)).min(1).max(100), // Max 100 per request
  force: z.boolean().optional().default(false), // Skip already-sent check
});

/**
 * POST /api/outreach/send-bulk
 *
 * Send emails in bulk for multiple outreach records.
 *
 * Request:
 *   { outreachIds: string[], force?: boolean }
 *
 * Response 200:
 *   { success: true, sent: number, failed: number, results: Array<{id, status, error?}> }
 */
export async function POST(req: NextRequest) {
  const errorId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();

  // -------------------------------------------------------------------------
  // 1. Auth: Service-to-service OR user session
  // -------------------------------------------------------------------------
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
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

  const parseResult = SendBulkEmailSchema.safeParse(body);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((i) => i.message).join('; ');
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: issues },
      { status: 400 }
    );
  }

  const { outreachIds, force } = parseResult.data;

  logger.info('[send-bulk] Starting bulk send', {
    count: outreachIds.length,
    force,
    errorId,
  });

  // -------------------------------------------------------------------------
  // 3. Fetch all outreach records with person details
  // -------------------------------------------------------------------------
  const outreaches = await prisma.outreach.findMany({
    where: { id: { in: outreachIds } },
    include: {
      people: {
        include: {
          target_accounts: true,
        },
      },
    },
  });

  // Track results per outreach
  const results: Array<{ id: string; status: 'sent' | 'skipped' | 'failed'; error?: string }> = [];
  const emailsToSend: Array<{
    outreach: typeof outreaches[0];
    to: string;
    toName: string;
    subject: string;
    htmlBody: string;
    outreachId: string;
  }> = [];

  // -------------------------------------------------------------------------
  // 4. Validate each outreach and prepare for sending
  // -------------------------------------------------------------------------
  for (const outreachId of outreachIds) {
    const outreach = outreaches.find((o) => o.id === outreachId);

    // Not found
    if (!outreach) {
      results.push({ id: outreachId, status: 'failed', error: 'Outreach not found' });
      continue;
    }

    // Already sent (skip unless force)
    if (outreach.status === OutreachStatus.SENT && !force) {
      results.push({ id: outreachId, status: 'skipped', error: 'Already sent' });
      continue;
    }

    // No email address
    if (!outreach.people?.email) {
      results.push({ id: outreachId, status: 'failed', error: 'Missing email address' });
      continue;
    }

    // Invalid email format
    if (!isValidEmail(outreach.people.email)) {
      results.push({ id: outreachId, status: 'failed', error: 'Invalid email format' });
      continue;
    }

    // Missing subject or message
    if (!outreach.subject || !outreach.message) {
      results.push({ id: outreachId, status: 'failed', error: 'Missing subject or message' });
      continue;
    }

    // Valid - queue for sending
    emailsToSend.push({
      outreach,
      to: outreach.people.email,
      toName: outreach.people.name || '',
      subject: outreach.subject,
      htmlBody: outreach.message,
      outreachId: outreach.id,
    });
  }

  // -------------------------------------------------------------------------
  // 5. Send emails in bulk
  // -------------------------------------------------------------------------
  let sentCount = 0;
  let failedCount = results.filter((r) => r.status === 'failed').length;

  if (emailsToSend.length > 0) {
    try {
      const sendResult = await sendBulkEmails(
        emailsToSend.map((e) => ({
          to: e.to,
          toName: e.toName,
          subject: e.subject,
          htmlBody: e.htmlBody,
          outreachId: e.outreachId,
        }))
      );

      if (sendResult.success) {
        sentCount = sendResult.sent;

        // Update all sent outreaches
        const sentIds = emailsToSend.slice(0, sendResult.sent).map((e) => e.outreach.id);
        await prisma.outreach.updateMany({
          where: { id: { in: sentIds } },
          data: {
            status: OutreachStatus.SENT,
            sentAt: new Date(),
          },
        });

        // Add success results
        for (const email of emailsToSend.slice(0, sendResult.sent)) {
          results.push({ id: email.outreach.id, status: 'sent' });
        }

        // Add failure results if partial
        if (sendResult.failed > 0) {
          failedCount += sendResult.failed;
          for (const email of emailsToSend.slice(sendResult.sent)) {
            results.push({
              id: email.outreach.id,
              status: 'failed',
              error: sendResult.errors[0] || 'Send failed',
            });
          }
        }
      } else {
        // All failed
        failedCount += emailsToSend.length;
        for (const email of emailsToSend) {
          results.push({
            id: email.outreach.id,
            status: 'failed',
            error: sendResult.errors[0] || 'Bulk send failed',
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[send-bulk] Bulk send error', { errorId, error: message });

      // All failed
      failedCount += emailsToSend.length;
      for (const email of emailsToSend) {
        results.push({ id: email.outreach.id, status: 'failed', error: message });
      }
    }
  }

  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const durationMs = Date.now() - startTime;

  logger.info('[send-bulk] Bulk send complete', {
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    durationMs,
    errorId,
  });

  return NextResponse.json({
    success: failedCount === 0,
    sent: sentCount,
    skipped: skippedCount,
    failed: failedCount,
    results,
    durationMs,
  });
}
