type CacheEntry = {
  data: unknown;
  expiresAt: number;
};

const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 500;

function prune(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  if (store.size <= MAX_ENTRIES) return;
  const sorted = [...store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  for (let i = 0; i < sorted.length - MAX_ENTRIES; i++) {
    store.delete(sorted[i][0]);
  }
}

export function buildIntelligenceCacheKey(prefix: string, payload: Record<string, unknown>): string {
  const normalized = Object.keys(payload)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = payload[key];
      return acc;
    }, {});
  return `${prefix}:${JSON.stringify(normalized)}`;
}

export function getIntelligenceCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setIntelligenceCache(key: string, data: unknown, ttlMs: number): void {
  prune();
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function deleteIntelligenceCache(key: string): boolean {
  return store.delete(key);
}

export const INTELLIGENCE_CACHE_TTL = {
  news: 6 * 60 * 60 * 1000,
  trends: 12 * 60 * 60 * 1000,
  competitor: 24 * 60 * 60 * 1000,
  competitorBatch: 24 * 60 * 60 * 1000,
  scheduleGaps: 24 * 60 * 60 * 1000,
} as const;
