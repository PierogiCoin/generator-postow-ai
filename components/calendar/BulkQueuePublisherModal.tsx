import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useDataStore } from '../../stores/dataStore';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationType, type ScheduledPost } from '../../types';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { XMarkIcon } from '../icons/XMarkIcon';
import { ModernButton } from '../ui/ModernButton';
import {
  listPublishableScheduledPosts,
  postsInDateRange,
  runBulkPublishQueue,
  type BulkPublishProgressItem,
} from '../../services/bulkQueuePublisherService';

interface BulkQueuePublisherModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Zakres dat (np. bieżący tydzień / dzień). Brak = wszystkie gotowe. */
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  initialSelectedIds?: string[];
}

export const BulkQueuePublisherModal: React.FC<BulkQueuePublisherModalProps> = ({
  isOpen,
  onClose,
  rangeStart,
  rangeEnd,
  initialSelectedIds,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const scheduledPosts = useDataStore((s) => s.scheduledPosts);
  const addOrUpdateScheduledPost = useDataStore((s) => s.addOrUpdateScheduledPost);

  const candidates = useMemo(() => {
    if (rangeStart && rangeEnd) {
      return postsInDateRange(scheduledPosts, rangeStart, rangeEnd);
    }
    return listPublishableScheduledPosts(scheduledPosts);
  }, [scheduledPosts, rangeStart, rangeEnd]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BulkPublishProgressItem[]>([]);

  useEscapeClose(isOpen && !isRunning, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const initial =
      initialSelectedIds && initialSelectedIds.length > 0
        ? initialSelectedIds.filter((id) => candidates.some((c) => c.id === id))
        : candidates.map((c) => c.id);
    setSelectedIds(new Set(initial));
    setProgress([]);
    setIsRunning(false);
  }, [isOpen, candidates, initialSelectedIds]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    }
  };

  const selectedPosts: ScheduledPost[] = candidates.filter((c) => selectedIds.has(c.id));

  const handlePublish = async () => {
    if (!user?.id || selectedPosts.length === 0) return;
    setIsRunning(true);
    setProgress(
      selectedPosts.map((p) => ({
        postId: p.id,
        topic: (p.formData?.topic || '').slice(0, 80),
        platform: String(p.formData?.platform || '—'),
        status: 'pending',
      }))
    );

    const result = await runBulkPublishQueue(
      selectedPosts,
      user.id,
      (items) => setProgress(items),
      async (post) => {
        await addOrUpdateScheduledPost({
          ...post,
          status: 'published',
          approvalStatus: post.approvalStatus === 'draft' ? 'approved' : post.approvalStatus,
        });
      }
    );

    setIsRunning(false);
    addToast(
      t(
        'calendar.bulk.done',
        'Kolejka: {{ok}} opublikowano, {{fail}} błędów, {{skip}} pominięto',
        { ok: result.published, fail: result.failed, skip: result.skipped }
      ),
      result.failed > 0 ? NotificationType.Error : NotificationType.Success
    );
  };

  const progressById = useMemo(() => {
    const map = new Map<string, BulkPublishProgressItem>();
    progress.forEach((p) => map.set(p.postId, p));
    return map;
  }, [progress]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-slate-900/70 backdrop-blur-sm p-0 sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRunning) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-queue-title"
        className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col"
      >
        <header className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-white/10">
          <div>
            <h2 id="bulk-queue-title" className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {t('calendar.bulk.title', 'Kolejka publikacji')}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t(
                'calendar.bulk.subtitle',
                'Wybierz gotowe posty i opublikuj je na połączone konta — jeden flow z postępem.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-40"
            aria-label={t('common.close', 'Zamknij')}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {candidates.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
              <p className="text-sm text-slate-500">
                {t(
                  'calendar.bulk.empty',
                  'Brak gotowych postów w tym zakresie. Wygeneruj treść i zaplanuj publikacje.'
                )}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleAll}
                  disabled={isRunning}
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline disabled:opacity-40"
                >
                  {selectedIds.size === candidates.length
                    ? t('calendar.bulk.deselectAll', 'Odznacz wszystkie')
                    : t('calendar.bulk.selectAll', 'Zaznacz wszystkie')}
                </button>
                <span className="text-xs text-slate-500">
                  {selectedIds.size}/{candidates.length}
                </span>
              </div>

              <ul className="space-y-2">
                {candidates.map((post) => {
                  const prog = progressById.get(post.id);
                  const checked = selectedIds.has(post.id);
                  return (
                    <li
                      key={post.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        checked
                          ? 'border-cyan-500/40 bg-cyan-500/5'
                          : 'border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isRunning}
                        onChange={() => toggle(post.id)}
                        className="mt-1"
                        aria-label={t('calendar.bulk.selectPost', 'Zaznacz post')}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                          {topicOfDisplay(post)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {String(post.formData?.platform || '—')} ·{' '}
                          {new Date(post.scheduleTimestamp).toLocaleString('pl-PL', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {prog && (
                          <p
                            className={`text-[10px] font-bold mt-1 ${
                              prog.status === 'done'
                                ? 'text-emerald-600'
                                : prog.status === 'failed'
                                  ? 'text-red-600'
                                  : prog.status === 'publishing'
                                    ? 'text-cyan-600'
                                    : 'text-slate-500'
                            }`}
                          >
                            {statusLabel(prog.status, t)}
                            {prog.error ? `: ${prog.error}` : ''}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <footer className="p-5 border-t border-slate-200 dark:border-white/10 flex gap-3">
          <ModernButton type="button" variant="secondary" fullWidth onClick={onClose} disabled={isRunning}>
            {t('common.cancel', 'Anuluj')}
          </ModernButton>
          <ModernButton
            type="button"
            variant="gradient"
            fullWidth
            disabled={isRunning || selectedPosts.length === 0 || !user}
            onClick={() => void handlePublish()}
          >
            {isRunning
              ? t('calendar.bulk.publishing', 'Publikuję…')
              : t('calendar.bulk.publishSelected', 'Publikuj zaznaczone ({{count}})', {
                  count: selectedPosts.length,
                })}
          </ModernButton>
        </footer>
      </div>
    </div>
  );
};

function topicOfDisplay(post: ScheduledPost): string {
  const raw = post.formData?.topic || post.result?.postText || 'Bez tytułu';
  return raw.replace(/<[^>]*>?/gm, '').slice(0, 80);
}

function statusLabel(
  status: BulkPublishProgressItem['status'],
  t: (key: string, fallback: string) => string
): string {
  switch (status) {
    case 'publishing':
      return t('calendar.bulk.statusPublishing', 'Publikowanie');
    case 'done':
      return t('calendar.bulk.statusDone', 'Opublikowano');
    case 'failed':
      return t('calendar.bulk.statusFailed', 'Błąd');
    case 'skipped':
      return t('calendar.bulk.statusSkipped', 'Pominięto');
    default:
      return t('calendar.bulk.statusPending', 'Oczekuje');
  }
}
