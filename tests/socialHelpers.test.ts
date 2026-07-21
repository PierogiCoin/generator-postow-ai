import { describe, it, expect } from 'vitest';
import { computeEngagementSummary, mapSocialPost } from '../server/lib/socialHelpers';

describe('computeEngagementSummary', () => {
  it('liczy engagement rate z impressions', () => {
    const summary = computeEngagementSummary({
      metrics: { likes: 50, comments: 10, shares: 5, impressions: 1000 },
    });
    expect(summary.interactions).toBe(65);
    expect(summary.engagementRate).toBeCloseTo(0.065);
  });

  it('używa views gdy brak impressions', () => {
    const summary = computeEngagementSummary({
      metrics: { likes: 10, views: 200 },
    });
    expect(summary.impressions).toBe(200);
    expect(summary.engagementRate).toBeCloseTo(0.05);
  });

  it('zwraca 0 ER gdy brak zasięgu', () => {
    const summary = computeEngagementSummary({ metrics: { likes: 5 } });
    expect(summary.engagementRate).toBe(0);
  });
});

describe('mapSocialPost', () => {
  it('mapuje post API na format frontendu', () => {
    const mapped = mapSocialPost(
      {
        id: 'post-1',
        content: 'Hello world',
        publishedAt: '2024-01-01T12:00:00Z',
        url: 'https://example.com/p/1',
        likes: 3,
        comments: 1,
      },
      'linkedin',
      'conn-99'
    );

    expect(mapped.platform).toBe('linkedin');
    expect(mapped.connectionId).toBe('conn-99');
    expect(mapped.content).toBe('Hello world');
    expect(mapped.metrics.likes).toBe(3);
    expect(mapped.metrics.comments).toBe(1);
    expect(mapped.metrics.reach).toBeUndefined();
  });

  it('nie wstawia zer dla brakujących metryk (LI/TT)', () => {
    const mapped = mapSocialPost(
      {
        id: 'post-2',
        content: 'No metrics',
        publishedAt: '2024-01-01T12:00:00Z',
      },
      'tiktok',
      'conn-1'
    );

    expect(mapped.metrics.likes).toBeUndefined();
    expect(mapped.metrics.comments).toBeUndefined();
    expect(mapped.metrics.impressions).toBeUndefined();
  });
});
