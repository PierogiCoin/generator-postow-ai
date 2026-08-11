import { callApi } from './apiClient';
import { Platform, Tone } from '../types';
import { STORAGE_KEYS } from '../utils/storageUtils';

/**
 * Content Repurposing Engine
 * Transform single content piece into multiple platform-optimized variants
 */

export interface RepurposedContent {
  platform: Platform;
  format: 'post' | 'thread' | 'story' | 'reel_script' | 'carousel' | 'short' | 'long_form';
  content: string;
  hashtags: string[];
  visualSuggestions: string;
  characterCount: number;
  estimatedEngagement: 'high' | 'medium' | 'low';
  bestTimeToPost: string;
}

export interface RepurposingPlan {
  sourceContent: string;
  sourceFormat: string;
  targetPlatforms: Platform[];
  repurposedContent: RepurposedContent[];
  contentSeries: {
    episodeNumber: number;
    hook: string;
    content: string;
    cliffhanger?: string;
  }[];
  crossPromotionStrategy: string;
  contentCalendar: {
    day: number;
    platform: Platform;
    content: string;
    format: string;
  }[];
}

export interface VideoToSocialResult {
  keyMoments: {
    timestamp: string;
    quote: string;
    visualDescription: string;
    socialPost: string;
  }[];
  audiogramScripts: {
    hook: string;
    waveformStyle: string;
    captionStyle: string;
  }[];
  carouselSlides: {
    slideNumber: number;
    headline: string;
    bulletPoints: string[];
    visualPrompt: string;
  }[];
}

export interface PodcastToContentResult {
  quoteCards: {
    quote: string;
    speaker: string;
    context: string;
    visualStyle: string;
  }[];
  keyTakeaways: {
    title: string;
    explanation: string;
    actionable: string;
  }[];
  discussionThreads: {
    platform: string;
    hook: string;
    points: string[];
    conclusion: string;
  }[];
}

export interface ThreadGeneratorResult {
  thread: {
    number: number;
    content: string;
    isHook: boolean;
    visualSuggestion?: string;
  }[];
  engagementPredictions: {
    retweets: number;
    likes: number;
    replies: number;
  };
  bestPostingTime: string;
}

/**
 * Transform long-form content into multiple platform variants
 */
export async function generateRepurposingPlan(
  sourceContent: string,
  sourceFormat: 'blog' | 'video' | 'podcast' | 'long_post' | 'webinar',
  targetPlatforms: Platform[],
  tone: Tone,
  userId: string
): Promise<RepurposingPlan> {
  const repurposingPrompt = `Transform this ${sourceFormat} into a complete cross-platform content strategy:

SOURCE CONTENT:
${sourceContent}

TARGET PLATFORMS: ${targetPlatforms.join(', ')}
TONE: ${tone}

Create a comprehensive repurposing plan:

## 1. PLATFORM-SPECIFIC ADAPTATIONS

For each platform, create optimized content:

**LinkedIn** - professional, thought leadership, longer form
**Twitter/X** - thread (5-10 tweets), punchy hooks, conversation starter
**Instagram** - carousel post (5-10 slides), story sequence, reel script (60s)
**TikTok** - viral hook (3s), trending sound suggestion, text overlay script
**Facebook** - community-focused, discussion prompt
**YouTube Shorts** - vertical video script, title, description
**Pinterest** - pin description with keywords, visual concept

## 2. CONTENT SERIES BREAKDOWN
If content is long/complex, break into series:
- Episode 1: Hook + Setup
- Episode 2: Main insight
- Episode 3: Practical application
- Episode 4: Case study/Example
- Episode 5: Conclusion + CTA

## 3. CROSS-PROMOTION STRATEGY
How to link these pieces together across platforms

## 4. CONTENT CALENDAR
5-day rollout plan with timing

Format each platform adaptation with:
- Platform name
- Format (post/thread/story/reel_script/carousel/short/long_form)
- Optimized content
- 3-5 platform-specific hashtags
- Visual suggestions
- Character count
- Estimated engagement (high/medium/low)
- Best posting time for this platform`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: repurposingPrompt,
    systemInstruction: "You are a content repurposing expert. You know how to adapt content for maximum impact on each social platform while maintaining the core message. Create native-feeling content for each platform.",
  }, userId);

  return parseRepurposingPlan(response.text || response, sourceContent, sourceFormat, targetPlatforms);
}

/**
 * Convert video content into social posts
 */
export async function videoToSocialContent(
  videoTranscript: string,
  videoDuration: string,
  keyTopics: string[],
  platform: Platform,
  userId: string
): Promise<VideoToSocialResult> {
  const videoPrompt = `Extract social media content from this video:

VIDEO TRANSCRIPT:
${videoTranscript}

Duration: ${videoDuration}
Key Topics: ${keyTopics.join(', ')}
Target Platform: ${platform}

## 1. KEY MOMENTS EXTRACTION
Find 3-5 most quotable/shareable moments:
- Timestamp (approximate)
- The quote
- Visual description for that moment
- Social post based on this moment

## 2. AUDIOGRAM SCRIPTS
Create 3 audiogram variations:
- Hook (first 3 seconds grab attention)
- Waveform style suggestion
- Caption style (text overlay)

## 3. CAROUSEL BREAKDOWN
If converting to carousel (5-10 slides):
- Slide 1: Headline + Hook
- Slides 2-4: Key points
- Last slide: CTA
Include visual prompts for each slide`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: videoPrompt,
  }, userId);

  return parseVideoToSocial(response.text || response);
}

/**
 * Transform podcast into social content
 */
export async function podcastToSocialContent(
  transcript: string,
  episodeTitle: string,
  speakers: string[],
  duration: string,
  userId: string
): Promise<PodcastToContentResult> {
  const podcastPrompt = `Convert this podcast into social media assets:

EPISODE: "${episodeTitle}"
SPEAKERS: ${speakers.join(', ')}
DURATION: ${duration}

TRANSCRIPT EXCERPTS:
${transcript}

## 1. QUOTE CARDS
Extract 5 most powerful quotes:
- The quote (verbatim)
- Speaker name
- Context (what was discussed)
- Visual style suggestion (background, font, colors)

## 2. KEY TAKEAWAYS
3-5 actionable takeaways:
- Title
- Brief explanation
- Actionable step

## 3. DISCUSSION THREADS
Create Twitter/LinkedIn discussion threads:
- Platform
- Hook (first tweet/post)
- 5-7 supporting points
- Strong conclusion/CTA`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: podcastPrompt,
  }, userId);

  return parsePodcastContent(response.text || response);
}

/**
 * Generate Twitter/X thread from long-form content
 */
export async function generateThread(
  sourceContent: string,
  threadLength: number, // 3, 5, 7, 10 tweets
  includeVisuals: boolean,
  tone: Tone,
  userId: string
): Promise<ThreadGeneratorResult> {
  const threadPrompt = `Create a viral Twitter/X thread from this content:

SOURCE:
${sourceContent}

THREAD LENGTH: ${threadLength} tweets
TONE: ${tone}
VISUALS: ${includeVisuals ? 'Include visual suggestions' : 'Text only'}

## THREAD STRUCTURE:

Tweet 1 (HOOK): Must be attention-grabbing, make people stop scrolling
Tweet 2-3: Setup the problem/insight
Tweet 4-${threadLength - 2}: Main content, broken into digestible pieces
Tweet ${threadLength - 1}: Key takeaway or surprising insight
Tweet ${threadLength}: Strong CTA (reply, retweet, follow, link in bio)

RULES:
- Each tweet max 280 characters
- Use line breaks for readability
- Include engagement triggers (questions, hot takes, contrarian views)
- Make tweet 1 standalone powerful
- Build curiosity between tweets
${includeVisuals ? '- Suggest visual for tweets that need illustration' : ''}

## ENGAGEMENT PREDICTION:
Predict: retweets, likes, replies (approximate ranges)`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: threadPrompt,
    systemInstruction: "You are a Twitter expert who knows how to write viral threads. Make each tweet punchy and standalone while building a cohesive narrative.",
  }, userId);

  return parseThreadResult(response.text || response);
}

/**
 * Auto-resize and adapt content for different formats
 */
export async function autoResizeContent(
  originalContent: string,
  sourcePlatform: Platform,
  targetPlatform: Platform,
  maxLength: number,
  userId: string
): Promise<{
  resized: string;
  characterCount: number;
  cutContent: string[];
  addedContent: string[];
  emojiAdded: boolean;
}> {
  const resizePrompt = `Adapt this ${sourcePlatform} content for ${targetPlatform}:

ORIGINAL (${sourcePlatform}):
${originalContent}

TARGET: ${targetPlatform}
MAX LENGTH: ${maxLength} characters

CONSIDER ${targetPlatform} BEST PRACTICES:
- Character limits
- Tone expectations
- Emoji usage
- Hashtag culture
- CTA styles

Provide:
1. Resized content optimized for ${targetPlatform}
2. What was cut (if anything)
3. What was added (if anything)
4. Whether emojis were added/removed`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: resizePrompt,
  }, userId);

  const text = response.text || response;
  
  return {
    resized: text.split('\n')[0] || originalContent.slice(0, maxLength),
    characterCount: (text.split('\n')[0] || '').length,
    cutContent: text.toLowerCase().includes('cut') ? ['Content condensed'] : [],
    addedContent: text.toLowerCase().includes('added') ? ['Platform-specific optimizations'] : [],
    emojiAdded: targetPlatform === Platform.Instagram || targetPlatform === Platform.TikTok,
  };
}

/**
 * Generate LinkedIn document/carousel content
 */
export async function generateLinkedInCarousel(
  topic: string,
  slideCount: number,
  targetAudience: string,
  userId: string
): Promise<{
  title: string;
  slides: {
    number: number;
    headline: string;
    content: string;
    visualDescription: string;
  }[];
  hashtags: string[];
  engagementHook: string;
}> {
  const carouselPrompt = `Create a LinkedIn PDF carousel (document post):

TOPIC: ${topic}
SLIDES: ${slideCount}
TARGET AUDIENCE: ${targetAudience}

## STRUCTURE:
Slide 1: Hook slide - bold claim/question that stops the scroll
Slide 2: Problem/Context
Slide 3-${slideCount - 1}: Main insights (one insight per slide, visual)
Slide ${slideCount}: CTA slide - "Follow for more" + engagement prompt

Each slide should be:
- Scannable (bullet points, not paragraphs)
- Visual (describe what image/chart to include)
- Value-packed

Also provide:
- Carousel title
- 3-5 hashtags
- Hook for the caption`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: carouselPrompt,
  }, userId);

  const text = response.text || response;
  const lines = text.split('\n');

  return {
    title: lines.find((l: string) => l.toLowerCase().includes('title'))?.split(':')[1]?.trim() || topic,
    slides: Array.from({ length: slideCount }, (_, i) => ({
      number: i + 1,
      headline: `Slide ${i + 1}`,
      content: lines.slice(i * 5, (i + 1) * 5).join('\n'),
      visualDescription: 'Chart or illustration',
    })),
    hashtags: ['#LinkedIn', '#Business', '#Growth'],
    engagementHook: lines.find((l: string) => l.toLowerCase().includes('hook')) || 'Check this out 👇',
  };
}

// Parser helper functions
function parseRepurposingPlan(
  text: string,
  sourceContent: string,
  sourceFormat: string,
  targetPlatforms: Platform[]
): RepurposingPlan {
  const lines = text.split('\n');
  
  const extractContentForPlatform = (platform: Platform): RepurposedContent => {
    const platformSection = lines.findIndex(l => l.toLowerCase().includes(platform.toLowerCase()));
    const nextPlatform = lines.findIndex((l, i) => i > platformSection && 
      targetPlatforms.some(p => l.toLowerCase().includes(p.toLowerCase())));
    const section = lines.slice(platformSection, nextPlatform > -1 ? nextPlatform : platformSection + 50);
    
    const content = section.find(l => l.length > 50) || sourceContent.slice(0, 200);
    
    return {
      platform,
      format: platform === Platform.X ? 'thread' : 
              platform === Platform.TikTok || platform === Platform.Instagram ? 'short' : 'post',
      content: content.slice(0, 500),
      hashtags: extractHashtags(section.join('\n')),
      visualSuggestions: 'Professional design matching brand colors',
      characterCount: content.length,
      estimatedEngagement: text.toLowerCase().includes('high') ? 'high' : 'medium',
      bestTimeToPost: '10:00 AM',
    };
  };

  return {
    sourceContent: sourceContent.slice(0, 100),
    sourceFormat,
    targetPlatforms,
    repurposedContent: targetPlatforms.map(extractContentForPlatform),
    contentSeries: [],
    crossPromotionStrategy: 'Link Instagram post to Twitter thread, reference in LinkedIn',
    contentCalendar: targetPlatforms.map((p, i) => ({
      day: i + 1,
      platform: p,
      content: 'Adapted content for ' + p,
      format: 'post',
    })),
  };
}

function parseVideoToSocial(text: string): VideoToSocialResult {
  const lines = text.split('\n');
  
  const keyMoments = [];
  for (let i = 0; i < 5 && i < lines.length; i++) {
    if (lines[i].includes(':') || lines[i].includes('-')) {
      keyMoments.push({
        timestamp: lines[i].match(/\d+:\d+/)?.[0] || '0:30',
        quote: lines[i].slice(0, 100),
        visualDescription: 'Screenshot of speaker',
        socialPost: lines[i].slice(0, 200),
      });
    }
  }

  return {
    keyMoments: keyMoments.length > 0 ? keyMoments : [{
      timestamp: '0:30',
      quote: 'Key insight from video',
      visualDescription: 'Speaker close-up',
      socialPost: 'Must-watch moment 👆',
    }],
    audiogramScripts: [{
      hook: 'Listen to this 👆',
      waveformStyle: 'Dynamic bars',
      captionStyle: 'Bold centered text',
    }],
    carouselSlides: Array.from({ length: 5 }, (_, i) => ({
      slideNumber: i + 1,
      headline: `Point ${i + 1}`,
      bulletPoints: ['Key insight', 'Supporting detail'],
      visualPrompt: 'Clean minimal design',
    })),
  };
}

function parsePodcastContent(text: string): PodcastToContentResult {
  const lines = text.split('\n');
  
  return {
    quoteCards: lines.filter(l => l.startsWith('"') || l.includes('"')).slice(0, 5).map((quote, i) => ({
      quote: quote.replace(/"/g, '').slice(0, 150),
      speaker: 'Host',
      context: 'Podcast discussion',
      visualStyle: 'Minimal typography on solid background',
    })),
    keyTakeaways: lines.filter(l => l.match(/^\d+\./)).slice(0, 5).map((line, i) => ({
      title: line.replace(/^\d+\.\s*/, '').slice(0, 50),
      explanation: 'Detailed explanation',
      actionable: 'Action step',
    })),
    discussionThreads: [{
      platform: 'Twitter',
      hook: lines[0]?.slice(0, 100) || 'Key insights from the podcast 🎙️',
      points: lines.slice(1, 6).map(l => l.slice(0, 200)),
      conclusion: 'Listen to full episode',
    }],
  };
}

function parseThreadResult(text: string): ThreadGeneratorResult {
  const lines = text.split('\n').filter(l => l.trim());
  
  const tweets = [];
  let currentTweet = { number: 1, content: '', isHook: true };
  
  for (const line of lines) {
    if (line.match(/^\d+[./:]/) || line.toLowerCase().includes('tweet')) {
      if (currentTweet.content) {
        tweets.push(currentTweet);
        currentTweet = { number: tweets.length + 1, content: '', isHook: false };
      }
    } else if (line.length > 20) {
      currentTweet.content += line + ' ';
    }
  }
  
  if (currentTweet.content) tweets.push(currentTweet);
  
  // Ensure first is marked as hook
  if (tweets.length > 0) tweets[0].isHook = true;
  
  return {
    thread: tweets.length > 0 ? tweets : [
      { number: 1, content: text.slice(0, 280), isHook: true },
      { number: 2, content: 'Continued...', isHook: false },
    ],
    engagementPredictions: {
      retweets: 50,
      likes: 200,
      replies: 30,
    },
    bestPostingTime: 'Tuesday 9:00 AM',
  };
}

function extractHashtags(text: string): string[] {
  const hashtags = text.match(/#[a-zA-Z0-9_]+/g) || [];
  return hashtags.slice(0, 5).map(h => h.replace('#', ''));
}

// Storage helpers
const REPURPOSE_CACHE_KEY = STORAGE_KEYS.REPURPOSE_CACHE;

export function cacheRepurposingPlan(contentHash: string, plan: RepurposingPlan): void {
  if (typeof window === 'undefined') return;
  const cache = JSON.parse(localStorage.getItem(REPURPOSE_CACHE_KEY) || '{}');
  cache[contentHash] = { plan, timestamp: Date.now() };
  localStorage.setItem(REPURPOSE_CACHE_KEY, JSON.stringify(cache));
}

export function getCachedRepurposingPlan(contentHash: string): RepurposingPlan | null {
  if (typeof window === 'undefined') return null;
  const cache = JSON.parse(localStorage.getItem(REPURPOSE_CACHE_KEY) || '{}');
  const entry = cache[contentHash];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) return null; // 24h cache
  return entry.plan;
}

export default {
  generateRepurposingPlan,
  videoToSocialContent,
  podcastToSocialContent,
  generateThread,
  autoResizeContent,
  generateLinkedInCarousel,
  cacheRepurposingPlan,
  getCachedRepurposingPlan,
};
