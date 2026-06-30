import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  generateRepurposingPlan,
  generateThread,
  videoToSocialContent,
  RepurposingPlan,
  RepurposedContent,
  ThreadGeneratorResult,
  cacheRepurposingPlan,
  getCachedRepurposingPlan,
} from '../services/contentRepurposingService';
import { Platform, Tone, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { CollectionIcon } from './icons/CollectionIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

interface ContentRepurposingPanelProps {
  sourceContent: string;
  tone: Tone;
  currentPlatform: Platform;
}

const PLATFORM_COLORS: Record<Platform, string> = {
  [Platform.LinkedIn]: 'bg-blue-600',
  [Platform.X]: 'bg-slate-900',
  [Platform.Instagram]: 'bg-gradient-to-r from-purple-500 to-pink-500',
  [Platform.TikTok]: 'bg-black',
  [Platform.Facebook]: 'bg-blue-500',
  [Platform.YouTube]: 'bg-red-600',
};

const PLATFORM_LABELS: Record<Platform, string> = {
  [Platform.LinkedIn]: 'LinkedIn',
  [Platform.X]: 'X / Twitter',
  [Platform.Instagram]: 'Instagram',
  [Platform.TikTok]: 'TikTok',
  [Platform.Facebook]: 'Facebook',
  [Platform.YouTube]: 'YouTube',
};

export const ContentRepurposingPanel: React.FC<ContentRepurposingPanelProps> = ({
  sourceContent,
  tone,
  currentPlatform,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();

  const [activeTab, setActiveTab] = useState('plan');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(
    Object.values(Platform).filter(p => p !== currentPlatform)
  );
  const [plan, setPlan] = useState<RepurposingPlan | null>(null);
  const [thread, setThread] = useState<ThreadGeneratorResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [threadLength, setThreadLength] = useState(5);
  const [videoUrl, setVideoUrl] = useState('');

  const handleGeneratePlan = useCallback(async () => {
    if (!user?.id || !sourceContent.trim()) return;
    
    const contentHash = btoa(`${sourceContent}-${selectedPlatforms.join(',')}`).slice(0, 20);
    const cached = getCachedRepurposingPlan(contentHash);
    if (cached) {
      setPlan(cached);
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateRepurposingPlan(
        sourceContent,
        'long_post',
        selectedPlatforms,
        tone,
        user.id
      );
      setPlan(result);
      cacheRepurposingPlan(contentHash, result);
      notifications.addToast('Plan repurposingu wygenerowany!', NotificationType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd generowania planu';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsGenerating(false);
    }
  }, [sourceContent, selectedPlatforms, tone, user, notifications]);

  const handleGenerateThread = useCallback(async () => {
    if (!user?.id || !sourceContent.trim()) return;

    setIsGenerating(true);
    try {
      const result = await generateThread(
        sourceContent,
        threadLength,
        true,
        tone,
        user.id
      );
      setThread(result);
      notifications.addToast('Thread wygenerowany!', NotificationType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd generowania threadu';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsGenerating(false);
    }
  }, [sourceContent, threadLength, tone, user, notifications]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const getFormatIcon = (format: string) => {
    if (format === 'thread') return <CollectionIcon className="w-4 h-4" />;
    if (format === 'short') return <SparklesIcon className="w-4 h-4" />;
    return <CollectionIcon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
            <CollectionIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Content Repurposing Engine
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Jedna treść → Wiele platform
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'plan', label: 'Multi-Platform', icon: CollectionIcon },
          { id: 'thread', label: 'X Thread', icon: CollectionIcon },
          { id: 'video', label: 'Video → Social', icon: SparklesIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Multi-Platform Tab */}
      {activeTab === 'plan' && (
        <div className="space-y-4">
          {/* Platform Selection */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">
              Wybierz platformy docelowe:
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.values(Platform).map((platform) => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedPlatforms.includes(platform)
                      ? `${PLATFORM_COLORS[platform]} text-white`
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {PLATFORM_LABELS[platform]}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGeneratePlan}
            disabled={isGenerating || selectedPlatforms.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <SparklesIcon className="w-5 h-5" />
            )}
            {isGenerating ? 'Generuję...' : `Generuj dla ${selectedPlatforms.length} platform`}
          </button>

          {/* Results */}
          {plan && (
            <div className="space-y-4">
              {plan.repurposedContent.map((content, index) => (
                <div
                  key={`content-${content.platform}-${index}`}
                  className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${PLATFORM_COLORS[content.platform]}`} />
                      <span className="font-bold text-slate-900 dark:text-white">
                        {PLATFORM_LABELS[content.platform]}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-xs rounded">
                        {content.format}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        content.estimatedEngagement === 'high'
                          ? 'bg-green-100 text-green-700'
                          : content.estimatedEngagement === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        Engagement: {content.estimatedEngagement}
                      </span>
                      <button
                        onClick={() => handleCopy(content.content, index)}
                        className="p-1.5 text-slate-400 hover:text-violet-500 transition-colors"
                      >
                        {copiedIndex === index ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <ClipboardIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-3">
                    {content.content}
                  </p>

                  {content.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {content.hashtags.map((tag, i) => (
                        <span key={`tag-${tag}`} className="text-sm text-violet-600 dark:text-violet-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-slate-500">
                    {content.characterCount} characters | Najlepszy czas: {content.bestTimeToPost}
                  </div>
                </div>
              ))}

              {/* Content Calendar */}
              {plan.contentCalendar.length > 0 && (
                <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
                  <h4 className="font-bold text-violet-900 dark:text-violet-200 mb-3">
                    📅 Sugerowany harmonogram publikacji:
                  </h4>
                  <div className="space-y-2">
                    {plan.contentCalendar.map((item, i) => (
                      <div
                        key={`calendar-${item.day}-${item.platform}`}
                        className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg"
                      >
                        <span className="w-8 h-8 flex items-center justify-center bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 rounded-full font-bold text-sm">
                          D{item.day}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${PLATFORM_COLORS[item.platform]}`} />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {PLATFORM_LABELS[item.platform]} - {item.format}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Thread Generator Tab */}
      {activeTab === 'thread' && (
        <div className="space-y-4">
          {/* Thread Length Selection */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">
              Długość threadu:
            </h3>
            <div className="flex gap-2">
              {[3, 5, 7, 10].map((length) => (
                <button
                  key={length}
                  onClick={() => setThreadLength(length)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    threadLength === length
                      ? 'bg-violet-600 text-white'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {length} tweets
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateThread}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black disabled:opacity-50 text-white font-medium rounded-xl transition-all"
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CollectionIcon className="w-5 h-5" />
            )}
            {isGenerating ? 'Generuję thread...' : `Generuj ${threadLength}-tweet thread`}
          </button>

          {/* Thread Results */}
          {thread && (
            <div className="space-y-3">
              {thread.thread.map((tweet, index) => (
                <div
                  key={`tweet-${index}`}
                  className={`p-4 rounded-xl border ${
                    tweet.isHook
                      ? 'bg-slate-900 text-white border-slate-800'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                      tweet.isHook
                        ? 'bg-white text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className={tweet.isHook ? 'text-white' : 'text-slate-700 dark:text-slate-300'}>
                        {tweet.content}
                      </p>
                      {tweet.visualSuggestion && (
                        <p className={`text-sm mt-2 ${tweet.isHook ? 'text-slate-400' : 'text-slate-500'}`}>
                          🖼️ {tweet.visualSuggestion}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(tweet.content, 100 + index)}
                      className={`p-1.5 transition-colors ${
                        tweet.isHook ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-violet-500'
                      }`}
                    >
                      {copiedIndex === 100 + index ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      ) : (
                        <ClipboardIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {/* Engagement Prediction */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">
                  📊 Przewidywana aktywność:
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {thread.engagementPredictions.retweets}+
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Retweets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {thread.engagementPredictions.likes}+
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Likes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {thread.engagementPredictions.replies}+
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Replies</div>
                  </div>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
                  Najlepszy czas publikacji: <strong>{thread.bestPostingTime}</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video to Social Tab */}
      {activeTab === 'video' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">
              URL wideo lub opis treści:
            </h3>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Wklej URL YouTube, TikTok, lub opisz wideo..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <p className="text-amber-800 dark:text-amber-300 text-sm">
              🎥 <strong>Funkcja w przygotowaniu:</strong> W przyszłości będziesz mógł:
            </p>
            <ul className="mt-2 text-sm text-amber-700 dark:text-amber-400 list-disc list-inside">
              <li>Wkleić URL YouTube i AI automatycznie wyciągnie kluczowe momenty</li>
              <li>Generować audiogramy z transkrypcji</li>
              <li>Tworzyć carousle z najlepszych momentów</li>
              <li>Automatycznie generować quote cards</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentRepurposingPanel;
