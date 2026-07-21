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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextMode = mode === 'quick' ? 'advanced' : 'quick';
      onChange(nextMode);

      const buttons = e.currentTarget.querySelectorAll('button');
      const targetBtn = nextMode === 'quick' ? buttons[0] : buttons[1];
      targetBtn?.focus();
    }
  };

  return (
    <div
      className="inline-flex p-1 rounded-xl bg-slate-100/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 focus:outline-none"
      role="tablist"
      aria-label={t('form.mode.label', 'Tryb formularza')}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'quick'}
        tabIndex={mode === 'quick' ? 0 : -1}
        onClick={() => onChange('quick')}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)] ${
          mode === 'quick'
            ? 'bg-white dark:bg-slate-800 text-[var(--hero-accent)] shadow-sm border border-[var(--hero-accent)]/25'
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
        tabIndex={mode === 'advanced' ? 0 : -1}
        onClick={() => onChange('advanced')}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)] ${
          mode === 'advanced'
            ? 'bg-white dark:bg-slate-800 text-[var(--hero-accent)] shadow-sm border border-[var(--hero-accent)]/25'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <Settings2 className="w-4 h-4" />
        {t('form.mode.advanced', 'Zaawansowany')}
      </button>
    </div>
  );
};
