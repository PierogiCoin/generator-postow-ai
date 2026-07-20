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
    isVideoGeneratorOpen,
    setIsVideoGeneratorOpen,
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

  return (
    <>
      <div id="input-form-anchor">
      <ModernCard className="p-4 sm:p-6 lg:p-8 glass-premium rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] border border-white/10">
        {showFirstPostBanner && (
          <OnboardingFirstPostBanner onDismiss={() => setShowFirstPostBanner(false)} />
        )}
        {hasStoredDraft && (
          <SessionRecoveryBanner
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardStoredDraft}
          />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <InputFormModeToggle mode={formMode} onChange={handleModeChange} />
          {formMode === 'quick' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('form.mode.quickHint')}</p>
          )}
        </div>

        {inspiration && 'result' in inspiration && (
          <div className="mb-8">
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
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            {/* Sekcja głównych opcji: Platforma oraz Typ Generacji */}
            <div className="grid grid-cols-1 gap-6 p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-200/50 dark:border-slate-800">
              <fieldset className="space-y-4">
                <legend className="w-full flex items-center gap-2 mb-1 px-1">
                  <span className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{isCampaignMode ? t('form.platform.label_plural') : t('form.platform.label')}</span>
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

              <fieldset className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
                <legend className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1 mb-3">
                  {inspiration && 'result' in inspiration ? t('generationTypes.RepurposeAs') : 'Typ Generacji'}
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {GENERATION_TYPES.map(type => {
                    const configs = inspiration && 'result' in inspiration ? repurposeAsConfig : generationTypeConfig;
                    if (!configs[type]) return null;
                    const config = configs[type];
                    const isSelected = formData.generationType === type;
                    const isDisabled = formData.platform === Platform.YouTube && type !== GenerationType.Video;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleGenerationTypeChange(type)}
                        disabled={isDisabled}
                        className={`group flex flex-col items-center justify-center p-4 text-center border rounded-2xl transition-all duration-300 relative overflow-hidden ${isSelected ? 'border-cyan-500 bg-slate-900/60 dark:bg-white/5 shadow-xl shadow-cyan-500/10 scale-105 neon-glow-cyan' : 'border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 hover:border-cyan-500/35 hover:scale-105'} ${isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                      >
                        <config.icon className={`w-8 h-8 mb-3 transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'text-cyan-500' : 'text-slate-400'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-tighter leading-none ${isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`}>{config.label}</span>
                        {isSelected && <div className="absolute top-1 right-2"><SparklesIcon className="w-3 h-3 text-cyan-500/60" /></div>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span id="template-label" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.template.label')}</span>
                <Tooltip text={t('form.template.tooltip')} />
              </div>
              <div className="flex gap-3 items-center" role="group" aria-labelledby="template-label">
                <div className="flex-grow px-4 h-12 border border-slate-200/50 dark:border-white/5 rounded-2xl bg-white/40 dark:bg-slate-950/20 text-sm text-slate-700 dark:text-slate-300 truncate flex items-center font-medium">
                  {selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.name : t('common.newPost')}
                </div>
                <button type="button" onClick={() => setIsTemplateBrowserOpen(true)} className="w-12 h-12 flex items-center justify-center bg-slate-100/80 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 text-slate-600 dark:text-slate-400" title={t('form.template.browse')} aria-label={t('form.template.browse', 'Przeglądaj szablony')}>
                  <CollectionIcon className="w-6 h-6" />
                </button>
                <button type="button" onClick={() => { setTemplateToEdit(null); setIsSaveModalOpen(true); }} className="w-12 h-12 flex items-center justify-center bg-slate-100/80 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 text-slate-600 dark:text-slate-400" title={t('form.template.saveNew')} aria-label={t('form.template.saveNew', 'Zapisz jako nowy szablon')}>
                  <SaveIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="group relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="topic" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.topic.label')}</label>
                  <Tooltip text={t('form.topic.tooltip')} />
                </div>
                <div className="flex items-center">
                    <button
                    type="button"
                    onClick={async () => {
                        const text = prompt("Wklej tekst lub URL, aby wyciągnąć z niego temat:");
                        if (text) {
                            genActions.setProgress("Analizowanie inspiracji...");
                            try {
                            const extracted = await geminiService.generateContent({
                                model: 'gemini-1.5-flash',
                                contents: `Extract a concise, engaging social media post topic from this text: "${text.substring(0, 2000)}". Return ONLY the topic string.`
                            }, user?.id);
                            setFormData(p => ({ ...p, topic: extracted.text ?? '' }));
                            } catch (e: unknown) {
                            addToast(e instanceof Error ? e.message : 'Błąd ekstrakcji tematu', NotificationType.Error);
                            } finally {
                            genActions.setProgress(null);
                            }
                        }
                    }}
                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/50 mr-2"
                    title="Wklej tekst aby wyciągnąć temat"
                    >
                    <LayersIcon className="w-4 h-4" />
                    Smart Repurpose
                    </button>
                    <button
                    type="button"
                    onClick={() => setIsAssistantModalOpen(true)}
                    className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-800/50"
                    title={t('form.topic.assistantTooltip')}
                    >
                    <SparklesIcon className="w-4 h-4 animate-pulse" />
                    Asystent AI
                    </button>
                </div>
              </div>
              <div className="relative rounded-[1.5rem] border border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-950/20 focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(0,220,233,0.25)] transition-all duration-300">
                <InteractiveEditor
                  id="topic"
                  ariaLabel="Treść posta"
                  value={formData.topic}
                  onChange={handleRichTextChange}
                  onAction={handlers.handleAIAssistantAction}
                  isLoading={isLoading}
                  formData={formData}
                  className="w-full text-sm min-h-[120px]"
                  lite
                />
              </div>
            </div>
          </div>

          {duplicateCheck?.mostSimilar && (
            <DuplicateContentAlert
              duplicateCheck={duplicateCheck}
              onDismiss={() => setDuplicateCheck(null)}
            />
          )}

          {formData.generationType === GenerationType.Video && (
            <InputFormVideoConfig
              formData={formData}
              onInputChange={handleInputChange}
              onImageForVideoChange={handleImageForVideoChange}
            />
          )}

          {isCampaignMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-900/50">
              <div className="col-span-full flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <CampaignIcon className="w-5 h-5 text-blue-500" />
                </div>
                <h4 className="font-black uppercase tracking-tight text-blue-900 dark:text-blue-200">Strategia Kampanii</h4>
              </div>
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <label htmlFor="audience" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.audience.label')}</label>
                    <Tooltip text={t('form.audience.tooltip')} />
                  </div>
                  <button type="button" onClick={handleGeneratePersona} disabled={!formData.audience.trim() || isGeneratingPersona} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 flex items-center gap-2">
                    {isGeneratingPersona ? <Spinner size="sm" /> : <><SparklesIcon className="w-4 h-4" /> Persona AI</>}
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
              <fieldset className="space-y-4">
                <legend className="w-full flex items-center gap-2 mb-3 px-1">
                  <span className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.contentLanguage.label')}</span>
                  <Tooltip text={t('form.contentLanguage.tooltip')} />
                </legend>
                <ContentLanguageSelector
                  selected={formData.contentLanguage}
                  onSelect={(contentLanguage) => setFormData((p) => ({ ...p, contentLanguage }))}
                  disabled={isLoading}
                />
              </fieldset>
              <fieldset className="space-y-4">
                <legend className="w-full flex items-center gap-2 mb-3 px-1">
                  <span className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.tone.label')}</span>
                  <Tooltip text={t('form.tone.tooltip')} />
                </legend>
                <ToneSelector selectedTone={formData.tone} onSelect={(tone) => setFormData(p => ({ ...p, tone }))} />
                <SuggestionPills suggestions={styleSuggestions?.suggestedTones || []} onSelect={(v) => setFormData(p => ({ ...p, tone: v }))} isLoading={isSuggestingStyle} selectedValue={formData.tone} />
              </fieldset>
            </div>
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
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
              {autoPublishSection}
            </div>
          )}

          {formData?.topic?.trim() && (
            <div className="flex justify-end pt-2">
              <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />
            </div>
          )}

            <div className="flex flex-col sm:flex-row gap-6 pt-6">
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
                  <div className="w-5 h-5 sm:w-6 sm:h-6 relative">
                    <div className="absolute inset-0 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <div className="absolute inset-1 bg-white/20 rounded-full animate-pulse"></div>
                  </div>
                ) : (
                  <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                )}
                className={`min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-bold touch-manipulation transition-all duration-300 ${isLoading ? 'animate-pulse shadow-lg shadow-purple-500/25' : 'hover:shadow-lg hover:shadow-purple-500/25'}`}
              >
                <span className={isLoading ? 'animate-pulse' : ''}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      {t('common.generating')}
                      <span className="inline-flex gap-1">
                        <span className="w-1 h-1 bg-white rounded-full animate-bounce"></span>
                        <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                        <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      </span>
                    </span>
                  ) : t('common.generate')}
                </span>
              </ModernButton>
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
        isVideoGeneratorOpen={isVideoGeneratorOpen}
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
        onCloseVideoGenerator={() => setIsVideoGeneratorOpen(false)}
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
