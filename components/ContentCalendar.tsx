import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScheduledPost,
  CalendarSuggestion,
  GenerationType,
  IntelligentCalendarPlanItem,
  Platform,
  NotificationType,
} from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { platformConfig } from '../config/platformConfig';
import { LayersIcon } from './icons/LayersIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { useDataStore } from '../stores/dataStore';
import { useAuth } from '../contexts/AuthContext';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useNotifications } from '../hooks/useNotifications';
import { generateCalendarSuggestions } from '../services/geminiService';
import { useTranslation } from 'react-i18next';
import { PreviewPopover } from './PreviewPopover';
import { XMarkIcon } from './icons/XMarkIcon';
import { CalendarFillToolbar } from './calendar/CalendarFillToolbar';
import { DayAuditPanel } from './calendar/DayAuditPanel';
import {
  auditCalendarDay,
  generateCadenceWeekPlan,
  generateMissingDaySlots,
  mergeCalendarPlans,
  slotTypeBadge,
  type CadencePresetId,
} from '../services/calendarCadenceService';
import {
  loadCalendarCadencePrefs,
  saveCalendarCadencePrefs,
} from '../utils/calendarCadencePrefs';
import {
  buildCalendarSlotContext,
  buildPrefillFromCalendarSlot,
} from '../services/calendarSlotService';
import { useGenerationStore } from '../stores/generationStore';
import {
  countDayGenerationGaps,
  listSlotsNeedingGeneration,
} from '../services/calendarDayBatchService';

const WEEK_DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

function formatCellDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameCalendarDay(tsOrDate: number | string, cellDate: Date): boolean {
  if (typeof tsOrDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(tsOrDate)) {
    return tsOrDate.startsWith(formatCellDate(cellDate));
  }
  const date1 = new Date(tsOrDate);
  return (
    date1.getFullYear() === cellDate.getFullYear() &&
    date1.getMonth() === cellDate.getMonth() &&
    date1.getDate() === cellDate.getDate()
  );
}

function auditScoreClass(score: number): string {
  if (score >= 80) return 'bg-emerald-500/90 text-white';
  if (score >= 50) return 'bg-amber-500/90 text-white';
  return 'bg-red-500/90 text-white';
}

const SuggestionModal: React.FC<{
  suggestions: CalendarSuggestion[];
  isLoading: boolean;
  onClose: () => void;
  onSelect: (suggestion: CalendarSuggestion) => void;
}> = ({ suggestions, isLoading, onClose, onSelect }) => (
  <div
    className="absolute inset-0 bg-black/45 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in"
    onClick={onClose}
  >
    <div
      className="glass-premium rounded-[2rem] border border-white/10 shadow-2xl p-6 w-full max-w-md relative overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Sugestie AI na ten dzień</h4>
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <svg className="animate-spin h-8 w-8 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1.5 custom-scrollbar">
          {suggestions.map((s, i) => (
            <div key={`suggestion-${i}`} className="p-4 bg-white/40 dark:bg-slate-950/20 rounded-2xl border border-slate-200/50 dark:border-white/5">
              <p className="font-bold text-sm text-slate-800 dark:text-white">{s.topic}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">&quot;{s.strategy}&quot;</p>
              <button
                type="button"
                onClick={() => onSelect(s)}
                className="mt-3 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                Użyj pomysłu
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export const ContentCalendar: React.FC = () => {
  const {
    scheduledPosts,
    history,
    intelligentCalendarPlan,
    clearIntelligentCalendarPlan,
    setIntelligentCalendarPlan,
  } = useDataStore();
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const handlers = useAppHandlers(() => {}, () => {});
  const navigate = useNavigate();
  const { t } = useTranslation();

  const savedPrefs = useMemo(() => loadCalendarCadencePrefs(), []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [presetId, setPresetId] = useState<CadencePresetId>(savedPrefs.presetId);
  const [weekTheme, setWeekTheme] = useState(savedPrefs.weekTheme);
  const [platform, setPlatform] = useState<Platform>(
    (Object.values(Platform).includes(savedPrefs.platform as Platform)
      ? savedPrefs.platform
      : Platform.Instagram) as Platform
  );
  const [isFilling, setIsFilling] = useState(false);
  const [isFillingDay, setIsFillingDay] = useState(false);
  const [isGeneratingDay, setIsGeneratingDay] = useState(false);

  const [suggestions, setSuggestions] = useState<CalendarSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionDate, setSuggestionDate] = useState<Date | null>(null);
  const [auditDate, setAuditDate] = useState<Date | null>(null);
  const [hoveredPost, setHoveredPost] = useState<{
    post: ScheduledPost;
    pos: { top: number; left: number };
  } | null>(null);

  const persistPrefs = useCallback(
    (patch: Partial<{ presetId: CadencePresetId; weekTheme: string; platform: Platform }>) => {
      const next = {
        presetId: patch.presetId ?? presetId,
        weekTheme: patch.weekTheme ?? weekTheme,
        platform: String(patch.platform ?? platform),
      };
      saveCalendarCadencePrefs(next);
    },
    [presetId, weekTheme, platform]
  );

  const changeMonth = (amount: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + amount);
      return newDate;
    });
  };

  const handleSuggest = async (date: Date) => {
    setSuggestionDate(date);
    setIsSuggesting(true);
    try {
      const historySummary = history
        .slice(0, 5)
        .map((h) => h.formData?.topic || '')
        .filter(Boolean)
        .join(', ');
      const niche = localStorage.getItem('userNiche') || 'marketing cyfrowy';
      if (!user) throw new Error('Musisz być zalogowany, aby użyć sugestii kalendarza.');
      const result = await generateCalendarSuggestions(date, niche, historySummary, user.id);
      setSuggestions(result);
    } catch (e: unknown) {
      addToast(
        e instanceof Error ? e.message : 'Błąd generowania sugestii kalendarza',
        NotificationType.Error
      );
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSelectSuggestion = (suggestion: CalendarSuggestion | IntelligentCalendarPlanItem) => {
    if ('id' in suggestion && suggestion.id) {
      handleGenerateForSlot(suggestion as IntelligentCalendarPlanItem, false);
      return;
    }
    navigate('/generator', {
      state: {
        prefillData: {
          topic: suggestion.topic || '',
          generationType: suggestion.format,
          platform: suggestion.platform,
        },
      },
    });
    setSuggestionDate(null);
  };

  const handleGenerateForSlot = (item: IntelligentCalendarPlanItem, autoGenerate = true) => {
    const calendarSlot = buildCalendarSlotContext(item);
    useGenerationStore.getState().setPendingCalendarSlot(calendarSlot);
    navigate('/generator', {
      state: {
        prefillData: buildPrefillFromCalendarSlot(item),
        calendarSlot,
        autoGenerateSlot: autoGenerate,
      },
    });
    setSuggestionDate(null);
  };

  const getWeekStart = (from: Date = new Date()): Date => {
    const d = new Date(from);
    const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const handleFillWeek = async () => {
    if (!user?.id || !weekTheme.trim()) {
      addToast(t('calendar.fill.themeRequired', 'Podaj temat tygodnia'), NotificationType.Error);
      return;
    }

    setIsFilling(true);
    try {
      const start = getWeekStart();
      const niche = localStorage.getItem('userNiche') || 'marketing cyfrowy';
      const previousTopics = (intelligentCalendarPlan || []).map((p) => p.topic);

      const newPlan = await generateCadenceWeekPlan(
        presetId,
        start,
        weekTheme.trim(),
        platform,
        niche,
        user.id,
        previousTopics
      );

      const merged = mergeCalendarPlans(intelligentCalendarPlan, newPlan);
      await setIntelligentCalendarPlan(merged);
      addToast(
        t('calendar.fill.success', 'Dodano {{count}} slotów do kalendarza', { count: newPlan.length }),
        NotificationType.Success
      );
    } catch (e: unknown) {
      addToast(
        e instanceof Error ? e.message : t('calendar.fill.error', 'Nie udało się wypełnić kalendarza'),
        NotificationType.Error
      );
    } finally {
      setIsFilling(false);
    }
  };

  const handleFillMissingDay = async () => {
    if (!user?.id || !auditDate) return;

    setIsFillingDay(true);
    try {
      const niche = localStorage.getItem('userNiche') || 'marketing cyfrowy';
      const missing = await generateMissingDaySlots(
        auditDate,
        presetId,
        intelligentCalendarPlan || [],
        weekTheme.trim() || 'Treść tygodnia',
        platform,
        niche,
        user.id
      );

      if (missing.length === 0) {
        addToast(t('calendar.audit.noMissing', 'Brak slotów do uzupełnienia'), NotificationType.Info);
        return;
      }

      const merged = mergeCalendarPlans(intelligentCalendarPlan, missing);
      await setIntelligentCalendarPlan(merged);
      addToast(
        t('calendar.audit.filled', 'Uzupełniono {{count}} slot(ów)', { count: missing.length }),
        NotificationType.Success
      );
      setAuditDate(null);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Błąd uzupełniania', NotificationType.Error);
    } finally {
      setIsFillingDay(false);
    }
  };

  const handleGenerateAllMissingDay = async () => {
    if (!user?.id || !auditDate) return;

    setIsGeneratingDay(true);
    try {
      const niche = localStorage.getItem('userNiche') || 'marketing cyfrowy';
      let plan = intelligentCalendarPlan || [];

      const missing = await generateMissingDaySlots(
        auditDate,
        presetId,
        plan,
        weekTheme.trim() || 'Treść tygodnia',
        platform,
        niche,
        user.id
      );

      if (missing.length > 0) {
        plan = mergeCalendarPlans(plan, missing);
        await setIntelligentCalendarPlan(plan);
      }

      const toGenerate = listSlotsNeedingGeneration(auditDate, plan, scheduledPosts);

      if (toGenerate.length === 0) {
        addToast(t('calendar.audit.noGenerate', 'Brak slotów do wygenerowania'), NotificationType.Info);
        return;
      }

      const [first, ...rest] = toGenerate;
      useGenerationStore.getState().setCalendarBatchQueue(rest, toGenerate.length);

      addToast(
        t('calendar.audit.generateAllStarted', 'Generuję {{count}} slot(ów)…', { count: toGenerate.length }),
        NotificationType.Info
      );

      setAuditDate(null);
      handleGenerateForSlot(first, true);
    } catch (e: unknown) {
      useGenerationStore.getState().clearCalendarBatch();
      addToast(
        e instanceof Error ? e.message : t('calendar.audit.generateAllError', 'Błąd generowania dnia'),
        NotificationType.Error
      );
    } finally {
      setIsGeneratingDay(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const handleDragStart = (e: React.DragEvent, id: string, type: 'post' | 'plan') => {
    e.dataTransfer.setData(type === 'post' ? 'postId' : 'planItemId', id);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('opacity-50', 'scale-95');
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('opacity-50', 'scale-95');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData('postId');
    const planItemId = e.dataTransfer.getData('planItemId');

    if (postId) {
      const post = scheduledPosts.find((p) => p.id === postId);
      if (!post) return;

      const currentTs = new Date(post.scheduleTimestamp);
      const newTs = new Date(targetDate);
      newTs.setHours(currentTs.getHours());
      newTs.setMinutes(currentTs.getMinutes());
      newTs.setSeconds(0);
      newTs.setMilliseconds(0);

      await useDataStore.getState().addOrUpdateScheduledPost({
        ...post,
        scheduleTimestamp: newTs.getTime(),
      });
    } else if (planItemId) {
      const formattedDate = formatCellDate(targetDate);
      useDataStore.getState().updateIntelligentCalendarPlanItemDate(planItemId, formattedDate);
    }
  };

  const activeAudit = auditDate
    ? auditCalendarDay(auditDate, presetId, intelligentCalendarPlan || [], scheduledPosts)
    : null;

  const renderCalendarDays = () => {
    const days = [];
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="border border-slate-200/40 dark:border-white/5 rounded-2xl bg-slate-50/20 dark:bg-slate-900/10"
        />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const postsForDay = scheduledPosts
        .filter((p) => isSameCalendarDay(p.scheduleTimestamp, date))
        .sort((a, b) => a.scheduleTimestamp - b.scheduleTimestamp);
      const planItemsForDay =
        intelligentCalendarPlan?.filter((p) => isSameCalendarDay(p.date, date)) || [];
      const dayAudit = auditCalendarDay(date, presetId, intelligentCalendarPlan || [], scheduledPosts);
      const hasContent = postsForDay.length > 0 || planItemsForDay.length > 0;

      days.push(
        <div
          key={day}
          className="group/day relative border border-slate-200/50 dark:border-white/5 rounded-2xl p-2.5 min-h-[145px] flex flex-col bg-white/40 dark:bg-slate-950/20 hover:bg-white dark:hover:bg-slate-900/40 hover:border-cyan-500/35 transition-all duration-300 shadow-sm"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, date)}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-350">{day}</span>
            {dayAudit.slotsTarget.post + dayAudit.slotsTarget.reel + dayAudit.slotsTarget.story > 0 && (
              <button
                type="button"
                onClick={() => setAuditDate(date)}
                className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${auditScoreClass(dayAudit.score)} hover:scale-105 transition-transform`}
                title={t('calendar.audit.open', 'Audyt dnia')}
              >
                {dayAudit.score}
              </button>
            )}
          </div>

          <div className="flex-grow space-y-2 mt-2 overflow-y-auto pr-0.5 custom-scrollbar">
            {postsForDay.map((post) => {
              const postPlatform = post.formData?.platform || Platform.Facebook;
              const config = platformConfig[postPlatform] || platformConfig[Platform.Facebook];
              const Icon = config.icon;
              return (
                <div
                  key={post.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, post.id, 'post')}
                  onDragEnd={handleDragEnd}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredPost({ post, pos: { top: rect.top, left: rect.right + 10 } });
                  }}
                  onMouseLeave={() => setHoveredPost(null)}
                  className="group/post relative p-2 rounded-xl bg-slate-100/80 dark:bg-white/5 border-l-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all border border-slate-200/50 dark:border-white/5"
                  onClick={() => handlers.handleEditScheduledPost(post)}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${config.iconColor}`} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold truncate text-slate-850 dark:text-white uppercase tracking-tighter">
                        {post.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                      </p>
                      <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase">
                        <CalendarIcon className="w-2.5 h-2.5" />
                        <span>
                          {new Date(post.scheduleTimestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {planItemsForDay
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
              .map((item) => {
                const config = platformConfig[item.platform] || platformConfig[Platform.Facebook];
                const Icon = config.icon;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id, 'plan')}
                    onDragEnd={handleDragEnd}
                    className="group/slot w-full text-left relative p-2 rounded-xl bg-transparent border border-dashed border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/5 cursor-grab active:cursor-grabbing transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] shrink-0">{slotTypeBadge(item.slotType)}</span>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0 text-cyan-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold truncate text-slate-855 dark:text-white uppercase tracking-tighter">
                          {item.topic}
                        </p>
                        <p className="text-[8px] font-black uppercase text-cyan-500/70">
                          {item.time ? `${item.time} · ` : ''}
                          {t('calendar.suggestion')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-1.5 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover/slot:opacity-100 sm:group-focus-within/slot:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateForSlot(item, false);
                        }}
                        className="flex-1 text-[8px] font-bold uppercase tracking-wide px-1.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 hover:border-cyan-500 text-slate-600 dark:text-slate-300"
                      >
                        {t('calendar.slot.edit', 'Edytuj')}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateForSlot(item, true);
                        }}
                        className="flex-1 text-[8px] font-bold uppercase tracking-wide px-1.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-0.5"
                      >
                        <SparklesIcon className="w-2.5 h-2.5" />
                        {t('calendar.slot.generate', 'Generuj')}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {!hasContent && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/day:opacity-100 transition-opacity pointer-events-none z-10">
              <button
                type="button"
                onClick={() => handleSuggest(date)}
                className="pointer-events-auto flex items-center gap-1 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-full text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-cyan-500 hover:text-cyan-500 shadow-md transition-all"
              >
                <SparklesIcon className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                AI Ideas
              </button>
            </div>
          )}

          {suggestionDate && isSameCalendarDay(formatCellDate(suggestionDate), date) && (
            <SuggestionModal
              suggestions={suggestions}
              isLoading={isSuggesting}
              onClose={() => setSuggestionDate(null)}
              onSelect={handleSelectSuggestion}
            />
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="glass-premium rounded-[2.5rem] border border-white/10 shadow-2xl p-6 md:p-8 animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[40%] h-56 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none" />

      <CalendarFillToolbar
        presetId={presetId}
        weekTheme={weekTheme}
        platform={platform}
        isFilling={isFilling}
        onPresetChange={(id) => {
          setPresetId(id);
          persistPrefs({ presetId: id });
        }}
        onThemeChange={(theme) => {
          setWeekTheme(theme);
          persistPrefs({ weekTheme: theme });
        }}
        onPlatformChange={(p) => {
          setPlatform(p);
          persistPrefs({ platform: p });
        }}
        onFillWeek={handleFillWeek}
      />

      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4 relative z-10">
        <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-sans">
          {currentDate.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-4">
          {intelligentCalendarPlan && (
            <button
              type="button"
              onClick={clearIntelligentCalendarPlan}
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1.5"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              {t('calendar.clearStrategicPlan')}
            </button>
          )}
          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-2 rounded-xl bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/5 text-slate-500 transition"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-2 rounded-xl bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/5 text-slate-500 transition"
            >
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-2 px-2 pb-2 relative z-10">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-7 gap-2.5 text-center text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-3">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2.5">{renderCalendarDays()}</div>
        </div>
      </div>

      {scheduledPosts.length === 0 && !intelligentCalendarPlan && (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500 relative z-10 border border-dashed border-slate-250 dark:border-white/5 rounded-3xl mt-6">
          <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-cyan-500/60" />
          <h3 className="text-lg font-black text-slate-800 dark:text-gray-200 uppercase tracking-tight">
            {t('calendar.empty.title', 'Kalendarz jest pusty')}
          </h3>
          <p className="mt-2 text-xs max-w-md mx-auto leading-relaxed">
            {t(
              'calendar.empty.hint',
              'Użyj „Wypełnij tydzień” powyżej lub kliknij AI Ideas na wybranym dniu.'
            )}
          </p>
        </div>
      )}

      {activeAudit && auditDate && (
        <DayAuditPanel
          audit={activeAudit}
          dateLabel={auditDate.toLocaleDateString('pl-PL', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
          generateGapCount={countDayGenerationGaps(
            auditDate,
            intelligentCalendarPlan,
            scheduledPosts
          )}
          onClose={() => setAuditDate(null)}
          onFillMissing={handleFillMissingDay}
          onGenerateAll={handleGenerateAllMissingDay}
          isFilling={isFillingDay}
          isGenerating={isGeneratingDay}
        />
      )}

      {hoveredPost && (
        <PreviewPopover
          result={hoveredPost.post.result}
          formData={hoveredPost.post.formData}
          position={hoveredPost.pos}
        />
      )}
    </div>
  );
};
