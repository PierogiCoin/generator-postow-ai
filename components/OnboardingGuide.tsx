import React, { useEffect, useState } from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { LinkIcon } from './icons/LinkIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { StarIcon } from './icons/StarIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { socialConnectionsService } from '../services/socialConnectionsService';
import { dismissOnboardingGuide, isOnboardingGuideActive } from '../utils/onboarding';

interface OnboardingGuideProps {
  userId: string;
  hasGenerated: boolean;
  hasFavorited: boolean;
  onConnectSocial: () => void;
  onScrollToForm?: () => void;
  onScrollToResult?: () => void;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({
  userId,
  hasGenerated,
  hasFavorited,
  onConnectSocial,
  onScrollToForm,
  onScrollToResult,
}) => {
  const [visible, setVisible] = useState(() => isOnboardingGuideActive(userId));
  const [hasConnections, setHasConnections] = useState(false);

  useEffect(() => {
    if (!visible) return;
    socialConnectionsService.getConnections(userId)
      .then(connections => setHasConnections(connections.some(c => c.isActive)))
      .catch(() => setHasConnections(false));
  }, [userId, visible]);

  if (!visible) return null;

  const steps = [
    {
      id: 'connect',
      label: 'Połącz konto social',
      done: hasConnections,
      action: onConnectSocial,
      actionLabel: 'Połącz',
      icon: LinkIcon,
    },
    {
      id: 'generate',
      label: 'Wygeneruj pierwszy post',
      done: hasGenerated,
      action: !hasGenerated ? onScrollToForm : undefined,
      actionLabel: !hasGenerated ? 'Przejdź do formularza' : undefined,
      icon: SparklesIcon,
    },
    {
      id: 'favorite',
      label: 'Dodaj do ulubionych',
      done: hasFavorited,
      action: hasGenerated && !hasFavorited ? onScrollToResult : undefined,
      actionLabel: hasGenerated && !hasFavorited ? 'Zobacz wynik' : undefined,
      icon: StarIcon,
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  const handleDismiss = () => {
    dismissOnboardingGuide(userId);
    setVisible(false);
  };

  return (
    <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-2xl">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Pierwsze kroki
          </p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            Twój pierwszy sukces ({completedCount}/{steps.length})
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Połącz social → wygeneruj post → dodaj do ulubionych.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"
          aria-label="Zamknij przewodnik"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                step.done
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-700/80'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                step.done ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {step.done ? <CheckCircleIcon className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-grow">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                  {index + 1}. {step.label}
                </p>
                {step.action && step.actionLabel && !step.done && (
                  <button
                    type="button"
                    onClick={step.action}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5"
                  >
                    {step.actionLabel} →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {allDone && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-3 text-center font-medium">
          Gratulacje! Ukończyłeś/aś onboarding — możesz zamknąć ten przewodnik.
        </p>
      )}
    </div>
  );
};
