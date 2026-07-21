import { Router } from 'express';
import logger, { logCost } from '../../logger.js';
import { COST_ESTIMATES } from '../../costTracking.js';
import { getTemplatesByPlatform } from '../../contentTemplates.js';
import { genAI } from '../../lib/clients.js';
import { retryWithBackoff, withTimeout } from '../../lib/retry.js';
import { mapModel } from '../../lib/mapModel.js';
import {
  isGeminiQuotaError,
  geminiErrorMessage,
} from '../../lib/geminiErrors.js';
import {
  validateRequest,
  textGenerationSchema,
  multiPlatformSchema,
  batchGenerationSchema,
  chatGenerationSchema,
  abVariantsSchema,
} from '../../middleware/validate.js';
import { textLimiter, streamLimiter } from '../../middleware/rateLimiter.js';
import { creditGate } from '../../middleware/credits.js';
import { getAuthUserId } from '../../middleware/supabaseAuth.js';
import { PRICING } from '../../stripe.js';
import {
  runTextGeneration,
  modelsWithFallback,
  sendGenerationError,
} from './helpers.js';
import { startGenerationTrace } from '../../lib/langfuse.js';

export function createTextGenerationRouter(): Router {
  const router = Router();

router.post('/api/generate-batch', textLimiter, ...creditGate('generatePost', (req) =>
  PRICING.costs.generatePost * Math.max(1, Array.isArray(req.body?.platforms) ? req.body.platforms.length : 1)
), validateRequest(batchGenerationSchema), async (req, res) => {
  try {
    const { topic, platforms, style = 'Professional', tone = 'Casual' } = req.body;
    const userId = getAuthUserId(req);

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
      } catch (error: unknown) {
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

  } catch (error: unknown) {
    logger.error('Batch generation error:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Batch generation failed' });
  }
});

router.post('/api/generate-content', textLimiter, ...creditGate('generatePost'), validateRequest(textGenerationSchema), async (req, res) => {
  const userId = getAuthUserId(req);
  const { model = 'gemini-flash-latest', contents, config } = req.body || {};
  const primaryModel = mapModel(model);
  const candidates = modelsWithFallback(primaryModel);
  const inputPreview =
    typeof contents === 'string'
      ? contents
      : JSON.stringify(contents)?.slice(0, 1500);

  const trace = startGenerationTrace({
    name: 'generate-content',
    userId,
    model: primaryModel,
    inputPreview,
    tags: ['generate-content', 'text'],
    metadata: { candidates },
  });

  try {
    let lastError: unknown;
    for (const modelName of candidates) {
      try {
        const result = await runTextGeneration(modelName, contents, config);
        if (modelName !== primaryModel) {
          logger.info(`[generate-content] Fallback ${primaryModel} → ${modelName} succeeded`);
        }
        trace.end({ output: result.text, model: modelName });
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

    trace.end({
      level: 'ERROR',
      statusMessage: geminiErrorMessage(lastError),
      model: primaryModel,
    });
    sendGenerationError(res, lastError);
  } catch (error: unknown) {
    trace.end({
      level: 'ERROR',
      statusMessage: error instanceof Error ? error.message : 'unknown',
    });
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
router.post('/api/generate', textLimiter, ...creditGate('generatePost'), validateRequest(chatGenerationSchema), async (req, res) => {
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

  } catch (error: unknown) {
    logger.error('Error in /api/generate:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

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
router.post('/api/generate-ab-variants', textLimiter, ...creditGate('contentOptimization'), validateRequest(abVariantsSchema), async (req, res) => {
  try {
    const { originalText, platform, tone } = req.body;
    const systemPrompt = `Create A/B variants for ${platform} (${tone}). Original: "${originalText}". Return JSON: { "variantA": "...", "variantB": "..." }`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '');

    res.json(JSON.parse(text));

  } catch (error: unknown) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
});


  return router;
}
