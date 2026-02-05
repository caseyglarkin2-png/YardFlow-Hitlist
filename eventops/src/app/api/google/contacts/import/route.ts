import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { importGoogleContacts } from '@/lib/google/contacts';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { eventId, dryRun } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const result = await importGoogleContacts(authResult.userId, eventId, { dryRun });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Contacts import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Contacts import failed' },
      { status: 500 }
    );
  }
}
