import { describe, expect, it } from 'vitest';
import {
  validatePublishBody,
  assertPlatformPublishRules,
  assertPublishApprovalAllowed,
  isApprovalBlockingPublish,
  normalizeSocialPlatform,
} from '../server/lib/socialPublishGuards';
import { formatPublishCaption, normalizeCtaUrl } from '../server/lib/publishCaption';

describe('validatePublishBody', () => {
  it('odrzuca brak connectionId / postText', () => {
    expect(validatePublishBody({}).ok).toBe(false);
    expect(validatePublishBody({ connectionId: 'c1' }).ok).toBe(false);
    expect(validatePublishBody({ postText: 'hello' }).ok).toBe(false);
    expect(validatePublishBody(null).ok).toBe(false);
  });

  it('akceptuje poprawny payload i trimuje pola', () => {
    const result = validatePublishBody({
      connectionId: '  conn-1  ',
      postText: '  Treść posta  ',
      imageUrl: 'https://cdn.example/img.jpg',
      hashtags: ['#a', 1, '#b'],
      callToAction: 'Kliknij',
      ctaUrl: 'example.com',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.connectionId).toBe('conn-1');
    expect(result.data.postText).toBe('Treść posta');
    expect(result.data.hashtags).toEqual(['#a', '#b']);
    expect(result.data.imageUrl).toBe('https://cdn.example/img.jpg');
  });
});

describe('assertPlatformPublishRules', () => {
  it('wymaga obrazka dla Instagram', () => {
    expect(() => assertPlatformPublishRules('instagram')).toThrow(/Instagram wymaga obrazka/);
    expect(() => assertPlatformPublishRules('instagram', 'https://x/y.jpg')).not.toThrow();
  });

  it('nie blokuje Facebooka bez obrazka', () => {
    expect(() => assertPlatformPublishRules('facebook')).not.toThrow();
  });
});

describe('approval + platform normalize', () => {
  it('blokuje pending_approval i rejected', () => {
    expect(isApprovalBlockingPublish('pending_approval')).toBe(true);
    expect(isApprovalBlockingPublish('rejected')).toBe(true);
    expect(isApprovalBlockingPublish('approved')).toBe(false);
    expect(isApprovalBlockingPublish('draft')).toBe(false);
    expect(() => assertPublishApprovalAllowed('pending_approval')).toThrow(/akceptacj/);
    expect(() => assertPublishApprovalAllowed('approved')).not.toThrow();
  });

  it('mapuje X → twitter', () => {
    expect(normalizeSocialPlatform('X')).toBe('twitter');
    expect(normalizeSocialPlatform('x')).toBe('twitter');
    expect(normalizeSocialPlatform('Facebook')).toBe('facebook');
  });
});

describe('publish caption (server)', () => {
  it('składa caption jak w endpointcie publish', () => {
    const caption = formatPublishCaption({
      postText: 'Nowość w ofercie',
      hashtags: ['#promo'],
      callToAction: 'Zamów teraz',
      ctaUrl: normalizeCtaUrl('sklep.pl'),
    });
    expect(caption).toContain('Nowość w ofercie');
    expect(caption).toContain('#promo');
    expect(caption).toContain('Zamów teraz');
    expect(caption).toContain('https://sklep.pl');
  });
});
