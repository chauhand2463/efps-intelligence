type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private options: CircuitOptions;

  constructor(
    private name: string,
    options?: Partial<CircuitOptions>
  ) {
    this.options = {
      failureThreshold: options?.failureThreshold ?? 3,
      resetTimeoutMs: options?.resetTimeoutMs ?? 30000,
    };
  }

  async call<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        if (fallback) return fallback();
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) return fallback();
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`[CircuitBreaker] '${this.name}' opened after ${this.failureCount} failures`);
    }
  }

  getState() {
    return this.state;
  }
}
