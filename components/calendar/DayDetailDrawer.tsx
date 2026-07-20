import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarSuggestion,
  GenerationType,
  IntelligentCalendarPlanItem,
  Platform,
  ScheduledPost,
} from '../../types';
import type { DayAudit } from '../../services/calendarCadenceService';
import { slotTypeBadge } from '../../services/calendarCadenceService';
import { platformConfig } from '../../config/platformConfig';
import { XMarkIcon } from '../icons/XMarkIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { PlusCircleIcon } from '../icons/PlusCircleIcon';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';

interface DayDetailDrawerProps {
  date: Date;
  audit: DayAudit;
  scheduledPosts: ScheduledPost[];
  planItems: IntelligentCalendarPlanItem[];
  isEmptyDay: boolean;
  generateGapCount: number;
  suggestions: CalendarSuggestion[];
  isLoadingSuggestions: boolean;
  isFilling: boolean;
  isGenerating: boolean;
  onClose: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onLoadSuggestions: () => void;
  onFillMissing: () => void;
  onGenerateAll: () => void;
  onSelectSuggestion: (suggestion: CalendarSuggestion) => void;
  onAddSuggestionToPlan: (suggestion: CalendarSuggestion) => void;
  onGenerateSlot: (item: IntelligentCalendarPlanItem) => void;
  onUpdateSlot: (
    itemId: string,
    patch: Partial<Pick<IntelligentCalendarPlanItem, 'topic' | 'time' | 'platform'>>
  ) => void;
  onEditPost: (post: ScheduledPost) => void;
  onOpenBulkQueue?: () => void;
}

function scoreStyles(score: number): string {
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  if (score >= 50) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
  return 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30';
}

function formatLabel(type: GenerationType): string {
  if (type === GenerationType.Video) return 'Wideo';
  if (type === GenerationType.PostWithImage) return 'Post + grafika';
  if (type === GenerationType.Campaign) return 'Kampania';
  if (type === GenerationType.Idea) return 'Pomysł';
  return 'Post';
}

function AiIdeasSection({
  suggestions,
  isLoadingSuggestions,
  onLoadSuggestions,
  onSelectSuggestion,
  onAddSuggestionToPlan,
}: {
  suggestions: CalendarSuggestion[];
  isLoadingSuggestions: boolean;
  onLoadSuggestions: () => void;
  onSelectSuggestion: (s: CalendarSuggestion) => void;
  onAddSuggestionToPlan: (s: CalendarSuggestion) => void;
}) {
  const { t } = useTranslation();
  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {t('calendar.dayDrawer.aiIdeas', 'Pomysły AI')}
        </h3>
        <button
          type="button"
          disabled={isLoadingSuggestions}
          onClick={onLoadSuggestions}
          className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline disabled:opacity-50 flex items-center gap-1"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          {isLoadingSuggestions
            ? t('calendar.dayDrawer.loadingIdeas', 'Generuję…')
            : suggestions.length > 0
              ? t('calendar.dayDrawer.refreshIdeas', 'Odśwież')
              : t('calendar.dayDrawer.getIdeas', '3 pomysły')}
        </button>
      </div>

      {isLoadingSuggestions ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <svg className="animate-spin h-8 w-8 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xs text-slate-500">{t('calendar.dayDrawer.loadingIdeas', 'Generuję…')}</p>
        </div>
      ) : suggestions.length === 0 ? (
        <button
          type="button"
          onClick={onLoadSuggestions}
          className="w-full p-4 rounded-2xl border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/5 transition-all text-center group"
        >
          <PlusCircleIcon className="w-8 h-8 mx-auto text-cyan-500/70 group-hover:text-cyan-500 mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {t('calendar.dayDrawer.ideasCta', 'Wygeneruj 3 pomysły na ten dzień')}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('calendar.dayDrawer.ideasHint', 'AI dopasuje format i platformę do Twojej niszy')}
          </p>
        </button>
      ) : (
        <ul className="space-y-2">
          {suggestions.map((s, i) => {
            const config = platformConfig[s.platform] || platformConfig[Platform.Facebook];
            const Icon = config.icon;
            return (
              <li
                key={`idea-${i}-${s.topic.slice(0, 12)}`}
                className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-cyan-500/5 dark:from-slate-900/60 dark:to-cyan-500/10 border border-slate-200 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <Icon className={`w-3 h-3 ${config.iconColor}`} />
                    {s.platform}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                    {formatLabel(s.format)}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{s.topic}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic line-clamp-2">
                  &quot;{s.strategy}&quot;
                </p>
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onAddSuggestionToPlan(s)}
                    className="flex-1 text-xs font-bold py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-slate-700 dark:text-slate-300"
                  >
                    {t('calendar.dayDrawer.addToPlan', 'Dodaj do planu')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectSuggestion(s)}
                    className="flex-1 text-xs font-bold py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1"
                  >
                    <SparklesIcon className="w-3.5 h-3.5" />
                    {t('calendar.useIdea', 'Użyj pomysłu')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export const DayDetailDrawer: React.FC<DayDetailDrawerProps> = ({
  date,
  audit,
  scheduledPosts,
  planItems,
  isEmptyDay,
  generateGapCount,
  suggestions,
  isLoadingSuggestions,
  isFilling,
  isGenerating,
  onClose,
  onPrevDay,
  onNextDay,
  onLoadSuggestions,
  onFillMissing,
  onGenerateAll,
  onSelectSuggestion,
  onAddSuggestionToPlan,
  onGenerateSlot,
  onUpdateSlot,
  onEditPost,
  onOpenBulkQueue,
}) => {
  const { t, i18n } = useTranslation();
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [editTime, setEditTime] = useState('12:00');
  const [editPlatform, setEditPlatform] = useState<Platform>(Platform.Instagram);
  const busy = isFilling || isGenerating;
  const hasCadenceTarget =
    audit.slotsTarget.post + audit.slotsTarget.reel + audit.slotsTarget.story > 0;
  const hasGaps =
    audit.slotsFilled.post < audit.slotsTarget.post ||
    audit.slotsFilled.reel < audit.slotsTarget.reel ||
    audit.slotsFilled.story < audit.slotsTarget.story;

  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'pl-PL';
  const dateLabel = date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const sortedPlan = [...planItems].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const startSlotEdit = (item: IntelligentCalendarPlanItem) => {
    setEditingSlotId(item.id);
    setEditTopic(item.topic);
    setEditTime(item.time || '12:00');
    setEditPlatform(item.platform);
  };

  const cancelSlotEdit = () => {
    setEditingSlotId(null);
  };

  const saveSlotEdit = (itemId: string) => {
    const topic = editTopic.trim();
    if (!topic) return;
    onUpdateSlot(itemId, {
      topic,
      time: editTime,
      platform: editPlatform,
    });
    setEditingSlotId(null);
  };
  const sortedPosts = [...scheduledPosts].sort((a, b) => a.scheduleTimestamp - b.scheduleTimestamp);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrevDay();
      if (e.key === 'ArrowRight') onNextDay();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onPrevDay, onNextDay]);

  const aiSection = (
    <AiIdeasSection
      suggestions={suggestions}
      isLoadingSuggestions={isLoadingSuggestions}
      onLoadSuggestions={onLoadSuggestions}
      onSelectSuggestion={onSelectSuggestion}
      onAddSuggestionToPlan={onAddSuggestionToPlan}
    />
  );

  const scheduledSection = (
    <section>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {t('calendar.dayDrawer.scheduled', 'Zaplanowane publikacje')} ({sortedPosts.length})
        </h3>
        {onOpenBulkQueue && sortedPosts.length > 0 && (
          <button
            type="button"
            onClick={onOpenBulkQueue}
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            {t('calendar.bulk.open', 'Kolejka publikacji')}
          </button>
        )}
      </div>
      {sortedPosts.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          {t('calendar.dayDrawer.noScheduled', 'Brak zaplanowanych postów na ten dzień.')}
        </p>
      ) : (
        <ul className="space-y-2">
          {sortedPosts.map((post) => {
            const postPlatform = post.formData?.platform || Platform.Facebook;
            const config = platformConfig[postPlatform] || platformConfig[Platform.Facebook];
            const Icon = config.icon;
            return (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() => onEditPost(post)}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 shrink-0 ${config.iconColor}`} />
                    <span className="text-sm font-bold text-slate-800 dark:text-white truncate flex-1">
                      {post.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(post.scheduleTimestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const planSection = (
    <section>
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
        {t('calendar.dayDrawer.planSlots', 'Sloty w planie')} ({sortedPlan.length})
      </h3>
      {sortedPlan.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          {t('calendar.dayDrawer.noSlots', 'Brak slotów — uzupełnij plan lub wygeneruj pomysły AI.')}
        </p>
      ) : (
        <ul className="space-y-2">
          {sortedPlan.map((item) => {
            const config = platformConfig[item.platform] || platformConfig[Platform.Facebook];
            const Icon = config.icon;
            const isEditing = editingSlotId === item.id;
            return (
              <li
                key={item.id}
                className="p-3 rounded-xl border border-dashed border-cyan-500/35 bg-cyan-500/5"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editTopic}
                      onChange={(e) => setEditTopic(e.target.value)}
                      className="w-full text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                      placeholder={t('calendar.slot.topicPlaceholder', 'Temat slotu')}
                    />
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="flex-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-2"
                      />
                      <select
                        value={editPlatform}
                        onChange={(e) => setEditPlatform(e.target.value as Platform)}
                        className="flex-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-2"
                      >
                        {Object.values(Platform).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={cancelSlotEdit}
                        className="flex-1 text-xs font-bold py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        {t('common.cancel', 'Anuluj')}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveSlotEdit(item.id)}
                        className="flex-1 text-xs font-bold py-2 rounded-lg bg-cyan-600 text-white"
                      >
                        {t('common.save', 'Zapisz')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="text-sm shrink-0">{slotTypeBadge(item.slotType)}</span>
                      <Icon className="w-4 h-4 shrink-0 text-cyan-500 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{item.topic}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {item.strategy}
                        </p>
                        {item.time && (
                          <p className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                            {item.time}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startSlotEdit(item)}
                        className="flex-1 text-xs font-bold py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-slate-700 dark:text-slate-300"
                      >
                        {t('calendar.slot.edit', 'Edytuj')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onGenerateSlot(item)}
                        className="flex-1 text-xs font-bold py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1"
                      >
                        <SparklesIcon className="w-3.5 h-3.5" />
                        {t('calendar.slot.generate', 'Generuj')}
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-stretch justify-center sm:justify-end animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-drawer-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label={t('common.close', 'Zamknij')}
      />

      <div className="relative w-full sm:max-w-md h-[min(92vh,720px)] sm:h-full sm:max-h-none flex flex-col bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-t-[1.75rem] sm:rounded-none sm:rounded-l-[1.75rem] overflow-hidden">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        <header className="shrink-0 px-5 pt-4 pb-3 border-b border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-cyan-500/5 to-fuchsia-500/5">
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={onPrevDay}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              aria-label={t('calendar.dayDrawer.prevDay', 'Poprzedni dzień')}
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                {t('calendar.dayDrawer.label', 'Plan dnia')}
              </p>
              <h2 id="day-drawer-title" className="text-base font-black text-slate-900 dark:text-white capitalize leading-tight truncate">
                {dateLabel}
              </h2>
            </div>
            <button
              type="button"
              onClick={onNextDay}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              aria-label={t('calendar.dayDrawer.nextDay', 'Następny dzień')}
            >
              <ArrowRightIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 shrink-0"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {hasCadenceTarget && (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${scoreStyles(audit.score)}`}>
                {t('calendar.audit.score', 'Wynik')}: {audit.score}/100
              </span>
              {(['post', 'reel', 'story'] as const).map((type) => (
                <span
                  key={type}
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                >
                  {type} {audit.slotsFilled[type]}/{audit.slotsTarget[type]}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 custom-scrollbar">
          {isEmptyDay && !isLoadingSuggestions && suggestions.length === 0 && (
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center">
              <SparklesIcon className="w-8 h-8 mx-auto text-cyan-500 mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                {t('calendar.dayDrawer.emptyHero', 'Pusty dzień — czas na treść!')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('calendar.dayDrawer.emptyHeroHint', 'AI przygotuje propozycje za chwilę lub kliknij poniżej.')}
              </p>
            </div>
          )}

          {audit.issues.length > 0 && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-700 dark:text-red-300 space-y-1">
              {audit.issues.map((issue) => (
                <p key={issue}>• {issue}</p>
              ))}
            </div>
          )}

          {audit.tips.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {audit.tips.map((tip) => (
                <p key={tip}>💡 {tip}</p>
              ))}
            </div>
          )}

          {isEmptyDay ? (
            <>
              {aiSection}
              {planSection}
              {scheduledSection}
            </>
          ) : (
            <>
              {scheduledSection}
              {planSection}
              {aiSection}
            </>
          )}
        </div>

        <footer className="shrink-0 px-5 py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 space-y-2">
          <p className="text-[10px] text-center text-slate-400 hidden sm:block">
            {t('calendar.dayDrawer.keyboardHint', '← → zmiana dnia · Esc zamknij')}
          </p>
          {hasGaps && (
            <button
              type="button"
              disabled={busy}
              onClick={onFillMissing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-cyan-500 disabled:opacity-50"
            >
              <SparklesIcon className="w-4 h-4 text-cyan-500" />
              {isFilling
                ? t('calendar.audit.filling', 'Uzupełnianie…')
                : t('calendar.audit.fillMissing', 'Uzupełnij brakujące sloty')}
            </button>
          )}
          {generateGapCount > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={onGenerateAll}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
            >
              <CalendarIcon className="w-4 h-4" />
              {isGenerating
                ? t('calendar.audit.generatingAll', 'Uruchamianie…')
                : t('calendar.audit.generateAll', 'Generuj wszystkie braki ({{count}})', {
                    count: generateGapCount,
                  })}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
