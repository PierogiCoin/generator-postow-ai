import type {
  BrandVoiceProfile,
  AIInsight,
  IntelligentCalendarPlanItem,
  StrategicAuditReport,
} from '../types';
import { GenerationType } from '../types';

/** Liczba slotów w 14-dniowym planie wg częstotliwości publikacji. */
export function frequencyToPlanSlots(frequency: string): number {
  switch (frequency) {
    case 'daily':
      return 14;
    case '3_times_week':
      return 6;
    case '2_times_week':
      return 4;
    case 'weekly':
      return 2;
    default:
      return 6;
  }
}

export function buildBrandContextForAudit(
  profile: BrandVoiceProfile | undefined,
  learnedInsights: AIInsight[] | null
): Record<string, unknown> {
  if (!profile) {
    return learnedInsights?.length
      ? { learnedInsights: learnedInsights.slice(0, 8).map((i) => i.text) }
      : {};
  }

  const { settings } = profile;
  return {
    profileName: profile.name,
    brandName: settings.brandName,
    description: settings.description,
    keywords: settings.keywords,
    avoid: settings.avoid,
    archetype: settings.archetype,
    visualStyle: settings.visualStyle,
    websiteUrl: settings.websiteUrl,
    successPatterns: settings.successPatterns?.slice(0, 5),
    competitorIntel: settings.competitorIntel
      ? {
          summary: settings.competitorIntel.summary,
          differentiationAngles: settings.competitorIntel.differentiationAngles,
          exploitGaps: settings.competitorIntel.exploitGaps,
          avoidCompetitorPatterns: settings.competitorIntel.avoidCompetitorPatterns,
          timingHints: settings.competitorIntel.timingHints,
        }
      : undefined,
    examplesToFollow: settings.examplesToFollow?.slice(0, 3),
    learnedInsights: learnedInsights?.slice(0, 6).map((i) => i.text),
  };
}

export function isValidStrategicAuditReport(report: StrategicAuditReport | null | undefined): boolean {
  if (!report) return false;
  if (!report.summary?.trim()) return false;
  if (report.summary.toLowerCase().includes('audit failed')) return false;
  if (!report.actionablePlan?.length) return false;
  // Persona i SWOT to rdzeń raportu — bez nich audyt jest niekompletny.
  if (!report.refinedPersona?.name?.trim()) return false;
  if (!report.swot) return false;
  const swotFilled = [
    report.swot.strengths,
    report.swot.weaknesses,
    report.swot.opportunities,
    report.swot.threats,
  ].some((arr) => Array.isArray(arr) && arr.length > 0);
  if (!swotFilled) return false;
  if (!report.contentPillars?.length) return false;
  return true;
}

/** Uzupełnia brakujące pola planu i normalizuje formaty. */
export function normalizeActionablePlan(
  plan: IntelligentCalendarPlanItem[],
  allowedFormats: GenerationType[]
): IntelligentCalendarPlanItem[] {
  const defaultFormat = allowedFormats[0] || GenerationType.PostWithImage;

  return plan.map((item, index) => ({
    ...item,
    id: item.id || `plan-${index}-${Date.now()}`,
    format: allowedFormats.includes(item.format) ? item.format : defaultFormat,
    slotType: item.slotType || (item.format === GenerationType.Video ? 'reel' : 'post'),
    contentIntent: item.contentIntent || 'educational',
  }));
}
