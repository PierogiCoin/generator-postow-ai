import { getSupabase } from './supabaseClient';
import { API_BASE_URL } from './apiClient';
import type { SocialConnection, SocialPost, SocialPlatform } from '../types/socialPublishing';

export const socialConnectionsService = {
    /**
     * Fetch all social connections for a user
     */
    async getConnections(userId: string): Promise<SocialConnection[]> {
        const { data, error } = await getSupabase()
            .from('social_connections')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw error;
        return data as SocialConnection[];
    },

    /**
     * Disconnect a social account
     */
    async disconnectConnection(connectionId: string, userId: string): Promise<void> {
        const { error } = await getSupabase()
            .from('social_connections')
            .update({ is_active: false })
            .eq('id', connectionId)
            .eq('user_id', userId);

        if (error) throw error;
    },

    /**
     * Get the OAuth authorization URL for a platform
     */
    async getAuthUrl(platform: SocialPlatform, userId: string): Promise<string> {
        const response = await fetch(`${API_BASE_URL}/api/social/auth/${platform}`, {
            headers: {
                'x-user-id': userId
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to get auth URL: ${response.statusText}`);
        }
        const data = await response.json();
        return data.authUrl;
    },

    /**
     * Fetch all historical posts from all connections for a user
     */
    async getAggregateHistory(userId: string): Promise<SocialPost[]> {
        const response = await fetch(`${API_BASE_URL}/api/social/aggregate-history`, {
            headers: {
                'x-user-id': userId
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to fetch aggregate history: ${response.statusText}`);
        }

        const data = await response.json();
        return data.posts;
    }
};
