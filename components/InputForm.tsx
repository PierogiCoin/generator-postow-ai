import React from 'react';
import { useTranslation } from 'react-i18next';
import { GENERATION_TYPES } from '../constants';
import type { FormData, CampaignHistoryItem, FavoritePost } from '../types';
import { Platform, GenerationType, VisualStyle } from '../types';
import { PlatformSelector } from './PlatformSelector';
import { SparklesIcon } from './icons/SparklesIcon';
import * as geminiService from '../services/geminiService';
import { SaveIcon } from './icons/SaveIcon';
import { ToneSelector } from './ToneSelector';
import { ContentLanguageSelector } from './ContentLanguageSelector';
import { PhotoIcon } from './icons/PhotoIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { BulbIcon } from './icons/BulbIcon';
import { InteractiveEditor } from './ai/InteractiveEditor';
import { CampaignIcon } from './icons/CampaignIcon';
import { InspirationBanner } from './InspirationBanner';
import { CheckIcon } from './icons/CheckIcon';
import { CollectionIcon } from './icons/CollectionIcon';
import { Tooltip } from './Tooltip';
import { PersonaDisplay } from './PersonaDisplay';
import { BeakerIcon } from './icons/BeakerIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { LayersIcon } from './icons/LayersIcon';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { NotificationType } from '../types';
import { ModernButton } from './ui/ModernButton';
import { ModernInput } from './ui/ModernInput';
import { ModernCard } from './ui/ModernCard';
import { Spinner } from './ui/LoadingStates';
import { SuggestionPills } from './inputForm/SuggestionPills';
import { InputFormVisualSection } from './inputForm/InputFormVisualSection';
import { InputFormAdvancedOptions } from './inputForm/InputFormAdvancedOptions';
import { InputFormModals } from './inputForm/InputFormModals';
import { InputFormModeToggle } from './inputForm/InputFormModeToggle';
import { InputFormQuickFlow } from './inputForm/InputFormQuickFlow';
import { AutoPublishSection } from './inputForm/AutoPublishSection';
import { OnboardingFirstPostBanner } from './inputForm/OnboardingFirstPostBanner';
import { SessionRecoveryBanner } from './inputForm/SessionRecoveryBanner';
import { DuplicateContentAlert } from './inputForm/DuplicateContentAlert';
import { InputFormVideoConfig } from './inputForm/InputFormVideoConfig';
import { InputFormBrandAssetsSection } from './inputForm/InputFormBrandAssetsSection';
import { InputFormSection } from './inputForm/InputFormSection';
import { GenerationTypeGrid } from './inputForm/GenerationTypeGrid';
import { getPlatformVisualSpec } from '../utils/platformVisualSpec';
import { useInputFormController } from '../hooks/useInputFormController';

interface InputFormProps {
  prefillData: Partial<FormData> | null;
  onPrefillConsumed: () => void;
  autoGenerateSlot?: boolean;
  onAutoGenerateConsumed?: () => void;
}

export const InputForm: React.FC<InputFormProps> = ({
  prefillData,
  onPrefillConsumed,
  autoGenerateSlot = false,
  onAutoGenerateConsumed,
}) => {
  const { t } = useTranslation();
  const {
    formData,
    setFormData,
    formMode,
    handleModeChange,
    hasStoredDraft,
    handleRestoreDraft,
    handleDiscardStoredDraft,
    autoSaveStatus,
    lastSaved,
    isDraftSaved,
    handleSaveDraft,
    showFirstPostBanner,
    setShowFirstPostBanner,
    duplicateCheck,
    setDuplicateCheck,
    persona,
    setPersona,
    isGeneratingPersona,
    styleSuggestions,
    isSuggestingStyle,
    selectedTemplate,
    templates,
    isCampaignMode,
    isBrandVoiceEnabled,
    showVisualStyle,
    showContentType,
    brandVoiceDescription,
    brandVoiceProfiles,
    activeBrandVoiceId,
    inspiration,
    selectInspiration,
    isLoading,
    user,
    currentTeamId,
    handleSubmit,
    handleInputChange,
    handleRichTextChange,
    handlePlatformChange,
    handleGenerationTypeChange,
    handleSelectTemplate,
    handleSaveTemplate,
    handleEditTemplate,
    handleDeleteTemplate,
    handleImageForVideoChange,
    handleGeneratePersona,
    handleApplySuggestion,
    handleAddTechNewsToCalendar,
    handleAutoPublishToggle,
    handleAutoOptimizeToggle,
    showAutoPublishOption,
    templateToEdit,
    setTemplateToEdit,
    isSaveModalOpen,
    setIsSaveModalOpen,
    isTemplateBrowserOpen,
    setIsTemplateBrowserOpen,
    isAssistantModalOpen,
    setIsAssistantModalOpen,
    isReverseImageOpen,
    setIsReverseImageOpen,
    isTrendAnalysisOpen,
    setIsTrendAnalysisOpen,
    isTechRadarOpen,
    setIsTechRadarOpen,
    isScheduleOptimizerOpen,
    setIsScheduleOptimizerOpen,
    isAIWorkflowOpen,
    setIsAIWorkflowOpen,
    isContentSafetyOpen,
    setIsContentSafetyOpen,
    isRepurposingOpen,
    setIsRepurposingOpen,
    isCrossPlatformOpen,
    setIsCrossPlatformOpen,
    isSocialMediaOpen,
    setIsSocialMediaOpen,
    isOmniOpen,
    setIsOmniOpen,
    aiToolPanels,
    handlers,
    setIsBrandVoiceManagerOpen,
    genActions,
    addToast,
  } = useInputFormController({
    prefillData,
    onPrefillConsumed,
    autoGenerateSlot,
    onAutoGenerateConsumed,
  });

  const generationTypeConfig: Record<
    GenerationType,
    { label: string; icon: React.ComponentType<{ className?: string }>; description: string }
  > = {
    [GenerationType.PostWithImage]: {
      label: t('generationTypes.PostWithImage'),
      icon: PhotoIcon,
      description: 'Post z grafiką AI',
    },
    [GenerationType.Video]: {
      label: t('generationTypes.Video'),
      icon: VideoCameraIcon,
      description: 'Wideo 16:9 / 9:16',
    },
    [GenerationType.Idea]: { label: t('generationTypes.Idea'), icon: BulbIcon, description: 'Kreatywne koncepty' },
    [GenerationType.Campaign]: {
      label: t('generationTypes.Campaign'),
      icon: CampaignIcon,
      description: 'Strategia wielokanałowa',
    },
    [GenerationType.ABTest]: { label: t('generationTypes.ABTest'), icon: BeakerIcon, description: 'Dwa warianty treści' },
    [GenerationType.SeriesFollowUp]: {
      label: t('generationTypes.SeriesFollowUp'),
      icon: CollectionIcon,
      description: 'Część 2 lub pogłębienie',
    },
    [GenerationType.Omnichannel]: { label: 'Omnichannel', icon: GlobeIcon, description: 'Wszystkie kanały na raz' },
  };

  const repurposeAsConfig: Record<
    GenerationType,
    { label: string; icon: React.ComponentType<{ className?: string }>; description: string }
  > = {
    [GenerationType.PostWithImage]: {
      label: t('repurposeAs.PostWithImage'),
      icon: PhotoIcon,
      description: 'Adaptacja na post',
    },
    [GenerationType.Video]: { label: t('repurposeAs.Video'), icon: VideoCameraIcon, description: 'Adaptacja na wideo' },
    [GenerationType.Idea]: { label: t('repurposeAs.Idea'), icon: BulbIcon, description: 'Burza mózgów na bazie posta' },
    [GenerationType.Campaign]: {
      label: t('repurposeAs.Campaign'),
      icon: CampaignIcon,
      description: 'Pełna strategia z posta',
    },
    [GenerationType.ABTest]: { label: t('repurposeAs.ABTest'), icon: BeakerIcon, description: 'Stwórz testy porównawcze' },
    [GenerationType.SeriesFollowUp]: {
      label: t('repurposeAs.SeriesFollowUp'),
      icon: CollectionIcon,
      description: 'Wygeneruj kolejną część',
    },
    [GenerationType.Omnichannel]: { label: 'Omnichannel', icon: GlobeIcon, description: 'Rozszerz na wszystkie kanały' },
  };

  const autoPublishSection = showAutoPublishOption ? (
    <AutoPublishSection
      formData={formData}
      userId={user?.id}
      disabled={isLoading}
      onToggleAutoPublish={handleAutoPublishToggle}
      onToggleAutoOptimize={handleAutoOptimizeToggle}
    />
  ) : null;

  const typeConfigs = inspiration && 'result' in inspiration ? repurposeAsConfig : generationTypeConfig;

  return (
    <>
      <div id="input-form-anchor">
      <ModernCard className="p-4 sm:p-6 lg:p-7 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70 rounded-lg">
        {(showFirstPostBanner || hasStoredDraft) && (
          <div className="mb-5 space-y-3">
            {showFirstPostBanner && (
              <OnboardingFirstPostBanner onDismiss={() => setShowFirstPostBanner(false)} />
            )}
            {hasStoredDraft && (
              <SessionRecoveryBanner
                onRestore={handleRestoreDraft}
                onDiscard={handleDiscardStoredDraft}
              />
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-5 border-b border-slate-200/60 dark:border-white/10">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-1"
              style={{ color: 'var(--hero-accent)' }}
            >
              {t('form.workspaceLabel', 'Workspace')}
            </p>
            <InputFormModeToggle mode={formMode} onChange={handleModeChange} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs sm:text-right leading-relaxed">
            {formMode === 'quick'
              ? t('form.mode.quickHint')
              : t('form.mode.advancedHint', 'Pełna kontrola: typ, ton, wizualia i Brand Voice.')}
          </p>
        </div>

        {inspiration && 'result' in inspiration && (
          <div className="mb-5">
            <InspirationBanner inspiration={inspiration as CampaignHistoryItem | FavoritePost} onClear={() => selectInspiration(null)} />
          </div>
        )}

        {formMode === 'quick' ? (
          <InputFormQuickFlow
            formData={formData}
            onTopicChange={handleRichTextChange}
            onPlatformChange={handlePlatformChange}
            onToneChange={(tone) => setFormData((p) => ({ ...p, tone }))}
            onContentLanguageChange={(contentLanguage) => setFormData((p) => ({ ...p, contentLanguage }))}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
            onOpenAssistant={() => setIsAssistantModalOpen(true)}
            onOpenTechRadar={() => setIsTechRadarOpen(true)}
            onSwitchToAdvanced={() => handleModeChange('advanced')}
            onAiAction={(action, text) => {
              void handlers.handleAIAssistantAction(action as Parameters<typeof handlers.handleAIAssistantAction>[0], text, formData.topic, formData);
            }}
            aiToolPanels={aiToolPanels}
            isLoading={isLoading}
            isDraftSaved={isDraftSaved}
            duplicateCheck={duplicateCheck}
            onDismissDuplicate={() => setDuplicateCheck(null)}
            autoPublishSection={autoPublishSection}
          />
        ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Temat — najważniejsze pole */}
          <InputFormSection
            step={1}
            title={t('form.sections.topic', 'Temat')}
            description={t('form.sections.topicDesc', 'Opisz, o czym ma być treść — reszta ustawień dopasuje się do tego.')}
          >
            <div className="flex items-center justify-end gap-2 mb-3 flex-wrap">
              <button
                type="button"
                onClick={async () => {
                  const text = prompt(t('form.topic.repurposePrompt', 'Wklej tekst lub URL, aby wyciągnąć z niego temat:'));
                  if (text) {
                    genActions.setProgress(t('form.topic.analyzing', 'Analizowanie inspiracji…'));
                    try {
                      const extracted = await geminiService.generateContent({
                        model: 'gemini-1.5-flash',
                        contents: `Extract a concise, engaging social media post topic from this text: "${text.substring(0, 2000)}". Return ONLY the topic string.`
                      }, user?.id);
                      setFormData(p => ({ ...p, topic: extracted.text ?? '' }));
                    } catch (e: unknown) {
                      addToast(e instanceof Error ? e.message : t('form.topic.extractError', 'Błąd ekstrakcji tematu'), NotificationType.Error);
                    } finally {
                      genActions.setProgress(null);
                    }
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[var(--hero-accent)] bg-white/70 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-white/10"
                title={t('form.topic.repurposeTooltip', 'Wklej tekst aby wyciągnąć temat')}
              >
                <LayersIcon className="w-3.5 h-3.5" />
                {t('form.topic.repurpose', 'Smart Repurpose')}
              </button>
              <button
                type="button"
                onClick={() => setIsAssistantModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-[var(--hero-accent)] bg-[var(--hero-accent-soft)] px-2.5 py-1.5 rounded-lg border border-[var(--hero-accent)]/25"
                title={t('form.topic.assistantTooltip')}
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                {t('form.topic.assistant', 'Asystent AI')}
              </button>
            </div>
            <div className="rounded-lg border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-950/40 focus-within:border-[var(--hero-accent)]/45 focus-within:ring-2 focus-within:ring-[var(--hero-accent)]/15 transition-all">
              <InteractiveEditor
                id="topic"
                ariaLabel={t('form.topic.label')}
                value={formData.topic}
                onChange={handleRichTextChange}
                onAction={handlers.handleAIAssistantAction}
                isLoading={isLoading}
                formData={formData}
                className="w-full text-sm min-h-[140px]"
                lite
              />
            </div>
            {duplicateCheck?.mostSimilar && (
              <div className="mt-3">
                <DuplicateContentAlert
                  duplicateCheck={duplicateCheck}
                  onDismiss={() => setDuplicateCheck(null)}
                />
              </div>
            )}
          </InputFormSection>

          {/* 2. Platforma + typ */}
          <InputFormSection
            step={2}
            title={t('form.sections.format', 'Platforma i format')}
            description={t('form.sections.formatDesc', 'Gdzie publikujesz i jaki typ treści generujemy.')}
          >
            <fieldset className="space-y-3 mb-5">
              <legend className="w-full flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isCampaignMode ? t('form.platform.label_plural') : t('form.platform.label')}
                </span>
                <Tooltip text={t('form.platform.tooltip')} />
              </legend>
              <PlatformSelector
                mode={isCampaignMode ? 'multiple' : 'single'}
                value={isCampaignMode ? (formData.campaignPlatforms || [Platform.Facebook]) : formData.platform}
                onChange={(newValue) => {
                  if (isCampaignMode) {
                    setFormData(p => ({ ...p, campaignPlatforms: newValue as Platform[] }));
                  } else {
                    handlePlatformChange(newValue as Platform);
                  }
                }}
              />
            </fieldset>

            <fieldset className="space-y-3 mb-5">
              <legend className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {inspiration && 'result' in inspiration
                  ? t('generationTypes.RepurposeAs')
                  : t('form.sections.generationType', 'Typ generacji')}
              </legend>
              <GenerationTypeGrid
                types={GENERATION_TYPES}
                configs={typeConfigs}
                selected={formData.generationType}
                platform={formData.platform}
                onSelect={handleGenerationTypeChange}
              />
            </fieldset>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span id="template-label" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('form.template.label')}</span>
                <Tooltip text={t('form.template.tooltip')} />
              </div>
              <div className="flex gap-2 items-center" role="group" aria-labelledby="template-label">
                <div className="flex-grow px-3.5 h-11 border border-slate-200/70 dark:border-white/10 rounded-xl bg-white/70 dark:bg-slate-950/40 text-sm text-slate-700 dark:text-slate-300 truncate flex items-center font-medium">
                  {selectedTemplate ? templates.find(tmpl => tmpl.id === selectedTemplate)?.name : t('common.newPost')}
                </div>
                <button type="button" onClick={() => setIsTemplateBrowserOpen(true)} className="w-11 h-11 flex items-center justify-center bg-white/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 rounded-xl hover:border-[var(--hero-accent)]/40 text-slate-500" title={t('form.template.browse')} aria-label={t('form.template.browse', 'Przeglądaj szablony')}>
                  <CollectionIcon className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => { setTemplateToEdit(null); setIsSaveModalOpen(true); }} className="w-11 h-11 flex items-center justify-center bg-white/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 rounded-xl hover:border-[var(--hero-accent)]/40 text-slate-500" title={t('form.template.saveNew')} aria-label={t('form.template.saveNew', 'Zapisz jako nowy szablon')}>
                  <SaveIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </InputFormSection>

          {/* 3. Głos i kontekst */}
          <InputFormSection
            step={3}
            title={isCampaignMode ? t('form.sections.campaign', 'Strategia kampanii') : t('form.sections.voice', 'Głos i odbiorca')}
            description={
              isCampaignMode
                ? t('form.sections.campaignDesc', 'Cel i długość kampanii wielokanałowej.')
                : t('form.sections.voiceDesc', 'Dla kogo piszesz, w jakim tonie i języku.')
            }
          >
            {isCampaignMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ModernInput
                  label={t('form.campaignGoal.label')}
                  id="campaignGoal"
                  name="campaignGoal"
                  value={formData.campaignGoal || ''}
                  onChange={handleInputChange}
                  placeholder={t('form.campaignGoal.placeholder')}
                  fullWidth
                  required
                />
                <ModernInput
                  type="number"
                  label={t('form.campaignDuration.label')}
                  id="campaignDuration"
                  name="campaignDuration"
                  value={String(formData.campaignDuration || 7)}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label htmlFor="audience" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('form.audience.label')}</label>
                      <Tooltip text={t('form.audience.tooltip')} />
                    </div>
                    <button type="button" onClick={handleGeneratePersona} disabled={!formData.audience.trim() || isGeneratingPersona} className="text-xs font-bold text-[var(--hero-accent)] hover:underline disabled:opacity-50 flex items-center gap-1.5">
                      {isGeneratingPersona ? <Spinner size="sm" /> : <><SparklesIcon className="w-3.5 h-3.5" /> {t('form.audience.persona', 'Persona AI')}</>}
                    </button>
                  </div>
                  <ModernInput
                    id="audience"
                    name="audience"
                    value={formData.audience}
                    onChange={handleInputChange}
                    placeholder={t('form.audience.placeholder')}
                    fullWidth
                    required
                  />
                  {persona && <PersonaDisplay persona={persona} onClose={() => setPersona(null)} />}
                </div>
                <fieldset className="space-y-3">
                  <legend className="w-full flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('form.contentLanguage.label')}</span>
                    <Tooltip text={t('form.contentLanguage.tooltip')} />
                  </legend>
                  <ContentLanguageSelector
                    selected={formData.contentLanguage}
                    onSelect={(contentLanguage) => setFormData((p) => ({ ...p, contentLanguage }))}
                    disabled={isLoading}
                  />
                </fieldset>
                <fieldset className="space-y-3 xl:col-span-2">
                  <legend className="w-full flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('form.tone.label')}</span>
                    <Tooltip text={t('form.tone.tooltip')} />
                  </legend>
                  <ToneSelector selectedTone={formData.tone} onSelect={(tone) => setFormData(p => ({ ...p, tone }))} />
                  <SuggestionPills suggestions={styleSuggestions?.suggestedTones || []} onSelect={(v) => setFormData(p => ({ ...p, tone: v }))} isLoading={isSuggestingStyle} selectedValue={formData.tone} />
                </fieldset>
              </div>
            )}
          </InputFormSection>

          {/* 4. Media — tylko gdy potrzebne */}
          {(formData.generationType === GenerationType.Video || showVisualStyle) && (
            <InputFormSection
              step={4}
              title={
                formData.generationType === GenerationType.Video
                  ? t('form.sections.video', 'Ustawienia wideo')
                  : t('form.sections.visual', 'Wizualia')
              }
              description={
                formData.generationType === GenerationType.Video
                  ? t('form.sections.videoDesc', 'Transkrypt, proporcje i obraz referencyjny.')
                  : t('form.sections.visualDesc', 'Styl grafiki i proporcje pod platformę.')
              }
            >
              {formData.generationType === GenerationType.Video && (
                <InputFormVideoConfig
                  formData={formData}
                  onInputChange={handleInputChange}
                  onImageForVideoChange={handleImageForVideoChange}
                />
              )}
              {showVisualStyle && (
                <InputFormVisualSection
                  formData={formData}
                  styleSuggestions={styleSuggestions}
                  isSuggestingStyle={isSuggestingStyle}
                  aiToolPanels={aiToolPanels}
                  onInputChange={handleInputChange}
                  onVisualStyleSelect={(v) =>
                    setFormData((p) => ({
                      ...p,
                      visualStyle: v,
                      aspectRatio:
                        v === VisualStyle.PlatformSpecific
                          ? getPlatformVisualSpec(p.platform).defaultAspectRatio
                          : p.aspectRatio,
                    }))
                  }
                  onAspectRatioSelect={(ratio) => setFormData((p) => ({ ...p, aspectRatio: ratio }))}
                  platform={formData.platform}
                />
              )}
            </InputFormSection>
          )}

          <InputFormAdvancedOptions
            formData={formData}
            showContentType={showContentType}
            onInputChange={handleInputChange}
            onGenerationModeChange={(mode) => setFormData((p) => ({ ...p, generationMode: mode }))}
          />

          {isBrandVoiceEnabled && (
            <InputFormBrandAssetsSection
              profiles={brandVoiceProfiles}
              activeProfileId={activeBrandVoiceId}
              includeLogo={formData.includeLogo}
              useMascot={formData.useMascot}
              onSetActive={handlers.handleSetActiveBrandVoice}
              onManage={() => setIsBrandVoiceManagerOpen(true)}
              onToggleLogo={() =>
                setFormData((p) => ({ ...p, includeLogo: !p.includeLogo }))
              }
              onSetUseMascot={(value) => setFormData((p) => ({ ...p, useMascot: value }))}
            />
          )}

          {autoPublishSection && (
            <div className="rounded-lg border border-slate-200/70 dark:border-white/10 bg-slate-50/30 dark:bg-slate-950/20 p-4 sm:p-5">
              {autoPublishSection}
            </div>
          )}

          <div className="sticky bottom-20 sm:bottom-4 z-20 -mx-1 px-1 pt-2">
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl p-3 sm:p-4 shadow-lg space-y-3">
              {formData?.topic?.trim() && (
                <div className="flex justify-end">
                  <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <ModernButton
                  onClick={handleSaveDraft}
                  variant="secondary"
                  size="lg"
                  disabled={isLoading || !(formData?.topic || "").trim() || isDraftSaved}
                  fullWidth
                  icon={isDraftSaved ? <CheckIcon className="w-5 h-5" /> : <SaveIcon className="w-5 h-5" />}
                >
                  {isDraftSaved ? t('form.buttons.draftSaved') : t('form.buttons.saveDraft')}
                </ModernButton>
                <ModernButton
                  type="submit"
                  variant="gradient"
                  size="lg"
                  disabled={isLoading}
                  fullWidth
                  icon={isLoading ? (
                    <div className="w-5 h-5 relative">
                      <div className="absolute inset-0 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  ) : (
                    <SparklesIcon className="w-5 h-5" />
                  )}
                  className="min-h-[52px] sm:min-h-[56px] text-base font-bold touch-manipulation shadow-md"
                >
                  {isLoading ? t('common.generating') : t('common.generate')}
                </ModernButton>
              </div>
            </div>
          </div>
        </form>
        )}
      </ModernCard>
      </div>
      <InputFormModals
        formData={formData}
        brandVoiceDescription={brandVoiceDescription}
        templates={templates}
        currentTeamId={currentTeamId}
        templateToEdit={templateToEdit}
        isSaveModalOpen={isSaveModalOpen}
        isTemplateBrowserOpen={isTemplateBrowserOpen}
        isAssistantModalOpen={isAssistantModalOpen}
        isReverseImageOpen={isReverseImageOpen}
        isTrendAnalysisOpen={isTrendAnalysisOpen}
        isTechRadarOpen={isTechRadarOpen}
        isScheduleOptimizerOpen={isScheduleOptimizerOpen}
        isAIWorkflowOpen={isAIWorkflowOpen}
        isContentSafetyOpen={isContentSafetyOpen}
        isRepurposingOpen={isRepurposingOpen}
        isCrossPlatformOpen={isCrossPlatformOpen}
        isSocialMediaOpen={isSocialMediaOpen}
        isOmniOpen={isOmniOpen}
        onCloseSaveModal={() => setIsSaveModalOpen(false)}
        onCloseTemplateBrowser={() => setIsTemplateBrowserOpen(false)}
        onCloseAssistant={() => setIsAssistantModalOpen(false)}
        onCloseReverseImage={() => setIsReverseImageOpen(false)}
        onCloseTrendAnalysis={() => setIsTrendAnalysisOpen(false)}
        onCloseTechRadar={() => setIsTechRadarOpen(false)}
        onCloseScheduleOptimizer={() => setIsScheduleOptimizerOpen(false)}
        onCloseAIWorkflow={() => setIsAIWorkflowOpen(false)}
        onCloseContentSafety={() => setIsContentSafetyOpen(false)}
        onCloseRepurposing={() => setIsRepurposingOpen(false)}
        onCloseCrossPlatform={() => setIsCrossPlatformOpen(false)}
        onCloseSocialMedia={() => setIsSocialMediaOpen(false)}
        onCloseOmni={() => setIsOmniOpen(false)}
        onSaveTemplate={handleSaveTemplate}
        onSelectTemplate={handleSelectTemplate}
        onEditTemplate={handleEditTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onApplySuggestion={handleApplySuggestion}
        onReverseImageSelect={(_prompt, caption) => {
          if (caption) setFormData((p) => ({ ...p, topic: caption }));
        }}
        onTrendSelect={(topic) => setFormData((p) => ({ ...p, topic }))}
        onScheduleSelect={() => setIsScheduleOptimizerOpen(false)}
        onAddTechNewsToCalendar={handleAddTechNewsToCalendar}
      />
    </>
  );
};
