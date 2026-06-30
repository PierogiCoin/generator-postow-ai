import { describe, it, expect, vi } from 'vitest';

vi.mock('../server/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  logValidationError: vi.fn(),
}));

import {
  textGenerationSchema,
  imageGenerationSchema,
  videoGenerationSchema,
  multiPlatformSchema,
} from '../server/middleware/validate';

describe('textGenerationSchema', () => {
  it('akceptuje minimalny poprawny payload', () => {
    const result = textGenerationSchema.safeParse({
      contents: 'Napisz post o kawie',
    });
    expect(result.success).toBe(true);
  });

  it('odrzuca pusty contents', () => {
    const result = textGenerationSchema.safeParse({ contents: '' });
    expect(result.success).toBe(false);
  });

  it('odrzuca temperature poza zakresem', () => {
    const result = textGenerationSchema.safeParse({
      contents: 'test',
      config: { temperature: 3 },
    });
    expect(result.success).toBe(false);
  });
});

describe('imageGenerationSchema', () => {
  it('akceptuje prompt z konfiguracją', () => {
    const result = imageGenerationSchema.safeParse({
      prompt: 'Minimalistyczna filiżanka kawy',
      config: { aspectRatio: '1:1' },
    });
    expect(result.success).toBe(true);
  });

  it('odrzuca pusty prompt', () => {
    expect(imageGenerationSchema.safeParse({ prompt: '' }).success).toBe(false);
  });
});

describe('videoGenerationSchema', () => {
  it('wymaga postText i platform', () => {
    expect(
      videoGenerationSchema.safeParse({
        postText: 'Hook wideo',
        platform: 'TikTok',
      }).success
    ).toBe(true);
  });
});

describe('multiPlatformSchema', () => {
  it('wymaga co najmniej jednej platformy docelowej', () => {
    const result = multiPlatformSchema.safeParse({
      originalText: 'Treść bazowa',
      targetPlatforms: ['Instagram', 'LinkedIn'],
    });
    expect(result.success).toBe(true);
  });

  it('odrzuca pustą listę platform', () => {
    const result = multiPlatformSchema.safeParse({
      originalText: 'Treść',
      targetPlatforms: [],
    });
    expect(result.success).toBe(false);
  });
});
