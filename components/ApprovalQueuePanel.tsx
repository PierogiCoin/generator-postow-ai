import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDataStore } from '../stores/dataStore';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useNotifications } from '../hooks/useNotifications';
import type { CampaignHistoryItem, PostApprovalStatus, ScheduledPost } from '../types';
import { NotificationType } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { ClockIcon } from './icons/ClockIcon';

const STATUS_LABELS: Record<PostApprovalStatus, string> = {
  draft: 'Szkic',
  pending_approval: 'Oczekuje',
  approved: 'Zaakceptowany',
  rejected: 'Odrzucony',
};

type QueueItem =
  | { kind: 'history'; item: CampaignHistoryItem }
  | { kind: 'scheduled'; item: ScheduledPost };

function topicOf(item: CampaignHistoryItem | ScheduledPost): string {
  const raw = item.formData?.topic || item.result?.postText || 'Bez tytułu';
  return raw.replace(/<[^>]*>?/gm, '').slice(0, 80);
}

export const ApprovalQueuePanel: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useNotifications();
  const handlers = useAppHandlers(() => {}, () => {});
  const { history, scheduledPosts, handleStatusChange, addOrUpdateScheduledPost } = useDataStore();
  const [filter, setFilter] = useState<'pending_approval' | 'all'>('pending_approval');
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCount = useMemo(
    () =>
      history.filter((h) => h.status === 'pending_approval').length +
      scheduledPosts.filter((p) => p.approvalStatus === 'pending_approval').length,
    [history, scheduledPosts]
  );

  // Progressive disclosure: ukryj panel gdy brak oczekujących (chyba że filtr „wszystkie”)
  if (pendingCount === 0 && filter === 'pending_approval') {
    return null;
  }

  const items = (() => {
    const hist: QueueItem[] = history
      .filter((h) => (filter === 'all' ? true : h.status === 'pending_approval'))
      .map((item) => ({ kind: 'history' as const, item }));
    const sched: QueueItem[] = scheduledPosts
      .filter((p) => (filter === 'all' ? true : p.approvalStatus === 'pending_approval'))
      .map((item) => ({ kind: 'scheduled' as const, item }));
    return [...hist, ...sched].slice(0, 20);
  })();

  const setStatus = async (entry: QueueItem, status: PostApprovalStatus) => {
    const id = entry.item.id;
    setBusyId(id);
    try {
      if (entry.kind === 'history') {
        await handleStatusChange(id, status);
      } else {
        await addOrUpdateScheduledPost({ ...entry.item, approvalStatus: status });
      }
    } finally {
      setBusyId(null);
    }
  };

  const approveAndLeave = async (entry: QueueItem) => {
    await setStatus(entry, 'approved');
    addToast(
      t('approval.approvedScheduled', 'Zaakceptowano — zostaje w harmonogramie.'),
      NotificationType.Success
    );
  };

  const approveAndPublish = async (entry: QueueItem) => {
    const id = entry.item.id;
    setBusyId(id);
    try {
      if (entry.kind === 'history') {
        await handleStatusChange(id, 'approved');
        await handlers.handlePublishNow(
          { ...entry.item.result, approvalStatus: 'approved' },
          String(entry.item.formData?.platform || 'Facebook')
        );
      } else {
        await addOrUpdateScheduledPost({ ...entry.item, approvalStatus: 'approved' });
        await handlers.handlePublishNow(
          { ...entry.item.result, approvalStatus: 'approved' },
          String(entry.item.formData?.platform || 'Facebook')
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="glass-premium p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            {t('approval.title', 'Kolejka akceptacji')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {t('approval.subtitle', '{{count}} oczekujących', { count: pendingCount })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('pending_approval')}
            className={`px-3 py-1.5 text-xs font-bold rounded-full ${filter === 'pending_approval' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
          >
            {t('approval.filterPending', 'Oczekujące')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-full ${filter === 'all' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
          >
            {t('approval.filterAll', 'Wszystkie')}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
          <ClockIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            {t('approval.empty', 'Brak treści w kolejce. Wyślij post do akceptacji z planowania.')}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((entry) => {
            const status =
              entry.kind === 'history' ? entry.item.status : entry.item.approvalStatus;
            const busy = busyId === entry.item.id;
            return (
              <li
                key={`${entry.kind}-${entry.item.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-white/50 dark:bg-slate-950/30 border border-slate-200/60 dark:border-white/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {topicOf(entry.item)}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                    {entry.kind === 'scheduled' ? 'Zaplanowany' : 'Historia'} · {STATUS_LABELS[status]}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {status === 'pending_approval' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void approveAndLeave(entry)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-white disabled:opacity-50"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        {t('approval.approveKeep', 'Akceptuj (harmonogram)')}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void approveAndPublish(entry)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl bg-cyan-600 text-white disabled:opacity-50"
                      >
                        {t('approval.approvePublish', 'Akceptuj i publikuj')}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setStatus(entry, 'rejected')}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl bg-red-500/90 text-white disabled:opacity-50"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        {t('approval.reject', 'Odrzuć')}
                      </button>
                    </>
                  )}
                  {status === 'draft' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setStatus(entry, 'pending_approval')}
                      className="px-3 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white disabled:opacity-50"
                    >
                      {t('approval.send', 'Wyślij do akceptacji')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(entry.kind === 'scheduled' ? '/calendar' : '/generator')}
                    className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                  >
                    {t('approval.open', 'Otwórz')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ApprovalQueuePanel;
