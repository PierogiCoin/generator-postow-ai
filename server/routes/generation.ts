import { Router } from 'express';
import axios from 'axios';
import logger, { logCost, logAPICall } from '../logger.js';
import { COST_ESTIMATES } from '../costTracking.js';
import { getTemplatesByPlatform } from '../contentTemplates.js';
import { genAI, openai, luma, replicate, supabase, costTracker, apiKey } from '../lib/clients.js';
import { retryWithBackoff, withTimeout, sleep } from '../lib/retry.js';
import { mapModel } from '../lib/mapModel.js';
import {
  isGeminiQuotaError,
  geminiErrorStatus,
  geminiErrorMessage,
} from '../lib/geminiErrors.js';
import {
  validateRequest,
  textGenerationSchema,
  imageGenerationSchema,
  videoGenerationSchema,
  multiPlatformSchema,
} from '../middleware/validate.js';
import { textLimiter, streamLimiter, expensiveLimiter } from '../middleware/rateLimiter.js';
import { creditGate, videoStoryCreditCost } from '../middleware/credits.js';
import { requireSupabaseAuth, getAuthUserId } from '../middleware/supabaseAuth.js';
import { PRICING } from '../stripe.js';
import {
  createVideoJob,
  completeVideoJob,
  failVideoJob,
  getVideoJob,
  jobReporter,
  type VideoJobResult,
} from '../lib/videoJobs.js';

export function createGenerationRouter(): Router {
  const router = Router();

  async function runTextGeneration(
    modelName: string,
    contents: unknown,
    config: Record<string, unknown> | undefined
  ): Promise<{ text: string; candidates?: unknown; usageMetadata?: unknown }> {
    const genModel = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: config?.systemInstruction as string | undefined,
    });

    const generationConfig = {
      temperature: config?.temperature as number | undefined,
      maxOutputTokens: config?.maxOutputTokens as number | undefined,
      topP: config?.topP as number | undefined,
      topK: config?.topK as number | undefined,
      stopSequences: config?.stopSequences as string[] | undefined,
      responseMimeType: config?.responseMimeType as string | undefined,
    };

    const tools = config?.tools as unknown[] | undefined;

    let finalContents = contents;
    if (typeof contents === 'string') {
      finalContents = [{ role: 'user', parts: [{ text: contents }] }];
    }

    const result = await retryWithBackoff(
      () =>
        withTimeout(
          genModel.generateContent({
            contents: finalContents,
            generationConfig,
            ...(tools?.length ? { tools } : {}),
          }),
          120000,
          'Text generation timed out'
        ),
      { maxRetries: 3, baseDelay: 1000 }
    );

    const response = await result.response;
    return {
      text: response.text(),
      candidates: response.candidates,
      usageMetadata: response.usageMetadata,
    };
  }

  function modelsWithFallback(modelName: string): string[] {
    if (modelName.includes('2.0') || modelName.includes('2.5')) return [modelName];
    if (modelName.includes('lite')) return [modelName];
    if (modelName.includes('pro')) return [modelName, 'gemini-flash-lite-latest'];
    return ['gemini-flash-lite-latest', 'gemini-flash-latest'];
  }

  function sendGenerationError(res: import('express').Response, error: unknown) {
    const status = geminiErrorStatus(error);
    const message = geminiErrorMessage(error);
    logger.error('Generation error:', { status, message, details: String(error) });
    res.status(status).json({
      message,
      code: isGeminiQuotaError(error) ? 'GEMINI_QUOTA_EXCEEDED' : undefined,
    });
  }

router.post('/api/generate-batch', textLimiter, ...creditGate('generatePost', (req) =>
  PRICING.costs.generatePost * Math.max(1, Array.isArray(req.body?.platforms) ? req.body.platforms.length : 1)
), async (req, res) => {
  try {
    const { topic, platforms, style = 'Professional', tone = 'Casual' } = req.body;
    const userId = getAuthUserId(req);

    if (!topic || !platforms || !Array.isArray(platforms)) {
      return res.status(400).json({ message: 'Missing topic or platforms array' });
    }

    logger.info(`[Batch Generation] User: ${userId}, Topic: ${topic}, Platforms: ${platforms.join(', ')}`);

    // Generate content for multiple platforms in parallel
    const batchPromises = platforms.map(async (platform: string) => {
      try {
        // Get template for platform
        const platformTemplates = getTemplatesByPlatform(platform);
        const template = platformTemplates[0]; // Use first matching template

        if (!template) {
          logger.warn(`No template found for platform: ${platform}`);
          return null;
        }

        // Generate content using Gemini
        const prompt = `Create social media content for ${platform}.
Topic: ${topic}
Tone: ${template.tone}
Style: ${template.style}
Platform: ${platform}

Requirements:
- Engaging ${template.tone.toLowerCase()} tone
- Optimized for ${platform}
- Include ${template.includeHashtags ? `${template.hashtagCount} relevant hashtags` : 'no hashtags'}
- Keep it concise and impactful

Output format:
TITLE: [Catchy title]
DESCRIPTION: [Main content]
${template.includeHashtags ? 'HASHTAGS: [Space-separated hashtags]' : ''}`;

        const genModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const result = await genModel.generateContent(prompt);
        const text = result.response.text();

        // Parse response
        const titleMatch = text.match(/TITLE:\s*(.+)/);
        const descMatch = text.match(/DESCRIPTION:\s*([\s\S]+?)(?=HASHTAGS:|$)/);
        const hashtagsMatch = text.match(/HASHTAGS:\s*(.+)/);

        return {
          platform,
          template: template.name,
          title: titleMatch ? titleMatch[1].trim() : '',
          description: descMatch ? descMatch[1].trim() : text,
          hashtags: hashtagsMatch ? hashtagsMatch[1].trim() : '',
          aspectRatio: template.aspectRatio,
          config: {
            tone: template.tone,
            style: template.style,
            includeMusic: template.includeMusic,
            videoLength: template.videoLength
          }
        };
      } catch (error: any) {
        logger.error(`Error generating for ${platform}:`, error);
        return null;
      }
    });

    const results = await Promise.all(batchPromises);
    const successful = results.filter(r => r !== null);

    // Log cost
    await logCost(userId, 'batch_generation', successful.length * COST_ESTIMATES['gemini-text'], JSON.stringify({
      platforms: platforms.length,
      successful: successful.length
    }));

    res.json({
      count: successful.length,
      results: successful,
      topic
    });

  } catch (error: any) {
    logger.error('Batch generation error:', error);
    res.status(500).json({ message: error.message || 'Batch generation failed' });
  }
});

// ✅ GENEROWANIE TEKSTU (AI Studio) - with text limiter + validation
router.post('/api/generate-content', textLimiter, ...creditGate('generatePost'), validateRequest(textGenerationSchema), async (req, res) => {
  try {
    const { model = 'gemini-flash-latest', contents, config } = req.body || {};
    const primaryModel = mapModel(model);
    const candidates = modelsWithFallback(primaryModel);

    let lastError: unknown;
    for (const modelName of candidates) {
      try {
        const result = await runTextGeneration(modelName, contents, config);
        if (modelName !== primaryModel) {
          logger.info(`[generate-content] Fallback ${primaryModel} → ${modelName} succeeded`);
        }
        return res.json({
          text: result.text,
          ...(result.candidates ? { candidates: result.candidates } : {}),
          ...(result.usageMetadata ? { usageMetadata: result.usageMetadata } : {}),
        });
      } catch (error) {
        lastError = error;
        if (!isGeminiQuotaError(error) || modelName === candidates[candidates.length - 1]) {
          break;
        }
        logger.warn(`[generate-content] Quota on ${modelName}, trying ${candidates[candidates.indexOf(modelName) + 1]}`);
      }
    }

    sendGenerationError(res, lastError);
  } catch (error: unknown) {
    sendGenerationError(res, error);
  }
});

// ✅ STREAMING (AI Studio) - with text limiter + validation
router.post('/api/generate-content-stream', streamLimiter, ...creditGate('generatePost'), validateRequest(textGenerationSchema), async (req, res) => {
  const { model = 'gemini-flash-latest', contents, config } = req.body || {};
  const candidates = modelsWithFallback(mapModel(model));

  let contentArray = contents;
  if (typeof contents === 'string') {
    contentArray = [{ role: 'user', parts: [{ text: contents }] }];
  }

  const generationConfig = {
    temperature: config?.temperature,
    maxOutputTokens: config?.maxOutputTokens,
    responseMimeType: config?.responseMimeType,
  };

  let lastError: unknown;
  for (const modelName of candidates) {
    try {
      const genModel = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: config?.systemInstruction,
      });

      const result = await withTimeout(
        genModel.generateContentStream({ contents: contentArray, generationConfig }),
        120000,
        'Streaming timed out'
      );

      if (modelName !== candidates[0]) {
        logger.info(`[generate-content-stream] Fallback → ${modelName} succeeded`);
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ event: 'done' })}\n\n`);
      return res.end();
    } catch (error) {
      lastError = error;
      if (!isGeminiQuotaError(error) || modelName === candidates[candidates.length - 1]) {
        break;
      }
      logger.warn(`[generate-content-stream] Quota on ${modelName}, trying next model`);
    }
  }

  logger.error('Error in /api/generate-content-stream:', lastError);
  if (!res.headersSent) {
    return sendGenerationError(res, lastError);
  }
  const message = geminiErrorMessage(lastError);
  res.write(
    `data: ${JSON.stringify({ error: message, code: isGeminiQuotaError(lastError) ? 'GEMINI_QUOTA_EXCEEDED' : undefined })}\n\n`
  );
  res.end();
});

// ✅ CHAT (AI Studio) - with text limiter
router.post('/api/generate', textLimiter, ...creditGate('generatePost'), async (req, res) => {
  try {
    const { prompt, history, model = 'gemini-flash-latest' } = req.body;
    const modelName = mapModel(model);

    const genModel = genAI.getGenerativeModel({ model: modelName });

    const chat = genModel.startChat({
      history: history || [],
    });

    const result = await chat.sendMessageStream(prompt);

    res.setHeader('Content-Type', 'text/plain');
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }
    res.end();

  } catch (error: any) {
    logger.error('Error in /api/generate:', error);
    res.status(500).json({ error: error.message });
  }
});


// --- GENEROWANIE OBRAZÓW (Google Imagen 3) ---
router.post('/api/generate-images', expensiveLimiter, ...creditGate('generateImage'), validateRequest(imageGenerationSchema), async (req, res) => {
  try {
    const { prompt, config } = req.body;
    const userId = getAuthUserId(req);
    const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_API_KEY;

    if (!apiKey) {
      logger.error('[Imagen] API key not configured');
      return res.status(503).json({ message: 'Image generation unavailable - Google API key not configured' });
    }

    const startTime = Date.now();

    // Generate image via Google Imagen REST API
    const response = await retryWithBackoff(
      () => withTimeout(
        axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
          {
            instances: [{ prompt }],
            parameters: {
              sampleCount: config?.numberOfImages || 1,
              aspectRatio: config?.aspectRatio || '1:1',
              outputOptions: { mimeType: config?.outputMimeType || 'image/jpeg' }
            }
          },
          { headers: { 'Content-Type': 'application/json' } }
        ),
        120000,
        'Imagen generation timed out'
      ),
      { maxRetries: 2, baseDelay: 2000 }
    );

    const base64Image = response.data?.predictions?.[0]?.bytesBase64Encoded;
    if (!base64Image) {
      throw new Error('No image returned from Imagen');
    }

    const mimeType = response.data?.predictions?.[0]?.mimeType || 'image/jpeg';
    let finalImageUrl = `data:${mimeType};base64,${base64Image}`;

    try {
      const buffer = Buffer.from(base64Image, 'base64');
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const fileName = `generated_images/${userId}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('generated_content')
        .upload(fileName, buffer, { contentType: mimeType, upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('generated_content').getPublicUrl(fileName);
        finalImageUrl = urlData.publicUrl;
      }
    } catch (uploadErr: unknown) {
      logger.warn('[Imagen] Storage upload failed, returning data URL', {
        error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
      });
    }

    const duration = Date.now() - startTime;
    const estimatedCost = COST_ESTIMATES['dalle-standard'] || 0.04; // Adjust cost tracking as needed for Imagen

    logAPICall('Imagen', 'generate-images', duration, true);
    logCost(userId, 'image-generation', estimatedCost, 'Imagen');

    // Track cost in database
    if (costTracker) {
      try {
        await costTracker.trackCost({
          userId,
          operation: 'image-generation',
          provider: 'Imagen',
          cost: estimatedCost,
          durationMs: duration,
          success: true,
          metadata: { size: config?.aspectRatio, quality: 'standard' }
        });
      } catch (e: any) {
        logger.warn('[CostTracker] Failed to track cost due to DB error', { error: e.message });
      }
    }

    // Return format expected by frontend
    res.json({
      generatedImages: [{ image: { mimeType, imageBytes: base64Image } }],
      publicUrls: [finalImageUrl],
      revisedPrompt: prompt
    });

  } catch (error: any) {
    logger.error('[Imagen] Generation failed', { error: error.message, userId: getAuthUserId(req) });
    const axiosMsg = error.response?.data?.error?.message || error.message || 'Image generation failed';
    const status = isGeminiQuotaError(error) || error.response?.status === 429 ? 429 : 500;
    const message = isGeminiQuotaError(error) || error.response?.status === 429
      ? geminiErrorMessage(error)
      : axiosMsg;
    res.status(status).json({
      message,
      code: status === 429 ? 'GEMINI_QUOTA_EXCEEDED' : undefined,
    });
  }
});


// 🎬 SMART VIDEO ROUTER (Veo / Luma / Replicate) — sync lub async + polling statusu
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
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${apiKey}`,
            {
              instances: [{ prompt: visualPrompt }],
              parameters: { aspectRatio: veoAspect },
            },
            { headers: { 'Content-Type': 'application/json' } }
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
              `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
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

          const downloadUrl = videoUri.includes('key=')
            ? videoUri
            : `${videoUri}${videoUri.includes('?') ? '&' : '?'}key=${apiKey}`;

          const vidRes = await retryWithBackoff(
            () =>
              withTimeout(
                axios.get(downloadUrl, { responseType: 'arraybuffer' }),
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

// 🚀 Multi-Platform Optimizer — równoległe wywołania Gemini (szybsze niż sekwencja)
router.post('/api/optimize-multi-platform', textLimiter, ...creditGate('contentOptimization', (req) =>
  PRICING.costs.contentOptimization * Math.max(1, Array.isArray(req.body?.targetPlatforms) ? req.body.targetPlatforms.length : 1)
), validateRequest(multiPlatformSchema), async (req, res) => {
  const PLATFORM_CHAR_LIMITS: Record<string, number> = {
    Facebook: 63206,
    Instagram: 2200,
    TikTok: 2200,
    X: 280,
    LinkedIn: 3000,
    YouTube: 5000,
  };

  async function optimizeOnePlatform(
    platform: string,
    originalText: string,
    tone: string
  ) {
    const systemPrompt = `You are a social media expert. Optimize this post for ${platform} (Tone: ${tone}).
      Original: "${originalText}"
      Return ONLY valid JSON: { "text": "...", "hashtags": [], "tips": [] }`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await retryWithBackoff(
      () =>
        withTimeout(
          model.generateContent(systemPrompt),
          75_000,
          `Optimization timed out for ${platform}`
        ),
      { maxRetries: 2, baseDelay: 1000 }
    );
    const response = await result.response;
    let text = response.text().trim().replace(/```json/g, '').replace(/```/g, '');
    const aiResult = JSON.parse(text) as { text: string; hashtags?: string[]; tips?: string[] };

    return {
      platform,
      text: aiResult.text,
      hashtags: aiResult.hashtags || [],
      characterCount: aiResult.text.length,
      characterLimit: PLATFORM_CHAR_LIMITS[platform] ?? 2200,
      tips: aiResult.tips || [],
      engagement: { score: 85, prediction: 'Wysoki potencjał (AI)' },
    };
  }

  try {
    const { originalText, targetPlatforms, tone } = req.body;

    const settled = await Promise.allSettled(
      targetPlatforms.map((platform: string) =>
        optimizeOnePlatform(platform, originalText, tone)
      )
    );

    const optimizations = settled
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof optimizeOnePlatform>>> => r.status === 'fulfilled')
      .map((r) => r.value);

    settled.forEach((r, i) => {
      if (r.status === 'rejected') {
        logger.error(`Optimization failed for ${targetPlatforms[i]}`, r.reason);
      }
    });

    if (optimizations.length === 0) {
      res.status(500).json({ message: 'Nie udało się zoptymalizować żadnej platformy. Spróbuj ponownie.' });
      return;
    }

    res.json(optimizations);
  } catch (error: unknown) {
    const err = error as { message?: string };
    logger.error('Error in /api/optimize-multi-platform:', error);
    res.status(500).json({ message: err.message || 'Optymalizacja multi-platform nie powiodła się' });
  }
});

// 🧪 A/B Test Variants - with text limiter
router.post('/api/generate-ab-variants', textLimiter, ...creditGate('contentOptimization'), async (req, res) => {
  try {
    const { originalText, platform, tone } = req.body;
    const systemPrompt = `Create A/B variants for ${platform} (${tone}). Original: "${originalText}". Return JSON: { "variantA": "...", "variantB": "..." }`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '');

    res.json(JSON.parse(text));

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

  return router;
}
