import React from 'react';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '../icons/SparklesIcon';

export const SuggestionPills = <T extends string>({ suggestions, onSelect, isLoading, selectedValue }: { suggestions: T[]; onSelect: (value: T) => void; isLoading: boolean; selectedValue?: T }) => {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium animate-pulse mt-3 flex items-center gap-2 px-1">
        <SparklesIcon className="w-4 h-4 animate-spin-slow" />
        <span>{t('form.suggestions.loading')}</span>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex items-center flex-wrap gap-2 animate-fade-in px-1">
      <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-500 flex items-center gap-2 mb-1 w-full">
        <SparklesIcon className="w-3 h-3 text-purple-500" />
        <span>{t('form.suggestions.label')}</span>
      </span>
      {suggestions.map((suggestion) => {
        const isSelected = suggestion === selectedValue;
        return (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion as T)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 border-2 items-center ${isSelected
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-lg shadow-blue-500/25 scale-105'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400/50 hover:text-blue-500 hover:scale-105'
              }`}
          >
            {suggestion}
          </button>
        );
      })}
    </div>
  );
};
