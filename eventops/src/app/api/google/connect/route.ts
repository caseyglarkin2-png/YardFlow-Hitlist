import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google/auth';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', process.env.AUTH_URL));
  }

  const authUrl = getAuthUrl(session.user.id);
  return NextResponse.redirect(authUrl);
}
