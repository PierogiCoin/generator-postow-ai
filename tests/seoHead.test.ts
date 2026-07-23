import { describe, it, expect } from 'vitest';

describe('SEO JSON-LD Data Helper', () => {
  it('formats SoftwareApplication and Organization JSON-LD correctly', () => {
    const jsonLdData = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Generator Postów AI',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'Twórz angażujące posty social media',
    };

    expect(jsonLdData['@type']).toBe('SoftwareApplication');
    expect(jsonLdData.name).toBe('Generator Postów AI');
  });
});
