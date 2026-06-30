import React from 'react';
import { SparklesIcon } from '../icons/SparklesIcon';

interface OnboardingFirstPostBannerProps {
  onDismiss?: () => void;
}

export const OnboardingFirstPostBanner: React.FC<OnboardingFirstPostBannerProps> = ({ onDismiss }) => (
  <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border border-indigo-400/30 flex items-start gap-3">
    <div className="p-2 bg-indigo-500 rounded-xl shrink-0">
      <SparklesIcon className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Twój pierwszy post jest gotowy do wygenerowania</p>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
        Temat jest już wypełniony z onboardingu. W trybie Szybkim: sprawdź temat → platformę → kliknij <strong>Generuj post</strong>.
      </p>
    </div>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shrink-0"
      >
        OK
      </button>
    )}
  </div>
);
