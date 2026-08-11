import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FavoritePost, CampaignHistoryItem, Draft } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { VideoIcon } from './icons/VideoIcon';
import { PostIcon } from './icons/PostIcon';
import { StarIcon } from './icons/StarIcon';
import { BulbIcon } from './icons/BulbIcon';
import { Spinner } from './ui/LoadingStates';

interface FavoritesListProps {
  favorites: FavoritePost[];
  inspiration: CampaignHistoryItem | FavoritePost | Draft | null;
  onSetInspiration: (item: FavoritePost | CampaignHistoryItem | Draft | null) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onLearnStyle: () => void;
  isLearningStyle: boolean;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({
  favorites,
  inspiration,
  onSetInspiration,
  onRemove,
  onClear,
  onLearnStyle,
  isLearningStyle,
}) => {
  const { t } = useTranslation();

  const learnStyleDisabled = favorites.length < 3 || isLearningStyle;
  const tooltipText =
    favorites.length < 3
      ? t('favorites.learnStyle.tooltip.disabled')
      : t('favorites.learnStyle.tooltip.enabled');

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
          {t('sidebar.tabs.favorites')}
        </h2>
        {favorites.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
          >
            {t('common.clear')}
          </button>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-4 text-center space-y-2">
          <StarIcon className="w-8 h-8 mx-auto text-amber-400/80" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Zapisz swoje ulubione posty
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dodaj je tutaj, aby szybciej wracać do najlepszych inspiracji.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 pr-1">
            {favorites.map((item, index) => {
              const isSelected = inspiration?.id === item.id;
              return (
                <div
                  key={item.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={`group p-4 rounded-2xl border transition-colors animate-fade-in-up ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/40 shadow-sm shadow-cyan-500/5'
                      : 'bg-white dark:bg-slate-950/40 border-slate-200/70 dark:border-slate-700 hover:border-cyan-500/35'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onSetInspiration(isSelected ? null : item)}
                      className="flex items-center gap-3 min-w-0 flex-grow text-left"
                    >
                      {item.result.videoUrl ? (
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <VideoIcon className="w-6 h-6 text-red-500" />
                        </div>
                      ) : item.result.imageUrl ? (
                        <img
                          src={item.result.imageUrl}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0 ring-2 ring-slate-100 dark:ring-slate-800"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200/50 dark:border-white/5">
                          <PostIcon className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div
                          className={`font-bold text-sm truncate ${
                            isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-900 dark:text-white'
                          }`}
                          title={item.formData?.topic?.replace(/<[^>]*>?/gm, '') || ''}
                        >
                          {item.formData?.topic?.replace(/<[^>]*>?/gm, '') || t('common.untitled')}
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-wider mt-1 text-slate-400">
                          {item.formData?.platform || '---'} &bull;{' '}
                          {new Date(item.timestamp).toLocaleDateString()}
                          {isSelected ? ` · ${t('sidebar.historySection.inspiration')}` : ''}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors flex-shrink-0"
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              type="button"
              onClick={onLearnStyle}
              disabled={learnStyleDisabled}
              className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl transition-colors"
              title={tooltipText}
            >
              {isLearningStyle ? (
                <>
                  <Spinner size="sm" />
                  {t('favorites.learnStyle.analyzing')}
                </>
              ) : (
                <>
                  <BulbIcon className="w-5 h-5" />
                  {t('favorites.learnStyle.button')}
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              {favorites.length < 3
                ? t('favorites.learnStyle.status.disabled', { count: 3 - favorites.length })
                : t('favorites.learnStyle.status.enabled')}
            </p>
          </div>
        </>
      )}
    </section>
  );
};
