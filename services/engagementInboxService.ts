import type { Platform, Tone } from '../types';
import { Platform as PlatformEnum, Tone as ToneEnum } from '../types';
import type { SocialPost } from '../types/socialPublishing';
import { socialConnectionsService } from './socialConnectionsService';
import {
  generateSmartReply,
  type UnifiedMessage,
} from './crossPlatformService';

function mapPlatform(raw?: string): Platform {
  const p = (raw || '').toLowerCase();
  if (p.includes('instagram')) return PlatformEnum.Instagram;
  if (p.includes('linkedin')) return PlatformEnum.LinkedIn;
  if (p.includes('twitter') || p === 'x') return PlatformEnum.X;
  if (p.includes('tiktok')) return PlatformEnum.TikTok;
  if (p.includes('youtube')) return PlatformEnum.YouTube;
  return PlatformEnum.Facebook;
}

function sentimentFromMetrics(comments: number, likes: number): UnifiedMessage['sentiment'] {
  if (comments >= 10) return 'urgent';
  if (likes > 50 && comments > 0) return 'positive';
  if (comments > 0) return 'neutral';
  return 'neutral';
}

function priorityFromMetrics(comments: number): UnifiedMessage['priority'] {
  if (comments >= 20) return 'critical';
  if (comments >= 8) return 'high';
  if (comments >= 2) return 'medium';
  return 'low';
}

/**
 * Buduje skrzynkę engagement z postów social (komentarze jako sygnał do odpowiedzi).
 * MVP: jeden wpis na post z komentarzami — draft odpowiedzi AI do wątku.
 */
export function buildInboxFromSocialPosts(posts: SocialPost[]): UnifiedMessage[] {
  return posts
    .map((post) => {
      const comments =
        post.metrics?.comments ??
        (post as { comments?: number }).comments ??
        0;
      const likes =
        post.metrics?.likes ??
        (post as { likes?: number }).likes ??
        0;
      if (!comments || comments < 1) return null;

      const content = (post.content || '').trim();
      const platform = mapPlatform(post.platform);
      const publishedAt =
        typeof post.publishedAt === 'string'
          ? post.publishedAt
          : post.publishedAt instanceof Date
            ? post.publishedAt.toISOString()
            : new Date().toISOString();

      const message: UnifiedMessage = {
        id: `inbox-${post.id}`,
        platform,
        type: 'comment',
        author: {
          name: 'Społeczność',
          handle: `${comments}_komentarzy`,
          isVerified: false,
          isFollowing: false,
        },
        content: `${comments} komentarz(y) pod postem: „${content.slice(0, 160)}${content.length > 160 ? '…' : ''}”`,
        timestamp: publishedAt,
        sentiment: sentimentFromMetrics(comments, likes),
        priority: priorityFromMetrics(comments),
        originalPost: {
          id: post.platformPostId || post.id,
          content: content.slice(0, 400),
          url: post.url || '',
        },
        engagementOpportunity:
          comments >= 5
            ? 'Wysoki engagement — odpowiedz szybko, by podbić zasięg wątku.'
            : 'Odpowiedź buduje lojalność społeczności.',
        requiresHumanReview: comments >= 15,
      };
      return message;
    })
    .filter((m): m is UnifiedMessage => Boolean(m))
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    });
}

export async function loadEngagementInbox(userId: string): Promise<UnifiedMessage[]> {
  const posts = await socialConnectionsService.getAggregateHistory(userId);
  const base = buildInboxFromSocialPosts(posts);

  // Wzbogać o treść komentarzy (FB/IG) gdy mamy connectionId + platformPostId
  const enriched: UnifiedMessage[] = [];
  for (const msg of base.slice(0, 8)) {
    const post = posts.find((p) => `inbox-${p.id}` === msg.id);
    if (!post?.connectionId || !post.platformPostId) {
      enriched.push(msg);
      continue;
    }
    const platform = (post.platform || '').toLowerCase();
    if (platform !== 'facebook' && platform !== 'instagram') {
      enriched.push(msg);
      continue;
    }
    try {
      const { getApiBaseUrl, getApiAuthHeaders } = await import('./apiClient');
      const headers = await getApiAuthHeaders(userId);
      const url = `${getApiBaseUrl()}/api/social/comments?connectionId=${encodeURIComponent(post.connectionId)}&platformPostId=${encodeURIComponent(post.platformPostId)}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        enriched.push(msg);
        continue;
      }
      const data = (await res.json()) as {
        comments?: Array<{ id: string; message: string; authorName: string; createdAt: string }>;
      };
      const comments = data.comments || [];
      if (comments.length === 0) {
        enriched.push(msg);
        continue;
      }
      for (const c of comments.slice(0, 3)) {
        enriched.push({
          ...msg,
          id: `comment-${c.id}`,
          author: {
            name: c.authorName,
            handle: c.authorName.toLowerCase().replace(/\s+/g, '_'),
            isVerified: false,
            isFollowing: false,
          },
          content: c.message || msg.content,
          timestamp: c.createdAt || msg.timestamp,
        });
      }
    } catch {
      enriched.push(msg);
    }
  }

  return enriched.length > 0 ? enriched : base;
}

export async function draftReplyForInboxItem(
  message: UnifiedMessage,
  tone: Tone,
  userId: string
): Promise<{ friendly: string; professional: string; brief: string; emoji: string }> {
  return generateSmartReply(message, tone || ToneEnum.Professional, message.originalPost?.content, userId);
}
