/**
 * Opcjonalne raportowanie błędów — włącz przez VITE_SENTRY_DSN w produkcji.
 * Bez DSN: log do konsoli (zero dodatkowych zależności).
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  const message = error instanceof Error ? error.message : String(error);

  if (import.meta.env.DEV) {
    console.error('[errorReporting]', message, context, error);
    return;
  }

  if (dsn) {
    // Hook pod przyszły @sentry/react — bez wymuszania instalacji pakietu
    console.error('[Sentry-ready]', message, context);
  }
}

export function initErrorReporting(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, { type: 'unhandledrejection' });
  });
}
