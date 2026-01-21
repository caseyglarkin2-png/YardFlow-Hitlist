import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/webhooks - Create webhook
export async function POST(request: NextRequest) {
  try {
    const { url, events, secret, active } = await request.json();

    if (!url || !events || events.length === 0) {
      return NextResponse.json(
        { error: 'URL and events required' },
        { status: 400 }
      );
    }

    const webhook = await prisma.webhook.create({
      data: {
        url,
        events,
        secret: secret || null,
        active: active !== false,
      },
    });

    return NextResponse.json(webhook);
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}

// GET /api/webhooks - List webhooks
export async function GET() {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}
