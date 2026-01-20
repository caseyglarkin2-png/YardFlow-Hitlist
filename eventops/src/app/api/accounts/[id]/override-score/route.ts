import { auth } from '@/lib/auth';
import { updateAccountScore } from '@/lib/icp-calculator';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const overrideSchema = z.object({
  score: z.number().min(0).max(100),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = overrideSchema.parse(body);

    await updateAccountScore(
      params.id,
      data.score,
      'manual_override',
      session.user.email || undefined,
      data.notes
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error overriding score:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
