import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, RefreshCw, Loader2, ExternalLink, Sparkles, CalendarPlus } from 'lucide-react';
import type { Platform } from '../../types';
import {
  fetchTechRadarNews,
  techNewsToTopic,
  type TechNewsItem,
  type TechRadarResult,
} from '../../services/techRadarService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationType } from '../../types';

interface TechRadarPanelProps {
  niche: string;
  platform: Platform;
  onSelectTopic: (topic: string, item?: TechNewsItem) => void;
  onAddToCalendar?: (items: TechNewsItem[]) => void;
}

export const TechRadarPanel: React.FC<TechRadarPanelProps> = ({
  niche,
  platform,
  onSelectTopic,
  onAddToCalendar,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();
  const [result, setResult] = useState<TechRadarResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nicheInput, setNicheInput] = useState(niche);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id) return;
      const q = nicheInput.trim();
      if (!q) {
        notifications.addToast(t('form.techRadar.nicheRequired', 'Podaj niszę lub temat'), NotificationType.Error);
        return;
      }

      setIsLoading(true);
      try {
        const data = await fetchTechRadarNews(q, platform, user.id, { forceRefresh });
        setResult(data);
        notifications.addToast(
          t('form.techRadar.found', 'Znaleziono {{count}} newsów', { count: data.items.length }),
          NotificationType.Success
        );
      } catch (e: unknown) {
        notifications.addToast(
          e instanceof Error ? e.message : t('form.techRadar.error', 'Błąd wyszukiwania'),
          NotificationType.Error
        );
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, nicheInput, platform, notifications, t]
  );

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <h3 className="font-bold text-slate-900 dark:text-white">
            {t('form.techRadar.title', 'Tech Radar')}
          </h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t(
            'form.techRadar.description',
            'Aktualne newsy z Google Search dopasowane do Twojej niszy — gotowe kąty na post.'
          )}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={nicheInput}
          onChange={(e) => setNicheInput(e.target.value)}
          placeholder={t('form.techRadar.nichePlaceholder', 'np. AI w marketingu, SaaS, cyberbezpieczeństwo')}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
        />
        <button
          type="button"
          onClick={() => void load(false)}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
          {isLoading
            ? t('form.techRadar.searching', 'Szukam…')
            : t('form.techRadar.search', 'Szukaj newsów')}
        </button>
        {result && (
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('form.techRadar.refresh', 'Odśwież')}
          </button>
        )}
      </div>

      {result && (
        <p className="text-xs text-slate-500">
          {t('form.techRadar.updated', 'Ostatnie wyszukiwanie')}:{' '}
          {new Date(result.searchedAt).toLocaleString('pl-PL')}
          {result.sources.length > 0 && (
            <> · {result.sources.length} {t('form.techRadar.sources', 'źródeł w Google')}</>
          )}
        </p>
      )}

      {result && result.items.length > 0 && onAddToCalendar && (
        <button
          type="button"
          onClick={() => onAddToCalendar(result.items)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
        >
          <CalendarPlus className="w-4 h-4" />
          {t('form.techRadar.addToCalendar', 'Dodaj top 2 newsy do kalendarza (ten tydzień)')}
        </button>
      )}

      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
        {result?.items.map((item) => (
          <article
            key={item.id}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/40 hover:border-cyan-500/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{item.summary}</p>
                <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-2 italic">💡 {item.angle}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-slate-500">
                  <span className="font-bold">★ {item.relevance}/10</span>
                  {item.publishedHint && <span>· {item.publishedHint}</span>}
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-cyan-600 hover:underline"
                    >
                      {item.sourceTitle}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTopic(techNewsToTopic(item), item)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t('form.techRadar.useAsTopic', 'Użyj jako temat posta')}
            </button>
          </article>
        ))}

        {!isLoading && !result && (
          <p className="text-center text-sm text-slate-500 py-8">
            {t('form.techRadar.empty', 'Wpisz niszę i kliknij „Szukaj newsów”.')}
          </p>
        )}
      </div>
    </div>
  );
};
