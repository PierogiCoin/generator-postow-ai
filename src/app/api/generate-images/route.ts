import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { withCredits } from '@/lib/api-utils';
import { supabase, costTracker } from '@server/lib/clients';
import { retryWithBackoff, withTimeout } from '@server/lib/retry';
import { COST_ESTIMATES } from '@server/costTracking';
import { isGeminiQuotaError, geminiErrorMessage } from '@server/lib/geminiErrors';
import {
  generateTogetherImage,
  isTogetherConfigured,
  aspectRatioToPixels,
} from '@server/lib/togetherClient';
import logger, { logCost, logAPICall } from '@server/logger';

function resolveEstimatedImageCost(provider: 'together' | 'imagen', quality: 'standard' | 'typography' | 'hd'): number {
  if (provider === 'together') {
    if (quality === 'typography') return COST_ESTIMATES['flux-typography'] || 0.04;
    return COST_ESTIMATES['flux-standard'] || 0.03;
  }
  if (quality === 'hd') return COST_ESTIMATES['dalle-hd'] || 0.08;
  return COST_ESTIMATES['imagen-standard'] || 0.04;
}

async function uploadGeneratedImage(userId: string, base64Image: string, mimeType: string): Promise<string> {
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
  } catch (uploadErr) {
    logger.warn('[Images] Storage upload failed, returning data URL', { error: String(uploadErr) });
  }
  return dataUrl;
}

function normalizeImagenRequest(prompt: string, config: any, negativePrompt?: string) {
  let imagenRatio = config?.aspectRatio || '1:1';
  if (imagenRatio === '4:3') imagenRatio = '16:9';
  if (imagenRatio === '3:4' || imagenRatio === '4:5' || imagenRatio === '3:5') imagenRatio = '9:16';
  if (!['1:1', '16:9', '9:16'].includes(imagenRatio)) imagenRatio = '1:1';

  const imagenPrompt = negativePrompt?.trim()
    ? `${prompt}\n\nAVOID: ${negativePrompt.trim()}`
    : prompt;

  return { prompt: imagenPrompt, aspectRatio: imagenRatio };
}

async function generateViaImagen(prompt: string, config: any, apiKey: string) {
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
  if (!base64Image) throw new Error('No image returned from Imagen');
  return { base64: base64Image, mimeType: response.data?.predictions?.[0]?.mimeType || 'image/jpeg' };
}

export async function POST(req: NextRequest) {
  try {
    const creditCheck = await withCredits(req, 'generateImage');
    if ('error' in creditCheck) return creditCheck.error;

    const { user, deduct } = creditCheck;
    const body = await req.json();
    const { prompt, config, referenceImages, quality, provider, negativePrompt } = body;
    
    const googleKey = process.env.GOOGLE_API_KEY || process.env.VITE_API_KEY;
    const startTime = Date.now();
    const requestedQuality = quality || config?.quality || 'standard';

    const preferTogether = provider !== 'imagen' && isTogetherConfigured() && (provider === 'together' || provider === 'auto' || !provider);

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
                referenceImages: Array.isArray(referenceImages) ? referenceImages.filter((u: unknown) => typeof u === 'string') : undefined,
                width: dims.width,
                height: dims.height,
                negativePrompt: typeof negativePrompt === 'string' ? negativePrompt : undefined,
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
        logger.warn('[Images] Together failed, falling back to Imagen', { error: String(togetherErr) });
        if (!googleKey) throw togetherErr;
        
        const { prompt: imagenPrompt, aspectRatio: imagenRatio } = normalizeImagenRequest(prompt, config, negativePrompt);
        const imagen = await generateViaImagen(imagenPrompt, { ...config, aspectRatio: imagenRatio }, googleKey);
        
        base64Image = imagen.base64;
        mimeType = imagen.mimeType;
        usedProvider = 'imagen';
        usedModel = 'imagen-4.0-generate-001';
      }
    } else {
      if (!googleKey) {
        logger.error('[Imagen] API key not configured');
        return NextResponse.json({ message: 'Image generation unavailable' }, { status: 503 });
      }
      const { prompt: imagenPrompt, aspectRatio: imagenRatio } = normalizeImagenRequest(prompt, config, negativePrompt);
      const imagen = await generateViaImagen(imagenPrompt, { ...config, aspectRatio: imagenRatio }, googleKey);
      base64Image = imagen.base64;
      mimeType = imagen.mimeType;
      usedProvider = 'imagen';
      usedModel = 'imagen-4.0-generate-001';
    }

    const finalImageUrl = await uploadGeneratedImage(user.id, base64Image, mimeType);
    const duration = Date.now() - startTime;
    const estimatedCost = resolveEstimatedImageCost(usedProvider, requestedQuality);

    logAPICall(usedProvider === 'together' ? 'Together' : 'Imagen', 'generate-images', duration, true);
    logCost(user.id, 'image-generation', estimatedCost, usedProvider === 'together' ? 'Together' : 'Imagen');

    if (costTracker) {
      try {
        await costTracker.trackCost({
          userId: user.id,
          operation: 'image-generation',
          provider: usedProvider === 'together' ? 'Together' : 'Imagen',
          cost: estimatedCost,
          durationMs: duration,
          success: true,
          metadata: { size: config?.aspectRatio, quality: requestedQuality, model: usedModel },
        });
      } catch (e) {
        logger.warn('[CostTracker] Failed to track cost due to DB error');
      }
    }

    const remaining = await deduct(req.nextUrl.pathname, req.method);

    return NextResponse.json({
      generatedImages: [{ image: { mimeType, imageBytes: base64Image } }],
      publicUrls: [finalImageUrl],
      revisedPrompt: prompt,
      provider: usedProvider,
      model: usedModel,
      creditsRemaining: remaining
    }, {
      headers: {
        'X-Credits-Remaining': String(remaining)
      }
    });
  } catch (error: unknown) {
    logger.error('[Images] Generation failed', { error: String(error) });
    const status = isGeminiQuotaError(error) || (error as any)?.response?.status === 429 ? 429 : 500;
    const message = isGeminiQuotaError(error) || status === 429 ? geminiErrorMessage(error) : ((error as any)?.response?.data?.error?.message || (error instanceof Error ? error.message : 'Image generation failed'));
    
    return NextResponse.json({
      message,
      code: status === 429 ? 'GEMINI_QUOTA_EXCEEDED' : undefined,
    }, { status });
  }
}
