import logger from '../logger.js';
import { supabase } from '../lib/clients.js';
import { fetchTopSlots, nextOccurrenceForSlot, type Slot } from '../lib/schedulingAnalytics.js';
import { formatPublishCaption, normalizeCtaUrl } from '../lib/publishCaption.js';
import {
  isApprovalBlockingPublish,
  normalizeSocialPlatform,
  type PublishFormat,
} from '../lib/socialPublishGuards.js';
import { publishToConnection } from '../lib/publishToConnection.js';

let schedulerBlockedUntil: number | null = null;
let isRunning = false;

const PUBLISHABLE = new Set([
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
  'threads',
]);

async function markFailed(
  postId: string,
  lastError: string,
  retryCount = 0,
  nextRetryAt?: string
) {
  await supabase.from('scheduled_posts').update({
    status: 'failed',
    retry_count: retryCount,
    last_error: lastError,
    ...(nextRetryAt ? { next_retry_at: nextRetryAt } : {}),
  }).eq('id', postId);
}

async function processScheduledPosts() {
  const nowDate = new Date();
  const nowIso = nowDate.toISOString();

  if (isRunning) {
    logger.warn('[Scheduler] Previous run still in progress — skip');
    return;
  }

  if (schedulerBlockedUntil && Date.now() < schedulerBlockedUntil) {
    logger.warn('[Scheduler] Skipping run (previous permission error, backoff active)');
    return;
  }

  isRunning = true;
  try {
    const { data: unscheduled } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'scheduled')
      .is('scheduled_at', null)
      .limit(100);

    const slotCache: Record<string, Slot[]> = {};

    if (unscheduled && unscheduled.length > 0) {
      for (const post of unscheduled) {
        try {
          const timezone = post.form_data?.timezone || post.form_data?.tz || 'UTC';
          const cacheKey = `${post.user_id}-${timezone}`;
          if (!slotCache[cacheKey]) {
            slotCache[cacheKey] = await fetchTopSlots(post.user_id, timezone, 5);
          }

          const slots = slotCache[cacheKey];
          let scheduledAt: string | null = null;

          if (slots && slots.length > 0) {
            for (const slot of slots) {
              const candidate = nextOccurrenceForSlot(slot, timezone, nowDate);
              if (candidate) {
                scheduledAt = candidate;
                break;
              }
            }
          }

          if (!scheduledAt) {
            scheduledAt = new Date(nowDate.getTime() + 10 * 60 * 1000).toISOString();
          }

          const jitterMs = Math.floor((Math.random() * 6 - 3) * 60 * 1000);
          const jittered = new Date(new Date(scheduledAt).getTime() + jitterMs);
          const minDate = new Date(nowDate.getTime() + 2 * 60 * 1000);
          const finalScheduled = jittered > minDate ? jittered : minDate;
          scheduledAt = finalScheduled.toISOString();

          await supabase
            .from('scheduled_posts')
            .update({ scheduled_at: scheduledAt })
            .eq('id', post.id);

          logger.info('[Scheduler] Auto-assigned slot', {
            postId: post.id,
            timezone,
            scheduled_at: scheduledAt,
          });
        } catch (slotErr: unknown) {
          const message = slotErr instanceof Error ? slotErr.message : String(slotErr);
          logger.warn('[Scheduler] Failed to assign slot', { postId: post.id, error: message });
        }
      }
    }

    const { data: scheduledPosts, error: schedErr } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowIso);

    if (schedErr) throw schedErr;

    const { data: retryPosts } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .lte('next_retry_at', nowIso);

    const posts = [...(scheduledPosts || []), ...(retryPosts || [])];
    if (posts.length === 0) return;

    logger.info(`[Scheduler] Znaleziono ${posts.length} postów do opublikowania.`);

    for (const post of posts) {
      try {
        const approvalStatus = post.approval_status as string | undefined;
        if (isApprovalBlockingPublish(approvalStatus)) {
          logger.warn(`[Scheduler] Pomijam ${post.id} — approval: ${approvalStatus}`);
          // Nie oznaczaj failed — czekamy na akceptację; nie retry w nieskończoność
          if (post.status === 'failed') {
            await supabase
              .from('scheduled_posts')
              .update({ status: 'scheduled', next_retry_at: null, last_error: 'Oczekuje na akceptację' })
              .eq('id', post.id);
          }
          continue;
        }

        const platform = normalizeSocialPlatform(post.form_data?.platform);

        if (!PUBLISHABLE.has(platform)) {
          await markFailed(post.id, `Platforma ${platform} nie jest wspierana w schedulerze`, 3);
          continue;
        }

        // Claim — unikaj race przy wielu replikach
        const { data: claimed, error: claimErr } = await supabase
          .from('scheduled_posts')
          .update({ status: 'publishing' })
          .eq('id', post.id)
          .in('status', ['scheduled', 'failed'])
          .select('id')
          .maybeSingle();

        if (claimErr || !claimed) {
          logger.warn(`[Scheduler] Nie udało się claimować ${post.id}`);
          continue;
        }

        let connectionQuery = supabase
          .from('social_connections')
          .select('*')
          .eq('user_id', post.user_id)
          .eq('is_active', true);

        if (post.connection_id) {
          connectionQuery = connectionQuery.eq('id', post.connection_id);
        } else {
          connectionQuery = connectionQuery.eq('platform', platform);
        }

        const { data: connection } = await connectionQuery.limit(1).maybeSingle();

        if (!connection) {
          await markFailed(post.id, `Brak aktywnego połączenia (${platform})`, 3);
          continue;
        }

        const postText = post.result?.postText || post.form_data?.topic || '';
        const imageUrl = post.result?.imageUrl as string | undefined;
        const videoUrl = post.result?.videoUrl as string | undefined;
        const mediaUrls = Array.isArray(post.result?.mediaUrls)
          ? (post.result.mediaUrls as string[])
          : imageUrl
            ? [imageUrl]
            : [];
        const publishFormat = (post.form_data?.publishFormat || 'feed') as PublishFormat;
        const caption = formatPublishCaption({
          postText,
          hashtags: post.result?.hashtags,
          callToAction: post.result?.callToAction,
          ctaUrl: normalizeCtaUrl(post.result?.ctaUrl),
        });
        const linkUrl = normalizeCtaUrl(post.result?.ctaUrl);

        const publishResult = await publishToConnection(connection, {
          caption,
          imageUrl: mediaUrls[0] || imageUrl,
          mediaUrls,
          videoUrl,
          linkUrl,
          publishFormat,
        });

        await supabase
          .from('scheduled_posts')
          .update({ status: 'published', published_url: publishResult.url, last_error: null })
          .eq('id', post.id);

        logger.info(`[Scheduler] Opublikowano post ${post.id} na ${platform}`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        const retryCount = (post.retry_count || 0) + 1;
        const maxRetries = 3;
        const backoffMinutes = [15, 60, 240];
        const nextRetryMinutes = backoffMinutes[retryCount - 1] || 240;
        const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60 * 1000).toISOString();

        if (retryCount >= maxRetries) {
          logger.error(
            `[Scheduler] Post ${post.id} przekroczył limit prób (${maxRetries}), oznaczam jako failed definitywnie.`
          );
          await markFailed(post.id, message, retryCount);
        } else {
          logger.warn(
            `[Scheduler] Błąd publikacji postu ${post.id} – próba ${retryCount}/${maxRetries}, kolejna za ${nextRetryMinutes} min.`
          );
          await markFailed(post.id, message, retryCount, nextRetryAt);
        }
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const isPermission = /permission denied/i.test(msg);

    if (isPermission) {
      schedulerBlockedUntil = Date.now() + 5 * 60 * 1000;
      logger.error('[Scheduler] Błąd uprawnień do scheduled_posts – blokuję kolejne próby na 5 min', {
        message: msg,
      });
    } else {
      logger.error('[Scheduler] Błąd krytyczny:', e);
    }
  } finally {
    isRunning = false;
  }
}

export function startSchedulerJob(): void {
  setInterval(processScheduledPosts, 60000);
  logger.info('🚀 Automat publikujący (Scheduler) został uruchomiony.');
}
