import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FormData } from '../../types';
import { Platform, VisualStyle } from '../../types';
import { VISUAL_STYLES } from '../../constants';
import { Tooltip } from '../Tooltip';
import { SuggestionPills } from './SuggestionPills';
import { InputFormAiToolsMenu } from './InputFormAiToolsMenu';
import type { AiToolPanelCategory } from './aiToolPanels';
import { getPlatformVisualSpec } from '../../utils/platformVisualSpec';

export interface InputFormVisualSectionProps {
  formData: FormData;
  styleSuggestions: { suggestedTones: unknown[]; suggestedVisualStyles: VisualStyle[] } | null;
  isSuggestingStyle: boolean;
  aiToolPanels: AiToolPanelCategory[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onVisualStyleSelect: (style: VisualStyle) => void;
  onAspectRatioSelect: (ratio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4') => void;
  platform: Platform;
}

export const InputFormVisualSection: React.FC<InputFormVisualSectionProps> = ({
  formData,
  styleSuggestions,
  isSuggestingStyle,
  aiToolPanels,
  onInputChange,
  onVisualStyleSelect,
  onAspectRatioSelect,
  platform,
}) => {
  const { t } = useTranslation();
  const platformSpec = getPlatformVisualSpec(platform);
  const isPlatformSpecific = formData.visualStyle === VisualStyle.PlatformSpecific;

  return (
            <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <label htmlFor="visualStyle" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.visualStyle.label')}</label>
                  <Tooltip text={t('form.visualStyle.tooltip')} />
                </div>
                <select id="visualStyle" name="visualStyle" value={formData.visualStyle} onChange={onInputChange} className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-semibold focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer shadow-sm">
                  {VISUAL_STYLES.map(style => <option key={style} value={style}>{t(`enums.VisualStyle.${style}`)}</option>)}
                </select>
                <SuggestionPills suggestions={styleSuggestions?.suggestedVisualStyles || []} onSelect={onVisualStyleSelect} isLoading={isSuggestingStyle} selectedValue={formData.visualStyle} />
                {isPlatformSpecific && (
                  <p className="text-[11px] leading-relaxed text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-2">
                    {t('form.platformVisual.hint', platformSpec.summaryPl)}
                    {' '}
                    <span className="font-bold">{platformSpec.defaultAspectRatio}</span>
                  </p>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <label htmlFor="aspectRatio" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.aspectRatio.label')}</label>
                  <Tooltip text={t('form.aspectRatio.tooltip')} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(isPlatformSpecific ? platformSpec.allowedAspectRatios : ["1:1", "16:9", "9:16", "4:3", "3:4"]).map(ratio => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => onAspectRatioSelect(ratio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4')}
                      className={`min-h-[40px] px-3 py-2 text-xs font-semibold rounded-lg border transition-all touch-manipulation ${(formData.aspectRatio === ratio || (!formData.aspectRatio && ratio === platformSpec.defaultAspectRatio)) ? 'border-[var(--hero-accent)] bg-[var(--hero-accent)] text-white' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-[var(--hero-accent)]/40'}`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>

                <div className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {t('form.imageQuality.label', 'Jakość grafiki')}
                    </label>
                    <Tooltip text={t('form.imageQuality.tooltip', 'FLUX.2 Pro — feed/lifestyle. Flex — lepsza typografia (LinkedIn, YT).')} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'standard' as const, label: t('form.imageQuality.standard', 'Standard (FLUX Pro)') },
                        { id: 'typography' as const, label: t('form.imageQuality.typography', 'Typography (FLUX Flex)') },
                      ] as const
                    ).map((opt) => {
                      const active =
                        formData.imageQuality === opt.id ||
                        (!formData.imageQuality && opt.id === 'standard');
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            onInputChange({
                              target: { name: 'imageQuality', value: opt.id },
                            } as React.ChangeEvent<HTMLInputElement>)
                          }
                          className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-left touch-manipulation ${
                            active
                              ? 'border-[var(--hero-accent)] bg-[var(--hero-accent-soft)] text-[var(--hero-accent)]'
                              : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-[var(--hero-accent)]/40'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                  <InputFormAiToolsMenu panels={aiToolPanels} label={t('form.quick.aiTools', 'Narzędzia AI')} />
                </div>
              </div>
            </div>

  );
};
