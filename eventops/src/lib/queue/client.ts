import { Redis } from 'ioredis';
import { logger } from '@/lib/logger';

/**
 * Parse Redis connection configuration from environment variables
 */
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    // Railway provides REDIS_URL in the format: redis://default:password@host:port
    const url = new URL(redisUrl);
    
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    };
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

export const redisConfig = getRedisConfig();

/**
 * Redis connection for BullMQ
 */
export const redisConnection = new Redis(redisConfig);

// Event handlers
redisConnection.on('connect', () => {
  logger.info('Redis connection established', {
    host: redisConfig.host,
    port: redisConfig.port,
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
