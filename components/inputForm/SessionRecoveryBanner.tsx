import React from 'react';
import { useTranslation } from 'react-i18next';
import { ModernButton } from '../ui/ModernButton';

interface SessionRecoveryBannerProps {
  onRestore: () => void;
  onDiscard: () => void;
}

export const SessionRecoveryBanner: React.FC<SessionRecoveryBannerProps> = ({
  onRestore,
  onDiscard,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="text-xl">💾</span>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {t('sessionRecovery.title', 'Znaleziono niezapisany szkic')}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('sessionRecovery.description', 'Czy chcesz przywrócić ostatnio edytowaną sesję?')}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <ModernButton
          onClick={onRestore}
          variant="primary"
          size="sm"
          className="py-1.5 px-3 text-xs bg-amber-500 hover:bg-amber-600"
        >
          {t('sessionRecovery.restore', 'Przywróć')}
        </ModernButton>
        <ModernButton onClick={onDiscard} variant="secondary" size="sm" className="py-1.5 px-3 text-xs">
          {t('sessionRecovery.discard', 'Ignoruj')}
        </ModernButton>
      </div>
    </div>
  );
};
