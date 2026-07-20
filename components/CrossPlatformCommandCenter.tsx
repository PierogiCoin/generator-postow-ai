import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  analyzeBestPlatform,
  adaptContentForPlatform,
  batchAdaptContent,
  BestPlatformAnalysis,
  CrossPostAdaptation,
  PlatformRecommendation,
  UnifiedMessage,
  generateSmartReply,
  cachePlatformAnalysis,
  getCachedPlatformAnalysis,
} from '../services/crossPlatformService';
import { loadEngagementInbox } from '../services/engagementInboxService';
import { Platform, Tone, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { GlobeIcon } from './icons/GlobeIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { CollectionIcon } from './icons/CollectionIcon';

interface CrossPlatformCommandCenterProps {
  currentContent: string;
  tone: Tone;
  sourcePlatform: Platform;
}

const PLATFORM_COLORS: Record<Platform, string> = {
  [Platform.LinkedIn]: 'bg-blue-600',
  [Platform.X]: 'bg-slate-900',
  [Platform.Instagram]: 'bg-gradient-to-r from-purple-500 to-pink-500',
  [Platform.TikTok]: 'bg-black',
  [Platform.Facebook]: 'bg-blue-500',
  [Platform.YouTube]: 'bg-red-600',
};

const PLATFORM_ICONS: Record<Platform, string> = {
  [Platform.LinkedIn]: '💼',
  [Platform.X]: '𝕏',
  [Platform.Instagram]: '📸',
  [Platform.TikTok]: '🎵',
  [Platform.Facebook]: '👥',
  [Platform.YouTube]: '▶️',
};

const SENTIMENT_COLORS = {
  positive: 'bg-green-100 text-green-700 border-green-300',
  neutral: 'bg-slate-100 text-slate-700 border-slate-300',
  negative: 'bg-red-100 text-red-700 border-red-300',
  urgent: 'bg-amber-100 text-amber-700 border-amber-300',
};

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-amber-100 text-amber-600',
  critical: 'bg-red-100 text-red-600',
};

export const CrossPlatformCommandCenter: React.FC<CrossPlatformCommandCenterProps> = ({
  currentContent,
  tone,
  sourcePlatform,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();

  const [activeTab, setActiveTab] = useState('picker');
  const [analysis, setAnalysis] = useState<BestPlatformAnalysis | null>(null);
  const [adaptations, setAdaptations] = useState<Record<Platform, CrossPostAdaptation> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTargetPlatforms, setSelectedTargetPlatforms] = useState<Platform[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const [inboxMessages, setInboxMessages] = useState<UnifiedMessage[]>([]);
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);

  const refreshInbox = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingInbox(true);
    try {
      const messages = await loadEngagementInbox(user.id);
      setInboxMessages(messages);
    } catch {
      setInboxMessages([]);
    } finally {
      setIsLoadingInbox(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    if (activeTab === 'inbox') {
      void refreshInbox();
    }
  }, [activeTab, refreshInbox]);

  const handleAnalyzeBestPlatform = useCallback(async () => {
    if (!user?.id || !currentContent.trim()) return;

    const contentHash = btoa(currentContent.slice(0, 100)).slice(0, 20);
    const cached = getCachedPlatformAnalysis(contentHash);
    if (cached) {
      setAnalysis(cached);
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeBestPlatform(
        currentContent,
        'text',
        tone,
        'Marketing Professionals',
        user.id
      );
      setAnalysis(result);
      cachePlatformAnalysis(contentHash, result);
      notifications.addToast('Analiza platform zakończona!', NotificationType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd analizy platform';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentContent, tone, user, notifications]);

  const handleBatchAdapt = useCallback(async () => {
    if (!user?.id || !currentContent.trim() || selectedTargetPlatforms.length === 0) return;

    setIsAnalyzing(true);
    try {
      const result = await batchAdaptContent(
        currentContent,
        sourcePlatform,
        selectedTargetPlatforms,
        tone,
        user.id
      );
      setAdaptations(result);
      notifications.addToast(`Wygenerowano ${selectedTargetPlatforms.length} adaptacji!`, NotificationType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd adaptacji treści';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentContent, sourcePlatform, selectedTargetPlatforms, tone, user, notifications]);

  const togglePlatform = (platform: Platform) => {
    setSelectedTargetPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleCopy = (text: string, index: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
            <GlobeIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('crossPlatform.title', 'Centrum multi-platformowe')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Zarządzaj wszystkimi platformami z jednego miejsca
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'picker', label: t('crossPlatform.tabs.picker', 'Najlepsza platforma'), icon: SparklesIcon, badge: analysis ? '✓' : null },
          { id: 'inbox', label: t('crossPlatform.tabs.inbox', 'Skrzynka'), icon: ChatBubbleIcon, badge: String(inboxMessages.length || '') },
          { id: 'adapt', label: t('crossPlatform.tabs.adapt', 'Cross-post'), icon: ArrowRightIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Best Platform Picker Tab */}
      {activeTab === 'picker' && (
        <div className="space-y-4">
          <button
            onClick={handleAnalyzeBestPlatform}
            disabled={isAnalyzing || !currentContent.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
          >
            {isAnalyzing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <SparklesIcon className="w-5 h-5" />
            )}
            {isAnalyzing ? 'Analizuję...' : 'Znajdź najlepszą platformę'}
          </button>

          {analysis && (
            <div className="space-y-4">
              {/* Top Recommendation */}
              <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 ${PLATFORM_COLORS[analysis.topChoice]} rounded-xl text-white text-2xl`}>
                    {PLATFORM_ICONS[analysis.topChoice]}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Najlepsza platforma: {analysis.topChoice}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {analysis.whyThisPlatform}
                    </p>
                  </div>
                </div>

                {analysis.suggestedModifications.length > 0 && (
                  <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Sugerowane modyfikacje:
                    </p>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      {analysis.suggestedModifications.map((mod, i) => (
                        <li key={`mod-${i}`}>• {mod}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* All Platform Rankings */}
              <div className="grid gap-3">
                {analysis.recommendations
                  .sort((a, b) => b.score - a.score)
                  .map((rec, index) => (
                    <div
                      key={rec.platform}
                      className={`p-4 rounded-xl border ${
                        index === 0
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{PLATFORM_ICONS[rec.platform]}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {rec.platform}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full">
                                TOP
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getScoreColor(rec.score)} transition-all`}
                                style={{ width: `${rec.score}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                              {rec.score}/100
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="text-slate-500 dark:text-slate-400">Dopasowanie:</span>
                          <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">
                            {rec.audienceMatch}%
                          </span>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="text-slate-500 dark:text-slate-400">Najlepszy format:</span>
                          <span className="ml-2 font-medium text-slate-700 dark:text-slate-300 capitalize">
                            {rec.bestFormat}
                          </span>
                        </div>
                      </div>

                      {rec.reasons.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-slate-500 mb-1">Dlaczego ta platforma:</p>
                          <ul className="text-sm text-slate-600 dark:text-slate-400">
                            {rec.reasons.slice(0, 2).map((reason, i) => (
                              <li key={`reason-${i}`}>• {reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unified Inbox Tab */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Inbox Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{inboxMessages.length}</div>
              <div className="text-xs text-slate-500">Nowe</div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
              <div className="text-2xl font-bold text-green-600">
                {inboxMessages.filter(m => m.sentiment === 'positive').length}
              </div>
              <div className="text-xs text-green-600/70">Pozytywne</div>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center">
              <div className="text-2xl font-bold text-amber-600">
                {inboxMessages.filter(m => m.priority === 'high' || m.priority === 'critical').length}
              </div>
              <div className="text-xs text-amber-600/70">Pilne</div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
              <div className="text-2xl font-bold text-blue-600">
                {inboxMessages.filter(m => m.engagementOpportunity).length}
              </div>
              <div className="text-xs text-blue-600/70">Okazje</div>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {isLoadingInbox ? (
              <div className="p-8 text-center text-sm text-slate-500">Ładowanie skrzynki…</div>
            ) : inboxMessages.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Brak wiadomości w skrzynce</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Połącz konta social media, aby agregować komentarze i wzmianki.
                </p>
                <button
                  type="button"
                  onClick={() => void refreshInbox()}
                  className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
                >
                  Odśwież
                </button>
              </div>
            ) : inboxMessages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-xl border ${
                  message.priority === 'critical'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200'
                    : message.priority === 'high'
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${PLATFORM_COLORS[message.platform]} text-white`}>
                    {PLATFORM_ICONS[message.platform]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {message.author.name}
                      </span>
                      {message.author.isVerified && (
                        <span className="text-blue-500">✓</span>
                      )}
                      <span className="text-slate-500 text-sm">@{message.author.handle}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLORS[message.priority]}`}>
                        {message.priority}
                      </span>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 text-sm mb-2">
                      {message.content}
                    </p>

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${SENTIMENT_COLORS[message.sentiment]}`}>
                        {message.sentiment}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {message.engagementOpportunity && (
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          💡 {message.engagementOpportunity}
                        </p>
                      </div>
                    )}

                    {message.aiSuggestedReply && (
                      <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Sugerowana odpowiedź AI:</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {message.aiSuggestedReply}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleCopy(message.aiSuggestedReply!, `reply-${message.id}`)}
                            className="text-xs px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                          >
                            {copiedIndex === `reply-${message.id}` ? 'Skopiowano!' : 'Kopiuj'}
                          </button>
                          {message.requiresHumanReview && (
                            <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">
                              ⚠️ Wymaga weryfikacji
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Post Optimizer Tab */}
      {activeTab === 'adapt' && (
        <div className="space-y-4">
          {/* Platform Selection */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">
              Adaptuj z {sourcePlatform} do:
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.values(Platform)
                .filter(p => p !== sourcePlatform)
                .map((platform) => (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedTargetPlatforms.includes(platform)
                        ? `${PLATFORM_COLORS[platform]} text-white`
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>{PLATFORM_ICONS[platform]}</span>
                    {platform}
                  </button>
                ))}
            </div>
          </div>

          <button
            onClick={handleBatchAdapt}
            disabled={isAnalyzing || selectedTargetPlatforms.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
          >
            {isAnalyzing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowRightIcon className="w-5 h-5" />
            )}
            {isAnalyzing ? 'Adaptuję...' : `Generuj dla ${selectedTargetPlatforms.length} platform`}
          </button>

          {/* Adaptation Results */}
          {adaptations && (
            <div className="space-y-4">
              {Object.entries(adaptations).map(([platform, adaptation]) => (
                <div
                  key={platform}
                  className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{PLATFORM_ICONS[platform as Platform]}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{platform}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(adaptation.adaptedContent, `adapt-${platform}`)}
                      className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors"
                    >
                      {copiedIndex === `adapt-${platform}` ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      ) : (
                        <ClipboardIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg mb-3">
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {adaptation.adaptedContent}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {adaptation.changes.map((change, i) => (
                      <span
                        key={`change-${i}`}
                        className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full"
                      >
                        {change.type === 'shortened' ? '✂️ Skrócone' :
                         change.type === 'lengthened' ? '📝 Rozszerzone' :
                         change.type === 'tone_adjusted' ? '🎯 Ton dostosowany' :
                         change.type === 'hashtags_added' ? '#️⃣ Hashtagi dodane' :
                         change.type}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    {adaptation.characterCount.original} → {adaptation.characterCount.adapted} znaków
                    {adaptation.engagementPrediction.adapted > adaptation.engagementPrediction.original && (
                      <span className="ml-2 text-green-600">
                        +{Math.round((adaptation.engagementPrediction.adapted / adaptation.engagementPrediction.original - 1) * 100)}% przewidywane engagement
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default CrossPlatformCommandCenter;
