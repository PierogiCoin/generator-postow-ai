import { Router } from 'express';
import { z } from 'zod';
import logger from '../logger.js';
import { creditGate } from '../middleware/credits.js';
import { getAuthUserId } from '../middleware/supabaseAuth.js';
import { validateRequest } from '../middleware/validate.js';
import { textLimiter } from '../middleware/rateLimiter.js';
import { runGroundedJsonGeneration } from '../lib/intelligenceEngine.js';
import {
  computeGapSlots,
  gapSlotToLabel,
  gapSlotToTime,
  parseWeekdayHourLabel,
  type HourlyDensity,
} from '../lib/competitorGapAnalytics.js';
import {
  computeSlotScore,
  fetchTopSlots,
  getWeekdayHourInTz,
  type HeatmapCell,
} from '../lib/schedulingAnalytics.js';
import { supabase } from '../lib/clients.js';
import {
  buildIntelligenceCacheKey,
  getIntelligenceCache,
  setIntelligenceCache,
  deleteIntelligenceCache,
  INTELLIGENCE_CACHE_TTL,
} from '../lib/intelligenceCache.js';

const newsSchema = z.object({
  niche: z.string().min(2).max(200),
  platform: z.string().min(1).max(50),
  language: z.string().max(10).optional(),
});

const trendsSchema = z.object({
  niche: z.string().min(2).max(200),
  platform: z.string().min(1).max(50),
  depth: z.enum(['quick', 'deep']).optional(),
});

const competitorSchema = z.object({
  handle: z.string().min(1).max(80),
  platform: z.string().min(1).max(50),
  niche: z.string().min(2).max(200),
  forceRefresh: z.boolean().optional(),
});

const competitorBatchSchema = z.object({
  handles: z.array(z.string().min(1).max(80)).min(1).max(8),
  platform: z.string().min(1).max(50),
  niche: z.string().min(2).max(200),
  forceRefresh: z.boolean().optional(),
});

const scheduleGapsSchema = z.object({
  niche: z.string().min(2).max(200),
  platform: z.string().min(1).max(50),
  competitorHandles: z.array(z.string().min(1).max(80)).max(8).optional(),
  timezone: z.string().max(80).optional(),
  contentType: z.string().max(80).optional(),
});

function todayPl(): string {
  return new Date().toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@+/, '');
}

async function fetchUserHeatmap(userId: string, timezone: string): Promise<HeatmapCell[]> {
  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('published_at, metrics')
    .eq('user_id', userId)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(400);

  if (error || !posts?.length) return [];

  const buckets: Record<string, HeatmapCell> = {};
  for (const p of posts) {
    if (!p.published_at) continue;
    const { weekday, hour } = getWeekdayHourInTz(p.published_at, timezone);
    const key = `${weekday}-${hour}`;
    if (!buckets[key]) buckets[key] = { weekday, hour, samples: 0, avgScore: 0 };
    const score = computeSlotScore(p.metrics || {});
    const b = buckets[key];
    b.samples += 1;
    b.avgScore = (b.avgScore * (b.samples - 1) + score) / b.samples;
  }
  return Object.values(buckets);
}

export function createIntelligenceRouter(): Router {
  const router = Router();

  router.post(
    '/api/intelligence/news',
    textLimiter,
    ...creditGate('sentimentAnalysis'),
    validateRequest(newsSchema),
    async (req, res) => {
      try {
        const { niche, platform, language = 'pl' } = req.body;
        const cacheKey = buildIntelligenceCacheKey('news', { niche, platform, language });
        const cached = getIntelligenceCache<Record<string, unknown>>(cacheKey);
        if (cached) {
          return res.json({ ...cached, cached: true });
        }

        const prompt = `Jesteś analitykiem newsów i social media. Użyj Google Search.

DATA: ${todayPl()}
NISZA: ${niche}
PLATFORMA: ${platform}
JĘZYK ODPOWIEDZI: ${language === 'pl' ? 'polski' : language}

Znajdź 5–8 aktualnych newsów / nowinek z ostatnich 7 dni istotnych dla tej niszy.
Preferuj wiarygodne źródła branżowe.

Zwróć WYŁĄCZNIE JSON:
{
  "items": [
    {
      "title": "krótki tytuł",
      "summary": "2 zdania",
      "angle": "kąt na post social — co napisać",
      "sourceTitle": "źródło",
      "sourceUrl": "URL",
      "publishedHint": "np. wczoraj",
      "relevance": 1-10,
      "competitorMention": "czy ktoś z branży już to opublikował (krótko) lub null"
    }
  ],
  "industryPulse": "1 zdanie o nastroju branży dziś"
}`;

        const { data, sources } = await runGroundedJsonGeneration<{ items?: unknown[]; industryPulse?: string }>(
          prompt,
          {
            systemInstruction:
              'Analityk newsów. Tylko zweryfikowane informacje z wyszukiwania. JSON bez markdown.',
          }
        );

        const payload = {
          items: Array.isArray(data.items) ? data.items : [],
          industryPulse: data.industryPulse || '',
          sources,
          searchedAt: new Date().toISOString(),
        };
        setIntelligenceCache(cacheKey, payload, INTELLIGENCE_CACHE_TTL.news);
        res.json(payload);
      } catch (error: unknown) {
        logger.error('[intelligence/news]', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'News intelligence failed',
        });
      }
    }
  );

  router.post(
    '/api/intelligence/trends',
    textLimiter,
    ...creditGate('sentimentAnalysis'),
    validateRequest(trendsSchema),
    async (req, res) => {
      try {
        const { niche, platform, depth = 'deep' } = req.body;
        const count = depth === 'quick' ? 5 : 7;
        const cacheKey = buildIntelligenceCacheKey('trends', { niche, platform, depth });
        const cached = getIntelligenceCache<Record<string, unknown>>(cacheKey);
        if (cached) {
          return res.json({ ...cached, cached: true });
        }

        const prompt = `Jesteś analitykiem trendów social media. Użyj Google Search.

DATA: ${todayPl()}
NISZA: ${niche}
PLATFORMA: ${platform}

Znajdź ${count} realnych trendów / tematów z ostatnich 7–14 dni.
Odróżnij hype od trwałych trendów. Podaj luki treści (co konkurencja pomija).

JSON:
{
  "trends": [
    {
      "topic": "nazwa trendu",
      "category": "kategoria",
      "momentum": "rising|peak|falling|stable",
      "engagementScore": 1-10,
      "volumeScore": 1-10,
      "competitionLevel": "low|medium|high",
      "predictedLifespan": "short|medium|long",
      "relatedHashtags": ["tag1"],
      "bestPlatforms": ["${platform}"],
      "contentIdeas": ["pomysł1","pomysł2","pomysł3"],
      "whyItsTrending": "krótkie wyjaśnienie",
      "actionUrgency": "now|soon|watch",
      "contentGap": "luka treści — co można zrobić lepiej niż konkurencja"
    }
  ],
  "contentGaps": ["3 ogólne luki w niszy"],
  "avoidTopics": ["tematy w decline"]
}`;

        const { data, sources } = await runGroundedJsonGeneration<{
          trends?: unknown[];
          contentGaps?: string[];
          avoidTopics?: string[];
        }>(prompt, {
          systemInstruction: 'Ekspert trendów. Konkretne, aktualne dane z wyszukiwania. JSON tylko.',
        });

        const payload = {
          trends: Array.isArray(data.trends) ? data.trends : [],
          contentGaps: data.contentGaps || [],
          avoidTopics: data.avoidTopics || [],
          sources,
          analyzedAt: new Date().toISOString(),
        };
        setIntelligenceCache(cacheKey, payload, INTELLIGENCE_CACHE_TTL.trends);
        res.json(payload);
      } catch (error: unknown) {
        logger.error('[intelligence/trends]', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Trend intelligence failed',
        });
      }
    }
  );

  router.post(
    '/api/intelligence/competitor',
    textLimiter,
    ...creditGate('brandVoiceAnalysis'),
    validateRequest(competitorSchema),
    async (req, res) => {
      try {
        const handle = normalizeHandle(req.body.handle);
        const { platform, niche, forceRefresh } = req.body;
        const cacheKey = buildIntelligenceCacheKey('competitor', { handle, platform, niche });
        if (forceRefresh) {
          deleteIntelligenceCache(cacheKey);
        } else {
          const cached = getIntelligenceCache<Record<string, unknown>>(cacheKey);
          if (cached) {
            return res.json({ ...cached, cached: true });
          }
        }

        const prompt = `Jesteś analitykiem competitive intelligence. Użyj Google Search.

DATA: ${todayPl()}
KONKURENT: @${handle}
PLATFORMA: ${platform}
NISZA: ${niche}

Zbadaj publicznie dostępne informacje: ostatnie posty, hashtagi, godziny publikacji, tematy, luki.
Jeśli brak danych — zaznacz "estimated": true i opieraj się na wzorcach branżowych.

JSON:
{
  "handle": "${handle}",
  "platform": "${platform}",
  "estimated": false,
  "topHashtags": ["tag"],
  "hashtagStrategy": "1-2 zdania",
  "hashtagPatterns": ["wzorzec"],
  "hashtagRecommendations": ["rekomendacja"],
  "hourlyActivity": [
    { "weekday": 0, "hour": 9, "density": 1-10, "note": "krótko" }
  ],
  "bestPostingTimes": ["Pon 09:00"],
  "worstPostingTimes": ["Pt 18:00"],
  "timingGaps": ["Wt 11:00 — mało postów konkurencji"],
  "timingRecommendation": "1 zdanie strategiczne",
  "contentThemes": ["temat"],
  "strengths": ["mocna strona"],
  "weaknesses": ["słabość"],
  "opportunities": ["luka do wykorzystania"],
  "contentGaps": ["temat którego nie poruszają"],
  "recentNewsAngles": [{ "title": "news", "angle": "kąt na post", "url": "..." }],
  "summary": "2-3 zdania"
}

weekday: 0=Pon … 6=Ndz. density 1=niska aktywność, 10=peak konkurencji.`;

        const { data, sources } = await runGroundedJsonGeneration<Record<string, unknown>>(prompt, {
          systemInstruction:
            'Competitive intelligence. Konkretne, actionable insights. Godziny w formacie 24h. JSON only.',
        });

        const payload = {
          analysis: { ...data, handle, platform },
          sources,
          analyzedAt: new Date().toISOString(),
        };
        setIntelligenceCache(cacheKey, payload, INTELLIGENCE_CACHE_TTL.competitor);
        res.json(payload);
      } catch (error: unknown) {
        logger.error('[intelligence/competitor]', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Competitor analysis failed',
        });
      }
    }
  );

  router.post(
    '/api/intelligence/competitor-batch',
    textLimiter,
    ...creditGate('brandVoiceAnalysis', (req) => {
      const n = Math.max(1, Math.min(8, Array.isArray(req.body?.handles) ? req.body.handles.length : 1));
      return 30 + (n - 1) * 15;
    }),
    validateRequest(competitorBatchSchema),
    async (req, res) => {
      try {
        const handles = (req.body.handles as string[]).map(normalizeHandle);
        const { platform, niche, forceRefresh } = req.body;
        const cacheKey = buildIntelligenceCacheKey('competitor-batch', {
          handles: handles.sort().join(','),
          platform,
          niche,
        });
        if (forceRefresh) {
          deleteIntelligenceCache(cacheKey);
        } else {
          const cached = getIntelligenceCache<Record<string, unknown>>(cacheKey);
          if (cached) {
            return res.json({ ...cached, cached: true });
          }
        }

        const prompt = `Analityk competitive intelligence. Użyj Google Search.

DATA: ${todayPl()}
KONKURENCI: ${handles.map((h) => `@${h}`).join(', ')}
PLATFORMA: ${platform}
NISZA: ${niche}

Porównaj wzorce publikacji i znajdź wspólne godziny szczytu oraz luki.

JSON:
{
  "aggregatedHourlyActivity": [
    { "weekday": 0, "hour": 10, "density": 1-10, "handles": ["handle1"] }
  ],
  "sharedPeakTimes": ["Pon 10:00"],
  "sharedQuietTimes": ["Sob 14:00"],
  "timingGaps": ["Wt 11:00 — wszyscy omijają"],
  "contentGaps": ["temat niewykorzystany przez grupę"],
  "opportunities": ["rekomendacja strategiczna"],
  "perCompetitor": [
    { "handle": "x", "summary": "1 zdanie", "topWeakness": "słabość" }
  ],
  "recommendation": "2 zdania jak publikować względem nich"
}`;

        const { data, sources } = await runGroundedJsonGeneration<Record<string, unknown>>(prompt, {
          systemInstruction: 'Porównawcza analiza wielu kont. JSON only.',
        });

        const payload = {
          batch: data,
          sources,
          analyzedAt: new Date().toISOString(),
        };
        setIntelligenceCache(cacheKey, payload, INTELLIGENCE_CACHE_TTL.competitorBatch);
        res.json(payload);
      } catch (error: unknown) {
        logger.error('[intelligence/competitor-batch]', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Batch competitor analysis failed',
        });
      }
    }
  );

  router.post(
    '/api/intelligence/schedule-gaps',
    textLimiter,
    ...creditGate('contentOptimization'),
    validateRequest(scheduleGapsSchema),
    async (req, res) => {
      try {
        const userId = getAuthUserId(req);

        const {
          niche,
          platform,
          competitorHandles = [],
          timezone = 'Europe/Warsaw',
          contentType = 'post',
        } = req.body;

        const handlesKey = [...(competitorHandles as string[])].map(normalizeHandle).sort().join(',');
        const cacheKey = buildIntelligenceCacheKey('schedule-gaps', {
          userId,
          niche,
          platform,
          timezone,
          contentType,
          handles: handlesKey,
        });
        const cached = getIntelligenceCache<Record<string, unknown>>(cacheKey);
        if (cached) {
          return res.json({ ...cached, cached: true });
        }

        const userHeatmap = await fetchUserHeatmap(userId, timezone);
        const userTopSlots = await fetchTopSlots(userId, timezone, 8);

        let competitorHourly: HourlyDensity[] = [];
        let aiGaps: string[] = [];
        let aiRecommendation = '';
        let sources: { title: string; url: string }[] = [];

        try {
          if (competitorHandles.length > 0) {
            const handles = (competitorHandles as string[]).map(normalizeHandle);
            const prompt = `Competitive timing analyst. Użyj Google Search.

DATA: ${todayPl()}
KONKURENCI: ${handles.map((h) => `@${h}`).join(', ')}
PLATFORMA: ${platform}
NISZA: ${niche}
TYP TREŚCI: ${contentType}

Określ godzinową aktywność konkurencji (weekday 0=Pon, hour 0-23, density 1-10).
Wskaż luki czasowe do publikacji PRZED lub PO ich szczytach.

JSON:
{
  "hourlyActivity": [
    { "weekday": 1, "hour": 9, "density": 8, "handles": ["a"] }
  ],
  "timingGaps": ["Wt 11:00 — luka"],
  "avoidTimes": ["Pt 18:00"],
  "recommendation": "strategia godzinowa",
  "weeklyPlan": [
    { "weekday": 1, "hour": 11, "score": 9, "reason": "luka konkurencji" }
  ]
}`;

            const grounded = await runGroundedJsonGeneration<{
              hourlyActivity?: HourlyDensity[];
              timingGaps?: string[];
              recommendation?: string;
              weeklyPlan?: { weekday: number; hour: number; score: number; reason: string }[];
            }>(prompt, {
              systemInstruction: 'Ekspert harmonogramów social. Konkretne godziny. JSON only.',
            });

            competitorHourly = Array.isArray(grounded.data.hourlyActivity)
              ? grounded.data.hourlyActivity
              : [];
            aiGaps = grounded.data.timingGaps || [];
            aiRecommendation = grounded.data.recommendation || '';
            sources = grounded.sources;

            // Parse text gaps into hourly cells if missing
            for (const gap of aiGaps) {
              const parsed = parseWeekdayHourLabel(gap);
              if (parsed && !competitorHourly.some((c) => c.weekday === parsed.weekday && c.hour === parsed.hour)) {
                competitorHourly.push({
                  weekday: parsed.weekday,
                  hour: parsed.hour,
                  density: 2,
                });
              }
            }

            if (Array.isArray(grounded.data.weeklyPlan)) {
              for (const plan of grounded.data.weeklyPlan) {
                if (typeof plan.weekday === 'number' && typeof plan.hour === 'number') {
                  competitorHourly.push({
                    weekday: plan.weekday,
                    hour: plan.hour,
                    density: Math.max(1, 10 - (plan.score || 7)),
                  });
                }
              }
            }
          } else {
            // Bez konkurentów — ogólna analiza platformy z grounding
            const prompt = `Social timing expert. Użyj Google Search.

NISZA: ${niche}, PLATFORMA: ${platform}, DATA: ${todayPl()}

JSON:
{
  "hourlyActivity": [{ "weekday": 0, "hour": 9, "density": 6 }],
  "timingGaps": ["Pon 11:00"],
  "recommendation": "strategia"
}`;

            const grounded = await runGroundedJsonGeneration<{
              hourlyActivity?: HourlyDensity[];
              timingGaps?: string[];
              recommendation?: string;
            }>(prompt);

            competitorHourly = grounded.data.hourlyActivity || [];
            aiGaps = grounded.data.timingGaps || [];
            aiRecommendation = grounded.data.recommendation || '';
            sources = grounded.sources;
          }
        } catch (aiErr) {
          logger.warn('[intelligence/schedule-gaps] AI grounded generation failed, using fallback metrics', aiErr);
          aiRecommendation = `Zalecana publikacja w godzinach optymalnych dla platformy ${platform} (ok. 8:00 - 10:00 oraz 18:00 - 20:00).`;
          aiGaps = ['Wt 09:30', 'Czw 18:30'];
        }

        const gapSlots = computeGapSlots(competitorHourly, userHeatmap, 14);

        const payload = {
          timezone,
          niche,
          platform,
          userSamples: userHeatmap.reduce((s, c) => s + c.samples, 0),
          userTopSlots,
          competitorHourly,
          gapSlots: gapSlots.map((g) => ({
            ...g,
            label: gapSlotToLabel(g),
            time: gapSlotToTime(g),
          })),
          aiTimingGaps: aiGaps,
          recommendation: aiRecommendation,
          sources,
          computedAt: new Date().toISOString(),
        };
        setIntelligenceCache(cacheKey, payload, INTELLIGENCE_CACHE_TTL.scheduleGaps);
        res.json(payload);
      } catch (error: unknown) {
        logger.error('[intelligence/schedule-gaps]', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Schedule gap analysis failed',
        });
      }
    }
  );

  return router;
}
