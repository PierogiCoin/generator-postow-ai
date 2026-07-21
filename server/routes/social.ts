import { Router } from 'express';
import logger from '../logger.js';
import { genAI, supabase } from '../lib/clients.js';
import {
  LinkedInPublisher,
  TwitterPublisher,
  FacebookPublisher,
  TikTokPublisher,
  YouTubePublisher,
  ThreadsPublisher,
} from '../socialPublishing.js';
import { syncUserSocialPosts } from '../socialSync.js';
import {
  linkedInConfig,
  twitterConfig,
  facebookConfig,
  tiktokConfig,
  youtubeConfig,
  threadsConfig,
} from '../config/social.js';
import { publishToConnection } from '../lib/publishToConnection.js';
import { storeTwitterOAuthSecret } from '../lib/twitterOAuthStore.js';
import { mapSocialPost } from '../lib/socialHelpers.js';
import {
  getWeekdayHourInTz,
  computeSlotScore,
  type HeatmapCell,
} from '../lib/schedulingAnalytics.js';
import {
  runPostMortemAnalysis,
  persistPostMortemAnalysis,
} from '../lib/postMortem.js';
import { creditGate } from '../middleware/credits.js';
import { requireSupabaseAuth, getAuthUserId } from '../middleware/supabaseAuth.js';
import { signOAuthState } from '../lib/oauthState.js';
import { resolveOAuthCallbackUrl } from '../lib/publicUrl.js';
import {
  processSocialOAuthCallback,
  resolveOAuthUserId,
  consumeTwitterOAuthForCallback,
  redirectAfterOAuthSuccess,
  redirectAfterOAuthError,
  type OAuthCallbackParams,
} from '../lib/socialOAuthHandler.js';
import { formatPublishCaption, normalizeCtaUrl } from '../lib/publishCaption.js';
import {
  validatePublishBody,
  assertPlatformPublishRules,
  assertPublishApprovalAllowed,
} from '../lib/socialPublishGuards.js';

export function createSocialRouter(): Router {
  const router = Router();

  router.get('/api/social/auth/:platform', requireSupabaseAuth, async (req, res) => {
    const { platform } = req.params;
    const userId = getAuthUserId(req);
    const oauthState = signOAuthState(userId);

    try {
      let authUrl = '';

      switch (platform) {
        case 'linkedin': {
          const linkedIn = new LinkedInPublisher(linkedInConfig);
          authUrl = await linkedIn.getAuthUrl(oauthState);
          break;
        }
        case 'twitter': {
          const twitterAuth = await TwitterPublisher.getAuthUrl(
            twitterConfig.appKey,
            twitterConfig.appSecret,
            twitterConfig.callbackUrl
          );
          storeTwitterOAuthSecret(twitterAuth.oauthToken, twitterAuth.oauthTokenSecret, userId);
          authUrl = twitterAuth.url;
          break;
        }
        case 'facebook':
          authUrl = FacebookPublisher.getAuthUrl(facebookConfig.appId, facebookConfig.redirectUri, oauthState, false);
          break;
        case 'instagram':
          authUrl = FacebookPublisher.getAuthUrl(
            facebookConfig.appId,
            resolveOAuthCallbackUrl('instagram'),
            oauthState,
            true
          );
          break;
        case 'tiktok':
          authUrl = TikTokPublisher.getAuthUrl(tiktokConfig.clientKey, tiktokConfig.redirectUri, oauthState);
          break;
        case 'youtube':
          if (!youtubeConfig.clientId) {
            return res.status(503).json({ error: 'YouTube OAuth nie skonfigurowany (YOUTUBE_CLIENT_ID).' });
          }
          authUrl = YouTubePublisher.getAuthUrl(youtubeConfig.clientId, youtubeConfig.redirectUri, oauthState);
          break;
        case 'threads':
          if (!threadsConfig.appId) {
            return res.status(503).json({ error: 'Threads OAuth nie skonfigurowany (THREADS_APP_ID / FACEBOOK_APP_ID).' });
          }
          authUrl = ThreadsPublisher.getAuthUrl(threadsConfig.appId, threadsConfig.redirectUri, oauthState);
          break;
        default:
          return res.status(400).json({ error: 'Unsupported platform' });
      }

      res.json({ authUrl });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Social auth error (${platform}):`, error);
      res.status(500).json({ error: message });
    }
  });

  router.get('/api/social/callback/:platform', async (req, res) => {
    const { platform } = req.params;
    const params: OAuthCallbackParams = {
      code: req.query.code as string | undefined,
      state: req.query.state as string | undefined,
      oauth_token: req.query.oauth_token as string | undefined,
      oauth_verifier: req.query.oauth_verifier as string | undefined,
    };

    const twitterCtx =
      platform === 'twitter' && params.oauth_token
        ? consumeTwitterOAuthForCallback(params.oauth_token)
        : null;

    const userId = resolveOAuthUserId(platform, params, twitterCtx);

    if (!userId) {
      return res.status(401).send('Invalid or expired OAuth state');
    }

    try {
      await processSocialOAuthCallback(platform, userId, params, twitterCtx?.secret);
      redirectAfterOAuthSuccess(res, platform);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      redirectAfterOAuthError(res, platform, message);
    }
  });

  router.post('/api/social/callback/:platform', requireSupabaseAuth, async (req, res) => {
    const { platform } = req.params;
    const params: OAuthCallbackParams = req.body ?? {};
    const authenticatedUserId = getAuthUserId(req);

    const twitterCtx =
      platform === 'twitter' && params.oauth_token
        ? consumeTwitterOAuthForCallback(params.oauth_token)
        : null;

    const oauthUserId = resolveOAuthUserId(platform, params, twitterCtx);

    if (!oauthUserId || oauthUserId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Invalid OAuth state' });
    }

    try {
      await processSocialOAuthCallback(platform, authenticatedUserId, params, twitterCtx?.secret);
      res.json({ success: true, platform });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Social POST callback error (${platform}):`, error);
      res.status(500).json({ error: message });
    }
  });

  router.get('/api/social/history/:connectionId', requireSupabaseAuth, async (req, res) => {
    const { connectionId } = req.params;
    const userId = getAuthUserId(req);

    try {
      const { data: connection, error } = await supabase
        .from('social_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', userId)
        .single();

      if (error || !connection) return res.status(404).json({ error: 'Connection not found' });

      let posts: unknown[] = [];
      switch (connection.platform) {
        case 'linkedin':
          posts = await new LinkedInPublisher(linkedInConfig).getPosts(connection.access_token, connection.account_id);
          break;
        case 'twitter':
          posts = await new TwitterPublisher(twitterConfig.appKey, twitterConfig.appSecret, connection.access_token, connection.refresh_token || '').getPosts(connection.account_id);
          break;
        case 'facebook':
          posts = await new FacebookPublisher(connection.access_token).getPosts(connection.account_id, connection.access_token);
          break;
        case 'instagram':
          posts = await new InstagramPublisher(connection.access_token).getPosts(connection.account_id);
          break;
        case 'tiktok':
          posts = await new TikTokPublisher(tiktokConfig).getPosts(connection.access_token);
          break;
      }

      res.json({ posts: posts.map((p) => mapSocialPost(p, connection.platform, connection.id)) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Fetch social history error:', error);
      res.status(500).json({ error: message });
    }
  });

  router.get('/api/social/aggregate-history', requireSupabaseAuth, async (req, res) => {
    const userId = getAuthUserId(req);

    try {
      const { data: connections, error } = await supabase
        .from('social_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      syncUserSocialPosts(userId).catch((err) => logger.error('Background sync failed:', err));

      if (error) throw error;
      if (!connections || connections.length === 0) return res.json({ posts: [] });

      const allPostsPromises = connections.map(async (conn) => {
        try {
          let posts: unknown[] = [];
          switch (conn.platform) {
            case 'linkedin':
              posts = await new LinkedInPublisher(linkedInConfig).getPosts(conn.access_token, conn.account_id);
              break;
            case 'twitter':
              posts = await new TwitterPublisher(twitterConfig.appKey, twitterConfig.appSecret, conn.access_token, conn.refresh_token || '').getPosts(conn.account_id);
              break;
            case 'facebook':
              posts = await new FacebookPublisher(conn.access_token).getPosts(conn.account_id, conn.access_token);
              break;
            case 'instagram':
              posts = await new InstagramPublisher(conn.access_token).getPosts(conn.account_id);
              break;
            case 'tiktok':
              posts = await new TikTokPublisher(tiktokConfig).getPosts(conn.access_token);
              break;
          }
          return posts.map((p) => mapSocialPost(p, conn.platform, conn.id));
        } catch (e) {
          logger.error(`Error fetching history for connection ${conn.id}:`, e);
          return [];
        }
      });

      const results = await Promise.all(allPostsPromises);
      const flattenedPosts = results.flat().sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      res.json({ posts: flattenedPosts });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Fetch aggregate social history error:', error);
      res.status(500).json({ error: message });
    }
  });

  router.get('/api/social/best-times', requireSupabaseAuth, async (req, res) => {
    const userId = getAuthUserId(req);
    const timezone = (req.headers['x-timezone'] as string) || 'UTC';
    const limit = Math.min(parseInt(req.query.limit as string) || 400, 1000);

    try {
      const { data: posts, error } = await supabase
        .from('social_posts')
        .select('published_at, platform, metrics')
        .eq('user_id', userId)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!posts || posts.length === 0) {
        return res.json({
          timezone,
          heatmap: [],
          topSlots: [],
          note: 'Brak danych historycznych – podepnij konta lub poczekaj na synchronizację.',
        });
      }

      const buckets: Record<string, HeatmapCell> = {};

      for (const p of posts) {
        if (!p.published_at) continue;
        const { weekday, hour } = getWeekdayHourInTz(p.published_at, timezone);
        const key = `${weekday}-${hour}`;
        if (!buckets[key]) {
          buckets[key] = { weekday, hour, samples: 0, avgScore: 0 };
        }
        const score = computeSlotScore(p.metrics || {});
        const b = buckets[key];
        b.samples += 1;
        b.avgScore = (b.avgScore * (b.samples - 1) + score) / b.samples;
      }

      const heatmap = Object.values(buckets).sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);
      const topSlots = [...heatmap]
        .filter((h) => h.samples >= 2)
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 5);

      res.json({ timezone, samples: posts.length, heatmap, topSlots });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[BestTimes] Failed to compute heatmap', { error: message, userId });
      res.status(500).json({ error: message });
    }
  });

  router.post('/api/social/post-mortem', ...creditGate('sentimentAnalysis'), async (req, res) => {
    const userId = getAuthUserId(req);
    const { postIds, sinceHours = 48, forceRecalc = false, limit = 12 } = req.body || {};

    if ((!postIds || !Array.isArray(postIds) || postIds.length === 0) && !sinceHours) {
      return res.status(400).json({ error: 'Provide postIds array or sinceHours' });
    }

    try {
      const query = supabase
        .from('social_posts')
        .select('id, user_id, platform, content, metrics, published_at, url, ai_analysis')
        .eq('user_id', userId)
        .order('published_at', { ascending: false })
        .limit(Math.min(limit, 30));

      if (postIds && Array.isArray(postIds) && postIds.length > 0) {
        query.in('id', postIds);
      } else {
        const cutoff = new Date(Date.now() - Number(sinceHours) * 60 * 60 * 1000).toISOString();
        query.lte('published_at', cutoff);
      }

      if (!forceRecalc) query.is('ai_analysis', null);

      const { data: posts, error } = await query;
      if (error) throw error;
      if (!posts || posts.length === 0) {
        return res.json({ processed: 0, note: 'No posts to analyze' });
      }

      const analysis = await runPostMortemAnalysis(posts);
      const ids = posts.map((p: { id: string }) => p.id);
      await persistPostMortemAnalysis(ids, analysis);

      res.json({ processed: ids.length, analysis });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[PostMortem] Manual run failed', { error: message, userId });
      res.status(500).json({ error: message });
    }
  });

  router.post('/api/social/sync', requireSupabaseAuth, async (req, res) => {
    const userId = getAuthUserId(req);

    try {
      const result = await syncUserSocialPosts(userId);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Sync error:', error);
      res.status(500).json({ error: message });
    }
  });

  /** Komentarze do posta (FB/IG) — baza pod Engagement Inbox. */
  router.get('/api/social/comments', requireSupabaseAuth, async (req, res) => {
    const userId = getAuthUserId(req);
    const connectionId = String(req.query.connectionId || '');
    const platformPostId = String(req.query.platformPostId || '');

    if (!connectionId || !platformPostId) {
      return res.status(400).json({ error: 'Wymagane connectionId i platformPostId' });
    }

    try {
      const { data: connection, error: connError } = await supabase
        .from('social_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (connError || !connection) {
        return res.status(404).json({ error: 'Nie znaleziono połączenia' });
      }

      let comments: Array<{ id: string; message: string; authorName: string; createdAt: string }> = [];

      if (connection.platform === 'facebook') {
        const fb = new FacebookPublisher(connection.access_token);
        comments = await fb.getComments(platformPostId, connection.access_token);
      } else if (connection.platform === 'instagram') {
        const ig = new InstagramPublisher(connection.access_token);
        comments = await ig.getComments(platformPostId);
      } else {
        return res.status(400).json({
          error: `Komentarze nie są jeszcze wspierane dla ${connection.platform}`,
        });
      }

      res.json({ comments, platform: connection.platform });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Social comments error:', error);
      res.status(500).json({ error: message });
    }
  });

  router.post('/api/social/publish', ...creditGate('publishPost'), async (req, res) => {
    const userId = getAuthUserId(req);
    const parsed = validatePublishBody(req.body);
    if (!parsed.ok) return res.status(parsed.status).json({ error: parsed.error });

    const {
      connectionId,
      postText,
      imageUrl,
      mediaUrls,
      videoUrl,
      publishFormat,
      scheduledPostId,
      historyId,
      hashtags,
      callToAction,
      ctaUrl,
    } = parsed.data;

    const caption = formatPublishCaption({
      postText,
      hashtags,
      callToAction: callToAction ?? null,
      ctaUrl: normalizeCtaUrl(ctaUrl),
    });
    const linkUrl = normalizeCtaUrl(ctaUrl);
    const resolvedMedia =
      mediaUrls && mediaUrls.length > 0
        ? mediaUrls
        : imageUrl
          ? [imageUrl]
          : [];

    try {
      if (scheduledPostId) {
        const { data: scheduled } = await supabase
          .from('scheduled_posts')
          .select('id, approval_status, user_id')
          .eq('id', scheduledPostId)
          .eq('user_id', userId)
          .maybeSingle();
        if (!scheduled) {
          return res.status(404).json({ error: 'Nie znaleziono zaplanowanego posta.' });
        }
        try {
          assertPublishApprovalAllowed(scheduled.approval_status);
        } catch (approvalErr) {
          const message = approvalErr instanceof Error ? approvalErr.message : String(approvalErr);
          return res.status(403).json({ error: message });
        }
      }

      if (historyId) {
        const { data: hist } = await supabase
          .from('history')
          .select('id, status, user_id')
          .eq('id', historyId)
          .eq('user_id', userId)
          .maybeSingle();
        if (hist) {
          try {
            assertPublishApprovalAllowed(hist.status as string | undefined);
          } catch (approvalErr) {
            const message = approvalErr instanceof Error ? approvalErr.message : String(approvalErr);
            return res.status(403).json({ error: message });
          }
        }
      }

      const { data: connection, error: connError } = await supabase
        .from('social_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', userId)
        .single();

      if (connError || !connection) {
        throw new Error('Nie znaleziono aktywnego połączenia dla tej platformy.');
      }

      assertPlatformPublishRules(
        connection.platform,
        resolvedMedia[0],
        videoUrl,
        publishFormat || 'feed',
        resolvedMedia
      );

      const publishResult = await publishToConnection(connection, {
        caption,
        imageUrl: resolvedMedia[0],
        mediaUrls: resolvedMedia,
        videoUrl,
        linkUrl,
        publishFormat: publishFormat || 'feed',
      });

      if (scheduledPostId) {
        await supabase
          .from('scheduled_posts')
          .update({ status: 'published', published_url: publishResult.url })
          .eq('id', scheduledPostId);
      }

      await supabase.from('history').insert({
        user_id: userId,
        content: postText,
        platform: connection.platform,
        metadata: {
          published_url: publishResult.url,
          platform_id: publishResult.id,
          imageUrl: resolvedMedia[0],
          mediaUrls: resolvedMedia,
          videoUrl,
          publishFormat,
          is_published: true,
        },
      });

      res.json({ success: true, ...publishResult });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Social publish error:', error);
      res.status(500).json({ error: message });
    }
  });

  router.post('/api/social/analyze-saved', requireSupabaseAuth, async (req, res) => {
    const userId = getAuthUserId(req);
    const { postIds } = req.body;

    if (!postIds || !Array.isArray(postIds)) return res.status(400).json({ error: 'Array of postIds required' });

    try {
      const { data: posts, error } = await supabase
        .from('social_posts')
        .select('*')
        .in('id', postIds)
        .eq('user_id', userId);

      if (error) throw error;
      if (!posts || posts.length === 0) return res.status(404).json({ error: 'No posts found to analyze' });

      const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
      const prompt = `Jesteś ekspertem social media. Przeanalizuj poniższe posty i przygotuj raport strategiczny:
    
    ${JSON.stringify(
      posts.map((p) => ({
        platform: p.platform,
        content: p.content,
        metrics: p.metrics,
      })),
      null,
      2
    )}
    
    Zwróć odpowiedź w formacie JSON z polami:
    - sentiment (ogólny wydźwięk),
    - topPost (który post poradził sobie najlepiej i dlaczego),
    - improvementTips (lista 3 konkretnych porad na przyszłość),
    - contentPillars (3 główne filary tematyczne na podstawie tych postów).`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysis = JSON.parse(response.text().replace(/```json|```/g, ''));

      await supabase.from('social_posts').update({ ai_analysis: analysis }).in('id', postIds);

      res.json(analysis);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Analysis error:', error);
      res.status(500).json({ error: message });
    }
  });

  return router;
}
