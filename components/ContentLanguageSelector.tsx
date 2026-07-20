import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContentLanguage } from '../types';
import { GlobeIcon } from './icons/GlobeIcon';

interface ContentLanguageSelectorProps {
  selected: ContentLanguage;
  onSelect: (language: ContentLanguage) => void;
  disabled?: boolean;
}

const FLAG_BY_LANG: Record<ContentLanguage, string> = {
  [ContentLanguage.Polish]: '🇵🇱',
  [ContentLanguage.English]: '🇬🇧',
  [ContentLanguage.German]: '🇩🇪',
  [ContentLanguage.Czech]: '🇨🇿',
};

export const ContentLanguageSelector: React.FC<ContentLanguageSelectorProps> = ({
  selected,
  onSelect,
  disabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5" role="radiogroup" aria-label="Wybierz język publikacji">
      {Object.values(ContentLanguage).map((lang) => {
        const isSelected = selected === lang;
        return (
          <button
            key={lang}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(lang)}
            disabled={disabled}
            className={`group flex flex-col items-center justify-center p-4 text-center border rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
              isSelected
                ? 'border-cyan-500 bg-slate-900/60 dark:bg-white/5 shadow-xl shadow-cyan-500/10 scale-105 neon-glow-cyan'
                : 'border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 hover:border-cyan-500/35 hover:scale-105'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 text-2xl transition-transform duration-300 group-hover:scale-110 ${
                isSelected
                  ? 'bg-cyan-500/10 border border-cyan-500/20'
                  : 'bg-slate-100 dark:bg-white/5'
              }`}
            >
              {FLAG_BY_LANG[lang]}
            </div>
            <span
              className={`text-[10px] uppercase font-black tracking-widest transition-all duration-200 ${
                isSelected
                  ? 'text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-500 dark:text-slate-550 group-hover:text-cyan-500'
              }`}
            >
              {t(`enums.ContentLanguage.${lang}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/** Etykieta z flagą do podglądu wybranego języka */
export function ContentLanguageBadge({ language }: { language: ContentLanguage }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg">
      <GlobeIcon className="w-3.5 h-3.5" />
      {FLAG_BY_LANG[language]} {t(`enums.ContentLanguage.${language}`)}
    </span>
  );
}
