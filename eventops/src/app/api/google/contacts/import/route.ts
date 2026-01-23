import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { importGoogleContacts } from '@/lib/google/contacts';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { eventId, dryRun } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      );
    }

    const result = await importGoogleContacts(session.user.id, eventId, { dryRun });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Contacts import error:', error);
    return NextResponse.json(
      { error: error.message || 'Contacts import failed' },
      { status: 500 }
    );
  }
}
