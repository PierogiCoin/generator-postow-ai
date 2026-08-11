import { describe, expect, it, vi } from 'vitest';
import { composeTextPrompt, composeImagePrompt } from '@/services/promptBuilders';
import { Platform, Tone, GenerationType, ContentType, ContentLanguage, VisualStyle, AIModel, CopywritingFramework } from '@/types';

import type { FormData, BrandVoiceData } from '@/types';

vi.mock('@/services/brandMemoryService', () => ({
  retrieveBrandMemoryContext: vi.fn().mockResolvedValue({
    chunks: [],
    promptBlock: '',
    count: 0,
  }),
}));

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    topic: '<p>Test post</p>',
    audience: 'restauracja włoska',
    tone: Tone.Casual,
    platform: Platform.Instagram,
    contentType: ContentType.Post,
    visualStyle: VisualStyle.PlatformSpecific,
    generationType: GenerationType.PostWithImage,
    model: AIModel.Flash,
    contentLanguage: ContentLanguage.Polish,
    ...overrides,
  };
}

describe('composeTextPrompt', () => {
  it('includes anti-slop, platform and user topic', async () => {
    const { contents, config } = await composeTextPrompt({
      formData: makeFormData(),
      brandVoice: null,
      userId: 'u-1',
    });

    expect(config.systemInstruction).toContain('anti-slop');
    expect(config.systemInstruction).toContain('INSTAGRAM STYLE GUIDELINES');
    expect(contents).toContain('Test post');
    expect(contents).toContain('Instagram');
  });

  it('injects industry context for matched niche', async () => {
    const { config } = await composeTextPrompt({
      formData: makeFormData({ audience: 'B2B SaaS', platform: Platform.LinkedIn }),
      brandVoice: null,
      userId: 'u-1',
    });

    expect(config.systemInstruction).toContain('B2B SaaS');
    expect(config.systemInstruction).toContain('polski B2B SaaS');
  });

  it('injects copywriting framework when selected', async () => {
    const { config } = await composeTextPrompt({
      formData: makeFormData({ copywritingFramework: CopywritingFramework.AIDA }),
      brandVoice: null,
      userId: 'u-1',
    });

    expect(config.systemInstruction).toContain('AIDA Framework');
  });

  it('softens mascot instruction when forced', async () => {
    const brandVoice: BrandVoiceData = {
      brandName: 'TestBrand',
      description: '',
      keywords: '',
      avoid: '',
      mascotName: 'Myszo',
      mascotDescription: 'Friendly mouse mascot',
      logoUrl: 'https://example.com/logo.png',
    };

    const { config } = await composeTextPrompt({
      formData: makeFormData({ useMascot: true }),
      brandVoice,
      userId: 'u-1',
    });

    expect(config.systemInstruction).toContain('Myszo');
    expect(config.systemInstruction).not.toContain('YOU MUST INCLUDE');
    expect(config.systemInstruction).toContain('organic');
  });

  it('does not inject logo URL into text prompt', async () => {
    const brandVoice: BrandVoiceData = {
      brandName: 'TestBrand',
      description: '',
      keywords: '',
      avoid: '',
      logoUrl: 'https://example.com/logo.png',
    };

    const { config } = await composeTextPrompt({
      formData: makeFormData({ includeLogo: true }),
      brandVoice,
      userId: 'u-1',
    });

    expect(config.systemInstruction).not.toContain('leave space for the brand logo (URL:');
    expect(config.systemInstruction).toContain('post-production');
  });
});

describe('composeImagePrompt', () => {
  it('excludes logo from reference images and includes mascot reference', () => {
    const brandVoice: BrandVoiceData = {
      brandName: 'TestBrand',
      description: '',
      keywords: '',
      avoid: '',
      logoUrl: 'https://example.com/logo.png',
      mascotUrl: 'https://example.com/mascot.png',
      mascotName: 'Myszo',
      mascotDescription: 'Friendly mouse mascot',
    };

    const result = composeImagePrompt({
      postText: 'Post about summer sale',
      platform: Platform.Instagram,
      imageStyle: 'modern',
      brandVoice,
      userId: 'u-1',
      useMascot: true,
    });

    expect(result.referenceImages).not.toContain('https://example.com/logo.png');
    expect(result.referenceImages).toContain('https://example.com/mascot.png');
    expect(result.prompt).toContain('no text');
    expect(result.prompt).toContain('Myszo');
  });

  it('adds industry image prefix when available', () => {
    const result = composeImagePrompt({
      postText: 'Pyszne danie dnia',
      platform: Platform.Facebook,
      imageStyle: 'warm',
      brandVoice: null,
      userId: 'u-1',
      industryImagePromptPrefix: 'Appetizing Polish food photography',
    });

    expect(result.prompt.startsWith('Appetizing Polish food photography')).toBe(true);
  });

  it('keeps image clean of text and logos', () => {
    const result = composeImagePrompt({
      postText: 'Simple post',
      platform: Platform.LinkedIn,
      imageStyle: 'professional',
      brandVoice: null,
      userId: 'u-1',
    });

    expect(result.prompt).toMatch(/no text|no logos|watermarks/i);
  });
});
