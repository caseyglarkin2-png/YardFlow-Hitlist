type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  nextRetry: number;
}

class CircuitBreaker {
  private states = new Map<string, CircuitBreakerState>();
  private maxFailures = 5;
  private cooldownMs = 5 * 60 * 1000; // 5 minutes
  private retryAfterMs = 60 * 1000; // 1 minute

  getStatus(userId: string): CircuitBreakerState {
    return this.states.get(userId) || {
      state: 'closed',
      failures: 0,
      lastFailure: 0,
      nextRetry: 0,
    };
  }

  async call<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const state = this.getStatus(userId);

    // Check if circuit is open
    if (state.state === 'open') {
      const now = Date.now();
      if (now < state.nextRetry) {
        throw new Error(
          `Circuit breaker open for user ${userId}. Retry after ${new Date(state.nextRetry).toISOString()}`
        );
      }

      // Try half-open state
      state.state = 'half-open';
      this.states.set(userId, state);
    }

    try {
      const result = await fn();

      // Success - reset circuit
      if (state.state === 'half-open' || state.failures > 0) {
        this.states.set(userId, {
          state: 'closed',
          failures: 0,
          lastFailure: 0,
          nextRetry: 0,
        });
      }

      return result;
    } catch (error) {
      // Failure - increment counter
      const newFailures = state.failures + 1;
      const now = Date.now();

      if (newFailures >= this.maxFailures) {
        // Open circuit
        this.states.set(userId, {
          state: 'open',
          failures: newFailures,
          lastFailure: now,
          nextRetry: now + this.cooldownMs,
        });
      } else {
        // Update failure count
        this.states.set(userId, {
          ...state,
          failures: newFailures,
          lastFailure: now,
          nextRetry: now + this.retryAfterMs,
        });
      }

      throw error;
    }
  }

  reset(userId: string) {
    this.states.delete(userId);
  }
}

export const googleCircuitBreaker = new CircuitBreaker();
