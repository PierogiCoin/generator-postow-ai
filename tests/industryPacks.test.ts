import { describe, expect, it } from 'vitest';
import {
  matchIndustryPack,
  industryPackToFormPrefill,
  buildIndustryFirstPostTopic,
} from '../utils/industryPacks';
import { buildFirstPostTopic, mapOnboardingToFormData } from '../utils/onboarding';
import { Platform, Tone } from '../types';
import { matchIndustryPack as matchServerPack } from '../server/contentTemplates';

describe('matchIndustryPack', () => {
  it('maps gastro niches to pl-lokal', () => {
    expect(matchIndustryPack('Gastronomia / lokal')?.id).toBe('pl-lokal');
    expect(matchIndustryPack('Jedzenie & gotowanie')?.id).toBe('pl-lokal');
    expect(matchIndustryPack('restauracja włoska')?.id).toBe('pl-lokal');
  });

  it('maps beauty niches to pl-fryzjer', () => {
    expect(matchIndustryPack('Fryzjer / beauty')?.id).toBe('pl-fryzjer');
    expect(matchIndustryPack('salon fryzjerski')?.id).toBe('pl-fryzjer');
  });

  it('maps saas and ecom', () => {
    expect(matchIndustryPack('B2B SaaS')?.id).toBe('pl-b2b-saas');
    expect(matchIndustryPack('E-commerce / sklep online')?.id).toBe('pl-ecom');
  });

  it('returns null for unrelated niches', () => {
    expect(matchIndustryPack('marketing')).toBeNull();
    expect(matchIndustryPack('podróże egzotyczne')).toBeNull();
  });
});

describe('industryPackToFormPrefill', () => {
  it('prefills platform, tone and topic from pack', () => {
    const pack = matchIndustryPack('gastronomia')!;
    const prefill = industryPackToFormPrefill(pack);
    expect(prefill.platform).toBe(Platform.Facebook);
    expect(prefill.tone).toBe(Tone.Casual);
    expect(prefill.topic).toContain('Menu dnia');
  });
});

describe('onboarding industry mapping', () => {
  it('uses industry first-post topic for gastro', () => {
    const topic = buildFirstPostTopic('Gastronomia / lokal', Platform.Facebook);
    expect(topic).toContain('Menu dnia');
    expect(topic).not.toContain('przedstaw się');
  });

  it('mapOnboardingToFormData applies pack defaults', () => {
    const data = mapOnboardingToFormData({
      niche: 'Gastronomia / lokal',
      platform: Platform.Instagram,
      tone: 'casual',
      brandVoice: 'Ton: casual.',
    });
    expect(data.audience).toBe('Gastronomia / lokal');
    expect(data.platform).toBe(Platform.Instagram);
    expect(data.tone).toBe(Tone.Casual);
    expect(data.topic).toBeTruthy();
  });

  it('buildIndustryFirstPostTopic returns null without pack', () => {
    expect(buildIndustryFirstPostTopic('podróże', Platform.Instagram)).toBeNull();
  });
});

describe('server matchIndustryPack', () => {
  it('matches the same gastro pack id', () => {
    expect(matchServerPack('lokal gastronomiczny')?.id).toBe('pl-lokal');
    expect(matchServerPack('fryzjer')?.topicIdeas?.length).toBeGreaterThan(0);
  });
});
