/**
 * Jednolite rozwiązywanie niszy + blok promptu NISZA / INDUSTRY_PACK.
 */

import type { BrandVoiceData } from '../types';
import { getUserNiche, setUserNiche } from './userNiche';
import { matchIndustryPack, type IndustryPack } from './industryPacks';

export interface NicheContext {
  niche: string;
  pack: IndustryPack | null;
}

export function resolveNicheContext(opts: {
  userId?: string | null;
  brandVoice?: BrandVoiceData | null;
  audience?: string | null;
}): NicheContext {
  const niche =
    (opts.brandVoice?.niche && opts.brandVoice.niche.trim()) ||
    (opts.audience && opts.audience.trim()) ||
    getUserNiche(opts.userId) ||
    '';
  const pack = niche && niche !== 'marketing' ? matchIndustryPack(niche) : null;
  return { niche: niche === 'marketing' ? '' : niche, pack };
}

/** Tekst do zapisania jako userNiche / audience (z podbranżą). */
export function nicheStorageLabel(pack: IndustryPack, fallbackNiche?: string): string {
  if (pack.subNicheLabel) return `${pack.name} — ${pack.subNicheLabel}`;
  if (fallbackNiche?.trim()) return fallbackNiche.trim();
  return pack.name;
}

export function persistIndustryNiche(
  pack: IndustryPack,
  userId?: string | null,
  fallbackNiche?: string
): string {
  const label = nicheStorageLabel(pack, fallbackNiche);
  setUserNiche(label, userId);
  return label;
}

export function formatNicheUserPromptLines(ctx: NicheContext): string {
  const niche = ctx.niche || 'nieokreślona';
  const packLine = ctx.pack
    ? `INDUSTRY_PACK: ${ctx.pack.name}${ctx.pack.subNicheLabel ? ` / ${ctx.pack.subNicheLabel}` : ''}`
    : '';
  return `NISZA: ${niche}${packLine ? `\n${packLine}` : ''}`;
}

export function formatNicheSystemInstruction(ctx: NicheContext): string {
  if (!ctx.niche) return '';
  let block = `\n\nNISZA / BRANŻA: ${ctx.niche}.`;
  if (ctx.pack) {
    block += ` Dopasowany pack: ${ctx.pack.name}${ctx.pack.subNicheLabel ? ` (${ctx.pack.subNicheLabel})` : ''}.`;
    block += ` Pisz konkretnie jak dla tej branży w Polsce — unikać generycznych frazesów marketingowych; używać realnych scenariuszy (np. menu dnia, metamorfoza, case study, produkt).`;
    if (ctx.pack.topicHint) {
      block += ` Kontekst packa: ${ctx.pack.topicHint}.`;
    }
  }
  return block;
}
