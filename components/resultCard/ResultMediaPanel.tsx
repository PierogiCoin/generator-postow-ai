import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GenerationResult } from '../../types';
import { Platform } from '../../types';
import { ModernButton } from '../ui/ModernButton';
import { ModernInput } from '../ui/ModernInput';
import { SparklesIcon } from '../icons/SparklesIcon';
import { RefreshCwIcon } from '../icons/RefreshCwIcon';
import { CameraIcon } from '../icons/CameraIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { Spinner } from '../ui/LoadingStates';

interface ResultMediaPanelProps {
  result: GenerationResult;
  isRegeneratingImage: boolean;
  onRegenerateImage: (customInstruction?: string) => void;
  onOpenAiStudio: () => void;
  onOpenCreativeStudio: () => void;
  onReformatForPlatform?: (platform: Platform) => void;
}

export const ResultMediaPanel: React.FC<ResultMediaPanelProps> = ({
  result,
  isRegeneratingImage,
  onRegenerateImage,
  onOpenAiStudio,
  onOpenCreativeStudio,
  onReformatForPlatform,
}) => {
  const { t } = useTranslation();
  const [imagePrompt, setImagePrompt] = useState('');

  return (
    <div className="space-y-6 animate-fade-in">
      {result.imageUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <img
            src={result.imageUrl}
            alt={t('resultCard.media.previewAlt', 'Podgląd grafiki')}
            className="w-full max-h-[420px] object-contain mx-auto"
          />
          {isRegeneratingImage && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Spinner size="lg" />
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                {t('resultCard.media.regenerating', 'Generuję nową grafikę…')}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
          {t('resultCard.media.noImage', 'Brak grafiki w tym wyniku.')}
        </p>
      )}

      {result.visualStrategyTips && (
        <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl">
          <div className="flex items-center gap-2 mb-3">
            <CameraIcon className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              {t('resultCard.media.visualConcept', 'Koncepcja wizualna')}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
            {result.visualStrategyTips}
          </p>
        </div>
      )}

      <div className="p-5 bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {t('resultCard.media.editTitle', 'Edycja i nowe wersje')}
        </p>

        <ModernInput
          label={t('resultCard.media.promptLabel', 'Kierunek wizualny (opcjonalnie)')}
          placeholder={t(
            'resultCard.media.promptPlaceholder',
            'np. jaśniejsze tło, więcej kontrastu, styl minimalistyczny…'
          )}
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ModernButton
            onClick={() => onRegenerateImage(imagePrompt.trim() || undefined)}
            variant="primary"
            fullWidth
            loading={isRegeneratingImage}
            disabled={isRegeneratingImage}
            icon={<RefreshCwIcon className="w-4 h-4" />}
          >
            {t('resultCard.media.regenerate', 'Nowa grafika')}
          </ModernButton>
          <ModernButton
            onClick={onOpenAiStudio}
            variant="secondary"
            fullWidth
            disabled={!result.imageUrl || isRegeneratingImage}
            icon={<PencilIcon className="w-4 h-4" />}
          >
            {t('resultCard.media.aiEdit', 'Edytuj AI')}
          </ModernButton>
          <ModernButton
            onClick={onOpenCreativeStudio}
            variant="gradient"
            fullWidth
            disabled={!result.imageUrl || isRegeneratingImage}
            icon={<SparklesIcon className="w-4 h-4" />}
          >
            {t('resultCard.media.overlay', 'Tekst / logo')}
          </ModernButton>
        </div>

        {result.imageUrl && onReformatForPlatform && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {t('resultCard.media.reformatTitle', 'Dostosuj format do platformy')}
            </p>
            <div className="flex flex-wrap gap-2">
              {[Platform.Instagram, Platform.Facebook, Platform.LinkedIn, Platform.TikTok].map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={isRegeneratingImage || result.platform === p}
                  onClick={() => onReformatForPlatform(p)}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500 disabled:opacity-40 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
