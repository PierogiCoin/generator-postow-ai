import { Router } from 'express';
import axios from 'axios';
import logger, { logCost, logAPICall } from '../../logger.js';
import { COST_ESTIMATES } from '../../costTracking.js';
import { genAI, luma, replicate, supabase, apiKey, costTracker } from '../../lib/clients.js';
import { retryWithBackoff, withTimeout, sleep } from '../../lib/retry.js';
import { isGeminiQuotaError, geminiErrorMessage } from '../../lib/geminiErrors.js';
import { validateRequest, videoGenerationSchema } from '../../middleware/validate.js';
import { expensiveLimiter } from '../../middleware/rateLimiter.js';
import { creditGate, videoStoryCreditCost } from '../../middleware/credits.js';
import { requireSupabaseAuth, getAuthUserId } from '../../middleware/supabaseAuth.js';
import {
  createVideoJob,
  completeVideoJob,
  failVideoJob,
  getVideoJob,
  jobReporter,
  type VideoJobResult,
} from '../../lib/videoJobs.js';

export function createVideoStoryRouter(): Router {
  const router = Router();

router.get('/api/video-story-status/:jobId', requireSupabaseAuth, (req, res) => {
  const job = getVideoJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ message: 'Nie znaleziono zadania generowania wideo' });
  }
  if (job.userId !== getAuthUserId(req)) {
    return res.status(403).json({ message: 'Brak dostępu do tego zadania' });
  }
  return res.json(job);
});

router.post('/api/generate-video-story', expensiveLimiter, ...creditGate('generateVideo', videoStoryCreditCost), validateRequest(videoGenerationSchema), async (req, res) => {
  let jobId: string | null = null;
  let httpSent = false;

  const deliver = (data: VideoJobResult) => {
    if (jobId) completeVideoJob(jobId, data);
    if (!httpSent) {
      httpSent = true;
      res.json(data);
    }
    return data;
  };

  const deliverError = (status: number, message: string, code?: string) => {
    if (jobId) failVideoJob(jobId, message);
    if (!httpSent) {
      httpSent = true;
      res.status(status).json({ message, ...(code ? { code } : {}) });
    }
  };

  try {
    const { postText, platform, style, prompt, needsAudio = false, aspectRatio: aspectRatioBody, provider: providerBody = 'auto', async: useAsync = false } = req.body;
    const userId = getAuthUserId(req);

    const platformVertical = ['TikTok', 'Instagram', 'YouTube Shorts', 'Reels'].includes(platform);
    const aspectRatio: '9:16' | '16:9' | '1:1' =
      aspectRatioBody ?? (platformVertical ? '9:16' : '16:9');
    const isVertical = aspectRatio === '9:16';

    const hasVeo = !!apiKey;

    // Wybór dostawcy: jawny z body albo auto. Veo (Gemini API) ma priorytet w auto,
    // bo działa na każdej proporcji i ma natywny dźwięk; fallback Luma → Replicate.
    let provider: 'veo' | 'luma' | 'replicate';
    if (providerBody === 'veo' && hasVeo) {
      provider = 'veo';
    } else if (providerBody === 'luma' && luma) {
      provider = 'luma';
    } else if (providerBody === 'replicate' && replicate) {
      provider = 'replicate';
    } else if (hasVeo) {
      provider = 'veo';
    } else if (luma) {
      provider = 'luma';
    } else if (replicate && aspectRatio === '16:9' && !needsAudio) {
      provider = 'replicate';
    } else {
      return res.status(503).json({
        message: 'Generowanie wideo niedostępne — skonfiguruj GOOGLE_API_KEY (Veo), LUMA_API_KEY lub REPLICATE_API_TOKEN na serwerze.',
        code: 'VIDEO_PROVIDER_UNAVAILABLE',
      });
    }

    logger.info('[Smart Router] Video generation request', {
      platform,
      aspectRatio,
      style,
      provider,
      needsAudio,
      userId,
      async: useAsync,
    });

    if (useAsync) {
      jobId = createVideoJob(userId, provider);
      httpSent = true;
      res.status(202).json({ jobId, status: getVideoJob(jobId) });
    }

    const report = jobReporter(jobId);
    report({ stage: 'prompt', progress: 8 });

    const buildVisualPrompt = async (providerLabel: string, formatHint: string): Promise<string> => {
      const fallback = `${postText.slice(0, 200)}. Style: ${style || 'cinematic'}. ${formatHint}. Cinematic background, no text, no watermark.`;
      if (prompt?.trim()) return prompt.trim().slice(0, 500);

      try {
        const genModel = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
        const promptResp = await retryWithBackoff(
          () =>
            withTimeout(
              genModel.generateContent(`
            Create a visual prompt for ${providerLabel} based on: "${postText}".
            Style: ${style || 'cinematic'}.
            Format: ${formatHint}.
            Output ONLY the prompt in English (max 40 words).
          `),
              60000,
              'Prompt generation timed out'
            ),
          { maxRetries: 1 }
        );
        return promptResp.response.text().trim().slice(0, 500) || fallback;
      } catch (promptError: unknown) {
        const err = promptError as Error;
        logger.warn(`[${providerLabel}] Prompt generation failed, using fallback`, { error: err.message });
        return fallback;
      }
    };

    const uploadVideoBuffer = async (buffer: Buffer, providerSlug: string): Promise<string> => {
      report({ stage: 'uploading', progress: 88, stageLabel: 'Zapisywanie wideo w chmurze…' });
      const fileName = `generated_videos/${userId}_${providerSlug}_${Date.now()}.mp4`;
      await retryWithBackoff(
        async () => {
          const { error } = await supabase.storage
            .from('generated_content')
            .upload(fileName, buffer, { contentType: 'video/mp4', upsert: true });
          if (error) throw error;
        },
        { maxRetries: 3, baseDelay: 1000 }
      );
      const { data } = supabase.storage.from('generated_content').getPublicUrl(fileName);
      return data.publicUrl;
    };

    // ======================================================
    // ŚCIEŻKA VEO (Google Gemini API – predictLongRunning)
    // ======================================================
    const runVeo = async (veoAspect: '9:16' | '16:9') => {
      if (!apiKey) throw new Error('Veo: GOOGLE_API_KEY not configured');

      const formatHint = veoAspect === '9:16' ? 'Vertical 9:16' : 'Cinematic 16:9';
      report({ stage: 'generating', progress: 18, activeProvider: 'Google Veo 3.1', pollMax: 60 });
      const visualPrompt = await buildVisualPrompt('Google Veo', formatHint);

      const veoStartTime = Date.now();
      const model = 'veo-3.1-fast-generate-preview';
      logger.info('[Veo] Starting video generation', {
        userId,
        promptLength: visualPrompt.length,
        aspectRatio: veoAspect,
      });

      const startVeo = async () => {
        try {
          return await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning`,
            {
              instances: [{ prompt: visualPrompt }],
              parameters: { aspectRatio: veoAspect },
            },
            { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey } }
          );
        } catch (e: unknown) {
          const axErr = e as { response?: { status?: number; data?: { error?: { message?: string } } }; message?: string };
          const googleMsg = axErr.response?.data?.error?.message || axErr.message || 'unknown';
          logger.error(`[Veo] predictLongRunning error [status=${axErr.response?.status}]: ${googleMsg}`);
          throw new Error(`Veo: ${googleMsg}`);
        }
      };

      const startResp = await retryWithBackoff(
        () => withTimeout(startVeo(), 60000, 'Veo request timed out'),
        { maxRetries: 1, baseDelay: 2000 }
      );

      const operationName: string | undefined = startResp.data?.name;
      if (!operationName) throw new Error('Veo: brak nazwy operacji w odpowiedzi');

      let attempts = 0;
      while (attempts < 60) {
        await sleep(5000);
        attempts++;

        const opResp = await retryWithBackoff(
          () =>
            axios.get(
              `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
              { headers: { 'x-goog-api-key': apiKey } }
            ),
          { maxRetries: 2, baseDelay: 1000 }
        );

        const op = opResp.data;
        if (op.error) {
          throw new Error(`Veo failed: ${op.error.message || 'unknown error'}`);
        }
        if (op.done) {
          const sample =
            op.response?.generateVideoResponse?.generatedSamples?.[0] ??
            op.response?.generatedSamples?.[0];
          const videoUri: string | undefined = sample?.video?.uri;
          if (!videoUri) throw new Error('Veo: brak URI wideo w odpowiedzi');

          const vidRes = await retryWithBackoff(
            () =>
              withTimeout(
                axios.get(videoUri, {
                  responseType: 'arraybuffer',
                  headers: { 'x-goog-api-key': apiKey },
                }),
                120000,
                'Veo video download timed out'
              ),
            { maxRetries: 3, baseDelay: 2000 }
          );

          const publicUrl = await uploadVideoBuffer(Buffer.from(vidRes.data), 'veo');
          const veoDuration = Date.now() - veoStartTime;
          const veoCost = COST_ESTIMATES['veo-video'];

          logAPICall('Veo', 'generate-video', veoDuration, true);
          logCost(userId, 'video-generation', veoCost, 'Veo');

          if (costTracker) {
            await costTracker.trackCost({
              userId,
              operation: 'video-generation',
              provider: 'Veo',
              cost: veoCost,
              durationMs: veoDuration,
              success: true,
              metadata: { aspectRatio: veoAspect },
            });
          }

          logger.info('[Veo] Video generated successfully', {
            userId,
            duration: `${veoDuration}ms`,
          });

          return {
            url: publicUrl,
            videoUrl: publicUrl,
            thumbnail: '',
            provider: 'Google Veo 3.1 (Premium)',
            cost_tier: 'high',
            duration: 8,
            prompt: visualPrompt,
          };
        }

        logger.info(`[Veo] Operation pending (${attempts}/60)`);
        report({
          pollAttempt: attempts,
          pollMax: 60,
          progress: 20 + Math.round((attempts / 60) * 62),
          stageLabel: `Veo generuje wideo… (${attempts}/60)`,
        });
      }

      throw new Error('Veo timeout');
    };

    const runLuma = async (lumaAspect: '9:16' | '16:9' | '1:1') => {
      if (!luma) throw new Error('Luma API key not configured');
      const lumaClient = luma;

      const formatHint =
        lumaAspect === '9:16' ? 'Vertical 9:16' : lumaAspect === '1:1' ? 'Square 1:1' : 'Cinematic 16:9';
      report({ stage: 'generating', progress: 18, activeProvider: 'Luma Dream Machine', pollMax: 60 });
      const visualPrompt = await buildVisualPrompt(
        'Luma Dream Machine',
        formatHint
      );

      const lumaStartTime = Date.now();
      logger.info('[Luma] Starting video generation', {
        userId,
        promptLength: visualPrompt.length,
        aspectRatio: lumaAspect,
      });

      const generation = await retryWithBackoff(
        () =>
          withTimeout(
            lumaClient.generations.create({
              model: 'ray-2',
              prompt: visualPrompt,
              aspect_ratio: lumaAspect as '9:16' | '16:9' | '1:1',
              loop: false,
            }),
            60000,
            'Luma API request timed out'
          ),
        { maxRetries: 2, baseDelay: 2000 }
      );

      let attempts = 0;
      while (attempts < 60) {
        await sleep(3000);

        const status = await retryWithBackoff(
          () => lumaClient.generations.get(generation.id as string),
          { maxRetries: 2, baseDelay: 500 }
        );

        if (status.state === 'completed') {
          const videoUrl = status.assets?.video;
          if (!videoUrl) throw new Error('No video URL from Luma');

          const vidRes = await retryWithBackoff(
            () =>
              withTimeout(
                axios.get(videoUrl, { responseType: 'arraybuffer' }),
                120000,
                'Video download timed out'
              ),
            { maxRetries: 3, baseDelay: 2000 }
          );
          const fileName = `generated_videos/${userId}_luma_${Date.now()}.mp4`;

          report({ stage: 'uploading', progress: 88, stageLabel: 'Zapisywanie wideo w chmurze…' });
          await retryWithBackoff(
            async () => {
              const { error } = await supabase.storage
                .from('generated_content')
                .upload(fileName, Buffer.from(vidRes.data), { contentType: 'video/mp4', upsert: true });
              if (error) throw error;
            },
            { maxRetries: 3, baseDelay: 1000 }
          );

          const { data } = supabase.storage.from('generated_content').getPublicUrl(fileName);
          const lumaDuration = Date.now() - lumaStartTime;
          const lumaCost = COST_ESTIMATES['luma-video'];

          logAPICall('Luma', 'generate-video', lumaDuration, true);
          logCost(userId, 'video-generation', lumaCost, 'Luma');

          if (costTracker) {
            await costTracker.trackCost({
              userId,
              operation: 'video-generation',
              provider: 'Luma',
              cost: lumaCost,
              durationMs: lumaDuration,
              success: true,
              metadata: { aspectRatio: lumaAspect },
            });
          }

          return {
            url: data.publicUrl,
            videoUrl: data.publicUrl,
            thumbnail: (status.assets as { image?: string })?.image || '',
            provider: 'Luma AI (Premium)',
            cost_tier: 'high',
            duration: 5,
            prompt: visualPrompt,
          };
        }
        if (status.state === 'failed') {
          throw new Error(`Luma failed: ${status.failure_reason}`);
        }

        attempts++;
        logger.info(`[Luma] Status: ${status.state} (${attempts}/60)`);
        report({
          pollAttempt: attempts,
          pollMax: 60,
          progress: 20 + Math.round((attempts / 60) * 62),
          stageLabel: `Luma generuje wideo… (${status.state}, ${attempts}/60)`,
        });
      }

      throw new Error('Luma timeout');
    };

    if (provider === 'veo') {
      try {
        // Veo wspiera tylko 16:9 i 9:16 — 1:1 mapujemy na 9:16 (mobilny format)
        const veoAspect: '9:16' | '16:9' = aspectRatio === '16:9' ? '16:9' : '9:16';
        return deliver(await runVeo(veoAspect));
      } catch (veoError: unknown) {
        const err = veoError as Error;
        if (isGeminiQuotaError(veoError)) throw veoError;
        if (luma) {
          logger.warn('[Smart Router] Veo failed, falling back to Luma', { error: err.message });
          report({ stageLabel: 'Veo niedostępny — przełączam na Luma…', activeProvider: 'Luma Dream Machine' });
          provider = 'luma';
        } else if (replicate && aspectRatio === '16:9' && !needsAudio) {
          logger.warn('[Smart Router] Veo failed, falling back to Replicate', { error: err.message });
          provider = 'replicate';
        } else {
          throw veoError;
        }
      }
    }

    if (provider === 'luma') {
      try {
        const lumaAspect: '9:16' | '16:9' | '1:1' =
          aspectRatio === '1:1' ? '1:1' : isVertical ? '9:16' : '16:9';
        return deliver(await runLuma(lumaAspect));
      } catch (lumaError: unknown) {
        const err = lumaError as Error;
        if (replicate && aspectRatio === '16:9' && !needsAudio) {
          logger.warn('[Smart Router] Luma failed, falling back to Replicate', { error: err.message });
          provider = 'replicate';
        } else {
          throw lumaError;
        }
      }
    }

    // ======================================================
    // ŚCIEŻKA B: REPLICATE ZEROSCOPE (tylko gdy brak Luma)
    // ======================================================
    if (provider === 'replicate') {
      if (!replicate) {
        return res.status(503).json({ message: 'Replicate API token not configured' });
      }
      try {
      const replicateClient = replicate;

      report({ stage: 'generating', progress: 18, activeProvider: 'Replicate Zeroscope' });
      const visualPrompt = await buildVisualPrompt('Zeroscope AI', 'Horizontal 16:9');

      const replicateStartTime = Date.now();
      logger.info('[Replicate] Starting video generation', {
        userId,
        promptLength: visualPrompt.length
      });

      // Replicate API call with retry (can take 60-90 seconds)
      const output = await retryWithBackoff(
        () => withTimeout(
          replicateClient.run(
            "anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
            {
              input: {
                prompt: visualPrompt,
                num_frames: 24,
                width: 1024,
                height: 576,
                fps: 24,
                negative_prompt: "text, watermark, bad quality, distortion"
              }
            }
          ),
          180000, // 180s timeout for Replicate
          'Replicate video generation timed out'
        ),
        { maxRetries: 2, baseDelay: 3000 }
      );

      const videoUrl = Array.isArray(output) ? output[0] : String(output);

      // Download with retry
      const vidRes = await retryWithBackoff(
        () => withTimeout(
          axios.get(videoUrl, { responseType: 'arraybuffer' }),
          120000,
          'Video download timed out'
        ),
        { maxRetries: 3, baseDelay: 2000 }
      );
      const fileName = `generated_videos/${userId}_replicate_${Date.now()}.mp4`;

      // Upload with retry
      await retryWithBackoff(
        async () => {
          const { error } = await supabase.storage.from('generated_content')
            .upload(fileName, Buffer.from(vidRes.data), { contentType: 'video/mp4', upsert: true });
          if (error) throw error;
        },
        { maxRetries: 3, baseDelay: 1000 }
      );

      const { data } = supabase.storage.from('generated_content').getPublicUrl(fileName);

      const replicateDuration = Date.now() - replicateStartTime;
      const replicateCost = COST_ESTIMATES['replicate-video'];

      logAPICall('Replicate', 'generate-video', replicateDuration, true);
      logCost(userId, 'video-generation', replicateCost, 'Replicate');

      // Track cost in database
      if (costTracker) {
        await costTracker.trackCost({
          userId,
          operation: 'video-generation',
          provider: 'Replicate',
          cost: replicateCost,
          durationMs: replicateDuration,
          success: true,
          metadata: { format: '16:9' }
        });
      }

      logger.info('[Replicate] Video generated successfully', {
        userId,
        duration: `${replicateDuration}ms`,
        cost: `$${replicateCost}`
      });

      return deliver({
        url: data.publicUrl,
        videoUrl: data.publicUrl,
        thumbnail: '',
        provider: 'Replicate (Standard)',
        cost_tier: 'low',
        duration: 3,
        prompt: visualPrompt
      });
      } catch (replicateError: unknown) {
        const repErr = replicateError as Error;
        if (luma) {
          logger.warn('[Replicate] Failed, falling back to Luma', { error: repErr.message });
          report({ stageLabel: 'Replicate niedostępny — przełączam na Luma…', activeProvider: 'Luma Dream Machine' });
          return deliver(await runLuma('16:9'));
        }
        throw replicateError;
      }
    }

  } catch (error: unknown) {
    const err = error as Error & { status?: number };
    logger.error('[Smart Video Router] Generation failed', {
      error: err.message,
      stack: err.stack,
      userId: getAuthUserId(req),
      platform: req.body.platform
    });
    if (isGeminiQuotaError(error)) {
      deliverError(429, geminiErrorMessage(error), 'GEMINI_QUOTA_EXCEEDED');
      return;
    }
    const message =
      err.message?.includes('Veo')
        ? `Błąd Veo (Gemini API): ${err.message}. Veo wymaga włączonego płatnego planu Gemini API.`
        : err.message?.includes('Replicate') || err.message?.toLowerCase().includes('unauthorized')
          ? 'Generowanie wideo nie powiodło się (Replicate). Użyj stylu Instagram/TikTok lub spróbuj ponownie za chwilę.'
          : err.message?.includes('Luma')
            ? `Błąd Luma: ${err.message}`
            : err.message || 'Generowanie wideo nie powiodło się';
    deliverError(500, message);
  }
});


  return router;
}
