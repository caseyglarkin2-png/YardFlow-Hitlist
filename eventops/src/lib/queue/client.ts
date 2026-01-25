import { Redis } from 'ioredis';
import { logger } from '@/lib/logger';

/**
 * Parse Redis connection configuration from environment variables
 */
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    try {
      // Railway provides REDIS_URL in the format: redis://default:password@host:port
      const url = new URL(redisUrl);
      
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
      };
    } catch (error) {
       logger.warn('Invalid REDIS_URL environment variable, falling back to components', { error });
    }
  }
  
  // Fallback to individual environment variables
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  };
}

// ✅ Lazy initialization - connection only created when needed
let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    const config = getRedisConfig();
    redisConnection = new Redis(config);

    // Event handlers
    redisConnection.on('connect', () => {
      logger.info('Redis connection established', {
        host: config.host,
        port: config.port,
      });
    });

    redisConnection.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisConnection.on('error', (error) => {
      logger.error('Redis connection error', { error });
    });

    redisConnection.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return redisConnection;
}

// Graceful shutdown
export async function closeRedis() {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
