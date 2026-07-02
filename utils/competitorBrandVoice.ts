import type { CompetitorBrandIntel, BrandVoiceProfile, BrandVoiceSettings } from '../types';
import type { CompetitorAnalysis, TrackedCompetitor } from '../services/competitorService';
import type { BatchCompetitorResult } from '../components/intelligence/BatchCompetitorSummary';

function uniqueTrimmed(items: string[], limit = 12): string[] {
  return [...new Set(items.map((s) => s.trim()).filter((s) => s.length > 2))].slice(0, limit);
}

function mergeKeywords(existing: string, additions: string[]): string {
  const parts = [
    ...existing.split(',').map((k) => k.trim()).filter(Boolean),
    ...additions,
  ];
  return uniqueTrimmed(parts, 20).join(', ');
}

/** Buduje payload do mergeLearnedIntoProfile + blok competitorIntel z analiz konkurentów. */
export function buildLearnedFromCompetitors(
  competitors: TrackedCompetitor[],
  batch?: BatchCompetitorResult | null
): { learned: Record<string, unknown>; intel: CompetitorBrandIntel } {
  const analyzed = competitors.filter((c) => c.analysis);
  const handles = analyzed.map((c) => `@${c.handle}`);

  const opportunities: string[] = [];
  const contentGaps: string[] = [];
  const strengths: string[] = [];
  const hashtagRecs: string[] = [];
  const hashtagTags: string[] = [];
  const timingGaps: string[] = [];
  const timingRecs: string[] = [];
  const themes: string[] = [];
  const summaries: string[] = [];

  for (const c of analyzed) {
    const a = c.analysis as CompetitorAnalysis;
    summaries.push(`@${c.handle}: ${a.summary}`);
    opportunities.push(...(a.opportunities || []));
    contentGaps.push(...(a.contentGaps || []));
    strengths.push(...(a.strengths || []));
    hashtagRecs.push(...(a.hashtagRecommendations || []));
    hashtagTags.push(...(a.topHashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`)));
    timingGaps.push(...(a.timingGaps || []));
    timingRecs.push(a.timingRecommendation);
    themes.push(...(a.contentThemes || []));
  }

  if (batch?.opportunities?.length) opportunities.push(...batch.opportunities);
  if (batch?.contentGaps?.length) contentGaps.push(...batch.contentGaps);
  if (batch?.timingGaps?.length) timingGaps.push(...batch.timingGaps);
  if (batch?.recommendation) summaries.unshift(batch.recommendation);

  const differentiationAngles = uniqueTrimmed([
    ...contentGaps.map((g) => `Wypełnij lukę: ${g}`),
    ...opportunities.map((o) => `Szansa: ${o}`),
    ...(batch?.perCompetitor?.map((p) =>
      p.topWeakness ? `Wykorzystaj słabość @${p.handle}: ${p.topWeakness}` : ''
    ) || []),
  ]);

  const avoidCompetitorPatterns = uniqueTrimmed([
    ...strengths.map((s) => `Nie kopiuj u konkurentów: ${s}`),
    ...(batch?.sharedPeakTimes?.map((t) => `Unikaj publikacji o ${t} — wszyscy konkurenci tam są`) || []),
    ...themes.map((t) => `Przesycony temat u konkurencji: ${t}`),
  ]);

  const exploitGaps = uniqueTrimmed([...contentGaps, ...opportunities, ...(batch?.contentGaps || [])]);
  const hashtagHints = uniqueTrimmed([...hashtagRecs, ...hashtagTags]);
  const timingHints = uniqueTrimmed([...timingGaps, ...timingRecs.filter(Boolean)]);

  const intel: CompetitorBrandIntel = {
    summary: summaries.filter(Boolean).slice(0, 4).join(' | ') || 'Analiza konkurencji',
    differentiationAngles,
    avoidCompetitorPatterns,
    exploitGaps,
    hashtagHints,
    timingHints,
    trackedHandles: handles,
    lastSyncedAt: new Date().toISOString(),
  };

  const learned: Record<string, unknown> = {
    description: intel.summary,
    keywords: hashtagHints.slice(0, 10).map((h) => h.replace(/^#/, '')).join(', '),
    avoid: avoidCompetitorPatterns.slice(0, 5).join(', '),
    examplesToFollow: differentiationAngles.slice(0, 6),
    examplesToAvoid: avoidCompetitorPatterns.slice(0, 6),
    successPatterns: uniqueTrimmed([
      ...exploitGaps.map((g) => `Luka rynkowa: ${g}`),
      ...timingHints.map((t) => `Timing: ${t}`),
      ...hashtagRecs.slice(0, 4),
    ]),
  };

  return { learned, intel };
}

export function mergeCompetitorIntelIntoProfile(
  profile: BrandVoiceProfile,
  learned: Record<string, unknown>,
  intel: CompetitorBrandIntel
): BrandVoiceProfile {
  const mergeList = (a?: string[], b?: string[]) => {
    const merged = [...(a || []), ...(b || [])].map((s) => s.trim()).filter(Boolean);
    return [...new Set(merged)].slice(0, 12);
  };

  const incomingExamplesFollow = Array.isArray(learned.examplesToFollow)
    ? learned.examplesToFollow.map(String)
    : [];
  const incomingExamplesAvoid = Array.isArray(learned.examplesToAvoid)
    ? learned.examplesToAvoid.map(String)
    : [];
  const incomingPatterns = Array.isArray(learned.successPatterns)
    ? learned.successPatterns.map(String)
    : [];

  const prev = profile.settings;

  return {
    ...profile,
    settings: {
      ...prev,
      description: prev.description
        ? `${prev.description}\n\n[Konkurencja] ${intel.summary}`
        : intel.summary,
      keywords: learned.keywords
        ? mergeKeywords(prev.keywords || '', String(learned.keywords).split(','))
        : prev.keywords,
      avoid: prev.avoid
        ? `${prev.avoid}, ${String(learned.avoid || '')}`
        : String(learned.avoid || ''),
      examplesToFollow: mergeList(prev.examplesToFollow, [
        ...incomingExamplesFollow,
        ...intel.differentiationAngles,
      ]),
      examplesToAvoid: mergeList(prev.examplesToAvoid, [
        ...incomingExamplesAvoid,
        ...intel.avoidCompetitorPatterns,
      ]),
      successPatterns: mergeList(prev.successPatterns, [
        ...incomingPatterns,
        ...intel.exploitGaps.map((g) => `Luka: ${g}`),
      ]),
      competitorIntel: intel,
    },
  };
}

/** Blok promptu dla generowania treści — różnicowanie vs konkurencja. */
export function buildCompetitorPromptBlock(settings: BrandVoiceSettings): string {
  const intel = settings.competitorIntel;
  if (!intel) return '';

  const parts = [
    `COMPETITIVE INTELLIGENCE (updated ${new Date(intel.lastSyncedAt).toLocaleDateString('pl-PL')}): ${intel.summary}`,
    intel.differentiationAngles.length
      ? `DIFFERENTIATE: ${intel.differentiationAngles.slice(0, 5).join(' | ')}`
      : '',
    intel.exploitGaps.length
      ? `EXPLOIT GAPS competitors miss: ${intel.exploitGaps.slice(0, 5).join(' | ')}`
      : '',
    intel.avoidCompetitorPatterns.length
      ? `DO NOT copy competitor patterns: ${intel.avoidCompetitorPatterns.slice(0, 5).join(' | ')}`
      : '',
    intel.hashtagHints.length
      ? `Hashtag intelligence: ${intel.hashtagHints.slice(0, 8).join(', ')}`
      : '',
    intel.timingHints.length
      ? `Timing vs competitors: ${intel.timingHints.slice(0, 4).join(' | ')}`
      : '',
    intel.trackedHandles.length
      ? `Tracked competitors: ${intel.trackedHandles.join(', ')}`
      : '',
  ].filter(Boolean);

  return `\n\n${parts.join('\n')}`;
}
