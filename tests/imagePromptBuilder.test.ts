import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Platform, VisualStyle } from '../types';
import {
  resolveUseMascot,
  buildImageGenerationInput,
} from '../services/imagePromptBuilder';
import type { BrandVoiceData } from '../types';

const generateJson = vi.fn();
const generateImages = vi.fn();

vi.mock('../services/apiClient', () => ({
  generateJson: (...args: unknown[]) => generateJson(...args),
}));

vi.mock('../services/mediaService', () => ({
  generateImages: (...args: unknown[]) => generateImages(...args),
}));

const baseBrandVoice: BrandVoiceData = {
  brandName: 'Test Brand',
  description: 'A test brand',
  keywords: 'test, brand',
  avoid: 'buzzwords',
  visualStyle: 'cinematic, moody',
  brandColors: ['#FF5733', '#33FF57'],
  mascotName: 'Mascot Max',
  mascotDescription: 'A friendly robot mascot',
  mascotUrl: 'https://example.com/mascot.png',
};

const baseFormData = {
  platform: Platform.Instagram,
  visualStyle: VisualStyle.Photorealistic,
  aspectRatio: '1:1' as const,
  imageQuality: undefined as 'standard' | 'typography' | undefined,
  useMascot: undefined as boolean | 'auto' | undefined,
  audience: '',
};

function mockVisualBrief() {
  generateJson.mockResolvedValue({
    scene: 'A cozy café table',
    subjects: ['coffee cup', 'notebook'],
    mood: 'warm and inviting',
    brandHexColors: baseBrandVoice.brandColors,
    textOnImage: 'none',
    camera: '35mm f/1.8',
    avoid: ['text', 'logos'],
    fluxPrompt:
      'Photorealistic close-up of a coffee cup on a wooden table, warm morning light, shallow depth of field',
  });
}

function mockGenerateImages() {
  generateImages.mockResolvedValue({
    publicUrls: ['https://example.com/generated.png'],
    generatedImages: [],
  });
}

describe('resolveUseMascot', () => {
  const postText = 'Mascot Max pokazuje, jak działa nasz produkt.';

  it('returns true when useMascot is true and mascot is defined', () => {
    expect(resolveUseMascot(true, baseBrandVoice, postText)).toBe(true);
  });

  it('returns false when useMascot is true but there is no mascot description', () => {
    const brandWithoutMascot: BrandVoiceData = { ...baseBrandVoice, mascotDescription: undefined };
    expect(resolveUseMascot(true, brandWithoutMascot, postText)).toBe(false);
  });

  it('returns false when useMascot is false', () => {
    expect(resolveUseMascot(false, baseBrandVoice, postText)).toBe(false);
  });

  it('returns false when useMascot is undefined', () => {
    expect(resolveUseMascot(undefined, baseBrandVoice, postText)).toBe(false);
  });

  it('returns true for auto when mascot name appears in post text', () => {
    expect(resolveUseMascot('auto', baseBrandVoice, postText)).toBe(true);
  });

  it('returns false for auto when mascot name does not appear in post text', () => {
    expect(resolveUseMascot('auto', baseBrandVoice, 'Post bez maskotki.')).toBe(false);
  });

  it('uses generic fallback name for auto detection', () => {
    const brandWithoutName: BrandVoiceData = { ...baseBrandVoice, mascotName: undefined };
    expect(resolveUseMascot('auto', brandWithoutName, 'Nasza maskotka jest super.')).toBe(true);
  });
});

describe('buildImageGenerationInput', () => {
  beforeEach(() => {
    generateJson.mockReset();
    generateImages.mockReset();
    mockVisualBrief();
    mockGenerateImages();
  });

  it('composes image style with brand colors and visual style', async () => {
    const result = await buildImageGenerationInput({
      postText: 'Post o kawie',
      formData: { ...baseFormData },
      brandVoice: baseBrandVoice,
      userId: 'user-1',
    });

    const briefCall = generateJson.mock.calls[0][0];
    expect(briefCall.contents).toContain('cinematic, moody');
    expect(briefCall.contents).toContain('Photorealistic');
    expect(briefCall.contents).toContain('BRAND HEX COLORS: #FF5733, #33FF57');

    expect(result.imagePrompt).toContain('Photorealistic');
    expect(result.imagePrompt).toContain('hex #FF5733');
    expect(result.imagePrompt).toContain('hex #33FF57');
    expect(result.imageQuality).toBe('standard');
    expect(result.aspectRatio).toBe('1:1');
  });

  it('includes mascot prompt and reference image when mascot is enabled', async () => {
    const result = await buildImageGenerationInput({
      postText: 'Mascot Max pokazuje nowości.',
      formData: { ...baseFormData, useMascot: 'auto' },
      brandVoice: baseBrandVoice,
      userId: 'user-1',
    });

    expect(result.imagePrompt).toContain('FEATURED MASCOT');
    expect(result.imagePrompt).toContain('Mascot Max');
    expect(result.referenceImages).toContain('https://example.com/mascot.png');
  });

  it('omits mascot when useMascot is false', async () => {
    const result = await buildImageGenerationInput({
      postText: 'Mascot Max pokazuje nowości.',
      formData: { ...baseFormData, useMascot: false },
      brandVoice: baseBrandVoice,
      userId: 'user-1',
    });

    expect(result.imagePrompt).not.toContain('FEATURED MASCOT');
    expect(result.referenceImages).toHaveLength(0);
  });

  it('uses typography quality for LinkedIn', async () => {
    const result = await buildImageGenerationInput({
      postText: 'Post biznesowy',
      formData: { ...baseFormData, platform: Platform.LinkedIn },
      brandVoice: baseBrandVoice,
      userId: 'user-1',
    });

    expect(result.imageQuality).toBe('typography');
  });

  it('passes post-mortem image hint into the prompt', async () => {
    const result = await buildImageGenerationInput({
      postText: 'Post z hintem',
      formData: { ...baseFormData },
      brandVoice: baseBrandVoice,
      userId: 'user-1',
      postMortemImageHint: 'Use neon accents',
    });

    expect(result.imagePrompt).toContain('PROVEN STYLE: Use neon accents');
  });
});
