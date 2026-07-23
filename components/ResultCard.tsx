import { CreativeCanvas } from './ui/CreativeCanvas';
import { suggestImageLayouts } from '../services/mediaService';
import React, { useState, useEffect, useMemo } from 'react';
import { formatPublishCaption, resolveCtaUrl } from '../utils/publishCaption';
import { useTranslation } from 'react-i18next';
import type { GenerationResult } from '../types';
import { GenerationType, NotificationType } from '../types';
import { ErrorDisplay } from './ErrorDisplay';
import { MultiVariantResult } from './MultiVariantResult';
import { MultiVariantPost } from '../types';
import { HashtagGenerator } from './HashtagGenerator';
import { XMarkIcon } from './icons/XMarkIcon';
import { VisualStudioModal } from './VisualStudioModal';

import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { ResultCardLoadingState, ResultCardReadyState } from './resultCard/ResultCardStates';
import { ABTestResultDisplay } from './resultCard/ABTestResultDisplay';
import { ResultPrimaryActions } from './resultCard/ResultPrimaryActions';
import { ResultCardTabBar, type ResultCardTab } from './resultCard/ResultCardTabBar';
import { QualityGatePanel } from './resultCard/QualityGatePanel';
import { ResultMediaPanel } from './resultCard/ResultMediaPanel';
import { ResultContentTab } from './resultCard/ResultContentTab';
import { ResultPublishTab } from './resultCard/ResultPublishTab';
import { ResultAnalysisTab } from './resultCard/ResultAnalysisTab';
import { OmnichannelResultView } from './resultCard/OmnichannelResultView';
import { ContentRepurposingPanel } from './ContentRepurposingPanel';

interface ResultCardProps {
  historyResult?: GenerationResult | null;
}

interface SuggestedLayout {
  text: string;
  position?: string;
  style?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({ historyResult }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notificationSystem = useNotifications();
  const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);
  const [isCopied, setIsCopied] = useState(false);
  const [isHashtagGeneratorOpen, setIsHashtagGeneratorOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'standard' | 'mobile'>('standard');
  const [activeTab, setActiveTab] = useState<ResultCardTab>('content');
  const [isCreativeStudioOpen, setIsCreativeStudioOpen] = useState(false);
  const [isVisualStudioOpen, setIsVisualStudioOpen] = useState(false);
  const [suggestedLayouts, setSuggestedLayouts] = useState<SuggestedLayout[]>([]);

  const {
    result: storeResult,
    isLoading,
    error,
    generationProgress,
    lastFormData,
    sentimentAnalysis,
    isAnalyzingSentiment,
    seoAnalysis,
    isAnalyzingSEO,
    performancePrediction,
    isPredictingPerformance,
    isAssistantLoading,
    isRegenerating,
    hookVariations,
    isSuggestingHooks,
    isRegeneratingImage,
  } = useGenerationStore();

  const { inspiration, activeBrandVoiceId, brandVoiceProfiles } = useDataStore();
  const result = historyResult || storeResult;
  const formData = inspiration?.formData || lastFormData;
  const activeProfile = brandVoiceProfiles.find((p) => p.id === activeBrandVoiceId);

  useEffect(() => {
    if (result?.id) setActiveTab('content');
  }, [result?.id]);

  const handleOpenCreativeStudio = async () => {
    if (!user || !result?.postText) return;
    setIsCreativeStudioOpen(true);
    try {
      const data = (await suggestImageLayouts(result.postText, user.id)) as
        | { layouts?: unknown[] }
        | undefined;
      if (data?.layouts) setSuggestedLayouts(data.layouts as SuggestedLayout[]);
    } catch (e: unknown) {
      notificationSystem.addToast(
        e instanceof Error ? e.message : 'Błąd pobierania layoutów',
        NotificationType.Error
      );
    }
  };

  const publishCaptionPreview = useMemo(() => {
    if (!result) return '';
    const ctaUrl = resolveCtaUrl(result.ctaUrl, activeProfile?.settings?.websiteUrl);
    return formatPublishCaption({
      postText: result.postText,
      hashtags: result.hashtags,
      callToAction: result.callToAction,
      ctaUrl,
    });
  }, [result, activeProfile?.settings?.websiteUrl]);

  const resolvedCtaUrl = useMemo(
    () => resolveCtaUrl(result?.ctaUrl, activeProfile?.settings?.websiteUrl),
    [result?.ctaUrl, activeProfile?.settings?.websiteUrl]
  );

  const handleCopy = () => {
    if (!result) return;
    let textToCopy = result.postText;
    if (result.hashtags.length > 0) {
      textToCopy += `\n\n${result.hashtags.join(' ')}`;
    }
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApplyImageEdit = (newImageUrl: string) => {
    void appHandlers.handleApplyImageEdit(newImageUrl);
  };

  const handleUpdateResult = (updatedResult: GenerationResult) => {
    appHandlers.handleSetResult(updatedResult);
  };

  if (isLoading && !result) {
    return (
      <div className="border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70 rounded-lg p-6 min-h-[400px] flex items-center justify-center">
        <ResultCardLoadingState progressMessage={generationProgress} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70 rounded-lg p-6">
        <ErrorDisplay error={error} onRetry={appHandlers.handleRetry} />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70 rounded-lg p-6 min-h-[400px] flex items-center justify-center">
        <ResultCardReadyState />
      </div>
    );
  }

  if (result.type === GenerationType.Omnichannel && result.omnichannelPosts) {
    return (
      <OmnichannelResultView
        result={result}
        isLoading={isLoading}
        previewMode={previewMode}
        onTogglePreviewMode={() =>
          setPreviewMode((prev) => (prev === 'standard' ? 'mobile' : 'standard'))
        }
        onToast={notificationSystem.addToast}
      />
    );
  }

  if (result.multiVariantPosts && result.multiVariantPosts.length > 0) {
    return (
      <div className="border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70 rounded-lg p-8 space-y-8 animate-fade-in-up">
        <MultiVariantResult
          variants={result.multiVariantPosts}
          onSelectVariant={(variant: MultiVariantPost) => {
            const selectedResult: GenerationResult = {
              ...result,
              postText: variant.postText,
              hashtags: variant.hashtags,
              multiVariantPosts: undefined,
              metadata: {
                ...result.metadata,
                hookType: variant.hookType,
              },
            };
            handleUpdateResult(selectedResult);
            notificationSystem.addToast(
              `Wybrano wariant ${variant.variant} (${variant.hookType})`,
              NotificationType.Success
            );
          }}
        />
      </div>
    );
  }

  const renderContent = () => {
    if (result.type === GenerationType.ABTest) {
      return (
        <ABTestResultDisplay
          result={result}
          onUpdateResult={handleUpdateResult}
          onOpenCreativeStudio={handleOpenCreativeStudio}
        />
      );
    }

    switch (result.type) {
      case GenerationType.Idea:
        return <div>Idea results...</div>;
      case GenerationType.Campaign:
        return <div>Campaign results...</div>;
      default:
        return (
          <div className="space-y-2">
            {formData && (
              <ResultPrimaryActions
                result={result}
                formData={formData}
                onCopy={handleCopy}
                isCopied={isCopied}
                onOpenCreativeStudio={handleOpenCreativeStudio}
              />
            )}

            {formData && result.postText?.trim() && (
              <QualityGatePanel
                postText={result.postText}
                platform={formData.platform}
                userId={user?.id}
                hashtags={result.hashtags}
                audience={formData.audience}
                isBusy={isLoading || isRegenerating}
                onAutoFix={async (prompt) => {
                  await appHandlers.handleRegenerateWithFeedback(prompt);
                  notificationSystem.addToast(
                    t('resultCard.qualityGate.fixed', 'Post został poprawiony'),
                    NotificationType.Success
                  );
                }}
              />
            )}

            <ResultCardTabBar active={activeTab} onChange={setActiveTab} />

            {activeTab === 'content' && (
              <ResultContentTab
                result={result}
                formData={formData}
                previewMode={previewMode}
                onTogglePreviewMode={() =>
                  setPreviewMode((prev) => (prev === 'standard' ? 'mobile' : 'standard'))
                }
                isLoading={isLoading}
                isRegenerating={isRegenerating}
                isAssistantLoading={isAssistantLoading}
                isRegeneratingImage={isRegeneratingImage}
                hookVariations={hookVariations}
                isSuggestingHooks={isSuggestingHooks}
                showGenerateImageBanner={
                  !result.imageUrl &&
                  !result.videoUrl &&
                  !!formData &&
                  (formData.generationType === GenerationType.PostWithImage ||
                    !!result.imageGenerationFailed)
                }
                onEditImage={() => {
                  setActiveTab('media');
                  if (result.imageUrl) {
                    setIsVisualStudioOpen(true);
                  }
                }}
                onGenerateImage={() => {
                  setActiveTab('media');
                  void appHandlers.handleRegenerateImage();
                }}
                onUpdateResult={handleUpdateResult}
                onAIAssistantAction={appHandlers.handleAIAssistantAction}
                onSuggestHooks={appHandlers.handleSuggestHooks}
                onApplyHook={appHandlers.handleApplyHook}
                onApplyHookWithNewImage={(hook) =>
                  void appHandlers.handleApplyHookWithNewImage(hook)
                }
              />
            )}

            {activeTab === 'media' && (
              <ResultMediaPanel
                result={result}
                isRegeneratingImage={isRegeneratingImage}
                canGenerateImage={
                  !!formData &&
                  (formData.generationType === GenerationType.PostWithImage ||
                    formData.generationType === GenerationType.ABTest ||
                    !!result.imageGenerationFailed)
                }
                onRegenerateImage={(prompt) => void appHandlers.handleRegenerateImage(prompt)}
                onOpenAiStudio={() => setIsVisualStudioOpen(true)}
                onOpenCreativeStudio={() => void handleOpenCreativeStudio()}
                onReformatForPlatform={(p) => void appHandlers.handleReformatImageForPlatform(p)}
              />
            )}

            {activeTab === 'repurpose' && formData && (
              <div className="animate-fade-in">
                <ContentRepurposingPanel
                  sourceContent={result.postText}
                  tone={formData.tone}
                  currentPlatform={result.platform}
                  initialVideoUrl={result.videoUrl ?? undefined}
                />
              </div>
            )}

            {activeTab === 'publish' && (
              <ResultPublishTab
                result={result}
                formData={formData}
                userId={user?.id}
                publishCaptionPreview={publishCaptionPreview}
                resolvedCtaUrl={resolvedCtaUrl}
                onSchedule={() =>
                  formData && appHandlers.handleOpenScheduleModal(result, formData)
                }
                onPublishNow={(connectionId, options) =>
                  formData &&
                  appHandlers.handlePublishNow(result, formData.platform, connectionId, options)
                }
                onOpenRepurpose={() => appHandlers.handleOpenRepurposeModal(result)}
                onToast={notificationSystem.addToast}
              />
            )}

            {activeTab === 'analysis' && (
              <ResultAnalysisTab
                formData={formData}
                performancePrediction={performancePrediction}
                isPredictingPerformance={isPredictingPerformance}
                sentimentAnalysis={sentimentAnalysis}
                isAnalyzingSentiment={isAnalyzingSentiment}
                seoAnalysis={seoAnalysis}
                isAnalyzingSEO={isAnalyzingSEO}
                onPredict={appHandlers.handlePredictPerformance}
                onAnalyzeSEO={appHandlers.handleAnalyzeSEO}
                onOpenHashtagGenerator={() => setIsHashtagGeneratorOpen(true)}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70 rounded-lg p-6 md:p-8">
      {renderContent()}

      {isCreativeStudioOpen && result?.imageUrl && (
        <CreativeCanvas
          imageUrl={result.imageUrl}
          initialText={suggestedLayouts[0]?.text || result.postText.substring(0, 30)}
          logoUrl={activeProfile?.settings?.logoUrl}
          mascotUrl={activeProfile?.settings?.mascotUrl}
          userId={user?.id}
          onExport={(dataUrl) => {
            handleApplyImageEdit(dataUrl);
            notificationSystem.addToast(
              t('resultCard.media.saved', 'Grafika zapisana do posta'),
              NotificationType.Success
            );
          }}
          onClose={() => setIsCreativeStudioOpen(false)}
        />
      )}

      {isVisualStudioOpen && result?.imageUrl && user && (
        <VisualStudioModal
          isOpen={isVisualStudioOpen}
          onClose={() => setIsVisualStudioOpen(false)}
          originalImageUrl={result.imageUrl}
          user={user}
          onOpenTextStudio={() => {
            setIsVisualStudioOpen(false);
            setIsCreativeStudioOpen(true);
          }}
          onApply={(newImageUrl) => {
            handleApplyImageEdit(newImageUrl);
            setIsVisualStudioOpen(false);
            notificationSystem.addToast(
              t('resultCard.media.aiSaved', 'Edycja AI zapisana'),
              NotificationType.Success
            );
          }}
        />
      )}

      {isHashtagGeneratorOpen && formData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0a1220] border border-slate-200 dark:border-white/10 rounded-lg shadow-xl">
            <button
              type="button"
              onClick={() => setIsHashtagGeneratorOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-100 dark:bg-white/5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="p-6">
              <HashtagGenerator
                topic={formData.topic || formData.audience || 'Social Media'}
                platform={formData.platform}
                contentType={formData.contentType}
                onSelectHashtags={(hashtags) => {
                  handleUpdateResult({
                    ...result,
                    hashtags,
                  });
                  setIsHashtagGeneratorOpen(false);
                }}
                currentHashtags={result.hashtags}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
