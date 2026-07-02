import { describe, expect, it } from 'vitest';
import {
  computeGapSlots,
  parseWeekdayHourLabel,
  gapSlotToLabel,
} from '../server/lib/competitorGapAnalytics.js';

describe('competitorGapAnalytics', () => {
  it('parses Polish weekday hour labels', () => {
    const parsed = parseWeekdayHourLabel('Wt 11:00 — mało postów');
    expect(parsed).toEqual({ weekday: 1, hour: 11 });
  });

  it('prefers low competitor density slots', () => {
    const gaps = computeGapSlots(
      [
        { weekday: 1, hour: 9, density: 9 },
        { weekday: 2, hour: 11, density: 2 },
        { weekday: 3, hour: 14, density: 1 },
      ],
      [{ weekday: 2, hour: 11, samples: 3, avgScore: 0.8 }],
      5
    );

    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0].weekday).toBe(3);
    expect(gaps[0].gapScore).toBeGreaterThanOrEqual(gaps.find((g) => g.hour === 9)?.gapScore ?? 0);
  });

  it('formats gap slot labels', () => {
    expect(gapSlotToLabel({ weekday: 0, hour: 9, gapScore: 8, reason: '', competitorDensity: 2 })).toBe(
      'Pon 09:00'
    );
  });
});
