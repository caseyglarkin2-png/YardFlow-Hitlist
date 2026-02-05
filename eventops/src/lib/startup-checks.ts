/**
 * Startup Health Checks
 * 
 * Run on worker startup to verify critical dependencies are available.
 * Fails fast if essential services are unreachable.
 */

import { logger } from '@/lib/logger';

/**
 * Check if database is reachable
 */
export async function verifyDatabase(): Promise<boolean> {
  try {
    // Dynamic import to avoid top-level instantiation
    const { prisma } = await import('@/lib/db');
    await prisma.$queryRaw`SELECT 1`;
    logger.info('[startup] Database connection verified');
    return true;
  } catch (error) {
    logger.error('[startup] Database connection FAILED', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return false;
  }
}

/**
 * Check if Redis is reachable
 */
export async function verifyRedis(): Promise<boolean> {
  try {
    // Dynamic import to avoid top-level instantiation
    const { getRedisConnection } = await import('@/lib/queue/client');
    const redis = getRedisConnection();
    const pong = await redis.ping();
    
    if (pong === 'PONG') {
      logger.info('[startup] Redis connection verified');
      return true;
    } else {
      logger.error('[startup] Redis ping returned unexpected response', { pong });
      return false;
    }
  } catch (error) {
    logger.error('[startup] Redis connection FAILED', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return false;
  }
}

/**
 * Check if SendGrid is configured (key presence only)
 */
export function verifySendGrid(): boolean {
  const hasKey = !!process.env.SENDGRID_API_KEY;
  if (hasKey) {
    logger.info('[startup] SendGrid API key configured');
  } else {
    logger.warn('[startup] SendGrid API key NOT configured - email sending disabled');
  }
  return hasKey;
}

/**
 * Check if SendGrid API is actually reachable and key is valid
 * Makes a real API call to verify connectivity
 */
export async function verifySendGridConnectivity(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
}> {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    logger.warn('[startup] SendGrid API key NOT configured - skipping connectivity check');
    return { configured: false, connected: false };
  }
  
  try {
    // Check API key validity by requesting account info
    const response = await fetch('https://api.sendgrid.com/v3/user/credits', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      logger.info('[startup] SendGrid API connectivity verified');
      return { configured: true, connected: true };
    } else if (response.status === 401) {
      logger.error('[startup] SendGrid API key is INVALID');
      return { configured: true, connected: false, error: 'Invalid API key' };
    } else {
      const text = await response.text();
      logger.warn('[startup] SendGrid API returned unexpected status', { 
        status: response.status, 
        body: text.slice(0, 200) 
      });
      // 403 or other status might mean valid key but permission issues
      return { configured: true, connected: true, error: `Status ${response.status}` };
    }
  } catch (error) {
    logger.error('[startup] SendGrid API connectivity FAILED', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { 
      configured: true, 
      connected: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

/**
 * Check if AI provider is configured
 */
export function verifyAIProvider(): boolean {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  
  if (hasGemini) {
    logger.info('[startup] Gemini API key configured (primary)');
  }
  if (hasOpenAI) {
    logger.info('[startup] OpenAI API key configured (fallback)');
  }
  
  if (!hasGemini && !hasOpenAI) {
    logger.error('[startup] NO AI providers configured - AI features disabled');
    return false;
  }
  
  return true;
}

/**
 * Check required environment variables
 */
export function verifyEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'AUTH_SECRET',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error('[startup] Missing required environment variables', { missing });
    return { valid: false, missing };
  }
  
  logger.info('[startup] Environment variables verified');
  return { valid: true, missing: [] };
}

export interface StartupResult {
  database: boolean;
  redis: boolean;
  sendgrid: {
    configured: boolean;
    connected: boolean;
    error?: string;
  };
  ai: boolean;
  environment: { valid: boolean; missing: string[] };
  ready: boolean;
}

/**
 * Run all startup checks
 * Returns comprehensive status object
 */
export async function runStartupChecks(): Promise<StartupResult> {
  logger.info('[startup] Running startup health checks...');
  
  const environment = verifyEnvironment();
  
  // If critical env vars missing, don't try connections
  if (!environment.valid) {
    return {
      database: false,
      redis: false,
      sendgrid: { configured: false, connected: false },
      ai: false,
      environment,
      ready: false,
    };
  }
  
  const [database, redis, sendgrid] = await Promise.all([
    verifyDatabase(),
    verifyRedis(),
    verifySendGridConnectivity(),
  ]);
  
  const ai = verifyAIProvider();
  
  const ready = database && redis; // Core services must be up
  
  if (ready) {
    logger.info('[startup] All critical checks passed - system ready');
  } else {
    logger.error('[startup] Critical checks failed - system NOT ready', {
      database,
      redis,
    });
  }
  
  return {
    database,
    redis,
    sendgrid,
    ai,
    environment,
    ready,
  };
}
