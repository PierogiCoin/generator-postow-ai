import { describe, it, expect, vi } from 'vitest';

vi.mock('../server/lib/clients.js', () => ({
  supabase: { from: vi.fn() },
}));

import {
  computeSlotScore,
  getWeekdayHourInTz,
} from '../server/lib/schedulingAnalytics';

describe('computeSlotScore', () => {
  it('preferuje wyższy engagement rate', () => {
    const high = computeSlotScore({ likes: 100, comments: 20, shares: 10, impressions: 1000 });
    const low = computeSlotScore({ likes: 5, comments: 1, shares: 0, impressions: 1000 });
    expect(high).toBeGreaterThan(low);
  });

  it('działa bez impressions (fallback na interakcje)', () => {
    const score = computeSlotScore({ likes: 10, comments: 2, shares: 1 });
    expect(score).toBeGreaterThan(0);
  });
});

describe('getWeekdayHourInTz', () => {
  it('parsuje weekday i hour w UTC', () => {
    const result = getWeekdayHourInTz('2024-06-17T15:00:00.000Z', 'UTC');
    expect(result.weekday).toBeGreaterThanOrEqual(0);
    expect(result.weekday).toBeLessThanOrEqual(6);
    expect(result.hour).toBe(15);
  });
});
