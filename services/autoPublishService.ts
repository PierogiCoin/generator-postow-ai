import {
  Platform,
  GenerationResult,
  FormData,
  GenerationType,
  GenerationMode,
} from '../types';
import { SocialConnection, SocialPlatform } from '../types/socialPublishing';
import { socialConnectionsService } from './socialConnectionsService';
import { callApi } from './apiClient';
import { resolveCtaUrl } from '../utils/publishCaption';

export const PLATFORM_TO_SOCIAL: Partial<Record<Platform, SocialPlatform>> = {
  [Platform.Facebook]: SocialPlatform.Facebook,
  [Platform.Instagram]: SocialPlatform.Instagram,
  [Platform.X]: SocialPlatform.Twitter,
  [Platform.LinkedIn]: SocialPlatform.LinkedIn,
  [Platform.TikTok]: SocialPlatform.TikTok,
};

const SOCIAL_TO_PLATFORM: Partial<Record<SocialPlatform, Platform>> = {
  [SocialPlatform.Facebook]: Platform.Facebook,
  [SocialPlatform.Instagram]: Platform.Instagram,
  [SocialPlatform.Twitter]: Platform.X,
  [SocialPlatform.LinkedIn]: Platform.LinkedIn,
  [SocialPlatform.TikTok]: Platform.TikTok,
};

/** Platformy z bezpośrednią publikacją przez API backendu */
const PUBLISHABLE_SOCIAL = new Set<SocialPlatform>([
  SocialPlatform.Facebook,
  SocialPlatform.Instagram,
  SocialPlatform.Twitter,
  SocialPlatform.LinkedIn,
]);

export interface AutoPublishOutcome {
  published: { platform: string; accountName: string; url?: string }[];
  skipped: { platform: string; reason: string }[];
  failed: { platform: string; error: string }[];
}

export function socialPlatformToPlatform(sp: SocialPlatform): Platform | null {
  return SOCIAL_TO_PLATFORM[sp] ?? null;
}

export function canAutoPublish(result: GenerationResult, formData: FormData): boolean {
  if (!formData.autoPublishToConnected) return false;
  if (formData.generationType === GenerationType.ABTest) return false;
  if (formData.generationType === GenerationType.Idea) return false;
  if (formData.generationType === GenerationType.Campaign) return false;
  if (formData.generationType === GenerationType.Video) return false;
  if (formData.generationMode === GenerationMode.MultiVariant) return false;
  if (result.multiVariantPosts?.length) return false;
  if (result.omnichannelPosts?.length) return true;
  return Boolean(result.postText?.trim());
}

/** Tekst do oceny jakości przed auto-publikacją (główny post lub pierwszy z omnichannel). */
export function getPublishablePostText(result: GenerationResult): string {
  const main = result.postText?.trim() || '';
  if (main.length >= 60) return main;
  const fromOmni = result.omnichannelPosts?.find((p) => p.postText?.trim())?.postText?.trim();
  return fromOmni || main;
}

function formatPostText(text: string, hashtags: string[] = []): string {
  const tags = hashtags
    .filter(Boolean)
    .map((h) => (h.startsWith('#') ? h : `#${h}`))
    .join(' ');
  if (!tags) return text.trim();
  return `${text.trim()}\n\n${tags}`;
}

function truncateForPlatform(text: string, platform: Platform): string {
  const limit = getPlatformCharacterLimit(platform);
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 3))}...`;
}

async function publishOne(
  connection: SocialConnection,
  postText: string,
  imageUrl: string | null | undefined,
  userId: string,
  extras?: { hashtags?: string[]; callToAction?: string | null; ctaUrl?: string | null }
): Promise<{ url?: string }> {
  if (connection.platform === SocialPlatform.Instagram && !imageUrl) {
    throw new Error('Instagram wymaga obrazka do publikacji');
  }

  const result = await callApi(
    'social/publish',
    {
      connectionId: connection.id,
      postText,
      imageUrl: imageUrl || undefined,
      hashtags: extras?.hashtags,
      callToAction: extras?.callToAction,
      ctaUrl: resolveCtaUrl(extras?.ctaUrl),
    },
    userId
  );

  if (!result?.success) {
    throw new Error(result?.message || 'Publikacja nie powiodła się');
  }

  return result;
}

async function publishOmnichannelPosts(
  result: GenerationResult,
  connections: SocialConnection[],
  userId: string,
  out: AutoPublishOutcome
): Promise<void> {
  const posts = result.omnichannelPosts ?? [];

  await Promise.all(
    posts.map(async (ocPost) => {
      const social = PLATFORM_TO_SOCIAL[ocPost.platform];
      if (!social) {
        out.skipped.push({ platform: ocPost.platform, reason: 'Platforma nieobsługiwana' });
        return;
      }

      const conn = connections.find((c) => c.platform === social);
      if (!conn) {
        out.skipped.push({ platform: ocPost.platform, reason: 'Brak połączonego konta' });
        return;
      }

      if (!PUBLISHABLE_SOCIAL.has(social)) {
        out.skipped.push({ platform: ocPost.platform, reason: 'Publikacja API wkrótce' });
        return;
      }

      try {
        const text = truncateForPlatform(ocPost.postText, ocPost.platform);
        const pub = await publishOne(conn, text, result.imageUrl, userId, {
          hashtags: ocPost.hashtags,
          callToAction: result.callToAction,
          ctaUrl: result.ctaUrl,
        });
        out.published.push({
          platform: ocPost.platform,
          accountName: conn.accountName,
          url: pub.url,
        });
      } catch (e) {
        out.failed.push({
          platform: ocPost.platform,
          error: e instanceof Error ? e.message : 'Błąd publikacji',
        });
      }
    })
  );
}

async function resolvePlatformTexts(
  result: GenerationResult,
  formData: FormData,
  connections: SocialConnection[],
  userId: string
): Promise<Map<Platform, { text: string; hashtags: string[] }>> {
  const map = new Map<Platform, { text: string; hashtags: string[] }>();

  if (!formData.autoOptimizePerPlatform || connections.length <= 1) {
    return map;
  }

  const targetPlatforms = [
    ...new Set(
      connections
        .map((c) => socialPlatformToPlatform(c.platform))
        .filter((p): p is Platform => {
          if (p === null) return false;
          const social = PLATFORM_TO_SOCIAL[p];
          return social !== undefined && PUBLISHABLE_SOCIAL.has(social);
        })
    ),
  ];

  if (targetPlatforms.length <= 1) return map;

  try {
    const optimizations = await optimizeForPlatforms(
      {
        originalText: result.postText,
        originalPlatform: result.platform,
        targetPlatforms,
        tone: result.metadata.tone,
        hashtags: result.hashtags,
      },
      userId
    );

    for (const opt of optimizations) {
      map.set(opt.platform, { text: opt.text, hashtags: opt.hashtags ?? [] });
    }
  } catch {
    // Fallback: ta sama treść na wszystkie platformy
  }

  return map;
}

async function publishStandardPost(
  result: GenerationResult,
  formData: FormData,
  connections: SocialConnection[],
  userId: string,
  out: AutoPublishOutcome
): Promise<void> {
  const platformTexts = await resolvePlatformTexts(result, formData, connections, userId);

  await Promise.all(
    connections.map(async (conn) => {
      const platform = socialPlatformToPlatform(conn.platform);
      const label = platform ?? conn.platform;

      if (!platform) {
        out.skipped.push({ platform: label, reason: 'Platforma nieobsługiwana' });
        return;
      }

      if (!PUBLISHABLE_SOCIAL.has(conn.platform)) {
        out.skipped.push({ platform: label, reason: 'Publikacja API wkrótce' });
        return;
      }

      const optimized = platformTexts.get(platform);
      const rawText = optimized?.text ?? result.postText;
      const hashtags = optimized?.hashtags ?? result.hashtags;
      const text = truncateForPlatform(rawText, platform);

      try {
        const pub = await publishOne(conn, text, result.imageUrl, userId, {
          hashtags,
          callToAction: result.callToAction,
          ctaUrl: result.ctaUrl,
        });
        out.published.push({ platform: label, accountName: conn.accountName, url: pub.url });
      } catch (e) {
        out.failed.push({
          platform: label,
          error: e instanceof Error ? e.message : 'Błąd publikacji',
        });
      }
    })
  );
}

export async function autoPublishToConnectedAccounts(
  result: GenerationResult,
  formData: FormData,
  userId: string
): Promise<AutoPublishOutcome> {
  const connections = await socialConnectionsService.getConnections(userId);
  const out: AutoPublishOutcome = { published: [], skipped: [], failed: [] };

  if (connections.length === 0) {
    out.failed.push({ platform: '—', error: 'Brak połączonych kont społecznościowych' });
    return out;
  }

  if (result.omnichannelPosts?.length) {
    await publishOmnichannelPosts(result, connections, userId, out);
    return out;
  }

  await publishStandardPost(result, formData, connections, userId, out);
  return out;
}
