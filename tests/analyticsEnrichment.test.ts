import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hasLiveMetrics,
  enrichHistoryWithLiveMetrics,
  aggregateAnalyticsKpis,
} from '../services/analyticsService';
import type { CampaignHistoryItem } from '../types';
import { GenerationType, Platform, Tone, ContentType, VisualStyle, ContentLanguage } from '../types';
import type { SocialPost } from '../types/socialPublishing';

function makeDraft(
  partial: Partial<Omit<CampaignHistoryItem, 'result'>> & { result?: Partial<CampaignHistoryItem['result']> } & { id: string; topic: string },
): CampaignHistoryItem {
  return {
    ...partial,
    timestamp: Date.now(),
    teamId: null,
    formData: {
      topic: partial.topic,
      platform: Platform.Facebook,
      generationType: GenerationType.PostWithImage,
      tone: Tone.Professional,
      audience: 'test',
      keywords: '',
      contentType: ContentType.Post,
      visualStyle: VisualStyle.Photorealistic,
      contentLanguage: ContentLanguage.Polish,
      aspectRatio: '1:1',
      ...(partial.formData || {}),
    } as CampaignHistoryItem['formData'],
    result: {
      id: partial.id,
      type: GenerationType.PostWithImage,
      platform: Platform.Facebook,
      postText: partial.topic,
      hashtags: [],
      imageUrl: null,
      videoUrl: null,
      adHeadline: null,
      callToAction: null,
      metadata: {
        tone: Tone.Professional,
        audience: 'test',
        prompt: partial.topic,
        ...(partial.result?.metadata || {}),
      },
      approvalStatus: 'draft',
      comments: [],
      authorId: partial.authorId ?? 'u1',
      ...(partial.result || {}),
    } as CampaignHistoryItem['result'],
    authorName: partial.authorName ?? 'Test Author',
    status: partial.status ?? 'draft',
    comments: partial.comments ?? [],
    authorId: partial.authorId ?? 'u1',
  };
}

describe('hasLiveMetrics', () => {
  it('false gdy brak pól', () => {
    expect(hasLiveMetrics(undefined)).toBe(false);
    expect(hasLiveMetrics({})).toBe(false);
  });

  it('true gdy jest zero (realne zero z API)', () => {
    expect(hasLiveMetrics({ likes: 0 })).toBe(true);
  });

  it('true gdy jest reach', () => {
    expect(hasLiveMetrics({ reach: 120 })).toBe(true);
  });
});

describe('enrichHistoryWithLiveMetrics', () => {
  it('bez kont → estimated zera', () => {
    const drafts = [makeDraft({ id: 'd1', topic: 'Hello world post' })];
    const { items, liveMatched, estimatedCount } = enrichHistoryWithLiveMetrics(drafts, []);
    expect(liveMatched).toBe(0);
    expect(estimatedCount).toBe(1);
    expect(items[0].performance?.metricsSource).toBe('estimated');
    expect(items[0].performance?.likes).toBe(0);
  });

  it('match bez pól metryk (LI/TT) → estimated, nie live', () => {
    const drafts = [makeDraft({ id: 'd1', topic: 'LinkedIn update about AI' })];
    const social: SocialPost[] = [
      {
        id: 's1',
        platformPostId: 's1',
        content: 'LinkedIn update about AI tools',
        publishedAt: new Date().toISOString(),
        platform: 'linkedin',
        metrics: {},
      },
    ];
    const { items, liveMatched, estimatedCount, matchedSocialIds } = enrichHistoryWithLiveMetrics(
      drafts,
      social
    );
    expect(matchedSocialIds).toEqual(['s1']);
    expect(liveMatched).toBe(0);
    expect(estimatedCount).toBe(1);
    expect(items[0].performance?.metricsSource).toBe('estimated');
  });

  it('match z metrykami → live', () => {
    const drafts = [
      makeDraft({
        id: 'd1',
        topic: 'Launch day',
        result: {
          metadata: { published_url: 'https://facebook.com/123', tone: Tone.Professional, audience: 'x', prompt: 'y' },
        },
      }),
    ];
    const social: SocialPost[] = [
      {
        id: 's1',
        platformPostId: '123',
        content: 'Launch day',
        url: 'https://facebook.com/123',
        publishedAt: new Date().toISOString(),
        platform: 'facebook',
        metrics: { likes: 10, comments: 2, shares: 1, reach: 500 },
      },
    ];
    const { items, liveMatched } = enrichHistoryWithLiveMetrics(drafts, social);
    expect(liveMatched).toBe(1);
    expect(items[0].performance?.metricsSource).toBe('live');
    expect(items[0].performance?.reach).toBe(500);
    expect(items[0].performance?.likes).toBe(10);
  });
});

describe('aggregateAnalyticsKpis', () => {
  it('nie podwaja matched draft + social', () => {
    const drafts = [
      makeDraft({
        id: 'd1',
        topic: 'A',
        performance: { reach: 100, likes: 5, comments: 1, shares: 0, metricsSource: 'live' },
      }),
      makeDraft({
        id: 'd2',
        topic: 'B',
        performance: { reach: 0, likes: 0, comments: 0, shares: 0, metricsSource: 'estimated' },
      }),
    ];
    const social: SocialPost[] = [
      {
        id: 's1',
        platformPostId: 's1',
        content: 'A',
        publishedAt: new Date().toISOString(),
        metrics: { likes: 5, reach: 100 },
      },
      {
        id: 's2',
        platformPostId: 's2',
        content: 'Other',
        publishedAt: new Date().toISOString(),
        metrics: { likes: 3, reach: 50 },
      },
      {
        id: 's3',
        platformPostId: 's3',
        content: 'No metrics',
        publishedAt: new Date().toISOString(),
        metrics: {},
      },
    ];

    const kpi = aggregateAnalyticsKpis(drafts, social, ['s1']);
    expect(kpi.reach).toBe(150); // 100 from draft + 50 from unmatched s2
    expect(kpi.likes).toBe(8);
    expect(kpi.liveCount).toBe(2);
    expect(kpi.estimatedCount).toBe(1);
    expect(kpi.noDataCount).toBe(1);
  });
});

describe('analytics analysis cache', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    });
  });

  it('zapisuje i odczytuje cache', async () => {
    const {
      saveAnalyticsCache,
      loadAnalyticsCache,
      clearAnalyticsCache,
    } = await import('../services/analyticsService');

    saveAnalyticsCache({
      userId: 'u1',
      analyzedAt: 123,
      insights: [{ id: '1', type: 'positive', text: 'ok' }],
      optimalTimes: [],
      strategySuggestions: [{ date: '2026-07-21', platform: 'Facebook', topic: 'T', reason: 'R' }],
      unavailable: false,
    });

    const loaded = loadAnalyticsCache('u1');
    expect(loaded?.insights[0].text).toBe('ok');
    expect(loaded?.strategySuggestions).toHaveLength(1);
    expect(loadAnalyticsCache('other')).toBeNull();

    clearAnalyticsCache('u1');
    expect(loadAnalyticsCache('u1')).toBeNull();
  });
});

describe('fetchAIAnalysis fallback', () => {
  it('przy błędzie Gemini zwraca unavailable bez fake tipów', async () => {
    vi.resetModules();
    vi.doMock('../services/apiClient', () => ({
      generateJson: vi.fn().mockRejectedValue(new Error('gemini down')),
    }));

    const { fetchAIAnalysis } = await import('../services/analyticsService');
    const result = await fetchAIAnalysis([], 'u1', []);
    expect(result.unavailable).toBe(true);
    expect(result.insights).toEqual([]);
    expect(result.optimalTimes).toEqual([]);
  });
});
