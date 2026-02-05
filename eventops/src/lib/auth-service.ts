import { auth } from '@/auth';
import { logger } from '@/lib/logger';

export type AuthResult = {
  type: 'session' | 'service';
  userId: string;
  email?: string;
} | null;

/**
 * Authenticate request via session OR service-to-service key.
 * Use for routes that GTM frontend or other services call.
 *
 * Authentication precedence:
 * 1. x-service-key header (SERVICE_TO_SERVICE_SECRET)
 * 2. Bearer token (CRON_SECRET for backward compat)
 * 3. NextAuth session
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = await authServiceOrSession(request);
 *   if (!authResult) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   // Use authResult.userId
 * }
 * ```
 */
export async function authServiceOrSession(request: Request): Promise<AuthResult> {
  const path = new URL(request.url).pathname;

  // 1. Check service-to-service header
  const serviceKey = request.headers.get('x-service-key');
  const serviceSecret = process.env.SERVICE_TO_SERVICE_SECRET;

  if (serviceKey && serviceSecret && serviceKey === serviceSecret) {
    const userId = request.headers.get('x-user-id') || 'service:gtm-frontend';
    const email = request.headers.get('x-user-email') || undefined;

    // Audit log for S2S calls
    logger.info('S2S API call', {
      route: path,
      userId,
      type: 'service',
      origin: request.headers.get('origin') || 'unknown',
    });

    return { type: 'service', userId, email };
  }

  // 2. Fall back to CRON_SECRET (for backward compat with cron jobs)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && token === cronSecret) {
      logger.info('Cron API call', {
        route: path,
        type: 'service',
      });
      return { type: 'service', userId: 'service:cron' };
    }
  }

  // 3. Fall back to NextAuth session
  try {
    const session = await auth();
    if (session?.user?.id) {
      return {
        type: 'session',
        userId: session.user.id,
        email: session.user.email || undefined,
      };
    }
  } catch (error) {
    // Session auth failed, continue to return null
    logger.debug('Session auth failed', { route: path, error: String(error) });
  }

  return null;
}

/**
 * Require auth - returns error response if not authenticated.
 * Convenience wrapper for routes.
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const { error, response, auth } = await requireAuth(request);
 *   if (error) return response;
 *   // Use auth.userId
 * }
 * ```
 */
export async function requireAuth(
  request: Request
): Promise<
  | { error: true; response: Response; auth?: never }
  | { error: false; auth: AuthResult; response?: never }
> {
  const authResult = await authServiceOrSession(request);

  if (!authResult) {
    return {
      error: true,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { error: false, auth: authResult };
}

/**
 * Check if request is from a known service (not a user session).
 */
export function isServiceAuth(authResult: AuthResult): boolean {
  return authResult?.type === 'service';
}

/**
 * Get a real user ID from auth result, with optional database lookup for S2S calls.
 * Use when you need a database-valid userId (e.g., for foreign key references).
 *
 * For session auth: returns userId directly.
 * For S2S auth with x-user-id header: returns that userId.
 * For S2S auth without user context: looks up user by email or returns null.
 *
 * @param authResult - Result from authServiceOrSession
 * @param lookupByEmail - For S2S, attempt to find user by email if userId is a service placeholder
 * @returns Real user ID or null if not resolvable
 *
 * @example
 * ```typescript
 * const authResult = await authServiceOrSession(request);
 * const userId = await getUserIdFromAuth(authResult, prisma);
 * if (!userId) {
 *   return NextResponse.json({ error: 'User not found' }, { status: 400 });
 * }
 * // Use userId for database operations
 * ```
 */
export async function getUserIdFromAuth(
  authResult: AuthResult,
  prismaClient?: { user: { findUnique: (args: { where: { email: string } }) => Promise<{ id: string } | null> } }
): Promise<string | null> {
  if (!authResult) return null;

  // Session auth - userId is always valid
  if (authResult.type === 'session') {
    return authResult.userId;
  }

  // S2S auth - check if userId is a service placeholder
  if (authResult.userId.startsWith('service:')) {
    // If email provided and prisma available, look up user
    if (authResult.email && prismaClient) {
      try {
        const user = await prismaClient.user.findUnique({
          where: { email: authResult.email },
        });
        return user?.id ?? null;
      } catch {
        return null;
      }
    }
    // No way to resolve to real user
    return null;
  }

  // S2S with explicit x-user-id header
  return authResult.userId;
}
