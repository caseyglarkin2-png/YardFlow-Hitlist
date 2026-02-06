import { authServiceOrSession } from '@/lib/auth-service';
import { calculateICPScore, updateAccountScore } from '@/lib/icp-calculator';
import { NextRequest, NextResponse } from 'next/server';
import { captureRouteError } from '@/lib/sentry-utils';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const breakdown = await calculateICPScore(params.id);

    // Update the score and log to history
    await updateAccountScore(
      params.id,
      breakdown.total,
      'auto_calculated',
      authResult.email,
      `Calculated: ${breakdown.total} pts (Persona: ${breakdown.personaMatch}, Exec: ${breakdown.executiveCount}, Contacts: ${breakdown.totalContacts}, Data: ${breakdown.dataCompleteness})`
    );

    return NextResponse.json({
      score: breakdown.total,
      breakdown,
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/accounts/[id]/calculate-score',
      method: 'POST',
    });
    console.error('Error calculating score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
