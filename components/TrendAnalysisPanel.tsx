import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  analyzeTrends,
  analyzeNiche,
  generateTrendAlerts,
  suggestTrendingTopics,
  TrendData,
  TrendAlert,
  NicheAnalysis,
  cacheTrendAnalysis,
  getCachedTrendAnalysis,
  storeAlerts,
  getStoredAlerts,
} from '../services/trendAnalysisService';
import { fetchIntelligenceTrends } from '../services/intelligenceService';
import { Platform, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { RefreshCwIcon } from './icons/RefreshCwIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { TargetIcon } from './icons/TargetIcon';

interface TrendAnalysisPanelProps {
  niche: string;
  platform: Platform;
  onSelectTrend: (trend: TrendData) => void;
  onSelectTopic: (topic: string) => void;
  brandVoice?: string;
}

const MOMENTUM_COLORS = {
  rising: 'from-green-500 to-emerald-500',
  peak: 'from-amber-500 to-orange-500',
  falling: 'from-red-500 to-rose-500',
  stable: 'from-blue-500 to-indigo-500',
};

const MOMENTUM_LABELS = {
  rising: '↗️ Rośnie',
  peak: '⛰️ Peak',
  falling: '↘️ Spada',
  stable: '➡️ Stabilny',
};

const URGENCY_COLORS = {
  now: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-300',
  soon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300',
  watch: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300',
};

const URGENCY_LABELS = {
  now: '🔥 Działaj TERAZ',
  soon: '⏰ W tym tygodniu',
  watch: '👁️ Obserwuj',
};

export const TrendAnalysisPanel: React.FC<TrendAnalysisPanelProps> = ({
  niche,
  platform,
  onSelectTrend,
  onSelectTopic,
  brandVoice,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();

  const [activeTab, setActiveTab] = useState('trends');
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [alerts, setAlerts] = useState<TrendAlert[]>([]);
  const [nicheAnalysis, setNicheAnalysis] = useState<NicheAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState<TrendData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [editableNiche, setEditableNiche] = useState(niche);
  const [contentGaps, setContentGaps] = useState<string[]>([]);
  const [avoidTopics, setAvoidTopics] = useState<string[]>([]);
  const [trendSources, setTrendSources] = useState<{ title: string; url: string }[]>([]);

  // Load cached data on mount
  useEffect(() => {
    const cached = getCachedTrendAnalysis(niche, platform);
    if (cached) {
      setTrends(cached);
      setLastUpdated(new Date());
    }
    const storedAlerts = getStoredAlerts();
    if (storedAlerts.length > 0) {
      setAlerts(storedAlerts);
    }
  }, [niche, platform]);

  const handleAnalyze = useCallback(async () => {
    if (!user?.id) {
      notifications.addToast('Musisz być zalogowany', NotificationType.Error);
      return;
    }

    setIsLoading(true);
    try {
      const currentNiche = editableNiche.trim() || niche;
      // Run all analyses in parallel
      const [trendsData, nicheData, intelTrends] = await Promise.all([
        analyzeTrends(currentNiche, platform, user.id),
        analyzeNiche(currentNiche, [platform], user.id),
        fetchIntelligenceTrends(currentNiche, platform, user.id, 'deep').catch(() => null),
      ]);

      setTrends(trendsData);
      setNicheAnalysis(nicheData);
      if (intelTrends) {
        setContentGaps(intelTrends.contentGaps || []);
        setAvoidTopics(intelTrends.avoidTopics || []);
        setTrendSources(intelTrends.sources || []);
      }
      cacheTrendAnalysis(currentNiche, platform, trendsData);
      setLastUpdated(new Date());

      // Generate alerts based on new trends
      const newAlerts = await generateTrendAlerts(currentNiche, trendsData, user.id);
      if (newAlerts.length > 0) {
        setAlerts(newAlerts);
        storeAlerts(newAlerts);
      }

      notifications.addToast('Analiza trendów zakończona!', NotificationType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd analizy trendów';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [editableNiche, niche, platform, user, notifications]);

  const handleSelectTrend = useCallback((trend: TrendData) => {
    setSelectedTrend(trend);
    onSelectTrend(trend);
  }, [onSelectTrend]);

  const handleUseTopic = useCallback((topic: string) => {
    onSelectTopic(topic);
    notifications.addToast(`Temat "${topic}" wybrany!`, NotificationType.Success);
  }, [onSelectTopic, notifications]);

  const getEngagementColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-amber-500';
    return 'text-slate-400';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
              <TrendingUpIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Trend Analysis
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500 dark:text-slate-400">Nisza:</span>
                <input
                  type="text"
                  value={editableNiche}
                  onChange={(e) => setEditableNiche(e.target.value)}
                  className="px-2 py-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-transparent border-b border-indigo-200 dark:border-indigo-700 focus:border-indigo-500 outline-none w-48"
                />
                {lastUpdated && (
                  <span className="text-xs text-slate-400">
                    • Zaktualizowano {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <RefreshCwIcon className="w-4 h-4" />
            )}
            {isLoading ? 'Analizuję...' : 'Odśwież'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          {[
            { id: 'trends', label: 'Trendy', icon: TrendingUpIcon, count: trends.length },
            { id: 'alerts', label: 'Alerty', icon: AlertTriangleIcon, count: alerts.length },
            { id: 'niche', label: 'Analiza Niszy', icon: TargetIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading && trends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-slate-600 dark:text-slate-400">
              AI analizuje trendy w Twojej niszy...
            </p>
            <p className="text-sm text-slate-400">
              To może potrwać do 30 sekund
            </p>
          </div>
        ) : (
          <>
            {/* Trends Tab */}
            {activeTab === 'trends' && (
              <div className="space-y-4">
                {contentGaps.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <h3 className="text-sm font-black uppercase tracking-wider text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                      <LightbulbIcon className="w-4 h-4" />
                      Luki treści (live search)
                    </h3>
                    <ul className="space-y-1">
                      {contentGaps.map((gap) => (
                        <li key={gap} className="text-sm text-amber-900 dark:text-amber-100 flex gap-2">
                          <span>💡</span>
                          <button
                            type="button"
                            onClick={() => handleUseTopic(gap)}
                            className="text-left hover:underline"
                          >
                            {gap}
                          </button>
                        </li>
                      ))}
                    </ul>
                    {avoidTopics.length > 0 && (
                      <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-3">
                        Unikaj: {avoidTopics.join(' · ')}
                      </p>
                    )}
                    {trendSources.length > 0 && (
                      <p className="text-[10px] text-amber-600/70 mt-2">
                        Źródła: {trendSources.slice(0, 3).map((s) => s.title).join(' · ')}
                      </p>
                    )}
                  </div>
                )}
                {trends.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUpIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500 dark:text-slate-400">
                      Kliknij "Odśwież" aby przeanalizować trendy w niszy "{niche}"
                    </p>
                  </div>
                ) : (
                  trends.map((trend, index) => (
                    <div
                      key={trend.id}
                      onClick={() => handleSelectTrend(trend)}
                      className={`group p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                        selectedTrend?.id === trend.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                          #{index + 1}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                              {trend.topic}
                            </h3>
                            <div className={`px-2 py-1 rounded-lg text-xs font-semibold border ${URGENCY_COLORS[trend.actionUrgency]}`}>
                              {URGENCY_LABELS[trend.actionUrgency]}
                            </div>
                          </div>

                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                            {trend.whyItsTrending}
                          </p>

                          {/* Stats Row */}
                          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                            <div className={`flex items-center gap-1 font-medium ${getEngagementColor(trend.engagementScore)}`}>
                              <SparklesIcon className="w-4 h-4" />
                              Engagement: {trend.engagementScore}/10
                            </div>
                            <div className="flex items-center gap-1 text-slate-500">
                              <TargetIcon className="w-4 h-4" />
                              Konkurencja: {trend.competitionLevel}
                            </div>
                            <div className={`px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${MOMENTUM_COLORS[trend.momentum]} text-white`}>
                              {MOMENTUM_LABELS[trend.momentum]}
                            </div>
                          </div>

                          {/* Hashtags */}
                          {trend.relatedHashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {trend.relatedHashtags.slice(0, 4).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-lg"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Content Ideas Preview */}
                          {trend.contentIdeas.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                                Pomysły na treści:
                              </p>
                              <ul className="space-y-1">
                                {trend.contentIdeas.slice(0, 2).map((idea, i) => (
                                  <li key={`idea-${i}`} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <LightbulbIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    {idea}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Action Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseTopic(trend.topic);
                            }}
                            className="mt-4 flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                          >
                            Użyj tego tematu
                            <ArrowRightIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-green-300" />
                    <p className="text-slate-500 dark:text-slate-400">
                      Brak aktywnych alertów. Wszystko spokojne! ✨
                    </p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-5 rounded-2xl border-2 ${
                        alert.priority === 'high'
                          ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                          : alert.priority === 'medium'
                          ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'
                          : 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-xl ${
                          alert.priority === 'high' ? 'bg-red-200 dark:bg-red-800' :
                          alert.priority === 'medium' ? 'bg-amber-200 dark:bg-amber-800' :
                          'bg-blue-200 dark:bg-blue-800'
                        }`}>
                          <AlertTriangleIcon className={`w-5 h-5 ${
                            alert.priority === 'high' ? 'text-red-700' :
                            alert.priority === 'medium' ? 'text-amber-700' :
                            'text-blue-700'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            {alert.message}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {alert.suggestedAction}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              {alert.createdAt.toLocaleString()}
                            </span>
                            <button
                              onClick={() => handleUseTopic(alert.trend.topic)}
                              className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                            >
                              Utwórz treść →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Niche Analysis Tab */}
            {activeTab === 'niche' && nicheAnalysis && (
              <div className="space-y-6">
                {/* Sentiment */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <TargetIcon className="w-5 h-5 text-indigo-500" />
                    Nastroj w niszy
                  </h3>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium ${
                    nicheAnalysis.overallSentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    nicheAnalysis.overallSentiment === 'negative' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {nicheAnalysis.overallSentiment === 'positive' ? '😊 Pozytywny' :
                     nicheAnalysis.overallSentiment === 'negative' ? '😔 Negatywny' :
                     '😐 Neutralny'}
                  </div>
                </div>

                {/* Trending Themes */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <TrendingUpIcon className="w-5 h-5 text-green-500" />
                    Trendujące tematy
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {nicheAnalysis.trendingThemes.map((theme, i) => (
                      <button
                        key={`theme-${theme}`}
                        onClick={() => handleUseTopic(theme)}
                        className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Evergreen Topics */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-blue-500" />
                    Evergreen (zawsze działają)
                  </h3>
                  <ul className="space-y-2">
                    {nicheAnalysis.evergreenTopics.map((topic, i) => (
                      <li key={`topic-${i}`} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Content Gaps */}
                <div className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                  <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2">
                    <LightbulbIcon className="w-5 h-5" />
                    🎯 Content Gaps (Szansa!)
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                    Te tematy mają wysokie zainteresowanie ale niską konkurencję:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {nicheAnalysis.contentGaps.map((gap, i) => (
                      <button
                        key={`gap-${gap}`}
                        onClick={() => handleUseTopic(gap)}
                        className="px-3 py-1.5 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200 text-sm font-medium rounded-lg hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors"
                      >
                        {gap} →
                      </button>
                    ))}
                  </div>
                </div>

                {/* Declining Topics */}
                {nicheAnalysis.decliningTopics.length > 0 && (
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <AlertTriangleIcon className="w-5 h-5 text-red-500" />
                      Unikaj tych tematów (spadające zainteresowanie)
                    </h3>
                    <ul className="space-y-2">
                      {nicheAnalysis.decliningTopics.map((topic, i) => (
                        <li key={`declining-${i}`} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'niche' && !nicheAnalysis && !isLoading && (
              <div className="text-center py-12">
                <TargetIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 dark:text-slate-400">
                  Kliknij "Odśwież" aby przeanalizować Twoją niszę
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TrendAnalysisPanel;
