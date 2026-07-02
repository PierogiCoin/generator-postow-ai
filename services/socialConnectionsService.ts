import { getSupabase } from './supabaseClient';
import { getApiBaseUrl, getApiAuthHeaders } from './apiClient';
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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const headers = await getApiAuthHeaders(userId);
            const response = await fetch(`${getApiBaseUrl()}/api/social/auth/${platform}`, {
                headers,
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`Failed to get auth URL: ${response.statusText}`);
            const data = await response.json();
            return data.authUrl;
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError')
                throw new Error('Przekroczono czas łączenia z platformą (15s).');
            throw err;
        } finally {
            clearTimeout(timeout);
        }
    },

    /**
     * Fetch all historical posts from all connections for a user
     */
    async getAggregateHistory(userId: string): Promise<SocialPost[]> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const headers = await getApiAuthHeaders(userId);
            const response = await fetch(`${getApiBaseUrl()}/api/social/aggregate-history`, {
                headers,
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch aggregate history: ${response.statusText}`);
            }
            const data = await response.json();
            return data.posts;
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError')
                throw new Error('Przekroczono czas pobierania historii (15s).');
            throw err;
        } finally {
            clearTimeout(timeout);
        }
    }
};
