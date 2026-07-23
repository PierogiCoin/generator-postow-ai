import { afterEach, describe, expect, it } from 'vitest';

describe('togetherClient helpers', () => {
  const originalApiKey = process.env.TOGETHER_API_KEY;

  afterEach(() => {
    process.env.TOGETHER_API_KEY = originalApiKey;
  });

  it('maps quality tiers to the expected FLUX models', async () => {
    const { resolveTogetherModel } = await import('../server/lib/togetherClient');

    expect(resolveTogetherModel('standard')).toBe('black-forest-labs/FLUX.2-pro');
    expect(resolveTogetherModel('typography')).toBe('black-forest-labs/FLUX.2-flex');
    expect(resolveTogetherModel(undefined)).toBe('black-forest-labs/FLUX.2-pro');
  });

  it('maps UI aspect ratios to Together pixel dimensions', async () => {
    const { aspectRatioToPixels } = await import('../server/lib/togetherClient');

    expect(aspectRatioToPixels('16:9')).toEqual({ width: 1344, height: 768 });
    expect(aspectRatioToPixels('9:16')).toEqual({ width: 768, height: 1344 });
    expect(aspectRatioToPixels('4:3')).toEqual({ width: 1152, height: 896 });
    expect(aspectRatioToPixels('3:4')).toEqual({ width: 896, height: 1152 });
    expect(aspectRatioToPixels('unexpected')).toEqual({ width: 1024, height: 1024 });
  });

  it('detects whether Together is configured', async () => {
    const { isTogetherConfigured } = await import('../server/lib/togetherClient');

    process.env.TOGETHER_API_KEY = '  ';
    expect(isTogetherConfigured()).toBe(false);

    process.env.TOGETHER_API_KEY = 'test-key';
    expect(isTogetherConfigured()).toBe(true);
  });
});
