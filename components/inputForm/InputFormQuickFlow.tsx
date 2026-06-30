import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FormData } from '../../types';
import { Platform } from '../../types';
import { InteractiveEditor } from '../ai/InteractiveEditor';
import { PlatformSelector } from '../PlatformSelector';
import { ToneSelector } from '../ToneSelector';
import { ContentLanguageSelector } from '../ContentLanguageSelector';
import { SparklesIcon } from '../icons/SparklesIcon';
import { SaveIcon } from '../icons/SaveIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { ModernButton } from '../ui/ModernButton';
import { Tooltip } from '../Tooltip';
import { InputFormAiToolsMenu } from './InputFormAiToolsMenu';
import type { AiToolPanel } from './aiToolPanels';
import { stripTopicHtml } from '../../utils/inputFormMode';
import type { DuplicateCheckResult } from '../../services/contentDuplicateService';
import { formatTimeAgo } from '../../services/contentDuplicateService';

export interface InputFormQuickFlowProps {
  formData: FormData;
  onTopicChange: (value: string) => void;
  onPlatformChange: (platform: Platform) => void;
  onToneChange: (tone: FormData['tone']) => void;
  onContentLanguageChange: (lang: FormData['contentLanguage']) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSaveDraft: () => void;
  onOpenAssistant: () => void;
  onSwitchToAdvanced: () => void;
  onAiAction: (action: string, text: string) => void;
  aiToolPanels: AiToolPanel[];
  isLoading: boolean;
  isDraftSaved: boolean;
  duplicateCheck: DuplicateCheckResult | null;
  onDismissDuplicate: () => void;
}

export const InputFormQuickFlow: React.FC<InputFormQuickFlowProps> = ({
  formData,
  onTopicChange,
  onPlatformChange,
  onToneChange,
  onContentLanguageChange,
  onSubmit,
  onSaveDraft,
  onOpenAssistant,
  onSwitchToAdvanced,
  onAiAction,
  aiToolPanels,
  isLoading,
  isDraftSaved,
  duplicateCheck,
  onDismissDuplicate,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);

  const STEPS = [
    { id: 1, label: t('form.quick.stepTopic', 'Temat') },
    { id: 2, label: t('form.quick.stepPlatform', 'Platforma i ton') },
    { id: 3, label: t('form.quick.stepGenerate', 'Generuj') },
  ] as const;

  const topicPlain = stripTopicHtml(formData.topic);
  const canGoStep2 = topicPlain.length >= 3;

  const goNext = () => {
    if (step === 1 && !canGoStep2) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Step indicator */}
      <nav aria-label="Kroki formularza" className="flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((s, i) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <React.Fragment key={s.id}>
              {i > 0 && (
                <div
                  className={`hidden sm:block h-0.5 w-8 rounded ${done ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (s.id < step || (s.id === 2 && canGoStep2) || s.id === 1) setStep(s.id);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md'
                    : done
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    active ? 'bg-white/20' : done ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  {done ? '✓' : s.id}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Step 1: Topic */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="topic-quick" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {t('form.topic.label', 'O czym ma być post?')}
              </label>
              <Tooltip text={t('form.topic.tooltip', 'Opisz temat — im konkretniej, tym lepszy wynik.')} />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenAssistant}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-800/50"
              >
                <SparklesIcon className="w-4 h-4" />
                Asystent AI
              </button>
              <InputFormAiToolsMenu panels={aiToolPanels} variant="compact" label={t('form.quick.aiTools', 'Narzędzia AI')} />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 focus-within:border-indigo-500 transition-colors">
            <InteractiveEditor
              value={formData.topic}
              onChange={onTopicChange}
              onAction={onAiAction}
              isLoading={isLoading}
              formData={formData}
              className="w-full text-sm min-h-[140px]"
              lite
            />
          </div>

          {duplicateCheck?.mostSimilar && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl">
              <span className="text-amber-500 shrink-0">⚠️</span>
              <div className="flex-1 min-w-0 text-xs text-amber-800 dark:text-amber-300">
                {t('form.quick.duplicateWarning', 'Podobny post w historii')} ({Math.round(duplicateCheck.mostSimilar.similarity * 100)}%) —{' '}
                {formatTimeAgo(duplicateCheck.mostSimilar.timestamp)}
              </div>
              <button type="button" onClick={onDismissDuplicate} className="text-amber-400 text-xs">
                ✕
              </button>
            </div>
          )}

          <div className="flex justify-end">
            <ModernButton type="button" variant="gradient" onClick={goNext} disabled={!canGoStep2}>
              {t('form.quick.next', 'Dalej')} →
            </ModernButton>
          </div>
        </div>
      )}

      {/* Step 2: Platform + tone */}
      {step === 2 && (
        <div className="space-y-8 animate-fade-in">
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {t('form.platform.label', 'Platforma')}
            </span>
            <PlatformSelector mode="single" value={formData.platform} onChange={onPlatformChange} />
          </div>

          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {t('form.tone.label', 'Ton')}
            </span>
            <ToneSelector selectedTone={formData.tone} onSelect={onToneChange} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {t('form.contentLanguage.label', 'Język treści posta')}
              </span>
              <Tooltip text={t('form.contentLanguage.tooltip', 'Język wygenerowanej treści — niezależny od języka menu.')} />
            </div>
            <ContentLanguageSelector
              selected={formData.contentLanguage}
              onSelect={onContentLanguageChange}
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-between gap-3">
            <ModernButton type="button" variant="secondary" onClick={goBack}>
              ← {t('form.quick.back', 'Wstecz')}
            </ModernButton>
            <ModernButton type="button" variant="gradient" onClick={goNext}>
              {t('form.quick.next', 'Dalej')} →
            </ModernButton>
          </div>
        </div>
      )}

      {/* Step 3: Summary + generate */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t('form.quick.summary', 'Podsumowanie')}</h3>
            <div className="space-y-2 text-sm">
              <p className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{t('form.quick.summaryTopic', 'Temat')}: </span>
                {topicPlain.slice(0, 200)}
                {topicPlain.length > 200 ? '…' : ''}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{t('form.quick.summaryPlatform', 'Platforma')}: </span>
                {formData.platform}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{t('form.quick.summaryTone', 'Ton')}: </span>
                {t(`enums.Tone.${formData.tone}`, formData.tone)}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{t('form.quick.summaryType', 'Typ')}: </span>
                {formData.platform === Platform.YouTube
                  ? t('generationTypes.Video', 'Wideo')
                  : t('form.quick.summaryTypeValue', 'Post z grafiką AI')}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            {t('form.quick.needAdvanced', 'Potrzebujesz kampanii, wideo lub A/B testu?')}{' '}
            <button type="button" onClick={onSwitchToAdvanced} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              {t('form.quick.switchToAdvanced', 'Przełącz na tryb zaawansowany')}
            </button>
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <ModernButton type="button" variant="secondary" onClick={goBack} fullWidth>
              ← {t('form.quick.back', 'Wstecz')}
            </ModernButton>
            <ModernButton
              type="button"
              variant="secondary"
              onClick={onSaveDraft}
              disabled={isLoading || !topicPlain || isDraftSaved}
              fullWidth
              icon={isDraftSaved ? <CheckIcon className="w-5 h-5" /> : <SaveIcon className="w-5 h-5" />}
            >
              {isDraftSaved ? t('form.buttons.draftSaved', 'Zapisano') : t('form.buttons.saveDraft', 'Zapisz szkic')}
            </ModernButton>
            <ModernButton
              type="submit"
              variant="gradient"
              disabled={isLoading || !topicPlain}
              fullWidth
              icon={<SparklesIcon className="w-5 h-5" />}
            >
              {isLoading ? t('common.generating', 'Generowanie…') : t('common.generate', 'Generuj post')}
            </ModernButton>
          </div>
        </div>
      )}

      {/* Quick mode defaults to post+image; YouTube selection switches to video via handlePlatformChange */}
    </form>
  );
};
