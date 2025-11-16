import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CampaignHistoryItem, AIInsight, OptimalTime } from '../types';
import { UserPlan, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDataStore } from '../stores/dataStore';
import { useUIStore } from '../stores/uiStore';
import { useNotifications } from '../hooks/useNotifications';
import * as analyticsService from '../services/analyticsService';
import { SparklesIcon } from './icons/SparklesIcon';
import { EyeIcon } from './icons/EyeIcon';
import { HeartIcon } from './icons/HeartIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { ShareIcon } from './icons/ShareIcon';
import { platformConfig } from '../config/platformConfig';
import { insightConfig } from './analyticsConstants';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { SentimentDisplay } from './SentimentDisplay';
import { SEOAnalysisDisplay } from './SEOAnalysisDisplay';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { AnalyticsChart } from './AnalyticsChart';

const SEOTrendChart: React.FC<{ data: CampaignHistoryItem[] }> = ({ data }) => {
    const [activePoint, setActivePoint] = useState<CampaignHistoryItem | null>(null);
    const chartData = data
        .filter(item => item.seoAnalysis?.score)
        .sort((a, b) => a.timestamp - b.timestamp);

    if (chartData.length < 2) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                Za mało danych do wygenerowania wykresu trendów SEO. Potrzebne są co najmniej 2 posty z analizą.
            </div>
        );
    }

    const PADDING = 40;
    const CHART_WIDTH = 600;
    const CHART_HEIGHT = 200;

    const minTimestamp = chartData[0].timestamp;
    const maxTimestamp = chartData[chartData.length - 1].timestamp;

    const getX = (timestamp: number) => {
        if (maxTimestamp === minTimestamp) return PADDING;
        return PADDING + ((timestamp - minTimestamp) / (maxTimestamp - minTimestamp)) * (CHART_WIDTH - 2 * PADDING);
    };

    const getY = (score: number) => {
        return CHART_HEIGHT - PADDING - ((score / 100) * (CHART_HEIGHT - 2 * PADDING));
    };

    const pathData = chartData
        .map(item => `${getX(item.timestamp)},${getY(item.seoAnalysis!.score)}`)
        .join(' L ');

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full h-auto">
                <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                    </linearGradient>
                </defs>
                {/* Y Axis Grid Lines */}
                {[0, 25, 50, 75, 100].map(val => (
                    <g key={val}>
                        <line x1={PADDING} y1={getY(val)} x2={CHART_WIDTH - PADDING} y2={getY(val)} stroke="var(--grid-stroke)" strokeWidth="1" />
                        <text x={PADDING - 10} y={getY(val) + 4} textAnchor="end" className="text-xs" fill="var(--text-secondary)">{val}</text>
                    </g>
                ))}
                {/* X Axis Labels */}
                {chartData.map((item, index) => (
                    <text key={index} x={getX(item.timestamp)} y={CHART_HEIGHT - PADDING + 15} textAnchor="middle" className="text-xs" fill="var(--text-secondary)">
                        {new Date(item.timestamp).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
                    </text>
                ))}

                {/* Area under the line */}
                <path d={`M ${getX(minTimestamp)},${CHART_HEIGHT - PADDING} L ${pathData} L ${getX(maxTimestamp)},${CHART_HEIGHT - PADDING} Z`} fill="url(#areaGradient)" />

                {/* The line itself */}
                <path d={`M ${pathData}`} fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Data points */}
                {chartData.map((item, index) => (
                    <circle
                        key={index}
                        cx={getX(item.timestamp)}
                        cy={getY(item.seoAnalysis!.score)}
                        r="5"
                        fill="var(--tooltip-bg)"
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        onMouseEnter={() => setActivePoint(item)}
                        onMouseLeave={() => setActivePoint(null)}
                        className="cursor-pointer"
                    />
                ))}
            </svg>
            {activePoint && (
                <div className="absolute p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-sm pointer-events-none" style={{
                    top: `${getY(activePoint.seoAnalysis!.score) - 80}px`,
                    left: `${getX(activePoint.timestamp)}px`,
                    transform: 'translateX(-50%)',
                    minWidth: '200px'
                }}>
                    <p className="font-bold text-gray-800 dark:text-white">Wynik SEO: {activePoint.seoAnalysis!.score}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{activePoint.formData.topic.replace(/<[^>]*>?/gm, '')}</p>
                    <p className="text-gray-400 text-xs mt-1">{new Date(activePoint.timestamp).toLocaleString()}</p>
                </div>
            )}
        </div>
    );
};


const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};

const LockedState: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => (
    <div className="text-center py-20 px-6 bg-white dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <AlertTriangleIcon className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Funkcja dostępna w planie Pro</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Odblokuj zaawansowaną analitykę AI, aby otrzymywać spersonalizowane wskazówki i optymalizować swoją strategię contentową.
        </p>
        <button
            onClick={onUpgrade}
            className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 mx-auto"
        >
            <SparklesIcon className="w-5 h-5"/>
            Ulepsz do Pro
        </button>
    </div>
);


const EmptyState: React.FC<{ onRunAnalysis: () => void; hasHistory: boolean }> = ({ onRunAnalysis, hasHistory }) => (
  <div className="text-center py-20 px-6 bg-white dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
    <SparklesIcon className="w-16 h-16 mx-auto text-blue-400 mb-4" />
    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Zaawansowana analityka AI</h2>
    {hasHistory ? (
        <>
            <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                Połącz generowanie treści z rzeczywistymi wynikami. Nasza AI przeanalizuje wydajność Twoich postów i dostarczy kluczowych wskazówek do optymalizacji strategii.
            </p>
            <button
                onClick={onRunAnalysis}
                className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 mx-auto"
            >
                <SparklesIcon className="w-5 h-5"/>
                Uruchom analizę AI
            </button>
        </>
    ) : (
         <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Wygeneruj najpierw kilka postów. Kiedy będziesz mieć historię, nasza AI będzie mogła ją przeanalizować i dostarczyć cenne wskazówki.
        </p>
    )}
  </div>
);

const LoadingState: React.FC = () => (
    <div className="text-center py-20 px-6 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center">
        <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Analizowanie danych...</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">AI przetwarza wydajność Twoich postów, aby znaleźć kluczowe trendy i sugestie.</p>
    </div>
);

const transformData = (data: Record<string, number> | undefined) => {
    if (!data) return [];
    return Object.entries(data)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
};

export const AnalyticsView: React.FC = () => {
  const { userPlan } = useAuth();
    const { stats, history, learnedInsights, setLearnedInsights, setState } = useDataStore();
  const { setIsPricingModalOpen } = useUIStore();
  const { addToast } = useNotifications();

  const [analyzedHistory, setAnalyzedHistory] = useState<CampaignHistoryItem[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [optimalTimes, setOptimalTimes] = useState<OptimalTime[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState(new Set<string>());
  const { t } = useTranslation();

  const isAnalyticsEnabled = [UserPlan.Pro, UserPlan.Agency, UserPlan.Business].includes(userPlan);
  
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const historyWithPerformance = analyticsService.generateMockPerformanceData(history);
      const { insights: fetchedInsights, optimalTimes: fetchedTimes } = await analyticsService.fetchAIAnalysis(historyWithPerformance);
    setAnalyzedHistory(historyWithPerformance);
      setInsights(fetchedInsights);
      setOptimalTimes(fetchedTimes);
    setState({ history: historyWithPerformance }); // Update store with performance data
    } catch (error) {
      addToast(t('errors.analysis_failed'), NotificationType.Error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyInsights = (insightsToApply: AIInsight[]) => {
    setLearnedInsights(insightsToApply);
    addToast(t('insights.applied'), NotificationType.Success);
  };
  
  const handleClearInsights = () => {
    setLearnedInsights(null);
    addToast(t('insights.cleared'), NotificationType.Info);
  };

  const onUpgrade = () => setIsPricingModalOpen(true);

  const toggleExpand = (postId: string) => {
    setExpandedPosts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
            newSet.delete(postId);
        } else {
            newSet.add(postId);
        }
        return newSet;
    });
  };

  if (!isAnalyticsEnabled) return <LockedState onUpgrade={onUpgrade} />;
  if (isAnalyzing) return <LoadingState />;
  if (insights.length === 0) return <EmptyState onRunAnalysis={handleRunAnalysis} hasHistory={history.length > 0} />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <TrendingUpIcon className="w-6 h-6 text-blue-500" />
            Trendy SEO w czasie
        </h3>
        <SEOTrendChart data={analyzedHistory} />
      </div>

      {stats && stats.totalGenerations > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                <AnalyticsChart title="Wykorzystanie wg Platformy" data={transformData(stats.byPlatform)} fillColor="#3b82f6" />
            </div>
            <div className="p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                <AnalyticsChart title="Wykorzystanie wg Tonu" data={transformData(stats.byTone)} fillColor="#8b5cf6" />
            </div>
            <div className="lg:col-span-2 p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                 <AnalyticsChart title="Wykorzystanie wg Typu Treści" data={transformData(stats.byContentType)} fillColor="#10b981" />
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Insights & Times */}
        <div className="lg:col-span-1 space-y-8">
            {/* Insights */}
            <div className="p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <SparklesIcon className="w-6 h-6 text-blue-500" />
                    Wskazówki od AI
                </h3>
                <div className="space-y-3">
                    {insights.map(insight => {
                        const config = insightConfig[insight.type];
                        const Icon = config.icon;
                        return (
                            <div key={insight.id} className={`p-4 rounded-lg flex items-start gap-4 ${config.color}`}>
                                <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
                                <p className="text-sm text-gray-700 dark:text-gray-300">{insight.text}</p>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {learnedInsights ? (
                      <div className="text-center p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                          <p className="text-sm font-semibold text-green-800 dark:text-green-200">{t('insights.active')}</p>
                          <button onClick={handleClearInsights} className="mt-2 text-xs text-green-700 dark:text-green-300 hover:underline">{t('insights.clear')}</button>
                      </div>
                  ) : (
                      <button onClick={() => handleApplyInsights(insights)} className="w-full flex items-center justify-center gap-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 font-bold py-2.5 px-4 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition">
                          <SparklesIcon className="w-5 h-5" />
                          {t('insights.apply')}
                      </button>
                  )}
              </div>
            </div>

            {/* Optimal Times */}
            <div className="p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                 <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Optymalne czasy publikacji</h3>
                 <div className="space-y-3">
                    {optimalTimes.map(time => {
                         const config = platformConfig[time.platform];
                         const Icon = config.icon;
                         return (
                            <div key={time.platform} className="flex items-center gap-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <Icon className="w-8 h-8 text-gray-600 dark:text-gray-300" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-gray-800 dark:text-white">{config.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{time.day}</p>
                                </div>
                                <p className="font-semibold text-blue-600 dark:text-blue-400 text-sm">{time.time}</p>
                            </div>
                         );
                    })}
                 </div>
            </div>
        </div>

        {/* Right Column: Post Performance */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Wyniki postów</h3>
            <div className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-3">
                {analyzedHistory.map(item => {
                    const PlatformIcon = platformConfig[item.formData.platform].icon;
                    const isExpanded = expandedPosts.has(item.id);
                    return (
                        <div key={item.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-white truncate">{item.formData.topic.replace(/<[^>]*>?/gm, '')}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        <PlatformIcon className="w-4 h-4" />
                                        <span>{item.formData.platform}</span>
                                        <span className="text-gray-300 dark:text-gray-600">&bull;</span>
                                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-center">
                                {[
                                    { icon: EyeIcon, label: 'Zasięg', value: item.performance?.reach || 0 },
                                    { icon: HeartIcon, label: 'Polubienia', value: item.performance?.likes || 0 },
                                    { icon: ChatBubbleIcon, label: 'Komentarze', value: item.performance?.comments || 0 },
                                    { icon: ShareIcon, label: 'Udostępnienia', value: item.performance?.shares || 0 },
                                ].map(({ icon: Icon, label, value }) => (
                                     <div key={label}>
                                        <Icon className="w-5 h-5 mx-auto text-gray-400 dark:text-gray-500 mb-1" />
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(value)}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                                     </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => toggleExpand(item.id)}
                                    className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1"
                                >
                                    <span>{isExpanded ? 'Ukryj' : 'Pokaż'} analizę</span>
                                    <ArrowUpIcon className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-0' : 'rotate-180'}`} />
                                </button>
                                {isExpanded && (
                                    <div className="mt-4 space-y-4 animate-fade-in">
                                        <SentimentDisplay result={item.sentimentAnalysis} isLoading={false} />
                                        <SEOAnalysisDisplay result={item.seoAnalysis} isLoading={false} />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};