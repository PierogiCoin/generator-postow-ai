import { callApi } from './apiClient';
import { FormData, GenerationResult, Platform, ContentType, Tone, BrandVoiceData, ContentLanguage, GenerationType, VisualStyle, AIModel } from '../types';
import { STORAGE_KEYS } from '../utils/storageUtils';
import { composeTextPrompt, composeImagePrompt } from './promptBuilders';
import { DEFAULT_TEXT_MODEL } from '../shared/config/generationConfig';
import { resolveNicheContext } from '../utils/nicheContext';

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
  brandVoice?: BrandVoiceData | null,
  contentLanguage: ContentLanguage = ContentLanguage.Polish
): Promise<WeekContentPlan> {
  const formData: FormData = {
    topic: `<p>${weekTheme}</p><p>Plan tygodniowy: ${contentTypes.join(', ')}</p>`,
    audience: niche,
    tone,
    platform,
    contentType: ContentType.Post,
    visualStyle: VisualStyle.PlatformSpecific,
    generationType: GenerationType.PostWithImage,
    model: AIModel.Flash,
    contentLanguage,
  };

  const { contents, config } = await composeTextPrompt({
    formData,
    brandVoice: brandVoice ?? null,
    userId,
  });

  const userPrompt = `${contents}

TASK: Create a strategic 7-day content plan for the week theme above.
${previousWeeksTopics ? `PREVIOUS TOPICS (avoid repeating): ${previousWeeksTopics.join(', ')}` : ''}

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

Include overall week theme strategy, narrative arc, and cross-promotion opportunities.
Focus on variety, progression, and strategic sequencing.`;

  const response = await callApi("generate-content", {
    model: DEFAULT_TEXT_MODEL,
    contents: userPrompt,
    config,
  }, userId);

  return parseWeekContentPlan(response.text || response, weekTheme, platform);
}

/**
 * Generates full content (text + image prompt) for a specific day
 */
export async function generateFullPostContent(
  dailyPost: DailyPost,
  brandVoice: BrandVoiceData | null,
  platform: Platform,
  userId: string,
  contentLanguage: ContentLanguage = ContentLanguage.Polish
): Promise<DailyPost> {
  const formData: FormData = {
    topic: `<p>${dailyPost.topic}</p>`,
    audience: brandVoice?.niche || '',
    tone: Tone.Casual,
    platform,
    contentType: ContentType.Post,
    visualStyle: VisualStyle.PlatformSpecific,
    generationType: GenerationType.PostWithImage,
    model: AIModel.Flash,
    contentLanguage,
  };

  const { contents, config } = await composeTextPrompt({
    formData,
    brandVoice,
    userId,
  });

  const userPrompt = `${contents}

TASK: Create complete social media content based on the daily brief below.
ANGLE: ${dailyPost.angle}
HOOK TO USE AS OPENING: ${dailyPost.hook}
FORMAT: ${dailyPost.format}
CTA: ${dailyPost.cta}

Generate:
1. COMPLETE POST TEXT (150-300 words, with the hook as opening)
2. IMAGE PROMPT: Detailed AI image generation prompt (if visual format)
3. FINAL HASHTAGS: 8-12 hashtags as array
4. POSTING TIME: Confirm optimal time
5. ENGAGEMENT PREDICTION: Likely comments/questions to prepare for

Make it ready to publish.`;

  const response = await callApi("generate-content", {
    model: DEFAULT_TEXT_MODEL,
    contents: userPrompt,
    config,
  }, userId);

  const parsed = parseFullContent(response.text || response, dailyPost);

  // Compose image prompt via the modular builder if a visual format was requested
  if (parsed.generatedContent?.postText && dailyPost.format !== 'text-only') {
    const nichePack = resolveNicheContext({ userId, brandVoice, audience: formData.audience }).pack;
    const composedImage = composeImagePrompt({
      postText: parsed.generatedContent.postText,
      platform,
      imageStyle: VisualStyle.PlatformSpecific,
      brandVoice,
      userId,
      industryImagePromptPrefix: nichePack?.imagePromptPrefix,
      industryMustShow: nichePack?.imageMustShow,
    });
    parsed.generatedContent.imagePrompt = composedImage.prompt;
  }

  return parsed;
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
    model: DEFAULT_TEXT_MODEL,
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
    model: DEFAULT_TEXT_MODEL,
    contents: repurposePrompt,
    systemInstruction: "You are a content adaptation expert. Maximize content value across platforms through strategic repurposing.",
  }, userId);

  return parseRepurposingSuggestions(response.text || response, targetPlatforms);
}

// Robust parser helpers ------------------------------------------------------

const DAY_NAMES_EN = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES_PL = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
const DAY_SHORT_PL = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];
const DAY_SHORT_EN = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DAY_NAME_TO_INDEX: Record<string, number> = Object.fromEntries(
  [DAY_NAMES_EN, DAY_NAMES_PL, DAY_SHORT_PL, DAY_SHORT_EN].flatMap((names, srcIdx) =>
    names.map((name, i) => [name, i])
  )
);

const VALID_CONTENT_TYPES: DailyPost['contentType'][] = [
  'educational', 'entertaining', 'inspirational', 'promotional', 'community', 'behind-the-scenes'
];
const VALID_FORMATS: DailyPost['format'][] = [
  'carousel', 'single-image', 'video', 'story', 'reel', 'text-only'
];
const VALID_CONFIDENCE: DailyPost['confidence'][] = ['high', 'medium', 'low'];

function tryExtractJson<T>(text: string): T | null {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Some models wrap the JSON in prose; try to find the first `{...}` or `[...]` block.
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeContentType(value: string): DailyPost['contentType'] {
  const lower = value.toLowerCase();
  const match = VALID_CONTENT_TYPES.find((t) => lower.includes(t)) ||
    VALID_CONTENT_TYPES.find((t) => t.includes(lower.replace(/\s+/g, '-')));
  return match || 'educational';
}

function normalizeFormat(value: string): DailyPost['format'] {
  const lower = value.toLowerCase().replace(/\s+/g, '-');
  const map: Record<string, DailyPost['format']> = {
    carousel: 'carousel',
    'single-image': 'single-image',
    image: 'single-image',
    photo: 'single-image',
    video: 'video',
    story: 'story',
    reel: 'reel',
    'text-only': 'text-only',
    text: 'text-only',
  };
  return map[lower] || 'single-image';
}

function normalizeConfidence(value: string): DailyPost['confidence'] {
  const lower = value.toLowerCase();
  return VALID_CONFIDENCE.find((c) => lower.includes(c)) || 'medium';
}

function parseHashtags(value: string): string[] {
  if (!value) return [];
  return value
    .split(/[,#\s]+/)
    .map((h) => h.trim().replace(/^#+/, ''))
    .filter((h) => h.length > 0)
    .slice(0, 12);
}

function extractField(section: string, labels: string[]): string {
  const lines = section.split('\n');
  for (const label of labels) {
    const pattern = new RegExp(
      `^(?:\\s*[-*•])?(?:\\s*\\d+[.):])?\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:=\\-)]*\\s*(.*)$`,
      'i'
    );
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
  }
  return '';
}

function findDayIndex(name: string): number {
  const lower = name.toLowerCase();
  return DAY_NAME_TO_INDEX[lower] ?? -1;
}

function splitIntoDaySections(text: string): { dayIndex: number; section: string }[] {
  const sections: { dayIndex: number; section: string }[] = [];
  const headerPattern = new RegExp(
    `^(?:\\s*[-*•]|\\s*#+)?(?:\\s*(?:(?:Day|Dzień|Dzien)\\s*))?(\\d+|${[...DAY_NAMES_EN, ...DAY_NAMES_PL, ...DAY_SHORT_PL, ...DAY_SHORT_EN].join('|')})[.):)]?(?=\\s|$)`,
    'gim'
  );

  const matches: { index: number; dayIndex: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = headerPattern.exec(text)) !== null) {
    const raw = match[1].toLowerCase();
    const dayIndex = /\d+/.test(raw) ? parseInt(raw, 10) - 1 : findDayIndex(raw);
    if (dayIndex >= 0 && dayIndex <= 6) {
      matches.push({ index: match.index, dayIndex });
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = matches[i + 1]?.index ?? text.length;
    sections.push({
      dayIndex: matches[i].dayIndex,
      section: text.slice(start, end).trim(),
    });
  }

  return sections;
}

export function parseWeekContentPlan(text: string, theme: string, platform: Platform): WeekContentPlan {
  // 1. Try structured JSON first
  const jsonPlan = tryExtractJson<{ days?: unknown[]; posts?: unknown[] }>(text);
  if (jsonPlan) {
    const rawPosts = jsonPlan.days ?? jsonPlan.posts ?? [];
    const parsedPosts: DailyPost[] = rawPosts
      .map((day: unknown) => {
        const d = day as Record<string, unknown>;
        const dayName = String(d.day ?? d.dayOfWeek ?? 'Monday');
        const dayIndex = findDayIndex(dayName);
        const topic = String(d.topic ?? d.subject ?? d.title ?? '').trim();
        if (!topic) return null;
        return {
          day: dayName,
          dayOfWeek: dayIndex >= 0 ? dayIndex : 1,
          contentType: normalizeContentType(String(d.contentType ?? d.type ?? '')),
          topic,
          angle: String(d.angle ?? d.approach ?? 'Standard'),
          hook: String(d.hook ?? d.opening ?? topic),
          format: normalizeFormat(String(d.format ?? d.form ?? '')),
          optimalTime: String(d.optimalTime ?? d.time ?? d.postingTime ?? '14:00'),
          hashtags: Array.isArray(d.hashtags)
            ? d.hashtags.map((h) => String(h).replace(/^#+/, '').trim()).filter(Boolean)
            : parseHashtags(String(d.hashtags ?? d.tags ?? '')),
          cta: String(d.cta ?? d.callToAction ?? d.action ?? 'Comment below!'),
          estimatedEngagement: Number(d.estimatedEngagement ?? d.engagement ?? d.score) || 6,
          confidence: normalizeConfidence(String(d.confidence ?? '')),
        } as DailyPost;
      })
      .filter((p): p is DailyPost => p !== null);

    if (parsedPosts.length > 0) {
      return {
        weekNumber: 1,
        theme,
        contentPillar: theme,
        posts: parsedPosts,
        crossPromotionStrategy: 'Share across stories',
        engagementLoops: [],
      };
    }
  }

  // 2. Robust regex-based section parsing
  const posts: DailyPost[] = [];
  const sections = splitIntoDaySections(text);

  for (const { dayIndex, section } of sections) {
    const topic = extractField(section, ['TOPIC', 'SUBJECT', 'TITLE', 'TEMAT']);
    if (!topic) continue;

    const dayName = DAY_NAMES_EN[dayIndex] ?? 'Monday';
    posts.push({
      day: dayName,
      dayOfWeek: dayIndex,
      contentType: normalizeContentType(extractField(section, ['CONTENT TYPE', 'TYPE', 'TYP'])),
      topic,
      angle: extractField(section, ['ANGLE', 'APPROACH', 'KĄT']) || 'Standard',
      hook: extractField(section, ['HOOK', 'OPENING', 'ZACZEPKA']) || topic,
      format: normalizeFormat(extractField(section, ['FORMAT', 'FORM', 'FORMA'])),
      optimalTime: extractField(section, ['OPTIMAL TIME', 'TIME', 'POSTING', 'GODZINA']) || '14:00',
      hashtags: parseHashtags(extractField(section, ['HASHTAGS', 'TAGS'])),
      cta: extractField(section, ['CTA', 'CALL TO ACTION', 'ACTION']) || 'Comment below!',
      estimatedEngagement: Number(extractField(section, ['ESTIMATED ENGAGEMENT', 'ENGAGEMENT', 'SCORE'])) || 6,
      confidence: normalizeConfidence(extractField(section, ['CONFIDENCE', 'PEWNOŚĆ'])),
    });
  }

  const lines = text.split('\n');
  return {
    weekNumber: 1,
    theme,
    contentPillar: theme,
    posts: posts.length > 0 ? posts : generateDefaultWeekPlan(theme),
    crossPromotionStrategy: lines.find(l => l.toLowerCase().includes('cross'))?.split(':')[1]?.trim() || 'Share across stories',
    engagementLoops: [],
  };
}

export function parseFullContent(text: string, basePost: DailyPost): DailyPost {
  // 1. Try JSON first
  const jsonContent = tryExtractJson<{
    postText?: string;
    completePostText?: string;
    imagePrompt?: string;
    hashtags?: string[] | string;
    postingTime?: string;
  }>(text);
  if (jsonContent) {
    const hashtags = Array.isArray(jsonContent.hashtags)
      ? jsonContent.hashtags.map((h) => String(h).replace(/^#+/, '').trim()).filter(Boolean)
      : parseHashtags(String(jsonContent.hashtags ?? ''));
    return {
      ...basePost,
      generatedContent: {
        postText: jsonContent.postText ?? jsonContent.completePostText ?? basePost.hook,
        imagePrompt: jsonContent.imagePrompt || undefined,
        hashtags: hashtags.length > 0 ? hashtags : basePost.hashtags,
      },
    };
  }

  // 2. Regex-based section extraction
  const findSection = (headers: string[]): string => {
    const pattern = new RegExp(
      `^(?:\\s*[-*•])?(?:\\s*\\d+[.):])?\\s*(?:${headers.join('|')})\\s*[:=\\-)]*\\s*$`,
      'gim'
    );
    const matches: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) matches.push(m);

    for (const match of matches) {
      const start = match.index + match[0].length;
      const nextHeader = /\n(?:\s*[-*•])?(?:\s*\d+[.):])?\s*[A-Z][A-Z\s]{2,}[\s:=\-)]/;
      const remaining = text.slice(start);
      const endMatch = remaining.match(nextHeader);
      const end = endMatch ? start + endMatch.index! : text.length;
      const content = text.slice(start, end).trim();
      if (content) return content;
    }
    return '';
  };

  const postText = findSection(['COMPLETE POST TEXT', 'POST TEXT', 'CONTENT', 'TREŚĆ']) || basePost.hook;
  const imagePrompt = findSection(['IMAGE PROMPT', 'VISUAL', 'IMAGE', 'PROMPT GRAFICZNY']);
  const hashtagLine = findSection(['FINAL HASHTAGS', 'HASHTAGS', 'TAGS']);
  const hashtags = parseHashtags(hashtagLine);

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

export function generateDefaultWeekPlan(theme: string): DailyPost[] {
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
    model: DEFAULT_TEXT_MODEL,
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
