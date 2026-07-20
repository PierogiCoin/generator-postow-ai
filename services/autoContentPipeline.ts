import { callApi } from './apiClient';
import { FormData, GenerationResult, Platform, ContentType, Tone } from '../types';
import { STORAGE_KEYS } from '../utils/storageUtils';

/**
 * Auto Content Pipeline Service
 * Generates a week's worth of content in advance
 * Creates cohesive content series with strategic sequencing
 */

export interface WeekContentPlan {
  weekNumber: number;
  theme: string;
  contentPillar: string;
  posts: DailyPost[];
  crossPromotionStrategy: string;
  engagementLoops: string[]; // how posts connect to drive engagement
}

export interface DailyPost {
  day: string;
  dayOfWeek: number; // 0-6
  contentType: 'educational' | 'entertaining' | 'inspirational' | 'promotional' | 'community' | 'behind-the-scenes';
  topic: string;
  angle: string;
  hook: string;
  format: 'carousel' | 'single-image' | 'video' | 'story' | 'reel' | 'text-only';
  optimalTime: string;
  hashtags: string[];
  cta: string;
  estimatedEngagement: number; // 1-10
  confidence: 'high' | 'medium' | 'low';
  dependencies?: string[]; // references to other days' content
  generatedContent?: {
    postText: string;
    imagePrompt?: string;
    hashtags: string[];
  };
}

export interface ContentSeries {
  name: string;
  description: string;
  posts: DailyPost[];
  overallObjective: string;
  targetMetrics: {
    reach: number;
    engagement: number;
    saves: number;
    shares: number;
  };
}

/**
 * Generates a complete week of content
 */
export async function generateWeekContent(
  niche: string,
  platform: Platform,
  contentTypes: ContentType[],
  tone: Tone,
  weekTheme: string,
  userId: string,
  previousWeeksTopics?: string[], // avoid repetition
  brandVoice?: string
): Promise<WeekContentPlan> {
  const weekPrompt = `Create a strategic 7-day content plan for:

NICHE: ${niche}
PLATFORM: ${platform}
TONE: ${tone}
WEEK THEME: ${weekTheme}
${brandVoice ? `BRAND VOICE: ${brandVoice}` : ''}
${previousWeeksTopics ? `PREVIOUS TOPICS (avoid repeating): ${previousWeeksTopics.join(', ')}` : ''}

Create exactly 5-7 posts (one per day, skip weekends if not relevant):

For each day provide:
1. DAY: Day of week
2. CONTENT TYPE: educational | entertaining | inspirational | promotional | community | behind-the-scenes
3. TOPIC: Specific topic for that day
4. ANGLE: Unique angle/approach (e.g., "myth-busting", "step-by-step", "inspirational story")
5. HOOK: First 1-2 sentences that grab attention
6. FORMAT: carousel | single-image | video | story | reel | text-only
7. OPTIMAL TIME: Best posting time for this content type
8. HASHTAGS: 5-8 strategic hashtags
9. CTA: Call-to-action for engagement
10. ESTIMATED ENGAGEMENT: Score 1-10

Include:
- Overall week theme strategy
- How posts connect/create narrative arc
- Cross-promotion opportunities

Focus on variety, progression, and strategic sequencing.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: weekPrompt,
    systemInstruction: "You are a content strategist. Create cohesive, strategic content plans that build engagement throughout the week. Ensure variety in content types while maintaining thematic consistency.",
  }, userId);

  return parseWeekContentPlan(response.text || response, weekTheme, platform);
}

/**
 * Generates full content (text + image prompt) for a specific day
 */
export async function generateFullPostContent(
  dailyPost: DailyPost,
  brandVoice: string,
  platform: Platform,
  userId: string
): Promise<DailyPost> {
  const contentPrompt = `Create complete social media content:

TOPIC: ${dailyPost.topic}
ANGLE: ${dailyPost.angle}
HOOK: ${dailyPost.hook}
FORMAT: ${dailyPost.format}
PLATFORM: ${platform}
${brandVoice ? `BRAND VOICE: ${brandVoice}` : ''}
CTA: ${dailyPost.cta}

Generate:
1. COMPLETE POST TEXT (150-300 words, with the hook as opening)
2. IMAGE PROMPT: Detailed AI image generation prompt (if visual format)
3. FINAL HASHTAGS: 8-12 hashtags as array
4. POSTING TIME: Confirm optimal time
5. ENGAGEMENT PREDICTION: Likely comments/questions to prepare for

Make it ready to publish.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: contentPrompt,
    systemInstruction: "You are an expert social media copywriter. Create engaging, platform-optimized content that sounds authentic and human.",
  }, userId);

  return parseFullContent(response.text || response, dailyPost);
}

/**
 * Creates a content series (multi-part content)
 */
export async function generateContentSeries(
  seriesName: string,
  niche: string,
  platform: Platform,
  numberOfParts: number,
  userId: string
): Promise<ContentSeries> {
  const seriesPrompt = `Create a ${numberOfParts}-part content series:

SERIES NAME: ${seriesName}
NICHE: ${niche}
PLATFORM: ${platform}

Design a cohesive series where:
- Each part builds on the previous
- Strong cliffhangers/hooks between parts
- Progressive value delivery
- Clear narrative arc

For each part provide:
1. Part number
2. Title
3. Key lesson/value
4. Hook for next part
5. Standalone value (in case someone sees only this part)
6. Engagement strategy specific to this part

Include overall series objective and target metrics.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: seriesPrompt,
    systemInstruction: "You are a content series architect. Create binge-worthy, interconnected content that keeps audiences engaged across multiple posts.",
  }, userId);

  return parseContentSeries(response.text || response, seriesName, numberOfParts);
}

/**
 * Suggests content repurposing opportunities
 */
export async function suggestRepurposing(
  existingContent: string,
  sourcePlatform: Platform,
  targetPlatforms: Platform[],
  userId: string
): Promise<{ 
  platform: Platform; 
  format: string; 
  adaptationStrategy: string;
  estimatedPerformance: number;
}[]> {
  const repurposePrompt = `Analyze this content and suggest repurposing:

ORIGINAL CONTENT (${sourcePlatform}):
${existingContent}

TARGET PLATFORMS: ${targetPlatforms.join(', ')}

For each target platform:
1. Best format for this platform
2. How to adapt the content (restructure, length, tone, visual approach)
3. Platform-specific optimization tips
4. Estimated performance score (1-10)
5. Hashtag/content strategy for this platform

Consider algorithm differences and audience expectations.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: repurposePrompt,
    systemInstruction: "You are a content adaptation expert. Maximize content value across platforms through strategic repurposing.",
  }, userId);

  return parseRepurposingSuggestions(response.text || response, targetPlatforms);
}

// Parser helper functions
function parseWeekContentPlan(text: string, theme: string, platform: Platform): WeekContentPlan {
  const lines = text.split('\n');
  const posts: DailyPost[] = [];
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayMap: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  
  // Find sections for each day
  for (const day of days) {
    const dayIdx = lines.findIndex(l => l.includes(day) && (l.includes('DAY') || l.match(/^\d+\.?\s*$/)));
    if (dayIdx === -1) continue;
    
    const sectionEnd = lines.findIndex((l, i) => i > dayIdx && (days.some(d => l.includes(d) && i > dayIdx) || l.includes('CROSS') || l.includes('ENGAGEMENT')));
    const section = lines.slice(dayIdx, sectionEnd === -1 ? dayIdx + 15 : sectionEnd);
    
    const getValue = (keywords: string[]): string => {
      for (const keyword of keywords) {
        const line = section.find(l => l.toLowerCase().includes(keyword.toLowerCase()));
        if (line) {
          return line.split(/[:\-]/).pop()?.trim() || '';
        }
      }
      return '';
    };
    
    const topic = getValue(['TOPIC', 'Subject']);
    if (!topic) continue;
    
    posts.push({
      day,
      dayOfWeek: dayMap[day] || 1,
      contentType: (getValue(['CONTENT TYPE', 'Type']).toLowerCase() as DailyPost['contentType']) || 'educational',
      topic,
      angle: getValue(['ANGLE', 'Approach']) || 'Standard',
      hook: getValue(['HOOK', 'Opening']) || topic,
      format: (getValue(['FORMAT', 'Form']).toLowerCase() as DailyPost['format']) || 'single-image',
      optimalTime: getValue(['OPTIMAL TIME', 'Time', 'Posting']) || '14:00',
      hashtags: getValue(['HASHTAGS', 'Tags']).split(/[,#\s]+/).filter(h => h).slice(0, 8),
      cta: getValue(['CTA', 'Call to action', 'Action']) || 'Comment below!',
      estimatedEngagement: parseInt(getValue(['ENGAGEMENT', 'Score'])) || 6,
      confidence: (getValue(['CONFIDENCE']).toLowerCase() as DailyPost['confidence']) || 'medium',
    });
  }

  return {
    weekNumber: 1,
    theme,
    contentPillar: theme,
    posts: posts.length > 0 ? posts : generateDefaultWeekPlan(theme),
    crossPromotionStrategy: lines.find(l => l.toLowerCase().includes('cross'))?.split(':')[1]?.trim() || 'Share across stories',
    engagementLoops: [],
  };
}

function parseFullContent(text: string, basePost: DailyPost): DailyPost {
  const lines = text.split('\n');
  
  const findSection = (headers: string[]): string => {
    for (const header of headers) {
      const idx = lines.findIndex(l => l.toLowerCase().includes(header.toLowerCase()));
      if (idx !== -1) {
        const content: string[] = [];
        for (let i = idx + 1; i < lines.length; i++) {
          if (lines[i].match(/^[A-Z]/) && lines[i].includes(':')) break;
          if (lines[i].trim()) content.push(lines[i]);
        }
        return content.join('\n').trim();
      }
    }
    return '';
  };

  const postText = findSection(['COMPLETE POST', 'POST TEXT', 'Content']) || basePost.hook;
  const imagePrompt = findSection(['IMAGE PROMPT', 'Visual', 'Image']);
  const hashtagLine = findSection(['HASHTAGS', 'Tags']);
  const hashtags = hashtagLine.split(/[,#\s]+/).filter(h => h.length > 2).slice(0, 12);

  return {
    ...basePost,
    generatedContent: {
      postText: postText || basePost.hook,
      imagePrompt: imagePrompt || undefined,
      hashtags: hashtags.length > 0 ? hashtags : basePost.hashtags,
    },
  };
}

function parseContentSeries(text: string, name: string, parts: number): ContentSeries {
  const posts: DailyPost[] = [];
  const lines = text.split('\n');
  
  for (let i = 1; i <= parts; i++) {
    const partIdx = lines.findIndex(l => l.includes(`Part ${i}`) || l.includes(`${i}.`) || l.includes(`${i})`));
    if (partIdx === -1) continue;
    
    const sectionEnd = lines.findIndex((l, idx) => idx > partIdx && (l.match(/^Part \d/) || l.match(/^\d+[.)/]/) && !l.includes(`${i}`)));
    const section = lines.slice(partIdx, sectionEnd === -1 ? partIdx + 10 : sectionEnd);
    
    const title = section.find(l => l.includes('Title') || l.includes('title'))?.split(':')[1]?.trim() || `Part ${i}`;
    
    posts.push({
      day: `Day ${i}`,
      dayOfWeek: i,
      contentType: 'educational',
      topic: title,
      angle: 'Series',
      hook: section.find(l => l.includes('Hook'))?.split(':')[1]?.trim() || title,
      format: 'carousel',
      optimalTime: '14:00',
      hashtags: [],
      cta: 'Follow for next part!',
      estimatedEngagement: 7,
      confidence: 'high',
    });
  }

  return {
    name,
    description: lines.find(l => l.toLowerCase().includes('description'))?.split(':')[1]?.trim() || name,
    posts: posts.length > 0 ? posts : Array(parts).fill(null).map((_, i) => ({
      day: `Part ${i + 1}`,
      dayOfWeek: i + 1,
      contentType: 'educational',
      topic: `${name} - Part ${i + 1}`,
      angle: 'Series',
      hook: `Part ${i + 1} of ${name}`,
      format: 'carousel',
      optimalTime: '14:00',
      hashtags: [],
      cta: 'Follow for more!',
      estimatedEngagement: 6,
      confidence: 'medium',
    })),
    overallObjective: lines.find(l => l.toLowerCase().includes('objective'))?.split(':')[1]?.trim() || 'Educate and engage',
    targetMetrics: {
      reach: 5000,
      engagement: 8,
      saves: 200,
      shares: 100,
    },
  };
}

function parseRepurposingSuggestions(
  text: string, 
  platforms: Platform[]
): { platform: Platform; format: string; adaptationStrategy: string; estimatedPerformance: number }[] {
  const suggestions: { platform: Platform; format: string; adaptationStrategy: string; estimatedPerformance: number }[] = [];
  
  for (const platform of platforms) {
    const platformSection = text.split('\n\n').find(s => s.toLowerCase().includes(platform.toLowerCase()));
    if (platformSection) {
      const lines = platformSection.split('\n');
      const format = lines.find(l => l.toLowerCase().includes('format'))?.split(':')[1]?.trim() || 'Adapted post';
      const strategy = lines.find(l => l.toLowerCase().includes('adapt') || l.toLowerCase().includes('strategy'))?.split(':')[1]?.trim() || 'Adjust for platform';
      const perfMatch = platformSection.match(/(\d)\/10|score[:\s]+(\d)/);
      
      suggestions.push({
        platform,
        format,
        adaptationStrategy: strategy,
        estimatedPerformance: perfMatch ? parseInt(perfMatch[1] || perfMatch[2]) : 6,
      });
    }
  }
  
  return suggestions.length > 0 ? suggestions : platforms.map(p => ({
    platform: p,
    format: 'Standard post',
    adaptationStrategy: `Adapt for ${p}`,
    estimatedPerformance: 6,
  }));
}

function generateDefaultWeekPlan(theme: string): DailyPost[] {
  return [
    { day: 'Monday', dayOfWeek: 1, contentType: 'educational', topic: `${theme} - Podstawy`, angle: 'Introductory', hook: 'Zaczynamy od podstaw...', format: 'carousel', optimalTime: '10:00', hashtags: ['#monday', '#tips'], cta: 'Zapisz ten post!', estimatedEngagement: 7, confidence: 'high' },
    { day: 'Tuesday', dayOfWeek: 2, contentType: 'entertaining', topic: `${theme} - Ciekawostka`, angle: 'Did you know', hook: 'Czy wiesz, że...', format: 'single-image', optimalTime: '14:00', hashtags: ['#tuesday', '#funfact'], cta: 'Tag friend!', estimatedEngagement: 6, confidence: 'medium' },
    { day: 'Wednesday', dayOfWeek: 3, contentType: 'inspirational', topic: `${theme} - Motywacja`, angle: 'Success story', hook: 'Inspirująca historia...', format: 'video', optimalTime: '19:00', hashtags: ['#wednesday', '#inspiration'], cta: 'Share your story', estimatedEngagement: 8, confidence: 'high' },
    { day: 'Thursday', dayOfWeek: 4, contentType: 'promotional', topic: `${theme} - Oferta`, angle: 'Value showcase', hook: 'Odkryj możliwości...', format: 'carousel', optimalTime: '12:00', hashtags: ['#thursday', '#offer'], cta: 'Link in bio!', estimatedEngagement: 5, confidence: 'medium' },
    { day: 'Friday', dayOfWeek: 5, contentType: 'community', topic: `${theme} - Pytania`, angle: 'Q&A', hook: 'Wasze pytania...', format: 'story', optimalTime: '16:00', hashtags: ['#friday', '#community'], cta: 'Ask below!', estimatedEngagement: 9, confidence: 'high' },
  ];
}

// Storage helpers
const PIPELINE_CACHE_KEY = STORAGE_KEYS.PIPELINE_CACHE;

export function saveWeekPlan(plan: WeekContentPlan): void {
  if (typeof window === 'undefined') return;
  const existing = JSON.parse(localStorage.getItem(PIPELINE_CACHE_KEY) || '[]');
  existing.push({ ...plan, savedAt: new Date().toISOString() });
  localStorage.setItem(PIPELINE_CACHE_KEY, JSON.stringify(existing.slice(-4))); // Keep last 4 weeks
}

export function getSavedWeekPlans(): (WeekContentPlan & { savedAt: string })[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem(PIPELINE_CACHE_KEY) || '[]');
}

/**
 * Suggest weekly content themes based on niche and seasonality
 */
export async function suggestWeekThemes(
  niche: string,
  userId: string
): Promise<string[]> {
  const prompt = `Suggest 5 engaging weekly content themes for a creator in the "${niche}" niche.

Return ONLY a numbered list, one theme per line. Keep each theme to 3-6 words.
Example format:
1. Productivity Hacks for Creators
2. Behind the Scenes Week
3. Trending Tools Showcase`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: prompt,
    systemInstruction: "You are a content strategist. Suggest themes that are timely, engaging, and aligned with the niche. Be concise.",
  }, userId);

  const text = response.text || '';
  return text
    .split('\n')
    .filter((l: string) => /^\s*\d+\./.test(l))
    .map((l: string) => l.replace(/^\s*\d+\.\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5);
}

export default {
  generateWeekContent,
  generateFullPostContent,
  generateContentSeries,
  suggestRepurposing,
  saveWeekPlan,
  getSavedWeekPlans,
  suggestWeekThemes,
};
