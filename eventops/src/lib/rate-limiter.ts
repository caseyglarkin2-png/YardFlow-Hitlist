// Rate limiting middleware using in-memory store
// For distributed systems, use Redis with ioredis

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private defaultLimit: number = 100; // requests per window
  private windowSeconds: number = 60; // 1 minute window

  async checkLimit(
    key: string,
    limit: number = this.defaultLimit,
    windowSeconds: number = this.windowSeconds
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const entry = this.limits.get(key);

    // No previous entry or window expired
    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowSeconds * 1000;
      this.limits.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt,
      };
    }

    // Within window
    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  getStats() {
    return {
      totalKeys: this.limits.size,
      defaultLimit: this.defaultLimit,
      windowSeconds: this.windowSeconds,
    };
  }
}

export const rateLimiter = new RateLimiter();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);

// Helper function for API routes
export async function checkRateLimit(
  userId: string,
  endpoint: string,
  limit?: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `${userId}:${endpoint}`;
  return rateLimiter.checkLimit(key, limit);
}
