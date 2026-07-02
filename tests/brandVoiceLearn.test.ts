import { describe, expect, it } from 'vitest';
import { ToneArchetype } from '../types';
import {
  computeBrandVoiceCompleteness,
  learnedPayloadToSettings,
  mapToneToArchetype,
  mergeLearnedIntoProfile,
} from '../utils/brandVoiceLearn';

describe('brandVoiceLearn', () => {
  it('maps witty tone to entertainer archetype', () => {
    expect(mapToneToArchetype('Witty')).toBe(ToneArchetype.Entertainer);
  });

  it('converts learned payload to settings', () => {
    const settings = learnedPayloadToSettings({
      brandName: 'TestCo',
      keywords: ['a', 'b'],
      tone: 'Professional',
      visualStyle: 'minimal',
    });
    expect(settings.brandName).toBe('TestCo');
    expect(settings.keywords).toBe('a, b');
    expect(settings.archetype).toBe(ToneArchetype.Expert);
    expect(settings.visualStyle).toBe('minimal');
  });

  it('merges learned data without wiping logo', () => {
    const merged = mergeLearnedIntoProfile(
      {
        id: '1',
        userId: 'u',
        name: 'Moja marka',
        teamId: null,
        settings: {
          brandName: 'Old',
          description: 'desc',
          keywords: 'x',
          avoid: '',
          logoUrl: 'https://logo.png',
          websiteUrl: 'https://site.pl',
        },
      },
      { description: 'Nowy opis', keywords: 'y, z', tone: 'Casual' }
    );
    expect(merged.settings.logoUrl).toBe('https://logo.png');
    expect(merged.settings.websiteUrl).toBe('https://site.pl');
    expect(merged.settings.description).toBe('Nowy opis');
    expect(merged.settings.archetype).toBe(ToneArchetype.Friend);
  });

  it('computes completeness score', () => {
    const { score } = computeBrandVoiceCompleteness({
      brandName: 'X',
      description: 'Y',
      keywords: 'z',
      avoid: '',
      websiteUrl: 'https://a.pl',
      visualStyle: 'clean',
      logoUrl: 'https://l.png',
      archetype: ToneArchetype.Expert,
      examplesToFollow: ['hook'],
    });
    expect(score).toBe(100);
  });
});
