import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType, Platform, Tone } from '../types';
import type { UnifiedMessage } from '../services/crossPlatformService';
import {
  draftReplyForInboxItem,
  loadEngagementInbox,
} from '../services/engagementInboxService';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

export const EngagementInboxPanel: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replies, setReplies] = useState<
    Record<string, { friendly: string; professional: string; brief: string }>
  >({});
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const inbox = await loadEngagementInbox(user.id);
      setMessages(inbox);
    } catch (e) {
      addToast(
        e instanceof Error ? e.message : t('inbox.loadError', 'Nie udało się załadować skrzynki'),
        NotificationType.Error
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, addToast, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDraft = async (message: UnifiedMessage) => {
    if (!user?.id) return;
    setBusyId(message.id);
    try {
      const draft = await draftReplyForInboxItem(message, Tone.Professional, user.id);
      setReplies((prev) => ({
        ...prev,
        [message.id]: {
          friendly: draft.friendly,
          professional: draft.professional,
          brief: draft.brief,
        },
      }));
    } catch (e) {
      addToast(
        e instanceof Error ? e.message : t('inbox.draftError', 'Błąd generowania odpowiedzi'),
        NotificationType.Error
      );
    } finally {
      setBusyId(null);
    }
  };

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      addToast(t('inbox.copyError', 'Nie udało się skopiować'), NotificationType.Error);
    }
  };

  return (
    <div className="glass-premium p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/15 flex items-center justify-center">
            <ChatBubbleIcon className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              {t('inbox.title', 'Skrzynka engagement')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('inbox.subtitle', '{{count}} wątków z komentarzami', { count: messages.length })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isLoading || !user}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-40"
        >
          {isLoading ? t('inbox.refreshing', 'Odświeżam…') : t('inbox.refresh', 'Odśwież')}
        </button>
      </div>

      {isLoading && messages.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">
          {t('inbox.loading', 'Ładowanie komentarzy z połączonych kont…')}
        </p>
      ) : messages.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
          <p className="text-sm text-slate-500">
            {t(
              'inbox.empty',
              'Brak wątków. Połącz konta i opublikuj posty — tu pojawią się te z komentarzami.'
            )}
          </p>
        </div>
      ) : (
        <ul className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
          {messages.slice(0, 12).map((message) => {
            const draft = replies[message.id];
            return (
              <li
                key={message.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/40"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    {message.platform || Platform.Facebook}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    {message.priority}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(message.timestamp).toLocaleString('pl-PL', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{message.content}</p>
                {message.engagementOpportunity && (
                  <p className="text-xs text-fuchsia-600 dark:text-fuchsia-400 mt-2">
                    {message.engagementOpportunity}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === message.id}
                    onClick={() => void handleDraft(message)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-fuchsia-600 text-white hover:bg-fuchsia-500 disabled:opacity-50"
                  >
                    <SparklesIcon className="w-3.5 h-3.5" />
                    {busyId === message.id
                      ? t('inbox.drafting', 'Generuję…')
                      : t('inbox.smartReply', 'Szkic odpowiedzi AI')}
                  </button>
                  {message.originalPost?.url ? (
                    <a
                      href={message.originalPost.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                    >
                      {t('inbox.openPost', 'Otwórz post')}
                    </a>
                  ) : null}
                </div>
                {draft && (
                  <div className="mt-3 space-y-2">
                    {(
                      [
                        ['friendly', draft.friendly, t('inbox.toneFriendly', 'Przyjazny')],
                        ['professional', draft.professional, t('inbox.tonePro', 'Profesjonalny')],
                        ['brief', draft.brief, t('inbox.toneBrief', 'Krótki')],
                      ] as const
                    ).map(([key, text, label]) => (
                      <div
                        key={key}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            {label}
                          </span>
                          <button
                            type="button"
                            onClick={() => void copyText(text, `${message.id}-${key}`)}
                            className="p-1 text-slate-400 hover:text-fuchsia-500"
                            aria-label={t('inbox.copy', 'Kopiuj')}
                          >
                            {copied === `${message.id}-${key}` ? (
                              <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <ClipboardIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
