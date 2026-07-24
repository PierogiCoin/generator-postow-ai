import React, { lazy, useMemo } from 'react';
import type { FormData, CustomTemplate } from '../../types';
import { ContentType } from '../../types';
import { SaveTemplateModal } from '../SaveTemplateModal';
import { TemplateBrowserModal } from '../TemplateBrowserModal';
import { TopicAssistantModal } from '../TopicAssistantModal';
import { ReverseImageModal } from '../ReverseImageModal';
import { SectionErrorBoundary } from '../ErrorBoundary';
import { FeaturePanelModal } from '../ui/FeaturePanelModal';
import { stripTopicHtml } from '../../utils/inputFormMode';
import { resolveNicheContext } from '../../utils/nicheContext';
import { useDataStore } from '../../stores/dataStore';

const TrendAnalysisPanel = lazy(() => import('../TrendAnalysisPanel').then((m) => ({ default: m.TrendAnalysisPanel })));
const TechRadarPanel = lazy(() => import('./TechRadarPanel').then((m) => ({ default: m.TechRadarPanel })));
const ScheduleOptimizer = lazy(() => import('../ScheduleOptimizer').then((m) => ({ default: m.ScheduleOptimizer })));
const AIWorkflowPanel = lazy(() => import('../AIWorkflowPanel').then((m) => ({ default: m.AIWorkflowPanel })));
const ContentSafetyPanel = lazy(() => import('../ContentSafetyPanel').then((m) => ({ default: m.ContentSafetyPanel })));
const ContentRepurposingPanel = lazy(() => import('../ContentRepurposingPanel').then((m) => ({ default: m.ContentRepurposingPanel })));
const CrossPlatformCommandCenter = lazy(() => import('../CrossPlatformCommandCenter').then((m) => ({ default: m.CrossPlatformCommandCenter })));
const SocialMediaManager = lazy(() => import('../SocialMediaManager').then((m) => ({ default: m.SocialMediaManager })));
const GeminiOmniPanel = lazy(() => import('../GeminiOmniPanel').then((m) => ({ default: m.GeminiOmniPanel })));

export interface InputFormModalsProps {
  formData: FormData;
  brandVoiceDescription: string;
  templates: CustomTemplate[];
  currentTeamId: string | null;
  userId?: string | null;
  templateToEdit: CustomTemplate | null;
  isSaveModalOpen: boolean;
  isTemplateBrowserOpen: boolean;
  isAssistantModalOpen: boolean;
  isReverseImageOpen: boolean;
  isTrendAnalysisOpen: boolean;
  isTechRadarOpen: boolean;
  isScheduleOptimizerOpen: boolean;
  isAIWorkflowOpen: boolean;
  isContentSafetyOpen: boolean;
  isRepurposingOpen: boolean;
  isCrossPlatformOpen: boolean;
  isSocialMediaOpen: boolean;
  isOmniOpen: boolean;
  onCloseSaveModal: () => void;
  onCloseTemplateBrowser: () => void;
  onCloseAssistant: () => void;
  onCloseReverseImage: () => void;
  onCloseTrendAnalysis: () => void;
  onCloseTechRadar: () => void;
  onCloseScheduleOptimizer: () => void;
  onCloseAIWorkflow: () => void;
  onCloseContentSafety: () => void;
  onCloseRepurposing: () => void;
  onCloseCrossPlatform: () => void;
  onCloseSocialMedia: () => void;
  onCloseOmni: () => void;
  onSaveTemplate: (name: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onSelectIndustryPrefill?: (prefill: Partial<FormData>) => void;
  onEditTemplate: (template: CustomTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onApplySuggestion: (suggestion: string) => void;
  onReverseImageSelect: (prompt: string, caption?: string) => void;
  onTrendSelect: (topic: string) => void;
  onScheduleSelect: () => void;
  onAddTechNewsToCalendar?: (items: import('../../services/techRadarService').TechNewsItem[]) => void;
}

export const InputFormModals: React.FC<InputFormModalsProps> = ({
  formData,
  brandVoiceDescription,
  templates,
  currentTeamId,
  userId,
  templateToEdit,
  isSaveModalOpen,
  isTemplateBrowserOpen,
  isAssistantModalOpen,
  isReverseImageOpen,
  isTrendAnalysisOpen,
  isTechRadarOpen,
  isScheduleOptimizerOpen,
  isAIWorkflowOpen,
  isContentSafetyOpen,
  isRepurposingOpen,
  isCrossPlatformOpen,
  isSocialMediaOpen,
  isOmniOpen,
  onCloseSaveModal,
  onCloseTemplateBrowser,
  onCloseAssistant,
  onCloseReverseImage,
  onCloseTrendAnalysis,
  onCloseTechRadar,
  onCloseScheduleOptimizer,
  onCloseAIWorkflow,
  onCloseContentSafety,
  onCloseRepurposing,
  onCloseCrossPlatform,
  onCloseSocialMedia,
  onCloseOmni,
  onSaveTemplate,
  onSelectTemplate,
  onSelectIndustryPrefill,
  onEditTemplate,
  onDeleteTemplate,
  onApplySuggestion,
  onReverseImageSelect,
  onTrendSelect,
  onScheduleSelect,
  onAddTechNewsToCalendar,
}) => {
  const { brandVoiceProfiles, activeBrandVoiceId } = useDataStore();
  const activeBv = brandVoiceProfiles.find((p) => p.id === activeBrandVoiceId);
  const resolvedNiche = useMemo(() => {
    const ctx = resolveNicheContext({
      userId,
      brandVoice: activeBv?.settings || null,
      audience: formData.audience,
    });
    const fromTopic = stripTopicHtml(formData.topic).trim();
    return ctx.niche || fromTopic || 'Social Media Marketing';
  }, [userId, activeBv?.settings, formData.audience, formData.topic]);

  return (
  <>
    <SaveTemplateModal
      isOpen={isSaveModalOpen}
      onClose={onCloseSaveModal}
      onSave={onSaveTemplate}
      templateToEdit={templateToEdit}
    />
    <TemplateBrowserModal
      isOpen={isTemplateBrowserOpen}
      onClose={onCloseTemplateBrowser}
      templates={templates}
      onSelect={onSelectTemplate}
      onSelectIndustryPrefill={onSelectIndustryPrefill}
      onEdit={onEditTemplate}
      onDelete={onDeleteTemplate}
      currentTeamId={currentTeamId}
      userId={userId}
    />
    <TopicAssistantModal
      isOpen={isAssistantModalOpen}
      onClose={onCloseAssistant}
      currentTopic={formData.topic}
      onApplySuggestion={onApplySuggestion}
    />
    <ReverseImageModal
      isOpen={isReverseImageOpen}
      onClose={onCloseReverseImage}
      onSelectPrompt={onReverseImageSelect}
      platform={formData.platform}
      brandVoice={brandVoiceDescription}
    />
    {isTechRadarOpen && (
      <SectionErrorBoundary sectionName="Tech Radar">
        <FeaturePanelModal
          open={isTechRadarOpen}
          onClose={onCloseTechRadar}
          sectionName="Tech Radar"
          maxWidthClass="max-w-3xl"
        >
          <TechRadarPanel
            niche={resolvedNiche}
            platform={formData.platform}
            onSelectTopic={(topic) => {
              onTrendSelect(topic);
              onCloseTechRadar();
            }}
            onAddToCalendar={(items) => {
              onAddTechNewsToCalendar?.(items);
              onCloseTechRadar();
            }}
          />
        </FeaturePanelModal>
      </SectionErrorBoundary>
    )}
    {isTrendAnalysisOpen && (
      <SectionErrorBoundary sectionName="Trend Analysis">
        <FeaturePanelModal
          open={isTrendAnalysisOpen}
          onClose={onCloseTrendAnalysis}
          sectionName="Trend Analysis"
          maxWidthClass="max-w-5xl"
          padded={false}
        >
          <TrendAnalysisPanel
            niche={resolvedNiche}
            platform={formData.platform}
            onSelectTrend={(trend) => {
              onTrendSelect(trend.topic);
              onCloseTrendAnalysis();
            }}
            onSelectTopic={(topic) => {
              onTrendSelect(topic);
              onCloseTrendAnalysis();
            }}
          />
        </FeaturePanelModal>
      </SectionErrorBoundary>
    )}
    {isScheduleOptimizerOpen && (
      <SectionErrorBoundary sectionName="Schedule Optimizer">
        <FeaturePanelModal
          open={isScheduleOptimizerOpen}
          onClose={onCloseScheduleOptimizer}
          sectionName="Schedule Optimizer"
        >
          <ScheduleOptimizer
            niche={resolvedNiche}
            platform={formData.platform}
            contentType={formData.contentType}
            onSelectTime={() => onScheduleSelect()}
          />
        </FeaturePanelModal>
      </SectionErrorBoundary>
    )}
    {isAIWorkflowOpen && (
      <SectionErrorBoundary sectionName="AI Workflow">
        <FeaturePanelModal open={isAIWorkflowOpen} onClose={onCloseAIWorkflow} sectionName="AI Workflow">
          <AIWorkflowPanel
            niche={resolvedNiche}
            platform={formData.platform}
            contentType={formData.contentType}
            tone={formData.tone}
            currentPostText={formData.topic}
            brandVoice={brandVoiceDescription}
          />
        </FeaturePanelModal>
      </SectionErrorBoundary>
    )}
    {isContentSafetyOpen && (
      <SectionErrorBoundary sectionName="Content Safety">
        <FeaturePanelModal open={isContentSafetyOpen} onClose={onCloseContentSafety} sectionName="Content Safety">
          <ContentSafetyPanel
            postText={formData.topic || ''}
            hashtags={
              formData.keywords
                ? formData.keywords.split(',').map((k) => k.trim()).filter(Boolean)
                : []
            }
            platform={formData.platform}
            isPromotional={formData.contentType === ContentType.Advertisement}
          />
        </FeaturePanelModal>
      </SectionErrorBoundary>
    )}
    {isRepurposingOpen && (
      <SectionErrorBoundary sectionName="Content Repurposing">
        <FeaturePanelModal open={isRepurposingOpen} onClose={onCloseRepurposing} sectionName="Content Repurposing">
          <ContentRepurposingPanel
            sourceContent={formData.topic}
            tone={formData.tone}
            currentPlatform={formData.platform}
          />
        </FeaturePanelModal>
      </SectionErrorBoundary>
    )}
    {isCrossPlatformOpen && (
      <SectionErrorBoundary sectionName="Cross-Platform Command Center">
        <FeaturePanelModal
          open={isCrossPlatformOpen}
          onClose={onCloseCrossPlatform}
          sectionName="Cross-Platform Command Center"
        >
          <CrossPlatformCommandCenter
            currentContent={formData.topic}
            tone={formData.tone}
            sourcePlatform={formData.platform}
          />
        </FeaturePanelModal>
      </SectionErrorBoundary>
    )}
    {isSocialMediaOpen && (
      <SectionErrorBoundary sectionName="Social Media Manager">
        <FeaturePanelModal open={isSocialMediaOpen} onClose={onCloseSocialMedia} sectionName="Social Media Manager">
          <SocialMediaManager currentContent={formData.topic} />
        </FeaturePanelModal>
      </SectionErrorBoundary>
    )}
    {isOmniOpen && (
      <SectionErrorBoundary sectionName="Gemini Omni Panel">
        <FeaturePanelModal open={isOmniOpen} onClose={onCloseOmni} sectionName="Gemini Omni Panel">
          <GeminiOmniPanel
            initialPrompt={formData.topic}
            platform={formData.platform}
            tone={formData.tone}
            contentType={formData.contentType}
          />
        </FeaturePanelModal>
      </SectionErrorBoundary>
    )}
  </>
  );
};
