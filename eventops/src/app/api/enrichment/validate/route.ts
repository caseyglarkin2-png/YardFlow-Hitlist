/**
 * API Route: Validate Email
 * POST /api/enrichment/validate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { EmailValidator } from '@/lib/enrichment/email-validator';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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
      return NextResponse.json(
        { error: 'email or emails array is required' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Email validation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate email' },
      { status: 500 }
    );
  }
}
