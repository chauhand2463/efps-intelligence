import { describe, it, expect, vi } from 'vitest';
import { CircuitBreaker } from '../../src/shared/utils/circuit-breaker';

describe('CircuitBreaker', () => {
  it('starts CLOSED and allows calls', async () => {
    const cb = new CircuitBreaker('test');
    expect(cb.getState()).toBe('CLOSED');
    const result = await cb.call(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('opens after failureThreshold failures', async () => {
    const cb = new CircuitBreaker('test-fail', { failureThreshold: 2, resetTimeoutMs: 60000 });
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    // First failure: still CLOSED (threshold not reached)
    await expect(cb.call(fn)).rejects.toThrow('fail');
    expect(cb.getState()).toBe('CLOSED');

    // Second failure: reaches threshold → OPEN
    await expect(cb.call(fn)).rejects.toThrow('fail');
    expect(cb.getState()).toBe('OPEN');
  });

  it('rejects immediately when OPEN without calling fn', async () => {
    const cb = new CircuitBreaker('test-immediate', { failureThreshold: 1, resetTimeoutMs: 60000 });
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(cb.call(fn)).rejects.toThrow('fail');
    expect(cb.getState()).toBe('OPEN');
    expect(fn).toHaveBeenCalledTimes(1);

    // Second call while OPEN — fn should NOT be called again
    await expect(cb.call(fn)).rejects.toThrow("Circuit breaker 'test-immediate' is OPEN");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls fallback when OPEN', async () => {
    const cb = new CircuitBreaker('test-fallback', { failureThreshold: 1, resetTimeoutMs: 60000 });
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const fallback = vi.fn().mockResolvedValue('fallback-ok');

    // First failure: circuit opens, fallback is called instead of throwing
    const result1 = await cb.call(fn, fallback);
    expect(result1).toBe('fallback-ok');
    expect(cb.getState()).toBe('OPEN');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(1);

    // Second call while OPEN: fn is NOT called again, fallback is used
    const result2 = await cb.call(fn, fallback);
    expect(result2).toBe('fallback-ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(2);
  });

  it('transitions to HALF_OPEN after resetTimeout and CLOSED on success', async () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker('test-half-open', { failureThreshold: 1, resetTimeoutMs: 10000 });
    const failFn = vi.fn().mockRejectedValue(new Error('fail'));
    const successFn = vi.fn().mockResolvedValue('recovered');

    await expect(cb.call(failFn)).rejects.toThrow('fail');
    expect(cb.getState()).toBe('OPEN');

    // Advance time past resetTimeout
    vi.advanceTimersByTime(10001);

    // Should be HALF_OPEN internally and try the call
    const result = await cb.call(successFn);
    expect(result).toBe('recovered');
    expect(successFn).toHaveBeenCalledTimes(1);

    // After success, circuit should be CLOSED again
    expect(cb.getState()).toBe('CLOSED');
    vi.useRealTimers();
  });

  it('re-opens after HALF_OPEN probe fails', async () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker('test-reopen', { failureThreshold: 1, resetTimeoutMs: 5000 });
    const failFn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(cb.call(failFn)).rejects.toThrow('fail');
    expect(cb.getState()).toBe('OPEN');

    vi.advanceTimersByTime(5001);

    // HALF_OPEN probe fails → back to OPEN
    await expect(cb.call(failFn)).rejects.toThrow('fail');
    expect(cb.getState()).toBe('OPEN');
    expect(failFn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
