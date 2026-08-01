import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Platform } from '../types';

const callApi = vi.fn();
const generateImages = vi.fn();

vi.mock('../services/apiClient', () => ({
  callApi: (...args: unknown[]) => callApi(...args),
}));

vi.mock('../services/mediaService', () => ({
  generateImages: (...args: unknown[]) => generateImages(...args),
}));

describe('visualQualityService', () => {
  beforeEach(() => {
    callApi.mockReset();
    generateImages.mockReset();
  });

  it('zwraca score unavailable marker, gdy scoring endpoint jest niedostępny', async () => {
    callApi.mockRejectedValueOnce(new Error('Visual scoring unavailable'));

    const { ensureImageQuality } = await import('../services/visualQualityService');

    const result = await ensureImageQuality({
      imageResponse: {
        publicUrls: ['https://cdn.example.com/image.jpg'],
        generatedImages: [{ image: { mimeType: 'image/jpeg', imageBytes: 'abc' } }],
      },
      prompt: 'prompt',
      postText: 'Post about a product benefit',
      brief: {
        scene: 'Scene',
        subjects: ['subject'],
        mood: 'mood',
        brandHexColors: ['#000000'],
        textOnImage: 'none',
        avoid: ['noise'],
        fluxPrompt: 'flux',
        contentIntent: {
          primarySubject: 'product',
          requiredObjects: ['product'],
          audience: 'customers',
          coreBenefit: 'clear product benefit',
          emotion: 'interest',
          forbiddenInterpretations: ['unrelated product'],
        },
      },
      platform: Platform.Instagram,
      aspectRatio: '1:1',
      quality: 'standard',
      userId: 'u1',
    });

    expect((result as { visualScore?: { overall: number } }).visualScore?.overall).toBe(0);
  });

  it('zwraca oryginalny obraz z niskim visualScore, gdy regen się nie powiedzie', async () => {
    callApi.mockResolvedValueOnce({
      success: true,
      score: {
        overall: 40,
        thumbStop: 40,
        brandFit: 45,
        textLegibility: 35,
        platformFit: 42,
        feedback: ['Low contrast'],
        badge: 'red',
      },
    });
    generateImages.mockRejectedValueOnce(new Error('regen failed'));

    const { ensureImageQuality } = await import('../services/visualQualityService');

    const result = await ensureImageQuality({
      imageResponse: {
        publicUrls: ['https://cdn.example.com/original.jpg'],
        generatedImages: [{ image: { mimeType: 'image/jpeg', imageBytes: 'old' } }],
      },
      prompt: 'prompt',
      postText: 'Post about a product benefit',
      brief: {
        scene: 'Scene',
        subjects: [],
        mood: 'mood',
        brandHexColors: [],
        textOnImage: 'none',
        avoid: [],
        fluxPrompt: 'flux',
        contentIntent: {
          primarySubject: 'product',
          requiredObjects: ['product'],
          audience: 'customers',
          coreBenefit: 'clear product benefit',
          emotion: 'interest',
          forbiddenInterpretations: ['unrelated product'],
        },
      },
      platform: Platform.Instagram,
      aspectRatio: '1:1',
      quality: 'standard',
      userId: 'u1',
    });

    expect((result as { publicUrls?: string[] }).publicUrls?.[0]).toBe('https://cdn.example.com/original.jpg');
    expect((result as { visualScore?: { overall: number } }).visualScore?.overall).toBe(40);
  });

  it('zwraca zregenerowany obraz, gdy regen ma wyższy visualScore', async () => {
    callApi.mockResolvedValueOnce({
      success: true,
      score: {
        overall: 50,
        thumbStop: 50,
        brandFit: 50,
        textLegibility: 50,
        platformFit: 50,
        feedback: ['Boost contrast'],
        improvedPromptHint: 'Use stronger focal point',
        badge: 'yellow',
      },
    }).mockResolvedValueOnce({
      success: true,
      score: {
        overall: 60,
        thumbStop: 60,
        brandFit: 60,
        textLegibility: 60,
        platformFit: 60,
        feedback: ['Better contrast'],
        badge: 'yellow',
      },
    });
    generateImages.mockResolvedValueOnce({
      publicUrls: ['https://cdn.example.com/regen.jpg'],
      generatedImages: [{ image: { mimeType: 'image/jpeg', imageBytes: 'new' } }],
    });

    const { ensureImageQuality } = await import('../services/visualQualityService');

    const result = await ensureImageQuality({
      imageResponse: {
        publicUrls: ['https://cdn.example.com/original.jpg'],
        generatedImages: [{ image: { mimeType: 'image/jpeg', imageBytes: 'old' } }],
      },
      prompt: 'prompt',
      postText: 'Post about a product benefit',
      brief: {
        scene: 'Scene',
        subjects: [],
        mood: 'mood',
        brandHexColors: [],
        textOnImage: 'none',
        avoid: [],
        fluxPrompt: 'flux',
        contentIntent: {
          primarySubject: 'product',
          requiredObjects: ['product'],
          audience: 'customers',
          coreBenefit: 'clear product benefit',
          emotion: 'interest',
          forbiddenInterpretations: ['unrelated product'],
        },
      },
      platform: Platform.Instagram,
      aspectRatio: '1:1',
      quality: 'standard',
      userId: 'u1',
    });

    expect((result as { publicUrls?: string[] }).publicUrls?.[0]).toBe('https://cdn.example.com/regen.jpg');
    expect((result as { visualScore?: { overall: number } }).visualScore?.overall).toBe(60);
  });
});
