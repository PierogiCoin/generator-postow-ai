import logger from '../logger.js';
import {
  LinkedInPublisher,
  TwitterPublisher,
  FacebookPublisher,
  InstagramPublisher,
} from '../socialPublishing.js';
import { supabase } from '../lib/clients.js';
import { fetchTopSlots, nextOccurrenceForSlot, type Slot } from '../lib/schedulingAnalytics.js';
import { formatPublishCaption, normalizeCtaUrl } from '../lib/publishCaption.js';

let schedulerBlockedUntil: number | null = null;

async function processScheduledPosts() {
  const nowDate = new Date();
  const nowIso = nowDate.toISOString();

  if (schedulerBlockedUntil && Date.now() < schedulerBlockedUntil) {
    logger.warn('[Scheduler] Skipping run (previous permission error, backoff active)');
    return;
  }

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
        const platform = (post.form_data?.platform || 'facebook').toLowerCase();
        const { data: connection } = await supabase
          .from('social_connections')
          .select('*')
          .eq('user_id', post.user_id)
          .eq('platform', platform)
          .eq('is_active', true)
          .single();

        if (!connection) {
          logger.warn(`[Scheduler] Brak połączenia dla postu ${post.id} (platforma: ${platform})`);
          await supabase.from('scheduled_posts').update({ status: 'failed' }).eq('id', post.id);
          continue;
        }

        const postText = post.result?.postText || post.form_data?.topic || '';
        const imageUrl = post.result?.imageUrl;
        const caption = formatPublishCaption({
          postText,
          hashtags: post.result?.hashtags,
          callToAction: post.result?.callToAction,
          ctaUrl: normalizeCtaUrl(post.result?.ctaUrl),
        });
        const linkUrl = normalizeCtaUrl(post.result?.ctaUrl);

        let publishResult;

        if (platform === 'facebook') {
          const publisher = new FacebookPublisher(connection.access_token);
          publishResult = await publisher.publishPost(
            connection.account_id,
            connection.access_token,
            caption,
            imageUrl,
            linkUrl ?? undefined
          );
        } else if (platform === 'instagram' && imageUrl) {
          const publisher = new InstagramPublisher(connection.access_token);
          publishResult = await publisher.publishPost(connection.account_id, imageUrl, caption);
        } else if (platform === 'twitter') {
          const publisher = new TwitterPublisher(
            process.env.TWITTER_APP_KEY || '',
            process.env.TWITTER_APP_SECRET || '',
            connection.access_token,
            connection.refresh_token || ''
          );
          const mIds: string[] = [];
          if (imageUrl) mIds.push(await publisher.uploadMedia(imageUrl));
          publishResult = await publisher.publishTweet(caption, mIds);
        } else if (platform === 'linkedin') {
          const publisher = new LinkedInPublisher({
            clientId: process.env.LINKEDIN_CLIENT_ID || '',
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
            redirectUri: process.env.LINKEDIN_REDIRECT_URI || '',
          });
          publishResult = await publisher.publishPost(connection.access_token, connection.account_id, caption, imageUrl);
        }

        if (publishResult) {
          await supabase
            .from('scheduled_posts')
            .update({ status: 'published', published_url: publishResult.url })
            .eq('id', post.id);

          logger.info(`[Scheduler] Opublikowano post ${post.id} na ${platform}`);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        const retryCount = (post.retry_count || 0) + 1;
        const maxRetries = 3;
        const backoffMinutes = [15, 60, 240];
        const nextRetryMinutes = backoffMinutes[retryCount - 1] || 240;
        const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60 * 1000).toISOString();

        if (retryCount >= maxRetries) {
          logger.error(`[Scheduler] Post ${post.id} przekroczył limit prób (${maxRetries}), oznaczam jako failed definitywnie.`);
          await supabase.from('scheduled_posts').update({
            status: 'failed',
            retry_count: retryCount,
            last_error: message,
          }).eq('id', post.id);
        } else {
          logger.warn(`[Scheduler] Błąd publikacji postu ${post.id} – próba ${retryCount}/${maxRetries}, kolejna za ${nextRetryMinutes} min.`);
          await supabase.from('scheduled_posts').update({
            status: 'failed',
            retry_count: retryCount,
            next_retry_at: nextRetryAt,
            last_error: message,
          }).eq('id', post.id);
        }
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const isPermission = /permission denied/i.test(msg);

    if (isPermission) {
      schedulerBlockedUntil = Date.now() + 5 * 60 * 1000;
      logger.error('[Scheduler] Błąd uprawnień do scheduled_posts – blokuję kolejne próby na 5 min', { message: msg });
    } else {
      logger.error('[Scheduler] Błąd krytyczny:', e);
    }
  }
}

export function startSchedulerJob(): void {
  setInterval(processScheduledPosts, 60000);
  logger.info('🚀 Automat publikujący (Scheduler) został uruchomiony.');
}
