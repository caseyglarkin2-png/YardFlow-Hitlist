/**
 * Simple in-memory rate limiter for API endpoints
 * For production, consider using Redis-based rate limiting
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitRecord>();

// Clean up old records periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimits.entries()) {
      if (record.resetAt < now) {
        rateLimits.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Check if a request should be rate limited
 * @param key Unique identifier (e.g., `userId:endpoint`)
 * @param limit Maximum requests allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns Object with allowed status and remaining info
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  startCleanup();

  const now = Date.now();
  const record = rateLimits.get(key);

  // No existing record or expired - create new
  if (!record || record.resetAt < now) {
    const newRecord = { count: 1, resetAt: now + windowMs };
    rateLimits.set(key, newRecord);
    return { allowed: true, remaining: limit - 1, resetAt: newRecord.resetAt };
  }

  // Record exists and not expired
  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  // Increment count
  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

/**
 * Rate limiter middleware helper
 * @param identifier User/IP identifier
 * @param endpoint Endpoint name for namespacing
 * @param limit Requests per window (default: 100)
 * @param windowMs Window in ms (default: 60000 = 1 minute)
 */
export function createRateLimiter(limit: number = 100, windowMs: number = 60000) {
  return (identifier: string, endpoint: string = 'default') => {
    const key = `${identifier}:${endpoint}`;
    return checkRateLimit(key, limit, windowMs);
  };
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // Export API: 10 requests per minute
  export: createRateLimiter(10, 60000),

  // Agent API: 20 requests per minute
  agent: createRateLimiter(20, 60000),

  // Email sending: 50 per minute
  email: createRateLimiter(50, 60000),

  // General API: 100 per minute
  general: createRateLimiter(100, 60000),
};

/**
 * Helper to create rate limit response headers
 */
export function rateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  };
}
