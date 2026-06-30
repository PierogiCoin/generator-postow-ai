import logger from '../logger.js';
import { isGeminiQuotaError } from './geminiErrors.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export { sleep };

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryableErrors?: number[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryableErrors = [429, 500, 503, 408],
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Dzienny limit Gemini — ponowne próby tylko wydłużają timeout
      if (isGeminiQuotaError(error)) {
        throw error;
      }

      const err = error as { status?: number; response?: { status?: number }; message?: string };
      const statusCode = err.status || err.response?.status || 0;
      const isRetryable = retryableErrors.includes(statusCode);

      if (!isRetryable || attempt === maxRetries - 1) {
        logger.error(`[Retry] Failed after ${attempt + 1} attempts`, {
          error: err.message,
          statusCode,
        });
        throw error;
      }

      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 0.3 * exponentialDelay;
      const delay = exponentialDelay + jitter;

      logger.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed with ${statusCode}. Retrying in ${Math.round(delay)}ms`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}
