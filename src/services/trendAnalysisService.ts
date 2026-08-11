import { callApi } from './apiClient';
import { STORAGE_KEYS } from '../utils/storageUtils';
import { fetchIntelligenceTrends, type IntelligenceTrend } from './intelligenceService';
import { Platform } from '../types';

/**
 * Trend Analysis Service
 * Analyzes current trends in the user's niche and suggests trending topics
 * Proactively notifies about trending topics
 */

export interface TrendData {
  id: string;
  topic: string;
  category: string;
  momentum: 'rising' | 'peak' | 'falling' | 'stable';
  engagementScore: number; // 1-10
  volumeScore: number; // 1-10 (how much content is being created)
  competitionLevel: 'low' | 'medium' | 'high';
  predictedLifespan: 'short' | 'medium' | 'long'; // how long the trend will last
  relatedHashtags: string[];
  bestPlatforms: string[];
  contentIdeas: string[];
  whyItsTrending: string;
  actionUrgency: 'now' | 'soon' | 'watch'; // when to act
  sourceExamples?: string[]; // example viral posts
}

export interface NicheAnalysis {
  niche: string;
  overallSentiment: 'positive' | 'neutral' | 'negative';
  trendingThemes: string[];
  decliningTopics: string[];
  evergreenTopics: string[];
  seasonalOpportunities: string[];
  contentGaps: string[]; // topics with low competition but high interest
  recommendedPostingTimes: {
    platform: string;
    bestDays: string[];
    bestHours: string[];
  }[];
}

export interface TrendAlert {
  id: string;
  trend: TrendData;
  alertType: 'new_trend' | 'trending_up' | 'peak_approaching' | 'seasonal_opportunity';
  message: string;
  suggestedAction: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
}

/**
 * Analyzes current trends in a specific niche/topic
 */
export async function analyzeTrends(
  niche: string,
  platform: string,
  userId: string,
  depth: 'quick' | 'deep' = 'deep'
): Promise<TrendData[]> {
  try {
    const result = await fetchIntelligenceTrends(
      niche,
      platform as Platform,
      userId,
      depth
    );
    if (result.trends?.length) {
      return result.trends.map(mapIntelligenceTrend);
    }
  } catch {
    // fallback poniżej
  }

  return analyzeTrendsLegacy(niche, platform, userId, depth);
}

function mapIntelligenceTrend(t: IntelligenceTrend, index: number): TrendData {
  return {
    id: `trend_${Date.now()}_${index}`,
    topic: t.topic,
    category: t.category || 'general',
    momentum: t.momentum,
    engagementScore: t.engagementScore,
    volumeScore: t.volumeScore,
    competitionLevel: t.competitionLevel,
    predictedLifespan: t.predictedLifespan,
    relatedHashtags: t.relatedHashtags || [],
    bestPlatforms: t.bestPlatforms || [],
    contentIdeas: t.contentIdeas || [],
    whyItsTrending: t.contentGap
      ? `${t.whyItsTrending} | Luka: ${t.contentGap}`
      : t.whyItsTrending,
    actionUrgency: t.actionUrgency,
  };
}

async function analyzeTrendsLegacy(
  niche: string,
  platform: string,
  userId: string,
  depth: 'quick' | 'deep' = 'deep'
): Promise<TrendData[]> {
  const trendPrompt = `Analyze current social media trends for the niche: "${niche}" on ${platform}.

Provide 5-7 trending topics with detailed analysis:

For each trend, provide:
1. TOPIC NAME: Clear, specific trend name
2. MOMENTUM: rising | peak | falling | stable
3. ENGAGEMENT SCORE: 1-10 (how engaging is content about this)
4. VOLUME SCORE: 1-10 (how much content is being created)
5. COMPETITION: low | medium | high
6. LIFESPAN: short (days) | medium (weeks) | long (months)
7. RELATED HASHTAGS: 5 relevant hashtags
8. BEST PLATFORMS: which platforms this trend works best on
9. CONTENT IDEAS: 3 specific content ideas for this trend
10. WHY TRENDING: brief explanation
11. ACTION URGENCY: now (act immediately) | soon (this week) | watch (monitor)

Focus on actionable trends the user can capitalize on NOW. Include both broad trends and micro-trends.

Format as structured data that can be parsed.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: trendPrompt,
    systemInstruction: "You are a social media trend analyst with access to current data. Provide specific, actionable trend insights. Be realistic - not everything is 'trending'. Focus on genuine opportunities.",
  }, userId);

  return parseTrendData(response.text || response);
}

/**
 * Performs deep niche analysis including sentiment, gaps, and opportunities
 */
export async function analyzeNiche(
  niche: string,
  platforms: string[],
  userId: string
): Promise<NicheAnalysis> {
  const nichePrompt = `Perform a comprehensive niche analysis for: "${niche}"

Platforms to consider: ${platforms.join(', ')}

Provide analysis of:
1. OVERALL SENTIMENT: positive | neutral | negative (tone of conversations)
2. TRENDING THEMES: 5 broader themes currently popular
3. DECLINING TOPICS: 3 topics losing popularity (avoid these)
4. EVERGREEN TOPICS: 5 topics that always work in this niche
5. SEASONAL OPPORTUNITIES: Upcoming seasonal/timely opportunities
6. CONTENT GAPS: 3 topics with high interest but LOW competition (golden opportunities)
7. POSTING TIMES: Best days and hours for each platform

Be specific and actionable. Focus on data-driven insights.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: nichePrompt,
    systemInstruction: "You are a niche market research expert. Provide honest, realistic analysis - not everything is positive. Identify real opportunities and threats.",
  }, userId);

  return parseNicheAnalysis(response.text || response, niche);
}

/**
 * Generates personalized trend alerts for a user
 */
export async function generateTrendAlerts(
  niche: string,
  pastTrends: TrendData[],
  userId: string
): Promise<TrendAlert[]> {
  const alertPrompt = `Based on trend analysis for "${niche}", generate personalized alerts.

Past trends we're tracking: ${pastTrends.map(t => t.topic).join(', ')}

Generate 2-3 alerts:
- NEW TREND: Something just started trending
- TRENDING UP: Existing trend gaining momentum  
- PEAK APPROACHING: Trend about to peak (act now!)
- SEASONAL OPPORTUNITY: Time-sensitive seasonal trend

For each alert:
1. ALERT TYPE
2. TREND TOPIC
3. MESSAGE: Clear, actionable message (max 100 chars)
4. SUGGESTED ACTION: What to do specifically
5. PRIORITY: high | medium | low

Make alerts genuinely useful and urgent when appropriate.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: alertPrompt,
    systemInstruction: "You are an alert system. Be concise and action-oriented. Only alert on genuinely important changes.",
  }, userId);

  return parseTrendAlerts(response.text || response);
}

/**
 * Suggests content topics based on trends and user's history
 */
export async function suggestTrendingTopics(
  niche: string,
  userTopics: string[],
  platform: string,
  userId: string
): Promise<{ topic: string; relevance: number; trendData: TrendData }[]> {
  const suggestionPrompt = `Suggest trending content topics for a creator in the "${niche}" niche on ${platform}.

User's past topics (for context): ${userTopics.join(', ')}

Suggest 5 topics that:
1. Are currently trending or rising
2. Fit the user's niche
3. Haven't been covered by the user yet (or new angle)
4. Have good engagement potential
5. Are actionable within 1-2 days

For each:
- Topic name
- Relevance score 1-10
- Brief trend context
- Why it fits this niche
- Suggested angle/approach`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: suggestionPrompt,
    systemInstruction: "You are a content strategist. Suggest topics that balance trending potential with the user's specific niche. Be specific and creative.",
  }, userId);

  return parseTopicSuggestions(response.text || response);
}

// Helper parsing functions
function parseTrendData(text: string): TrendData[] {
  const trends: TrendData[] = [];
  const sections = text.split(/\n\n?(?=TOPIC|Trend \d|#\d)/i);

  for (const section of sections) {
    if (!section.trim()) continue;

    const lines = section.split('\n');
    const getValue = (patterns: string[]): string => {
      for (const pattern of patterns) {
        // Matches: "TOPIC NAME: value", "**TOPIC NAME**: value", "1. TOPIC NAME - value"
        const regex = new RegExp(`^\\s*(?:\\d+\\.?)?\\s*\\*?\\b${pattern.replace(/\s+/g, '\\s*')}\\b\\*?\\s*[:\\-]\\s*(.+)$`, 'i');
        const match = lines.find(l => regex.test(l));
        if (match) {
          return (match.match(regex)?.[1] ?? '').trim();
        }
      }
      return '';
    };

    const getList = (patterns: string[]): string[] => {
      const value = getValue(patterns);
      if (!value) return [];
      return value.split(/[,;]/).map(s => s.trim()).filter(s => s && !s.match(/^\d+\./));
    };

    const topic = getValue(['TOPIC NAME', 'TOPIC', 'Trend']) || 'Unnamed Trend';
    
    if (topic && topic !== 'Unnamed Trend') {
      trends.push({
        id: `trend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        topic,
        category: 'trending',
        momentum: (getValue(['MOMENTUM']).toLowerCase() as TrendData['momentum']) || 'stable',
        engagementScore: parseInt(getValue(['ENGAGEMENT SCORE'])) || 5,
        volumeScore: parseInt(getValue(['VOLUME SCORE'])) || 5,
        competitionLevel: (getValue(['COMPETITION']).toLowerCase() as TrendData['competitionLevel']) || 'medium',
        predictedLifespan: (getValue(['LIFESPAN']).toLowerCase() as TrendData['predictedLifespan']) || 'medium',
        relatedHashtags: getList(['RELATED HASHTAGS', 'HASHTAGS']),
        bestPlatforms: getList(['BEST PLATFORMS', 'PLATFORMS']),
        contentIdeas: getList(['CONTENT IDEAS', 'IDEAS']),
        whyItsTrending: getValue(['WHY TRENDING', "WHY IT'S TRENDING"]) || 'Growing interest in this area',
        actionUrgency: (getValue(['ACTION URGENCY', 'URGENCY']).toLowerCase() as TrendData['actionUrgency']) || 'soon',
      });
    }
  }

  return trends.length > 0 ? trends : generateDefaultTrends();
}

function parseNicheAnalysis(text: string, niche: string): NicheAnalysis {
  const lines = text.split('\n');
  const getSection = (header: string): string[] => {
    const startIdx = lines.findIndex(l => l.toLowerCase().includes(header.toLowerCase()));
    if (startIdx === -1) return [];
    const content: string[] = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      // Stop if we hit another section header (all-caps word followed by colon or standalone)
      if (/^\s*(?:\d+\.)?\s*[A-Z][A-Z\s]+[:\-]?\s*$/.test(lines[i])) break;
      if (lines[i].match(/^\d+\./) || lines[i].startsWith('-')) {
        content.push(lines[i].replace(/^\d+\.\s*|-\s*/, '').trim());
      } else if (lines[i].trim() && !lines[i].match(/^\s*(?:\d+\.|[-*])/)) {
        // Continue if empty line or list item, break on other text that might be new section
        if (lines[i].trim().length > 0 && content.length > 0) break;
      }
    }
    return content.filter(s => s);
  };

  const getSentiment = (): 'positive' | 'neutral' | 'negative' => {
    const line = lines.find(l => l.toLowerCase().includes('sentiment'));
    if (line?.includes('positive')) return 'positive';
    if (line?.includes('negative')) return 'negative';
    return 'neutral';
  };

  return {
    niche,
    overallSentiment: getSentiment(),
    trendingThemes: getSection('TRENDING THEMES').slice(0, 5),
    decliningTopics: getSection('DECLINING TOPICS').slice(0, 3),
    evergreenTopics: getSection('EVERGREEN TOPICS').slice(0, 5),
    seasonalOpportunities: getSection('SEASONAL').slice(0, 3),
    contentGaps: getSection('CONTENT GAPS').slice(0, 3),
    recommendedPostingTimes: [
      { platform: 'Instagram', bestDays: ['Tuesday', 'Wednesday', 'Thursday'], bestHours: ['10:00', '14:00', '19:00'] },
      { platform: 'TikTok', bestDays: ['Tuesday', 'Thursday', 'Friday'], bestHours: ['12:00', '16:00', '20:00'] },
    ],
  };
}

function parseTrendAlerts(text: string): TrendAlert[] {
  const alerts: TrendAlert[] = [];
  const sections = text.split(/\n\n?(?=ALERT|Alert \d)/i);

  for (const section of sections) {
    if (!section.trim()) continue;
    
    const lines = section.split('\n');
    const getValue = (patterns: string[]): string => {
      for (const pattern of patterns) {
        const re = new RegExp(`^\\s*(?:\\d+\\.?)?\\s*\\*?\\b${pattern.replace(/\s+/g, '\\s*')}\\b\\*?\\s*[:\\-]\\s*(.+)$`, 'i');
        const match = lines.find(l => re.test(l));
        if (match) {
          return (match.match(re)?.[1] ?? '').trim();
        }
      }
      return '';
    };

    const alertType = (getValue(['ALERT TYPE', 'TYPE']).toLowerCase().replace(/\s+/g, '_') as TrendAlert['alertType']) || 'new_trend';
    const topic = getValue(['TREND TOPIC', 'TOPIC']) || 'New Trend Alert';

    if (topic) {
      alerts.push({
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        trend: {
          id: `trend-${Date.now()}`,
          topic,
          category: 'alert',
          momentum: 'rising',
          engagementScore: 7,
          volumeScore: 6,
          competitionLevel: 'medium',
          predictedLifespan: 'medium',
          relatedHashtags: [],
          bestPlatforms: [],
          contentIdeas: [],
          whyItsTrending: getValue(['WHY']),
          actionUrgency: alertType.includes('peak') ? 'now' : 'soon',
        },
        alertType,
        message: getValue(['MESSAGE']) || `${topic} is trending!`,
        suggestedAction: getValue(['SUGGESTED ACTION', 'ACTION']) || 'Create content about this trend',
        priority: (getValue(['PRIORITY']).toLowerCase() as TrendAlert['priority']) || 'medium',
        createdAt: new Date(),
      });
    }
  }

  return alerts.length > 0 ? alerts : [];
}

function parseTopicSuggestions(text: string): { topic: string; relevance: number; trendData: TrendData }[] {
  const suggestions: { topic: string; relevance: number; trendData: TrendData }[] = [];
  const sections = text.split(/\n\n?(?=Topic \d|#\d)/i);

  for (const section of sections) {
    const lines = section.split('\n');
    const topicLine = lines.find(l => l.match(/^\d+\./) || l.includes('Topic'));
    
    if (topicLine) {
      const topic = topicLine.replace(/^\d+\.\s*|-\s*/, '').trim();
      const relevanceMatch = section.match(/relevance[:\s]+(\d)/i);
      const relevance = relevanceMatch ? parseInt(relevanceMatch[1]) : 7;

      suggestions.push({
        topic,
        relevance,
        trendData: {
          id: `suggestion-${Date.now()}`,
          topic,
          category: 'suggested',
          momentum: 'rising',
          engagementScore: relevance,
          volumeScore: 6,
          competitionLevel: 'medium',
          predictedLifespan: 'medium',
          relatedHashtags: [],
          bestPlatforms: [],
          contentIdeas: [topic],
          whyItsTrending: 'Suggested based on current trends',
          actionUrgency: 'soon',
        },
      });
    }
  }

  return suggestions.length > 0 ? suggestions : [];
}

function generateDefaultTrends(): TrendData[] {
  return [
    {
      id: 'trend-default-1',
      topic: 'Behind-the-Scenes Content',
      category: 'evergreen',
      momentum: 'stable',
      engagementScore: 8,
      volumeScore: 7,
      competitionLevel: 'medium',
      predictedLifespan: 'long',
      relatedHashtags: ['#BehindTheScenes', '#BTS', '#Process'],
      bestPlatforms: ['Instagram', 'TikTok'],
      contentIdeas: ['Show your workspace', 'Share your creative process', 'Day-in-the-life'],
      whyItsTrending: 'Authenticity and transparency are highly valued',
      actionUrgency: 'soon',
    },
    {
      id: 'trend-default-2',
      topic: 'Educational Carousels',
      category: 'trending',
      momentum: 'rising',
      engagementScore: 9,
      volumeScore: 8,
      competitionLevel: 'high',
      predictedLifespan: 'long',
      relatedHashtags: ['#LearnOnInstagram', '#Tips', '#Educational'],
      bestPlatforms: ['Instagram', 'LinkedIn'],
      contentIdeas: ['How-to guides', 'Quick tips', 'Myth-busting'],
      whyItsTrending: 'Value-driven content saves and shares well',
      actionUrgency: 'now',
    },
  ];
}

// Storage helpers for client-side persistence
const STORAGE_KEY = STORAGE_KEYS.TREND_CACHE;
const ALERTS_STORAGE_KEY = STORAGE_KEYS.TREND_ALERTS;

export function cacheTrendAnalysis(niche: string, platform: string, data: TrendData[]): void {
  if (typeof window === 'undefined') return;
  const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const key = `${niche}__${platform}`;
  cache[key] = { data, timestamp: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

export function getCachedTrendAnalysis(niche: string, platform: string): TrendData[] | null {
  if (typeof window === 'undefined') return null;
  const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const key = `${niche}__${platform}`;
  const entry = cache[key];
  if (!entry) return null;
  // Cache expires after 6 hours
  if (Date.now() - entry.timestamp > 6 * 60 * 60 * 1000) return null;
  return entry.data;
}

export function storeAlerts(alerts: TrendAlert[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

export function getStoredAlerts(): TrendAlert[] {
  if (typeof window === 'undefined') return [];
  const alerts = JSON.parse(localStorage.getItem(ALERTS_STORAGE_KEY) || '[]');
  return alerts.map((a: TrendAlert) => ({ ...a, createdAt: new Date(a.createdAt) }));
}

export default {
  analyzeTrends,
  analyzeNiche,
  generateTrendAlerts,
  suggestTrendingTopics,
  cacheTrendAnalysis,
  getCachedTrendAnalysis,
  storeAlerts,
  getStoredAlerts,
};
