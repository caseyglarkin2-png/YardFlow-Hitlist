import { NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/google/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // userId
  const error = searchParams.get('error');

  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings/integrations?error=oauth_failed', process.env.AUTH_URL || '')
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing code or state parameter' },
      { status: 400 }
    );
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Save tokens to database
    await prisma.users.update({
      where: { id: state },
      data: {
        googleAccessToken: tokens.access_token || null,
        googleRefreshToken: tokens.refresh_token || null,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleSyncEnabled: true,
        googleSyncPaused: false,
        googleSyncDryRun: true, // Safe by default
        updatedAt: new Date(),
      },
    });

    // Log connection
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        userId: state,
        entityType: 'integration',
        entityId: 'google',
        action: 'google_connected',
        metadata: {
          scopes: tokens.scope?.split(' ') || [],
          connectedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.redirect(
      new URL('/dashboard/settings/integrations?success=true', process.env.AUTH_URL || '')
    );
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings/integrations?error=token_exchange_failed', process.env.AUTH_URL || '')
    );
  }
}
