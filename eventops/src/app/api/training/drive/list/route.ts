import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { google } from 'googleapis';
import { getGoogleClient } from '@/lib/google/auth';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileType = searchParams.get('type') || 'all';

    const googleClient = await getGoogleClient(authResult.userId);
    const drive = google.drive({ version: 'v3', auth: googleClient });

    // Build query based on file type
    let query = 'trashed = false and (';
    if (fileType === 'video' || fileType === 'all') {
      query += "mimeType contains 'video/' or ";
    }
    if (fileType === 'audio' || fileType === 'all') {
      query += "mimeType contains 'audio/' or ";
    }
    if (fileType === 'document' || fileType === 'all') {
      query +=
        "mimeType = 'application/pdf' or mimeType contains 'document' or mimeType contains 'presentation' or ";
    }
    query = query.slice(0, -4) + ')'; // Remove trailing " or "

    const response = await drive.files.list({
      q: query,
      pageSize: 100,
      fields:
        'files(id, name, mimeType, size, thumbnailLink, webViewLink, webContentLink, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc',
    });

    return NextResponse.json({
      files: response.data.files || [],
      success: true,
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/training/drive/list',
      method: 'GET',
      userId: authResult?.userId,
    });
    console.error('Error listing Drive files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list files' },
      { status: 500 }
    );
  }
}
