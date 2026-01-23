/**
 * API Route: Generate Content (Brand Voice)
 * POST /api/ai/content/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { BrandVoiceContentGenerator } from '@/lib/ai/brand-voice-generator';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientName, companyName, channel, context, tone } = await request.json();

    if (!recipientName || !companyName || !channel) {
      return NextResponse.json(
        { error: 'recipientName, companyName, and channel are required' },
        { status: 400 }
      );
    }

    const generator = new BrandVoiceContentGenerator();

    let content;
    if (channel === 'email') {
      content = await generator.generateEmail({
        recipientName,
        companyName,
        channel,
        context,
        tone,
      });
    } else if (channel === 'linkedin') {
      content = await generator.generateLinkedInMessage({
        recipientName,
        companyName,
        channel,
        context,
        tone,
      });
    } else if (channel === 'phone') {
      content = await generator.generatePhoneScript({
        recipientName,
        companyName,
        channel,
        context,
        tone,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid channel. Must be email, linkedin, or phone' },
        { status: 400 }
      );
    }

    return NextResponse.json(content);
  } catch (error: any) {
    console.error('Content generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    );
  }
}
