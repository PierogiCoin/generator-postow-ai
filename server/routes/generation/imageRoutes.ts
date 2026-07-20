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

export function createImageGenerationRouter(): Router {
  const router = Router();

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
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict`,
          {
            instances: [{ prompt }],
            parameters: {
              sampleCount: config?.numberOfImages || 1,
              aspectRatio: config?.aspectRatio || '1:1',
              outputOptions: { mimeType: config?.outputMimeType || 'image/jpeg' }
            }
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
      } catch (e: unknown) {
        logger.warn('[CostTracker] Failed to track cost due to DB error', { error: e instanceof Error ? e.message : String(e) });
      }
    }

    // Return format expected by frontend
    res.json({
      generatedImages: [{ image: { mimeType, imageBytes: base64Image } }],
      publicUrls: [finalImageUrl],
      revisedPrompt: prompt
    });

  } catch (error: unknown) {
    logger.error('[Imagen] Generation failed', { error: error instanceof Error ? error.message : String(error), userId: getAuthUserId(req) });
    const axiosMsg = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || (error instanceof Error ? error.message : '') || 'Image generation failed';
    const status = isGeminiQuotaError(error) || (error as { response?: { status?: number } })?.response?.status === 429 ? 429 : 500;
    const message = isGeminiQuotaError(error) || (error as { response?: { status?: number } })?.response?.status === 429
      ? geminiErrorMessage(error)
      : axiosMsg;
    res.status(status).json({
      message,
      code: status === 429 ? 'GEMINI_QUOTA_EXCEEDED' : undefined,
    });
  }
});

  return router;
}
