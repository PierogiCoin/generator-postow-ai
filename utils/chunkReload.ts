import React from 'react';

const CHUNK_RELOAD_KEY = 'chunk_reload_ts';
const QUOTA_FLAG_KEY = 'gemini_quota_depleted';

export function markQuotaDepleted(): void {
  try {
    sessionStorage.setItem(QUOTA_FLAG_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearQuotaDepleted(): void {
  try {
    sessionStorage.removeItem(QUOTA_FLAG_KEY);
  } catch {
    /* ignore */
  }
}

export function isQuotaDepleted(): boolean {
  try {
    return sessionStorage.getItem(QUOTA_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function setupChunkReloadRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnceForStaleChunks();
  });
}

export function reloadOnceForStaleChunks(): void {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < 15_000) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
  } catch {
    window.location.reload();
  }
}

export function lazyWithRetry<T extends React.ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('text/html') ||
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed')
      ) {
        reloadOnceForStaleChunks();
      }
      throw error;
    }
  });
}
