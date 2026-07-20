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
  batchGenerationSchema,
  chatGenerationSchema,
  abVariantsSchema,
  veoVideoGenerationSchema,
  getVideosOperationSchema,
  brandVoiceExtractUrlSchema,
  brandVoiceLearnSchema,
  scoreContentSchema,
  benchmarkContentSchema,
  applyTemplateSchema,
  templateCategoryParamSchema,
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

describe('batchGenerationSchema', () => {
  it('akceptuje topic i platforms', () => {
    const result = batchGenerationSchema.safeParse({
      topic: 'Nowa kawa sezonowa',
      platforms: ['Instagram', 'LinkedIn'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.style).toBe('Professional');
      expect(result.data.tone).toBe('Casual');
    }
  });

  it('odrzuca pustą listę platforms', () => {
    expect(
      batchGenerationSchema.safeParse({ topic: 'x', platforms: [] }).success
    ).toBe(false);
  });
});

describe('chatGenerationSchema', () => {
  it('wymaga prompt', () => {
    expect(chatGenerationSchema.safeParse({ prompt: 'Cześć' }).success).toBe(true);
    expect(chatGenerationSchema.safeParse({}).success).toBe(false);
  });

  it('akceptuje historię czatu', () => {
    const result = chatGenerationSchema.safeParse({
      prompt: 'Kontynuuj',
      history: [{ role: 'user', parts: [{ text: 'Hej' }] }],
    });
    expect(result.success).toBe(true);
  });
});

describe('abVariantsSchema', () => {
  it('wymaga originalText, platform i tone', () => {
    expect(
      abVariantsSchema.safeParse({
        originalText: 'Post bazowy',
        platform: 'Instagram',
        tone: 'Casual',
      }).success
    ).toBe(true);
    expect(
      abVariantsSchema.safeParse({ originalText: 'x', platform: 'IG' }).success
    ).toBe(false);
  });
});

describe('veoVideoGenerationSchema', () => {
  it('akceptuje prompt z aspectRatio', () => {
    expect(
      veoVideoGenerationSchema.safeParse({
        prompt: 'Kawa w slow motion',
        config: { aspectRatio: '9:16' },
      }).success
    ).toBe(true);
  });
});

describe('getVideosOperationSchema', () => {
  it('akceptuje poprawną nazwę LRO', () => {
    expect(
      getVideosOperationSchema.safeParse({
        operation: {
          name: 'models/veo-3.1-fast-generate-preview/operations/abc-123',
        },
      }).success
    ).toBe(true);
  });

  it('odrzuca path traversal', () => {
    expect(
      getVideosOperationSchema.safeParse({
        operation: { name: '../evil' },
      }).success
    ).toBe(false);
  });
});

describe('brandVoiceExtractUrlSchema', () => {
  it('akceptuje domenę i pełny URL', () => {
    expect(brandVoiceExtractUrlSchema.safeParse({ url: 'example.com' }).success).toBe(true);
    expect(
      brandVoiceExtractUrlSchema.safeParse({ url: 'https://brand.pl/o-nas' }).success
    ).toBe(true);
  });

  it('odrzuca pusty / bezsensowny URL', () => {
    expect(brandVoiceExtractUrlSchema.safeParse({ url: '' }).success).toBe(false);
    expect(brandVoiceExtractUrlSchema.safeParse({ url: 'not a url' }).success).toBe(false);
  });
});

describe('brandVoiceLearnSchema', () => {
  it('akceptuje puste body', () => {
    expect(brandVoiceLearnSchema.safeParse({}).success).toBe(true);
  });
});

describe('scoreContentSchema / benchmarkContentSchema', () => {
  it('wymaga content i platform', () => {
    expect(
      scoreContentSchema.safeParse({ content: 'Post testowy 123', platform: 'LinkedIn' })
        .success
    ).toBe(true);
    expect(scoreContentSchema.safeParse({ content: 'x' }).success).toBe(false);
  });

  it('benchmark wymaga niche', () => {
    expect(
      benchmarkContentSchema.safeParse({
        content: 'Treść',
        platform: 'Instagram',
        niche: 'SaaS',
      }).success
    ).toBe(true);
    expect(
      benchmarkContentSchema.safeParse({ content: 'Treść', platform: 'Instagram' }).success
    ).toBe(false);
  });
});

describe('applyTemplateSchema', () => {
  it('wymaga templateId', () => {
    expect(applyTemplateSchema.safeParse({ templateId: 'tpl-1' }).success).toBe(true);
    expect(applyTemplateSchema.safeParse({}).success).toBe(false);
  });
});

describe('templateCategoryParamSchema', () => {
  it('wymaga category', () => {
    expect(templateCategoryParamSchema.safeParse({ category: 'sales' }).success).toBe(true);
    expect(templateCategoryParamSchema.safeParse({ category: '' }).success).toBe(false);
  });
});
