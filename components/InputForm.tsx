import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TONES, CONTENT_TYPES, VISUAL_STYLES, AI_MODELS, GENERATION_TYPES } from '../constants';
import type { FormData, CustomTemplate, CampaignHistoryItem, FavoritePost, AudiencePersona } from '../types';
import { Tone, Platform, ContentType, VisualStyle, GenerationType, AIModel, UserPlan, CopywritingFramework, GenerationMode } from '../types';
import { PlatformSelector } from './PlatformSelector';
import { SparklesIcon } from './icons/SparklesIcon';
import { suggestToneAndStyle, generateAudiencePersona } from '../services/geminiService';
import { SaveIcon } from './icons/SaveIcon';
import { ToneSelector } from './ToneSelector';
import { ContentLanguageSelector } from './ContentLanguageSelector';
import { PhotoIcon } from './icons/PhotoIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { BulbIcon } from './icons/BulbIcon';
import { InteractiveEditor } from './ai/InteractiveEditor';
import { CampaignIcon } from './icons/CampaignIcon';
import { InspirationBanner } from './InspirationBanner';
import { BrandVoice } from './BrandVoice';
import { CheckIcon } from './icons/CheckIcon';
import { CollectionIcon } from './icons/CollectionIcon';
import { Tooltip } from './Tooltip';
import { PersonaDisplay } from './PersonaDisplay';
import { BeakerIcon } from './icons/BeakerIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { LayersIcon } from './icons/LayersIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import * as geminiService from '../services/geminiService';


import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { useUIStore } from '../stores/uiStore';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType } from '../types';

// Security
import { useRateLimiter } from '../hooks/useRateLimiter';
import { checkForSimilarContent, formatTimeAgo } from '../services/contentDuplicateService';
import type { DuplicateCheckResult } from '../services/contentDuplicateService';
import { isQuotaDepleted } from '../utils/chunkReload';
import { validateTopic, validateKeywords, sanitizeText } from '../utils/security';
import { ModernButton } from './ui/ModernButton';
import { ModernInput } from './ui/ModernInput';
import { ModernCard } from './ui/ModernCard';
import { Spinner } from './ui/LoadingStates';
import { SuggestionPills } from './inputForm/SuggestionPills';
import { fileToBase64 } from './inputForm/formHelpers';
import { DEFAULT_FORM_DATA, normalizeFormData } from './inputForm/defaultFormData';
import { createAiToolPanels } from './inputForm/aiToolPanels';
import { InputFormVisualSection } from './inputForm/InputFormVisualSection';
import { InputFormAdvancedOptions } from './inputForm/InputFormAdvancedOptions';
import { InputFormModals } from './inputForm/InputFormModals';
import { InputFormModeToggle } from './inputForm/InputFormModeToggle';
import { InputFormQuickFlow } from './inputForm/InputFormQuickFlow';
import { AutoPublishSection } from './inputForm/AutoPublishSection';
import { saveAutoPublishPrefs } from '../utils/autoPublishPrefs';
import { getStoredInputFormMode, setStoredInputFormMode, stripTopicHtml, type InputFormMode } from '../utils/inputFormMode';
import { isOnboardingPendingFirstGenerate } from '../utils/onboarding';
import { OnboardingFirstPostBanner } from './inputForm/OnboardingFirstPostBanner';
import { getPlatformVisualSpec, isAspectRatioAllowedForPlatform } from '../utils/platformVisualSpec';


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
  const { user, userPlan, currentTeamId } = useAuth();
  const { addToast } = useNotifications();
  const handlers = useAppHandlers(() => { }, () => { });

  // State from stores
  const genActions = useGenerationStore.getState();
  const { isLoading } = useGenerationStore();

  const { templates, brandVoiceProfiles, activeBrandVoiceId, inspiration, selectInspiration } = useDataStore();
  const { setIsBrandVoiceManagerOpen } = useUIStore();
  const activeBrandVoice = brandVoiceProfiles.find(p => p.id === activeBrandVoiceId);
  const brandVoiceDescription = activeBrandVoice
    ? [
        activeBrandVoice.settings.brandName,
        activeBrandVoice.settings.description,
        activeBrandVoice.settings.archetype,
        activeBrandVoice.settings.visualStyle,
      ].filter(Boolean).join('. ')
    : '';

  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<CustomTemplate | null>(null);
  const [styleSuggestions, setStyleSuggestions] = useState<{ suggestedTones: Tone[], suggestedVisualStyles: VisualStyle[] } | null>(null);
  const [isSuggestingStyle, setIsSuggestingStyle] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = useState(false);
  const [persona, setPersona] = useState<AudiencePersona | null>(null);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);
  const [isReverseImageOpen, setIsReverseImageOpen] = useState(false);
  const [isTrendAnalysisOpen, setIsTrendAnalysisOpen] = useState(false);
  const [isTechRadarOpen, setIsTechRadarOpen] = useState(false);
  const [isScheduleOptimizerOpen, setIsScheduleOptimizerOpen] = useState(false);
  const [isAIWorkflowOpen, setIsAIWorkflowOpen] = useState(false);
  const [isContentSafetyOpen, setIsContentSafetyOpen] = useState(false);
  const [isRepurposingOpen, setIsRepurposingOpen] = useState(false);
  const [isCrossPlatformOpen, setIsCrossPlatformOpen] = useState(false);
  const [isSocialMediaOpen, setIsSocialMediaOpen] = useState(false);
  const [isVideoGeneratorOpen, setIsVideoGeneratorOpen] = useState(false);
  const [isOmniOpen, setIsOmniOpen] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [formMode, setFormMode] = useState<InputFormMode>(() => {
    if (user?.id && isOnboardingPendingFirstGenerate(user.id)) return 'quick';
    return getStoredInputFormMode();
  });
  const [showFirstPostBanner, setShowFirstPostBanner] = useState(() =>
    Boolean(user?.id && isOnboardingPendingFirstGenerate(user.id))
  );

  const topicDebounceTimeout = React.useRef<number | null>(null);
  const duplicateTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSavedTimeout = React.useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (draftSavedTimeout.current) clearTimeout(draftSavedTimeout.current);
    };
  }, []);

  const showAutoPublishOption = useMemo(
    () =>
      ![GenerationType.ABTest, GenerationType.Idea, GenerationType.Campaign, GenerationType.Video].includes(
        formData.generationType
      ) && formData.generationMode !== GenerationMode.MultiVariant,
    [formData.generationType, formData.generationMode]
  );

  const handleAutoPublishToggle = (enabled: boolean) => {
    setFormData((p) => {
      const next = { ...p, autoPublishToConnected: enabled };
      saveAutoPublishPrefs({
        autoPublishToConnected: enabled,
        autoOptimizePerPlatform: next.autoOptimizePerPlatform !== false,
      });
      return next;
    });
  };

  const handleAutoOptimizeToggle = (enabled: boolean) => {
    setFormData((p) => {
      const next = { ...p, autoOptimizePerPlatform: enabled };
      saveAutoPublishPrefs({
        autoPublishToConnected: Boolean(next.autoPublishToConnected),
        autoOptimizePerPlatform: enabled,
      });
      return next;
    });
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

  const generationTypeConfig: Record<GenerationType, { label: string; icon: React.FC<any>; description: string }> = {
    [GenerationType.PostWithImage]: { label: t('generationTypes.PostWithImage'), icon: PhotoIcon, description: 'Post z grafiką AI' },
    [GenerationType.Video]: { label: t('generationTypes.Video'), icon: VideoCameraIcon, description: 'Wideo 16:9 / 9:16' },
    [GenerationType.Idea]: { label: t('generationTypes.Idea'), icon: BulbIcon, description: 'Kreatywne koncepty' },
    [GenerationType.Campaign]: { label: t('generationTypes.Campaign'), icon: CampaignIcon, description: 'Strategia wielokanałowa' },
    [GenerationType.ABTest]: { label: t('generationTypes.ABTest'), icon: BeakerIcon, description: 'Dwa warianty treści' },
    [GenerationType.SeriesFollowUp]: { label: t('generationTypes.SeriesFollowUp'), icon: CollectionIcon, description: 'Część 2 lub pogłębienie' },
    [GenerationType.Omnichannel]: { label: 'Omnichannel', icon: GlobeIcon, description: 'Wszystkie kanały na raz' },
  };

  const repurposeAsConfig: Record<GenerationType, { label: string; icon: React.FC<any>; description: string }> = {
    [GenerationType.PostWithImage]: { label: t('repurposeAs.PostWithImage'), icon: PhotoIcon, description: 'Adaptacja na post' },
    [GenerationType.Video]: { label: t('repurposeAs.Video'), icon: VideoCameraIcon, description: 'Adaptacja na wideo' },
    [GenerationType.Idea]: { label: t('repurposeAs.Idea'), icon: BulbIcon, description: 'Burza mózgów na bazie posta' },
    [GenerationType.Campaign]: { label: t('repurposeAs.Campaign'), icon: CampaignIcon, description: 'Pełna strategia z posta' },
    [GenerationType.ABTest]: { label: t('repurposeAs.ABTest'), icon: BeakerIcon, description: 'Stwórz testy porównawcze' },
    [GenerationType.SeriesFollowUp]: { label: t('repurposeAs.SeriesFollowUp'), icon: CollectionIcon, description: 'Wygeneruj kolejną część' },
    [GenerationType.Omnichannel]: { label: 'Omnichannel', icon: GlobeIcon, description: 'Rozszerz na wszystkie kanały' },
  };

  const getAspectRatioLabel = (ratio: string) => {
    switch (ratio) {
      case "1:1": return t('form.aspectRatio.square');
      case "16:9": return t('form.aspectRatio.landscape');
      case "9:16": return t('form.aspectRatio.portrait');
      case "4:3": return t('form.aspectRatio.standard');
      case "3:4": return t('form.aspectRatio.photo');
      default: return '';
    }
  };

  useEffect(() => {
    if (!prefillData) return;
    const next = normalizeFormData({
      ...prefillData,
      topic: prefillData.topic || '',
      platform: prefillData.platform,
      generationType: prefillData.generationType,
    });
    setFormData((prev) => normalizeFormData({ ...prev, ...next }));
    onPrefillConsumed();
    if (autoGenerateSlot && stripTopicHtml(next.topic || '').trim()) {
      handlers.handleGenerate(next);
      onAutoGenerateConsumed?.();
    }
  }, [prefillData, autoGenerateSlot, onPrefillConsumed, onAutoGenerateConsumed]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRichTextChange = (value: string) => {
    setFormData(prev => ({ ...prev, topic: value }));
    if (duplicateTimeoutRef.current) clearTimeout(duplicateTimeoutRef.current);
    if (value.trim().length >= 15) {
      duplicateTimeoutRef.current = setTimeout(() => {
        const { history } = useDataStore.getState();
        const result = checkForSimilarContent(value, history);
        setDuplicateCheck(result.hasSimilar ? result : null);
      }, 800);
    } else {
      setDuplicateCheck(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inspiration && 'result' in inspiration) {
      const ins = inspiration as CampaignHistoryItem | FavoritePost;
      handlers.handleGenerate({
        ...formData,
        repurposeFrom: ins.result.postText,
        repurposeImageFrom: ins.result.imageUrl || undefined
      });
    } else {
      handlers.handleGenerate(formData);
    }
  };

  const handleSaveDraft = () => {
    handlers.handleSaveDraft(formData);
    setFormData(DEFAULT_FORM_DATA);
    setIsDraftSaved(true);
    if (draftSavedTimeout.current) clearTimeout(draftSavedTimeout.current);
    draftSavedTimeout.current = window.setTimeout(() => setIsDraftSaved(false), 2500);
  };

  const handleGenerationTypeChange = (type: GenerationType) => {
    setFormData(prev => {
      const newState = { ...prev, generationType: type };
      if (type === GenerationType.Video) {
        const topicText = (prev.topic || "").replace(/<[^>]*>?/gm, '').trim();
        if (topicText === '') {
          newState.topic = t('form.videoTopicPlaceholder');
        }
        if (!prev.videoTranscript?.trim()) {
          newState.videoTranscript = t('form.videoTranscriptPlaceholderDefault');
        }
      }
      return newState;
    });
  };

  const isCampaignMode = formData.generationType === GenerationType.Campaign;

  const handlePlatformChange = (newPlatform: Platform) => {
    setFormData(prev => {
      let newGenerationType = prev.generationType;
      if (newPlatform === Platform.YouTube) {
        newGenerationType = GenerationType.Video;
      } else if (prev.platform === Platform.YouTube) {
        if (prev.generationType === GenerationType.Video) {
          newGenerationType = GenerationType.PostWithImage;
        }
      }
      const spec = getPlatformVisualSpec(newPlatform);
      const aspectRatio =
        prev.visualStyle === VisualStyle.PlatformSpecific
          ? spec.defaultAspectRatio
          : prev.aspectRatio && isAspectRatioAllowedForPlatform(newPlatform, prev.aspectRatio)
            ? prev.aspectRatio
            : spec.defaultAspectRatio;
      return { ...prev, platform: newPlatform, generationType: newGenerationType, aspectRatio };
    });
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setFormData(normalizeFormData(template.formData));
      }
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
    setIsTemplateBrowserOpen(false);
  };

  const handleSaveTemplate = async (name: string) => {
    if (!user) return;
    const templateData = templateToEdit
      ? { ...templateToEdit, name, formData }
      : { id: `template-${Date.now()}`, name, formData, teamId: currentTeamId };

    await handlers.handleSaveTemplate(templateData);
    setSelectedTemplate(templateData.id);
    setIsSaveModalOpen(false);
    setTemplateToEdit(null);
  };

  const handleEditTemplate = (template: CustomTemplate) => {
    setTemplateToEdit(template);
    setIsTemplateBrowserOpen(false);
    setIsSaveModalOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    await handlers.handleDeleteTemplate(templateId);
    if (selectedTemplate === templateId) {
      setSelectedTemplate('');
      setFormData(DEFAULT_FORM_DATA);
    }
  };

  const handleImageForVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setFormData(prev => ({ ...prev, imageForVideo: { base64, mimeType: file.type } }));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Błąd konwersji pliku';
        addToast(errorMessage, NotificationType.Error);
      }
    }
  };

  useEffect(() => {
    if (topicDebounceTimeout.current) clearTimeout(topicDebounceTimeout.current);
    if (isQuotaDepleted()) {
      setStyleSuggestions(null);
      return;
    }
    if ((formData?.topic || "").replace(/<[^>]*>?/gm, '').trim().length > 25) {
      setIsSuggestingStyle(true);
      topicDebounceTimeout.current = window.setTimeout(async () => {
        const suggestions = await suggestToneAndStyle(formData?.topic || "", user?.id || 'default-user');
        setStyleSuggestions(suggestions);
        setIsSuggestingStyle(false);
      }, 2000);
    } else {
      setStyleSuggestions(null);
    }
    return () => {
      if (topicDebounceTimeout.current) clearTimeout(topicDebounceTimeout.current);
    };
  }, [formData.topic]);

  const handleGeneratePersona = async () => {
    if (!formData.audience.trim()) return;
    setIsGeneratingPersona(true);
    setPersona(null);
    try {
      const result = await generateAudiencePersona(formData.audience, formData.platform, user?.id || 'default-user');
      setPersona(result);
    } catch (e: any) {
      addToast(e.message || 'Błąd generowania persony', NotificationType.Error);
    } finally {
      setIsGeneratingPersona(false);
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    const htmlSuggestion = `<p>${suggestion}</p>`;
    setFormData(prev => ({ ...prev, topic: htmlSuggestion }));
    setIsAssistantModalOpen(false);
  };


  const isBrandVoiceEnabled = [UserPlan.Creator, UserPlan.Pro, UserPlan.Agency, UserPlan.Business, UserPlan.Enterprise].includes(userPlan);
  const showVisualStyle = formData.generationType === GenerationType.PostWithImage || formData.generationType === GenerationType.ABTest;
  const showContentType = formData.generationType !== GenerationType.Campaign && formData.generationType !== GenerationType.Idea;

  const handleModeChange = (mode: InputFormMode) => {
    setFormMode(mode);
    setStoredInputFormMode(mode);
    if (mode === 'quick') {
      setFormData((prev) => {
        if (prev.platform === Platform.YouTube) return prev;
        if (prev.generationType === GenerationType.PostWithImage || prev.generationType === GenerationType.Video) {
          return prev;
        }
        return { ...prev, generationType: GenerationType.PostWithImage };
      });
    }
  };

  const aiToolPanels = useMemo(
    () =>
      createAiToolPanels({
        setIsReverseImageOpen,
        setIsTrendAnalysisOpen,
        setIsTechRadarOpen,
        setIsScheduleOptimizerOpen,
        setIsAIWorkflowOpen,
        setIsContentSafetyOpen,
        setIsRepurposingOpen,
        setIsCrossPlatformOpen,
        setIsSocialMediaOpen,
        setIsVideoGeneratorOpen,
        setIsOmniOpen,
      }),
    []
  );


  return (
    <>
      <div id="input-form-anchor">
      <ModernCard className="p-4 sm:p-6 lg:p-8 glass-premium rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] border border-white/10">
        {showFirstPostBanner && (
          <OnboardingFirstPostBanner onDismiss={() => setShowFirstPostBanner(false)} />
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
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <label htmlFor="template" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.template.label')}</label>
                <Tooltip text={t('form.template.tooltip')} />
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex-grow px-4 h-12 border border-slate-200/50 dark:border-white/5 rounded-2xl bg-white/40 dark:bg-slate-950/20 text-sm text-slate-700 dark:text-slate-300 truncate flex items-center font-medium">
                  {selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.name : t('common.newPost')}
                </div>
                <button type="button" onClick={() => setIsTemplateBrowserOpen(true)} className="w-12 h-12 flex items-center justify-center bg-slate-100/80 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 text-slate-650 dark:text-slate-400" title={t('form.template.browse')}>
                  <CollectionIcon className="w-6 h-6" />
                </button>
                <button type="button" onClick={() => { setTemplateToEdit(null); setIsSaveModalOpen(true); }} className="w-12 h-12 flex items-center justify-center bg-slate-100/80 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 text-slate-650 dark:text-slate-400" title={t('form.template.saveNew')}>
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
                            setFormData(p => ({ ...p, topic: extracted.text }));
                            } catch (e: any) {
                            addToast(e.message || 'Błąd ekstrakcji tematu', NotificationType.Error);
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
            <div className="animate-fade-in flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl">
              <span className="text-amber-500 text-lg shrink-0">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Podobny post z historii ({Math.round(duplicateCheck.mostSimilar.similarity * 100)}% podobny)</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 truncate mt-0.5">
                  „{duplicateCheck.mostSimilar.topic.slice(0, 80)}{duplicateCheck.mostSimilar.topic.length > 80 ? '…' : ''}"
                  <span className="ml-1 opacity-70">· {formatTimeAgo(duplicateCheck.mostSimilar.timestamp)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateCheck(null)}
                className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 text-xs shrink-0"
                aria-label="Zamknij alert"
              >✕</button>
            </div>
          )}

          {formData.generationType === GenerationType.Video && (
            <div className="animate-fade-in space-y-8 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <VideoCameraIcon className="w-5 h-5 text-red-500" />
                </div>
                <h4 className="font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">Konfiguracja Wideo</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <label htmlFor="videoTranscript" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.videoTranscript.label')}</label>
                    <Tooltip text={t('form.videoTranscript.tooltip')} />
                  </div>
                  <textarea id="videoTranscript" name="videoTranscript" value={formData.videoTranscript || ''} onChange={handleInputChange} rows={4} className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" placeholder={t('form.videoTranscript.placeholder')} />
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <label htmlFor="videoAspectRatio" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.aspectRatio.label')}</label>
                      <Tooltip text={t('form.aspectRatio.tooltipVideo')} />
                    </div>
                    <select id="videoAspectRatio" name="aspectRatio" value={formData.aspectRatio || '16:9'} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-sm font-semibold focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer">
                      <option value="16:9">16:9 ({t('form.aspectRatio.landscape')})</option>
                      <option value="9:16">9:16 ({t('form.aspectRatio.portrait')})</option>
                      <option value="1:1">1:1 ({t('form.aspectRatio.square')})</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <label htmlFor="imageForVideo" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.imageForVideo.label')}</label>
                      <Tooltip text={t('form.imageForVideo.tooltip')} />
                    </div>
                    <div className="relative group/file">
                      <input type="file" id="imageForVideo" name="imageForVideo" onChange={handleImageForVideoChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" />
                      <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center gap-2 group-hover/file:border-blue-500 transition-colors">
                        <PhotoIcon className="w-8 h-8 text-slate-400 group-hover/file:text-blue-500" />
                        <span className="text-xs font-bold text-slate-500 group-hover/file:text-blue-500">Kliknij lub przeciągnij obraz referencyjny</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
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
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.contentLanguage.label')}</span>
                  <Tooltip text={t('form.contentLanguage.tooltip')} />
                </div>
                <ContentLanguageSelector
                  selected={formData.contentLanguage}
                  onSelect={(contentLanguage) => setFormData((p) => ({ ...p, contentLanguage }))}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.tone.label')}</span>
                  <Tooltip text={t('form.tone.tooltip')} />
                </div>
                <ToneSelector selectedTone={formData.tone} onSelect={(tone) => setFormData(p => ({ ...p, tone }))} />
                <SuggestionPills suggestions={styleSuggestions?.suggestedTones || []} onSelect={(v) => setFormData(p => ({ ...p, tone: v }))} isLoading={isSuggestingStyle} selectedValue={formData.tone} />
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-1 px-1">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{isCampaignMode ? t('form.platform.label_plural') : t('form.platform.label')}</label>
              <Tooltip text={t('form.platform.tooltip')} />
            </div>
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
          </div>

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
            <div className="space-y-4">
              <div className="p-6 bg-purple-500/5 border-2 border-purple-500/10 rounded-3xl">
                <BrandVoice
                  profiles={brandVoiceProfiles}
                  activeProfileId={activeBrandVoiceId}
                  onSetActive={handlers.handleSetActiveBrandVoice}
                  onManage={() => setIsBrandVoiceManagerOpen(true)}
                />
              </div>

              {/* Branding Section */}
              <div className="p-5 bg-blue-500/5 border-2 border-blue-500/10 rounded-3xl animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Wykorzystaj Aktywa Marki</h4>
                  <Tooltip text="Włącz opcje poniżej, aby AI uwzględniło Twoje logo lub maskotkę w treści posta." />
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-slate-500 ml-2">Logo:</span>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, includeLogo: !p.includeLogo }))}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${formData.includeLogo ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {formData.includeLogo ? 'Użyj' : 'Pomiń'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-slate-500 ml-2">Maskotka ({brandVoiceProfiles.find(p => p.id === activeBrandVoiceId)?.settings?.mascotName || '---'}):</span>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                      {["auto", true, false].map((val) => {
                        const isSelected = formData.useMascot === (val === "auto" ? "auto" : val);
                        return (
                          <button
                            key={String(val)}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, useMascot: val as any }))}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${isSelected ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            {val === "auto" ? 'Sugeruj' : val ? 'Zawsze' : 'Nigdy'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-10 border-t border-slate-200 dark:border-slate-800 space-y-10">
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">
                {inspiration && 'result' in inspiration ? t('generationTypes.RepurposeAs') : 'Typ Generacji'}
              </label>
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
                      <config.icon className={`w-8 h-8 mb-3 transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'text-cyan-500' : 'text-slate-450'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-tighter leading-none ${isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`}>{config.label}</span>
                      {isSelected && <div className="absolute top-1 right-2"><SparklesIcon className="w-3 h-3 text-cyan-500/60" /></div>}
                    </button>
                  );
                })}
              </div>
            </div>

            {autoPublishSection}

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
      />
    </>
  );
};
