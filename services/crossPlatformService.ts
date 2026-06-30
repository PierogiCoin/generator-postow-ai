import { callApi } from './apiClient';
import { Platform, Tone } from '../types';
import { STORAGE_KEYS } from '../utils/storageUtils';

/**
 * Cross-Platform Command Center Service
 * Unified management across all social platforms
 */

export interface PlatformRecommendation {
  platform: Platform;
  score: number; // 0-100
  reasons: string[];
  estimatedEngagement: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
  };
  bestFormat: 'post' | 'story' | 'reel' | 'thread' | 'carousel' | 'short';
  optimalTiming: string;
  contentAdjustments: string[];
  audienceMatch: number; // 0-100
}

export interface BestPlatformAnalysis {
  content: string;
  recommendations: PlatformRecommendation[];
  topChoice: Platform;
  secondaryChoices: Platform[];
  whyThisPlatform: string;
  adaptationRequired: boolean;
  suggestedModifications: string[];
}

export interface UnifiedMessage {
  id: string;
  platform: Platform;
  type: 'comment' | 'dm' | 'mention' | 'review';
  author: {
    name: string;
    handle: string;
    avatar?: string;
    followerCount?: number;
    isVerified: boolean;
    isFollowing: boolean;
  };
  content: string;
  timestamp: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  priority: 'low' | 'medium' | 'high' | 'critical';
  originalPost?: {
    id: string;
    content: string;
    url: string;
  };
  thread?: UnifiedMessage[]; // for conversation threads
  aiSuggestedReply?: string;
  aiSuggestedReplyVariants?: {
    friendly: string;
    professional: string;
    brief: string;
  };
  engagementOpportunity?: string;
  requiresHumanReview: boolean;
}

export interface CrossPostAdaptation {
  originalPlatform: Platform;
  targetPlatform: Platform;
  originalContent: string;
  adaptedContent: string;
  changes: {
    type: 'shortened' | 'lengthened' | 'tone_adjusted' | 'hashtags_added' | 'hashtags_removed' | 'cta_changed' | 'format_changed';
    description: string;
  }[];
  visualAdjustments: string[];
  characterCount: {
    original: number;
    adapted: number;
  };
  engagementPrediction: {
    original: number;
    adapted: number;
  };
}

export interface PlatformMigrationPlan {
  sourcePlatform: Platform;
  targetPlatform: Platform;
  topPosts: {
    originalId: string;
    content: string;
    performance: {
      likes: number;
      comments: number;
      shares: number;
      engagementRate: number;
    };
    adaptedContent: string;
    adaptationNotes: string[];
    estimatedPerformance: {
      likes: number;
      comments: number;
      shares: number;
    };
    recommendedPostingTime: string;
    hashtags: string[];
  }[];
  migrationStrategy: string;
  contentCalendar: {
    day: number;
    postIndex: number;
    rationale: string;
  }[];
}

/**
 * AI analyzes content and recommends best platform(s)
 */
export async function analyzeBestPlatform(
  content: string,
  contentType: 'text' | 'image' | 'video' | 'carousel',
  tone: Tone,
  targetAudience: string,
  userId: string
): Promise<BestPlatformAnalysis> {
  const analysisPrompt = `Analyze this content and recommend the BEST platform(s) for maximum engagement:

CONTENT:
"${content}"

CONTENT TYPE: ${contentType}
TONE: ${tone}
TARGET AUDIENCE: ${targetAudience}

Analyze for ALL platforms: LinkedIn, Instagram, X/Twitter, TikTok, Facebook, YouTube

For each platform, provide:
1. Suitability score (0-100)
2. Why this platform fits (or doesn't)
3. Estimated engagement metrics
4. Best format for this content
5. Optimal posting time
6. Required content adjustments
7. Audience match percentage

Rank platforms from best to worst.

Provide:
- TOP CHOICE (single best platform)
- SECONDARY CHOICES (2-3 other good options)
- Detailed reasoning
- Required modifications for each platform`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: analysisPrompt,
    systemInstruction: "You are a social media strategist with deep knowledge of each platform's algorithm, audience behavior, and content preferences. Be specific and data-driven in recommendations.",
  }, userId);

  return parseBestPlatformAnalysis(response.text || response, content);
}

/**
 * Adapt content from one platform to another
 */
export async function adaptContentForPlatform(
  originalContent: string,
  sourcePlatform: Platform,
  targetPlatform: Platform,
  tone: Tone,
  userId: string
): Promise<CrossPostAdaptation> {
  const adaptationPrompt = `Adapt this ${sourcePlatform} content for ${targetPlatform}:

ORIGINAL (${sourcePlatform}):
"${originalContent}"

TARGET: ${targetPlatform}
TONE TO MAINTAIN: ${tone}

Create a ${targetPlatform}-native version that:
- Respects ${targetPlatform} character limits and best practices
- Uses ${targetPlatform}-appropriate tone and style
- Includes platform-specific features (hashtags, mentions, formatting)
- Maintains core message and tone
- Optimizes for ${targetPlatform} algorithm

Provide:
1. Adapted content
2. List of specific changes made
3. Visual adjustment suggestions
4. Character count comparison
5. Engagement prediction comparison`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: adaptationPrompt,
  }, userId);

  return parseCrossPostAdaptation(response.text || response, sourcePlatform, targetPlatform, originalContent);
}

/**
 * Generate AI-suggested replies for unified inbox
 */
export async function generateSmartReply(
  message: UnifiedMessage,
  brandTone: Tone,
  context?: string,
  userId?: string
): Promise<{
  friendly: string;
  professional: string;
  brief: string;
  emoji: string;
}> {
  const replyPrompt = `Generate reply options for this ${message.platform} ${message.type}:

FROM: ${message.author.name} (@${message.author.handle})
FOLLOWERS: ${message.author.followerCount || 'unknown'}
VERIFIED: ${message.author.isVerified}
SENTIMENT: ${message.sentiment}
PRIORITY: ${message.priority}

MESSAGE:
"${message.content}"

${message.originalPost ? `ORIGINAL POST: "${message.originalPost.content}"` : ''}
${context ? `CONTEXT: ${context}` : ''}

BRAND TONE: ${brandTone}

Generate 4 reply variants:
1. FRIENDLY - warm, personal, conversational
2. PROFESSIONAL - polished, authoritative
3. BRIEF - short, punchy, under 50 words
4. WITH EMOJI - appropriate emoji usage

Each should:
- Match ${brandTone} brand voice
- Address the specific message
- Encourage further engagement
- Be platform-appropriate for ${message.platform}`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: replyPrompt,
  }, userId || 'anonymous');

  return parseSmartReply(response.text || response);
}

/**
 * Create migration plan for top posts
 */
export async function createMigrationPlan(
  sourcePlatform: Platform,
  targetPlatform: Platform,
  topPosts: { id: string; content: string; likes: number; comments: number; shares: number }[],
  userId: string
): Promise<PlatformMigrationPlan> {
  const migrationPrompt = `Create a migration plan from ${sourcePlatform} to ${targetPlatform}:

TOP PERFORMING POSTS FROM ${sourcePlatform}:
${topPosts.map((post, i) => `
${i + 1}. Post ID: ${post.id}
Content: "${post.content.slice(0, 200)}"
Performance: ${post.likes} likes, ${post.comments} comments, ${post.shares} shares
`).join('\n')}

For each post:
1. Adapt content for ${targetPlatform} native feel
2. Predict performance on ${targetPlatform}
3. Suggest optimal posting time
4. Recommend hashtags
5. Note required adaptations

Also provide:
- Overall migration strategy
- 7-day content calendar for rollout
- Rationale for posting order`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: migrationPrompt,
  }, userId);

  return parseMigrationPlan(response.text || response, sourcePlatform, targetPlatform, topPosts);
}

/**
 * Batch adapt content for multiple platforms
 */
export async function batchAdaptContent(
  content: string,
  sourcePlatform: Platform,
  targetPlatforms: Platform[],
  tone: Tone,
  userId: string
): Promise<Record<Platform, CrossPostAdaptation>> {
  const adaptations: Record<Platform, CrossPostAdaptation> = {} as any;

  for (const target of targetPlatforms) {
    if (target !== sourcePlatform) {
      adaptations[target] = await adaptContentForPlatform(
        content,
        sourcePlatform,
        target,
        tone,
        userId
      );
    }
  }

  return adaptations;
}

// Parser helper functions
function parseBestPlatformAnalysis(text: string, content: string): BestPlatformAnalysis {
  const lines = text.split('\n');
  
  const platforms = Object.values(Platform);
  const recommendations: PlatformRecommendation[] = [];

  for (const platform of platforms) {
    const platformSection = lines.findIndex(l => l.toLowerCase().includes(platform.toLowerCase()));
    if (platformSection === -1) continue;

    const section = lines.slice(platformSection, platformSection + 30);
    const scoreMatch = section.join(' ').match(/(\d+)\s*\/\s*100/) || section.join(' ').match(/score[:\s]+(\d+)/i);
    
    recommendations.push({
      platform,
      score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
      reasons: extractBulletPoints(section.join('\n'), 3),
      estimatedEngagement: {
        likes: 100,
        comments: 20,
        shares: 30,
        reach: 1000,
      },
      bestFormat: 'post',
      optimalTiming: '9:00 AM',
      contentAdjustments: [],
      audienceMatch: 70,
    });
  }

  // Sort by score descending
  recommendations.sort((a, b) => b.score - a.score);

  return {
    content: content.slice(0, 100),
    recommendations,
    topChoice: recommendations[0]?.platform || Platform.Instagram,
    secondaryChoices: recommendations.slice(1, 4).map(r => r.platform),
    whyThisPlatform: `${recommendations[0]?.platform} best matches content type and audience`,
    adaptationRequired: true,
    suggestedModifications: ['Adjust hashtags', 'Optimize for platform algorithm'],
  };
}

function parseCrossPostAdaptation(
  text: string,
  sourcePlatform: Platform,
  targetPlatform: Platform,
  originalContent: string
): CrossPostAdaptation {
  const lines = text.split('\n');
  const adaptedContent = lines.find(l => l.length > 30 && !l.includes(':')) || originalContent;

  return {
    originalPlatform: sourcePlatform,
    targetPlatform,
    originalContent: originalContent.slice(0, 200),
    adaptedContent: adaptedContent.slice(0, 500),
    changes: [
      { type: 'tone_adjusted', description: 'Adjusted for platform tone' },
      { type: 'hashtags_added', description: 'Added platform-specific hashtags' },
    ],
    visualAdjustments: ['Adjust aspect ratio', 'Add platform watermark'],
    characterCount: {
      original: originalContent.length,
      adapted: adaptedContent.length,
    },
    engagementPrediction: {
      original: 100,
      adapted: 120,
    },
  };
}

function parseSmartReply(text: string): {
  friendly: string;
  professional: string;
  brief: string;
  emoji: string;
} {
  const lines = text.split('\n');
  
  const findVariant = (label: string): string => {
    const idx = lines.findIndex(l => l.toLowerCase().includes(label.toLowerCase()));
    if (idx === -1) return 'Thank you for reaching out!';
    // Get next non-empty line that's not a label
    for (let i = idx + 1; i < lines.length; i++) {
      if (lines[i].trim() && !lines[i].includes(':') && lines[i].length > 10) {
        return lines[i].trim();
      }
    }
    return 'Thank you for reaching out!';
  };

  return {
    friendly: findVariant('friendly'),
    professional: findVariant('professional'),
    brief: findVariant('brief'),
    emoji: findVariant('emoji'),
  };
}

function parseMigrationPlan(
  text: string,
  sourcePlatform: Platform,
  targetPlatform: Platform,
  topPosts: { id: string; content: string; likes: number; comments: number; shares: number }[]
): PlatformMigrationPlan {
  const lines = text.split('\n');

  return {
    sourcePlatform,
    targetPlatform,
    topPosts: topPosts.map((post, i) => ({
      originalId: post.id,
      content: post.content.slice(0, 150),
      performance: {
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        engagementRate: 5.5,
      },
      adaptedContent: `Adapted: ${post.content.slice(0, 150)}`,
      adaptationNotes: ['Tone adjusted', 'Hashtags updated'],
      estimatedPerformance: {
        likes: Math.round(post.likes * 0.8),
        comments: Math.round(post.comments * 0.8),
        shares: Math.round(post.shares * 0.8),
      },
      recommendedPostingTime: '10:00 AM',
      hashtags: ['#content', '#marketing'],
    })),
    migrationStrategy: `Strategic migration from ${sourcePlatform} to ${targetPlatform} with phased rollout`,
    contentCalendar: topPosts.map((_, i) => ({
      day: i + 1,
      postIndex: i,
      rationale: `Post ${i + 1} optimized for ${targetPlatform} engagement`,
    })),
  };
}

function extractBulletPoints(text: string, count: number): string[] {
  const bullets: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/)) {
      bullets.push(line.replace(/^[-•*\d.\s]+/, '').trim());
    }
    if (bullets.length >= count) break;
  }
  
  return bullets;
}

// Storage helpers
const CROSS_PLATFORM_CACHE_KEY = STORAGE_KEYS.CROSS_PLATFORM_CACHE;

export function cachePlatformAnalysis(contentHash: string, analysis: BestPlatformAnalysis): void {
  if (typeof window === 'undefined') return;
  const cache = JSON.parse(localStorage.getItem(CROSS_PLATFORM_CACHE_KEY) || '{}');
  cache[contentHash] = { analysis, timestamp: Date.now() };
  localStorage.setItem(CROSS_PLATFORM_CACHE_KEY, JSON.stringify(cache));
}

export function getCachedPlatformAnalysis(contentHash: string): BestPlatformAnalysis | null {
  if (typeof window === 'undefined') return null;
  const cache = JSON.parse(localStorage.getItem(CROSS_PLATFORM_CACHE_KEY) || '{}');
  const entry = cache[contentHash];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 60 * 60 * 1000) return null; // 1h cache
  return entry.analysis;
}

export default {
  analyzeBestPlatform,
  adaptContentForPlatform,
  generateSmartReply,
  createMigrationPlan,
  batchAdaptContent,
  cachePlatformAnalysis,
  getCachedPlatformAnalysis,
};
