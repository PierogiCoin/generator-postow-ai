import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  analyzeOptimalPostingTimes,
  getBestTimeToPostNow,
  OptimalTimeSlot,
  WeeklySchedule,
  cacheScheduleAnalysis,
  getCachedScheduleAnalysis,
} from '../services/scheduleOptimizationService';
import { Platform, ContentType, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { ClockIcon } from './icons/ClockIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { TargetIcon } from './icons/TargetIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { RefreshCwIcon } from './icons/RefreshCwIcon';
import { StarIcon } from './icons/StarIcon';

interface ScheduleOptimizerProps {
  niche: string;
  platform: Platform;
  contentType: ContentType;
  onSelectTime: (day: string, time: string) => void;
}

const DAY_NAMES: Record<string, string> = {
  'Monday': 'Poniedziałek',
  'Tuesday': 'Wtorek',
  'Wednesday': 'Środa',
  'Thursday': 'Czwartek',
  'Friday': 'Piątek',
  'Saturday': 'Sobota',
  'Sunday': 'Niedziela',
};

const CONFIDENCE_COLORS = {
  high: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  low: 'bg-red-100 text-red-700 border-red-300',
};

const SCORE_COLORS: Record<number, string> = {
  10: 'from-green-500 to-emerald-500',
  9: 'from-green-500 to-emerald-500',
  8: 'from-blue-500 to-cyan-500',
  7: 'from-blue-500 to-indigo-500',
  6: 'from-indigo-500 to-purple-500',
  5: 'from-purple-500 to-pink-500',
  4: 'from-pink-500 to-rose-500',
  3: 'from-rose-500 to-red-500',
  2: 'from-red-500 to-red-600',
  1: 'from-red-600 to-red-700',
};

export const ScheduleOptimizer: React.FC<ScheduleOptimizerProps> = ({
  niche,
  platform,
  contentType,
  onSelectTime,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();

  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [bestTimeNow, setBestTimeNow] = useState<OptimalTimeSlot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBestNow, setIsLoadingBestNow] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('optimal');
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Load cached data on mount
  useEffect(() => {
    if (niche) {
      const cached = getCachedScheduleAnalysis(niche, platform);
      if (cached) {
        setSchedule(cached);
      }
    }
  }, [niche, platform]);

  const handleAnalyze = useCallback(async () => {
    if (!user?.id) {
      notifications.addToast('Musisz być zalogowany', NotificationType.Error);
      return;
    }

    if (!niche.trim()) {
      notifications.addToast('Podaj niszę aby przeanalizować czasy', NotificationType.Error);
      return;
    }

    setIsLoading(true);
    try {
      const result = await analyzeOptimalPostingTimes(
        niche,
        platform,
        contentType,
        timezone,
        user.id
      );

      setSchedule(result);
      cacheScheduleAnalysis(niche, platform, result);
      notifications.addToast(`Znaleziono ${result.optimalSlots.length} optymalnych slotów!`, NotificationType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd analizy harmonogramu';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [niche, platform, contentType, timezone, user, notifications]);

  const handleGetBestNow = useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingBestNow(true);
    try {
      const result = await getBestTimeToPostNow(
        niche,
        platform,
        contentType,
        timezone,
        user.id
      );

      if (result) {
        setBestTimeNow(result);
        setActiveTab('now');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd analizy najlepszego czasu';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsLoadingBestNow(false);
    }
  }, [niche, platform, contentType, timezone, user]);

  const handleSelectSlot = useCallback((slot: OptimalTimeSlot) => {
    setSelectedSlot(`${slot.day}-${slot.time}`);
    onSelectTime(slot.day, slot.time);
    notifications.addToast(
      `Wybrano: ${DAY_NAMES[slot.day] || slot.day} ${slot.time} (Score: ${slot.score}/10)`,
      NotificationType.Success
    );
  }, [onSelectTime, notifications]);

  const getScoreColor = (score: number) => {
    return SCORE_COLORS[Math.max(1, Math.min(10, Math.round(score)))] || SCORE_COLORS[5];
  };

  const formatEngagement = (rate: number) => {
    if (rate >= 6) return { color: 'text-green-600', label: 'Wysoka' };
    if (rate >= 4) return { color: 'text-amber-600', label: 'Dobra' };
    return { color: 'text-slate-500', label: 'Średnia' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
            <ClockIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Auto-Schedule Optimization
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nisza: <span className="font-medium text-amber-600">{niche || 'Wpisz niszę'}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm border-none outline-none"
          >
            <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </option>
            <option value="Europe/Warsaw">Europe/Warsaw</option>
            <option value="Europe/London">Europe/London</option>
            <option value="America/New_York">America/New_York</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
          </select>
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <SparklesIcon className="w-4 h-4" />
            )}
            {isLoading ? 'Analizuję...' : 'Analizuj'}
          </button>
        </div>
      </div>

      {/* Quick Action: Best Time Now */}
      <button
        onClick={handleGetBestNow}
        disabled={isLoadingBestNow || !niche}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-green-500/20"
      >
        {isLoadingBestNow ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <StarIcon className="w-5 h-5" />
        )}
        {isLoadingBestNow ? 'Szukam...' : '🔥 Znajdź NAJLEPSZY czas TERAZ'}
      </button>

      {isLoading && !schedule ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-12 h-12 border-4 border-amber-200 dark:border-amber-900 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-slate-600 dark:text-slate-400">
            AI analizuje aktywność Twojej grupy docelowej...
          </p>
          <p className="text-sm text-slate-400">
            Sprawdzam: algorytm platformy, konkurencję, sezonowość
          </p>
        </div>
      ) : schedule ? (
        <>
          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'optimal', label: 'Optymalne Sloty', icon: TargetIcon },
              { id: 'now', label: 'Najlepszy Teraz', icon: StarIcon },
              { id: 'weekly', label: 'Tygodniowy Plan', icon: CalendarIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Optimal Slots Tab */}
          {activeTab === 'optimal' && (
            <div className="space-y-4">
              {schedule.optimalSlots.map((slot, index) => {
                const engagement = formatEngagement(slot.predictedEngagement);
                const isSelected = selectedSlot === `${slot.day}-${slot.time}`;
                
                return (
                  <div
                    key={`${slot.day}-${slot.time}`}
                    onClick={() => handleSelectSlot(slot)}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-amber-300'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${getScoreColor(slot.score)} flex items-center justify-center text-white font-bold`}>
                          {slot.score}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            {DAY_NAMES[slot.day] || slot.day} {slot.time}
                          </h3>
                          <div className="flex items-center gap-2 text-sm">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${CONFIDENCE_COLORS[slot.confidence]}`}>
                              {slot.confidence === 'high' ? '✓ Wysoka pewność' : slot.confidence === 'medium' ? '~ Średnia' : '? Niska'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${engagement.color}`}>
                          {engagement.label} zaangażowanie
                        </div>
                        <div className="text-xs text-slate-500">
                          ~{Math.round(slot.predictedReach).toLocaleString()} zasięg
                        </div>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {slot.reasoning}
                    </p>

                    {/* Factors */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
                        <div className="text-xs text-slate-500">Aktywność</div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">{slot.factors.audienceActivity}/10</div>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
                        <div className="text-xs text-slate-500">Konkurencja</div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">{slot.factors.competitionLevel}/10</div>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
                        <div className="text-xs text-slate-500">Algorytm</div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">{slot.factors.algorithmFavorability}/10</div>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
                        <div className="text-xs text-slate-500">Treść</div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">{slot.factors.contentTypeMatch}/10</div>
                      </div>
                    </div>

                    {/* Alternatives */}
                    {slot.alternatives.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">Alternatywy:</span>
                        {slot.alternatives.map((alt, i) => (
                          <button
                            key={`alt-${i}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTime(slot.day, alt);
                            }}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                          >
                            {alt}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Action */}
                    <div className="mt-4">
                      <button
                        className={`w-full py-2.5 rounded-xl font-medium transition-all ${
                          isSelected
                            ? 'bg-green-500 text-white'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        {isSelected ? (
                          <span className="flex items-center justify-center gap-2">
                            <CheckCircleIcon className="w-4 h-4" />
                            Wybrano!
                          </span>
                        ) : (
                          'Wybierz ten slot'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Best Time Now Tab */}
          {activeTab === 'now' && bestTimeNow && (
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-green-300 dark:border-green-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500 rounded-xl">
                  <StarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-green-900 dark:text-green-200 text-lg">
                    Najlepszy czas TERAZ
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    AI analizuje bieżące warunki w czasie rzeczywistym
                  </p>
                </div>
              </div>

              <div className="text-center py-6">
                <div className="text-5xl font-black text-green-600 dark:text-green-400 mb-2">
                  {DAY_NAMES[bestTimeNow.day] || bestTimeNow.day}
                </div>
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                  {bestTimeNow.time}
                </div>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-200 dark:bg-green-800 rounded-full">
                  <TrendingUpIcon className="w-4 h-4 text-green-800 dark:text-green-200" />
                  <span className="font-bold text-green-800 dark:text-green-200">
                    Score: {bestTimeNow.score}/10
                  </span>
                </div>
              </div>

              <p className="text-center text-green-800 dark:text-green-200 mb-6">
                {bestTimeNow.reasoning}
              </p>

              <button
                onClick={() => handleSelectSlot(bestTimeNow)}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all"
              >
                Zapisz na ten czas →
              </button>
            </div>
          )}

          {/* Weekly Plan Tab */}
          {activeTab === 'weekly' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Godziny szczytowe aktywności
                </h3>
                <div className="flex flex-wrap gap-2">
                  {schedule.peakActivityHours.map((time, i) => (
                    <span key={`time-${time}`} className="px-3 py-1 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-medium rounded-lg">
                      {time}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                  Off-peak (mniejsza konkurencja)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {schedule.offPeakHours.map((time, i) => (
                    <span key={`offpeak-${time}`} className="px-3 py-1 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">
                      {time}
                    </span>
                  ))}
                </div>
              </div>

              {schedule.worstTimes.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <h3 className="font-bold text-red-900 dark:text-red-200 mb-2 flex items-center gap-2">
                    <AlertTriangleIcon className="w-5 h-5" />
                    Czasów do unikania
                  </h3>
                  <ul className="space-y-1">
                    {schedule.worstTimes.map((time, i) => (
                      <li key={`worst-${i}`} className="text-red-700 dark:text-red-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {time}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {schedule.seasonalNotes && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-2">
                    🗓️ Uwagi sezonowe
                  </h3>
                  <p className="text-amber-800 dark:text-amber-300">
                    {schedule.seasonalNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <ClockIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Kliknij "Analizuj" aby znaleźć najlepsze czasy publikacji
          </p>
          <p className="text-sm text-slate-400">
            AI przeanalizuje aktywność Twojej grupy docelowej, konkurencję i algorytm platformy
          </p>
        </div>
      )}
    </div>
  );
};

export default ScheduleOptimizer;
