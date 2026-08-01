import { beforeEach, describe, expect, it } from 'vitest';
import { useGenerationStore } from '../stores/generationStore';
import type { GenerationResult } from '../types';
import { GenerationType, Platform, Tone } from '../types';

const sampleScore: NonNullable<GenerationResult['visualScore']> = {
  overall: 78,
  thumbStop: 80,
  brandFit: 75,
  textLegibility: 70,
  platformFit: 80,
  contentMatch: 82,
  subjectAccuracy: 76,
  offerMatch: 90,
  audienceMatch: 70,
  feedback: ['ok'],
  badge: 'green',
};

function baseResult(overrides: Partial<GenerationResult> = {}): GenerationResult {
  return {
    id: 'test-result',
    type: GenerationType.PostWithImage,
    platform: Platform.Instagram,
    postText: 'Hello',
    hashtags: [],
    adHeadline: null,
    callToAction: null,
    imageUrl: 'https://cdn.example/current.jpg',
    visualScore: sampleScore,
    imageHistory: [],
    metadata: {
      tone: Tone.Professional,
      audience: 'test',
      prompt: 'test prompt',
    },
    ...overrides,
  } as GenerationResult;
}

describe('generationStore image history / visual score', () => {
  beforeEach(() => {
    useGenerationStore.setState({
      result: baseResult(),
      isLoading: false,
      error: null,
    });
  });

  it('updateResultImage preserves visualScore when opts omit it', () => {
    useGenerationStore.getState().updateResultImage('https://cdn.example/edited.jpg');
    const result = useGenerationStore.getState().result;
    expect(result?.imageUrl).toBe('https://cdn.example/edited.jpg');
    expect(result?.visualScore?.overall).toBe(78);
    expect(result?.imageHistory).toEqual(['https://cdn.example/current.jpg']);
  });

  it('updateResultImage can clear visualScore with null', () => {
    useGenerationStore.getState().updateResultImage('https://cdn.example/edited.jpg', {
      visualScore: null,
    });
    expect(useGenerationStore.getState().result?.visualScore).toBeUndefined();
  });

  it('updateResultImage sets a new visualScore when provided', () => {
    const next = { ...sampleScore, overall: 55, badge: 'yellow' as const };
    useGenerationStore.getState().updateResultImage('https://cdn.example/new.jpg', {
      visualScore: next,
    });
    expect(useGenerationStore.getState().result?.visualScore?.overall).toBe(55);
  });

  it('restoreResultImage swaps URL without clearing score and without duplicating history', () => {
    useGenerationStore.setState({
      result: baseResult({
        imageUrl: 'https://cdn.example/v2.jpg',
        imageHistory: ['https://cdn.example/v1.jpg'],
        visualScore: sampleScore,
      }),
    });

    useGenerationStore.getState().restoreResultImage('https://cdn.example/v1.jpg');
    const result = useGenerationStore.getState().result;

    expect(result?.imageUrl).toBe('https://cdn.example/v1.jpg');
    expect(result?.visualScore?.overall).toBe(78);
    expect(result?.imageHistory).toEqual(['https://cdn.example/v2.jpg']);
  });

  it('restoreResultImage is a no-op for the current URL', () => {
    useGenerationStore.getState().restoreResultImage('https://cdn.example/current.jpg');
    const result = useGenerationStore.getState().result;
    expect(result?.imageUrl).toBe('https://cdn.example/current.jpg');
    expect(result?.imageHistory).toEqual([]);
  });

  it('caps imageHistory at 10 entries', () => {
    const history = Array.from({ length: 10 }, (_, i) => `https://cdn.example/h${i}.jpg`);
    useGenerationStore.setState({
      result: baseResult({ imageHistory: history }),
    });
    useGenerationStore.getState().updateResultImage('https://cdn.example/newest.jpg', {
      visualScore: sampleScore,
    });
    const nextHistory = useGenerationStore.getState().result?.imageHistory || [];
    expect(nextHistory).toHaveLength(10);
    expect(nextHistory[0]).toBe('https://cdn.example/current.jpg');
  });
});
