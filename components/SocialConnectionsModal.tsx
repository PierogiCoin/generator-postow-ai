import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Loader2 } from 'lucide-react';
import type { SocialConnection, SocialPlatform } from '../types/socialPublishing';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType } from '../types';
import { isPlatformPublishable } from '../services/autoPublishService';
import { SocialPlatform as SP } from '../types/socialPublishing';

interface SocialConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: SocialConnection[];
  onConnect: (platform: SocialPlatform) => Promise<void>;
  onDisconnect: (connectionId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onViewHistory: (connection: SocialConnection) => void;
}

const PLATFORM_CONFIG: Record<
  string,
  { name: string; icon: string; color: string; descKey: string; descFallback: string }
> = {
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-blue-600',
    descKey: 'socialConnections.desc.linkedin',
    descFallback: 'Publikuj treści profesjonalne',
  },
  twitter: {
    name: 'X (Twitter)',
    icon: '𝕏',
    color: 'bg-black',
    descKey: 'socialConnections.desc.twitter',
    descFallback: 'Publikuj posty do obserwujących',
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    descKey: 'socialConnections.desc.instagram',
    descFallback: 'Posty, karuzele, Stories i Reels',
  },
  facebook: {
    name: 'Facebook',
    icon: '👥',
    color: 'bg-blue-500',
    descKey: 'socialConnections.desc.facebook',
    descFallback: 'Publikuj na stronach (multi-account)',
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-black',
    descKey: 'socialConnections.desc.tiktok',
    descFallback: 'Publikuj wideo z URL',
  },
  youtube: {
    name: 'YouTube',
    icon: '▶️',
    color: 'bg-red-600',
    descKey: 'socialConnections.desc.youtube',
    descFallback: 'Upload Shorts na kanał',
  },
  threads: {
    name: 'Threads',
    icon: '@',
    color: 'bg-slate-900',
    descKey: 'socialConnections.desc.threads',
    descFallback: 'Publikuj tekst i obrazy',
  },
};

export const SocialConnectionsModal: React.FC<SocialConnectionsModalProps> = ({
  isOpen,
  onClose,
  connections,
  onConnect,
  onDisconnect,
  onRefresh,
  onViewHistory,
}) => {
  const { t } = useTranslation();
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { addToast } = useNotifications();

  if (!isOpen) return null;

  const handleConnect = async (platform: SocialPlatform) => {
    setConnectingPlatform(platform);
    try {
      await onConnect(platform);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd połączenia z platformą';
      addToast(errorMessage, NotificationType.Error);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    setDisconnectingId(connectionId);
    try {
      await onDisconnect(connectionId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd rozłączania';
      addToast(errorMessage, NotificationType.Error);
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getConnectionsForPlatform = (platform: SocialPlatform) => {
    return connections.filter((c) => c.platform === platform && c.isActive);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-connections-title"
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 id="social-connections-title" className="text-xl font-bold text-slate-900 dark:text-white">
              {t('socialConnections.title', 'Połączenia social media')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('socialConnections.subtitle', 'Połącz konta — możesz dodać wiele na platformę')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            aria-label={t('common.close', 'Zamknij')}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
            const platform = key as SocialPlatform;
            const platformConnections = getConnectionsForPlatform(platform);
            const isConnecting = connectingPlatform === platform;
            const canPublish = isPlatformPublishable(platform as SP);

            return (
              <div
                key={platform}
                className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 ${config.color} rounded-lg flex items-center justify-center text-2xl shrink-0`}
                    >
                      {config.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        {config.name}
                        {platformConnections.length > 0 && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {platformConnections.length} kont
                          </span>
                        )}
                        {!canPublish && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            {t('socialConnections.publishSoon', 'Publikacja wkrótce')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {t(config.descKey, config.descFallback)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleConnect(platform)}
                    disabled={isConnecting}
                    className="px-4 py-2 bg-[var(--hero-accent)] hover:brightness-110 text-white text-sm font-bold rounded-lg disabled:opacity-50 shrink-0"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : platformConnections.length > 0 ? (
                      t('socialConnections.addAccount', 'Dodaj konto')
                    ) : (
                      t('socialConnections.connect', 'Połącz')
                    )}
                  </button>
                </div>

                {platformConnections.length > 0 && (
                  <ul className="space-y-2 pl-1">
                    {platformConnections.map((connection) => {
                      const isDisconnecting = disconnectingId === connection.id;
                      return (
                        <li
                          key={connection.id}
                          className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-700/80"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 bg-slate-300 dark:bg-slate-600 rounded-full overflow-hidden shrink-0">
                              {connection.profileImageUrl ? (
                                <img
                                  src={connection.profileImageUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs">
                                  {connection.accountName?.[0] || '?'}
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                              {connection.accountName}
                            </span>
                            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onViewHistory(connection)}
                              className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                            >
                              {t('socialConnections.history', 'Historia')}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDisconnect(connection.id)}
                              disabled={isDisconnecting}
                              className="px-2 py-1 text-[11px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md disabled:opacity-50"
                            >
                              {isDisconnecting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                t('socialConnections.disconnect', 'Rozłącz')
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className="text-xs font-bold text-slate-500 hover:text-[var(--hero-accent)] disabled:opacity-50"
          >
            {isRefreshing
              ? t('socialConnections.refreshing', 'Odświeżam…')
              : t('socialConnections.refresh', 'Odśwież połączenia')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SocialConnectionsModal;
