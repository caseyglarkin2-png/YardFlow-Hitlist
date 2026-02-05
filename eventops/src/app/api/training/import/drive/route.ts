import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { google } from 'googleapis';
import { getGoogleClient } from '@/lib/google/auth';
import { prisma } from '@/lib/db';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileIds, eventId } = await req.json();

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'fileIds array required' }, { status: 400 });
    }

    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    const googleClient = await getGoogleClient(authResult.userId);
    const drive = google.drive({ version: 'v3', auth: googleClient });

    const imported = [];

    for (const fileId of fileIds) {
      try {
        const file = await drive.files.get({
          fileId,
          fields: 'id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink,description',
        });

        const contentType = getContentType(file.data.mimeType || '');

        const content = await prisma.training_content.create({
          data: {
            id: crypto.randomUUID(),
            eventId,
            userId: authResult.userId,
            source: 'drive',
            type: contentType,
            title: file.data.name || 'Untitled',
            description: file.data.description || null,
            url: file.data.webViewLink || '',
            downloadUrl: file.data.webContentLink || null,
            thumbnailUrl: file.data.thumbnailLink || null,
            fileSize: file.data.size ? BigInt(file.data.size) : null,
            mimeType: file.data.mimeType || null,
            sourceId: fileId,
            sourceLink: file.data.webViewLink || null,
            status: 'ready',
            processedAt: new Date(),
          },
        });

        imported.push({
          id: content.id,
          title: content.title,
          type: content.type,
        });
      } catch (error) {
        captureRouteError(error, {
          route: '/api/training/import/drive',
          method: 'POST',
          userId: authResult?.userId,
        });
        console.error(`Error importing file ${fileId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      count: imported.length,
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/training/import/drive',
      method: 'POST',
      userId: authResult?.userId,
    });
    console.error('Error importing from Drive:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}

function getContentType(mimeType: string): string {
  if (mimeType.includes('video')) return 'video';
  if (mimeType.includes('audio')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('presentation')
  ) {
    return 'document';
  }
  return 'link';
}
