import { describe, expect, it } from 'vitest';
import {
  computeCatholicEaster,
  getCeeEventsForYear,
  getCeeEventsInRange,
  formatCeeEventsForPrompt,
} from '../services/ceeCalendar';
import { tokenizeSimilarity } from '../utils/textSimilarity';
import {
  applyCalibrationToScore,
  DEFAULT_AUTO_PUBLISH_MIN,
} from '../server/lib/qualityCalibrationCore';

describe('ceeCalendar', () => {
  it('computes Easter 2026 correctly', () => {
    const easter = computeCatholicEaster(2026);
    expect(easter.toISOString().slice(0, 10)).toBe('2026-04-05');
  });

  it('includes key PL holidays and retail peaks', () => {
    const events = getCeeEventsForYear(2026);
    const names = events.map((e) => e.name);
    expect(names).toContain('Nowy Rok');
    expect(names).toContain('Święto Konstytucji 3 Maja');
    expect(names).toContain('Black Friday / Cyber Monday');
    expect(names).toContain('Boże Narodzenie');
  });

  it('filters events in range for calendar planning', () => {
    const start = new Date('2026-11-01T00:00:00Z');
    const inRange = getCeeEventsInRange(start, 40);
    expect(inRange.some((e) => e.id.includes('independence'))).toBe(true);
    expect(inRange.some((e) => e.id.includes('blackfriday'))).toBe(true);
    const prompt = formatCeeEventsForPrompt(inRange);
    expect(prompt).toContain('CEE / PL CALENDAR');
  });
});

describe('brandMemory tokenizeSimilarity', () => {
  it('scores overlapping topics higher than unrelated', () => {
    const a = tokenizeSimilarity('darmowa dostawa kurtka jesień', 'dostawa kurier kurtki jesienne');
    const b = tokenizeSimilarity('darmowa dostawa kurtka jesień', 'przepis na sernik');
    expect(a).toBeGreaterThan(b);
    expect(a).toBeGreaterThan(0.1);
  });
});

describe('qualityCalibration applyCalibrationToScore', () => {
  it('returns defaults when not calibrated', () => {
    const r = applyCalibrationToScore(72, 70, {
      minScore: DEFAULT_AUTO_PUBLISH_MIN,
      sampleSize: 0,
      topQuartileEngagement: 0,
      engagementPriorBoost: 0,
      calibrated: false,
    });
    expect(r.minScore).toBe(70);
    expect(r.overall).toBe(72);
  });

  it('nudges overall when engagement prior boost applies', () => {
    const r = applyCalibrationToScore(70, 70, {
      minScore: 65,
      sampleSize: 20,
      topQuartileEngagement: 100,
      engagementPriorBoost: 5,
      calibrated: true,
    });
    expect(r.engagementScore).toBe(75);
    expect(r.overall).toBe(72);
    expect(r.minScore).toBe(65);
  });
});
