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
import { RichTextEditor } from './RichTextEditor';
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


import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { useUIStore } from '../stores/uiStore';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useAuth } from '../contexts/AuthContext';


interface InputFormProps {
  prefillData: Partial<FormData> | null;
  onPrefillConsumed: () => void;
}

const SuggestionPills = <T extends string>({ suggestions, onSelect, isLoading, selectedValue }: { suggestions: T[]; onSelect: (value: T) => void; isLoading: boolean; selectedValue?: T }) => {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="text-xs text-slate-500 dark:text-slate-400 animate-pulse mt-2 flex items-center gap-2">
        <SparklesIcon className="w-3 h-3"/>
        <span>{t('form.suggestions.loading')}</span>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex items-center flex-wrap gap-2 animate-fade-in">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <SparklesIcon className="w-4 h-4 text-purple-400"/>
        <span>{t('form.suggestions.label')}</span>
      </span>
      {suggestions.map((suggestion) => {
        const isSelected = suggestion === selectedValue;
        return (
            <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion as T)}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                isSelected
                ? 'bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-500'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
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
  const handlers = useAppHandlers(() => {}, () => {});

  // State from stores
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

  const generationTypeConfig: Record<GenerationType, { label: string; icon: React.FC<any> }> = {
    [GenerationType.PostWithImage]: { label: t('generationTypes.PostWithImage'), icon: PhotoIcon },
    [GenerationType.Video]: { label: t('generationTypes.Video'), icon: VideoCameraIcon },
    [GenerationType.Idea]: { label: t('generationTypes.Idea'), icon: BulbIcon },
    [GenerationType.Campaign]: { label: t('generationTypes.Campaign'), icon: CampaignIcon },
    [GenerationType.ABTest]: { label: t('generationTypes.ABTest'), icon: BeakerIcon },
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
      setFormData(prev => ({ ...prev, ...prefillData }));
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
    handlers.handleGenerate(formData);
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
            const topicText = prev.topic.replace(/<[^>]*>?/gm, '').trim();
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
    if (formData.topic.replace(/<[^>]*>?/gm, '').trim().length > 15) {
        setIsSuggestingStyle(true);
      topicDebounceTimeout.current = window.setTimeout(async () => {
      const suggestions = await suggestToneAndStyle(formData.topic, user?.id || 'default-user');
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
    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-2xl p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {inspiration && 'result' in inspiration && <InspirationBanner inspiration={inspiration as CampaignHistoryItem | FavoritePost} onClear={() => selectInspiration(null)} />}
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label htmlFor="template" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.template.label')}</label>
            <Tooltip text={t('form.template.tooltip')} />
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex-grow p-2 h-10 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-700 dark:text-slate-300 truncate flex items-center">
              {selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.name : t('common.newPost')}
            </div>
            <button type="button" onClick={() => setIsTemplateBrowserOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition" title={t('form.template.browse')}>
              <CollectionIcon className="w-5 h-5"/>
            </button>
            <button type="button" onClick={() => { setTemplateToEdit(null); setIsSaveModalOpen(true); }} className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition" title={t('form.template.saveNew')}>
              <SaveIcon className="w-5 h-5"/>
            </button>
          </div>
        </div>

        <div>
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <label htmlFor="topic" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.topic.label')}</label>
                    <Tooltip text={t('form.topic.tooltip')} />
                </div>
                <button
                    type="button"
                    onClick={() => setIsAssistantModalOpen(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    title={t('form.topic.assistantTooltip')}
                >
                    <SparklesIcon className="w-4 h-4"/>
                    Asystent
                </button>
            </div>
            <RichTextEditor value={formData.topic} onChange={handleRichTextChange} placeholder={t('form.topic.placeholder')} />
        </div>
        
        {formData.generationType === GenerationType.Video && (
            <div className="animate-fade-in space-y-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <label htmlFor="videoTranscript" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.videoTranscript.label')}</label>
                        <Tooltip text={t('form.videoTranscript.tooltip')} />
                    </div>
                    <textarea id="videoTranscript" name="videoTranscript" value={formData.videoTranscript || ''} onChange={handleInputChange} rows={4} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition-all transform duration-200 ease-out focus:scale-[1.02]" placeholder={t('form.videoTranscript.placeholder')} />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <label htmlFor="videoAspectRatio" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.aspectRatio.label')}</label>
                        <Tooltip text={t('form.aspectRatio.tooltipVideo')} />
                    </div>
                    <select id="videoAspectRatio" name="aspectRatio" value={formData.aspectRatio || '16:9'} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition-all">
                        <option value="16:9">16:9 ({t('form.aspectRatio.landscape')})</option>
                        <option value="9:16">9:16 ({t('form.aspectRatio.portrait')})</option>
                        <option value="1:1">1:1 ({t('form.aspectRatio.square')})</option>
                    </select>
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <label htmlFor="imageForVideo" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.imageForVideo.label')}</label>
                        <Tooltip text={t('form.imageForVideo.tooltip')} />
                    </div>
                    <input type="file" id="imageForVideo" name="imageForVideo" onChange={handleImageForVideoChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-800" accept="image/*" />
                </div>
            </div>
        )}
        
        {isCampaignMode ? (
            <>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                        <label htmlFor="campaignGoal" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.campaignGoal.label')}</label>
                        <Tooltip text={t('form.campaignGoal.tooltip')} />
                    </div>
                    <input type="text" id="campaignGoal" name="campaignGoal" value={formData.campaignGoal || ''} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition-all transform duration-200 ease-out focus:scale-[1.02]" placeholder={t('form.campaignGoal.placeholder')} required />
                </div>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                        <label htmlFor="campaignDuration" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.campaignDuration.label')}</label>
                        <Tooltip text={t('form.campaignDuration.tooltip')} />
                    </div>
                    <input type="number" id="campaignDuration" name="campaignDuration" min="3" max="30" value={formData.campaignDuration || 7} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition-all transform duration-200 ease-out focus:scale-[1.02]" required/>
                </div>
            </>
        ) : (
            <>
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <label htmlFor="audience" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.audience.label')}</label>
                            <Tooltip text={t('form.audience.tooltip')} />
                        </div>
                        <button type="button" onClick={handleGeneratePersona} disabled={!formData.audience.trim() || isGeneratingPersona} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 flex items-center gap-1">
                            {isGeneratingPersona ? t('persona.generating') : <><SparklesIcon className="w-4 h-4"/> {t('persona.generate')}</>}
                        </button>
                    </div>
                    <input type="text" id="audience" name="audience" value={formData.audience} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition-all transform duration-200 ease-out focus:scale-[1.02]" placeholder={t('form.audience.placeholder')} required />
                    {persona && <PersonaDisplay persona={persona} onClose={() => setPersona(null)} />}
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.tone.label')}</span>
                        <Tooltip text={t('form.tone.tooltip')} />
                    </div>
                    <ToneSelector selectedTone={formData.tone} onSelect={(tone) => setFormData(p => ({...p, tone}))} />
                    <SuggestionPills suggestions={styleSuggestions?.suggestedTones || []} onSelect={(v) => setFormData(p => ({...p, tone: v}))} isLoading={isSuggestingStyle} selectedValue={formData.tone}/>
                </div>
            </>
        )}

        <div>
            <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{isCampaignMode ? t('form.platform.label_plural') : t('form.platform.label')}</label>
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
          <div className="animate-fade-in space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor="visualStyle" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.visualStyle.label')}</label>
                <Tooltip text={t('form.visualStyle.tooltip')} />
              </div>
              <select id="visualStyle" name="visualStyle" value={formData.visualStyle} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition-all transform duration-200 ease-out focus:scale-[1.02]">
                  {VISUAL_STYLES.map(style => <option key={style} value={style}>{t(`enums.VisualStyle.${style}`)}</option>)}
              </select>
              <SuggestionPills suggestions={styleSuggestions?.suggestedVisualStyles || []} onSelect={(v) => setFormData(p => ({...p, visualStyle: v}))} isLoading={isSuggestingStyle} selectedValue={formData.visualStyle}/>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor="aspectRatio" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.aspectRatio.label')}</label>
                <Tooltip text={t('form.aspectRatio.tooltip')} />
              </div>
              <select id="aspectRatio" name="aspectRatio" value={formData.aspectRatio || '1:1'} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition-all">
                {["1:1", "16:9", "9:16", "4:3", "3:4"].map(ratio => <option key={ratio} value={ratio}>{ratio} ({getAspectRatioLabel(ratio)})</option>)}
              </select>
            </div>
          </div>
        )}

        <details className="group">
            <summary className="text-sm font-semibold text-slate-600 dark:text-slate-400 cursor-pointer list-none flex items-center gap-2">
                Opcje zaawansowane
                <svg className="w-4 h-4 transition-transform group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="mt-4 space-y-6 animate-fade-in">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <label htmlFor="keywords" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.keywords.label')}</label>
                        <Tooltip text={t('form.keywords.tooltip')} />
                    </div>
                    <input type="text" id="keywords" name="keywords" value={formData.keywords || ''} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition-all transform duration-200 ease-out focus:scale-[1.02]" placeholder={t('form.keywords.placeholder')} />
                </div>

                <div className={`grid ${showContentType ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    {showContentType && <div>
                        <div className="flex items-center gap-2 mb-1">
                            <label htmlFor="contentType" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.contentType.label')}</label>
                            <Tooltip text={t('form.contentType.tooltip')} />
                        </div>
                        <select id="contentType" name="contentType" value={formData.contentType} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition-all transform duration-200 ease-out focus:scale-[1.02]">
                            {CONTENT_TYPES.map(type => <option key={type} value={type}>{t(`enums.ContentType.${type}`)}</option>)}
                        </select>
                    </div>}
                     <div className={!showContentType ? 'col-span-full' : ''}>
                        <div className="flex items-center gap-2 mb-1">
                            <label htmlFor="model" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('form.aiModel.label')}</label>
                            <Tooltip text={t('form.aiModel.tooltip')} />
                        </div>
                        <select id="model" name="model" value={formData.model} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition-all transform duration-200 ease-out focus:scale-[1.02]">
                            {AI_MODELS.map(model => <option key={model} value={model}>{t(`enums.AIModel.${model}`)}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </details>
        
        {isBrandVoiceEnabled && <BrandVoice 
            profiles={brandVoiceProfiles}
            activeProfileId={activeBrandVoiceId}
            onSetActive={handlers.handleSetActiveBrandVoice}
            onManage={() => setIsBrandVoiceManagerOpen(true)}
          />}

        <div className="pt-6 border-t border-slate-200 dark:border-slate-700/50 space-y-4">
           <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {GENERATION_TYPES.map(type => {
                    if (!generationTypeConfig[type]) return null;
                    const config = generationTypeConfig[type];
                    const isSelected = formData.generationType === type;
                    const isDisabled = formData.platform === Platform.YouTube && type !== GenerationType.Video;
                    return (
                        <button key={type} type="button" onClick={() => handleGenerationTypeChange(type)} disabled={isDisabled} className={`flex flex-col items-center justify-center p-3 text-center border-2 rounded-lg transition-all transform hover:scale-105 ${isSelected ? 'border-blue-500 bg-slate-100 dark:bg-slate-700/50 scale-105 shadow-md' : 'border-slate-300 dark:border-slate-700'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <config.icon className={`w-6 h-6 mb-1 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                            <span className="text-xs font-semibold">{config.label}</span>
                        </button>
                    );
                })}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button type="button" onClick={handleSaveDraft} disabled={isLoading || !formData.topic.trim() || isDraftSaved} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-md transition-all disabled:opacity-75 ${isDraftSaved ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                  {isDraftSaved ? <CheckIcon className="w-5 h-5"/> : <SaveIcon className="w-5 h-5"/>}
                  {isDraftSaved ? t('form.buttons.draftSaved') : t('form.buttons.saveDraft')}
              </button>
              <button type="submit" disabled={isLoading} className="group flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 transform hover:scale-105">
                  {isLoading ? t('common.generating') : t('common.generate')} <SparklesIcon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-110"/>
              </button>
            </div>
        </div>
      </form>
    </div>
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