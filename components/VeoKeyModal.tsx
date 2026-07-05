/**
 * VeoKeyModal — modal informujący o konieczności ustawienia klucza API Veo.
 * Wyodrębniony z App.tsx dla czytelności.
 */

import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { FilmIcon } from './icons/FilmIcon';
import { ModernButton } from './ui/ModernButton';

interface VeoKeyModalProps {
  onClose: () => void;
  onRetry?: () => void;
}

export const VeoKeyModal: React.FC<VeoKeyModalProps> = ({ onClose, onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in">
      <div className="bg-white/90 dark:bg-slate-900/90 border border-white/20 dark:border-slate-800 rounded-3xl shadow-2xl p-8 w-full max-w-md m-4 glass animate-scale-in relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />

        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <FilmIcon className="w-6 h-6 text-blue-500" />
          </div>
          {t('videoKeyModal.title')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
          <Trans i18nKey="videoKeyModal.description">
            Generowanie wideo Veo wymaga wybrania klucza API, dla którego włączono płatności.
            Więcej informacji znajdziesz w <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-500 font-bold hover:underline">dokumentacji płatności</a>.
          </Trans>
        </p>
        <div className="mt-8 flex justify-end">
          <ModernButton
            onClick={() => {
              onClose();
              onRetry?.();
            }}
            variant="gradient"
            size="md"
            className="px-8"
          >
            {t('videoKeyModal.button')}
          </ModernButton>
        </div>
      </div>
    </div>
  );
};
