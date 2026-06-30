import React, { lazy } from 'react';
import type { FormData, CustomTemplate } from '../../types';
import { ContentType } from '../../types';
import { SaveTemplateModal } from '../SaveTemplateModal';
import { TemplateBrowserModal } from '../TemplateBrowserModal';
import { TopicAssistantModal } from '../TopicAssistantModal';
import { ReverseImageModal } from '../ReverseImageModal';
import { SectionErrorBoundary } from '../ErrorBoundary';
import { FeaturePanelModal } from '../ui/FeaturePanelModal';

const TrendAnalysisPanel = lazy(() => import('../TrendAnalysisPanel').then((m) => ({ default: m.TrendAnalysisPanel })));
const ScheduleOptimizer = lazy(() => import('../ScheduleOptimizer').then((m) => ({ default: m.ScheduleOptimizer })));
const AIWorkflowPanel = lazy(() => import('../AIWorkflowPanel').then((m) => ({ default: m.AIWorkflowPanel })));
const ContentSafetyPanel = lazy(() => import('../ContentSafetyPanel').then((m) => ({ default: m.ContentSafetyPanel })));
const ContentRepurposingPanel = lazy(() => import('../ContentRepurposingPanel').then((m) => ({ default: m.ContentRepurposingPanel })));
const CrossPlatformCommandCenter = lazy(() => import('../CrossPlatformCommandCenter').then((m) => ({ default: m.CrossPlatformCommandCenter })));
const SocialMediaManager = lazy(() => import('../SocialMediaManager').then((m) => ({ default: m.SocialMediaManager })));
const VideoGenerator = lazy(() => import('../VideoGenerator').then((m) => ({ default: m.VideoGenerator })));
const GeminiOmniPanel = lazy(() => import('../GeminiOmniPanel').then((m) => ({ default: m.GeminiOmniPanel })));

export interface InputFormModalsProps {
  formData: FormData;
  brandVoiceDescription: string;
  templates: CustomTemplate[];
  currentTeamId: string | null;
  templateToEdit: CustomTemplate | null;
  isSaveModalOpen: boolean;
  isTemplateBrowserOpen: boolean;
  isAssistantModalOpen: boolean;
  isReverseImageOpen: boolean;
  isTrendAnalysisOpen: boolean;
  isScheduleOptimizerOpen: boolean;
  isAIWorkflowOpen: boolean;
  isContentSafetyOpen: boolean;
  isRepurposingOpen: boolean;
  isCrossPlatformOpen: boolean;
  isSocialMediaOpen: boolean;
  isVideoGeneratorOpen: boolean;
  isOmniOpen: boolean;
  onCloseSaveModal: () => void;
  onCloseTemplateBrowser: () => void;
  onCloseAssistant: () => void;
  onCloseReverseImage: () => void;
  onCloseTrendAnalysis: () => void;
  onCloseScheduleOptimizer: () => void;
  onCloseAIWorkflow: () => void;
  onCloseContentSafety: () => void;
  onCloseRepurposing: () => void;
  onCloseCrossPlatform: () => void;
  onCloseSocialMedia: () => void;
  onCloseVideoGenerator: () => void;
  onCloseOmni: () => void;
  onSaveTemplate: (name: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onEditTemplate: (template: CustomTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onApplySuggestion: (suggestion: string) => void;
  onReverseImageSelect: (prompt: string, caption?: string) => void;
  onTrendSelect: (topic: string) => void;
  onScheduleSelect: () => void;
}

export const InputFormModals: React.FC<InputFormModalsProps> = ({
  formData,
  brandVoiceDescription,
  templates,
  currentTeamId,
  templateToEdit,
  isSaveModalOpen,
  isTemplateBrowserOpen,
  isAssistantModalOpen,
  isReverseImageOpen,
  isTrendAnalysisOpen,
  isScheduleOptimizerOpen,
  isAIWorkflowOpen,
  isContentSafetyOpen,
  isRepurposingOpen,
  isCrossPlatformOpen,
  isSocialMediaOpen,
  isVideoGeneratorOpen,
  isOmniOpen,
  onCloseSaveModal,
  onCloseTemplateBrowser,
  onCloseAssistant,
  onCloseReverseImage,
  onCloseTrendAnalysis,
  onCloseScheduleOptimizer,
  onCloseAIWorkflow,
  onCloseContentSafety,
  onCloseRepurposing,
  onCloseCrossPlatform,
  onCloseSocialMedia,
  onCloseVideoGenerator,
  onCloseOmni,
  onSaveTemplate,
  onSelectTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onApplySuggestion,
  onReverseImageSelect,
  onTrendSelect,
  onScheduleSelect,
}) => (
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
      onEdit={onEditTemplate}
      onDelete={onDeleteTemplate}
      currentTeamId={currentTeamId}
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
            niche={formData.audience || formData.topic || 'Social Media Marketing'}
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
            niche={formData.audience || formData.topic || 'Social Media Marketing'}
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
            niche={formData.audience || formData.topic || 'Social Media Marketing'}
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
    {isVideoGeneratorOpen && (
      <SectionErrorBoundary sectionName="Video Generator">
        <FeaturePanelModal open={isVideoGeneratorOpen} onClose={onCloseVideoGenerator} sectionName="Video Generator">
          <VideoGenerator
            topic={formData.topic}
            platform={formData.platform}
            tone={formData.tone}
            contentType={formData.contentType}
          />
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
