import { describe, expect, it } from 'vitest';
import { Platform } from '../types';
import type { TrackedCompetitor } from '../services/competitorService';
import {
  buildCompetitorPromptBlock,
  buildLearnedFromCompetitors,
  mergeCompetitorIntelIntoProfile,
} from '../utils/competitorBrandVoice';

const mockCompetitor: TrackedCompetitor = {
  id: '1',
  handle: 'rival',
  platform: Platform.Instagram,
  niche: 'fitness',
  addedAt: new Date().toISOString(),
  analysis: {
    topHashtags: ['fit', 'gym'],
    hashtagStrategy: 'Mix niche and broad',
    hashtagPatterns: [],
    hashtagRecommendations: ['Use #fitlife on reels'],
    bestPostingTimes: ['Mon 18:00'],
    worstPostingTimes: [],
    timingGaps: ['Sunday morning — low activity'],
    timingRecommendation: 'Post Tue-Thu evenings',
    contentThemes: ['workouts', 'nutrition'],
    strengths: ['Strong video hooks'],
    weaknesses: ['Weak CTAs'],
    opportunities: ['Meal prep content gap'],
    contentGaps: ['Beginner-friendly tutorials'],
    summary: 'High-energy fitness reels with motivational tone',
  },
};

describe('competitorBrandVoice', () => {
  it('builds learned payload and intel from competitors', () => {
    const { learned, intel } = buildLearnedFromCompetitors([mockCompetitor], {
      recommendation: 'Focus on beginners',
      timingGaps: ['Friday 7am'],
      opportunities: ['Q&A series'],
    });

    expect(intel.trackedHandles).toContain('@rival');
    expect(intel.exploitGaps.length).toBeGreaterThan(0);
    expect(learned.examplesToFollow).toBeDefined();
    expect(Array.isArray(learned.successPatterns)).toBe(true);
  });

  it('merges intel into profile preserving logo', () => {
    const merged = mergeCompetitorIntelIntoProfile(
      {
        id: 'p1',
        userId: 'u1',
        name: 'Moja marka',
        teamId: null,
        settings: {
          brandName: 'FitCo',
          description: 'Treningi online',
          keywords: 'fitness',
          avoid: '',
          logoUrl: 'https://logo.png',
        },
      },
      { keywords: 'gym, fit' },
      {
        summary: 'Rival uses reels',
        differentiationAngles: ['Beginner tutorials'],
        avoidCompetitorPatterns: ['Copy their hooks'],
        exploitGaps: ['Meal prep'],
        hashtagHints: ['#fitlife'],
        timingHints: ['Tue 18:00'],
        trackedHandles: ['@rival'],
        lastSyncedAt: new Date().toISOString(),
      }
    );

    expect(merged.settings.logoUrl).toBe('https://logo.png');
    expect(merged.settings.competitorIntel?.summary).toContain('Rival');
    expect(merged.settings.examplesToFollow).toContain('Beginner tutorials');
  });

  it('builds prompt block for content generation', () => {
    const block = buildCompetitorPromptBlock({
      brandName: 'X',
      description: 'Y',
      keywords: 'z',
      avoid: '',
      competitorIntel: {
        summary: 'Competitors focus on advanced athletes',
        differentiationAngles: ['Target beginners'],
        avoidCompetitorPatterns: ['Aggressive sales tone'],
        exploitGaps: ['Meal prep'],
        hashtagHints: ['#fitlife'],
        timingHints: ['Sun AM gap'],
        trackedHandles: ['@a'],
        lastSyncedAt: new Date().toISOString(),
      },
    });
    expect(block).toContain('COMPETITIVE INTELLIGENCE');
    expect(block).toContain('DIFFERENTIATE');
  });
});
