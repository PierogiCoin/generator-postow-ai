import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
// FIX: Import Draft type to use in component props.
import type { FavoritePost, CampaignHistoryItem, Draft } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { TrashIcon } from './icons/TrashIcon';
import { VideoIcon } from './icons/VideoIcon';
import { PostIcon } from './icons/PostIcon';
import { StarIcon } from './icons/StarIcon';
import { BulbIcon } from './icons/BulbIcon';

interface FavoritesListProps {
  favorites: FavoritePost[];
  // FIX: Update `inspiration` prop to also accept `Draft` type.
  inspiration: CampaignHistoryItem | FavoritePost | Draft | null;
  // FIX: Update `onSetInspiration` prop to handle all possible inspiration types.
  onSetInspiration: (item: FavoritePost | CampaignHistoryItem | Draft | null) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onLearnStyle: () => void;
  isLearningStyle: boolean;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({ favorites, inspiration, onSetInspiration, onRemove, onClear, onLearnStyle, isLearningStyle }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const learnStyleDisabled = favorites.length < 3 || isLearningStyle;
  const tooltipText = favorites.length < 3
    ? t('favorites.learnStyle.tooltip.disabled')
    : t('favorites.learnStyle.tooltip.enabled');

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <StarIcon className="w-5 h-5 text-yellow-500" />
          {t('sidebar.tabs.favorites')}
        </h2>
        {favorites.length > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            {t('common.clear')}
          </button>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-6 px-2 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
          <StarIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Zapisz swoje ulubione posty
          </p>
          <p className="text-xs mt-1">
            Dodaj je tutaj, aby szybciej wracać do najlepszych inspiracji.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2 pr-1">
            {favorites.map((item) => {
              const isSelected = inspiration?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border-2 transition-all ${isSelected
                      ? 'bg-slate-200/80 dark:bg-slate-700/50 border-blue-500 shadow-inner'
                      : 'bg-white dark:bg-slate-900/50 border-slate-300 dark:border-slate-700'
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 min-w-0 flex-grow" onClick={() => onSetInspiration(isSelected ? null : item)} style={{ cursor: 'pointer' }}>
                      {item.result.videoUrl ? (
                        <div className="w-10 h-10 rounded-md bg-red-200 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0" title="Wideo">
                          <VideoIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                      ) : item.result.imageUrl ? (
                        <img
                          src={item.result.imageUrl}
                          alt={`Wizualizacja dla ${item.formData?.topic || ''}`}
                          className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-slate-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-slate-700 flex items-center justify-center flex-shrink-0" title="Post tekstowy/Pomysł">
                          <PostIcon className="w-5 h-5 text-slate-500" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div
                          className="font-semibold text-sm text-slate-900 dark:text-white truncate"
                          title={item.formData?.topic?.replace(/<[^>]*>?/gm, '') || ''}
                        >
                          {item.formData?.topic?.replace(/<[^>]*>?/gm, '') || t('common.untitled')}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.formData?.platform || '---'} &bull; {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center flex-shrink-0 ml-2">
                      {isSelected && (
                        <div className="flex-shrink-0 flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">
                          <SparklesIcon className="w-4 h-4" />
                          {t('sidebar.historySection.inspiration')}
                        </div>
                      )}
                      <button
                        onClick={() => onRemove(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        aria-label={t('common.delete')}
                        title={t('common.delete')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onLearnStyle}
              disabled={learnStyleDisabled}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800"
              title={tooltipText}
            >
              {isLearningStyle ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('favorites.learnStyle.analyzing')}
                </>
              ) : (
                <>
                  <BulbIcon className="w-5 h-5" />
                  {t('favorites.learnStyle.button')}
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
              {favorites.length < 3
                ? t('favorites.learnStyle.status.disabled', { count: 3 - favorites.length })
                : t('favorites.learnStyle.status.enabled')
              }
            </p>
          </div>
        </>
      )}
    </section>
  );
};