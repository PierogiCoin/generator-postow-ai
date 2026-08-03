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
import { CalendarDayCell } from './calendar/CalendarDayCell';
import {
  WEEK_DAY_KEYS,
  formatCellDate,
  isSameCalendarDay,
  isToday,
} from './calendar/calendarDayUtils';

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
  const { t, i18n } = useTranslation();
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
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
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
    const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'pl-PL';
    return `${weekStartDate.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, opts)}`;
  }, [weekStartDate, i18n.language]);

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
      const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'pl-PL';
      return `${weekStartDate.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, { ...opts, year: 'numeric' })}`;
    }
    const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'pl-PL';
    return currentDate.toLocaleString(locale, { month: 'long', year: 'numeric' });
  }, [calendarView, currentDate, weekStartDate, i18n.language]);

  const getUserNicheForCalendar = useCallback((): string => {
    const defaultNiche = t('calendar.defaultNiche');
    if (!user?.id) return weekTheme.trim() || defaultNiche;
    const { brandVoiceProfiles, activeBrandVoiceId } = useDataStore.getState();
    const bvNiche = brandVoiceProfiles
      .find((p) => p.id === activeBrandVoiceId)
      ?.settings?.niche?.trim();
    if (bvNiche) return bvNiche;
    return getUserNicheShared(user.id, weekTheme.trim() || defaultNiche);
  }, [user?.id, weekTheme, t]);

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
        if (!user) throw new Error(t('calendar.loginRequired'));
        const result = await generateCalendarSuggestions(date, niche, historySummary, user.id);
        setSuggestions(result);
        if (result.length === 0) {
          addToast(t('calendar.dayDrawer.noIdeas', 'Brak pomysłów — spróbuj ponownie'), NotificationType.Info);
        }
      } catch (e: unknown) {
        addToast(
          e instanceof Error ? e.message : t('calendar.suggestionError'),
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
        topic: `${item.topic} ${t('calendar.copySuffix')}`,
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
        weekTheme.trim() || t('calendar.defaultWeekTheme'),
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
      addToast(e instanceof Error ? e.message : t('calendar.fillError'), NotificationType.Error);
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

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
  };

  const handleDragLeave = (e: React.DragEvent, date: Date) => {
    if (dragOverDate && dragOverDate.getTime() === date.getTime()) {
      setDragOverDate(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverDate(null);
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
    const planItemsForDay =
      intelligentCalendarPlan?.filter((p) => isSameCalendarDay(p.date, date)) || [];
    const dayAudit = auditCalendarDay(date, presetId, intelligentCalendarPlan || [], scheduledPosts);

    return (
      <CalendarDayCell
        date={date}
        cellKey={key}
        tall={tall}
        calendarView={calendarView}
        locale={i18n.language || 'pl'}
        scheduledPosts={scheduledPosts}
        planItems={planItemsForDay}
        dayAudit={dayAudit}
        selectedDay={selectedDay}
        dragOverDate={dragOverDate}
        t={t}
        onOpenDay={openDay}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onEditPost={(post) => handlers.handleEditScheduledPost(post)}
        onHoverPost={setHoveredPost}
      />
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
    <div className="border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70 p-6 md:p-8 animate-fade-in relative overflow-hidden">
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

      <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-8 gap-4 relative z-10">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--hero-accent)' }}
          >
            Calendar
          </p>
          <h2 className="mt-1 font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight capitalize">
            {periodLabel}
          </h2>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex rounded-lg border border-slate-200/80 dark:border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setCalendarView('month')}
              className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                calendarView === 'month'
                  ? 'text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              style={calendarView === 'month' ? { backgroundColor: 'var(--hero-accent)' } : undefined}
            >
              {t('calendar.viewMonth')}
            </button>
            <button
              type="button"
              onClick={() => setCalendarView('week')}
              className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                calendarView === 'week'
                  ? 'text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              style={calendarView === 'week' ? { backgroundColor: 'var(--hero-accent)' } : undefined}
            >
              {t('calendar.viewWeek')}
            </button>
          </div>
          {intelligentCalendarPlan && (
            <button
              type="button"
              onClick={() => void handleClearPlan()}
              className="text-xs font-semibold hover:underline flex items-center gap-1.5"
              style={{ color: 'var(--hero-accent)' }}
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
              {WEEK_DAY_KEYS.map((d) => (
                <div key={d} className="py-2">
                  {t(`calendar.weekDays.${d}`)}
                </div>
              ))}
            </div>
          )}
          <div
            key={calendarView}
            className={
              calendarView === 'week'
                ? 'grid grid-cols-1 sm:grid-cols-7 gap-2.5 animate-fade-in'
                : 'grid grid-cols-7 gap-2.5 animate-fade-in'
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
