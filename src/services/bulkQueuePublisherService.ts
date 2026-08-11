import type { ScheduledPost } from '../types';
import { autoPublishToConnectedAccounts, type AutoPublishOutcome } from './autoPublishService';

export type BulkPublishItemStatus = 'pending' | 'publishing' | 'done' | 'skipped' | 'failed';

export interface BulkPublishProgressItem {
  postId: string;
  topic: string;
  platform: string;
  status: BulkPublishItemStatus;
  error?: string;
  urls?: string[];
}

export interface BulkPublishResult {
  items: BulkPublishProgressItem[];
  published: number;
  failed: number;
  skipped: number;
}

function topicOf(post: ScheduledPost): string {
  const raw = post.formData?.topic || post.result?.postText || 'Bez tytułu';
  return raw.replace(/<[^>]*>?/gm, '').slice(0, 80);
}

/** Posty gotowe do publikacji (scheduled + nie odrzucone / nie wymagające akceptacji). */
export function listPublishableScheduledPosts(
  posts: ScheduledPost[],
  options?: { fromTs?: number; toTs?: number; ids?: string[] }
): ScheduledPost[] {
  const { fromTs, toTs, ids } = options || {};
  return posts
    .filter((p) => {
      if (p.status === 'published') return false;
      if (p.status !== 'scheduled' && p.status !== 'draft') return false;
      if (p.approvalStatus === 'pending_approval' || p.approvalStatus === 'rejected') return false;
      if (ids && !ids.includes(p.id)) return false;
      if (typeof fromTs === 'number' && p.scheduleTimestamp < fromTs) return false;
      if (typeof toTs === 'number' && p.scheduleTimestamp > toTs) return false;
      return Boolean(p.result?.postText?.trim() || p.result?.omnichannelPosts?.length);
    })
    .sort((a, b) => a.scheduleTimestamp - b.scheduleTimestamp);
}

export function postsInDateRange(
  posts: ScheduledPost[],
  start: Date,
  end: Date
): ScheduledPost[] {
  const fromTs = start.getTime();
  const toTs = end.getTime();
  return listPublishableScheduledPosts(posts, { fromTs, toTs });
}

/**
 * Publikuje kolejkę zaplanowanych postów sekwencyjnie z callbackiem postępu.
 */
export async function runBulkPublishQueue(
  posts: ScheduledPost[],
  userId: string,
  onProgress?: (items: BulkPublishProgressItem[], index: number) => void,
  onPostPublished?: (post: ScheduledPost, outcome: AutoPublishOutcome) => Promise<void> | void
): Promise<BulkPublishResult> {
  const items: BulkPublishProgressItem[] = posts.map((p) => ({
    postId: p.id,
    topic: topicOf(p),
    platform: String(p.formData?.platform || '—'),
    status: 'pending',
  }));

  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    items[i] = { ...items[i], status: 'publishing' };
    onProgress?.(items.map((x) => ({ ...x })), i);

    try {
      const outcome = await autoPublishToConnectedAccounts(post.result, post.formData, userId);

      if (outcome.published.length > 0) {
        items[i] = {
          ...items[i],
          status: 'done',
          urls: outcome.published.map((p) => p.url).filter(Boolean) as string[],
        };
        published += 1;
        await onPostPublished?.(post, outcome);
      } else if (outcome.failed.length > 0) {
        items[i] = {
          ...items[i],
          status: 'failed',
          error: outcome.failed.map((f) => f.error).join('; '),
        };
        failed += 1;
      } else {
        items[i] = {
          ...items[i],
          status: 'skipped',
          error: outcome.skipped.map((s) => s.reason).join('; ') || 'Pominięto',
        };
        skipped += 1;
      }
    } catch (e) {
      items[i] = {
        ...items[i],
        status: 'failed',
        error: e instanceof Error ? e.message : 'Błąd publikacji',
      };
      failed += 1;
    }

    onProgress?.(items.map((x) => ({ ...x })), i);
  }

  return { items, published, failed, skipped };
}
