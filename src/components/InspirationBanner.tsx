import React from 'react';
import type { CampaignHistoryItem, FavoritePost, Draft } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface InspirationBannerProps {
  inspiration: CampaignHistoryItem | FavoritePost | Draft;
  onClear: () => void;
}

export const InspirationBanner: React.FC<InspirationBannerProps> = ({ inspiration, onClear }) => {
  const topic = inspiration.formData?.topic?.replace(/<[^>]*>?/gm, '') || '';

  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg animate-fade-in">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <SparklesIcon className="w-6 h-6 text-blue-600 dark:text-blue-300 flex-shrink-0" />
          {('result' in inspiration) && inspiration.result.imageUrl && (
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-blue-200 dark:border-blue-700 flex-shrink-0 shadow-sm">
              <img src={inspiration.result.imageUrl} alt="Inspiration" className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">Używasz inspiracji:</p>
            <p className="text-sm text-blue-900 dark:text-blue-100 font-medium truncate" title={topic}>
              {topic}
            </p>
          </div>
        </div>
      </div>
      <button
        onClick={onClear}
        className="p-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 rounded-full flex-shrink-0"
        aria-label="Wyczyść inspirację"
        title="Wyczyść inspirację"
      >
        <XCircleIcon className="w-5 h-5" />
      </button>
    </div>
  );
};