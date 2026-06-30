import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Settings2 } from 'lucide-react';
import type { InputFormMode } from '../../utils/inputFormMode';

interface InputFormModeToggleProps {
  mode: InputFormMode;
  onChange: (mode: InputFormMode) => void;
}

export const InputFormModeToggle: React.FC<InputFormModeToggleProps> = ({ mode, onChange }) => {
  const { t } = useTranslation();

  return (
    <div
      className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
      role="tablist"
      aria-label={t('form.mode.label', 'Tryb formularza')}
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'quick'}
        onClick={() => onChange('quick')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          mode === 'quick'
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <Zap className="w-4 h-4" />
        {t('form.mode.quick', 'Szybki')}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'advanced'}
        onClick={() => onChange('advanced')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          mode === 'advanced'
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <Settings2 className="w-4 h-4" />
        {t('form.mode.advanced', 'Zaawansowany')}
      </button>
    </div>
  );
};
