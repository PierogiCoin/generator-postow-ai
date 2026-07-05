import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import type { SocialConnection, SocialPlatform } from '../types/socialPublishing';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType } from '../types';

interface SocialConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: SocialConnection[];
  onConnect: (platform: SocialPlatform) => Promise<void>;
  onDisconnect: (connectionId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onViewHistory: (connection: SocialConnection) => void;
}

const PLATFORM_CONFIG = {
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-blue-600',
    textColor: 'text-blue-600',
    description: 'Share professional content'
  },
  twitter: {
    name: 'X (Twitter)',
    icon: '𝕏',
    color: 'bg-black',
    textColor: 'text-black dark:text-white',
    description: 'Tweet to your followers'
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    textColor: 'text-pink-500',
    description: 'Post photos and stories'
  },
  facebook: {
    name: 'Facebook',
    icon: '👥',
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    description: 'Share with your network'
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-black',
    textColor: 'text-black dark:text-white',
    description: 'Share trending videos'
  }
};

export const SocialConnectionsModal: React.FC<SocialConnectionsModalProps> = ({
  isOpen,
  onClose,
  connections,
  onConnect,
  onDisconnect,
  onRefresh,
  onViewHistory
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
      const errorMessage = error instanceof Error ? error.message : 'Błąd rozłączenia';
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
    return connections.find(c => c.platform === platform && c.isActive);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('socialConnections.title', 'Social Media Connections')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('socialConnections.subtitle', 'Connect your accounts to publish directly')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
            const platform = key as SocialPlatform;
            const connection = getConnectionForPlatform(platform);
            const isConnected = !!connection;
            const isConnecting = connectingPlatform === platform;
            const isDisconnecting = disconnectingId === connection?.id;

            return (
              <div
                key={platform}
                className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  {/* Platform Info */}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center text-2xl`}>
                      {config.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {config.name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {config.description}
                      </div>
                      {isConnected && connection && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-6 h-6 bg-slate-300 dark:bg-slate-600 rounded-full overflow-hidden">
                            {connection.profileImageUrl ? (
                              <img src={connection.profileImageUrl} alt={`${connection.accountName} profile picture`} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">
                                {connection.accountName[0]}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {connection.accountName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => onViewHistory(connection!)}
                          className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                        >
                          {t('socialConnections.history', 'History')}
                        </button>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium">
                          <Check className="w-4 h-4" />
                          <span>{t('socialConnections.connected', 'Connected')}</span>
                        </div>
                        <button
                          onClick={() => handleDisconnect(connection!.id)}
                          disabled={isDisconnecting}
                          className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
                        >
                          {isDisconnecting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            t('socialConnections.disconnect', 'Disconnect')
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform)}
                        disabled={isConnecting}
                        className={`px-4 py-2 ${config.color} text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2`}
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{t('socialConnections.connecting', 'Connecting...')}</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4" />
                            <span>{t('socialConnections.connect', 'Connect')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <p className="font-semibold mb-1">
                  {t('socialConnections.secureInfo.title', 'Secure Authentication')}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  {t('socialConnections.secureInfo.description', 'We use OAuth 2.0 for secure authentication. Your credentials are never stored on our servers.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-2"
          >
            <Loader2 className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('socialConnections.refresh', 'Refresh Connections')}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:shadow-lg transition"
          >
            {t('common.done', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
};
