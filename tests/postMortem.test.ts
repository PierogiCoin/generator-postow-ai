import { describe, it, expect, vi } from 'vitest';

vi.mock('../server/lib/clients.js', () => ({
  genAI: { getGenerativeModel: vi.fn() },
  supabase: { from: vi.fn() },
}));
vi.mock('../server/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { buildPostMortemSummary, buildPostMortemPrompt } from '../server/lib/postMortem';

describe('buildPostMortemSummary', () => {
  it('formatuje metryki postów do analizy', () => {
    const summary = buildPostMortemSummary([
      {
        id: '1',
        platform: 'instagram',
        content: 'Test post #marketing',
        published_at: '2024-06-15T18:30:00.000Z',
        metrics: { likes: 10, comments: 2, shares: 1, impressions: 100 },
      },
    ]);

    expect(summary).toContain('Platforma: instagram');
    expect(summary).toContain('Hashtagi: 1');
    expect(summary).toContain('Test post');
    expect(summary).toContain('ER:');
  });

  it('łączy wiele postów separatorem', () => {
    const summary = buildPostMortemSummary([
      { id: '1', platform: 'facebook', content: 'A' },
      { id: '2', platform: 'twitter', content: 'B' },
    ]);
    expect(summary).toContain('[1]');
    expect(summary).toContain('[2]');
    expect(summary.split('\n\n').length).toBeGreaterThanOrEqual(2);
  });
});

describe('buildPostMortemPrompt', () => {
  it('zawiera podsumowanie i schemat JSON', () => {
    const prompt = buildPostMortemPrompt('Post summary line');
    expect(prompt).toContain('Post summary line');
    expect(prompt).toContain('topTakeaways');
    expect(prompt).toContain('Jesteś ekspertem social media');
  });
});
