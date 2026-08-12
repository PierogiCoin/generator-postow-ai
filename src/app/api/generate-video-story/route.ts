import { NextRequest, NextResponse } from 'next/server';
import { withCredits } from '@/lib/api-utils';
import { apiKey, luma, replicate } from '@server/lib/clients';
import logger from '@server/logger';

/**
 * Video Story endpoint — credits are only deducted when generation actually starts.
 * Until Veo/Luma/Replicate pipeline is fully wired end-to-end, we fail honestly (no mock bunny, no hanging jobs).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const duration = Number(body?.duration ?? body?.videoLength ?? 15);
    let actionKey: 'videoStoryShort' | 'videoStoryMedium' | 'videoStoryLong' = 'videoStoryShort';
    if (duration > 30) actionKey = 'videoStoryLong';
    else if (duration > 15) actionKey = 'videoStoryMedium';

    // Auth + plan gate without deducting yet
    const creditCheck = await withCredits(req, actionKey);
    if ('error' in creditCheck) return creditCheck.error;

    const { user } = creditCheck;
    const {
      platform,
      style,
      aspectRatio: aspectRatioBody,
      provider: providerBody = 'auto',
      needsAudio = false,
    } = body;

    const platformVertical = ['TikTok', 'Instagram', 'YouTube Shorts', 'Reels'].includes(platform);
    const aspectRatio: '9:16' | '16:9' | '1:1' =
      aspectRatioBody ?? (platformVertical ? '9:16' : '16:9');
    const hasVeo = !!apiKey;

    let provider: 'veo' | 'luma' | 'replicate' | null = null;
    if (providerBody === 'veo' && hasVeo) provider = 'veo';
    else if (providerBody === 'luma' && luma) provider = 'luma';
    else if (providerBody === 'replicate' && replicate) provider = 'replicate';
    else if (hasVeo) provider = 'veo';
    else if (luma) provider = 'luma';
    else if (replicate && aspectRatio === '16:9' && !needsAudio) provider = 'replicate';

    if (!provider) {
      return NextResponse.json(
        {
          message:
            'Generowanie wideo niedostępne — skonfiguruj GOOGLE_API_KEY (Veo), LUMA_API_KEY lub REPLICATE_API_TOKEN na serwerze.',
          code: 'VIDEO_PROVIDER_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    logger.info('[Video Story] Request rejected — pipeline not production-ready', {
      platform,
      aspectRatio,
      style,
      provider,
      userId: user.id,
    });

    // Honest failure: keys may exist, but async job + provider completion is not shipped yet.
    // Do not deduct credits and do not return sample/mock videos.
    return NextResponse.json(
      {
        message:
          'Generowanie Video Story jest jeszcze wdrażane. Kredyty nie zostały pobrane — spróbuj ponownie wkrótce lub użyj obrazu w poście.',
        code: 'VIDEO_STORY_NOT_READY',
        provider,
      },
      { status: 503 }
    );
  } catch (error: unknown) {
    logger.error('generate-video-story error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Video generation failed' },
      { status: 500 }
    );
  }
}
