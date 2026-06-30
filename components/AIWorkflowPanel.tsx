import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  generateWeekContent,
  generateFullPostContent,
  WeekContentPlan,
  DailyPost,
  saveWeekPlan,
  getSavedWeekPlans,
  suggestWeekThemes,
} from '../services/autoContentPipeline';
import {
  analyzeComment,
  ReplySuggestion,
} from '../services/smartReplyAssistant';
import {
  predictEngagement,
  EngagementPrediction,
  comparePosts,
  ContentComparison,
} from '../services/engagementPrediction';
import { Platform, ContentType, Tone, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { SparklesIcon } from './icons/SparklesIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ClockIcon } from './icons/ClockIcon';
import { TargetIcon } from './icons/TargetIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';

interface AIWorkflowPanelProps {
  niche: string;
  platform: Platform;
  contentType: ContentType;
  tone: Tone;
  currentPostText?: string;
  brandVoice?: string;
}

const WORKFLOW_TABS = {
  PIPELINE: 'pipeline',
  REPLIES: 'replies',
  PREDICTION: 'prediction',
} as const;

export const AIWorkflowPanel: React.FC<AIWorkflowPanelProps> = ({
  niche,
  platform,
  contentType,
  tone,
  currentPostText,
  brandVoice,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();

  type WorkflowTab = typeof WORKFLOW_TABS[keyof typeof WORKFLOW_TABS];
  const [activeTab, setActiveTab] = useState<WorkflowTab>(WORKFLOW_TABS.PREDICTION);
  
  // Pipeline state
  const [weekPlan, setWeekPlan] = useState<WeekContentPlan | null>(null);
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false);
  const [weekTheme, setWeekTheme] = useState('');
  const [themeSuggestions, setThemeSuggestions] = useState<string[]>([]);
  const [isSuggestingThemes, setIsSuggestingThemes] = useState(false);
  const [savedPlans, setSavedPlans] = useState<(WeekContentPlan & { savedAt: string })[]>([]);
  const [generatingPostIndex, setGeneratingPostIndex] = useState<number | null>(null);

  // Reply state
  const [commentText, setCommentText] = useState('');
  const [replySuggestion, setReplySuggestion] = useState<ReplySuggestion | null>(null);
  const [isAnalyzingReply, setIsAnalyzingReply] = useState(false);

  // Prediction state
  const [prediction, setPrediction] = useState<EngagementPrediction | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [comparison, setComparison] = useState<ContentComparison | null>(null);
  const predictTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load saved plans on mount
  useEffect(() => {
    setSavedPlans(getSavedWeekPlans());
  }, []);

  // Auto-predict current post (debounced, min 100 chars)
  useEffect(() => {
    if (predictTimeoutRef.current) clearTimeout(predictTimeoutRef.current);
    if (currentPostText && currentPostText.length >= 100 && user?.id) {
      predictTimeoutRef.current = setTimeout(() => {
        handlePredictEngagement(currentPostText);
      }, 1500);
    }
    return () => {
      if (predictTimeoutRef.current) clearTimeout(predictTimeoutRef.current);
    };
  }, [currentPostText, user?.id, platform, niche]);

  // Pipeline handlers
  const handleGenerateWeek = useCallback(async () => {
    if (!user?.id) return;
    if (!weekTheme.trim()) {
      notifications.addToast('Podaj temat tygodnia', NotificationType.Error);
      return;
    }

    setIsGeneratingWeek(true);
    try {
      const plan = await generateWeekContent(
        niche,
        platform,
        [contentType],
        tone,
        weekTheme,
        user.id,
        savedPlans.flatMap(p => p.posts.map(post => post.topic)),
        brandVoice
      );
      setWeekPlan(plan);
      notifications.addToast(`Wygenerowano plan na ${plan.posts.length} dni!`, NotificationType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd generowania planu';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsGeneratingWeek(false);
    }
  }, [niche, platform, contentType, tone, weekTheme, user, savedPlans, brandVoice, notifications]);

  const handleSuggestThemes = useCallback(async () => {
    if (!user?.id) return;
    setIsSuggestingThemes(true);
    try {
      const suggestions = await suggestWeekThemes(niche, user.id);
      if (suggestions.length > 0) {
        setThemeSuggestions(suggestions);
        notifications.addToast('Wygenerowano sugestie tematów!', NotificationType.Success);
      } else {
        notifications.addToast('Brak sugestii, spróbuj ponownie.', NotificationType.Info);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd generowania sugestii';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsSuggestingThemes(false);
    }
  }, [niche, user, notifications]);

  const handleSaveWeekPlan = useCallback(() => {
    if (weekPlan) {
      saveWeekPlan(weekPlan);
      setSavedPlans(getSavedWeekPlans());
      notifications.addToast('Plan zapisany!', NotificationType.Success);
    }
  }, [weekPlan, notifications]);

  const handleGenerateFullPost = useCallback(async (post: DailyPost, index: number) => {
    if (!user?.id) return;

    setGeneratingPostIndex(index);
    try {
      const fullPost = await generateFullPostContent(
        post,
        brandVoice || '',
        platform,
        user.id
      );
      
      // Update the week plan with generated content
      if (weekPlan) {
        const updatedPosts = [...weekPlan.posts];
        updatedPosts[index] = fullPost;
        setWeekPlan({ ...weekPlan, posts: updatedPosts });
      }
      
      notifications.addToast('Post wygenerowany!', NotificationType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd generowania posta';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setGeneratingPostIndex(null);
    }
  }, [weekPlan, platform, user, notifications]);

  // Reply handlers
  const handleAnalyzeComment = useCallback(async () => {
    if (!user?.id || !commentText.trim()) return;

    setIsAnalyzingReply(true);
    try {
      const suggestion = await analyzeComment(
        commentText,
        currentPostText || '',
        '',
        user.id
      );
      setReplySuggestion(suggestion);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd analizy komentarza';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsAnalyzingReply(false);
    }
  }, [commentText, currentPostText, user, notifications]);

  // Prediction handlers
  const handlePredictEngagement = useCallback(async (text: string) => {
    if (!user?.id) return;

    setIsPredicting(true);
    try {
      const result = await predictEngagement(
        text,
        '', // image description
        platform,
        niche,
        new Date().toISOString(),
        user.id
      );
      if (isMountedRef.current) setPrediction(result);
    } catch (error: unknown) {
      if (isMountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Błąd predykcji engagement';
        notifications.addToast(errorMessage, NotificationType.Error);
      }
    } finally {
      if (isMountedRef.current) setIsPredicting(false);
    }
  }, [platform, niche, user, notifications]);

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              AI Workflow Automation
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Automatyzacja i predykcja treści
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: WORKFLOW_TABS.PREDICTION, label: 'Predykcja', icon: TrendingUpIcon, badge: prediction ? '✓' : null },
          { id: WORKFLOW_TABS.PIPELINE, label: 'Pipeline', icon: CalendarIcon },
          { id: WORKFLOW_TABS.REPLIES, label: 'Odpowiedzi', icon: ChatBubbleIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && (
              <span className="ml-1 text-xs bg-green-400 text-white px-1.5 rounded">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Prediction Tab */}
      {activeTab === WORKFLOW_TABS.PREDICTION && (
        <div className="space-y-6">
          {isPredicting && !prediction ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-purple-200 dark:border-purple-900 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-slate-600 dark:text-slate-400">
                AI analizuje potencjał zaangażowania...
              </p>
            </div>
          ) : prediction ? (
            <div className="space-y-4">
              {/* Overall Score */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-purple-900 dark:text-purple-200">
                    Predykcja Zaangażowania
                  </h3>
                  <span className={`text-4xl font-black ${getScoreColor(prediction.overallScore)}`}>
                    {prediction.overallScore}/10
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {prediction.predictedMetrics.likes}
                    </div>
                    <div className="text-xs text-slate-500">Polubień</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {prediction.predictedMetrics.comments}
                    </div>
                    <div className="text-xs text-slate-500">Komentarzy</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {prediction.predictedMetrics.engagementRate}%
                    </div>
                    <div className="text-xs text-slate-500">Engagement Rate</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600">Pewność:</span>
                  <span className={`px-2 py-1 rounded font-medium ${
                    prediction.confidence === 'high' ? 'bg-green-100 text-green-700' :
                    prediction.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {prediction.confidence === 'high' ? 'Wysoka' : prediction.confidence === 'medium' ? 'Średnia' : 'Niska'}
                  </span>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <h4 className="font-bold text-green-900 dark:text-green-200 mb-3 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    Mocne strony
                  </h4>
                  <ul className="space-y-2">
                    {prediction.strengths.map((s, i) => (
                      <li key={`strength-${i}`} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <h4 className="font-bold text-red-900 dark:text-red-200 mb-3 flex items-center gap-2">
                    <TargetIcon className="w-5 h-5" />
                    Do poprawy
                  </h4>
                  <ul className="space-y-2">
                    {prediction.weaknesses.map((w, i) => (
                      <li key={`weakness-${i}`} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Viral Potential */}
              <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                <h4 className="font-bold text-orange-900 dark:text-orange-200 mb-2 flex items-center gap-2">
                  <TrendingUpIcon className="w-5 h-5" />
                  Potencjał Viralny: {prediction.viralPotential.score}/100
                </h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {prediction.viralPotential.triggers.map((trigger, i) => (
                    <span key={`trigger-${i}`} className="px-2 py-1 bg-white dark:bg-slate-800 text-orange-700 dark:text-orange-300 text-sm rounded-lg">
                      🔥 {trigger}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  Peak viral: {prediction.viralPotential.timeline}
                </p>
              </div>

              {/* Suggestions */}
              {prediction.improvementSuggestions.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-3">
                    💡 Sugestie ulepszeń
                  </h4>
                  <ul className="space-y-2">
                    {prediction.improvementSuggestions.map((s, i) => (
                      <li key={`suggestion-${i}`} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                        <ArrowRightIcon className="w-4 h-4 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUpIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 dark:text-slate-400">
                Wpisz tekst posta aby zobaczyć predykcję zaangażowania
              </p>
              <p className="text-sm text-slate-400 mt-2">
                AI przewidzi: polubienia, komentarze, shares, viral potential
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Tab */}
      {activeTab === WORKFLOW_TABS.PIPELINE && (
        <div className="space-y-6">
          {/* Week Theme Input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={weekTheme}
                onChange={(e) => setWeekTheme(e.target.value)}
                placeholder="Temat tygodnia (np: 'Produktywność', 'Marketing Trends')"
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <button
                onClick={handleSuggestThemes}
                disabled={isSuggestingThemes}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-all flex items-center gap-2"
              >
                {isSuggestingThemes ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LightbulbIcon className="w-4 h-4" />
                )}
                Sugeruj
              </button>
              <button
                onClick={handleGenerateWeek}
                disabled={isGeneratingWeek}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 text-white font-medium rounded-xl transition-all flex items-center gap-2"
              >
                {isGeneratingWeek ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CalendarIcon className="w-4 h-4" />
                )}
                Generuj tydzień
              </button>
            </div>

            {themeSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {themeSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setWeekTheme(suggestion);
                      setThemeSuggestions([]);
                    }}
                    className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-lg border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-800/40 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isGeneratingWeek && !weekPlan ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-purple-200 dark:border-purple-900 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-slate-600 dark:text-slate-400">
                AI planuje cały tydzień treści...
              </p>
            </div>
          ) : weekPlan ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  📅 Plan: {weekPlan.theme}
                </h3>
                <button
                  onClick={handleSaveWeekPlan}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Zapisz plan
                </button>
              </div>

              {weekPlan.posts.map((post, index) => (
                <div
                  key={`post-${index}`}
                  className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
                          {post.day}
                        </span>
                        <span className="text-sm text-slate-500">{post.optimalTime}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        {post.topic}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {post.angle}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-700">
                        Score: {post.estimatedEngagement}/10
                      </div>
                      <div className="text-xs text-slate-500">
                        {post.format}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400 italic mb-3">
                    "{post.hook}"
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {post.hashtags.map((tag, i) => (
                      <span key={`post-tag-${tag}`} className="text-xs text-slate-500">#{tag}</span>
                    ))}
                  </div>

                  {post.generatedContent ? (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg mb-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
                        {post.generatedContent.postText}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerateFullPost(post, index)}
                      disabled={generatingPostIndex === index}
                      className="w-full py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg text-sm font-medium transition-colors"
                    >
                      {generatingPostIndex === index ? 'Generuję...' : 'Generuj pełną treść'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : savedPlans.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Zapisane plany:</h3>
              {savedPlans.map((plan, i) => (
                <div
                  key={`saved-plan-${i}`}
                  onClick={() => setWeekPlan(plan)}
                  className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {plan.theme}
                    </span>
                    <span className="text-sm text-slate-500">
                      {plan.posts.length} postów
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Zapisano: {new Date(plan.savedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 dark:text-slate-400">
                Wpisz temat tygodnia aby wygenerować plan treści
              </p>
            </div>
          )}
        </div>
      )}

      {/* Replies Tab */}
      {activeTab === WORKFLOW_TABS.REPLIES && (
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Komentarz do analizy:
            </label>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Wklej komentarz, na który chcesz odpowiedzieć..."
              className="w-full h-24 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <button
              onClick={handleAnalyzeComment}
              disabled={isAnalyzingReply || !commentText.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isAnalyzingReply ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ChatBubbleIcon className="w-4 h-4" />
              )}
              {isAnalyzingReply ? 'Analizuję...' : 'Generuj sugestie odpowiedzi'}
            </button>
          </div>

          {replySuggestion && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Analiza komentarza:
                </p>
                <p className="text-slate-900 dark:text-white">"{replySuggestion.originalComment}"</p>
              </div>

              <div className="space-y-3">
                {replySuggestion.replyOptions.map((option) => (
                  <div
                    key={option.id}
                    className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        option.length === 'short' ? 'bg-green-100 text-green-700' :
                        option.length === 'long' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {option.length === 'short' ? 'Krótka' : option.length === 'long' ? 'Długa' : 'Średnia'}
                      </span>
                      <span className="text-xs text-slate-500">
                        Pewność: {option.appropriatenessScore}/10
                      </span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 mb-3">
                      {option.text}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(option.text);
                        notifications.addToast('Odpowiedź skopiowana!', NotificationType.Success);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      <ClipboardIcon className="w-4 h-4" />
                      Kopiuj
                    </button>
                  </div>
                ))}
              </div>

              {replySuggestion.engagementOpportunity && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    💡 <strong>Szansa na zaangażowanie:</strong> {replySuggestion.engagementOpportunity}
                  </p>
                </div>
              )}

              {replySuggestion.warning && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    ⚠️ <strong>Uwaga:</strong> {replySuggestion.warning}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIWorkflowPanel;
