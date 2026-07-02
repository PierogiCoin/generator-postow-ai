import { describe, expect, it } from 'vitest';
import { formatPublishCaption, normalizeCtaUrl } from '../utils/publishCaption';

describe('publishCaption', () => {
  it('normalizes bare domains to https', () => {
    expect(normalizeCtaUrl('example.com')).toBe('https://example.com');
  });

  it('appends CTA and link when missing from post text', () => {
    const caption = formatPublishCaption({
      postText: 'Nowa oferta już dostępna!',
      hashtags: ['#marketing'],
      callToAction: 'Sprawdź szczegóły',
      ctaUrl: 'https://mojafirma.pl/oferta',
    });
    expect(caption).toContain('Nowa oferta');
    expect(caption).toContain('#marketing');
    expect(caption).toContain('Sprawdź szczegóły');
    expect(caption).toContain('https://mojafirma.pl/oferta');
  });
});
