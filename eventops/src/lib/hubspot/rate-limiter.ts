import { logger } from '@/lib/logger';

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retries: number;
}

interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
  maxRetries: number;
  baseBackoffMs: number;
}

/**
 * Production-ready rate limiter for HubSpot API
 * Handles HubSpot's 100 requests per 10 seconds limit
 */
export class HubSpotRateLimiter {
  private queue: QueuedRequest<any>[] = [];
  private requestTimestamps: number[] = [];
  private processing = false;
  private config: RateLimiterConfig;

  constructor(config?: Partial<RateLimiterConfig>) {
    this.config = {
      maxRequests: config?.maxRequests ?? 100,
      windowMs: config?.windowMs ?? 10000, // 10 seconds
      maxRetries: config?.maxRetries ?? 3,
      baseBackoffMs: config?.baseBackoffMs ?? 1000,
    };
  }

  /**
   * Execute a function with rate limiting
   * @param fn Function to execute
   * @returns Promise with the function result
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
        retries: 0,
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      // Clean up old timestamps outside the window
      const now = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter(
        (timestamp) => now - timestamp < this.config.windowMs
      );

      // Check if we can make a request
      if (this.requestTimestamps.length >= this.config.maxRequests) {
        const oldestTimestamp = this.requestTimestamps[0];
        const waitTime = this.config.windowMs - (now - oldestTimestamp);
        
        logger.debug('Rate limit reached, waiting', {
          waitTime,
          queueLength: this.queue.length,
        });

        await this.sleep(waitTime);
        continue;
      }

      // Get next request from queue
      const request = this.queue.shift();
      if (!request) continue;

      try {
        // Record timestamp before making request
        this.requestTimestamps.push(Date.now());
        
        // Execute the request
        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        await this.handleError(error, request);
      }
    }

    this.processing = false;
  }

  /**
   * Handle errors with exponential backoff retry logic
   */
  private async handleError<T>(
    error: unknown,
    request: QueuedRequest<T>
  ): Promise<void> {
    const isRateLimitError = this.isRateLimitError(error);
    const shouldRetry = request.retries < this.config.maxRetries;

    if (isRateLimitError && shouldRetry) {
      // Exponential backoff
      const backoffTime =
        this.config.baseBackoffMs * Math.pow(2, request.retries);
      
      logger.warn('Rate limit 429 error, retrying with backoff', {
        retries: request.retries + 1,
        maxRetries: this.config.maxRetries,
        backoffTime,
      });

      await this.sleep(backoffTime);
      
      // Re-queue the request
      request.retries++;
      this.queue.unshift(request);
    } else {
      // Max retries exceeded or non-recoverable error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Request failed after retries', {
        error: errorMessage,
        retries: request.retries,
      });

      request.reject(
        new Error(
          `HubSpot API request failed: ${errorMessage} (after ${request.retries} retries)`
        )
      );
    }
  }

  /**
   * Check if error is a rate limit error (429)
   */
  private isRateLimitError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      // HubSpot API client error format
      if ('statusCode' in error && error.statusCode === 429) {
        return true;
      }
      if ('status' in error && error.status === 429) {
        return true;
      }
      // Axios-style error
      if ('response' in error) {
        const response = (error as any).response;
        if (response?.status === 429) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      requestsInWindow: this.requestTimestamps.length,
      maxRequests: this.config.maxRequests,
      processing: this.processing,
    };
  }

  /**
   * Clear the queue (useful for testing)
   */
  clearQueue(): void {
    this.queue = [];
    this.requestTimestamps = [];
    this.processing = false;
  }
}

// Export singleton instance
export const hubspotRateLimiter = new HubSpotRateLimiter();
