import { callApi } from './apiClient';
import { STORAGE_KEYS } from '../utils/storageUtils';
import { analyzeScheduleGaps, type GapSlotResult } from './intelligenceService';
import { fetchTrackedCompetitors } from './competitorService';
import { Platform } from '../types';

/**
 * Auto-Schedule Optimization Service
 * AI-powered optimal posting time selection based on:
 * - Audience activity patterns
 * - Platform-specific algorithms
 * - Content type optimization
 * - Competitive landscape (avoid crowded times)
 * - Seasonal/trending factors
 */

export interface OptimalTimeSlot {
  day: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  time: string; // HH:MM format
  score: number; // 1-10 overall optimality score
  confidence: 'high' | 'medium' | 'low';
  predictedEngagement: number; // predicted engagement rate %
  predictedReach: number; // estimated reach
  reasoning: string;
  factors: {
    audienceActivity: number; // 1-10
    competitionLevel: number; // 1-10 (lower is better)
    algorithmFavorability: number; // 1-10
    contentTypeMatch: number; // 1-10
  };
  alternatives: string[]; // other good times that day
}

export interface WeeklySchedule {
  niche: string;
  platform: string;
  contentType: string;
  optimalSlots: OptimalTimeSlot[];
  worstTimes: string[]; // times to avoid
  timezone: string;
  peakActivityHours: string[];
  offPeakHours: string[];
  seasonalNotes?: string;
  competitorGapSlots?: GapSlotResult[];
  gapRecommendation?: string;
}

export interface ContentCalendarSuggestion {
  week: number;
  suggestions: {
    day: string;
    time: string;
    contentType: string;
    topic: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

/**
 * Analyzes and returns optimal posting times for a specific niche/platform
 */
export async function analyzeOptimalPostingTimes(
  niche: string,
  platform: string,
  contentType: string,
  targetTimezone: string,
  userId: string,
  audienceDemographics?: {
    ageRange?: string;
    location?: string;
    profession?: string;
  }
): Promise<WeeklySchedule> {
  const competitors = (await fetchTrackedCompetitors(userId))
    .filter((c) => c.platform === platform)
    .map((c) => c.handle);

  let gapSlots: GapSlotResult[] = [];
  let gapRecommendation = '';

  try {
    const gapAnalysis = await analyzeScheduleGaps(niche, platform as Platform, userId, {
      competitorHandles: competitors,
      timezone: targetTimezone,
      contentType,
    });
    gapSlots = gapAnalysis.gapSlots || [];
    gapRecommendation = gapAnalysis.recommendation || '';
  } catch {
    // kontynuuj z samym AI schedule
  }

  const schedulePrompt = `Analyze optimal posting times for:

NICHE: ${niche}
PLATFORM: ${platform}
CONTENT TYPE: ${contentType}
TIMEZONE: ${targetTimezone}
${audienceDemographics ? `AUDIENCE: ${JSON.stringify(audienceDemographics)}` : ''}
${competitors.length ? `COMPETITORS TO AVOID: ${competitors.map((h) => `@${h}`).join(', ')}` : ''}
${gapSlots.length ? `COMPETITOR GAP HOURS (prioritize these): ${gapSlots.slice(0, 6).map((g) => g.label).join(', ')}` : ''}
${gapRecommendation ? `STRATEGY: ${gapRecommendation}` : ''}

Provide a comprehensive posting schedule analysis:

1. OPTIMAL TIME SLOTS: 5-7 specific day/time combinations with scores (1-10)
   For each slot include:
   - Day of week
   - Time (HH:MM)
   - Overall score (1-10)
   - Confidence level (high/medium/low)
   - Predicted engagement rate (%)
   - Estimated reach
   - Detailed reasoning
   - Factor breakdown (audience activity 1-10, competition 1-10, algorithm 1-10, content match 1-10)
   - 2-3 alternative times for that day

2. WORST TIMES TO AVOID: 3-4 specific times that perform poorly

3. PEAK ACTIVITY HOURS: General hours when audience is most active

4. OFF-PEAK HOURS: Times with lower competition but still decent engagement

5. SEASONAL NOTES: Any current timing factors (holidays, events, trends)

Focus on data-driven insights specific to ${platform}'s algorithm and the ${niche} audience behavior.

Format as structured data.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: schedulePrompt,
    systemInstruction: "You are a social media timing expert with deep knowledge of platform algorithms and audience psychology. Provide specific, actionable time recommendations with realistic engagement predictions.",
  }, userId);

  const schedule = parseWeeklySchedule(response.text || response, niche, platform, contentType, targetTimezone);

  if (gapSlots.length > 0) {
    schedule.competitorGapSlots = gapSlots;
    schedule.gapRecommendation = gapRecommendation;
    schedule.optimalSlots = mergeGapSlotsIntoSchedule(schedule.optimalSlots, gapSlots);
  }

  return schedule;
}

function mergeGapSlotsIntoSchedule(
  existing: OptimalTimeSlot[],
  gaps: GapSlotResult[]
): OptimalTimeSlot[] {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monFirst = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fromGaps: OptimalTimeSlot[] = gaps.slice(0, 5).map((g) => ({
    day: monFirst[g.weekday] || dayNames[g.weekday] || 'Monday',
    dayOfWeek: g.weekday === 6 ? 0 : g.weekday + 1,
    time: g.time,
    score: g.gapScore,
    confidence: g.gapScore >= 8 ? 'high' : g.gapScore >= 6 ? 'medium' : 'low',
    predictedEngagement: 3 + g.gapScore * 0.5,
    predictedReach: 800 + g.gapScore * 400,
    reasoning: g.reason,
    factors: {
      audienceActivity: g.userPerformance || 7,
      competitionLevel: Math.max(1, g.competitorDensity),
      algorithmFavorability: g.gapScore,
      contentTypeMatch: g.gapScore,
    },
    alternatives: [],
  }));

  const seen = new Set(existing.map((s) => `${s.day}-${s.time}`));
  const merged = [...fromGaps.filter((s) => !seen.has(`${s.day}-${s.time}`)), ...existing];
  return merged.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * Generates a content calendar with optimal timing
 */
export async function generateContentCalendar(
  niche: string,
  platform: string,
  contentTypes: string[],
  topics: string[],
  weeksAhead: number,
  userId: string
): Promise<ContentCalendarSuggestion[]> {
  const calendarPrompt = `Create a ${weeksAhead}-week content calendar:

NICHE: ${niche}
PLATFORM: ${platform}
CONTENT TYPES: ${contentTypes.join(', ')}
AVAILABLE TOPICS: ${topics.join(', ')}

For each week, suggest:
1. 3-5 optimal posting slots
2. Match content type to day/time based on performance patterns
3. Rotate topics strategically
4. Include brief reason for each timing choice
5. Mark priority (high/medium/low)

Consider:
- Different content types perform better at different times
- Spacing between posts
- Variety in content types throughout the week
- Strategic sequencing (e.g., teaser → main content → follow-up)`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: calendarPrompt,
    systemInstruction: "You are a content strategist. Create realistic, varied calendars that maximize engagement through strategic timing.",
  }, userId);

  return parseContentCalendar(response.text || response);
}

/**
 * Gets the single best time to post right now
 */
export async function getBestTimeToPostNow(
  niche: string,
  platform: string,
  contentType: string,
  timezone: string,
  userId: string
): Promise<OptimalTimeSlot | null> {
  const nowPrompt = `What is the BEST time to post RIGHT NOW for:

NICHE: ${niche}
PLATFORM: ${platform}
CONTENT TYPE: ${contentType}
TIMEZONE: ${timezone}
CURRENT TIME: ${new Date().toISOString()}

Provide ONLY the single best upcoming time slot within the next 48 hours.
Include full analysis of why this specific time is optimal.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: nowPrompt,
    systemInstruction: "Be specific and urgent. Focus on the immediate next optimal opportunity.",
  }, userId);

  const slots = parseOptimalTimeSlots(response.text || response);
  return slots.length > 0 ? slots[0] : null;
}

/**
 * Analyzes competitor posting patterns
 */
export async function analyzeCompetitorTiming(
  competitorHandles: string[],
  platform: string,
  daysToAnalyze: number,
  userId: string
): Promise<{
  theirBestTimes: string[];
  theirWorstTimes: string[];
  gapsToExploit: string[];
  recommendation: string;
}> {
  try {
    const niche = typeof localStorage !== 'undefined'
      ? localStorage.getItem('userNiche') || 'marketing'
      : 'marketing';
    const analysis = await analyzeScheduleGaps(niche, platform as Platform, userId, {
      competitorHandles,
      contentType: 'post',
    });
    return {
      theirBestTimes: analysis.gapSlots
        .filter((g) => g.competitorDensity >= 7)
        .map((g) => g.label),
      theirWorstTimes: analysis.aiTimingGaps.slice(0, 5),
      gapsToExploit: analysis.gapSlots.map((g) => `${g.label} — ${g.reason}`),
      recommendation: analysis.recommendation,
    };
  } catch {
    // legacy fallback
  }

  const competitorPrompt = `Analyze posting patterns for competitors on ${platform}:

COMPETITORS: ${competitorHandles.join(', ')}
TIME PERIOD: Last ${daysToAnalyze} days

Based on typical patterns for successful accounts in this space:
1. What times do they usually post?
2. When do they get most engagement?
3. What gaps exist in their schedule?
4. What times should you post to avoid direct competition but still catch their audience?

Provide strategic recommendations for timing your posts relative to theirs.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: competitorPrompt,
    systemInstruction: "You are a competitive intelligence analyst. Identify timing opportunities and gaps in competitor strategies.",
  }, userId);

  return parseCompetitorTiming(response.text || response);
}

// Parser helper functions
function parseWeeklySchedule(
  text: string,
  niche: string,
  platform: string,
  contentType: string,
  timezone: string
): WeeklySchedule {
  const lines = text.split('\n');
  
  const slots = parseOptimalTimeSlots(text);
  
  const worstTimes: string[] = [];
  const worstSection = lines.findIndex(l => l.toLowerCase().includes('worst') || l.toLowerCase().includes('avoid'));
  if (worstSection !== -1) {
    for (let i = worstSection + 1; i < lines.length; i++) {
      if (lines[i].match(/^\d+\./) || lines[i].match(/^-/)) {
        worstTimes.push(lines[i].replace(/^\d+\.\s*|-\s*/, '').trim());
      } else if (lines[i].includes('PEAK') || lines[i].includes('OFF-PEAK')) {
        break;
      }
    }
  }

  const peakActivity: string[] = [];
  const peakSection = lines.findIndex(l => l.toLowerCase().includes('peak'));
  if (peakSection !== -1) {
    const line = lines[peakSection];
    const match = line.match(/:\s*(.+)$/);
    if (match) {
      peakActivity.push(...match[1].split(/[,;]/).map(s => s.trim()));
    }
  }

  return {
    niche,
    platform,
    contentType,
    optimalSlots: slots.length > 0 ? slots : generateDefaultSlots(),
    worstTimes: worstTimes.slice(0, 4),
    timezone,
    peakActivityHours: peakActivity.length > 0 ? peakActivity : ['09:00', '12:00', '18:00'],
    offPeakHours: ['06:00', '14:00', '22:00'],
    seasonalNotes: lines.find(l => l.toLowerCase().includes('seasonal'))?.split(':')[1]?.trim(),
  };
}

function parseOptimalTimeSlots(text: string): OptimalTimeSlot[] {
  const slots: OptimalTimeSlot[] = [];
  const sections = text.split(/\n\n?(?=Slot \d|Time Slot \d|#\d)/i);

  for (const section of sections) {
    const lines = section.split('\n');
    
    // Try to find day and time
    const dayMatch = section.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Pon|Wt|Śr|Cz|Pt|So|Nd)/i);
    const timeMatch = section.match(/(\d{1,2}):(\d{2})/);
    const scoreMatch = section.match(/score[:\s]+(\d)/i);
    
    if (dayMatch && timeMatch) {
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
        nd: 0, pon: 1, wt: 2, śr: 3, cz: 4, pt: 5, so: 6,
      };
      
      const day = dayMatch[1];
      const time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 7;
      
      const reasoningLines = lines.filter(l => 
        l.toLowerCase().includes('because') || 
        l.toLowerCase().includes('reason') || 
        l.toLowerCase().includes('dlaczego') ||
        l.toLowerCase().includes('ponieważ')
      );
      
      slots.push({
        day,
        dayOfWeek: dayMap[day.toLowerCase()] || 1,
        time,
        score,
        confidence: score >= 8 ? 'high' : score >= 6 ? 'medium' : 'low',
        predictedEngagement: 3 + (score * 0.5), // rough estimate
        predictedReach: 1000 + (score * 500),
        reasoning: reasoningLines[0]?.split(':')[1]?.trim() || `Optimal time for ${day}`,
        factors: {
          audienceActivity: Math.min(10, score + 1),
          competitionLevel: Math.max(1, 10 - score),
          algorithmFavorability: score,
          contentTypeMatch: score,
        },
        alternatives: [],
      });
    }
  }

  return slots;
}

function parseContentCalendar(text: string): ContentCalendarSuggestion[] {
  const calendar: ContentCalendarSuggestion[] = [];
  const weeks = text.split(/\n\n?(?=Week \d|Tydzień \d)/i);

  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];
    const suggestions: ContentCalendarSuggestion['suggestions'] = [];
    
    const lines = week.split('\n');
    for (const line of lines) {
      const dayMatch = line.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
      const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
      
      if (dayMatch && timeMatch) {
        suggestions.push({
          day: dayMatch[1],
          time: `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`,
          contentType: 'post',
          topic: 'Strategic content',
          reason: 'Optimal timing based on audience patterns',
          priority: 'medium',
        });
      }
    }

    if (suggestions.length > 0) {
      calendar.push({ week: i + 1, suggestions });
    }
  }

  return calendar.length > 0 ? calendar : generateDefaultCalendar();
}

function parseCompetitorTiming(text: string): {
  theirBestTimes: string[];
  theirWorstTimes: string[];
  gapsToExploit: string[];
  recommendation: string;
} {
  const lines = text.split('\n');
  
  const extractList = (header: string): string[] => {
    const idx = lines.findIndex(l => l.toLowerCase().includes(header.toLowerCase()));
    if (idx === -1) return [];
    const items: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      if (lines[i].match(/^\d+\./) || lines[i].match(/^-/)) {
        items.push(lines[i].replace(/^\d+\.\s*|-\s*/, '').trim());
      } else if (lines[i].trim() && !lines[i].includes(':')) {
        break;
      }
    }
    return items;
  };

  const recommendation = lines.find(l => l.toLowerCase().includes('recommendation') || l.toLowerCase().includes('podsumowanie'))
    ?.split(':')[1]?.trim() || 'Post during their off-peak hours to avoid competition.';

  return {
    theirBestTimes: extractList('best').slice(0, 5),
    theirWorstTimes: extractList('worst').slice(0, 5),
    gapsToExploit: extractList('gap').slice(0, 5),
    recommendation,
  };
}

function generateDefaultSlots(): OptimalTimeSlot[] {
  return [
    {
      day: 'Tuesday',
      dayOfWeek: 2,
      time: '10:00',
      score: 8,
      confidence: 'high',
      predictedEngagement: 5.5,
      predictedReach: 2500,
      reasoning: 'Tuesday morning when audience is active but competition is moderate',
      factors: {
        audienceActivity: 8,
        competitionLevel: 5,
        algorithmFavorability: 8,
        contentTypeMatch: 8,
      },
      alternatives: ['14:00', '19:00'],
    },
    {
      day: 'Wednesday',
      dayOfWeek: 3,
      time: '14:00',
      score: 9,
      confidence: 'high',
      predictedEngagement: 6.2,
      predictedReach: 3000,
      reasoning: 'Wednesday afternoon - peak engagement window',
      factors: {
        audienceActivity: 9,
        competitionLevel: 4,
        algorithmFavorability: 9,
        contentTypeMatch: 9,
      },
      alternatives: ['11:00', '20:00'],
    },
    {
      day: 'Thursday',
      dayOfWeek: 4,
      time: '19:00',
      score: 8,
      confidence: 'medium',
      predictedEngagement: 5.8,
      predictedReach: 2800,
      reasoning: 'Thursday evening when users check social after work',
      factors: {
        audienceActivity: 8,
        competitionLevel: 6,
        algorithmFavorability: 8,
        contentTypeMatch: 8,
      },
      alternatives: ['12:00', '21:00'],
    },
  ];
}

function generateDefaultCalendar(): ContentCalendarSuggestion[] {
  return [
    {
      week: 1,
      suggestions: [
        { day: 'Tuesday', time: '10:00', contentType: 'educational', topic: 'Tips & Tricks', reason: 'High engagement window', priority: 'high' },
        { day: 'Wednesday', time: '14:00', contentType: 'entertainment', topic: 'Behind the scenes', reason: 'Mid-week boost', priority: 'medium' },
        { day: 'Thursday', time: '19:00', contentType: 'engagement', topic: 'Question post', reason: 'Evening discussion time', priority: 'medium' },
      ],
    },
  ];
}

// Storage helpers
const SCHEDULE_CACHE_KEY = STORAGE_KEYS.SCHEDULE_CACHE;

export function cacheScheduleAnalysis(
  niche: string,
  platform: string,
  data: WeeklySchedule
): void {
  if (typeof window === 'undefined') return;
  const cache = JSON.parse(localStorage.getItem(SCHEDULE_CACHE_KEY) || '{}');
  const key = `${niche}-${platform}`;
  cache[key] = { data, timestamp: Date.now() };
  localStorage.setItem(SCHEDULE_CACHE_KEY, JSON.stringify(cache));
}

export function getCachedScheduleAnalysis(
  niche: string,
  platform: string
): WeeklySchedule | null {
  if (typeof window === 'undefined') return null;
  const cache = JSON.parse(localStorage.getItem(SCHEDULE_CACHE_KEY) || '{}');
  const key = `${niche}-${platform}`;
  const entry = cache[key];
  if (!entry) return null;
  // Cache expires after 24 hours
  if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) return null;
  return entry.data;
}

export default {
  analyzeOptimalPostingTimes,
  generateContentCalendar,
  getBestTimeToPostNow,
  analyzeCompetitorTiming,
  cacheScheduleAnalysis,
  getCachedScheduleAnalysis,
};
