import { describe, expect, it } from 'vitest';
import {
  frequencyToPlanSlots,
  isValidStrategicAuditReport,
  normalizeActionablePlan,
} from '../utils/strategyHelpers';
import { GenerationType, Platform } from '../types';

describe('strategyHelpers', () => {
  it('maps frequency to slot counts', () => {
    expect(frequencyToPlanSlots('daily')).toBe(14);
    expect(frequencyToPlanSlots('3_times_week')).toBe(6);
    expect(frequencyToPlanSlots('weekly')).toBe(2);
  });

  it('validates strategic audit reports', () => {
    expect(isValidStrategicAuditReport(null)).toBe(false);
    expect(
      isValidStrategicAuditReport({
        summary: 'Audit failed to generate',
        contentPillars: [],
        refinedPersona: { name: 'x', age: 1, location: '', jobTitle: '', demographics: '', goals: [], painPoints: [], communicationTips: '' },
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        competitiveSnapshot: [],
        actionablePlan: [],
      })
    ).toBe(false);
    // Niekompletny raport (pusty SWOT, brak filarów) — odrzucony.
    expect(
      isValidStrategicAuditReport({
        summary: 'OK plan',
        contentPillars: [],
        refinedPersona: { name: 'x', age: 1, location: '', jobTitle: '', demographics: '', goals: [], painPoints: [], communicationTips: '' },
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        competitiveSnapshot: [],
        actionablePlan: [{ id: '1', date: '2026-07-01', platform: Platform.Facebook, topic: 't', format: GenerationType.PostWithImage, strategy: 's' }],
      })
    ).toBe(false);
    // Kompletny raport — akceptowany.
    expect(
      isValidStrategicAuditReport({
        summary: 'OK plan',
        contentPillars: [{ pillar: 'Edukacja', description: 'd', postIdeas: ['i'] }],
        refinedPersona: { name: 'x', age: 1, location: '', jobTitle: '', demographics: '', goals: [], painPoints: [], communicationTips: '' },
        swot: { strengths: ['s'], weaknesses: [], opportunities: [], threats: [] },
        competitiveSnapshot: [],
        actionablePlan: [{ id: '1', date: '2026-07-01', platform: Platform.Facebook, topic: 't', format: GenerationType.PostWithImage, strategy: 's' }],
      })
    ).toBe(true);
  });

  it('normalizes actionable plan items', () => {
    const plan = normalizeActionablePlan(
      [{ id: '', date: '2026-07-01', platform: Platform.Instagram, topic: 'Hook', format: GenerationType.Video, strategy: 'why' }],
      [GenerationType.Video, GenerationType.PostWithImage]
    );
    expect(plan[0].slotType).toBe('reel');
    expect(plan[0].contentIntent).toBe('educational');
    expect(plan[0].id).toBeTruthy();
  });
});
