import { ToneArchetype, type BrandVoiceProfile, type BrandVoiceSettings } from '../types';

/** Mapuje tone z AI (Professional, Casual…) na archetyp UI. */
export function mapToneToArchetype(tone?: string | null): ToneArchetype | undefined {
  if (!tone?.trim()) return undefined;
  const t = tone.toLowerCase();
  if (t.includes('witty') || t.includes('humor') || t.includes('playful')) return ToneArchetype.Entertainer;
  if (t.includes('inspir') || t.includes('motiv')) return ToneArchetype.Innovator;
  if (t.includes('casual') || t.includes('friendly') || t.includes('warm')) return ToneArchetype.Friend;
  if (t.includes('bold') || t.includes('rebel') || t.includes('edgy')) return ToneArchetype.Rebel;
  if (t.includes('wise') || t.includes('thought') || t.includes('sage')) return ToneArchetype.Sage;
  if (t.includes('persuas') || t.includes('sales')) return ToneArchetype.Expert;
  if (t.includes('professional') || t.includes('expert') || t.includes('formal')) return ToneArchetype.Expert;
  return ToneArchetype.Expert;
}

export function learnedPayloadToSettings(learned: Record<string, unknown>): BrandVoiceSettings {
  const keywords = learned.keywords;
  const examplesToFollow = learned.examplesToFollow;
  const examplesToAvoid = learned.examplesToAvoid;
  const successPatterns = learned.successPatterns;

  return {
    brandName: String(learned.brandName || ''),
    description: String(learned.description || ''),
    keywords: Array.isArray(keywords) ? keywords.join(', ') : String(keywords || ''),
    avoid: String(learned.avoid || ''),
    archetype: mapToneToArchetype(String(learned.tone || learned.archetype || '')),
    examplesToFollow: Array.isArray(examplesToFollow)
      ? examplesToFollow.map(String).filter(Boolean)
      : [],
    examplesToAvoid: Array.isArray(examplesToAvoid)
      ? examplesToAvoid.map(String).filter(Boolean)
      : [],
    visualStyle: learned.visualStyle ? String(learned.visualStyle) : undefined,
    successPatterns: Array.isArray(successPatterns)
      ? successPatterns.map(String).filter(Boolean)
      : undefined,
    websiteUrl: learned.websiteUrl ? String(learned.websiteUrl) : undefined,
    brandColors: Array.isArray(learned.brandColors)
      ? learned.brandColors.map(String).filter(Boolean)
      : undefined,
  };
}

/** Scala nowe dane z uczenia z istniejącym profilem (nie nadpisuje pustymi wartościami). */
export function mergeLearnedIntoProfile(
  existing: BrandVoiceProfile,
  learned: Record<string, unknown>,
  profileName?: string
): BrandVoiceProfile {
  const incoming = learnedPayloadToSettings(learned);
  const prev = existing.settings;

  const mergeList = (a?: string[], b?: string[]) => {
    const merged = [...(a || []), ...(b || [])].map((s) => s.trim()).filter(Boolean);
    return [...new Set(merged)].slice(0, 12);
  };

  return {
    ...existing,
    name: profileName?.trim() || existing.name,
    settings: {
      ...prev,
      brandName: incoming.brandName || prev.brandName,
      description: incoming.description || prev.description,
      keywords: incoming.keywords || prev.keywords,
      avoid: incoming.avoid || prev.avoid,
      archetype: incoming.archetype ?? prev.archetype,
      visualStyle: incoming.visualStyle || prev.visualStyle,
      examplesToFollow: mergeList(prev.examplesToFollow, incoming.examplesToFollow),
      examplesToAvoid: mergeList(prev.examplesToAvoid, incoming.examplesToAvoid),
      successPatterns: mergeList(prev.successPatterns, incoming.successPatterns),
      websiteUrl: prev.websiteUrl || incoming.websiteUrl,
      brandColors: prev.brandColors?.length ? prev.brandColors : incoming.brandColors,
      logoUrl: prev.logoUrl,
      mascotUrl: prev.mascotUrl,
      mascotName: prev.mascotName,
      mascotDescription: prev.mascotDescription,
      includeMascotInGeneration: prev.includeMascotInGeneration,
      logoPosition: prev.logoPosition,
      logoSizePercent: prev.logoSizePercent,
      competitorIntel: prev.competitorIntel,
    },
  };
}

export function extractSuccessPatternsFromPostMortem(
  analysis: Record<string, unknown>
): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === 'string' && v.trim().length > 8) out.push(v.trim());
  };

  if (Array.isArray(analysis.topTakeaways)) analysis.topTakeaways.forEach(push);
  if (Array.isArray(analysis.improvementIdeas)) analysis.improvementIdeas.forEach(push);
  push(analysis.textTemplateSuggestion);
  push(analysis.imagePromptSuggestion);
  push(analysis.bestDayTime);
  push(analysis.nextSlotsHint);

  return [...new Set(out)].slice(0, 10);
}

export function computeBrandVoiceCompleteness(settings: BrandVoiceSettings): {
  score: number;
  missing: string[];
} {
  const checks: { label: string; ok: boolean }[] = [
    { label: 'Nazwa marki', ok: Boolean(settings.brandName?.trim()) },
    { label: 'Opis marki', ok: Boolean(settings.description?.trim()) },
    { label: 'Branża / nisza', ok: Boolean(settings.niche?.trim()) },
    { label: 'Słowa kluczowe', ok: Boolean(settings.keywords?.trim()) },
    { label: 'URL strony', ok: Boolean(settings.websiteUrl?.trim()) },
    { label: 'Styl wizualny', ok: Boolean(settings.visualStyle?.trim()) },
    { label: 'Logo', ok: Boolean(settings.logoUrl?.trim()) },
    { label: 'Przykład do naśladowania', ok: (settings.examplesToFollow?.filter(Boolean).length ?? 0) > 0 },
    { label: 'Archetyp', ok: Boolean(settings.archetype) },
  ];
  const done = checks.filter((c) => c.ok).length;
  return {
    score: Math.round((done / checks.length) * 100),
    missing: checks.filter((c) => !c.ok).map((c) => c.label),
  };
}
