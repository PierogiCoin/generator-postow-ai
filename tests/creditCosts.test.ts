import { describe, expect, it } from 'vitest';
import { estimateGenerationCredits, CREDIT_COSTS } from '../config/creditCosts';
import { FormData, GenerationMode, GenerationType, Platform, Tone, ContentType, VisualStyle, AIModel, ContentLanguage } from '../types';

const baseFormData = (): FormData => ({
  topic: 'test',
  audience: 'testers',
  tone: Tone.Professional,
  platform: Platform.LinkedIn,
  contentType: ContentType.Post,
  visualStyle: VisualStyle.Minimalist,
  generationType: GenerationType.Idea,
  model: AIModel.Flash,
  contentLanguage: ContentLanguage.Polish,
});

describe('estimateGenerationCredits', () => {
  it('szacuje post z obrazem wyżej niż sam tekst', () => {
    const textOnly = estimateGenerationCredits(baseFormData());
    const withImage = estimateGenerationCredits({
      ...baseFormData(),
      generationType: GenerationType.PostWithImage,
    });
    expect(withImage).toBeGreaterThan(textOnly);
    expect(withImage - textOnly).toBe(CREDIT_COSTS.generateImage);
  });

  it('liczy warianty multi jako 3× generatePost', () => {
    const cost = estimateGenerationCredits({
      ...baseFormData(),
      generationMode: GenerationMode.MultiVariant,
    });
    expect(cost).toBe(CREDIT_COSTS.generatePost * 3);
  });

  it('wideo kosztuje generateVideo + generatePost', () => {
    const cost = estimateGenerationCredits({
      ...baseFormData(),
      generationType: GenerationType.Video,
    });
    expect(cost).toBe(CREDIT_COSTS.generateVideo + CREDIT_COSTS.generatePost);
  });
});
