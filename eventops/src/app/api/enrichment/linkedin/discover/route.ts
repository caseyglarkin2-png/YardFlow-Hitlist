/**
 * API Route: Discover LinkedIn Profile
 * POST /api/enrichment/linkedin/discover
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { LinkedInExtractor } from '@/lib/enrichment/linkedin-extractor';
import { captureRouteError } from '@/lib/sentry-utils';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { personId } = await request.json();

    if (!personId) {
      return NextResponse.json({ error: 'personId is required' }, { status: 400 });
    }

    const extractor = new LinkedInExtractor();
    const result = await extractor.discoverProfile(personId);

    // Save if found with good confidence
    if (result.profileUrl && result.confidence >= 50) {
      await extractor.saveProfile(personId, result.profileUrl, result.confidence);
    }

    return NextResponse.json(result);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/enrichment/linkedin/discover',
      method: 'POST',
    });
    console.error('LinkedIn discovery error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to discover LinkedIn profile' },
      { status: 500 }
    );
  }
}
