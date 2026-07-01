import type { GenerationResult } from '../types';
import type { VideoStoryStyle, VideoStoryProvider } from '../components/VideoStoryModal';
import { getLongRunningApiBaseUrl, getApiAuthHeaders } from './apiClient';

/** Timeout dopasowany do Luma/Veo polling (~3–5 min) + bufor */
const VIDEO_STORY_TIMEOUT_MS = 10 * 60 * 1000;

export interface VideoStoryRequest {
  postText: string;
  platform: string;
  style: VideoStoryStyle;
  aspectRatio: '1:1' | '16:9' | '9:16';
  prompt: string;
  provider: VideoStoryProvider;
  async?: boolean;
  hashtags?: string[];
  tone?: string;
}

export interface VideoStoryResponse {
  url: string;
  videoUrl: string;
  thumbnail: string;
  duration: number;
  prompt: string;
  provider?: string;
}

export type VideoStoryJobStage = 'queued' | 'prompt' | 'generating' | 'uploading' | 'done' | 'error';

export interface VideoStoryProgressStatus {
  jobId?: string;
  stage: VideoStoryJobStage;
  stageLabel: string;
  progress: number;
  activeProvider?: string;
  pollAttempt?: number;
  pollMax?: number;
  estimatedSeconds?: number;
  startedAt: number;
  error?: string;
}

const POLL_INTERVAL_MS = 2000;
const PROVIDER_ETA: Record<string, number> = { veo: 90, luma: 120, auto: 90, replicate: 90 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchVideoStoryStatus(
  jobId: string,
  userId?: string
): Promise<VideoStoryProgressStatus & { result?: VideoStoryResponse }> {
  const authHeaders = await getApiAuthHeaders(userId);
  const res = await fetch(`${getLongRunningApiBaseUrl()}/api/video-story-status/${jobId}`, {
    headers: authHeaders,
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Nie udało się pobrać statusu generowania wideo');
  }
  const data = await res.json();
  return {
    jobId: data.jobId,
    stage: data.stage,
    stageLabel: data.stageLabel,
    progress: data.progress ?? 0,
    activeProvider: data.activeProvider,
    pollAttempt: data.pollAttempt,
    pollMax: data.pollMax,
    estimatedSeconds: data.estimatedSeconds,
    startedAt: data.startedAt ?? Date.now(),
    error: data.error,
    result: data.result,
  };
}

export const generateVideoStory = async (
  post: GenerationResult,
  style: VideoStoryStyle,
  userId?: string,
  provider: VideoStoryProvider = 'auto',
  onProgress?: (status: VideoStoryProgressStatus) => void
): Promise<VideoStoryResponse> => {
  const aspectRatio = getVideoStoryAspectRatio(style);
  const startedAt = Date.now();
  const request: VideoStoryRequest = {
    postText: post.postText,
    platform: post.platform,
    style,
    aspectRatio,
    prompt: post.postText.slice(0, 500),
    provider,
    async: true,
    hashtags: post.hashtags,
    tone: post.metadata.tone,
  };

  onProgress?.({
    stage: 'queued',
    stageLabel: 'Uruchamianie generowania…',
    progress: 2,
    activeProvider: provider,
    estimatedSeconds: PROVIDER_ETA[provider] ?? 90,
    startedAt,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VIDEO_STORY_TIMEOUT_MS);

  try {
    const authHeaders = await getApiAuthHeaders(userId);
    const startRes = await fetch(`${getLongRunningApiBaseUrl()}/api/generate-video-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      credentials: 'include',
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!startRes.ok) {
      const errorData = await startRes.json().catch(() => ({}));
      const msg = errorData.message || 'Nie udało się wygenerować video story';
      if (startRes.status === 402) {
        throw new Error('Brak kredytów na generowanie wideo. Ulepsz plan lub dokup kredyty.');
      }
      if (startRes.status === 429) throw new Error(msg);
      if (startRes.status === 503) {
        throw new Error('Generowanie wideo tymczasowo niedostępne. Spróbuj ponownie później.');
      }
      throw new Error(msg);
    }

    const startData = await startRes.json();
    const jobId: string | undefined = startData.jobId;

    // Fallback: serwer zwrócił wynik synchronicznie (legacy)
    if (!jobId && startData.url) {
      onProgress?.({
        stage: 'done',
        stageLabel: 'Gotowe!',
        progress: 100,
        startedAt,
      });
      return startData;
    }

    if (!jobId) {
      throw new Error('Brak identyfikatora zadania wideo');
    }

    while (true) {
      const status = await fetchVideoStoryStatus(jobId, userId);
      onProgress?.({ ...status, jobId, startedAt: status.startedAt || startedAt });

      if (status.stage === 'done' && status.result) {
        return status.result;
      }
      if (status.stage === 'error') {
        throw new Error(status.error || 'Generowanie wideo nie powiodło się');
      }

      await sleep(POLL_INTERVAL_MS);
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        'Generowanie wideo trwa zbyt długo (limit 10 min). Spróbuj krótszy post lub inny styl.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

export const getVideoStoryPrompt = (
  postText: string,
  style: VideoStoryStyle,
  platform: string
): string => {
  const extractedContent = postText.substring(0, 500);

  const stylePrompts: Record<VideoStoryStyle, string> = {
    'instagram-story': `Create a PROFESSIONAL Instagram Story video (9:16 vertical format).

CONTENT: ${extractedContent}

🎬 VIDEO REQUIREMENTS:
- Duration: 15 seconds
- High-quality cinematic footage
- Smooth, professional transitions (fade, slide, zoom)
- Modern aesthetic with vibrant colors
- Text overlays: Clean sans-serif font, high contrast, animated in/out
- Brand-safe, visually appealing

🎨 VISUAL STYLE:
- Opening: Eye-catching visual hook (2 seconds)
- Middle: Core message with text + visuals (10 seconds)
- Closing: Call-to-action or memorable end frame (3 seconds)
- Color grading: Instagram-worthy, warm and inviting
- Motion: Dynamic but not dizzying
- Graphics: Gradient overlays, subtle animations

✨ ENGAGEMENT:
- Stop-scroll worthy first frame
- Readable text at mobile size
- Visual rhythm that keeps attention
- Professional polish throughout`,

    'tiktok-vertical': `Create a VIRAL-WORTHY TikTok video (9:16 vertical format).

CONTENT: ${extractedContent}

🎬 VIDEO REQUIREMENTS:
- Duration: 30 seconds
- Fast-paced, energetic editing
- Trending TikTok transitions
- Youth-oriented aesthetic
- Bold, large text overlays
- Attention-grabbing throughout

🎨 VISUAL STYLE:
- Opening: HOOK within 1 second
- Fast cuts (2-3 second max per shot)
- Zooms, spins, quick transitions
- Bright, saturated colors
- Text: Bold, easy to read, animated
- Sound-design ready (visual beats)

⚡ TIKTOK-SPECIFIC:
- First 3 seconds are CRUCIAL
- Visual storytelling, not static
- Trendy effects and filters
- Gen-Z friendly aesthetics
- Shareable, duet-worthy content`,

    'animated-quote': `Create an ELEGANT animated quote video (1:1 square format).

QUOTE TEXT: ${extractedContent}

🎬 VIDEO REQUIREMENTS:
- Duration: 10 seconds
- Minimalist, sophisticated design
- Smooth, graceful animations
- Premium typography
- Cinematic quality

🎨 VISUAL STYLE:
- Background: Subtle gradient or texture
- Typography: Elegant serif or modern sans-serif
- Animation: Words fade in gracefully, word-by-word
- Color palette: Sophisticated (navy/gold, black/white, earth tones)
- Minimal but impactful

✨ ANIMATION SEQUENCE:
- 0-2s: Background establishes, first words fade in
- 2-7s: Quote animates in, word by word
- 7-10s: Full quote visible, subtle breathing animation
- Timeless, shareable aesthetic`,

    'kinetic-typography': `Create a DYNAMIC kinetic typography video (16:9 landscape format).

TEXT CONTENT: ${extractedContent}

🎬 VIDEO REQUIREMENTS:
- Duration: 20 seconds
- High-energy typography animation
- 3D effects and motion graphics
- Professional motion design
- Rhythmic, musical timing

🎨 VISUAL STYLE:
- Words fly in, rotate, scale, morph
- 3D space and depth
- Bold, modern typography
- High contrast colors
- Motion graphics elements
- Synchronized movements

⚡ ANIMATION TECHNIQUES:
- Text enters from all directions
- Words emphasize with scale/rotation
- Smooth camera movements
- Layer depth and parallax
- Energetic but readable
- Professional broadcast quality`,

    'carousel-slides': `Create a PROFESSIONAL carousel-style video (1:1 square format).

CONTENT BREAKDOWN: ${extractedContent}

🎬 VIDEO REQUIREMENTS:
- Duration: 25 seconds
- 5-6 distinct slides
- Smooth transitions between slides
- Consistent design system
- Clear information hierarchy

🎨 VISUAL STYLE:
- Slide 1: Title/Hook (3s)
- Slides 2-5: Key points (4s each)
- Slide 6: CTA/Summary (3s)
- Cohesive color scheme throughout
- Clean, modern design
- Icon or visual per slide

✨ DESIGN ELEMENTS:
- Typography: Large, readable headings
- Background: Subtle patterns or gradients
- Transitions: Slide or fade (not jarring)
- Visual hierarchy: Title > Body > Supporting
- Professional, LinkedIn-worthy aesthetic
- Numbered or bulleted points`
  };

  void platform;
  return stylePrompts[style];
};

export const getVideoStoryAspectRatio = (style: VideoStoryStyle): '1:1' | '16:9' | '9:16' => {
  const aspectRatios: Record<VideoStoryStyle, '1:1' | '16:9' | '9:16'> = {
    'instagram-story': '9:16',
    'tiktok-vertical': '9:16',
    'animated-quote': '1:1',
    'kinetic-typography': '16:9',
    'carousel-slides': '1:1',
  };

  return aspectRatios[style];
};

export const getVideoStoryDuration = (style: VideoStoryStyle): number => {
  const durations: Record<VideoStoryStyle, number> = {
    'instagram-story': 15,
    'tiktok-vertical': 30,
    'animated-quote': 10,
    'kinetic-typography': 20,
    'carousel-slides': 25,
  };

  return durations[style];
};

