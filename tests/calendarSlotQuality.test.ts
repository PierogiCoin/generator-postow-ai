import { describe, it, expect, vi } from 'vitest';
import {
  ensureCalendarSlotQuality,
  CALENDAR_SLOT_MIN_SCORE,
} from '../services/calendarSlotQualityService';
import type { GenerationResult, FormData } from '../types';
import { Platform, GenerationType, Tone, ContentType, VisualStyle, AIModel, ContentLanguage } from '../types';

vi.mock('../services/contentScoringService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/contentScoringService')>();
  return {
    ...actual,
    scorePostContent: vi.fn(),
  };
});

import { scorePostContent } from '../services/contentScoringService';

const formData: FormData = {
  topic: 'Test',
  audience: '',
  tone: Tone.Casual,
  platform: Platform.Instagram,
  contentType: ContentType.Post,
  visualStyle: VisualStyle.PlatformSpecific,
  generationType: GenerationType.PostWithImage,
  model: AIModel.Flash,
  contentLanguage: ContentLanguage.Polish,
};

const baseResult: GenerationResult = {
  id: '1',
  type: GenerationType.PostWithImage,
  platform: Platform.Instagram,
  postText: 'A'.repeat(80),
  hashtags: [],
  adHeadline: null,
  callToAction: null,
  imageUrl: null,
  metadata: { tone: Tone.Casual, audience: '', prompt: 'x' },
  approvalStatus: 'draft',
  comments: [],
  authorId: 'u1',
};

function mockScore(overall: number) {
  return {
    overall,
    engagement: { score: overall, level: 'medium' as const, feedback: [] },
    seo: { score: overall, level: 'medium' as const, feedback: [] },
    platformFit: { score: overall, level: 'good' as const, feedback: [] },
    suggestions: overall < 70 ? ['Dodaj CTA'] : [],
    badge: overall >= 70 ? 'green' as const : 'red' as const,
  };
}

describe('calendarSlotQualityService', () => {
  it('skips auto-fix when score already passes', async () => {
    vi.mocked(scorePostContent).mockResolvedValueOnce(mockScore(85));
    const regenerate = vi.fn();

    const out = await ensureCalendarSlotQuality(baseResult, formData, 'user', {
      regenerateText: regenerate,
    });

    expect(out.scheduledAllowed).toBe(true);
    expect(out.improved).toBe(false);
    expect(regenerate).not.toHaveBeenCalled();
  });

  it('auto-fixes and allows schedule when score improves', async () => {
    vi.mocked(scorePostContent)
      .mockResolvedValueOnce(mockScore(55))
      .mockResolvedValueOnce(mockScore(78));

    const regenerate = vi.fn().mockResolvedValue('B'.repeat(80));

    const out = await ensureCalendarSlotQuality(baseResult, formData, 'user', {
      regenerateText: regenerate,
    });

    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(out.improved).toBe(true);
    expect(out.scheduledAllowed).toBe(true);
    expect(out.result.postText).toBe('B'.repeat(80));
  });

  it('blocks schedule when still below min after fixes', async () => {
    vi.mocked(scorePostContent)
      .mockResolvedValueOnce(mockScore(50))
      .mockResolvedValueOnce(mockScore(60))
      .mockResolvedValueOnce(mockScore(62));

    const regenerate = vi.fn().mockResolvedValue('C'.repeat(80));

    const out = await ensureCalendarSlotQuality(baseResult, formData, 'user', {
      regenerateText: regenerate,
      maxAttempts: 2,
    });

    expect(out.scheduledAllowed).toBe(false);
    expect(out.score?.overall).toBeLessThan(CALENDAR_SLOT_MIN_SCORE);
  });
});
