import { google } from 'googleapis';
import { prisma } from '@/lib/db';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.AUTH_URL}/api/google/callback`
  );
}

export function getAuthUrl(state?: string) {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent', // Force consent to get refresh token
    state: state || '',
  });
}

export async function getGoogleClient(userId: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
    },
  });

  if (!user?.googleRefreshToken) {
    throw new Error('User not connected to Google');
  }

  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken || undefined,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry ? new Date(user.googleTokenExpiry).getTime() : undefined,
  });

  // Auto-refresh if token expired
  oauth2Client.on('tokens', async (tokens) => {
    await prisma.users.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token || user.googleAccessToken,
        googleRefreshToken: tokens.refresh_token || user.googleRefreshToken,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : user.googleTokenExpiry,
        updatedAt: new Date(),
      },
    });
  });

  return oauth2Client;
}

export async function disconnectGoogle(userId: string) {
  await prisma.users.update({
    where: { id: userId },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleSyncEnabled: false,
      googleSyncPaused: true,
      lastGoogleSync: null,
      updatedAt: new Date(),
    },
  });
}
