/** Event do synchronizacji salda kredytów z odpowiedzi API */
export const CREDITS_UPDATED_EVENT = 'app:credits-updated';

export function emitCreditsUpdated(credits: number): void {
  if (typeof window === 'undefined' || !Number.isFinite(credits)) return;
  window.dispatchEvent(
    new CustomEvent(CREDITS_UPDATED_EVENT, { detail: { credits: Math.max(0, Math.floor(credits)) } })
  );
}

export function applyCreditsFromResponse(
  data: unknown,
  responseHeaders?: Headers
): void {
  const headerVal = responseHeaders?.get('X-Credits-Remaining');
  if (headerVal) {
    const parsed = parseInt(headerVal, 10);
    if (!Number.isNaN(parsed)) {
      emitCreditsUpdated(parsed);
      return;
    }
  }
  if (data && typeof data === 'object' && 'creditsRemaining' in data) {
    const val = (data as { creditsRemaining?: unknown }).creditsRemaining;
    if (typeof val === 'number') emitCreditsUpdated(val);
  }
}
