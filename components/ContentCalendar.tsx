import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import { useDataStore } from '../stores/dataStore';
import { useAuth } from '../contexts/AuthContext';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useNotifications } from '../hooks/useNotifications';
import { generateCalendarSuggestions } from '../services/geminiService';
import { useTranslation } from 'react-i18next';
import { PreviewPopover } from './PreviewPopover';
import { XMarkIcon } from './icons/XMarkIcon';
import { CalendarFillToolbar } from './calendar/CalendarFillToolbar';
import { DayDetailDrawer } from './calendar/DayDetailDrawer';
import { BulkQueuePublisherModal } from './calendar/BulkQueuePublisherModal';
import { postsInDateRange } from '../services/bulkQueuePublisherService';
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
  buildPlanItemFromSuggestion,
  navigateToCalendarSlot,
} from '../services/calendarSlotService';
import { useGenerationStore } from '../stores/generationStore';
import {
  countDayGenerationGaps,
  listSlotsNeedingGeneration,
} from '../services/calendarDayBatchService';
import { fetchTrackedCompetitors } from '../services/competitorService';
import {
  analyzeScheduleGaps,
  getCachedGapHours,
  pinPreferredGapTime,
  type GapSlotResult,
} from '../services/intelligenceService';
import { getUserNiche as getUserNicheShared } from '../utils/userNiche';
import { IntelligenceGapStrip } from './intelligence/IntelligenceGapStrip';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import {
  formatDateYMDLocal,
  getWeekStartLocal,
  dateInWeekForWeekday,
} from '../utils/calendarDate';
import { v4 as uuidv4 } from 'uuid';

const WEEK_DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

function formatCellDate(d: Date): string {
  return formatDateYMDLocal(d);
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

function auditScoreLabel(score: number, t: (key: string, fallback: string) => string): string {
  if (score >= 80) return t('calendar.audit.good', 'Dobry');
  if (score >= 50) return t('calendar.audit.medium', 'Średni');
  return t('calendar.audit.poor', 'Słaby');
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export const ContentCalendar: React.FC = () => {
  const {
    scheduledPosts,
    history,
    intelligentCalendarPlan,
    clearIntelligentCalendarPlan,
    setIntelligentCalendarPlan,
    removeIntelligentCalendarPlanItem,
  } = useDataStore();
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const handlers = useAppHandlers(() => {}, () => {});
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { confirm, confirmDialogProps } = useConfirm();

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
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'week' : 'month'
  );
  const autoSuggestRef = useRef<string | null>(null);
  const gapWarmRef = useRef(false);
  const [gapSlots, setGapSlots] = useState<GapSlotResult[]>([]);
  const [gapRecommendation, setGapRecommendation] = useState('');
  const [isLoadingGaps, setIsLoadingGaps] = useState(false);
  const [hoveredPost, setHoveredPost] = useState<{
    post: ScheduledPost;
    pos: { top: number; left: number };
  } | null>(null);
  const [bulkQueueOpen, setBulkQueueOpen] = useState(false);
  const [bulkRange, setBulkRange] = useState<{ start: Date; end: Date } | null>(null);

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

  const changePeriod = (amount: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (calendarView === 'week') {
        newDate.setDate(prev.getDate() + amount * 7);
      } else {
        newDate.setMonth(prev.getMonth() + amount);
      }
      return newDate;
    });
  };

  const weekStartDate = useMemo(() => getWeekStartLocal(currentDate), [currentDate]);

  const weekFillLabel = useMemo(() => {
    const end = new Date(weekStartDate);
    end.setDate(weekStartDate.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${weekStartDate.toLocaleDateString('pl-PL', opts)} – ${end.toLocaleDateString('pl-PL', opts)}`;
  }, [weekStartDate]);

  const weekBulkRange = useMemo(() => {
    const start = new Date(weekStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(weekStartDate);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [weekStartDate]);

  const weekPublishableCount = useMemo(
    () => postsInDateRange(scheduledPosts, weekBulkRange.start, weekBulkRange.end).length,
    [scheduledPosts, weekBulkRange]
  );

  const openBulkQueueForWeek = () => {
    setBulkRange(weekBulkRange);
    setBulkQueueOpen(true);
  };

  const openBulkQueueForDay = () => {
    if (!selectedDay) return;
    const start = new Date(selectedDay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDay);
    end.setHours(23, 59, 59, 999);
    setBulkRange({ start, end });
    setBulkQueueOpen(true);
  };

  const periodLabel = useMemo(() => {
    if (calendarView === 'week') {
      const end = new Date(weekStartDate);
      end.setDate(weekStartDate.getDate() + 6);
      const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
      return `${weekStartDate.toLocaleDateString('pl-PL', opts)} – ${end.toLocaleDateString('pl-PL', { ...opts, year: 'numeric' })}`;
    }
    return currentDate.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
  }, [calendarView, currentDate, weekStartDate]);

  const getUserNicheForCalendar = useCallback((): string => {
    if (!user?.id) return 'marketing cyfrowy';
    return getUserNicheShared(user.id, weekTheme.trim() || 'marketing cyfrowy');
  }, [user?.id, weekTheme]);

  const warmGapIntelligence = useCallback(async () => {
    if (!user?.id) return;

    const cached = getCachedGapHours(user.id, platform);
    if (cached?.length) {
      setGapSlots(cached);
      return;
    }

    setIsLoadingGaps(true);
    try {
      const competitors = await fetchTrackedCompetitors(user.id);
      const handles = competitors
        .filter((c) => c.platform === platform)
        .map((c) => c.handle);
      const result = await analyzeScheduleGaps(getUserNicheForCalendar(), platform, user.id, {
        competitorHandles: handles,
      });
      setGapSlots(result.gapSlots || []);
      setGapRecommendation(result.recommendation || '');
    } catch {
      // cicho — strip pokaże CTA
    } finally {
      setIsLoadingGaps(false);
    }
  }, [user?.id, platform, getUserNicheForCalendar]);

  useEffect(() => {
    if (!user?.id || gapWarmRef.current) return;
    gapWarmRef.current = true;
    const cached = getCachedGapHours(user.id, platform);
    if (cached?.length) setGapSlots(cached);
    void warmGapIntelligence();
  }, [user?.id, platform, warmGapIntelligence]);

  const openDay = useCallback((date: Date) => {
    setSelectedDay(date);
    setSuggestions([]);
    autoSuggestRef.current = null;
  }, []);

  const closeDay = useCallback(() => {
    setSelectedDay(null);
    setSuggestions([]);
    autoSuggestRef.current = null;
  }, []);

  const syncMonthToDate = useCallback((date: Date) => {
    setCurrentDate((prev) => {
      if (prev.getFullYear() === date.getFullYear() && prev.getMonth() === date.getMonth()) {
        return prev;
      }
      return new Date(date.getFullYear(), date.getMonth(), 1);
    });
  }, []);

  const navigateSelectedDay = useCallback(
    (delta: number) => {
      setSelectedDay((prev) => {
        if (!prev) return prev;
        const next = new Date(prev);
        next.setDate(next.getDate() + delta);
        syncMonthToDate(next);
        setSuggestions([]);
        autoSuggestRef.current = null;
        return next;
      });
    },
    [syncMonthToDate]
  );

  const goToToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    syncMonthToDate(today);
    openDay(today);
  }, [openDay, syncMonthToDate]);

  const loadSuggestionsForDay = useCallback(
    async (date: Date) => {
      setIsSuggesting(true);
      try {
        const historySummary = history
          .slice(0, 5)
          .map((h) => h.formData?.topic || '')
          .filter(Boolean)
          .join(', ');
        const niche = getUserNicheForCalendar();
        if (!user) throw new Error('Musisz być zalogowany, aby użyć sugestii kalendarza.');
        const result = await generateCalendarSuggestions(date, niche, historySummary, user.id);
        setSuggestions(result);
        if (result.length === 0) {
          addToast(t('calendar.dayDrawer.noIdeas', 'Brak pomysłów — spróbuj ponownie'), NotificationType.Info);
        }
      } catch (e: unknown) {
        addToast(
          e instanceof Error ? e.message : 'Błąd generowania sugestii kalendarza',
          NotificationType.Error
        );
      } finally {
        setIsSuggesting(false);
      }
    },
    [history, user, addToast, t]
  );

  const handleSuggest = async () => {
    if (!selectedDay) return;
    await loadSuggestionsForDay(selectedDay);
  };

  const handleAddSuggestionToPlan = async (suggestion: CalendarSuggestion) => {
    if (!selectedDay || !user) return;
    const item = buildPlanItemFromSuggestion(
      suggestion,
      selectedDay,
      intelligentCalendarPlan || [],
      user.id
    );
    const merged = mergeCalendarPlans(intelligentCalendarPlan, [item]);
    await setIntelligentCalendarPlan(merged);
    addToast(t('calendar.dayDrawer.addedToPlan', 'Pomysł dodany do planu dnia'), NotificationType.Success);
  };

  const handleUseSuggestionWithSlot = async (suggestion: CalendarSuggestion, autoGenerate = true) => {
    if (!selectedDay || !user) return;
    const item = buildPlanItemFromSuggestion(
      suggestion,
      selectedDay,
      intelligentCalendarPlan || [],
      user.id
    );
    const merged = mergeCalendarPlans(intelligentCalendarPlan, [item]);
    await setIntelligentCalendarPlan(merged);
    closeDay();
    navigateToCalendarSlot(item, navigate, autoGenerate);
  };

  const handleUpdatePlanSlot = async (
    itemId: string,
    patch: Partial<Pick<IntelligentCalendarPlanItem, 'topic' | 'time' | 'platform'>>
  ) => {
    await useDataStore.getState().updateIntelligentCalendarPlanItem(itemId, patch);
    addToast(t('calendar.dayDrawer.slotSaved', 'Slot zaktualizowany'), NotificationType.Success);
  };

  const handleSelectSuggestion = (suggestion: CalendarSuggestion | IntelligentCalendarPlanItem) => {
    if ('id' in suggestion && suggestion.date) {
      handleGenerateForSlot(suggestion as IntelligentCalendarPlanItem, true);
      return;
    }
    void handleUseSuggestionWithSlot(suggestion as CalendarSuggestion, true);
  };

  const handleGenerateForSlot = (item: IntelligentCalendarPlanItem, autoGenerate = true) => {
    closeDay();
    navigateToCalendarSlot(item, navigate, autoGenerate);
  };

  const handleFillWeek = async () => {
    if (!user?.id || !weekTheme.trim()) {
      addToast(t('calendar.fill.themeRequired', 'Podaj temat tygodnia'), NotificationType.Error);
      return;
    }

    setIsFilling(true);
    try {
      const start = weekStartDate;
      const niche = getUserNicheForCalendar();
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
        t('calendar.fill.successWeek', 'Dodano {{count}} slotów na tydzień {{range}}', {
          count: newPlan.length,
          range: weekFillLabel,
        }),
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

  const handleClearPlan = useCallback(async () => {
    const ok = await confirm({
      title: t('calendar.clearPlanConfirmTitle', 'Wyczyścić plan strategiczny?'),
      message: t(
        'calendar.clearPlanConfirmMessage',
        'Usuniesz wszystkie sloty planu z kalendarza. Zaplanowane publikacje zostaną.'
      ),
      variant: 'danger',
      confirmLabel: t('calendar.clearStrategicPlan', 'Wyczyść plan'),
    });
    if (ok) clearIntelligentCalendarPlan();
  }, [confirm, clearIntelligentCalendarPlan, t]);

  const handleDeletePlanSlot = useCallback(
    async (itemId: string) => {
      const ok = await confirm({
        title: t('calendar.slot.deleteTitle', 'Usunąć slot?'),
        message: t('calendar.slot.deleteMessage', 'Slot zniknie z planu. Tej operacji nie cofniesz.'),
        variant: 'danger',
        confirmLabel: t('common.delete', 'Usuń'),
      });
      if (!ok) return;
      await removeIntelligentCalendarPlanItem(itemId);
      addToast(t('calendar.slot.deleted', 'Slot usunięty'), NotificationType.Success);
    },
    [confirm, removeIntelligentCalendarPlanItem, addToast, t]
  );

  const handleDuplicatePlanSlot = useCallback(
    async (item: IntelligentCalendarPlanItem) => {
      const plan = intelligentCalendarPlan || [];
      const copy: IntelligentCalendarPlanItem = {
        ...item,
        id: uuidv4(),
        topic: `${item.topic} (kopia)`,
        time: item.time
          ? (() => {
              const [h, m] = item.time.split(':').map(Number);
              const next = new Date(2000, 0, 1, h, m + 30);
              return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
            })()
          : item.time,
      };
      await setIntelligentCalendarPlan([...plan, copy]);
      addToast(t('calendar.slot.duplicated', 'Slot zduplikowany'), NotificationType.Success);
    },
    [intelligentCalendarPlan, setIntelligentCalendarPlan, addToast, t]
  );

  const handleApplyGapSlot = useCallback(
    async (slot: GapSlotResult) => {
      pinPreferredGapTime(slot.time);
      const targetDate = dateInWeekForWeekday(weekStartDate, slot.weekday);
      const dateStr = formatDateYMDLocal(targetDate);
      const plan = intelligentCalendarPlan || [];
      const dayItems = plan.filter((p) => p.date === dateStr || p.date.startsWith(dateStr));

      if (dayItems.length > 0) {
        const updated = plan.map((p) =>
          p.date === dateStr || p.date.startsWith(dateStr) ? { ...p, time: slot.time } : p
        );
        await setIntelligentCalendarPlan(updated);
        addToast(
          t('calendar.intelligence.appliedToSlots', 'Ustawiono {{time}} na {{count}} slot(ów) — {{label}}', {
            time: slot.time,
            count: dayItems.length,
            label: slot.label,
          }),
          NotificationType.Success
        );
      } else {
        addToast(
          t(
            'calendar.intelligence.pinnedTime',
            'Preferowana godzina {{time}} zapisana — użyjemy jej przy nowych slotach.',
            { time: slot.time }
          ),
          NotificationType.Success
        );
      }

      setSelectedDay(targetDate);
      if (calendarView === 'month') setCalendarView('week');
      setCurrentDate(targetDate);
    },
    [weekStartDate, intelligentCalendarPlan, setIntelligentCalendarPlan, addToast, t, calendarView]
  );

  const handleFillMissingDay = async () => {
    if (!user?.id || !selectedDay) return;

    setIsFillingDay(true);
    try {
      const niche = getUserNicheForCalendar();
      const missing = await generateMissingDaySlots(
        selectedDay,
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
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Błąd uzupełniania', NotificationType.Error);
    } finally {
      setIsFillingDay(false);
    }
  };

  const handleGenerateAllMissingDay = async () => {
    if (!user?.id || !selectedDay) return;

    setIsGeneratingDay(true);
    try {
      const niche = getUserNicheForCalendar();
      let plan = intelligentCalendarPlan || [];

      const missing = await generateMissingDaySlots(
        selectedDay,
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

      const toGenerate = listSlotsNeedingGeneration(selectedDay, plan, scheduledPosts);

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

      closeDay();
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

  const selectedDayAudit = selectedDay
    ? auditCalendarDay(selectedDay, presetId, intelligentCalendarPlan || [], scheduledPosts)
    : null;

  const selectedDayPosts = selectedDay
    ? scheduledPosts
        .filter((p) => isSameCalendarDay(p.scheduleTimestamp, selectedDay))
        .sort((a, b) => a.scheduleTimestamp - b.scheduleTimestamp)
    : [];

  const selectedDayPlanItems = selectedDay
    ? (intelligentCalendarPlan?.filter((p) => isSameCalendarDay(p.date, selectedDay)) || [])
    : [];

  const selectedDayIsEmpty = selectedDayPosts.length === 0 && selectedDayPlanItems.length === 0;

  useEffect(() => {
    if (!selectedDay || !user || !selectedDayIsEmpty || isSuggesting) return;
    const key = formatCellDate(selectedDay);
    if (autoSuggestRef.current === key) return;
    autoSuggestRef.current = key;
    void loadSuggestionsForDay(selectedDay);
  }, [selectedDay, selectedDayIsEmpty, user, isSuggesting, loadSuggestionsForDay]);

  const renderDayCell = (date: Date, key: React.Key, tall = false) => {
    const day = date.getDate();
    const postsForDay = scheduledPosts
      .filter((p) => isSameCalendarDay(p.scheduleTimestamp, date))
      .sort((a, b) => a.scheduleTimestamp - b.scheduleTimestamp);
    const planItemsForDay =
      intelligentCalendarPlan?.filter((p) => isSameCalendarDay(p.date, date)) || [];
    const dayAudit = auditCalendarDay(date, presetId, intelligentCalendarPlan || [], scheduledPosts);
    const hasContent = postsForDay.length > 0 || planItemsForDay.length > 0;
    const isSelected =
      selectedDay !== null && isSameCalendarDay(formatCellDate(selectedDay), date);
    const today = isToday(date);

    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        onClick={() => openDay(date)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDay(date);
          }
        }}
        className={`group/day relative border rounded-2xl p-2 ${
          tall ? 'min-h-[160px] sm:min-h-[200px]' : 'min-h-[120px] sm:min-h-[145px]'
        } flex flex-col cursor-pointer transition-all duration-300 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
          isSelected
            ? 'border-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/10 ring-2 ring-cyan-500/30'
            : today
              ? 'border-cyan-400/60 bg-cyan-500/5 dark:bg-cyan-500/5 hover:border-cyan-500/50'
              : 'border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-950/20 hover:bg-white dark:hover:bg-slate-900/40 hover:border-cyan-500/35'
        }`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, date)}
      >
        <div className="flex items-center justify-between gap-1">
          <span
            className={`font-bold text-xs ${
              today ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-800 dark:text-slate-300'
            }`}
          >
            {calendarView === 'week'
              ? date.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })
              : day}
            {today && (
              <span className="ml-1 text-[8px] font-black uppercase text-cyan-500">dziś</span>
            )}
          </span>
          {dayAudit.slotsTarget.post + dayAudit.slotsTarget.reel + dayAudit.slotsTarget.story > 0 && (
            <span
              data-calendar-interactive
              onClick={(e) => {
                e.stopPropagation();
                openDay(date);
              }}
              className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${auditScoreClass(dayAudit.score)}`}
              title={`${t('calendar.audit.open', 'Audyt dnia')}: ${dayAudit.score} — ${auditScoreLabel(dayAudit.score, t)}`}
            >
              {dayAudit.score}
            </span>
          )}
        </div>

        <div className="flex-grow space-y-1.5 mt-1.5 overflow-y-auto pr-0.5 custom-scrollbar max-h-[88px] sm:max-h-none">
          {postsForDay.slice(0, 3).map((post) => {
            const postPlatform = post.formData?.platform || Platform.Facebook;
            const config = platformConfig[postPlatform] || platformConfig[Platform.Facebook];
            const Icon = config.icon;
            return (
              <div
                key={post.id}
                data-calendar-interactive
                draggable
                onDragStart={(e) => handleDragStart(e, post.id, 'post')}
                onDragEnd={handleDragEnd}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredPost({ post, pos: { top: rect.top, left: rect.right + 10 } });
                }}
                onMouseLeave={() => setHoveredPost(null)}
                className="group/post relative p-1.5 rounded-lg bg-slate-100/80 dark:bg-white/5 border-l-[3px] border-l-emerald-500 cursor-grab active:cursor-grabbing hover:shadow-md transition-all border border-slate-200/50 dark:border-white/5"
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.handleEditScheduledPost(post);
                }}
              >
                <div className="flex items-center gap-1">
                  <Icon className={`w-3 h-3 flex-shrink-0 ${config.iconColor}`} />
                  <p className="text-[9px] font-bold truncate text-slate-800 dark:text-white flex-1">
                    {post.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                  </p>
                </div>
              </div>
            );
          })}

          {planItemsForDay
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
            .slice(0, Math.max(0, 3 - Math.min(postsForDay.length, 3)))
            .map((item) => {
              const config = platformConfig[item.platform] || platformConfig[Platform.Facebook];
              const Icon = config.icon;
              return (
                <div
                  key={item.id}
                  data-calendar-interactive
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id, 'plan')}
                  onDragEnd={handleDragEnd}
                  className="p-1.5 rounded-lg border border-dashed border-cyan-500/40 bg-cyan-500/5 cursor-grab active:cursor-grabbing"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDay(date);
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] shrink-0">{slotTypeBadge(item.slotType)}</span>
                    <Icon className="w-3 h-3 shrink-0 text-cyan-500" />
                    <p className="text-[9px] font-bold truncate text-slate-800 dark:text-white flex-1">
                      {item.topic}
                    </p>
                  </div>
                </div>
              );
            })}
          {postsForDay.length + planItemsForDay.length > 3 && (
            <p className="text-[8px] font-bold text-cyan-600 dark:text-cyan-400 text-center">
              +{postsForDay.length + planItemsForDay.length - 3}{' '}
              {t('calendar.dayDrawer.more', 'więcej')}
            </p>
          )}
        </div>

        <div className="mt-auto pt-1 flex items-center justify-between gap-1">
          <div className="flex gap-1">
            {postsForDay.length > 0 && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                title={`${postsForDay.length} zaplanowanych`}
              />
            )}
            {planItemsForDay.length > 0 && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-cyan-500"
                title={`${planItemsForDay.length} slotów planu`}
              />
            )}
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wide text-slate-400 group-hover/day:text-cyan-600 dark:group-hover/day:text-cyan-400 transition-colors">
            {hasContent ? t('calendar.dayDrawer.open', 'Plan dnia') : '+ AI'}
          </span>
        </div>
      </div>
    );
  };

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
      days.push(renderDayCell(date, day));
    }
    return days;
  };

  const renderWeekDays = () => {
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(weekStartDate.getDate() + i);
      cells.push(renderDayCell(date, `week-${i}`, true));
    }
    return cells;
  };

  return (
    <div className="glass-premium rounded-[2.5rem] border border-white/10 shadow-2xl p-6 md:p-8 animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[40%] h-56 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none" />

      <ConfirmDialog {...confirmDialogProps} />

      <CalendarFillToolbar
        presetId={presetId}
        weekTheme={weekTheme}
        platform={platform}
        isFilling={isFilling}
        weekRangeLabel={weekFillLabel}
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
        onOpenBulkQueue={openBulkQueueForWeek}
        bulkQueueCount={weekPublishableCount}
      />

      <IntelligenceGapStrip
        gapSlots={gapSlots}
        recommendation={gapRecommendation}
        isLoading={isLoadingGaps}
        onRefresh={() => void warmGapIntelligence()}
        onSelectSlot={(slot) => void handleApplyGapSlot(slot)}
      />

      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4 relative z-10">
        <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-sans capitalize">
          {periodLabel}
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex rounded-xl border border-slate-200/50 dark:border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setCalendarView('month')}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
                calendarView === 'month'
                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {t('calendar.viewMonth', 'Miesiąc')}
            </button>
            <button
              type="button"
              onClick={() => setCalendarView('week')}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
                calendarView === 'week'
                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {t('calendar.viewWeek', 'Tydzień')}
            </button>
          </div>
          {intelligentCalendarPlan && (
            <button
              type="button"
              onClick={() => void handleClearPlan()}
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1.5"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              {t('calendar.clearStrategicPlan')}
            </button>
          )}
          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wide bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition"
            >
              {t('calendar.today', 'Dziś')}
            </button>
            <button
              type="button"
              onClick={() => changePeriod(-1)}
              className="p-2 rounded-xl bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/5 text-slate-500 transition"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => changePeriod(1)}
              className="p-2 rounded-xl bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/5 text-slate-500 transition"
            >
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-2 px-2 pb-2 relative z-10">
        <div className={`min-w-0 ${calendarView === 'month' ? 'min-w-[640px] sm:min-w-[720px] lg:min-w-[900px]' : ''}`}>
          {calendarView === 'month' && (
            <div className="grid grid-cols-7 gap-2.5 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              {WEEK_DAYS.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
          )}
          <div
            className={
              calendarView === 'week'
                ? 'grid grid-cols-1 sm:grid-cols-7 gap-2.5'
                : 'grid grid-cols-7 gap-2.5'
            }
          >
            {calendarView === 'week' ? renderWeekDays() : renderCalendarDays()}
          </div>
        </div>
      </div>

      {scheduledPosts.length === 0 && !intelligentCalendarPlan && (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500 relative z-10 border border-dashed border-slate-200 dark:border-white/5 rounded-3xl mt-6">
          <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-cyan-500/60" />
          <h3 className="text-lg font-black text-slate-800 dark:text-gray-200 uppercase tracking-tight">
            {t('calendar.empty.title', 'Kalendarz jest pusty')}
          </h3>
          <p className="mt-2 text-xs max-w-md mx-auto leading-relaxed">
            {t(
              'calendar.empty.hint',
              'Użyj „Wypełnij tydzień” powyżej lub kliknij dowolny dzień, aby zaplanować treści.'
            )}
          </p>
        </div>
      )}

      {selectedDay && selectedDayAudit && (
        <DayDetailDrawer
          date={selectedDay}
          audit={selectedDayAudit}
          scheduledPosts={selectedDayPosts}
          planItems={selectedDayPlanItems}
          isEmptyDay={selectedDayIsEmpty}
          generateGapCount={countDayGenerationGaps(
            selectedDay,
            intelligentCalendarPlan,
            scheduledPosts
          )}
          suggestions={suggestions}
          isLoadingSuggestions={isSuggesting}
          isFilling={isFillingDay}
          isGenerating={isGeneratingDay}
          onClose={closeDay}
          onPrevDay={() => navigateSelectedDay(-1)}
          onNextDay={() => navigateSelectedDay(1)}
          onLoadSuggestions={handleSuggest}
          onFillMissing={handleFillMissingDay}
          onGenerateAll={handleGenerateAllMissingDay}
          onSelectSuggestion={handleSelectSuggestion}
          onAddSuggestionToPlan={handleAddSuggestionToPlan}
          onGenerateSlot={(item) => handleGenerateForSlot(item, true)}
          onUpdateSlot={handleUpdatePlanSlot}
          onDeleteSlot={(itemId) => void handleDeletePlanSlot(itemId)}
          onDuplicateSlot={(item) => void handleDuplicatePlanSlot(item)}
          onEditPost={(post) => handlers.handleEditScheduledPost(post)}
          onOpenBulkQueue={openBulkQueueForDay}
        />
      )}

      <BulkQueuePublisherModal
        isOpen={bulkQueueOpen}
        onClose={() => setBulkQueueOpen(false)}
        rangeStart={bulkRange?.start}
        rangeEnd={bulkRange?.end}
      />

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
