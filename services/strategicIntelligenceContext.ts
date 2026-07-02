import { Platform } from '../types';
import { fetchTrackedCompetitors, normalizeCompetitorHandle } from './competitorService';
import {
  analyzeCompetitorBatch,
  analyzeCompetitorDeep,
  analyzeScheduleGaps,
  fetchIntelligenceNews,
  fetchIntelligenceTrends,
  fetchUserBestTimes,
  type IntelligenceTrend,
} from './intelligenceService';
import type { StrategicAuditReport } from '../types';

export type StrategicIntelligenceInput = {
  userId: string;
  niche: string;
  goal: string;
  audience: string;
  competitors: string[];
  platforms: Platform[];
};

function parseCompetitorHandles(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw) {
    for (const part of line.split(/[,;]/)) {
      const h = normalizeCompetitorHandle(part.replace(/https?:\/\/\S+/g, '').trim());
      if (h.length >= 2 && !seen.has(h.toLowerCase())) {
        seen.add(h.toLowerCase());
        out.push(h);
      }
    }
  }
  return out;
}

export async function gatherStrategicIntelligenceContext(
  input: StrategicIntelligenceInput
): Promise<{
  promptBlock: string;
  insights: NonNullable<StrategicAuditReport['intelligenceInsights']>;
}> {
  const primaryPlatform = input.platforms[0] || Platform.Instagram;
  const niche = input.niche.trim() || input.goal.trim() || input.audience.trim() || 'marketing';

  let trackedHandles: string[] = [];
  try {
    const tracked = await fetchTrackedCompetitors(input.userId);
    trackedHandles = tracked
      .filter((c) => input.platforms.includes(c.platform))
      .map((c) => c.handle);
  } catch {
    // ignore
  }

  const competitorHandles = [...new Set([...parseCompetitorHandles(input.competitors), ...trackedHandles])].slice(
    0,
    8
  );

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [trendsRes, gapsRes, bestTimesRes, newsRes, batchRes, singleRes] = await Promise.allSettled([
    fetchIntelligenceTrends(niche, primaryPlatform, input.userId, 'quick'),
    analyzeScheduleGaps(niche, primaryPlatform, input.userId, {
      competitorHandles,
      timezone,
      contentType: 'post',
    }),
    fetchUserBestTimes(input.userId, timezone),
    fetchIntelligenceNews(niche, primaryPlatform, input.userId),
    competitorHandles.length >= 2
      ? analyzeCompetitorBatch(competitorHandles, primaryPlatform, niche, input.userId)
      : Promise.resolve(null),
    competitorHandles.length === 1
      ? analyzeCompetitorDeep(competitorHandles[0], primaryPlatform, niche, input.userId)
      : Promise.resolve(null),
  ]);

  const trends =
    trendsRes.status === 'fulfilled'
      ? trendsRes.value
      : { trends: [], contentGaps: [], avoidTopics: [], sources: [] };

  const gaps = gapsRes.status === 'fulfilled' ? gapsRes.value : null;
  const bestTimes = bestTimesRes.status === 'fulfilled' ? bestTimesRes.value : null;
  const news = newsRes.status === 'fulfilled' ? newsRes.value : null;

  const batch =
    batchRes.status === 'fulfilled' && batchRes.value ? batchRes.value.batch : null;
  const single =
    singleRes.status === 'fulfilled' && singleRes.value ? singleRes.value.analysis : null;

  const trendingTopics = (trends.trends as IntelligenceTrend[])
    .slice(0, 5)
    .map((t) => `${t.topic} (${t.momentum}, pilność: ${t.actionUrgency})`);

  const contentGaps = [
    ...(trends.contentGaps || []),
    ...((batch?.contentGaps as string[]) || []),
    ...(single?.contentGaps || []),
  ].slice(0, 8);

  const gapSlots = gaps?.gapSlots?.slice(0, 6).map((g) => `${g.label} (${g.time})`) || [];
  const topSlots =
    bestTimes?.topSlots?.slice(0, 5).map((s) => {
      const days = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
      return `${days[s.weekday] ?? '?'} ${String(s.hour).padStart(2, '0')}:00`;
    }) || [];

  const optimalPostingSlots = gapSlots.length > 0 ? gapSlots : topSlots;

  const competitorRecommendation =
    gaps?.recommendation ||
    (batch?.recommendation as string) ||
    single?.timingRecommendation ||
    '';

  const industryPulse = news?.industryPulse || '';
  const newsAngles =
    news?.items?.slice(0, 4).map((i) => `${i.title}: ${i.angle}`) ||
    single?.recentNewsAngles?.map((n) => `${n.title}: ${n.angle}`) ||
    [];

  const insights: NonNullable<StrategicAuditReport['intelligenceInsights']> = {
    trendingTopics,
    contentGaps,
    optimalPostingSlots,
    competitorRecommendation: competitorRecommendation || undefined,
    industryPulse: industryPulse || undefined,
    newsAngles,
    avoidTopics: trends.avoidTopics?.slice(0, 5),
    competitorHandles,
    primaryPlatform,
  };

  const promptBlock = JSON.stringify(
    {
      primaryPlatform,
      competitorHandles,
      trendingTopics,
      contentGaps,
      avoidTopics: trends.avoidTopics,
      optimalPostingSlots,
      userTopPerformanceSlots: topSlots,
      scheduleGapRecommendation: competitorRecommendation,
      batchSharedPeakTimes: batch?.sharedPeakTimes,
      batchTimingGaps: batch?.timingGaps,
      singleCompetitorSummary: single?.summary,
      industryPulse,
      newsAngles,
      urgentTrends: (trends.trends as IntelligenceTrend[])
        .filter((t) => t.actionUrgency === 'now')
        .map((t) => t.topic),
    },
    null,
    2
  );

  return { promptBlock, insights };
}
