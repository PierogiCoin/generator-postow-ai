import { Router } from 'express';
import logger from '../logger.js';
import { genAI, supabase } from '../lib/clients.js';
import { syncUserSocialPosts } from '../socialSync.js';
import { FacebookPublisher, InstagramPublisher } from '../socialPublishing.js';

export function createBrandVoiceRouter(): Router {
  const router = Router();
router.post('/api/brand-voice/learn', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'User ID required' });

  try {
    logger.info(`[BrandVoice] Starting learn for user: ${userId}`);

    // 1. Sync social posts in background (best-effort)
    try {
      await syncUserSocialPosts(userId);
      logger.info(`[BrandVoice] Sync complete for user: ${userId}`);
    } catch (syncErr) {
      logger.warn('[BrandVoice] Sync failed, continuing with cached data:', syncErr);
    }

    // 2. Fetch app history (generated posts)
    const { data: historyItems } = await supabase
      .from('history')
      .select('content, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15);

    // 3. Fetch synced social posts
    const { data: socialPosts } = await supabase
      .from('social_posts')
      .select('content, platform')
      .eq('user_id', userId)
      .order('published_at', { ascending: false })
      .limit(20);

    // 4. Fetch scheduled posts
    const { data: scheduledItems } = await supabase
      .from('scheduled_posts')
      .select('result')
      .eq('user_id', userId)
      .limit(10);

    logger.info(`[BrandVoice] Data found: history=${historyItems?.length || 0}, social_posts=${socialPosts?.length || 0}, scheduled=${scheduledItems?.length || 0}`);

    // 5. If social_posts is empty, try fetching directly from connected accounts
    let directSocialPosts: string[] = [];
    if (!socialPosts || socialPosts.length === 0) {
      const { data: connections } = await supabase
        .from('social_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      logger.info(`[BrandVoice] No synced posts. Found ${connections?.length || 0} active connections, trying direct fetch...`);

      if (connections && connections.length > 0) {
        for (const conn of connections) {
          try {
            if (conn.platform === 'facebook') {
              const fb = new FacebookPublisher(conn.access_token);
              const posts = await fb.getPosts(conn.account_id, conn.access_token);
              directSocialPosts.push(...posts.map((p: any) => p.content).filter(Boolean));
              logger.info(`[BrandVoice] Direct Facebook fetch: ${posts.length} posts from ${conn.account_id}`);
            } else if (conn.platform === 'instagram') {
              const ig = new InstagramPublisher(conn.access_token);
              const posts = await ig.getPosts(conn.account_id);
              directSocialPosts.push(...posts.map((p: any) => p.content || p.caption).filter(Boolean));
              logger.info(`[BrandVoice] Direct Instagram fetch: ${posts.length} posts`);
            }
          } catch (directErr: any) {
            logger.warn(`[BrandVoice] Direct fetch failed for ${conn.platform}:`, directErr.message);
          }
        }
      }
    }

    // 6. Compile all posts
    const allPosts = [
      ...(historyItems || []).map((h: any) => h.content || h.postText || h.metadata?.postText),
      ...(socialPosts || []).map((s: any) => s.content),
      ...directSocialPosts,
      ...(scheduledItems || []).map((s: any) => s.result?.postText || s.result?.content)
    ].filter((c): c is string => typeof c === 'string' && c.trim().length > 10);

    logger.info(`[BrandVoice] Total usable posts: ${allPosts.length}`);

    if (allPosts.length === 0) {
      return res.status(200).json({
        error: 'no_history_found',
        message: 'Nie znaleziono postów do analizy. Upewnij się, że: (1) Twoje konto Facebook jest połączone w zakładce "Social Media", (2) Twoja strona Facebook ma co najmniej 2-3 opublikowane posty z treścią tekstową, (3) token dostępu jest aktualny (spróbuj rozłączyć i połączyć konto ponownie).'
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro-latest' });
    const prompt = `Jesteś ekspertem ds. strategii marki. Przeanalizuj poniższe posty i przygotuj profil "Głosu Marki" (Brand Voice) oraz "Tożsamości Wizualnej" (Visual Style) dla tej firmy:
    
    POSTY (${allPosts.length} sztuk):
    ${allPosts.slice(0, 25).map((p, i) => `[${i + 1}] ${p}`).join('\n\n')}
    
    Zwróć odpowiedź w formacie JSON z następującymi polami:
    - brandName (nazwa firmy wywnioskowana z postów),
    - description (opis działalności i misji firmy - 2-3 zdania),
    - keywords (lista 10 słów kluczowych i tagów po przecinku),
    - tone (jeden z: Professional, Casual, Witty, Inspirational, Persuasive),
    - examplesToFollow (array z 3 najlepszymi fragmentami tekstów),
    - examplesToAvoid (array z 3 rzeczami, których ta marka powinna unikać),
    - avoid (lista słów/tematów do unikania po przecinku),
    - visualStyle (krótka instrukcja stylu wizualnego dla generatora obrazów AI, np. "jasne, minimalistyczne zdjęcia w stylu skandynawskim" lub "dynamiczne ujęcia, nasycone kolory, styl sportowy"),
    - profileName (proponowana nazwa profilu, np. "Profil Firmowy [Nazwa]")`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let profile: any;
    try {
      profile = JSON.parse(response.text().replace(/```json|```/g, '').trim());
    } catch (parseErr: any) {
      throw new Error(`AI zwróciło niepoprawny JSON podczas generowania Brand Voice: ${parseErr.message}`);
    }

    logger.info(`[BrandVoice] Profile generated successfully for user: ${userId}`);
    res.json(profile);
  } catch (error: any) {
    logger.error('[BrandVoice] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

  return router;
}
