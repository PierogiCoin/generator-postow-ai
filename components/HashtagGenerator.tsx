import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  generateSmartHashtags,
  analyzeHashtagPerformance,
  HashtagSet,
  HashtagAnalysis,
  ViralHashtagData,
  cacheHashtagAnalysis,
  getCachedHashtagAnalysis,
  saveHashtagToHistory,
} from '../services/hashtagService';
import { Platform, ContentType, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { HashIcon } from './icons/HashIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { TargetIcon } from './icons/TargetIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { RefreshCwIcon } from './icons/RefreshCwIcon';
import { XMarkIcon } from './icons/XMarkIcon';

interface HashtagGeneratorProps {
  topic: string;
  platform: Platform;
  contentType: ContentType;
  onSelectHashtags: (hashtags: string[]) => void;
  currentHashtags?: string[];
}

const PURPOSE_COLORS = {
  reach: 'from-blue-500 to-cyan-500',
  engagement: 'from-green-500 to-emerald-500',
  niche: 'from-purple-500 to-pink-500',
  viral: 'from-orange-500 to-red-500',
  branded: 'from-indigo-500 to-violet-500',
};

const PURPOSE_LABELS = {
  reach: '🚀 Reach',
  engagement: '💬 Engagement',
  niche: '🎯 Niche',
  viral: '🔥 Viral',
  branded: '©️ Branded',
};

const COMPETITION_COLORS = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-green-500',
};

export const HashtagGenerator: React.FC<HashtagGeneratorProps> = ({
  topic,
  platform,
  contentType,
  onSelectHashtags,
  currentHashtags = [],
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();

  const [analysis, setAnalysis] = useState<HashtagAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [copiedSet, setCopiedSet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sets');
  const [hashtagPerformance, setHashtagPerformance] = useState<ViralHashtagData[]>([]);
  const [isAnalyzingPerformance, setIsAnalyzingPerformance] = useState(false);

  // Load cached data on mount
  useEffect(() => {
    if (topic) {
      const cached = getCachedHashtagAnalysis(topic);
      if (cached) {
        setAnalysis(cached);
      }
    }
  }, [topic]);

  const handleGenerate = useCallback(async () => {
    if (!user?.id) {
      notifications.addToast('Musisz być zalogowany', NotificationType.Error);
      return;
    }

    if (!topic.trim()) {
      notifications.addToast('Podaj temat aby wygenerować hashtagi', NotificationType.Error);
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateSmartHashtags(
        topic,
        platform,
        contentType,
        user.id,
        currentHashtags
      );

      setAnalysis(result);
      cacheHashtagAnalysis(topic, result);
      notifications.addToast(`Wygenerowano ${result.recommendedSets.length} zestawów hashtagów!`, NotificationType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd generowania hashtagów';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [topic, platform, contentType, user, currentHashtags, notifications]);

  const handleAnalyzePerformance = useCallback(async (hashtags: string[]) => {
    if (!user?.id) return;

    setIsAnalyzingPerformance(true);
    try {
      const performance = await analyzeHashtagPerformance(hashtags, platform, user.id);
      setHashtagPerformance(performance);
      setActiveTab('performance');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd analizy hashtagów';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsAnalyzingPerformance(false);
    }
  }, [platform, user, notifications]);

  const handleCopySet = useCallback((set: HashtagSet) => {
    const hashtagString = set.hashtags.map(h => `#${h}`).join(' ');
    navigator.clipboard.writeText(hashtagString);
    setCopiedSet(set.id);
    setTimeout(() => setCopiedSet(null), 2000);
  }, []);

  const handleUseSet = useCallback((set: HashtagSet) => {
    onSelectHashtags(set.hashtags);
    saveHashtagToHistory(set.hashtags, topic);
    setSelectedSet(set.id);
    notifications.addToast(`Zestaw "${set.name}" wybrany! (${set.hashtags.length} hashtagów)`, NotificationType.Success);
  }, [onSelectHashtags, topic, notifications]);

  const handleCopyHashtags = useCallback((hashtags: string[]) => {
    const hashtagString = hashtags.map(h => `#${h}`).join(' ');
    navigator.clipboard.writeText(hashtagString);
    notifications.addToast('Hashtagi skopiowane!', NotificationType.Success);
  }, [notifications]);

  const getReachColor = (reach: string) => {
    if (reach === 'high') return 'text-green-500';
    if (reach === 'medium') return 'text-amber-500';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
            <HashIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Smart Hashtag Generator
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Temat: <span className="font-medium text-blue-600">{topic || 'Wpisz temat'}</span>
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <SparklesIcon className="w-4 h-4" />
          )}
          {isLoading ? 'Generuję...' : 'Generuj'}
        </button>
      </div>

      {/* Current Hashtags */}
      {currentHashtags.length > 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Aktualne hashtagi ({currentHashtags.length}):
            </span>
            <button
              onClick={() => handleCopyHashtags(currentHashtags)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Kopiuj wszystkie
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentHashtags.map((tag, i) => (
              <span
                key={`tag-${tag}`}
                className="px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg border border-slate-200 dark:border-slate-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {isLoading && !analysis ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-600 dark:text-slate-400">
            AI analizuje najlepsze hashtagi dla Twojego tematu...
          </p>
        </div>
      ) : analysis ? (
        <>
          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'sets', label: 'Zestawy', icon: TargetIcon },
              { id: 'trending', label: 'Trendujące', icon: TrendingUpIcon },
              { id: 'performance', label: 'Analiza', icon: BeakerIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sets Tab */}
          {activeTab === 'sets' && (
            <div className="grid gap-4">
              {analysis.recommendedSets.map((set) => (
                <div
                  key={set.id}
                  className={`p-5 rounded-2xl border-2 transition-all ${
                    selectedSet === set.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-blue-300'
                  }`}
                >
                  {/* Set Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${PURPOSE_COLORS[set.purpose]} text-white text-xs font-bold`}>
                        {PURPOSE_LABELS[set.purpose]}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {set.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`font-medium ${getReachColor(set.estimatedReach)}`}>
                        Reach: {set.estimatedReach}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className={`font-medium ${COMPETITION_COLORS[set.competitionLevel]}`}>
                        {set.competitionLevel} competition
                      </span>
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {set.hashtags.map((tag, i) => (
                      <span
                        key={`set-tag-${tag}`}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                        onClick={() => handleCopyHashtags([tag])}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Explanation */}
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    {set.aiExplanation}
                  </p>

                  {/* Best For */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                    <span>Najlepsze dla:</span>
                    {set.bestFor.map((type, i) => (
                      <span key={`type-${type}`} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                        {type}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleUseSet(set)}
                      className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                        selectedSet === set.id
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {selectedSet === set.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <CheckCircleIcon className="w-4 h-4" />
                          Wybrano!
                        </span>
                      ) : (
                        'Użyj tego zestawu'
                      )}
                    </button>
                    <button
                      onClick={() => handleCopySet(set)}
                      className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      {copiedSet === set.id ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          Skopiowano!
                        </>
                      ) : (
                        <>
                          <ClipboardIcon className="w-4 h-4" />
                          Kopiuj
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleAnalyzePerformance(set.hashtags)}
                      disabled={isAnalyzingPerformance}
                      className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      {isAnalyzingPerformance ? (
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Analizuj'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trending Tab */}
          {activeTab === 'trending' && (
            <div className="space-y-6">
              {/* Trending Hashtags */}
              <div className="p-5 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl border border-orange-200 dark:border-orange-800">
                <h3 className="font-bold text-orange-900 dark:text-orange-200 mb-4 flex items-center gap-2">
                  <TrendingUpIcon className="w-5 h-5" />
                  🔥 Trendujące w tej niszy
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.trendingHashtags.map((tag, i) => (
                    <button
                      key={`trending-${tag}`}
                      onClick={() => handleCopyHashtags([tag])}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 text-orange-700 dark:text-orange-300 font-medium rounded-lg hover:ring-2 hover:ring-orange-400 transition-all"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Evergreen */}
              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800">
                <h3 className="font-bold text-green-900 dark:text-green-200 mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  ✅ Evergreen (zawsze działają)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.evergreenHashtags.map((tag, i) => (
                    <button
                      key={`evergreen-${tag}`}
                      onClick={() => handleCopyHashtags([tag])}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 text-green-700 dark:text-green-300 rounded-lg hover:ring-2 hover:ring-green-400 transition-all"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Competitor Hashtags */}
              {analysis.competitorHashtags.length > 0 && (
                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <TargetIcon className="w-5 h-5" />
                    🎯 Używane przez konkurencję
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.competitorHashtags.map((tag, i) => (
                      <button
                        key={`competitor-${tag}`}
                        onClick={() => handleCopyHashtags([tag])}
                        className="px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Avoid */}
              {analysis.bannedOrShadowbanned.length > 0 && (
                <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
                  <h3 className="font-bold text-red-900 dark:text-red-200 mb-4 flex items-center gap-2">
                    <AlertTriangleIcon className="w-5 h-5" />
                    ⚠️ Unikaj (overused/shadowban)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.bannedOrShadowbanned.map((tag, i) => (
                      <span
                        key={`banned-${tag}`}
                        className="px-3 py-1.5 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-lg line-through opacity-60"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategy Tip */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>💡 Strategia dla {platform}:</strong> {analysis.placementStrategy}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  Optymalna liczba: <strong>{analysis.optimalCount} hashtagów</strong>
                </p>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-4">
              {hashtagPerformance.length === 0 ? (
                <div className="text-center py-12">
                  <BeakerIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 dark:text-slate-400">
                    Wybierz zestaw i kliknij "Analizuj" aby zobaczyć szczegółowe metryki
                  </p>
                </div>
              ) : (
                hashtagPerformance.map((data) => (
                  <div
                    key={data.hashtag}
                    className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                        #{data.hashtag}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          data.growthRate === 'rising' ? 'bg-green-100 text-green-700' :
                          data.growthRate === 'falling' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {data.growthRate === 'rising' ? '↗️' : data.growthRate === 'falling' ? '↘️' : '➡️'} {data.growthRate}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <span className="text-xs text-slate-500">Posts</span>
                        <p className="font-semibold text-slate-900 dark:text-white">{data.postsCount}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Engagement</span>
                        <p className={`font-semibold ${
                          data.engagementRate === 'high' ? 'text-green-500' :
                          data.engagementRate === 'low' ? 'text-red-500' :
                          'text-amber-500'
                        }`}>
                          {data.engagementRate}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Viral Potential</span>
                        <p className="font-semibold text-slate-900 dark:text-white">{data.viralPotential}/10</p>
                      </div>
                    </div>

                    {data.relatedHashtags.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">Powiązane:</span>
                        {data.relatedHashtags.map((tag, i) => (
                          <span key={`related-${tag}`} className="text-blue-600 dark:text-blue-400">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <HashIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Kliknij "Generuj" aby stworzyć strategiczne zestawy hashtagów
          </p>
          <p className="text-sm text-slate-400">
            AI stworzy 5 zestawów: Reach, Engagement, Niche, Viral i Branded
          </p>
        </div>
      )}
    </div>
  );
};

export default HashtagGenerator;
