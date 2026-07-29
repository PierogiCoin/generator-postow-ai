import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClientError, callApi } from '../services/apiClient';
import { ContentScore } from '../shared/contentScore';
import {
  buildAntiSlopBlock,
  findBannedPhrases,
  PL_BANNED_PHRASES,
} from '../shared/plAntiSlop';
import {
  buildAntiSlopBlock as buildFromPromptReexport,
} from '../prompts/plAntiSlop';

describe('shared ContentScore / plAntiSlop', () => {
  it('eksportuje spójny ContentScore shape', () => {
    const score: ContentScore = {
      overall: 80,
      engagement: { score: 80, level: 'high', feedback: [] },
      seo: { score: 70, level: 'medium', feedback: [] },
      platformFit: { score: 90, level: 'excellent', feedback: [] },
      suggestions: [],
      badge: 'green',
    };
    expect(score.badge).toBe('green');
  });

  it('shared plAntiSlop == prompts re-export', () => {
    expect(buildAntiSlopBlock()).toBe(buildFromPromptReexport());
    expect(PL_BANNED_PHRASES.length).toBeGreaterThan(5);
    expect(findBannedPhrases('Warto pamiętać o brandzie')).toContain('Warto pamiętać');
  });
});

describe('ApiClientError / callApi typing', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('rzuca ApiClientError z code/status przy 402', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Brak kredytów', code: 'insufficient_credits' }), {
        status: 402,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(callApi('score-content', { content: 'x' }, 'u1')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 402,
      code: 'insufficient_credits',
    });
  });

  it('zwraca typowany JSON', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ success: true, value: 42 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const data = await callApi<{ success: boolean; value: number }>('ping', {});
    expect(data.success).toBe(true);
    expect(data.value).toBe(42);
  });

  it('ApiClientError jest Error z polami', () => {
    const err = new ApiClientError('fail', { status: 500, code: 'x' });
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(500);
    expect(err.code).toBe('x');
  });
});
