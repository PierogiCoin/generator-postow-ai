import React from 'react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { GlobeIcon } from './icons/GlobeIcon';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'pl', name: 'PL' },
    { code: 'en', name: 'EN' },
  ];

  const currentLanguage = i18n.language;

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-200 dark:bg-slate-700 rounded-full">
      <GlobeIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 ml-1" />
      {languages.map(lang => (
        <button
          key={lang.code}
          onClick={() => i18next.changeLanguage(lang.code)}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
            currentLanguage?.startsWith(lang.code)
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label={`Change language to ${lang.name}`}
        >
          {lang.name}
        </button>
      ))}
    </div>
  );
};