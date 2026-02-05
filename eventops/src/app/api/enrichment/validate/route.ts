/**
 * API Route: Validate Email
 * POST /api/enrichment/validate
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { EmailValidator } from '@/lib/enrichment/email-validator';
import { captureRouteError } from '@/lib/sentry-utils';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, emails } = await request.json();

    const validator = new EmailValidator();

    if (email) {
      // Single email validation
      const result = await validator.validateEmail(email);
      return NextResponse.json(result);
    } else if (emails && Array.isArray(emails)) {
      // Batch validation
      const results = await validator.validateBatch(emails);
      return NextResponse.json(Object.fromEntries(results));
    } else {
      return NextResponse.json({ error: 'email or emails array is required' }, { status: 400 });
    }
  } catch (error) {
    captureRouteError(error, {
      route: '/api/enrichment/validate',
      method: 'POST',
      userId: authResult?.userId,
    });
    console.error('Email validation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to validate email' },
      { status: 500 }
    );
  }
}
