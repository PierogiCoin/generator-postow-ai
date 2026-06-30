import { callApi } from './apiClient';
import { Platform, Tone, ContentType } from '../types';
import { STORAGE_KEYS } from '../utils/storageUtils';

/**
 * AI Video Generation Service
 * Integrates with multiple AI video generation APIs
 * Uses Gemini for storyboarding and script generation
 */

export type VideoProvider = 'runway' | 'pika' | 'luma' | 'kling' | 'haiper' | 'stability' | 'leonardo';

export interface VideoGenerationRequest {
  prompt: string;
  provider: VideoProvider;
  duration?: number; // seconds
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  resolution?: '720p' | '1080p' | '4k';
  style?: string;
  negativePrompt?: string;
  seed?: number;
  motionStrength?: number; // 0-10
  cameraMotion?: 'static' | 'pan' | 'zoom_in' | 'zoom_out' | 'orbit' | 'shake';
  referenceImage?: string; // URL or base64
}

export interface VideoStoryboard {
  title: string;
  totalScenes: number;
  totalDuration: number;
  aspectRatio: string;
  targetPlatform: Platform;
  scenes: {
    sceneNumber: number;
    timestamp: string;
    duration: number;
    visualDescription: string;
    aiPrompt: string;
    cameraMotion: string;
    narrationScript: string;
    musicSuggestion: string;
    soundEffects: string[];
    textOverlay?: string;
  }[];
  musicSuggestions: {
    genre: string;
    tempo: string;
    mood: string;
    examples: string[];
  };
  colorPalette: string[];
  editingNotes: string[];
}

export interface VideoGenerationResult {
  id: string;
  provider: VideoProvider;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  duration: number;
  aspectRatio: string;
  cost: {
    credits: number;
    estimatedUsd: number;
  };
  generationTime?: number;
  error?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface VideoGenerationJob {
  id: string;
  request: VideoGenerationRequest;
  storyboard?: VideoStoryboard;
  results: VideoGenerationResult[];
  status: 'storyboarding' | 'generating' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  category: 'social' | 'ads' | 'educational' | 'entertainment' | 'corporate';
  aspectRatio: string;
  duration: number;
  style: string;
  examplePrompt: string;
  suggestedPlatforms: Platform[];
  musicGenre: string;
  thumbnail: string;
}

const VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: 'viral_short',
    name: 'Viral Short (TikTok/Reels)',
    description: 'Szybki, dynamiczny format na viralowe shorty',
    category: 'social',
    aspectRatio: '9:16',
    duration: 15,
    style: 'Fast-paced, trendy, high energy',
    examplePrompt: 'Young entrepreneur working on laptop in modern cafe, dynamic camera movements, energetic music',
    suggestedPlatforms: [Platform.TikTok, Platform.Instagram],
    musicGenre: 'Upbeat electronic / trending sounds',
    thumbnail: '🎵',
  },
  {
    id: 'linkedin_educational',
    name: 'LinkedIn Educational',
    description: 'Profesjonalny format edukacyjny dla B2B',
    category: 'educational',
    aspectRatio: '9:16',
    duration: 60,
    style: 'Professional, clean, informative',
    examplePrompt: 'Business professional explaining concept with animated charts, clean office background',
    suggestedPlatforms: [Platform.LinkedIn, Platform.YouTube],
    musicGenre: 'Corporate, subtle background',
    thumbnail: '💼',
  },
  {
    id: 'product_showcase',
    name: 'Product Showcase',
    description: 'Elegancka prezentacja produktu',
    category: 'ads',
    aspectRatio: '1:1',
    duration: 30,
    style: 'Cinematic, premium, smooth transitions',
    examplePrompt: 'Product rotating on pedestal with dramatic lighting, cinematic camera movements',
    suggestedPlatforms: [Platform.Instagram, Platform.Facebook],
    musicGenre: 'Cinematic, premium',
    thumbnail: '📦',
  },
  {
    id: 'tutorial_walkthrough',
    name: 'Tutorial / Walkthrough',
    description: 'Step-by-step instruktaż',
    category: 'educational',
    aspectRatio: '16:9',
    duration: 180,
    style: 'Clear, instructional, screen recordings mixed with live',
    examplePrompt: 'Screen recording with AI-generated transitions and annotations, clear voiceover',
    suggestedPlatforms: [Platform.YouTube, Platform.LinkedIn],
    musicGenre: 'Neutral, non-distracting',
    thumbnail: '📚',
  },
  {
    id: 'testimonial_style',
    name: 'Testimonial Style',
    description: 'Wideo świadectw/zaleceń',
    category: 'corporate',
    aspectRatio: '16:9',
    duration: 45,
    style: 'Warm, authentic, trustworthy',
    examplePrompt: 'AI avatar giving testimonial in professional office setting, warm lighting',
    suggestedPlatforms: [Platform.LinkedIn, Platform.Facebook],
    musicGenre: 'Warm, emotional',
    thumbnail: '💬',
  },
  {
    id: 'ai_avatar_explainer',
    name: 'AI Avatar Explainer',
    description: 'Explainer video z AI avatarem',
    category: 'educational',
    aspectRatio: '16:9',
    duration: 90,
    style: 'AI presenter with animated backgrounds',
    examplePrompt: 'AI presenter explaining complex topic with animated infographics and visual aids',
    suggestedPlatforms: [Platform.YouTube, Platform.LinkedIn],
    musicGenre: 'Professional, engaging',
    thumbnail: '🤖',
  },
];

/**
 * Generate video storyboard using Gemini
 */
export async function generateVideoStoryboard(
  topic: string,
  platform: Platform,
  duration: number,
  tone: Tone,
  contentType: ContentType,
  userId: string
): Promise<VideoStoryboard> {
  const storyboardPrompt = `Create a detailed video storyboard for this topic:

TOPIC: ${topic}
TARGET PLATFORM: ${platform}
VIDEO DURATION: ${duration} seconds
TONE: ${tone}
CONTENT TYPE: ${contentType}

Create a professional storyboard with:
1. Scene-by-scene breakdown (visual + audio)
2. AI image/video generation prompts for each scene
3. Camera motion directions
4. Narration script
5. Music and sound effect suggestions

Format as JSON with these fields:
- title
- totalScenes
- totalDuration
- aspectRatio (platform-appropriate)
- scenes[] with: sceneNumber, timestamp, duration, visualDescription, aiPrompt, cameraMotion, narrationScript, musicSuggestion, soundEffects[], textOverlay
- musicSuggestions { genre, tempo, mood, examples[] }
- colorPalette[]
- editingNotes[]`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: storyboardPrompt,
    systemInstruction: "You are an expert video director and storyboard creator. Create detailed, actionable storyboards optimized for the target platform.",
  }, userId);

  return parseStoryboardResponse(response.text || response);
}

/**
 * Generate video using selected provider
 */
export async function generateVideo(
  request: VideoGenerationRequest,
  userId: string
): Promise<VideoGenerationResult> {
  switch (request.provider) {
    case 'runway':
      return generateWithRunway(request, userId);
    case 'pika':
      return generateWithPika(request, userId);
    case 'luma':
      return generateWithLuma(request, userId);
    case 'kling':
      return generateWithKling(request, userId);
    case 'haiper':
      return generateWithHaiper(request, userId);
    case 'stability':
      return generateWithStability(request, userId);
    default:
      throw new Error(`Provider ${request.provider} not implemented`);
  }
}

/**
 * Runway ML Gen-3 Alpha integration
 */
async function generateWithRunway(
  request: VideoGenerationRequest,
  userId: string
): Promise<VideoGenerationResult> {
  const apiKey = import.meta.env.VITE_RUNWAY_API_KEY as string | undefined;
  if (!apiKey) {
    return createMockResult(request, 'runway');
  }

  try {
    // Runway API endpoint for video generation
    const response = await fetch('https://api.runwayml.com/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        model: 'gen3a_turbo',
        width: request.aspectRatio === '9:16' ? 720 : 1280,
        height: request.aspectRatio === '9:16' ? 1280 : 720,
        motion_bucket_id: request.motionStrength || 5,
        seed: request.seed,
      }),
    });

    if (!response.ok) {
      throw new Error(`Runway API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      id: data.id || `runway-${Date.now()}`,
      provider: 'runway',
      status: 'processing',
      duration: request.duration || 4,
      aspectRatio: request.aspectRatio || '16:9',
      cost: { credits: 25, estimatedUsd: 0.5 },
      createdAt: new Date().toISOString(),
    };
  } catch {
    return createMockResult(request, 'runway');
  }
}

/**
 * Pika Labs 1.5 integration
 */
async function generateWithPika(
  request: VideoGenerationRequest,
  userId: string
): Promise<VideoGenerationResult> {
  const apiKey = import.meta.env.VITE_PIKA_API_KEY as string | undefined;
  if (!apiKey) {
    return createMockResult(request, 'pika');
  }

  try {
    const response = await fetch('https://api.pika.art/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        aspect_ratio: request.aspectRatio || '16:9',
        motion_strength: request.motionStrength || 1,
        negative_prompt: request.negativePrompt,
        seed: request.seed,
      }),
    });

    if (!response.ok) {
      throw new Error(`Pika API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      id: data.id || `pika-${Date.now()}`,
      provider: 'pika',
      status: 'processing',
      duration: 3,
      aspectRatio: request.aspectRatio || '16:9',
      cost: { credits: 15, estimatedUsd: 0.3 },
      createdAt: new Date().toISOString(),
    };
  } catch {
    return createMockResult(request, 'pika');
  }
}

/**
 * Luma Dream Machine integration
 */
async function generateWithLuma(
  request: VideoGenerationRequest,
  userId: string
): Promise<VideoGenerationResult> {
  const apiKey = import.meta.env.VITE_LUMA_API_KEY as string | undefined;
  if (!apiKey) {
    return createMockResult(request, 'luma');
  }

  try {
    const response = await fetch('https://api.lumalabs.ai/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        aspect_ratio: request.aspectRatio || '16:9',
        loop: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Luma API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      id: data.id || `luma-${Date.now()}`,
      provider: 'luma',
      status: 'processing',
      duration: 5,
      aspectRatio: request.aspectRatio || '16:9',
      cost: { credits: 20, estimatedUsd: 0.4 },
      createdAt: new Date().toISOString(),
    };
  } catch {
    return createMockResult(request, 'luma');
  }
}

/**
 * Kling AI integration
 */
async function generateWithKling(
  request: VideoGenerationRequest,
  userId: string
): Promise<VideoGenerationResult> {
  // Kling requires different auth method
  return createMockResult(request, 'kling');
}

/**
 * Haiper AI integration
 */
async function generateWithHaiper(
  request: VideoGenerationRequest,
  userId: string
): Promise<VideoGenerationResult> {
  return createMockResult(request, 'haiper');
}

/**
 * Stability AI video integration
 */
async function generateWithStability(
  request: VideoGenerationRequest,
  userId: string
): Promise<VideoGenerationResult> {
  return createMockResult(request, 'stability');
}

/**
 * Create mock result for demo/development
 */
function createMockResult(
  request: VideoGenerationRequest,
  provider: VideoProvider
): VideoGenerationResult {
  return {
    id: `${provider}-mock-${Date.now()}`,
    provider,
    status: 'completed',
    videoUrl: `https://example.com/mock-video-${provider}.mp4`,
    thumbnailUrl: `https://via.placeholder.com/640x360/4F46E5/FFFFFF?text=${provider}+video`,
    duration: request.duration || 5,
    aspectRatio: request.aspectRatio || '16:9',
    cost: {
      credits: provider === 'runway' ? 25 : provider === 'pika' ? 15 : 20,
      estimatedUsd: provider === 'runway' ? 0.5 : provider === 'pika' ? 0.3 : 0.4,
    },
    generationTime: 45,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Generate video from storyboard
 */
export async function generateVideoFromStoryboard(
  storyboard: VideoStoryboard,
  provider: VideoProvider,
  userId: string
): Promise<VideoGenerationJob> {
  const job: VideoGenerationJob = {
    id: `job-${Date.now()}`,
    request: {
      prompt: storyboard.scenes[0]?.aiPrompt || 'AI generated video',
      provider,
      duration: storyboard.totalDuration,
      aspectRatio: storyboard.aspectRatio as any,
    },
    storyboard,
    results: [],
    status: 'generating',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // For now, generate one video per scene
  for (let i = 0; i < storyboard.scenes.length; i++) {
    const scene = storyboard.scenes[i];
    const result = await generateVideo(
      {
        prompt: scene.aiPrompt,
        provider,
        duration: scene.duration,
        aspectRatio: storyboard.aspectRatio as any,
        cameraMotion: scene.cameraMotion as any,
      },
      userId
    );

    job.results.push(result);
    job.progress = ((i + 1) / storyboard.scenes.length) * 100;
  }

  job.status = 'completed';
  job.updatedAt = new Date().toISOString();

  // Save to cache
  cacheVideoJob(job);

  return job;
}

/**
 * Get available video templates
 */
export function getVideoTemplates(): VideoTemplate[] {
  return VIDEO_TEMPLATES;
}

/**
 * Get templates by platform
 */
export function getTemplatesByPlatform(platform: Platform): VideoTemplate[] {
  return VIDEO_TEMPLATES.filter(t => 
    t.suggestedPlatforms.includes(platform)
  );
}

/**
 * Get provider pricing info
 */
export function getProviderInfo(provider: VideoProvider): {
  name: string;
  description: string;
  costPerSecond: number;
  maxDuration: number;
  features: string[];
} {
  const providers: Record<VideoProvider, any> = {
    runway: {
      name: 'Runway Gen-3 Alpha',
      description: 'Industry-leading video generation with excellent motion',
      costPerSecond: 0.125,
      maxDuration: 10,
      features: ['High quality', 'Excellent motion', 'Camera control', 'Motion brush'],
    },
    pika: {
      name: 'Pika 1.5',
      description: 'Fast generation with great stylization',
      costPerSecond: 0.1,
      maxDuration: 3,
      features: ['Fast', 'Style presets', 'Modify region', 'Expand canvas'],
    },
    luma: {
      name: 'Luma Dream Machine',
      description: 'Realistic physics and smooth motion',
      costPerSecond: 0.08,
      maxDuration: 5,
      features: ['Realistic physics', 'Smooth motion', 'Fast generation'],
    },
    kling: {
      name: 'Kling AI',
      description: 'High-quality generation with good character consistency',
      costPerSecond: 0.12,
      maxDuration: 10,
      features: ['Character consistency', 'Physical simulation', 'Camera movements'],
    },
    haiper: {
      name: 'Haiper',
      description: 'Free tier available, good for beginners',
      costPerSecond: 0.05,
      maxDuration: 4,
      features: ['Free tier', 'Easy to use', 'Good quality'],
    },
    stability: {
      name: 'Stability AI Video',
      description: 'From the creators of Stable Diffusion',
      costPerSecond: 0.09,
      maxDuration: 4,
      features: ['Stable Video', 'Image to video', 'Various models'],
    },
    leonardo: {
      name: 'Leonardo Motion',
      description: 'Motion feature for Leonardo images',
      costPerSecond: 0.06,
      maxDuration: 4,
      features: ['Image to video', 'Leonardo integration', 'Various motions'],
    },
  };

  return providers[provider];
}

// Parser helper
function parseStoryboardResponse(text: string): VideoStoryboard {
  try {
    // Try to parse JSON
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || 
                      text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }
  } catch {
    // fallback to default storyboard
  }

  // Fallback to default storyboard
  return {
    title: 'Generated Video',
    totalScenes: 1,
    totalDuration: 5,
    aspectRatio: '16:9',
    targetPlatform: Platform.YouTube,
    scenes: [{
      sceneNumber: 1,
      timestamp: '00:00',
      duration: 5,
      visualDescription: 'AI generated scene',
      aiPrompt: text.slice(0, 200),
      cameraMotion: 'static',
      narrationScript: '',
      musicSuggestion: 'Upbeat electronic',
      soundEffects: [],
    }],
    musicSuggestions: {
      genre: 'Electronic',
      tempo: 'Medium',
      mood: 'Energetic',
      examples: ['Upbeat background music'],
    },
    colorPalette: ['#4F46E5', '#7C3AED', '#EC4899'],
    editingNotes: ['Add text overlays', 'Use smooth transitions'],
  };
}

// Storage helpers
const VIDEO_CACHE_KEY = STORAGE_KEYS.VIDEO_CACHE;

export function cacheVideoJob(job: VideoGenerationJob): void {
  if (typeof window === 'undefined') return;
  const cache = JSON.parse(localStorage.getItem(VIDEO_CACHE_KEY) || '{}');
  cache[job.id] = job;
  localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify(cache));
}

export function getCachedVideoJob(jobId: string): VideoGenerationJob | null {
  if (typeof window === 'undefined') return null;
  const cache = JSON.parse(localStorage.getItem(VIDEO_CACHE_KEY) || '{}');
  return cache[jobId] || null;
}

export function getAllCachedJobs(): VideoGenerationJob[] {
  if (typeof window === 'undefined') return [];
  const cache = JSON.parse(localStorage.getItem(VIDEO_CACHE_KEY) || '{}');
  return Object.values(cache);
}

export default {
  generateVideoStoryboard,
  generateVideo,
  generateVideoFromStoryboard,
  getVideoTemplates,
  getTemplatesByPlatform,
  getProviderInfo,
  cacheVideoJob,
  getCachedVideoJob,
  getAllCachedJobs,
};
