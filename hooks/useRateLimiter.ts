import { useState, useCallback, useEffect, useRef } from 'react';
import { showWarning } from '../utils/errorHandler';

/**
 * Hook for rate limiting user actions in the UI
 * Prevents spam clicking and excessive API calls
 */
export function useRateLimiter(
  maxCalls: number = 5,
  windowMs: number = 60000, // 1 minute
  cooldownMs: number = 2000 // 2 seconds
) {
  const [isLimited, setIsLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  
  const callTimesRef = useRef<number[]>([]);
  const lastCallRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout>();

  /**
   * Check if action can proceed
   */
  const canProceed = useCallback((): boolean => {
    const now = Date.now();

    // Check cooldown between calls
    if (now - lastCallRef.current < cooldownMs) {
      const waitTime = Math.ceil((cooldownMs - (now - lastCallRef.current)) / 1000);
      showWarning(
        'Zwolnij!',
        `Poczekaj ${waitTime} sekund przed kolejnym żądaniem`
      );
      setIsLimited(true);
      setRetryAfter(cooldownMs - (now - lastCallRef.current));
      
      // Auto-reset after cooldown
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsLimited(false);
        setRetryAfter(0);
      }, cooldownMs - (now - lastCallRef.current));
      
      return false;
    }

    // Remove old calls outside the window
    callTimesRef.current = callTimesRef.current.filter(
      time => now - time < windowMs
    );

    // Check rate limit
    if (callTimesRef.current.length >= maxCalls) {
      const oldestCall = callTimesRef.current[0];
      const resetIn = windowMs - (now - oldestCall);
      const waitMinutes = Math.ceil(resetIn / 60000);
      
      showWarning(
        'Limit osiągnięty',
        `Przekroczyłeś limit ${maxCalls} żądań na minutę. Poczekaj ${waitMinutes} min.`
      );
      
      setIsLimited(true);
      setRetryAfter(resetIn);
      
      // Auto-reset after window
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsLimited(false);
        setRetryAfter(0);
      }, resetIn);
      
      return false;
    }

    return true;
  }, [maxCalls, windowMs, cooldownMs]);

  /**
   * Record a call
   */
  const recordCall = useCallback(() => {
    const now = Date.now();
    lastCallRef.current = now;
    callTimesRef.current.push(now);
  }, []);

  /**
   * Execute action with rate limiting
   */
  const execute = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | null> => {
      if (!canProceed()) {
        return null;
      }

      recordCall();
      return action();
    },
    [canProceed, recordCall]
  );

  /**
   * Reset rate limiter
   */
  const reset = useCallback(() => {
    callTimesRef.current = [];
    lastCallRef.current = 0;
    setIsLimited(false);
    setRetryAfter(0);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    canProceed,
    recordCall,
    execute,
    reset,
    isLimited,
    retryAfter,
  };
}

/**
 * Hook for debouncing actions (prevent rapid repeated calls)
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * Hook for throttling actions (limit execution rate)
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number = 1000
): (...args: Parameters<T>) => void {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= limit) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        // Queue the call for later
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, limit - timeSinceLastCall);
      }
    },
    [callback, limit]
  );
}
