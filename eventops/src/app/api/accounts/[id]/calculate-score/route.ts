import { auth } from '@/lib/auth';
import { calculateICPScore, updateAccountScore } from '@/lib/icp-calculator';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const breakdown = await calculateICPScore(params.id);

    // Update the score and log to history
    await updateAccountScore(
      params.id,
      breakdown.total,
      'auto_calculated',
      session.user.email || undefined,
      `Calculated: ${breakdown.total} pts (Persona: ${breakdown.personaMatch}, Exec: ${breakdown.executiveCount}, Contacts: ${breakdown.totalContacts}, Data: ${breakdown.dataCompleteness})`
    );

    return NextResponse.json({
      score: breakdown.total,
      breakdown,
    });
  } catch (error) {
    console.error('Error calculating score:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
