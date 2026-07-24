import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FormData } from '../../types';
import { Platform } from '../../types';
import { InteractiveEditor } from '../ai/InteractiveEditor';
import { PlatformSelector } from '../PlatformSelector';
import { ToneSelector } from '../ToneSelector';
import { ContentLanguageSelector } from '../ContentLanguageSelector';
import { SparklesIcon } from '../icons/SparklesIcon';
import { GlobeIcon } from '../icons/GlobeIcon';
import { SaveIcon } from '../icons/SaveIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { ModernButton } from '../ui/ModernButton';
import { Tooltip } from '../Tooltip';
import { PresetSelector, type PromptPreset } from './PresetSelector';
import { InputFormAiToolsMenu } from './InputFormAiToolsMenu';
import type { AiToolPanelCategory } from './aiToolPanels';
import { stripTopicHtml } from '../../utils/inputFormMode';
import type { DuplicateCheckResult } from '../../services/contentDuplicateService';
import { formatTimeAgo } from '../../services/contentDuplicateService';
import { getUserNiche } from '../../utils/userNiche';
import {
  matchIndustryPack,
  getAllIndustryPacks,
  getGastroSubNiches,
  applySubNicheToPack,
  type IndustryPack,
} from '../../utils/industryPacks';
import { persistIndustryNiche } from '../../utils/nicheContext';
import { useAuth } from '../../contexts/AuthContext';
import type { IndustrySubNicheDef } from '../../shared/industryPacks';

export interface InputFormQuickFlowProps {
  formData: FormData;
  onTopicChange: (value: string) => void;
  onPlatformChange: (platform: Platform) => void;
  onToneChange: (tone: FormData['tone']) => void;
  onContentLanguageChange: (lang: FormData['contentLanguage']) => void;
  onAudienceChange?: (audience: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSaveDraft: () => void;
  onOpenAssistant: () => void;
  onOpenTechRadar?: () => void;
  onSwitchToAdvanced: () => void;
  onAiAction: (action: string, text: string) => void;
  aiToolPanels: AiToolPanelCategory[];
  isLoading: boolean;
  isDraftSaved: boolean;
  duplicateCheck: DuplicateCheckResult | null;
  onDismissDuplicate: () => void;
  autoPublishSection?: React.ReactNode;
}

export const InputFormQuickFlow: React.FC<InputFormQuickFlowProps> = ({
  formData,
  onTopicChange,
  onPlatformChange,
  onToneChange,
  onContentLanguageChange,
  onAudienceChange,
  onSubmit,
  onSaveDraft,
  onOpenAssistant,
  onOpenTechRadar,
  onSwitchToAdvanced,
  onAiAction,
  aiToolPanels,
  isLoading,
  isDraftSaved,
  duplicateCheck,
  onDismissDuplicate,
  autoPublishSection,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [activeSub, setActiveSub] = useState<IndustrySubNicheDef | null>(null);

  const niche = formData.audience?.trim() || getUserNiche(user?.id);
  const matchedPack = matchIndustryPack(niche);
  const basePack: IndustryPack = matchedPack ?? getAllIndustryPacks()[0];
  const gastroSubs = basePack.id === 'pl-lokal' ? getGastroSubNiches() : [];

  React.useEffect(() => {
    if (matchedPack?.subNicheId) {
      setActiveSub(getGastroSubNiches().find((s) => s.id === matchedPack.subNicheId) ?? null);
    }
  }, [matchedPack?.subNicheId, matchedPack?.id]);

  const ideaPack: IndustryPack =
    activeSub && basePack.id === 'pl-lokal'
      ? applySubNicheToPack(basePack, activeSub)
      : basePack;
  const topicIdeas = ideaPack.topicIdeas.slice(0, 8);

  const applyPackContext = (pack: IndustryPack) => {
    const label = persistIndustryNiche(pack, user?.id, formData.audience);
    onAudienceChange?.(label);
    onPlatformChange(pack.platform);
    onToneChange(pack.tone);
  };

  const applyIndustryIdea = (idea: string) => {
    onTopicChange(`<p>${idea}</p>`);
    applyPackContext(ideaPack);
  };

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
    <form onSubmit={onSubmit} className="space-y-6">
      <nav aria-label={t('form.quick.stepsAria', 'Kroki formularza')} className="flex items-center justify-center gap-1.5 sm:gap-3 flex-wrap">
        {STEPS.map((s, i) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <React.Fragment key={s.id}>
              {i > 0 && (
                <div
                  className={`hidden sm:block h-0.5 w-8 rounded ${done ? 'bg-[var(--hero-accent)]' : 'bg-slate-200 dark:bg-slate-700'}`}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (s.id < step || (s.id === 2 && canGoStep2) || s.id === 1) setStep(s.id);
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-lg text-[11px] sm:text-xs font-bold transition-colors ${
                  active
                    ? 'bg-[var(--hero-accent)] text-white shadow-sm'
                    : done
                      ? 'bg-[var(--hero-accent-soft)] text-[var(--hero-accent)] border border-[var(--hero-accent)]/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black ${
                    active ? 'bg-white/20' : done ? 'bg-[var(--hero-accent)] text-white' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  {done ? '✓' : s.id}
                </span>
                <span>{s.label}</span>
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
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {onOpenTechRadar && (
                <button
                  type="button"
                  onClick={onOpenTechRadar}
                  className="flex items-center gap-2 text-xs font-bold text-[var(--hero-accent)] bg-[var(--hero-accent-soft)] px-3 py-1.5 rounded-lg border border-[var(--hero-accent)]/25"
                >
                  <GlobeIcon className="w-4 h-4" />
                  {t('form.techRadar.quickButton', 'Znajdź nowinki w niszy')}
                </button>
              )}
              <button
                type="button"
                onClick={onOpenAssistant}
                className="flex items-center gap-2 text-xs font-bold text-[var(--hero-accent)] bg-[var(--hero-accent-soft)] px-3 py-1.5 rounded-lg border border-[var(--hero-accent)]/25"
              >
                <SparklesIcon className="w-4 h-4" />
                {t('form.topic.assistant', 'Asystent AI')}
              </button>
              <InputFormAiToolsMenu panels={aiToolPanels} variant="compact" label={t('form.quick.aiTools', 'Narzędzia AI')} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-900/30 focus-within:border-[var(--hero-accent)]/45 focus-within:ring-2 focus-within:ring-[var(--hero-accent)]/15 transition-colors">
            <InteractiveEditor
              id="topic-quick"
              ariaLabel={t('form.topic.label', 'Temat')}
              value={formData.topic}
              onChange={onTopicChange}
              onAction={onAiAction}
              isLoading={isLoading}
              formData={formData}
              className="w-full text-sm min-h-[140px]"
              lite
            />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              {matchedPack
                ? t('form.quick.industryIdeas', 'Pomysły dla {{pack}}', {
                    pack: ideaPack.subNicheLabel
                      ? `${matchedPack.name} · ${ideaPack.subNicheLabel}`
                      : matchedPack.name,
                  })
                : t('form.quick.pickIndustryIdea', 'Gotowe pomysły branżowe')}
            </p>
            {gastroSubs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {gastroSubs.map((sub) => {
                  const selected = activeSub?.id === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        const next = selected ? null : sub;
                        setActiveSub(next);
                        const pack = next
                          ? applySubNicheToPack(basePack, next)
                          : basePack;
                        applyPackContext(pack);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md border ${
                        selected
                          ? 'border-[var(--hero-accent)] text-[var(--hero-accent)] bg-[var(--hero-accent-soft)]'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span aria-hidden>{sub.icon}</span>
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {topicIdeas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => applyIndustryIdea(idea)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:border-[var(--hero-accent)]/45 hover:text-[var(--hero-accent)] transition-colors text-left"
                >
                  {idea.length > 52 ? `${idea.slice(0, 50)}…` : idea}
                </button>
              ))}
            </div>
            {!matchedPack && (
              <div className="flex flex-wrap gap-2 pt-1">
                {getAllIndustryPacks().map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => {
                      onTopicChange(`<p>${pack.topicIdeas[0]}</p>`);
                      applyPackContext(pack);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[var(--hero-accent)]/40"
                  >
                    <span aria-hidden>{pack.icon}</span>
                    {pack.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {duplicateCheck?.mostSimilar && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg">
              <span className="text-amber-600 dark:text-amber-400 shrink-0 text-xs font-black" aria-hidden>!</span>
              <div className="flex-1 min-w-0 text-xs text-amber-800 dark:text-amber-300">
                {t('form.quick.duplicateWarning', 'Podobny post w historii')} ({Math.round(duplicateCheck.mostSimilar.similarity * 100)}%) —{' '}
                {formatTimeAgo(duplicateCheck.mostSimilar.timestamp)}
              </div>
              <button type="button" onClick={onDismissDuplicate} className="text-amber-500 text-xs font-bold" aria-label={t('common.close', 'Zamknij')}>
                ×
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

      {/* Step 2: Platform & Tone */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <PresetSelector
            currentPlatform={formData.platform}
            currentTone={formData.tone}
            currentLanguage={formData.contentLanguage}
            onApplyPreset={(preset) => {
              onPlatformChange(preset.platform);
              onToneChange(preset.tone);
              onContentLanguageChange(preset.contentLanguage);
            }}
          />
          <fieldset className="space-y-3">
            <legend className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {t('form.platform.label', 'Platforma')}
            </legend>
            <PlatformSelector mode="single" value={formData.platform} onChange={(newValue) => onPlatformChange(newValue as Platform)} />
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {t('form.tone.label', 'Ton')}
            </legend>
            <ToneSelector selectedTone={formData.tone} onSelect={onToneChange} />
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="w-full flex items-center gap-2">
              <span className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {t('form.contentLanguage.label', 'Język treści posta')}
              </span>
              <Tooltip text={t('form.contentLanguage.tooltip', 'Język wygenerowanej treści — niezależny od języka menu.')} />
            </legend>
            <ContentLanguageSelector
              selected={formData.contentLanguage}
              onSelect={onContentLanguageChange}
              disabled={isLoading}
            />
          </fieldset>

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
        <div className="space-y-5 animate-fade-in">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/70 dark:border-white/10 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.quick.summary', 'Podsumowanie')}</h3>
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

          <p className="text-xs text-slate-500 text-center leading-relaxed">
            {t('form.quick.needAdvanced', 'Potrzebujesz kampanii, wideo lub A/B testu?')}{' '}
            <button type="button" onClick={onSwitchToAdvanced} className="text-[var(--hero-accent)] font-semibold hover:underline">
              {t('form.quick.switchToAdvanced', 'Przełącz na tryb zaawansowany')}
            </button>
          </p>

          {autoPublishSection}

          <div className="sticky bottom-20 sm:bottom-4 z-20 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl p-3 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-3">
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
                className="shadow-md"
              >
                {isLoading ? t('common.generating', 'Generowanie…') : t('common.generate', 'Generuj post')}
              </ModernButton>
            </div>
          </div>
        </div>
      )}

      {/* Quick mode defaults to post+image; YouTube selection switches to video via handlePlatformChange */}
    </form>
  );
};
