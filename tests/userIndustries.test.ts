import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
});

vi.mock('../services/supabaseClient', () => ({
  getSupabase: () => ({
    from: () => ({
      update: () => ({
        eq: async () => ({ data: null, error: null }),
      }),
    }),
  }),
}));

import {
  formatIndustriesLabel,
  getPendingIndustryIds,
  getUserIndustryIds,
  parseIndustryIdsFromNiche,
  setPendingIndustryIds,
  setUserIndustryIds,
  clearPendingIndustryIds,
} from '../utils/userIndustries';

describe('userIndustries', () => {
  beforeEach(() => {
    store.clear();
  });

  it('parses multi labels from niche string', () => {
    const ids = parseIndustryIdsFromNiche('Lokal / gastronomia · Fryzjer / beauty');
    expect(ids).toContain('pl-lokal');
    expect(ids).toContain('pl-fryzjer');
  });

  it('stores and reads industry ids', async () => {
    await setUserIndustryIds(['pl-lokal', 'pl-ecom'], { syncRemote: false });
    expect(getUserIndustryIds()).toEqual(['pl-lokal', 'pl-ecom']);
    expect(formatIndustriesLabel(['pl-lokal', 'pl-ecom'])).toContain('Lokal');
    expect(formatIndustriesLabel(['pl-lokal', 'pl-ecom'])).toContain('E-commerce');
  });

  it('keeps pending industries for signup funnel', () => {
    setPendingIndustryIds(['pl-fitness', 'pl-moda']);
    expect(getPendingIndustryIds()).toEqual(['pl-fitness', 'pl-moda']);
    clearPendingIndustryIds();
    expect(getPendingIndustryIds()).toEqual([]);
  });
});
