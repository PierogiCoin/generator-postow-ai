import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FormData } from '../../types';
import { ContentType, CopywritingFramework, GenerationMode } from '../../types';
import { CONTENT_TYPES, AI_MODELS } from '../../constants';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BulbIcon } from '../icons/BulbIcon';
import { ModernInput } from '../ui/ModernInput';

export interface InputFormAdvancedOptionsProps {
  formData: FormData;
  showContentType: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onGenerationModeChange: (mode: GenerationMode) => void;
}

export const InputFormAdvancedOptions: React.FC<InputFormAdvancedOptionsProps> = ({
  formData,
  showContentType,
  onInputChange,
  onGenerationModeChange,
}) => {
  const { t } = useTranslation();

  return (
          <details className="group border-2 border-slate-100 dark:border-slate-800/50 rounded-3xl p-4 sm:p-6 transition-all duration-300">
            <summary className="text-sm sm:text-sm font-black uppercase tracking-tight text-slate-600 dark:text-slate-400 cursor-pointer list-none flex items-center justify-between p-2 -m-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className="flex items-center gap-2 sm:gap-3">
                Opcje zaawansowane
                <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              </span>
              <svg className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-open:rotate-180 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="mt-8 space-y-10 animate-fade-in">
              <ModernInput
                label={t('form.keywords.label')}
                id="keywords"
                name="keywords"
                value={formData.keywords || ''}
                onChange={onInputChange}
                placeholder={t('form.keywords.placeholder')}
                fullWidth
                icon={<BulbIcon className="w-5 h-5" />}
              />

              <div className={`grid ${showContentType ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-4 sm:gap-6`}>
                {showContentType && <div className="space-y-3">
                  <label htmlFor="contentType" className="block text-xs sm:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.contentType.label')}</label>
                  <select id="contentType" name="contentType" value={formData.contentType} onChange={onInputChange} className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-4 text-sm font-semibold focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer min-h-[52px] touch-manipulation">
                    {CONTENT_TYPES.map(type => <option key={type} value={type}>{t(`enums.ContentType.${type}`)}</option>)}
                  </select>
                </div>}
                <div className="space-y-3">
                  <label htmlFor="model" className="block text-xs sm:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.aiModel.label')}</label>
                  <select id="model" name="model" value={formData.model} onChange={onInputChange} className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-4 text-sm font-semibold focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer min-h-[52px] touch-manipulation">
                    {AI_MODELS.map(model => <option key={model} value={model}>{t(`enums.AIModel.${model}`)}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label htmlFor="copywritingFramework" className="block text-xs sm:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    Framework copywriterski
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full">PRO</span>
                  </label>
                  <select 
                    id="copywritingFramework" 
                    name="copywritingFramework" 
                    value={formData.copywritingFramework} 
                    onChange={onInputChange} 
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-4 text-sm font-semibold focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer min-h-[52px] touch-manipulation"
                  >
                    <option value={CopywritingFramework.Auto}>Auto (AI wybiera)</option>
                    <option value={CopywritingFramework.PAS}>PAS - Problem Agitation Solution</option>
                    <option value={CopywritingFramework.AIDA}>AIDA - Attention Interest Desire Action</option>
                    <option value={CopywritingFramework.Storytelling}>Storytelling</option>
                    <option value={CopywritingFramework.HookStoryOffer}>Hook → Story → Offer</option>
                    <option value={CopywritingFramework.BeforeAfterBridge}>Before → After → Bridge</option>
                    <option value={CopywritingFramework.FeatureBenefit}>Feature → Benefit → Outcome</option>
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Wybierz sprawdzoną strukturę, aby zwiększyć konwersję
                  </p>
                </div>
              </div>

              {/* Generation Mode Toggle */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Tryb generowania</span>
                  </div>
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => onGenerationModeChange(GenerationMode.Single)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        formData.generationMode === GenerationMode.Single
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      1 wariant
                    </button>
                    <button
                      type="button"
                      onClick={() => onGenerationModeChange(GenerationMode.MultiVariant)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                        formData.generationMode === GenerationMode.MultiVariant
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:hover:text-slate-200'
                      }`}
                    >
                      <span>A / B / C</span>
                      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-bold rounded">PRO</span>
                    </button>
                  </div>
                </div>
                {formData.generationMode === GenerationMode.MultiVariant && (
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Wygenerujemy 3 warianty tego samego posta z różnymi hookami: <strong>Emocjonalny</strong> (FOMO), <strong>Edukacyjny</strong> (wartość), <strong>Ciekawość</strong> (gap). Wybierz najlepszy!
                  </p>
                )}
              </div>
            </div>
          </details>
  );
};
