/**
 * API Route: Generate Multi-Channel Sequence
 * POST /api/ai/content/sequence
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { BrandVoiceContentGenerator } from '@/lib/ai/brand-voice-generator';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientName, companyName, context, tone } = await request.json();

    if (!recipientName || !companyName) {
      return NextResponse.json(
        { error: 'recipientName and companyName are required' },
        { status: 400 }
      );
    }

    const generator = new BrandVoiceContentGenerator();
    const sequence = await generator.generateSequence({
      recipientName,
      companyName,
      channel: 'email',
      context,
      tone,
    });

    return NextResponse.json(sequence);
  } catch (error: any) {
    console.error('Sequence generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate sequence' },
      { status: 500 }
    );
  }
}
