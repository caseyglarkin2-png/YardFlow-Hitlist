import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { google } from 'googleapis';
import { getGoogleClient } from '@/lib/google/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileType = searchParams.get('type') || 'all';

    const googleClient = await getGoogleClient(session.user.id);
    const drive = google.drive({ version: 'v3', auth: googleClient });

    // Build query based on file type
    let query = "trashed = false and (";
    if (fileType === 'video' || fileType === 'all') {
      query += "mimeType contains 'video/' or ";
    }
    if (fileType === 'audio' || fileType === 'all') {
      query += "mimeType contains 'audio/' or ";
    }
    if (fileType === 'document' || fileType === 'all') {
      query += "mimeType = 'application/pdf' or mimeType contains 'document' or mimeType contains 'presentation' or ";
    }
    query = query.slice(0, -4) + ")"; // Remove trailing " or "

    const response = await drive.files.list({
      q: query,
      pageSize: 100,
      fields: 'files(id, name, mimeType, size, thumbnailLink, webViewLink, webContentLink, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc',
    });

    return NextResponse.json({
      files: response.data.files || [],
      success: true,
    });
  } catch (error: any) {
    console.error('Error listing Drive files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}
