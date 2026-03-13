import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TONES, CONTENT_TYPES, VISUAL_STYLES, AI_MODELS, GENERATION_TYPES } from '../constants';
import type { FormData, CustomTemplate, CampaignHistoryItem, FavoritePost, AudiencePersona } from '../types';
import { Tone, Platform, ContentType, VisualStyle, GenerationType, AIModel, UserPlan } from '../types';
import { PlatformSelector } from './PlatformSelector';
import { SparklesIcon } from './icons/SparklesIcon';
import { suggestToneAndStyle, generateAudiencePersona } from '../services/geminiService';
import { SaveTemplateModal } from './SaveTemplateModal';
import { SaveIcon } from './icons/SaveIcon';
import { ToneSelector } from './ToneSelector';
import { PhotoIcon } from './icons/PhotoIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { BulbIcon } from './icons/BulbIcon';
import { InteractiveEditor } from './ai/InteractiveEditor';
import { CampaignIcon } from './icons/CampaignIcon';
import { InspirationBanner } from './InspirationBanner';
import { BrandVoice } from './BrandVoice';
import { CheckIcon } from './icons/CheckIcon';
import { TemplateBrowserModal } from './TemplateBrowserModal';
import { CollectionIcon } from './icons/CollectionIcon';
import { Tooltip } from './Tooltip';
import { PersonaDisplay } from './PersonaDisplay';
import { TopicAssistantModal } from './TopicAssistantModal';
import { BeakerIcon } from './icons/BeakerIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { LayersIcon } from './icons/LayersIcon';
import * as geminiService from '../services/geminiService';


import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { useUIStore } from '../stores/uiStore';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useAuth } from '../contexts/AuthContext';

// Security
import { useRateLimiter } from '../hooks/useRateLimiter';
import { validateTopic, validateKeywords, sanitizeText } from '../utils/security';
import { ModernButton } from './ui/ModernButton';
import { ModernInput } from './ui/ModernInput';
import { ModernCard } from './ui/ModernCard';
import { Spinner } from './ui/LoadingStates';

interface InputFormProps {
  prefillData: Partial<FormData> | null;
  onPrefillConsumed: () => void;
}

const SuggestionPills = <T extends string>({ suggestions, onSelect, isLoading, selectedValue }: { suggestions: T[]; onSelect: (value: T) => void; isLoading: boolean; selectedValue?: T }) => {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium animate-pulse mt-3 flex items-center gap-2 px-1">
        <SparklesIcon className="w-4 h-4 animate-spin-slow" />
        <span>{t('form.suggestions.loading')}</span>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex items-center flex-wrap gap-2 animate-fade-in px-1">
      <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-500 flex items-center gap-2 mb-1 w-full">
        <SparklesIcon className="w-3 h-3 text-purple-500" />
        <span>{t('form.suggestions.label')}</span>
      </span>
      {suggestions.map((suggestion) => {
        const isSelected = suggestion === selectedValue;
        return (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion as T)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-300 border-2 ${isSelected
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-lg shadow-blue-500/25 scale-105'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400/50 hover:text-blue-500'
              }`}
          >
            {suggestion}
          </button>
        );
      })}
    </div>
  );
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};


export const InputForm: React.FC<InputFormProps> = ({ prefillData, onPrefillConsumed }) => {
  const { t } = useTranslation();
  const { user, userPlan, currentTeamId } = useAuth();
  const handlers = useAppHandlers(() => { }, () => { });

  // State from stores
  const genActions = useGenerationStore.getState();
  const { isLoading } = useGenerationStore();

  const { templates, brandVoiceProfiles, activeBrandVoiceId, inspiration, selectInspiration } = useDataStore();
  const { setIsBrandVoiceManagerOpen } = useUIStore();

  const defaultFormData: FormData = {
    topic: '',
    audience: '',
    keywords: '',
    tone: Tone.Casual,
    platform: Platform.Facebook,
    contentType: ContentType.Post,
    visualStyle: VisualStyle.PlatformSpecific,
    generationType: GenerationType.PostWithImage,
    model: AIModel.Flash,
    videoTranscript: '',
    campaignGoal: '',
    campaignDuration: 7,
    campaignPlatforms: [Platform.Facebook],
    useMascot: "auto",
    includeLogo: false,
  };

  const [formData, setFormData] = useState<FormData>(defaultFormData);
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

  const topicDebounceTimeout = React.useRef<number | null>(null);

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
    if (prefillData) {
      setFormData(prev => ({
        ...prev,
        ...prefillData,
        topic: prefillData.topic || prev.topic || '',
        platform: prefillData.platform || prev.platform,
        generationType: prefillData.generationType || prev.generationType
      }));
      onPrefillConsumed();
    }
  }, [prefillData, onPrefillConsumed]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRichTextChange = (value: string) => {
    setFormData(prev => ({ ...prev, topic: value }));
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
    setFormData(defaultFormData);
    setIsDraftSaved(true);
    setTimeout(() => setIsDraftSaved(false), 2500);
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
      return { ...prev, platform: newPlatform, generationType: newGenerationType };
    });
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setFormData(template.formData);
      }
    } else {
      setFormData(defaultFormData);
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
    if (window.confirm('Czy na pewno chcesz usunąć ten szablon?')) {
      await handlers.handleDeleteTemplate(templateId);
      if (selectedTemplate === templateId) {
        setSelectedTemplate('');
        setFormData(defaultFormData);
      }
    }
  };

  const handleImageForVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setFormData(prev => ({ ...prev, imageForVideo: { base64, mimeType: file.type } }));
      } catch (error) {
        console.error("Error converting file to base64:", error);
      }
    }
  };

  useEffect(() => {
    if (topicDebounceTimeout.current) clearTimeout(topicDebounceTimeout.current);
    if ((formData?.topic || "").replace(/<[^>]*>?/gm, '').trim().length > 15) {
      setIsSuggestingStyle(true);
      topicDebounceTimeout.current = window.setTimeout(async () => {
        const suggestions = await suggestToneAndStyle(formData?.topic || "", user?.id || 'default-user');
        setStyleSuggestions(suggestions);
        setIsSuggestingStyle(false);
      }, 1000);
    } else {
      setStyleSuggestions(null);
    }
  }, [formData.topic]);

  const handleGeneratePersona = async () => {
    if (!formData.audience.trim()) return;
    setIsGeneratingPersona(true);
    setPersona(null);
    try {
      const result = await generateAudiencePersona(formData.audience, formData.platform, user?.id || 'default-user');
      setPersona(result);
    } catch (e) {
      console.error("Failed to generate persona", e);
    } finally {
      setIsGeneratingPersona(false);
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    const htmlSuggestion = `<p>${suggestion}</p>`;
    setFormData(prev => ({ ...prev, topic: htmlSuggestion }));
    setIsAssistantModalOpen(false);
  };


  const isBrandVoiceEnabled = [UserPlan.Creator, UserPlan.Pro, UserPlan.Agency, UserPlan.Business].includes(userPlan);
  const showVisualStyle = formData.generationType === GenerationType.PostWithImage || formData.generationType === GenerationType.ABTest;
  const showContentType = formData.generationType !== GenerationType.Campaign && formData.generationType !== GenerationType.Idea;

  return (
    <>
      <ModernCard className="p-8">
        <form onSubmit={handleSubmit} className="space-y-10">
          {inspiration && 'result' in inspiration && <InspirationBanner inspiration={inspiration as CampaignHistoryItem | FavoritePost} onClear={() => selectInspiration(null)} />}

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <label htmlFor="template" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.template.label')}</label>
                <Tooltip text={t('form.template.tooltip')} />
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex-grow px-4 h-12 border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-sm text-slate-700 dark:text-slate-300 truncate flex items-center font-medium">
                  {selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.name : t('common.newPost')}
                </div>
                <button type="button" onClick={() => setIsTemplateBrowserOpen(true)} className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 text-slate-600 dark:text-slate-400" title={t('form.template.browse')}>
                  <CollectionIcon className="w-6 h-6" />
                </button>
                <button type="button" onClick={() => { setTemplateToEdit(null); setIsSaveModalOpen(true); }} className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 text-slate-600 dark:text-slate-400" title={t('form.template.saveNew')}>
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
                            } catch (e) {
                            console.error(e);
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
              <div className="relative rounded-[1.5rem] border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 focus-within:border-blue-500 transition-all duration-300">
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
            <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <label htmlFor="visualStyle" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.visualStyle.label')}</label>
                  <Tooltip text={t('form.visualStyle.tooltip')} />
                </div>
                <select id="visualStyle" name="visualStyle" value={formData.visualStyle} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-semibold focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer shadow-sm">
                  {VISUAL_STYLES.map(style => <option key={style} value={style}>{t(`enums.VisualStyle.${style}`)}</option>)}
                </select>
                <SuggestionPills suggestions={styleSuggestions?.suggestedVisualStyles || []} onSelect={(v) => setFormData(p => ({ ...p, visualStyle: v }))} isLoading={isSuggestingStyle} selectedValue={formData.visualStyle} />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <label htmlFor="aspectRatio" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.aspectRatio.label')}</label>
                  <Tooltip text={t('form.aspectRatio.tooltip')} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {["1:1", "16:9", "9:16", "4:3", "3:4"].map(ratio => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, aspectRatio: ratio }))}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border-2 transition-all ${formData.aspectRatio === ratio || (!formData.aspectRatio && ratio === '1:1') ? 'border-blue-500 bg-blue-500 text-white shadow-lg' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-400/50'}`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <details className="group border-2 border-slate-100 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300">
            <summary className="text-sm font-black uppercase tracking-tight text-slate-600 dark:text-slate-400 cursor-pointer list-none flex items-center justify-between">
              <span className="flex items-center gap-2">
                Opcje zaawansowane
                <SparklesIcon className="w-4 h-4 text-indigo-400" />
              </span>
              <svg className="w-5 h-5 transition-transform group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="mt-8 space-y-10 animate-fade-in">
              <ModernInput
                label={t('form.keywords.label')}
                id="keywords"
                name="keywords"
                value={formData.keywords || ''}
                onChange={handleInputChange}
                placeholder={t('form.keywords.placeholder')}
                fullWidth
                icon={<BulbIcon className="w-5 h-5" />}
              />

              <div className={`grid ${showContentType ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-10`}>
                {showContentType && <div className="space-y-3">
                  <label htmlFor="contentType" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.contentType.label')}</label>
                  <select id="contentType" name="contentType" value={formData.contentType} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-semibold focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer">
                    {CONTENT_TYPES.map(type => <option key={type} value={type}>{t(`enums.ContentType.${type}`)}</option>)}
                  </select>
                </div>}
                <div className={!showContentType ? 'col-span-full' : '' + " space-y-3"}>
                  <label htmlFor="model" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('form.aiModel.label')}</label>
                  <select id="model" name="model" value={formData.model} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-semibold focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer">
                    {AI_MODELS.map(model => <option key={model} value={model}>{t(`enums.AIModel.${model}`)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </details>

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
                      className={`group flex flex-col items-center justify-center p-4 text-center border-2 rounded-[1.5rem] transition-all duration-300 relative overflow-hidden ${isSelected ? 'border-blue-500 bg-blue-500 text-white shadow-xl shadow-blue-500/30 scale-105' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-blue-400/50 hover:bg-slate-50 dark:hover:bg-slate-800'} ${isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                    >
                      <config.icon className={`w-8 h-8 mb-3 transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span className="text-[10px] font-black uppercase tracking-tighter leading-none">{config.label}</span>
                      {isSelected && <div className="absolute top-1 right-2"><SparklesIcon className="w-3 h-3 text-white/50" /></div>}
                    </button>
                  );
                })}
              </div>
            </div>

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
                icon={<SparklesIcon className="w-5 h-5" />}
              >
                {isLoading ? t('common.generating') : t('common.generate')}
              </ModernButton>
            </div>
          </div>
        </form>
      </ModernCard>
      <SaveTemplateModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSaveTemplate} templateToEdit={templateToEdit} />
      <TemplateBrowserModal
        isOpen={isTemplateBrowserOpen}
        onClose={() => setIsTemplateBrowserOpen(false)}
        templates={templates}
        onSelect={handleSelectTemplate}
        onEdit={handleEditTemplate}
        onDelete={handleDeleteTemplate}
        currentTeamId={currentTeamId}
      />
      <TopicAssistantModal
        isOpen={isAssistantModalOpen}
        onClose={() => setIsAssistantModalOpen(false)}
        currentTopic={formData.topic}
        onApplySuggestion={handleApplySuggestion}
      />
    </>
  );
};
