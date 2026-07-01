import { describe, it, expect } from 'vitest';
import {
  getPlatformVisualSpec,
  resolveAspectRatioForPlatform,
  buildPlatformImagePrompt,
  isAspectRatioAllowedForPlatform,
} from '../utils/platformVisualSpec';
import { Platform, VisualStyle } from '../types';

describe('platformVisualSpec', () => {
  it('returns Instagram square default', () => {
    expect(getPlatformVisualSpec(Platform.Instagram).defaultAspectRatio).toBe('1:1');
  });

  it('forces platform ratio when PlatformSpecific style', () => {
    expect(
      resolveAspectRatioForPlatform(Platform.TikTok, '1:1', VisualStyle.PlatformSpecific)
    ).toBe('9:16');
  });

  it('respects user ratio when allowed', () => {
    expect(resolveAspectRatioForPlatform(Platform.Instagram, '9:16')).toBe('9:16');
  });

  it('buildPlatformImagePrompt includes platform directives', () => {
    const prompt = buildPlatformImagePrompt({
      postText: 'Test post about AI',
      platform: Platform.LinkedIn,
      imageStyle: 'minimalist',
    });
    expect(prompt).toContain('LinkedIn');
    expect(prompt).toContain('professional');
    expect(prompt.toLowerCase()).toContain('avoid');
  });

  it('validates allowed ratios per platform', () => {
    expect(isAspectRatioAllowedForPlatform(Platform.TikTok, '9:16')).toBe(true);
    expect(isAspectRatioAllowedForPlatform(Platform.TikTok, '16:9')).toBe(false);
  });
});
