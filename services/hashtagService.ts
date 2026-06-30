import { callApi } from './apiClient';
import { STORAGE_KEYS } from '../utils/storageUtils';

/**
 * Smart Hashtag Generator Service
 * Analyzes competitor hashtags and viral content to suggest optimal hashtag sets
 * Categorizes hashtags by purpose: reach vs engagement vs niche
 */

export interface HashtagSet {
  id: string;
  name: string;
  hashtags: string[];
  purpose: 'reach' | 'engagement' | 'niche' | 'viral' | 'branded';
  estimatedReach: 'high' | 'medium' | 'low';
  competitionLevel: 'high' | 'medium' | 'low';
  bestFor: string[]; // content types this works best for
  aiExplanation: string;
}

export interface HashtagAnalysis {
  topic: string;
  platform: string;
  recommendedSets: HashtagSet[];
  trendingHashtags: string[];
  evergreenHashtags: string[];
  competitorHashtags: string[];
  customSuggestions: string[];
  bannedOrShadowbanned: string[]; // hashtags to avoid
  optimalCount: number;
  placementStrategy: string;
}

export interface ViralHashtagData {
  hashtag: string;
  postsCount: string; // e.g. "1.2M posts"
  growthRate: 'rising' | 'stable' | 'falling';
  engagementRate: 'high' | 'medium' | 'low';
  viralPotential: number; // 1-10
  relatedHashtags: string[];
  bestTimeToUse: string[];
}

/**
 * Generates smart hashtag sets based on topic and platform
 */
export async function generateSmartHashtags(
  topic: string,
  platform: string,
  contentType: string,
  userId: string,
  existingHashtags?: string[]
): Promise<HashtagAnalysis> {
  const hashtagPrompt = `Generate strategic hashtag sets for this content:

TOPIC: "${topic}"
PLATFORM: ${platform}
CONTENT TYPE: ${contentType}
${existingHashtags ? `ALREADY USING: ${existingHashtags.join(', ')}` : ''}

Create 5 hashtag sets (8-12 hashtags each) with different strategies:

SET 1 - REACH (Broad discovery): Mix popular + medium hashtags for maximum reach
SET 2 - ENGAGEMENT (Community): Hashtags that encourage comments/saves/shares
SET 3 - NICHE (Targeted): Specific to the exact topic, lower competition
SET 4 - VIRAL (Trending): Riding current trending hashtags
SET 5 - BRANDED/UNIQUE: Create a branded hashtag strategy

For each set provide:
- Name
- 8-12 specific hashtags (no # symbol in output)
- Purpose/strategy
- Estimated reach (high/medium/low)
- Competition level (high/medium/low)
- Best content types for this set
- Why this combination works

Also identify:
- 5 trending hashtags in this niche
- 5 evergreen hashtags that always work
- 3-5 competitor hashtags to consider
- 2-3 hashtags to AVOID (overused/shadowbanned)
- Optimal hashtag count for ${platform}
- Best placement strategy (caption vs comments)`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: hashtagPrompt,
    systemInstruction: "You are a hashtag strategy expert. Research current hashtag trends and provide data-driven recommendations. Be specific about WHY each hashtag works.",
  }, userId);

  return parseHashtagAnalysis(response.text || response, topic, platform);
}

/**
 * Analyzes specific hashtags for performance metrics
 */
export async function analyzeHashtagPerformance(
  hashtags: string[],
  platform: string,
  userId: string
): Promise<ViralHashtagData[]> {
  const analysisPrompt = `Analyze these hashtags for ${platform}:
${hashtags.join(', ')}

For each hashtag, provide:
1. Posts count (estimate like "1.2M posts" or "50K posts")
2. Growth rate: rising | stable | falling
3. Engagement rate: high | medium | low
4. Viral potential score: 1-10
5. 3 related hashtags
6. Best days/times to use this hashtag

Focus on actionable insights. Which are worth using? Which to avoid?`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: analysisPrompt,
    systemInstruction: "You are a social media analytics expert. Provide realistic hashtag performance estimates based on current trends.",
  }, userId);

  return parseHashtagPerformance(response.text || response);
}

/**
 * Suggests hashtags based on competitor analysis
 */
export async function analyzeCompetitorHashtags(
  competitorHandle: string,
  platform: string,
  userId: string
): Promise<{ 
  topHashtags: string[]; 
  strategy: string; 
  patterns: string[];
  recommendations: string[];
}> {
  const competitorPrompt = `Analyze hashtag strategy for competitor: @${competitorHandle} on ${platform}

Based on typical strategies for accounts in this niche, provide:
1. Top 10 hashtags they likely use (based on industry patterns)
2. Their overall hashtag strategy approach
3. 3-4 patterns in their hashtag usage
4. 5 recommendations to adapt their strategy for your account

Note: This is a strategic analysis based on industry best practices for similar accounts.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: competitorPrompt,
    systemInstruction: "You are a competitive intelligence analyst. Provide strategic insights about hashtag usage patterns.",
  }, userId);

  return parseCompetitorAnalysis(response.text || response);
}

/**
 * Generates hashtag sets for A/B testing
 */
export async function generateHashtagABTest(
  topic: string,
  platform: string,
  userId: string
): Promise<{ variantA: string[]; variantB: string[]; hypothesis: string }> {
  const abPrompt = `Create two hashtag variants for A/B testing:

TOPIC: ${topic}
PLATFORM: ${platform}

VARIANT A (Broad Strategy):
- Mix of high-volume + medium hashtags
- Focus on maximum reach
- 8-10 hashtags

VARIANT B (Niche Strategy):
- Lower competition hashtags
- Focus on targeted engagement
- 8-10 hashtags

Provide:
1. VARIANT A hashtags
2. VARIANT B hashtags  
3. HYPOTHESIS: Which will perform better and why

Make them genuinely different strategies, not just random variations.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: abPrompt,
    systemInstruction: "You are an A/B testing strategist. Create meaningful hashtag variations to test different approaches.",
  }, userId);

  return parseABTestVariants(response.text || response);
}

/**
 * Creates seasonal/trending hashtag sets
 */
export async function getSeasonalHashtags(
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'holiday',
  niche: string,
  platform: string,
  userId: string
): Promise<string[]> {
  const seasonalPrompt = `Generate trending hashtags for:

SEASON: ${season}
NICHE: ${niche}
PLATFORM: ${platform}

Provide 15-20 hashtags that combine:
1. Seasonal trending tags
2. Niche-specific tags
3. Season + niche combination tags

Focus on hashtags that are currently rising in popularity.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: seasonalPrompt,
  }, userId);

  return parseSeasonalHashtags(response.text || response);
}

// Parser helper functions
function parseHashtagAnalysis(text: string, topic: string, platform: string): HashtagAnalysis {
  const lines = text.split('\n');
  
  const extractSection = (startPattern: string, endPattern?: string): string[] => {
    const startIdx = lines.findIndex(l => l.toLowerCase().includes(startPattern.toLowerCase()));
    if (startIdx === -1) return [];
    const content: string[] = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (endPattern && lines[i].toLowerCase().includes(endPattern.toLowerCase())) break;
      if (lines[i].includes('SET') || lines[i].includes('---')) break;
      const match = lines[i].match(/[#]?([A-Za-z0-9_]+)/g);
      if (match) content.push(...match.map(m => m.replace(/^#/, '')));
    }
    return [...new Set(content)].slice(0, 15);
  };

  const extractSet = (setNum: number): HashtagSet => {
    const startIdx = lines.findIndex(l => l.includes(`SET ${setNum}`) || l.includes(`SET ${setNum}:`));
    if (startIdx === -1) {
      return createDefaultSet(setNum, topic);
    }
    
    const setLines: string[] = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (lines[i].match(/SET \d/) || lines[i].includes('---')) break;
      setLines.push(lines[i]);
    }
    
    const hashtags: string[] = [];
    const text = setLines.join(' ');
    const matches = text.match(/[#]?([A-Za-z0-9_]+)/g);
    if (matches) {
      hashtags.push(...matches.map(m => m.replace(/^#/, '')).filter(m => m.length > 2));
    }
    
    const purposes = ['reach', 'engagement', 'niche', 'viral', 'branded'] as const;
    
    return {
      id: `set-${setNum}-${Date.now()}`,
      name: ['Discovery/Reach', 'Community Engagement', 'Niche Targeting', 'Viral/Trending', 'Branded Strategy'][setNum - 1],
      hashtags: [...new Set(hashtags)].slice(0, 12),
      purpose: purposes[setNum - 1],
      estimatedReach: setNum <= 2 ? 'high' : setNum === 3 ? 'medium' : 'medium',
      competitionLevel: setNum === 1 ? 'high' : setNum === 3 ? 'low' : 'medium',
      bestFor: ['posts', 'reels', 'stories'].slice(0, setNum === 1 ? 3 : 2),
      aiExplanation: setLines.find(l => l.includes('why') || l.includes('works')) || 'Strategic hashtag combination',
    };
  };

  return {
    topic,
    platform,
    recommendedSets: [1, 2, 3, 4, 5].map(n => extractSet(n)),
    trendingHashtags: extractSection('trending', 'evergreen'),
    evergreenHashtags: extractSection('evergreen', 'competitor'),
    competitorHashtags: extractSection('competitor', 'avoid'),
    customSuggestions: extractSection('recommendations', 'banned'),
    bannedOrShadowbanned: extractSection('avoid', 'optimal').slice(0, 5),
    optimalCount: platform === 'Instagram' ? 8 : platform === 'TikTok' ? 4 : 5,
    placementStrategy: platform === 'Instagram' ? 'First comment for clean caption' : 'In caption for algorithm boost',
  };
}

function parseHashtagPerformance(text: string): ViralHashtagData[] {
  const hashtags: ViralHashtagData[] = [];
  const sections = text.split(/\n\n?(?=[#]?[A-Za-z0-9_]+[:\s])/);

  for (const section of sections) {
    const hashtagMatch = section.match(/^[#]?([A-Za-z0-9_]+)/);
    if (!hashtagMatch) continue;
    
    const hashtag = hashtagMatch[1];
    const postsMatch = section.match(/(\d+[KM]?\+?\s*posts?)/i);
    const growthMatch = section.match(/(rising|stable|falling)/i);
    const engagementMatch = section.match(/(high|medium|low)\s*engagement/i);
    const viralMatch = section.match(/viral potential[:\s]+(\d)/i);
    
    const related: string[] = [];
    const relatedMatch = section.match(/related[:\s]+(.+)/i);
    if (relatedMatch) {
      related.push(...relatedMatch[1].split(/[,;]/).map(s => s.trim().replace(/^#/, '')));
    }

    hashtags.push({
      hashtag,
      postsCount: postsMatch ? postsMatch[1] : 'Unknown',
      growthRate: (growthMatch?.[1].toLowerCase() as any) || 'stable',
      engagementRate: (engagementMatch?.[1].toLowerCase() as any) || 'medium',
      viralPotential: viralMatch ? parseInt(viralMatch[1]) : 5,
      relatedHashtags: related.slice(0, 3),
      bestTimeToUse: ['Tuesday', 'Thursday', 'Saturday'],
    });
  }

  return hashtags.length > 0 ? hashtags : [];
}

function parseCompetitorAnalysis(text: string): { 
  topHashtags: string[]; 
  strategy: string; 
  patterns: string[];
  recommendations: string[];
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

  const topHashtags = extractList('top').slice(0, 10);
  const hashtagsFromText = text.match(/[#]?([A-Za-z0-9_]{3,})/g) || [];
  const allHashtags = [...new Set([...topHashtags, ...hashtagsFromText.map(h => h.replace(/^#/, ''))])].slice(0, 10);

  return {
    topHashtags: allHashtags,
    strategy: lines.find(l => l.toLowerCase().includes('strategy'))?.split(':')[1]?.trim() || 'Mixed approach with branded and trending hashtags',
    patterns: extractList('pattern').slice(0, 4),
    recommendations: extractList('recommendation').slice(0, 5),
  };
}

function parseABTestVariants(text: string): { variantA: string[]; variantB: string[]; hypothesis: string } {
  const lines = text.split('\n');
  
  const extractHashtags = (label: string): string[] => {
    const idx = lines.findIndex(l => l.toLowerCase().includes(label.toLowerCase()));
    if (idx === -1) return [];
    const hashtags: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      if (lines[i].match(/VARIANT|HYPOTHESIS|SET/i)) break;
      const matches = lines[i].match(/[#]?([A-Za-z0-9_]+)/g);
      if (matches) hashtags.push(...matches.map(m => m.replace(/^#/, '')));
    }
    return [...new Set(hashtags)].slice(0, 10);
  };

  const hypothesisLine = lines.find(l => l.toLowerCase().includes('hypothesis'));
  const hypothesis = hypothesisLine 
    ? hypothesisLine.split(':').slice(1).join(':').trim() 
    : 'Variant A focuses on broad reach while Variant B targets niche engagement';

  return {
    variantA: extractHashtags('VARIANT A'),
    variantB: extractHashtags('VARIANT B'),
    hypothesis,
  };
}

function parseSeasonalHashtags(text: string): string[] {
  const matches = text.match(/[#]?([A-Za-z0-9_]+)/g) || [];
  return [...new Set(matches.map(m => m.replace(/^#/, '')))].slice(0, 20);
}

function createDefaultSet(setNum: number, topic: string): HashtagSet {
  const purposes = ['reach', 'engagement', 'niche', 'viral', 'branded'] as const;
  const names = ['Discovery/Reach', 'Community Engagement', 'Niche Targeting', 'Viral/Trending', 'Branded Strategy'];
  
  const baseHashtags: Record<number, string[]> = {
    1: ['content', 'socialmedia', 'digital', 'marketing', 'growth', 'tips', 'strategy', 'online'],
    2: ['community', 'engagement', 'conversation', 'connect', 'share', 'discuss', 'interact', 'join'],
    3: topic.split(' ').concat(['specialist', 'expert', 'pro', 'advanced', 'deepdive']),
    4: ['trending', 'viral', 'now', 'breaking', 'hot', 'latest', 'update', 'news'],
    5: ['brand', 'mybrand', 'official', 'original', 'authentic', 'unique', 'signature'],
  };

  return {
    id: `set-${setNum}-${Date.now()}`,
    name: names[setNum - 1],
    hashtags: baseHashtags[setNum] || baseHashtags[1],
    purpose: purposes[setNum - 1],
    estimatedReach: setNum <= 2 ? 'high' : 'medium',
    competitionLevel: setNum === 1 ? 'high' : setNum === 3 ? 'low' : 'medium',
    bestFor: ['posts'],
    aiExplanation: `Strategic ${purposes[setNum - 1]} hashtag set for ${topic}`,
  };
}

// Storage helpers
const HASHTAG_CACHE_KEY = STORAGE_KEYS.HASHTAG_CACHE;
const HASHTAG_HISTORY_KEY = STORAGE_KEYS.HASHTAG_HISTORY;

export function cacheHashtagAnalysis(topic: string, data: HashtagAnalysis): void {
  if (typeof window === 'undefined') return;
  const cache = JSON.parse(localStorage.getItem(HASHTAG_CACHE_KEY) || '{}');
  cache[topic] = { data, timestamp: Date.now() };
  localStorage.setItem(HASHTAG_CACHE_KEY, JSON.stringify(cache));
}

export function getCachedHashtagAnalysis(topic: string): HashtagAnalysis | null {
  if (typeof window === 'undefined') return null;
  const cache = JSON.parse(localStorage.getItem(HASHTAG_CACHE_KEY) || '{}');
  const entry = cache[topic];
  if (!entry) return null;
  // Cache expires after 24 hours
  if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) return null;
  return entry.data;
}

export function saveHashtagToHistory(hashtags: string[], topic: string): void {
  if (typeof window === 'undefined') return;
  const history = JSON.parse(localStorage.getItem(HASHTAG_HISTORY_KEY) || '[]');
  history.unshift({ hashtags, topic, date: new Date().toISOString() });
  // Keep only last 20 entries
  localStorage.setItem(HASHTAG_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

export function getHashtagHistory(): { hashtags: string[]; topic: string; date: string }[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem(HASHTAG_HISTORY_KEY) || '[]');
}

export default {
  generateSmartHashtags,
  analyzeHashtagPerformance,
  analyzeCompetitorHashtags,
  generateHashtagABTest,
  getSeasonalHashtags,
  cacheHashtagAnalysis,
  getCachedHashtagAnalysis,
  saveHashtagToHistory,
  getHashtagHistory,
};
