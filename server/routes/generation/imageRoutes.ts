import { Router } from 'express';
import axios from 'axios';
import logger, { logCost, logAPICall } from '../../logger.js';
import { COST_ESTIMATES } from '../../costTracking.js';
import { supabase, costTracker } from '../../lib/clients.js';
import { retryWithBackoff, withTimeout } from '../../lib/retry.js';
import {
  isGeminiQuotaError,
  geminiErrorMessage,
} from '../../lib/geminiErrors.js';
import { validateRequest, imageGenerationSchema } from '../../middleware/validate.js';
import { expensiveLimiter } from '../../middleware/rateLimiter.js';
import { creditGate } from '../../middleware/credits.js';
import { getAuthUserId } from '../../middleware/supabaseAuth.js';
import {
  generateTogetherImage,
  isTogetherConfigured,
  aspectRatioToPixels,
} from '../../lib/togetherClient.js';

function resolveEstimatedImageCost(
  provider: 'together' | 'imagen',
  quality: 'standard' | 'typography' | 'hd'
): number {
  if (provider === 'together') {
    if (quality === 'typography') return COST_ESTIMATES['flux-typography'] || 0.04;
    return COST_ESTIMATES['flux-standard'] || 0.03;
  }
  if (quality === 'hd') return COST_ESTIMATES['dalle-hd'] || 0.08;
  return COST_ESTIMATES['imagen-standard'] || COST_ESTIMATES['dalle-standard'] || 0.04;
}

async function uploadGeneratedImage(
  userId: string,
  base64Image: string,
  mimeType: string
): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${base64Image}`;
  try {
    const buffer = Buffer.from(base64Image, 'base64');
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const fileName = `generated_images/${userId}_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('generated_content')
      .upload(fileName, buffer, { contentType: mimeType, upsert: true });
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('generated_content').getPublicUrl(fileName);
      return urlData.publicUrl;
    }
  } catch (uploadErr: unknown) {
    logger.warn('[Images] Storage upload failed, returning data URL', {
      error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
    });
  }
  return dataUrl;
}

async function generateViaImagen(
  prompt: string,
  config: {
    numberOfImages?: number;
    aspectRatio?: string;
    outputMimeType?: string;
  },
  apiKey: string
): Promise<{ base64: string; mimeType: string }> {
  const response = await retryWithBackoff(
    () =>
      withTimeout(
        axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict`,
          {
            instances: [{ prompt }],
            parameters: {
              sampleCount: config?.numberOfImages || 1,
              aspectRatio: config?.aspectRatio || '1:1',
              outputOptions: { mimeType: config?.outputMimeType || 'image/jpeg' },
            },
          },
          { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey } }
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
  return { base64: base64Image, mimeType };
}

export function createImageGenerationRouter(): Router {
  const router = Router();

  router.post(
    '/api/generate-images',
    expensiveLimiter,
    ...creditGate('generateImage'),
    validateRequest(imageGenerationSchema),
    async (req, res) => {
      try {
        const { prompt, config, referenceImages, quality, provider } = req.body;
        const userId = getAuthUserId(req);
        const googleKey = process.env.GOOGLE_API_KEY || process.env.VITE_API_KEY;
        const startTime = Date.now();
        const requestedQuality: 'standard' | 'typography' | 'hd' =
          quality || config?.quality || 'standard';

        const preferTogether =
          provider !== 'imagen' &&
          isTogetherConfigured() &&
          (provider === 'together' || provider === 'auto' || !provider);

        let base64Image: string;
        let mimeType: string;
        let usedProvider: 'together' | 'imagen';
        let usedModel: string;

        if (preferTogether) {
          try {
            const dims = aspectRatioToPixels(config?.aspectRatio);
            const together = await retryWithBackoff(
              () =>
                withTimeout(
                  generateTogetherImage({
                    prompt,
                    quality: requestedQuality,
                    aspectRatio: config?.aspectRatio,
                    referenceImages: Array.isArray(referenceImages)
                      ? referenceImages.filter((u: unknown) => typeof u === 'string')
                      : undefined,
                    width: dims.width,
                    height: dims.height,
                  }),
                  120000,
                  'Together generation timed out'
                ),
              { maxRetries: 1, baseDelay: 1500 }
            );
            base64Image = together.base64;
            mimeType = together.mimeType;
            usedProvider = 'together';
            usedModel = together.model;
          } catch (togetherErr) {
            logger.warn('[Images] Together failed, falling back to Imagen', {
              error: togetherErr instanceof Error ? togetherErr.message : String(togetherErr),
            });
            if (!googleKey) {
              throw togetherErr;
            }
            // Map UI ratios Imagen can't do
            let imagenRatio = config?.aspectRatio || '1:1';
            if (imagenRatio === '4:3') imagenRatio = '16:9';
            if (imagenRatio === '3:4') imagenRatio = '9:16';
            if (!['1:1', '16:9', '9:16'].includes(imagenRatio)) imagenRatio = '1:1';
            const imagen = await generateViaImagen(
              prompt,
              { ...config, aspectRatio: imagenRatio },
              googleKey
            );
            base64Image = imagen.base64;
            mimeType = imagen.mimeType;
            usedProvider = 'imagen';
            usedModel = 'imagen-4.0-generate-001';
          }
        } else {
          if (!googleKey) {
            logger.error('[Imagen] API key not configured');
            return res
              .status(503)
              .json({ message: 'Image generation unavailable — configure TOGETHER_API_KEY or GOOGLE_API_KEY' });
          }
          let imagenRatio = config?.aspectRatio || '1:1';
          if (imagenRatio === '4:3') imagenRatio = '16:9';
          if (imagenRatio === '3:4') imagenRatio = '9:16';
          if (!['1:1', '16:9', '9:16'].includes(imagenRatio)) imagenRatio = '1:1';
          const imagen = await generateViaImagen(
            prompt,
            { ...config, aspectRatio: imagenRatio },
            googleKey
          );
          base64Image = imagen.base64;
          mimeType = imagen.mimeType;
          usedProvider = 'imagen';
          usedModel = 'imagen-4.0-generate-001';
        }

        const finalImageUrl = await uploadGeneratedImage(userId, base64Image, mimeType);
        const duration = Date.now() - startTime;
        const estimatedCost = resolveEstimatedImageCost(usedProvider, requestedQuality);

        logAPICall(usedProvider === 'together' ? 'Together' : 'Imagen', 'generate-images', duration, true);
        logCost(userId, 'image-generation', estimatedCost, usedProvider === 'together' ? 'Together' : 'Imagen');

        if (costTracker) {
          try {
            await costTracker.trackCost({
              userId,
              operation: 'image-generation',
              provider: usedProvider === 'together' ? 'Together' : 'Imagen',
              cost: estimatedCost,
              durationMs: duration,
              success: true,
              metadata: {
                size: config?.aspectRatio,
                quality: requestedQuality,
                model: usedModel,
              },
            });
          } catch (e: unknown) {
            logger.warn('[CostTracker] Failed to track cost due to DB error', {
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        res.json({
          generatedImages: [{ image: { mimeType, imageBytes: base64Image } }],
          publicUrls: [finalImageUrl],
          revisedPrompt: prompt,
          provider: usedProvider,
          model: usedModel,
        });
      } catch (error: unknown) {
        const userId = getAuthUserId(req);
        if (costTracker) {
          try {
            await costTracker.trackCost({
              userId,
              operation: 'image-generation',
              provider: 'Unknown',
              cost: 0,
              success: false,
              metadata: {
                requestedProvider: req.body?.provider,
                requestedQuality: req.body?.quality || req.body?.config?.quality,
              },
            });
          } catch (e: unknown) {
            logger.warn('[CostTracker] Failed to track failed image generation', {
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        logger.error('[Images] Generation failed', {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        const axiosMsg =
          (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
            ?.message ||
          (error instanceof Error ? error.message : '') ||
          'Image generation failed';
        const status =
          isGeminiQuotaError(error) || (error as { response?: { status?: number } })?.response?.status === 429
            ? 429
            : 500;
        const message =
          isGeminiQuotaError(error) || (error as { response?: { status?: number } })?.response?.status === 429
            ? geminiErrorMessage(error)
            : axiosMsg;
        res.status(status).json({
          message,
          code: status === 429 ? 'GEMINI_QUOTA_EXCEEDED' : undefined,
        });
      }
    }
  );

  return router;
}
