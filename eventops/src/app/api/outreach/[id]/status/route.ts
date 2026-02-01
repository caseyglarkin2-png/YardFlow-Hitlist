import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authServiceOrSession } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/outreach/[id]/status
 *
 * Get the current status of an outreach (email send).
 * Designed for UI polling after triggering a send.
 *
 * Response 200:
 *   {
 *     id: string,
 *     status: 'DRAFT' | 'QUEUED' | 'SENT' | 'OPENED' | 'CLICKED' | 'RESPONDED' | 'BOUNCED',
 *     channel: 'EMAIL' | 'LINKEDIN' | 'PHONE',
 *     sentAt: string | null,
 *     sentBy: string | null,
 *     openedAt: string | null,
 *     clickedAt: string | null,
 *     respondedAt: string | null,
 *     bouncedAt: string | null,
 *     lastError: string | null,
 *     recipient: { name: string, email: string | null, company: string | null }
 *   }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth check
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  // Fetch outreach with person info
  const outreach = await prisma.outreach.findUnique({
    where: { id },
    include: {
      people: {
        include: {
          target_accounts: true,
        },
      },
    },
  });

  if (!outreach) {
    return NextResponse.json(
      { error: 'Outreach not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  // Extract last error from notes if status is BOUNCED
  let lastError: string | null = null;
  if (outreach.status === 'BOUNCED' && outreach.notes) {
    const failedMatch = outreach.notes.match(/Failed \[.*?\]: (.+)/);
    if (failedMatch) {
      lastError = failedMatch[1];
    } else if (outreach.notes.includes('SendGrid error:')) {
      lastError = outreach.notes.split('SendGrid error:')[1]?.trim() || null;
    }
  }

  return NextResponse.json({
    id: outreach.id,
    status: outreach.status,
    channel: outreach.channel,
    subject: outreach.subject,
    sentAt: outreach.sentAt?.toISOString() || null,
    sentBy: outreach.sentBy,
    openedAt: outreach.openedAt?.toISOString() || null,
    clickedAt: null, // Click tracking not implemented in outreach model
    respondedAt: outreach.respondedAt?.toISOString() || null,
    bouncedAt: outreach.bouncedAt?.toISOString() || null,
    lastError,
    recipient: {
      name: outreach.people?.name || 'Unknown',
      email: outreach.people?.email || null,
      company: outreach.people?.target_accounts?.name || null,
    },
  });
}
