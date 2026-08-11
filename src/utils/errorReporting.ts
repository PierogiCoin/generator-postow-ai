/**
 * Opcjonalne raportowanie błędów — włącz przez VITE_SENTRY_DSN w produkcji.
 */
import * as Sentry from '@sentry/react';

let sentryReady = false;

export function initErrorReporting(): void {
  if (typeof window === 'undefined' || sentryReady) return;

  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();

  if (dsn && import.meta.env.PROD) {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
    sentryReady = true;
  }

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, { type: 'unhandledrejection' });
  });
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.error('[errorReporting]', error, context);
    return;
  }

  if (!sentryReady) return;

  Sentry.withScope((scope) => {
    if (context) scope.setContext('extra', context);
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(String(error));
    }
  });
}

export { Sentry };
