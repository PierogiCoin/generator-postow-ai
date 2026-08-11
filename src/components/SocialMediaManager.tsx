import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  socialMediaApi,
  getOAuthUrl,
  exchangeCodeForToken,
  SocialAccount,
  PostRequest,
  PostResult,
} from '../services/socialMediaApiService';
import { Platform, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { GlobeIcon } from './icons/GlobeIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { LinkIcon } from './icons/LinkIcon';

interface SocialMediaManagerProps {
  currentContent: string;
  generatedImageUrl?: string;
}

const PLATFORM_CONFIG: Record<Platform, {
  name: string;
  color: string;
  icon: string;
  description: string;
  maxCharacters: number;
  supportsImages: boolean;
  supportsVideo: boolean;
  supportsScheduling: boolean;
}> = {
  [Platform.LinkedIn]: {
    name: 'LinkedIn',
    color: 'bg-blue-600',
    icon: '💼',
    description: 'Profesjonalna sieć B2B',
    maxCharacters: 3000,
    supportsImages: true,
    supportsVideo: true,
    supportsScheduling: true,
  },
  [Platform.Instagram]: {
    name: 'Instagram',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    icon: '📸',
    description: 'Wizualna platforma',
    maxCharacters: 2200,
    supportsImages: true,
    supportsVideo: true,
    supportsScheduling: true,
  },
  [Platform.Facebook]: {
    name: 'Facebook',
    color: 'bg-blue-500',
    icon: '👥',
    description: 'Największa sieć społecznościowa',
    maxCharacters: 63206,
    supportsImages: true,
    supportsVideo: true,
    supportsScheduling: true,
  },
  [Platform.TikTok]: {
    name: 'TikTok',
    color: 'bg-black',
    icon: '🎵',
    description: 'Short-form video',
    maxCharacters: 2200,
    supportsImages: false,
    supportsVideo: true,
    supportsScheduling: false,
  },
  [Platform.X]: {
    name: 'X / Twitter',
    color: 'bg-slate-900',
    icon: '𝕏',
    description: 'Real-time updates',
    maxCharacters: 280,
    supportsImages: true,
    supportsVideo: true,
    supportsScheduling: true,
  },
  [Platform.YouTube]: {
    name: 'YouTube',
    color: 'bg-red-600',
    icon: '▶️',
    description: 'Video platform',
    maxCharacters: 5000,
    supportsImages: false,
    supportsVideo: true,
    supportsScheduling: true,
  },
};

export const SocialMediaManager: React.FC<SocialMediaManagerProps> = ({
  currentContent,
  generatedImageUrl,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();

  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isConnecting, setIsConnecting] = useState<Platform | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [postResults, setPostResults] = useState<PostResult[]>([]);
  const [editedContent, setEditedContent] = useState(currentContent);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Load connected accounts on mount
  useEffect(() => {
    socialMediaApi.loadFromStorage();
    setAccounts(socialMediaApi.getConnectedAccounts());
  }, []);

  // Update edited content when prop changes
  useEffect(() => {
    setEditedContent(currentContent);
  }, [currentContent]);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const platform = urlParams.get('platform') as Platform;

    if (code && platform) {
      handleOAuthCallback(platform, code);
    }
  }, []);

  const handleConnect = async (platform: Platform) => {
    setIsConnecting(platform);
    const authUrl = getOAuthUrl(platform, platform);
    
    if (authUrl) {
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        authUrl,
        `Connect ${platform}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,noopener,noreferrer`
      );
    } else {
      notifications.addToast(
        `OAuth dla ${platform} nie jest skonfigurowany. Dodaj zmienne środowiskowe.`,
        NotificationType.Error
      );
      setIsConnecting(null);
    }
  };

  const handleOAuthCallback = async (platform: Platform, code: string) => {
    const tokens = await exchangeCodeForToken(platform, code);
    
    if (tokens) {
      const account = await socialMediaApi.connectAccount(platform, {
        platform,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : undefined,
      });

      if (account) {
        setAccounts(socialMediaApi.getConnectedAccounts());
        notifications.addToast(
          `Połączono z ${platform}!`,
          NotificationType.Success
        );
      } else {
        notifications.addToast(
          `Błąd podczas łączenia z ${platform}`,
          NotificationType.Error
        );
      }
    }

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    setIsConnecting(null);
  };

  const handleDisconnect = (platform: Platform) => {
    socialMediaApi.disconnectAccount(platform);
    setAccounts(socialMediaApi.getConnectedAccounts());
    setSelectedPlatforms(prev => prev.filter(p => p !== platform));
    notifications.addToast(
      `Rozłączono ${platform}`,
      NotificationType.Info
    );
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handlePost = async () => {
    if (selectedPlatforms.length === 0) {
      notifications.addToast('Wybierz przynajmniej jedną platformę', NotificationType.Info);
      return;
    }

    if (!editedContent.trim()) {
      notifications.addToast('Treść nie może być pusta', NotificationType.Info);
      return;
    }

    setIsPosting(true);

    const request: PostRequest = {
      content: editedContent,
      mediaUrls: generatedImageUrl ? [generatedImageUrl] : undefined,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
    };

    try {
      const results = await socialMediaApi.postToMultiple(selectedPlatforms, request);
      setPostResults(results);

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        notifications.addToast(
          `Opublikowano na ${successCount} platformach!`,
          NotificationType.Success
        );
        setShowSuccessModal(true);
      }

      if (failCount > 0) {
        notifications.addToast(
          `Błąd na ${failCount} platformach`,
          NotificationType.Error
        );
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd podczas publikowania';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsPosting(false);
    }
  };

  const truncateForPlatform = (content: string, platform: Platform): string => {
    const max = PLATFORM_CONFIG[platform].maxCharacters;
    if (content.length <= max) return content;
    return content.slice(0, max - 3) + '...';
  };

  const getCharacterCount = (platform: Platform): string => {
    const max = PLATFORM_CONFIG[platform].maxCharacters;
    const current = editedContent.length;
    const percentage = (current / max) * 100;
    
    let color = 'text-slate-500';
    if (percentage > 100) color = 'text-red-500';
    else if (percentage > 80) color = 'text-amber-500';
    else if (percentage > 50) color = 'text-blue-500';
    
    return `${current}/${max}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
            <GlobeIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Social Media Publisher
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Publikuj bezpośrednio na wszystkie platformy
            </p>
          </div>
        </div>
        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-full">
              {accounts.length} połączonych
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'accounts', label: 'Konta', icon: LinkIcon },
          { id: 'post', label: 'Publikuj', icon: ArrowRightIcon },
          { id: 'analytics', label: 'Analityka', icon: ChartBarIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
              🔌 Połącz konta społecznościowe
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Połącz swoje konta, aby publikować bezpośrednio z aplikacji. 
              Wymaga to skonfigurowania zmiennych środowiskowych (API keys).
            </p>
          </div>

          {/* Platform Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.values(Platform).map((platform) => {
              const account = accounts.find(a => a.platform === platform);
              const config = PLATFORM_CONFIG[platform];
              const isConnected = !!account;

              return (
                <div
                  key={platform}
                  className={`p-4 rounded-xl border transition-all ${
                    isConnected
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${config.color} rounded-lg text-white text-xl`}>
                        {config.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">
                          {config.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {config.description}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {config.supportsImages && (
                            <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                              📷
                            </span>
                          )}
                          {config.supportsVideo && (
                            <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                              🎥
                            </span>
                          )}
                          <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                            {config.maxCharacters.toLocaleString()} chars
                          </span>
                        </div>
                      </div>
                    </div>

                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect(platform)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Rozłącz"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform)}
                        disabled={isConnecting === platform}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {isConnecting === platform ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <span className="text-lg">+</span>
                        )}
                        Połącz
                      </button>
                    )}
                  </div>

                  {isConnected && account && (
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-700 dark:text-green-300">
                          Połączono jako @{account.handle}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Ostatnia synchronizacja: {new Date(account.lastSynced!).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {accounts.length === 0 && (
            <div className="text-center p-8 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <GlobeIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                Brak połączonych kont. Wybierz platformę powyżej, aby się połączyć.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Post Tab */}
      {activeTab === 'post' && (
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center">
              <p className="text-amber-800 dark:text-amber-200">
                Najpierw połącz konta w zakładce "Konta"
              </p>
            </div>
          ) : (
            <>
              {/* Content Editor */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Treść do publikacji
                </label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-40 p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:border-blue-500 transition-all resize-none"
                  placeholder="Wpisz treść posta..."
                />
                <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                  <span>
                    Edytuj treść dla każdej platformy poniżej
                  </span>
                  <span>
                    {editedContent.length} znaków
                  </span>
                </div>
              </div>

              {/* Image Preview */}
              {generatedImageUrl && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Wygenerowany obraz
                  </label>
                  <div className="relative w-full max-w-md">
                    <img
                      src={generatedImageUrl}
                      alt="Generated"
                      className="w-full rounded-xl"
                    />
                    <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                      Dołączono
                    </div>
                  </div>
                </div>
              )}

              {/* Platform Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Wybierz platformy ({selectedPlatforms.length} zaznaczonych)
                </label>
                
                <div className="space-y-2">
                  {accounts.map((account) => {
                    const config = PLATFORM_CONFIG[account.platform];
                    const isSelected = selectedPlatforms.includes(account.platform);
                    const previewContent = truncateForPlatform(editedContent, account.platform);
                    const charCount = getCharacterCount(account.platform);
                    const isTooLong = editedContent.length > config.maxCharacters;

                    return (
                      <div
                        key={account.platform}
                        onClick={() => togglePlatform(account.platform)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-5 h-5 text-blue-500 rounded border-slate-300"
                          />
                          <div className={`p-1.5 ${config.color} rounded-lg text-white`}>
                            {config.icon}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {config.name}
                          </span>
                          <span className={`ml-auto text-xs ${isTooLong ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                            {charCount}
                          </span>
                        </div>
                        
                        {isSelected && (
                          <div className="ml-8 p-3 bg-white dark:bg-slate-900 rounded-lg">
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                              {previewContent}
                            </p>
                            {isTooLong && (
                              <p className="text-xs text-red-500 mt-1">
                                ⚠️ Treść za długa! Skróć lub edytuj.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scheduling */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Zaplanuj publikację (opcjonalnie)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Pozostaw puste dla natychmiastowej publikacji
                </p>
              </div>

              {/* Post Button */}
              <button
                onClick={handlePost}
                disabled={isPosting || selectedPlatforms.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
              >
                {isPosting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Publikowanie na {selectedPlatforms.length} platformach...
                  </>
                ) : (
                  <>
                    <ArrowRightIcon className="w-5 h-5" />
                    {scheduledTime ? 'Zaplanuj publikację' : 'Opublikuj teraz'}
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-sm">
                      {selectedPlatforms.length}
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
            <ChartBarIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              Analityka wymaga aktywnych połączeń API z platformami.
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Po opublikowaniu postów, zobaczysz tutaj statystyki engagement.
            </p>
          </div>

          {accounts.map((account) => (
            <div
              key={account.platform}
              className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 ${PLATFORM_CONFIG[account.platform].color} rounded-lg text-white`}>
                  {PLATFORM_CONFIG[account.platform].icon}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {PLATFORM_CONFIG[account.platform].name}
                  </h4>
                  <p className="text-xs text-slate-500">@{account.handle}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-300">-</div>
                  <div className="text-xs text-slate-500">Impressions</div>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-300">-</div>
                  <div className="text-xs text-slate-500">Engagement</div>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-300">-</div>
                  <div className="text-xs text-slate-500">Followers</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Opublikowano!
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Twój post został opublikowany na {postResults.filter(r => r.success).length} platformach.
              </p>
              
              <div className="space-y-2 mb-6">
                {postResults.map((result) => (
                  <div
                    key={result.platform}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      result.success
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{PLATFORM_CONFIG[result.platform].icon}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {PLATFORM_CONFIG[result.platform].name}
                      </span>
                    </div>
                    {result.success ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <span className="text-xs text-red-500">Błąd</span>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialMediaManager;
