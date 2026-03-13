import { supabase } from './supabase.js';
import {
    FacebookPublisher,
    InstagramPublisher,
    LinkedInPublisher,
    TwitterPublisher,
    TikTokPublisher
} from './socialPublishing.js';
import logger from './logger.js';

/**
 * Service to sync social media posts from external APIs to the local database.
 */

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
                    // Add other platforms as needed...
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
            }
        }

        return { synced: totalSynced, errors };
    } catch (error: any) {
        logger.error('Sync process failed:', error);
        throw error;
    }
}
