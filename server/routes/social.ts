import { Router } from 'express';
import logger from '../logger.js';
import { genAI, supabase } from '../lib/clients.js';
import {
  LinkedInPublisher,
  TwitterPublisher,
  FacebookPublisher,
  InstagramPublisher,
  TikTokPublisher,
} from '../socialPublishing.js';
import { syncUserSocialPosts } from '../socialSync.js';
import {
  linkedInConfig,
  twitterConfig,
  facebookConfig,
  tiktokConfig,
} from '../config/social.js';
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
import {
  processSocialOAuthCallback,
  resolveOAuthUserId,
  consumeTwitterOAuthForCallback,
  redirectAfterOAuthSuccess,
  redirectAfterOAuthError,
  type OAuthCallbackParams,
} from '../lib/socialOAuthHandler.js';

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
          authUrl = FacebookPublisher.getAuthUrl(facebookConfig.appId, facebookConfig.redirectUri, oauthState, true);
          break;
        case 'tiktok':
          authUrl = TikTokPublisher.getAuthUrl(tiktokConfig.clientKey, tiktokConfig.redirectUri, oauthState);
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

  router.post('/api/social/publish', ...creditGate('publishPost'), async (req, res) => {
    const userId = getAuthUserId(req);
    const { connectionId, postText, imageUrl, scheduledPostId } = req.body;

    if (!connectionId || !postText) return res.status(400).json({ error: 'Missing connectionId or postText' });

    try {
      const { data: connection, error: connError } = await supabase
        .from('social_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', userId)
        .single();

      if (connError || !connection) {
        throw new Error('Nie znaleziono aktywnego połączenia dla tej platformy.');
      }

      let publishResult: { url?: string; id?: string };

      switch (connection.platform) {
        case 'facebook': {
          const fb = new FacebookPublisher(connection.access_token);
          publishResult = await fb.publishPost(connection.account_id, connection.access_token, postText, imageUrl);
          break;
        }
        case 'instagram': {
          const ig = new InstagramPublisher(connection.access_token);
          if (!imageUrl) throw new Error('Instagram wymaga obrazka do publikacji posta.');
          publishResult = await ig.publishPost(connection.account_id, imageUrl, postText);
          break;
        }
        case 'twitter': {
          const tw = new TwitterPublisher(
            process.env.TWITTER_APP_KEY || '',
            process.env.TWITTER_APP_SECRET || '',
            connection.access_token,
            connection.refresh_token || ''
          );
          const mediaIds: string[] = [];
          if (imageUrl) {
            const mediaId = await tw.uploadMedia(imageUrl);
            mediaIds.push(mediaId);
          }
          publishResult = await tw.publishTweet(postText, mediaIds);
          break;
        }
        case 'linkedin': {
          const li = new LinkedInPublisher({
            clientId: process.env.LINKEDIN_CLIENT_ID || '',
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
            redirectUri: process.env.LINKEDIN_REDIRECT_URI || '',
          });
          publishResult = await li.publishPost(connection.access_token, connection.account_id, postText, imageUrl);
          break;
        }
        default:
          throw new Error(`Platforma ${connection.platform} nie jest jeszcze wspierana w bezpośredniej publikacji.`);
      }

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
          imageUrl,
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
