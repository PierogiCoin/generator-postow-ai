import axios from 'axios';
import logger from '../logger.js';

export type TogetherImageModel =
  | 'black-forest-labs/FLUX.2-pro'
  | 'black-forest-labs/FLUX.2-flex';

export type ImageQualityTier = 'standard' | 'typography';

export function resolveTogetherModel(tier?: ImageQualityTier | string): TogetherImageModel {
  if (tier === 'typography') return 'black-forest-labs/FLUX.2-flex';
  return 'black-forest-labs/FLUX.2-pro';
}

/** Pixel size for Together FLUX from UI aspect ratios. */
export function aspectRatioToPixels(
  ratio?: string
): { width: number; height: number } {
  switch (ratio) {
    case '16:9':
      return { width: 1344, height: 768 };
    case '9:16':
      return { width: 768, height: 1344 };
    case '4:3':
      return { width: 1152, height: 896 };
    case '3:4':
      return { width: 896, height: 1152 };
    case '1:1':
    default:
      return { width: 1024, height: 1024 };
  }
}

export function isTogetherConfigured(): boolean {
  return Boolean(process.env.TOGETHER_API_KEY?.trim());
}

export interface TogetherImageResult {
  base64: string;
  mimeType: string;
  model: string;
}

/**
 * Generate image via Together AI FLUX.2 Images API.
 * https://docs.together.ai/docs/quickstart-flux
 */
export async function generateTogetherImage(params: {
  prompt: string;
  quality?: ImageQualityTier | string;
  aspectRatio?: string;
  referenceImages?: string[];
  width?: number;
  height?: number;
}): Promise<TogetherImageResult> {
  const apiKey = process.env.TOGETHER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('TOGETHER_API_KEY not configured');
  }

  const model = resolveTogetherModel(params.quality);
  const dims =
    params.width && params.height
      ? { width: params.width, height: params.height }
      : aspectRatioToPixels(params.aspectRatio);

  const body: Record<string, unknown> = {
    model,
    prompt: params.prompt,
    width: dims.width,
    height: dims.height,
    response_format: 'b64_json',
    n: 1,
  };

  if (params.referenceImages?.length) {
    body.reference_images = params.referenceImages.slice(0, 8);
  }

  logger.info('[Together] Generating image', {
    model,
    width: dims.width,
    height: dims.height,
    refs: params.referenceImages?.length ?? 0,
  });

  const response = await axios.post(
    'https://api.together.xyz/v1/images/generations',
    body,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120_000,
    }
  );

  const item = response.data?.data?.[0];
  const b64 = item?.b64_json as string | undefined;
  if (!b64) {
    // Some responses return URL only
    const url = item?.url as string | undefined;
    if (url) {
      const imgRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 60_000 });
      const mimeType = (imgRes.headers['content-type'] as string) || 'image/jpeg';
      return {
        base64: Buffer.from(imgRes.data).toString('base64'),
        mimeType,
        model,
      };
    }
    throw new Error('No image returned from Together');
  }

  return {
    base64: b64,
    mimeType: 'image/jpeg',
    model,
  };
}
