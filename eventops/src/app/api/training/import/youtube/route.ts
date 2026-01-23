import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, eventId } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'url required' }, { status: 400 });
    }

    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Fetch metadata using YouTube oEmbed API (no API key required)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch YouTube metadata');
    }

    const metadata = await response.json();

    const content = await prisma.training_content.create({
      data: {
        id: crypto.randomUUID(),
        eventId,
        userId: session.user.id,
        source: 'youtube',
        type: 'video',
        title: metadata.title || 'YouTube Video',
        url: url,
        thumbnailUrl: metadata.thumbnail_url || null,
        sourceId: videoId,
        metadata: {
          author: metadata.author_name,
          authorUrl: metadata.author_url,
          height: metadata.height,
          width: metadata.width,
        },
        status: 'ready',
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      content: {
        id: content.id,
        title: content.title,
        thumbnailUrl: content.thumbnailUrl,
      },
    });
  } catch (error: any) {
    console.error('Error importing YouTube video:', error);
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^&\s]+)/,
    /youtube\.com\/v\/([^&\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
