import { describe, expect, it } from 'vitest';
import {
  matchIndustryPack,
  industryPackToFormPrefill,
  buildIndustryFirstPostTopic,
  getAllIndustryPacks,
  applySubNicheToPack,
  getGastroSubNiches,
} from '../utils/industryPacks';
import { buildFirstPostTopic, mapOnboardingToFormData } from '../utils/onboarding';
import { Platform, Tone } from '../types';
import { matchIndustryPack as matchServerPack, getTemplatesByCategory } from '../server/contentTemplates';

describe('matchIndustryPack', () => {
  it('maps gastro niches to pl-lokal', () => {
    expect(matchIndustryPack('Gastronomia / lokal')?.id).toBe('pl-lokal');
    expect(matchIndustryPack('Jedzenie & gotowanie')?.id).toBe('pl-lokal');
    expect(matchIndustryPack('restauracja włoska')?.id).toBe('pl-lokal');
  });

  it('resolves gastro sub-niches', () => {
    const cafe = matchIndustryPack('Kawiarnia specialty');
    expect(cafe?.id).toBe('pl-lokal');
    expect(cafe?.subNicheId).toBe('gastro-kawiarnia');
    expect(cafe?.topicIdeas[0]).toMatch(/Kawa/i);

    const truck = matchIndustryPack('Food truck street food');
    expect(truck?.subNicheId).toBe('gastro-foodtruck');
  });

  it('maps beauty niches to pl-fryzjer', () => {
    expect(matchIndustryPack('Fryzjer / beauty')?.id).toBe('pl-fryzjer');
    expect(matchIndustryPack('salon fryzjerski')?.id).toBe('pl-fryzjer');
  });

  it('maps saas, ecom, fitness, moda, edukacja, finanse', () => {
    expect(matchIndustryPack('B2B SaaS')?.id).toBe('pl-b2b-saas');
    expect(matchIndustryPack('E-commerce / sklep online')?.id).toBe('pl-ecom');
    expect(matchIndustryPack('Fitness & zdrowie')?.id).toBe('pl-fitness');
    expect(matchIndustryPack('Moda & lifestyle')?.id).toBe('pl-moda');
    expect(matchIndustryPack('Edukacja & kursy')?.id).toBe('pl-edukacja');
    expect(matchIndustryPack('Finanse osobiste')?.id).toBe('pl-finanse');
  });

  it('exposes eight industry packs', () => {
    expect(getAllIndustryPacks()).toHaveLength(8);
    expect(getGastroSubNiches()).toHaveLength(4);
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
    expect(prefill.topic).toBeTruthy();
  });

  it('applies sub-niche topic ideas', () => {
    const pack = matchIndustryPack('Gastronomia / lokal')!;
    const sub = getGastroSubNiches().find((s) => s.id === 'gastro-piekarnia')!;
    const withSub = applySubNicheToPack(pack, sub);
    expect(withSub.topicIdeas[0]).toMatch(/wypiek|Świeże/i);
  });
});

describe('onboarding industry mapping', () => {
  it('uses industry first-post topic for gastro', () => {
    const topic = buildFirstPostTopic('Gastronomia / lokal', Platform.Facebook);
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

describe('server matchIndustryPack (shared source)', () => {
  it('matches the same gastro pack id and has 8 industry templates', () => {
    expect(matchServerPack('lokal gastronomiczny')?.id).toBe('pl-lokal');
    expect(matchServerPack('kawiarnia')?.topicIdeas?.[0]).toMatch(/Kawa/i);
    expect(getTemplatesByCategory('industry')).toHaveLength(8);
  });
});
