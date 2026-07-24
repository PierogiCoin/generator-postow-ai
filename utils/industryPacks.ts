/**
 * Branżowe starter packi PL — warstwa UI nad shared/industryPacks.
 */

import { Platform, Tone, GenerationType, type FormData } from '../types';
import {
  INDUSTRY_PACK_DEFS,
  INDUSTRY_SUB_NICHES,
  getSubNichesForPack,
  matchIndustryPackDef,
  matchIndustrySubNiche,
  resolveIndustryPackForNiche,
  type IndustryPackDef,
  type IndustryPackId,
  type IndustrySubNicheDef,
  type IndustrySubNicheId,
} from '../shared/industryPacks';

export type { IndustryPackId, IndustrySubNicheId, IndustrySubNicheDef };

export interface IndustryPack {
  id: IndustryPackId;
  name: string;
  description: string;
  icon: string;
  platform: Platform;
  tone: Tone;
  nicheKeywords: string[];
  topicHint: string;
  topicIdeas: string[];
  subNicheId?: IndustrySubNicheId;
  subNicheLabel?: string;
}

const TONE_MAP: Record<string, Tone> = {
  Casual: Tone.Casual,
  Friendly: Tone.Casual,
  Professional: Tone.Professional,
  Formal: Tone.Professional,
  Persuasive: Tone.Persuasive,
  Inspirational: Tone.Inspirational,
  Enthusiastic: Tone.Inspirational,
};

function toPlatform(value: string): Platform {
  if (Object.values(Platform).includes(value as Platform)) return value as Platform;
  return Platform.Instagram;
}

function toTone(value: string): Tone {
  return TONE_MAP[value] ?? Tone.Casual;
}

export function defToIndustryPack(def: IndustryPackDef, sub?: IndustrySubNicheDef | null): IndustryPack {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    platform: toPlatform(def.platform),
    tone: toTone(def.tone),
    nicheKeywords: def.nicheKeywords,
    topicHint: def.topicHint,
    topicIdeas: def.topicIdeas,
    subNicheId: sub?.id,
    subNicheLabel: sub?.label,
  };
}

export const INDUSTRY_PACKS: IndustryPack[] = INDUSTRY_PACK_DEFS.map((d) => defToIndustryPack(d));

export function matchIndustryPack(niche: string): IndustryPack | null {
  const { pack, subNiche } = resolveIndustryPackForNiche(niche);
  if (!pack) return null;
  return defToIndustryPack(pack, subNiche);
}

export function getIndustryPackById(id: string): IndustryPack | undefined {
  const def = INDUSTRY_PACK_DEFS.find((p) => p.id === id);
  return def ? defToIndustryPack(def) : undefined;
}

export function getAllIndustryPacks(): IndustryPack[] {
  return INDUSTRY_PACKS;
}

export function getGastroSubNiches(): IndustrySubNicheDef[] {
  return getSubNichesForPack('pl-lokal');
}

export function matchSubNiche(niche: string): IndustrySubNicheDef | null {
  return matchIndustrySubNiche(niche);
}

export function applySubNicheToPack(pack: IndustryPack, sub: IndustrySubNicheDef): IndustryPack {
  if (sub.parentPackId !== pack.id) return pack;
  return {
    ...pack,
    topicIdeas: sub.topicIdeas,
    topicHint: `${pack.topicHint} (podbranża: ${sub.label})`,
    subNicheId: sub.id,
    subNicheLabel: sub.label,
  };
}

export function industryPackToFormPrefill(
  pack: IndustryPack,
  topic?: string,
  audienceOverride?: string
): Partial<FormData> {
  const chosen = (topic?.trim() || pack.topicIdeas[0] || pack.topicHint).trim();
  const audience =
    audienceOverride?.trim() ||
    (pack.subNicheLabel ? `${pack.name} — ${pack.subNicheLabel}` : pack.name);
  return {
    topic: chosen.startsWith('<') ? chosen : `<p>${chosen}</p>`,
    platform: pack.platform,
    tone: pack.tone,
    audience,
    generationType: GenerationType.PostWithImage,
  };
}

export function buildIndustryFirstPostTopic(niche: string, platform: Platform): string | null {
  const pack = matchIndustryPack(niche);
  if (!pack) return null;
  const idea = pack.topicIdeas[0] || pack.topicHint;
  const sub = pack.subNicheLabel ? ` (${pack.subNicheLabel})` : '';
  return `<p>${idea}</p><p>Kontekst: nisza <strong>${niche.trim()}</strong>${sub}, platforma ${platform}.</p>`;
}

export { INDUSTRY_SUB_NICHES, matchIndustryPackDef };
