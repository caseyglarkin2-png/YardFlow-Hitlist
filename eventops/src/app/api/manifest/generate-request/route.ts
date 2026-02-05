import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import {
  generateManifestRequest,
  validateManifestRequest,
  type ManifestRequestInput,
} from '@/lib/manifest/meeting-request-generator';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ManifestRequestInput;

    // Validate required fields
    if (!body.contactName || !body.companyName || !body.title) {
      return NextResponse.json(
        { error: 'Missing required fields: contactName, companyName, title' },
        { status: 400 }
      );
    }

    // Generate the meeting request
    const message = await generateManifestRequest(body);

    // Validate the generated message
    const validation = validateManifestRequest(message);

    logger.info('Generated Manifest meeting request', {
      userId: authResult.userId,
      contactName: body.contactName,
      companyName: body.companyName,
      messageLength: message.length,
      valid: validation.valid,
    });

    return NextResponse.json({
      message,
      length: message.length,
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/manifest/generate-request',
      method: 'POST',
      userId: authResult?.userId,
    });
    logger.error('Manifest meeting request generation failed', {
      error,
      userId: authResult.userId,
    });

    return NextResponse.json({ error: 'Failed to generate meeting request' }, { status: 500 });
  }
}
