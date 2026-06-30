import { supabase } from './supabase.js';
import {
    FacebookPublisher,
    InstagramPublisher,
    LinkedInPublisher,
    TwitterPublisher,
    TikTokPublisher
} from './socialPublishing.js';
import logger from './logger.js';

const twitterConfig = {
    appKey: process.env.TWITTER_APP_KEY || '',
    appSecret: process.env.TWITTER_APP_SECRET || '',
};

const tiktokConfig = {
    clientKey: process.env.TIKTOK_CLIENT_KEY || '',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
    redirectUri: process.env.TIKTOK_REDIRECT_URI || '',
};

/**
 * Service to sync social media posts from external APIs to the local database.
 */

/**
 * Sync all users with at least one active connection (called by auto-sync interval)
 */
export async function syncAllActiveConnections() {
    try {
        const { data: users, error } = await supabase
            .from('social_connections')
            .select('user_id')
            .eq('is_active', true);

        if (error) throw error;
        if (!users || users.length === 0) return;

        // Deduplicate user IDs
        const uniqueUserIds = [...new Set(users.map((u: any) => u.user_id))];
        logger.info(`[AutoSync] Synchronizuję ${uniqueUserIds.length} użytkowników...`);

        for (const uid of uniqueUserIds) {
            try {
                const result = await syncUserSocialPosts(uid);
                if (result.errors.length > 0) {
                    logger.warn(`[AutoSync] Błędy dla użytkownika ${uid}:`, result.errors);
                } else {
                    logger.info(`[AutoSync] Zsynchronizowano ${result.synced} postów dla ${uid}`);
                }
            } catch (e: any) {
                logger.error(`[AutoSync] Błąd dla użytkownika ${uid}:`, e);
            }
        }
    } catch (error: any) {
        logger.error('[AutoSync] Błąd podczas pobierania aktywnych połączeń:', error);
    }
}

// Auto-sync co 6 godzin
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
setInterval(syncAllActiveConnections, SIX_HOURS_MS);
logger.info('[AutoSync] Uruchomiono auto-sync co 6 godzin.');

export async function syncUserSocialPosts(userId: string) {
    try {
        // 1. Get all active connections for the user
        const { data: connections, error } = await supabase
            .from('social_connections')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw error;
        if (!connections || connections.length === 0) return { synced: 0, errors: [] };

        let totalSynced = 0;
        const errors: string[] = [];

        // 2. Process each connection
        for (const conn of connections) {
            try {
                let posts: any[] = [];

                // Fetch from platform API
                switch (conn.platform) {
                    case 'facebook':
                        const fb = new FacebookPublisher(conn.access_token);
                        posts = await fb.getPosts(conn.account_id, conn.access_token);
                        break;
                    case 'instagram':
                        const ig = new InstagramPublisher(conn.access_token);
                        posts = await ig.getPosts(conn.account_id);
                        break;
                    case 'linkedin':
                        const li = new LinkedInPublisher({
                            clientId: process.env.LINKEDIN_CLIENT_ID || '',
                            clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
                            redirectUri: process.env.LINKEDIN_REDIRECT_URI || ''
                        });
                        posts = await li.getPosts(conn.access_token, conn.account_id);
                        break;
                    case 'twitter':
                        const tw = new TwitterPublisher(twitterConfig.appKey, twitterConfig.appSecret, conn.access_token, conn.refresh_token || '');
                        posts = await tw.getPosts(conn.account_id);
                        break;
                    case 'tiktok':
                        const tt = new TikTokPublisher(tiktokConfig);
                        posts = await tt.getPosts(conn.access_token);
                        break;
                }

                if (posts.length > 0) {
                    // Map to DB schema
                    const dbPosts = posts.map(p => ({
                        user_id: userId,
                        connection_id: conn.id,
                        platform_post_id: p.id.toString(),
                        content: p.content || '',
                        published_at: p.publishedAt,
                        url: p.url,
                        media_url: p.mediaUrl,
                        platform: conn.platform,
                        metrics: {
                            likes: p.likes || 0,
                            comments: p.comments || 0,
                            shares: p.shares || 0,
                            reach: p.reach || 0,
                            impressions: p.impressions || 0,
                            views: p.views || 0
                        },
                        last_synced_at: new Date().toISOString()
                    }));

                    // Upsert into social_posts
                    const { error: upsertError } = await supabase
                        .from('social_posts')
                        .upsert(dbPosts, {
                            onConflict: 'connection_id,platform_post_id'
                        });

                    if (upsertError) {
                        logger.error(`Upsert error for ${conn.platform}:`, upsertError);
                        errors.push(`Failed to save ${conn.platform} posts`);
                    } else {
                        totalSynced += posts.length;
                    }
                }

                // Update last_sync_at in connections
                await supabase
                    .from('social_connections')
                    .update({ last_sync_at: new Date().toISOString() })
                    .eq('id', conn.id);

            } catch (e: any) {
                logger.error(`Sync error for connection ${conn.id} (${conn.platform}):`, e);
                errors.push(`${conn.platform}: ${e.message}`);

                // Token expiry detection: 401/403 lub specyficzne błędy FB/TikTok = token wygasł
                const msg: string = e.message || '';
                const isAuthError =
                    e.response?.status === 401 ||
                    e.response?.status === 403 ||
                    /token.*expired|invalid.*token|OAuthException|access.*denied/i.test(msg);

                if (isAuthError) {
                    await supabase
                        .from('social_connections')
                        .update({
                            is_active: false,
                            metadata: { expired_at: new Date().toISOString(), error: msg }
                        })
                        .eq('id', conn.id);
                    logger.warn(`[Sync] Token wygasł dla ${conn.platform} (${conn.id}) – oznaczono jako nieaktywne`);
                }
            }
        }

        return { synced: totalSynced, errors };
    } catch (error: any) {
        logger.error('Sync process failed:', error);
        throw error;
    }
}
