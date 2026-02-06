/**
 * API Route: Generate Multi-Channel Sequence
 * POST /api/ai/content/sequence
 *
 * Supports both session auth (internal) and S2S auth (frontend proxy)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { BrandVoiceContentGenerator } from '@/lib/ai/brand-voice-generator';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientName, companyName, context, tone } = await request.json();

    if (!recipientName || !companyName) {
      return NextResponse.json(
        { error: 'recipientName and companyName are required' },
        { status: 400 }
      );
    }

    logger.info('Generating sequence', {
      userId: authResult.userId,
      companyName,
      recipientName,
    });

    const generator = new BrandVoiceContentGenerator();
    const sequence = await generator.generateSequence({
      recipientName,
      companyName,
      channel: 'email',
      context,
      tone,
    });

    logger.info('Sequence generated', {
      userId: authResult.userId,
      hasEmail1: !!sequence?.email1,
      hasFollowUp: !!sequence?.followUp,
      hasLinkedin: !!sequence?.linkedin,
    });

    return NextResponse.json(sequence);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate sequence';
    captureRouteError(error, {
      route: '/api/ai/content/sequence',
      method: 'POST',
    });
    logger.error('Sequence generation error', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
