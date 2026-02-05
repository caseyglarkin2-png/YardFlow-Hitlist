/**
 * Sentry Error Capture Utilities
 * 
 * Provides contextual error capture for API routes with:
 * - Route/method tagging for dashboard filtering
 * - User context correlation
 * - Structured extras for debugging
 * 
 * Usage in route catch blocks:
 *   captureRouteError(error, { route: '/api/accounts/[id]', method: 'GET', userId });
 */
import * as Sentry from '@sentry/nextjs';

export interface RouteErrorContext {
  /** The API route path, e.g. '/api/accounts/[id]' */
  route: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Authenticated user ID, if available */
  userId?: string;
  /** Additional structured data for debugging */
  extras?: Record<string, unknown>;
}

/**
 * Capture an error with full route context in Sentry.
 * Use in catch blocks of API route handlers.
 * 
 * @param error - The caught error (unknown type from catch blocks)
 * @param context - Route context for tagging and filtering
 * @returns The Sentry event ID for reference
 */
export function captureRouteError(error: unknown, context: RouteErrorContext): string {
  const { route, method, userId, extras } = context;

  return Sentry.withScope((scope) => {
    // Tag for filtering in Sentry dashboard
    scope.setTag('api.route', route);
    scope.setTag('api.method', method);
    scope.setLevel('error');

    // User context for correlation
    if (userId) {
      scope.setUser({ id: userId });
    }

    // Structured extras for debugging
    if (extras) {
      Object.entries(extras).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    // Normalize the error
    const normalizedError = error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : JSON.stringify(error));

    return Sentry.captureException(normalizedError);
  });
}

/**
 * Capture a warning/info message with route context.
 * Use for non-error conditions worth tracking (e.g., rate limits, auth failures).
 * 
 * @param message - Descriptive message
 * @param context - Route context for tagging
 * @param level - Severity level (default: 'warning')
 */
export function captureRouteMessage(
  message: string,
  context: RouteErrorContext,
  level: 'info' | 'warning' | 'error' = 'warning'
): void {
  const { route, method, userId, extras } = context;

  Sentry.withScope((scope) => {
    scope.setTag('api.route', route);
    scope.setTag('api.method', method);
    scope.setLevel(level);

    if (userId) {
      scope.setUser({ id: userId });
    }

    if (extras) {
      Object.entries(extras).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    Sentry.captureMessage(message);
  });
}
