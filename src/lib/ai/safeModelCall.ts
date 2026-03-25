import { performance } from 'perf_hooks';

const RETRY_DELAYS_MS = [2000, 5000, 10000];

type SafeCallOptions = {
  label?: string;
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
  onFailure?: (error: unknown) => void;
};

function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  const message = typeof error === 'string'
    ? error
    : (error as any)?.message || (error as any)?.toString?.();

  if (!message) return false;
  return message.toLowerCase().includes('rate limit')
    || message.toLowerCase().includes('429');
}

export async function safeModelCall<T>(
  fn: () => Promise<T>,
  options: SafeCallOptions = {}
): Promise<T> {
  const label = options.label || 'model-call';
  const start = performance.now();

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const result = await fn();
      const duration = performance.now() - start;
      console.log(`[safeModelCall] ${label} succeeded in ${duration.toFixed(0)}ms (attempt ${attempt + 1})`);
      return result;
    } catch (error) {
      const isRateLimit = isRateLimitError(error);
      const delay = RETRY_DELAYS_MS[attempt];

      if (!isRateLimit || delay === undefined) {
        options.onFailure?.(error);
        throw error;
      }

      console.warn(`[safeModelCall] ${label} rate limited (attempt ${attempt + 1}), retrying in ${delay}ms`);
      options.onRetry?.(attempt + 1, delay, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`[safeModelCall] ${label} exhausted all retries`);
}
