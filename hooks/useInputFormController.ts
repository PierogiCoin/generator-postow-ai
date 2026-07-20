import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAutoSave } from '../components/AutoSaveIndicator';
import type { FormData, CustomTemplate, CampaignHistoryItem, FavoritePost, AudiencePersona } from '../types';
import { Tone, Platform, VisualStyle, GenerationType, UserPlan, GenerationMode } from '../types';
import { suggestToneAndStyle, generateAudiencePersona } from '../services/geminiService';
import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { useUIStore } from '../stores/uiStore';
import { useAppHandlers } from './useAppHandlers';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from './useNotifications';
import { NotificationType } from '../types';
import { checkForSimilarContent } from '../services/contentDuplicateService';
import type { DuplicateCheckResult } from '../services/contentDuplicateService';
import { isQuotaDepleted } from '../utils/chunkReload';
import { saveAutoPublishPrefs } from '../utils/autoPublishPrefs';
import { getStoredInputFormMode, setStoredInputFormMode, stripTopicHtml, type InputFormMode } from '../utils/inputFormMode';
import { isOnboardingPendingFirstGenerate } from '../utils/onboarding';
import { fileToBase64 } from '../components/inputForm/formHelpers';
import { DEFAULT_FORM_DATA, normalizeFormData } from '../components/inputForm/defaultFormData';
import { createAiToolPanels } from '../components/inputForm/aiToolPanels';
import { getPlatformVisualSpec, isAspectRatioAllowedForPlatform } from '../utils/platformVisualSpec';
import { mergeCalendarPlans } from '../services/calendarCadenceService';
import { buildTechNewsCalendarItems } from '../services/techRadarCalendar';
import type { TechNewsItem } from '../services/techRadarService';

export interface UseInputFormControllerOptions {
  prefillData: Partial<FormData> | null;
  onPrefillConsumed: () => void;
  autoGenerateSlot?: boolean;
  onAutoGenerateConsumed?: () => void;
}

export function useInputFormController({
  prefillData,
  onPrefillConsumed,
  autoGenerateSlot = false,
  onAutoGenerateConsumed,
}: UseInputFormControllerOptions) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userPlan, currentTeamId } = useAuth();
  const { addToast } = useNotifications();
  const handlers = useAppHandlers(() => {}, () => {});

  const genActions = useGenerationStore.getState();
  const { isLoading } = useGenerationStore();

  const { templates, brandVoiceProfiles, activeBrandVoiceId, inspiration, selectInspiration } = useDataStore();
  const { setIsBrandVoiceManagerOpen } = useUIStore();
  const activeBrandVoice = brandVoiceProfiles.find((p) => p.id === activeBrandVoiceId);
  const brandVoiceDescription = activeBrandVoice
    ? [
        activeBrandVoice.settings.brandName,
        activeBrandVoice.settings.description,
        activeBrandVoice.settings.archetype,
        activeBrandVoice.settings.visualStyle,
      ]
        .filter(Boolean)
        .join('. ')
    : '';

  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<CustomTemplate | null>(null);
  const [styleSuggestions, setStyleSuggestions] = useState<{
    suggestedTones: Tone[];
    suggestedVisualStyles: VisualStyle[];
  } | null>(null);
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

  const [hasStoredDraft, setHasStoredDraft] = useState(false);
  const [storedDraft, setStoredDraft] = useState<FormData | null>(null);

  useEffect(() => {
    const key = `generator_post_draft_${user?.id || 'guest'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.topic && parsed.topic.trim().length > 0) {
          setStoredDraft(parsed);
          if (!formData.topic.trim()) {
            setHasStoredDraft(true);
          }
        }
      } catch {
        // ignore
      }
    }
  }, [user?.id]);

  const handleRestoreDraft = () => {
    if (storedDraft) {
      setFormData(storedDraft);
      setHasStoredDraft(false);
      addToast('Przywrócono poprzednią sesję!', NotificationType.Success);
    }
  };

  const handleDiscardStoredDraft = () => {
    const key = `generator_post_draft_${user?.id || 'guest'}`;
    localStorage.removeItem(key);
    setHasStoredDraft(false);
  };

  const saveDraftLocally = useCallback(
    async (data: FormData) => {
      if (!data.topic || !data.topic.trim()) return;
      const key = `generator_post_draft_${user?.id || 'guest'}`;
      localStorage.setItem(key, JSON.stringify(data));
    },
    [user?.id]
  );

  const { status: autoSaveStatus, lastSaved } = useAutoSave(formData, saveDraftLocally, 15000);

  const topicDebounceTimeout = useRef<number | null>(null);
  const duplicateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSavedTimeout = useRef<number | null>(null);

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

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRichTextChange = (value: string) => {
    setFormData((prev) => ({ ...prev, topic: value }));
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const key = `generator_post_draft_${user?.id || 'guest'}`;
    localStorage.removeItem(key);
    if (inspiration && 'result' in inspiration) {
      const ins = inspiration as CampaignHistoryItem | FavoritePost;
      handlers.handleGenerate({
        ...formData,
        repurposeFrom: ins.result.postText,
        repurposeImageFrom: ins.result.imageUrl || undefined,
      });
    } else {
      handlers.handleGenerate(formData);
    }
  };

  const handleSaveDraft = () => {
    handlers.handleSaveDraft(formData);
    const key = `generator_post_draft_${user?.id || 'guest'}`;
    localStorage.removeItem(key);
    setFormData(DEFAULT_FORM_DATA);
    setIsDraftSaved(true);
    if (draftSavedTimeout.current) clearTimeout(draftSavedTimeout.current);
    draftSavedTimeout.current = window.setTimeout(() => setIsDraftSaved(false), 2500);
  };

  const handleGenerationTypeChange = (type: GenerationType) => {
    setFormData((prev) => {
      const newState = { ...prev, generationType: type };
      if (type === GenerationType.Video) {
        const topicText = (prev.topic || '').replace(/<[^>]*>?/gm, '').trim();
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
    setFormData((prev) => {
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
      const template = templates.find((tpl) => tpl.id === templateId);
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

  const handleImageForVideoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setFormData((prev) => ({ ...prev, imageForVideo: { base64, mimeType: file.type } }));
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
    if ((formData?.topic || '').replace(/<[^>]*>?/gm, '').trim().length > 25) {
      setIsSuggestingStyle(true);
      topicDebounceTimeout.current = window.setTimeout(async () => {
        const suggestions = await suggestToneAndStyle(formData?.topic || '', user?.id || 'default-user');
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
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Błąd generowania persony', NotificationType.Error);
    } finally {
      setIsGeneratingPersona(false);
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    const htmlSuggestion = `<p>${suggestion}</p>`;
    setFormData((prev) => ({ ...prev, topic: htmlSuggestion }));
    setIsAssistantModalOpen(false);
  };

  const isBrandVoiceEnabled = [UserPlan.Creator, UserPlan.Pro, UserPlan.Agency, UserPlan.Business, UserPlan.Enterprise].includes(
    userPlan
  );
  const showVisualStyle =
    formData.generationType === GenerationType.PostWithImage || formData.generationType === GenerationType.ABTest;
  const showContentType =
    formData.generationType !== GenerationType.Campaign && formData.generationType !== GenerationType.Idea;

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
      createAiToolPanels(
        {
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
        },
        (key, fallback) => t(key, fallback ?? key)
      ),
    [t]
  );

  const handleAddTechNewsToCalendar = useCallback(
    async (newsItems: TechNewsItem[]) => {
      const { intelligentCalendarPlan, setIntelligentCalendarPlan } = useDataStore.getState();
      const slots = buildTechNewsCalendarItems(newsItems, formData.platform, 2);
      await setIntelligentCalendarPlan(mergeCalendarPlans(intelligentCalendarPlan, slots));
      addToast(
        t('form.techRadar.calendarAdded', 'Dodano {{count}} sloty newsów do kalendarza', { count: slots.length }),
        NotificationType.Success
      );
      navigate('/calendar');
    },
    [formData.platform, addToast, navigate, t]
  );

  return {
    t,
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
    userPlan,
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
  };
}
