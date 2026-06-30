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
import { storeTwitterOAuthSecret, consumeTwitterOAuthSecret } from '../lib/twitterOAuthStore.js';
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
import { resolveFrontendUrl } from '../lib/publicUrl.js';

export function createSocialRouter(): Router {
  const router = Router();
router.get('/api/social/auth/:platform', async (req, res) => {
  const { platform } = req.params;
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'User ID is required' });
  }

  try {
    let authUrl = '';

    switch (platform) {
      case 'linkedin':
        const linkedIn = new LinkedInPublisher(linkedInConfig);
        authUrl = await linkedIn.getAuthUrl(); // LinkedIn w tym kodzie ma własny randomowy state. Tutaj możnaby kiedyś dokleić userId.
        break;
      case 'twitter':
        const twitterAuth = await TwitterPublisher.getAuthUrl(
          twitterConfig.appKey,
          twitterConfig.appSecret,
          twitterConfig.callbackUrl
        );
        // Zapisz oauthTokenSecret po stronie serwera – potrzebny w callbacku
        storeTwitterOAuthSecret(twitterAuth.oauthToken, twitterAuth.oauthTokenSecret);
        authUrl = twitterAuth.url;
        break;
      case 'facebook':
        authUrl = FacebookPublisher.getAuthUrl(facebookConfig.appId, facebookConfig.redirectUri, userId, false);
        break;
      case 'instagram':
        authUrl = FacebookPublisher.getAuthUrl(facebookConfig.appId, facebookConfig.redirectUri, userId, true);
        break;
      case 'tiktok':
        authUrl = TikTokPublisher.getAuthUrl(tiktokConfig.clientKey, tiktokConfig.redirectUri);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported platform' });
    }

    res.json({ authUrl });
  } catch (error: any) {
    logger.error(`Social auth error (${platform}):`, error);
    res.status(500).json({ error: error.message });
  }
});

// Zapis połączenia (Callback OAuth API) - działa jako GET z redirect
router.get('/api/social/callback/:platform', async (req, res) => {
  const { platform } = req.params;
  const { code, state, oauth_token, oauth_verifier } = req.query;

  // W naszym flow używamy 'state' do przeniesienia userId
  const userId = state as string;

  if (!userId) {
    return res.status(401).send('User ID is required in state parameter');
  }

  try {
    let connectionData: any = {};

    switch (platform) {
      case 'linkedin':
        if (!code) throw new Error('Nieotrzymano kodu autoryzacji (LinkedIn)');
        const liTokens = await new LinkedInPublisher(linkedInConfig).exchangeCodeForToken(code as string);
        const liProfile = await new LinkedInPublisher(linkedInConfig).getUserProfile(liTokens.accessToken);
        connectionData = {
          access_token: liTokens.accessToken,
          account_id: liProfile.id,
          account_name: liProfile.name,
          account_handle: liProfile.name,
          avatar_url: liProfile.profilePicture,
          expires_in: liTokens.expiresIn
        };
        break;

      case 'facebook':
        if (!code) throw new Error('Nieotrzymano kodu autoryzacji (Facebook)');
        const fbTokens = await FacebookPublisher.exchangeCodeForToken(
          facebookConfig.appId,
          facebookConfig.appSecret,
          code as string,
          facebookConfig.redirectUri
        );
        const fbPublisher = new FacebookPublisher(fbTokens.accessToken);
        const fbPages = await fbPublisher.getPages();

        if (fbPages.length === 0) {
          throw new Error('Nie znaleziono żadnej strony Facebook, którą zarządzasz. Strona jest wymagana do publikacji.');
        }

        // Automatycznie wybieramy pierwszą stronę
        const firstPage = fbPages[0];

        connectionData = {
          access_token: firstPage.accessToken, // Zapisujemy Page Access Token
          account_id: firstPage.id,           // Zapisujemy Page ID
          account_name: firstPage.name,
          account_handle: firstPage.name,
          avatar_url: `https://graph.facebook.com/${firstPage.id}/picture`
        };
        break;

      case 'instagram':
        if (!code) throw new Error('Nieotrzymano kodu autoryzacji (Instagram)');
        const igTokens = await FacebookPublisher.exchangeCodeForToken(
          facebookConfig.appId,
          facebookConfig.appSecret,
          code as string,
          facebookConfig.redirectUri
        );
        const igPublisher = new InstagramPublisher(igTokens.accessToken);
        const igAccount = await igPublisher.findFirstInstagramAccount();

        if (!igAccount) {
          throw new Error('Nie znaleziono konta Instagram Business powiązanego z Twoimi stronami Facebook.');
        }

        connectionData = {
          access_token: igAccount.pageAccessToken, // Dla IG używamy Page Tokena lub User Tokena, ale Page ID jest potrzebne do relacji
          account_id: igAccount.id,
          account_name: igAccount.username,
          account_handle: igAccount.username,
          avatar_url: `https://graph.facebook.com/${igAccount.id}/picture` // To może nie działać dla IG bezpośrednio, ale FB Proxy często pozwala
        };
        break;

      case 'twitter':
        if (!oauth_token || !oauth_verifier) throw new Error('Nieotrzymano poprawnych danych (Twitter)');
        const oauthSecret = consumeTwitterOAuthSecret(oauth_token as string);
        if (!oauthSecret) {
          throw new Error('Token OAuth wygasł lub nie istnieje. Zacznij autoryzację od nowa.');
        }
        const twTokens = await TwitterPublisher.exchangeForAccessToken(
          twitterConfig.appKey,
          twitterConfig.appSecret,
          oauth_token as string,
          oauthSecret,
          oauth_verifier as string
        );
        connectionData = {
          access_token: twTokens.accessToken,
          refresh_token: twTokens.accessSecret,
          account_id: twTokens.userId,
          account_name: twTokens.screenName,
          account_handle: twTokens.screenName
        };
        break;

      case 'tiktok':
        if (!code) throw new Error('Nieotrzymano kodu autoryzacji (TikTok)');
        const ttTokens = await new TikTokPublisher(tiktokConfig).exchangeCodeForToken(code as string);
        const ttProfile = await new TikTokPublisher(tiktokConfig).getUserProfile(ttTokens.accessToken);
        connectionData = {
          access_token: ttTokens.accessToken,
          refresh_token: ttTokens.refreshToken,
          account_id: ttProfile.id,
          account_name: ttProfile.name,
          avatar_url: ttProfile.avatar,
          expires_at: ttTokens.expiresIn
            ? new Date(Date.now() + ttTokens.expiresIn * 1000).toISOString()
            : null
        };
        break;

      default:
        return res.status(400).send('Nieznana platforma społecznościowa: ' + platform);
    }

    // Zapiszmy tokeny w Supabase
    const {
      avatar_url,
      expires_in,
      expires_at: connectionExpiresAt,
      ...rest
    } = connectionData;

    const row = {
      user_id: userId,
      platform,
      ...rest,
      profile_image_url: avatar_url ?? connectionData.profile_image_url ?? null,
      expires_at:
        connectionExpiresAt ??
        (expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('social_connections')
      .upsert(row, { onConflict: 'user_id,platform' });

    if (error) throw error;

    const frontendUrl = resolveFrontendUrl();
    res.redirect(`${frontendUrl}/dashboard?socialSuccess=true&platform=${platform}`);
  } catch (error: any) {
    logger.error(`Social callback error (${platform}):`, error);
    const frontendUrl = resolveFrontendUrl();
    res.redirect(`${frontendUrl}/dashboard?socialError=${encodeURIComponent(error.message)}`);
  }
});


// Fetch historical posts for a connection
router.get('/api/social/history/:connectionId', async (req, res) => {
  const { connectionId } = req.params;
  const userId = req.headers['x-user-id'] as string;

  if (!userId) return res.status(401).json({ error: 'User ID required' });

  try {
    const { data: connection, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (error || !connection) return res.status(404).json({ error: 'Connection not found' });

    let posts: any[] = [];
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

    res.json({ posts: posts.map(p => mapSocialPost(p, connection.platform, connection.id)) });
  } catch (error: any) {
    logger.error('Fetch social history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch historical posts from ALL active connections for a user (Aggregated)
router.get('/api/social/aggregate-history', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'User ID required' });

  try {
    const { data: connections, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Trigger background sync to keep database updated
    syncUserSocialPosts(userId).catch(err => logger.error('Background sync failed:', err));

    if (error) throw error;
    if (!connections || connections.length === 0) return res.json({ posts: [] });

    const allPostsPromises = connections.map(async (conn) => {
      try {
        let posts: any[] = [];
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
        return posts.map(p => mapSocialPost(p, conn.platform, conn.id));
      } catch (e) {
        logger.error(`Error fetching history for connection ${conn.id}:`, e);
        return [];
      }
    });

    const results = await Promise.all(allPostsPromises);
    const flattenedPosts = results.flat().sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    res.json({ posts: flattenedPosts });
  } catch (error: any) {
    logger.error('Fetch aggregate social history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================================
// 🕒 BEST POSTING TIMES (HEATMAP)
// ===============================================
router.get('/api/social/best-times', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'User ID required' });

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
        note: 'Brak danych historycznych – podepnij konta lub poczekaj na synchronizację.'
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
      b.avgScore = ((b.avgScore * (b.samples - 1)) + score) / b.samples;
    }

    const heatmap = Object.values(buckets).sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);

    const topSlots = [...heatmap]
      .filter(h => h.samples >= 2) // minimalna wiarygodność
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);

    res.json({ timezone, samples: posts.length, heatmap, topSlots });
  } catch (error: any) {
    logger.error('[BestTimes] Failed to compute heatmap', { error: error.message, userId });
    res.status(500).json({ error: error.message });
  }
});

// Ręczny trigger post-mortem (dla QA / dashboardu)
router.post('/api/social/post-mortem', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'User ID required' });

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
  } catch (error: any) {
    logger.error('[PostMortem] Manual run failed', { error: error.message, userId });
    res.status(500).json({ error: error.message });
  }
});

// Manual sync endpoint
router.post('/api/social/sync', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Missing x-user-id header' });

  try {
    const result = await syncUserSocialPosts(userId);
    res.json(result);
  } catch (error: any) {
    logger.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🚀 NOWY ENDPOINT: Publikacja posta (używany ręcznie lub przez automat)
 */
router.post('/api/social/publish', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const { connectionId, postText, imageUrl, scheduledPostId } = req.body;

  if (!userId) return res.status(401).json({ error: 'Missing x-user-id header' });
  if (!connectionId || !postText) return res.status(400).json({ error: 'Missing connectionId or postText' });

  try {
    // 1. Pobierz dane połączenia
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connError || !connection) {
      throw new Error('Nie znaleziono aktywnego połączenia dla tej platformy.');
    }

    let publishResult;

    // 2. Publikuj na odpowiedniej platformie
    switch (connection.platform) {
      case 'facebook':
        const fb = new FacebookPublisher(connection.access_token);
        publishResult = await fb.publishPost(
          connection.account_id,
          connection.access_token,
          postText,
          imageUrl
        );
        break;

      case 'instagram':
        const ig = new InstagramPublisher(connection.access_token);
        // Instagram wymaga obrazka do publikacji przez API Content Publishing
        if (!imageUrl) throw new Error('Instagram wymaga obrazka do publikacji posta.');
        publishResult = await ig.publishPost(connection.account_id, imageUrl, postText);
        break;

      case 'twitter':
        const tw = new TwitterPublisher(
          process.env.TWITTER_APP_KEY || '',
          process.env.TWITTER_APP_SECRET || '',
          connection.access_token,
          connection.refresh_token || ''
        );
        let mediaIds: string[] = [];
        if (imageUrl) {
          const mediaId = await tw.uploadMedia(imageUrl);
          mediaIds.push(mediaId);
        }
        publishResult = await tw.publishTweet(postText, mediaIds);
        break;

      case 'linkedin':
        const li = new LinkedInPublisher({
          clientId: process.env.LINKEDIN_CLIENT_ID || '',
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
          redirectUri: process.env.LINKEDIN_REDIRECT_URI || ''
        });
        publishResult = await li.publishPost(connection.access_token, connection.account_id, postText, imageUrl);
        break;

      default:
        throw new Error(`Platforma ${connection.platform} nie jest jeszcze wspierana w bezpośredniej publikacji.`);
    }

    // 3. Jeśli to był post zaplanowany, zaktualizuj status
    if (scheduledPostId) {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'published', published_url: publishResult.url })
        .eq('id', scheduledPostId);
    }

    // 4. Zapisz w historii
    await supabase.from('history').insert({
      user_id: userId,
      content: postText,
      platform: connection.platform,
      metadata: {
        published_url: publishResult.url,
        platform_id: publishResult.id,
        imageUrl,
        is_published: true
      }
    });

    res.json({ success: true, ...publishResult });
  } catch (error: any) {
    logger.error('Social publish error:', error);
    res.status(500).json({ error: error.message });
  }
});
// Analyze saved posts from DB
router.post('/api/social/analyze-saved', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const { postIds } = req.body;

  if (!userId) return res.status(401).json({ error: 'User ID required' });
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
    
    ${JSON.stringify(posts.map(p => ({
      platform: p.platform,
      content: p.content,
      metrics: p.metrics
    })), null, 2)}
    
    Zwróć odpowiedź w formacie JSON z polami:
    - sentiment (ogólny wydźwięk),
    - topPost (który post poradził sobie najlepiej i dlaczego),
    - improvementTips (lista 3 konkretnych porad na przyszłość),
    - contentPillars (3 główne filary tematyczne na podstawie tych postów).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = JSON.parse(response.text().replace(/```json|```/g, ''));

    // Update posts with analysis result (optional metadata)
    await supabase.from('social_posts')
      .update({ ai_analysis: analysis })
      .in('id', postIds);

    res.json(analysis);
  } catch (error: any) {
    logger.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

  return router;
}
