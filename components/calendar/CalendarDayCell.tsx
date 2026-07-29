import React from 'react';
import {
  ScheduledPost,
  IntelligentCalendarPlanItem,
  Platform,
} from '../../types';
import { platformConfig } from '../../config/platformConfig';
import { slotTypeBadge } from '../../services/calendarCadenceService';
import {
  auditScoreClass,
  auditScoreLabel,
  formatCellDate,
  isSameCalendarDay,
  isToday,
} from './calendarDayUtils';

export type CalendarDragKind = 'post' | 'plan';

export interface CalendarDayCellProps {
  date: Date;
  cellKey: React.Key;
  tall?: boolean;
  calendarView: 'month' | 'week';
  locale: string;
  scheduledPosts: ScheduledPost[];
  planItems: IntelligentCalendarPlanItem[];
  dayAudit: { score: number; slotsTarget: { post: number; reel: number; story: number } };
  selectedDay: Date | null;
  dragOverDate: Date | null;
  // i18next TFunction is overloaded — keep loose here
  t: any;
  onOpenDay: (date: Date) => void;
  onDragOver: (e: React.DragEvent, date: Date) => void;
  onDragLeave: (e: React.DragEvent, date: Date) => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  onDragStart: (e: React.DragEvent, id: string, kind: CalendarDragKind) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onEditPost: (post: ScheduledPost) => void;
  onHoverPost: (
    payload: { post: ScheduledPost; pos: { top: number; left: number } } | null
  ) => void;
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  date,
  cellKey,
  tall = false,
  calendarView,
  locale,
  scheduledPosts,
  planItems,
  dayAudit,
  selectedDay,
  dragOverDate,
  t,
  onOpenDay,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onEditPost,
  onHoverPost,
}) => {
  const day = date.getDate();
  const postsForDay = scheduledPosts
    .filter((p) => isSameCalendarDay(p.scheduleTimestamp, date))
    .sort((a, b) => a.scheduleTimestamp - b.scheduleTimestamp);
  const planItemsForDay = planItems
    .filter((p) => isSameCalendarDay(p.date, date))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const hasContent = postsForDay.length > 0 || planItemsForDay.length > 0;
  const isSelected =
    selectedDay !== null && isSameCalendarDay(formatCellDate(selectedDay), date);
  const today = isToday(date);

  return (
    <div
      key={cellKey}
      role="button"
      tabIndex={0}
      onClick={() => onOpenDay(date)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDay(date);
        }
      }}
      className={`group/day relative border rounded-2xl p-2.5 ${
        tall ? 'min-h-[160px] sm:min-h-[200px]' : 'min-h-[120px] sm:min-h-[145px]'
      } flex flex-col cursor-pointer transition-all duration-300 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
        isSelected
          ? 'border-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/10 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
          : dragOverDate && dragOverDate.getTime() === date.getTime()
            ? 'border-cyan-500 bg-cyan-500/20 dark:bg-cyan-500/20 ring-2 ring-cyan-500/50 scale-[1.02] shadow-xl shadow-cyan-500/20'
            : today
              ? 'border-cyan-400/80 bg-gradient-to-br from-cyan-500/10 to-transparent dark:from-cyan-500/15 dark:to-transparent hover:border-cyan-500 shadow-md shadow-cyan-500/5'
              : 'border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-950/30 hover:bg-white dark:hover:bg-slate-900/60 hover:border-cyan-500/40 hover:shadow-md'
      }`}
      onDragOver={(e) => onDragOver(e, date)}
      onDragLeave={(e) => onDragLeave(e, date)}
      onDrop={(e) => onDrop(e, date)}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={`font-bold text-xs ${
            today ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-800 dark:text-slate-300'
          }`}
        >
          {calendarView === 'week'
            ? date.toLocaleDateString(locale?.startsWith('en') ? 'en-GB' : 'pl-PL', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })
            : day}
          {today && (
            <span className="ml-1 text-[8px] font-black uppercase text-cyan-500">
              {t('calendar.todayLabel')}
            </span>
          )}
        </span>
        {dayAudit.slotsTarget.post + dayAudit.slotsTarget.reel + dayAudit.slotsTarget.story > 0 && (
          <span
            data-calendar-interactive
            onClick={(e) => {
              e.stopPropagation();
              onOpenDay(date);
            }}
            className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${auditScoreClass(dayAudit.score)}`}
            title={`${t('calendar.audit.open', 'Audyt dnia')}: ${dayAudit.score} — ${auditScoreLabel(dayAudit.score, (k, fb) => t(k, fb))}`}
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
              onDragStart={(e) => onDragStart(e, post.id, 'post')}
              onDragEnd={onDragEnd}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onHoverPost({ post, pos: { top: rect.top, left: rect.right + 10 } });
              }}
              onMouseLeave={() => onHoverPost(null)}
              className="group/post relative p-1.5 rounded-lg bg-slate-100/80 dark:bg-white/5 border-l-[3px] border-l-emerald-500 cursor-grab active:cursor-grabbing hover:shadow-md transition-all border border-slate-200/50 dark:border-white/5"
              onClick={(e) => {
                e.stopPropagation();
                onEditPost(post);
              }}
            >
              <div className="flex items-center gap-1">
                <Icon className={`w-3 h-3 flex-shrink-0 ${config.iconColor}`} />
                <p className="text-[9px] font-bold truncate text-slate-800 dark:text-white flex-1">
                  {post.formData?.topic?.replace(/<[^>]*>?/gm, '') || t('calendar.untitled')}
                </p>
              </div>
            </div>
          );
        })}

        {planItemsForDay
          .slice(0, Math.max(0, 3 - Math.min(postsForDay.length, 3)))
          .map((item) => {
            const config = platformConfig[item.platform] || platformConfig[Platform.Facebook];
            const Icon = config.icon;
            return (
              <div
                key={item.id}
                data-calendar-interactive
                draggable
                onDragStart={(e) => onDragStart(e, item.id, 'plan')}
                onDragEnd={onDragEnd}
                className="p-1.5 rounded-lg border border-dashed border-cyan-500/40 bg-cyan-500/5 cursor-grab active:cursor-grabbing"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDay(date);
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
              title={t('calendar.scheduledCount', { count: postsForDay.length })}
            />
          )}
          {planItemsForDay.length > 0 && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-cyan-500"
              title={t('calendar.planCount', { count: planItemsForDay.length })}
            />
          )}
          {!hasContent && (
            <span
              className="text-[8px] font-bold text-amber-500/90 dark:text-amber-400/90"
              title="Brak zaplanowanych treści dla tego dnia"
            >
              ⚠️ Pusty
            </span>
          )}
        </div>
        <span className="text-[8px] font-bold uppercase tracking-wide text-slate-400 group-hover/day:text-cyan-600 dark:group-hover/day:text-cyan-400 transition-colors">
          {hasContent ? t('calendar.dayDrawer.open', 'Plan dnia') : '+ Dodaj AI'}
        </span>
      </div>
    </div>
  );
};
