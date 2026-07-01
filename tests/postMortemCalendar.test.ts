import { describe, it, expect } from 'vitest';
import {
  suggestRepostDate,
  buildCalendarItemFromPostMortem,
  mergePostMortemIntoPlan,
} from '../services/postMortemCalendarService';
import type { PostMortemReport } from '../services/postMortemService';
import { SocialPlatform } from '../types/socialPublishing';
import { Platform } from '../types';

const sampleReport: PostMortemReport = {
  overallScore: 7,
  verdict: 'average',
  whatWorked: ['Hook'],
  whatFailed: ['CTA'],
  keyLesson: 'Krótszy CTA działa lepiej.',
  nextTimeRecommendation: 'Dodaj pytanie na końcu.',
  bestTimeToRepost: 'wtorek 10:00',
  suggestedImprovedHook: 'Czy wiesz, że…',
};

describe('postMortemCalendarService', () => {
  it('suggestRepostDate parses day and time', () => {
    const { date, time } = suggestRepostDate('wtorek 10:00', new Date('2026-06-01T12:00:00Z'));
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(time).toBe('10:00');
  });

  it('buildCalendarItemFromPostMortem maps platform and topic', () => {
    const item = buildCalendarItemFromPostMortem(
      sampleReport,
      { content: 'Stary post', publishedAt: new Date('2026-06-01') },
      SocialPlatform.LinkedIn
    );
    expect(item).not.toBeNull();
    expect(item!.platform).toBe(Platform.LinkedIn);
    expect(item!.topic).toBe('Czy wiesz, że…');
    expect(item!.strategy).toContain('Krótszy CTA');
  });

  it('mergePostMortemIntoPlan skips duplicates', () => {
    const item = buildCalendarItemFromPostMortem(
      sampleReport,
      { content: 'x', publishedAt: new Date() },
      SocialPlatform.Facebook
    )!;
    const once = mergePostMortemIntoPlan(null, item);
    const twice = mergePostMortemIntoPlan(once, item);
    expect(once).toHaveLength(1);
    expect(twice).toHaveLength(1);
  });
});
