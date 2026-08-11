import React from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react';
import type { AIAssistantAction, FormData, GenerationResult } from '../../types';
import { PhoneMockup } from '../PhoneMockup';
import { PostPreview } from '../PostPreview';
import { RocketLaunchIcon } from '../icons/RocketLaunchIcon';
import { RefreshCwIcon } from '../icons/RefreshCwIcon';
import { Spinner } from '../ui/LoadingStates';
import { ModernButton } from '../ui/ModernButton';

interface ResultContentTabProps {
  result: GenerationResult;
  formData: FormData | null | undefined;
  previewMode: 'standard' | 'mobile';
  onTogglePreviewMode: () => void;
  isLoading: boolean;
  isRegenerating: boolean;
  isAssistantLoading: boolean;
  isRegeneratingImage: boolean;
  showGenerateImageBanner?: boolean;
  hookVariations: string[];
  isSuggestingHooks: boolean;
  onEditImage: () => void;
  onGenerateImage?: () => void;
  onUpdateResult: (result: GenerationResult) => void;
  onAIAssistantAction: (
    action: AIAssistantAction,
    selectedText: string,
    fullText: string,
    contextFormData: FormData | null
  ) => void;
  onSuggestHooks: () => void;
  onApplyHook: (hook: string) => void;
  onApplyHookWithNewImage: (hook: string) => void;
}

export const ResultContentTab: React.FC<ResultContentTabProps> = ({
  result,
  formData,
  previewMode,
  onTogglePreviewMode,
  isLoading,
  isRegenerating,
  isAssistantLoading,
  isRegeneratingImage,
  showGenerateImageBanner = false,
  hookVariations,
  isSuggestingHooks,
  onEditImage,
  onGenerateImage,
  onUpdateResult,
  onAIAssistantAction,
  onSuggestHooks,
  onApplyHook,
  onApplyHookWithNewImage,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-fade-in">
      {showGenerateImageBanner && onGenerateImage && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-[var(--hero-accent)]/35 bg-[var(--hero-accent-soft)]/20">
          <p className="flex-1 text-sm text-slate-200">
            {result.imageGenerationFailed
              ? t(
                  'resultCard.imageBanner.failed',
                  'Brak grafiki — tekst jest gotowy. Wygeneruj samą grafikę jednym kliknięciem.'
                )
              : t(
                  'resultCard.imageBanner.missing',
                  'Ten post nie ma jeszcze grafiki. Możesz wygenerować ją bez ponownego pisania treści.'
                )}
          </p>
          <ModernButton
            variant="primary"
            className="!rounded-lg min-h-[44px] shrink-0"
            loading={isRegeneratingImage}
            disabled={isRegeneratingImage}
            icon={<RefreshCwIcon className="w-4 h-4" />}
            onClick={onGenerateImage}
          >
            {t('resultCard.media.generate', 'Wygeneruj grafikę')}
          </ModernButton>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onTogglePreviewMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
            previewMode === 'mobile'
              ? 'bg-blue-500 text-white border-blue-400'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          }`}
        >
          <Smartphone className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">
            {previewMode === 'mobile'
              ? t('resultCard.preview.card', 'Widok karty')
              : t('resultCard.preview.mobile', 'Podgląd mobile')}
          </span>
        </button>
      </div>

      {previewMode === 'mobile' ? (
        <PhoneMockup result={result} formData={formData!} />
      ) : (
        <PostPreview
          result={result}
          formData={formData ?? null}
          onEditImage={onEditImage}
          onUpdateResult={onUpdateResult}
          onAIAssistantAction={onAIAssistantAction}
          isAssistantLoading={isAssistantLoading}
          streaming={isLoading || isRegenerating}
        />
      )}

      {!isLoading && !result.omnichannelPosts && (
        <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <RocketLaunchIcon className="w-3 h-3 text-amber-500" />
              {t('resultCard.hooks.title', 'Warianty nagłówka (Hooks)')}
            </h5>
            {hookVariations.length === 0 && !isSuggestingHooks && (
              <button
                type="button"
                onClick={onSuggestHooks}
                className="text-[10px] font-black uppercase text-blue-600 hover:underline"
              >
                {t('resultCard.hooks.generate', 'Generuj alternatywy')}
              </button>
            )}
            {hookVariations.length > 0 && !isSuggestingHooks && (
              <button
                type="button"
                onClick={onSuggestHooks}
                className="text-[10px] font-black uppercase text-slate-500 hover:text-blue-600"
              >
                {t('resultCard.hooks.refresh', 'Nowe hooki')}
              </button>
            )}
          </div>

          {isSuggestingHooks && (
            <div className="flex gap-2 items-center py-2">
              <Spinner size="sm" />
              <span className="text-[10px] font-bold text-slate-400 uppercase animate-pulse">
                {t('resultCard.hooks.loading', 'Generowanie haczyków…')}
              </span>
            </div>
          )}

          {hookVariations.length > 0 && (
            <div className="grid grid-cols-1 gap-2">
              {hookVariations.map((hook, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl"
                >
                  <button
                    type="button"
                    onClick={() => onApplyHook(hook)}
                    className="flex-1 text-left text-xs hover:text-blue-600 transition-colors"
                  >
                    <span className="line-clamp-2">{hook}</span>
                    <span className="text-[9px] font-black uppercase text-slate-400 mt-1 block">
                      {t('resultCard.hooks.applyText', 'Tylko tekst')}
                    </span>
                  </button>
                  {result.imageUrl && formData && (
                    <button
                      type="button"
                      onClick={() => onApplyHookWithNewImage(hook)}
                      disabled={isRegeneratingImage}
                      className="shrink-0 px-3 py-2 text-[10px] font-black uppercase rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {t('resultCard.hooks.applyWithImage', 'Hook + grafika')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
