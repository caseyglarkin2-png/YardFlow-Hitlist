import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

/**
 * POST /api/users/from-firebase
 * Create/link Railway user from Firebase auth
 *
 * Called by GTM frontend to ensure a Railway user exists
 * for the Firebase-authenticated user.
 */
export async function POST(request: NextRequest) {
  // Require S2S auth for this endpoint
  const authResult = await authServiceOrSession(request);
  if (!authResult || authResult.type !== 'service') {
    return NextResponse.json(
      {
        error: 'UNAUTHORIZED',
        message: 'This endpoint requires service-to-service authentication',
        statusCode: 401,
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { firebaseUid, email, displayName, photoURL } = body;

    if (!firebaseUid || !email) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'firebaseUid and email are required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Check if user exists by email or firebaseUid (stored in googleId field)
    let user = await prisma.users.findFirst({
      where: {
        OR: [{ email }, { googleId: firebaseUid }],
      },
    });

    let isNewUser = false;

    if (user) {
      // Update existing user with Firebase info if needed
      if (!user.googleId || user.googleId !== firebaseUid) {
        user = await prisma.users.update({
          where: { id: user.id },
          data: {
            googleId: firebaseUid,
            name: displayName || user.name,
            image: photoURL || user.image,
            updatedAt: new Date(),
          },
        });
      }
    } else {
      // Create new user
      isNewUser = true;
      user = await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email,
          name: displayName || email.split('@')[0],
          image: photoURL,
          googleId: firebaseUid,
          role: 'MEMBER',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('New user created from Firebase', {
        railwayUserId: user.id,
        firebaseUid,
        email,
      });
    }

    return NextResponse.json({
      railwayUserId: user.id,
      isNewUser,
    });
  } catch (err) {
    captureRouteError(err, {
      route: '/api/users/from-firebase',
      method: 'POST',
      userId: authResult?.userId,
    });
    logger.error('Failed to create/link Firebase user', { error: String(err) });
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
