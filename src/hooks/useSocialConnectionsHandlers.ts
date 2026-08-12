'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { socialConnectionsService } from '../services/socialConnectionsService';
import type { SocialConnection, SocialPlatform } from '../types/socialPublishing';

/**
 * Real social connect handlers for GlobalModals / layout.
 */
export function useSocialConnectionsHandlers() {
  const { user } = useAuth();
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [connectionForHistory, setConnectionForHistory] = useState<SocialConnection | null>(null);
  const [isSocialHistoryOpen, setIsSocialHistoryOpen] = useState(false);

  const loadSocialConnections = useCallback(async () => {
    if (!user?.id) {
      setSocialConnections([]);
      return;
    }
    try {
      const data = await socialConnectionsService.getConnections(user.id);
      setSocialConnections(data);
    } catch (err) {
      console.error('[socialConnections] load failed', err);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadSocialConnections();
  }, [loadSocialConnections]);

  const handleConnectSocial = useCallback(
    async (platform: SocialPlatform) => {
      if (!user?.id) throw new Error('Musisz być zalogowany, aby połączyć konto.');
      const authUrl = await socialConnectionsService.getAuthUrl(platform, user.id);
      if (!authUrl) throw new Error('Brak URL autoryzacji dla tej platformy.');
      window.location.assign(authUrl);
    },
    [user?.id]
  );

  const handleDisconnectSocial = useCallback(
    async (connectionId: string) => {
      if (!user?.id) return;
      await socialConnectionsService.disconnectConnection(connectionId, user.id);
      await loadSocialConnections();
    },
    [user?.id, loadSocialConnections]
  );

  const handleViewSocialHistory = useCallback((connection: SocialConnection) => {
    setConnectionForHistory(connection);
    setIsSocialHistoryOpen(true);
  }, []);

  return {
    socialConnections,
    loadSocialConnections,
    handleConnectSocial,
    handleDisconnectSocial,
    handleViewSocialHistory,
    connectionForHistory,
    isSocialHistoryOpen,
    setIsSocialHistoryOpen,
  };
}
