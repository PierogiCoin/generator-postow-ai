import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildVisualBrief } from '../services/visualBriefService';
import { Platform } from '../types';
import type { BrandVoiceData } from '../types';

const generateJson = vi.fn();

vi.mock('../services/apiClient', () => ({
  generateJson: (...args: unknown[]) => generateJson(...args),
}));

const baseBrandVoice: BrandVoiceData = {
  brandName: 'Test Brand',
  description: 'Bold, modern brand for young professionals',
  keywords: 'minimal, premium, bold',
  niche: 'test',
  visualStyle: 'cinematic, high contrast',
  avoid: 'stock photos, tiny text',
};

const baseParams = {
  postText: 'Nowa oferta kawy w naszym warszawskim kawiarni! Sprawdźcie smak jesieni.',
  platform: Platform.Instagram,
  imageStyle: 'photorealistic',
  brandVoice: baseBrandVoice,
  brandColors: ['#FF5733', '#33FF57'],
  userId: 'user-1',
};

describe('buildVisualBrief', () => {
  beforeEach(() => {
    generateJson.mockReset();
  });

  it('normalizes a successful Gemini brief and merges brand colors', async () => {
    generateJson.mockResolvedValue({
      scene: 'Cozy autumn café table',
      subjects: ['coffee cup', 'fall leaves'],
      mood: 'warm and inviting',
      brandHexColors: [],
      textOnImage: 'none',
      camera: '35mm f/1.8',
      avoid: ['text', 'logos'],
      fluxPrompt: 'Photorealistic close-up of a coffee cup, warm morning light',
      contentIntent: {
        primarySubject: 'coffee cup',
        requiredObjects: ['coffee cup', 'wooden table'],
        audience: 'coffee lovers',
        coreBenefit: 'new seasonal flavor',
        offer: '',
        location: 'Warsaw café',
        emotion: 'cozy',
        action: '',
        forbiddenInterpretations: ['unsupported claims', 'unrelated products'],
      },
    });

    const brief = await buildVisualBrief(baseParams);

    expect(brief.scene).toBe('Cozy autumn café table');
    expect(brief.mood).toBe('warm and inviting');
    expect(brief.brandHexColors).toEqual(['#FF5733', '#33FF57']);
    expect(brief.contentIntent.requiredObjects).toContain('coffee cup');
    expect(brief.contentIntent.forbiddenInterpretations).toContain('unsupported claims');
    expect(brief.fluxPrompt).toBe(
      'Photorealistic close-up of a coffee cup, warm morning light'
    );
  });

  it('falls back to a safe brief when generateJson fails', async () => {
    generateJson.mockRejectedValue(new Error('Gemini rate limit'));

    const brief = await buildVisualBrief(baseParams);

    expect(brief.scene).toBe(baseParams.postText.slice(0, 160));
    expect(brief.brandHexColors).toEqual(['#FF5733', '#33FF57']);
    expect(brief.textOnImage).toBe('none');
    expect(brief.fluxPrompt).toContain('Instagram');
    expect(brief.fluxPrompt).toContain('Brand identity:');
    expect(brief.contentIntent.forbiddenInterpretations).toContain('unsupported claims');
  });

  it('merges industry must-show into required objects', async () => {
    generateJson.mockResolvedValue({
      scene: 'Café',
      subjects: ['coffee'],
      mood: 'warm',
      textOnImage: 'none',
      contentIntent: {
        requiredObjects: ['coffee'],
        forbiddenInterpretations: [],
      },
    });

    const brief = await buildVisualBrief({
      ...baseParams,
      industryMustShow: ['logo on cup', 'pastry'],
    });

    expect(brief.contentIntent.requiredObjects).toContain('logo on cup');
    expect(brief.contentIntent.requiredObjects).toContain('pastry');
    expect(brief.contentIntent.requiredObjects).toContain('coffee');
  });
});
