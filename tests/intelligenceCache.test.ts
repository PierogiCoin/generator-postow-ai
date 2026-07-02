import { describe, expect, it } from 'vitest';
import {
  buildIntelligenceCacheKey,
  getIntelligenceCache,
  setIntelligenceCache,
} from '../server/lib/intelligenceCache';

describe('intelligenceCache', () => {
  it('stores and retrieves within TTL', () => {
    const key = buildIntelligenceCacheKey('test', { a: 1, b: 2 });
    setIntelligenceCache(key, { ok: true }, 60_000);
    expect(getIntelligenceCache<{ ok: boolean }>(key)?.ok).toBe(true);
  });

  it('builds stable keys regardless of key order', () => {
    const a = buildIntelligenceCacheKey('x', { niche: 'fit', platform: 'ig' });
    const b = buildIntelligenceCacheKey('x', { platform: 'ig', niche: 'fit' });
    expect(a).toBe(b);
  });
});
