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
    descFallback: 'Publikuj zdjęcia (wymagany obraz)',
  },
  facebook: {
    name: 'Facebook',
    icon: '👥',
    color: 'bg-blue-500',
    descKey: 'socialConnections.desc.facebook',
    descFallback: 'Publikuj na stronie / w sieci',
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-black',
    descKey: 'socialConnections.desc.tiktok',
    descFallback: 'Połączenie konta — publikacja API wkrótce',
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

  const getConnectionForPlatform = (platform: SocialPlatform) => {
    return connections.find((c) => c.platform === platform && c.isActive);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-connections-title"
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 id="social-connections-title" className="text-xl font-bold text-slate-900 dark:text-white">
              {t('socialConnections.title', 'Połączenia social media')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('socialConnections.subtitle', 'Połącz konta, aby publikować bezpośrednio')}
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
            const connection = getConnectionForPlatform(platform);
            const isConnected = !!connection;
            const isConnecting = connectingPlatform === platform;
            const isDisconnecting = disconnectingId === connection?.id;
            const canPublish = isPlatformPublishable(platform as SP);

            return (
              <div
                key={platform}
                className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center text-2xl shrink-0`}
                    >
                      {config.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        {config.name}
                        {!canPublish && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            {t('socialConnections.publishSoon', 'Publikacja wkrótce')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {t(config.descKey, config.descFallback)}
                      </div>
                      {isConnected && connection && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-6 h-6 bg-slate-300 dark:bg-slate-600 rounded-full overflow-hidden">
                            {connection.profileImageUrl ? (
                              <img
                                src={connection.profileImageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">
                                {connection.accountName[0]}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {connection.accountName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {isConnected ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onViewHistory(connection!)}
                          className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                        >
                          {t('socialConnections.history', 'Historia')}
                        </button>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium">
                          <Check className="w-4 h-4" />
                          <span>{t('socialConnections.connected', 'Połączono')}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDisconnect(connection!.id)}
                          disabled={isDisconnecting}
                          className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
                        >
                          {isDisconnecting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            t('socialConnections.disconnect', 'Rozłącz')
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleConnect(platform)}
                        disabled={isConnecting}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl disabled:opacity-50"
                      >
                        {isConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t('socialConnections.connect', 'Połącz')
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className="text-xs font-bold text-slate-500 hover:text-cyan-600 disabled:opacity-50"
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
