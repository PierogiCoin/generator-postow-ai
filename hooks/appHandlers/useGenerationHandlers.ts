import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useGenerationStore } from '../../stores/generationStore';
import { useDataStore } from '../../stores/dataStore';
import { useAuth } from '../../contexts/AuthContext';
import { useUsageLimiter } from '../useUsageLimiter';
import * as geminiService from '../../services/geminiService';
import { generateMultiVariants } from '../../services/multiVariantService';
import {
    FormData,
    GenerationResult,
    NewCampaignPayload,
    GenerationType,
    GenerationMode,
} from '../../types';
import { NotificationType } from '../../types';
import { normalizeFormData } from '../../components/inputForm/defaultFormData';
import { showSuccess, showWarning } from '../../utils/errorHandler';
import { isQuotaDepleted } from '../../utils/chunkReload';
import { clearOnboardingPendingFirstGenerate } from '../../utils/onboarding';
import { overlayLogoOnImage } from '../../utils/imageBranding';
import { canAutoPublish, autoPublishToConnectedAccounts, getPublishablePostText } from '../../services/autoPublishService';
import {
    scorePostContent,
    passesAutoPublishQualityGate,
    AUTO_PUBLISH_MIN_SCORE,
} from '../../services/contentScoringService';
import { fulfillCalendarSlot, parseSlotScheduleTimestamp } from '../../services/calendarSlotService';
import type { ApiErrorHandler, ToastFn } from './types';

interface GenerationHandlerDeps {
    addToast: ToastFn;
    t: (key: string) => string;
    handleApiError: ApiErrorHandler;
}

export const useGenerationHandlers = ({ addToast, t, handleApiError }: GenerationHandlerDeps) => {
    const { user, userPlan } = useAuth();
    const abortControllerRef = useRef<AbortController | null>(null);

    const genActions = useGenerationStore.getState();
    const dataActions = useDataStore.getState();

    const stats = useDataStore(state => state.stats);
    const brandVoiceProfiles = useDataStore(state => state.brandVoiceProfiles);
    const activeBrandVoiceId = useDataStore(state => state.activeBrandVoiceId);
    const learnedInsights = useDataStore(state => state.learnedInsights);

    const { canGenerate } = useUsageLimiter({ userPlan, stats, addToast });

    const markOnboardingFirstPostDone = () => {
        if (user?.id) clearOnboardingPendingFirstGenerate(user.id);
    };

    const runAutoPublishIfEnabled = async (finalResult: GenerationResult, formData: FormData) => {
        if (!user?.id || !canAutoPublish(finalResult, formData)) return;

        const publishText = getPublishablePostText(finalResult);
        if (publishText.length >= 60) {
            genActions.setProgress('Sprawdzanie bramy jakości przed publikacją…');
            try {
                const qualityScore = await scorePostContent(publishText, formData.platform, user.id, {
                    hasHashtags: (finalResult.hashtags?.length ?? 0) > 0 || publishText.includes('#'),
                    hasEmojis: /[\u{1F300}-\u{1FAFF}]/u.test(publishText),
                    targetAudience: formData.audience,
                });
                if (!passesAutoPublishQualityGate(qualityScore)) {
                    showWarning(
                        'Auto-publikacja wstrzymana',
                        `Ocena ${qualityScore.overall}/100 — popraw treść w bramie jakości (min. ${AUTO_PUBLISH_MIN_SCORE}).`
                    );
                    return;
                }
            } catch {
                showWarning(
                    'Auto-publikacja wstrzymana',
                    'Nie udało się ocenić treści — opublikuj ręcznie po sprawdzeniu jakości.'
                );
                return;
            }
        }

        genActions.setProgress('Publikowanie na połączonych kontach…');
        try {
            const summary = await autoPublishToConnectedAccounts(finalResult, formData, user.id);

            if (summary.published.length > 0) {
                const names = summary.published.map((p) => p.platform).join(', ');
                showSuccess(
                    `Opublikowano na ${summary.published.length} kontach`,
                    names
                );
            }

            if (summary.skipped.length > 0 && summary.published.length === 0) {
                showWarning(
                    'Brak publikacji',
                    summary.skipped.map((s) => `${s.platform}: ${s.reason}`).join(' · ')
                );
            }

            if (summary.failed.length > 0) {
                showWarning(
                    summary.published.length > 0 ? 'Część publikacji nie powiodła się' : 'Automatyczna publikacja nie powiodła się',
                    summary.failed.map((f) => `${f.platform}: ${f.error}`).join(' · ')
                );
            }
        } catch (error) {
            handleApiError(error, 'errors.unknownError');
        }
    };

    const fulfillPendingCalendarSlot = async (finalResult: GenerationResult, formData: FormData) => {
        const slot = useGenerationStore.getState().pendingCalendarSlot;
        if (!slot || !user) return;

        useGenerationStore.getState().clearPendingCalendarSlot();
        try {
            await fulfillCalendarSlot(slot, formData, finalResult, user.id, {
                addOrUpdateScheduledPost: dataActions.addOrUpdateScheduledPost,
                removeIntelligentCalendarPlanItem: dataActions.removeIntelligentCalendarPlanItem,
            });
            showSuccess(
                'Slot kalendarza zrealizowany',
                `Zaplanowano na ${new Date(parseSlotScheduleTimestamp(slot.date, slot.time)).toLocaleString('pl-PL', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                })}`
            );
        } catch {
            showWarning(
                'Treść wygenerowana',
                'Nie udało się automatycznie dodać do kalendarza — zaplanuj ręcznie z wyniku.'
            );
        }
    };

    const handleGenerate = useCallback(async (rawFormData: FormData) => {
        const formData = normalizeFormData(rawFormData);
        if (!user) {
            addToast(t('errors.api_not_available'), NotificationType.Error);
            return;
        }

        const activeBrandVoice = brandVoiceProfiles.find(p => p.id === activeBrandVoiceId);

        if (!canGenerate(formData.generationType)) {
            genActions.generationFailure({ message: t('errors.limit_reached'), type: 'limit' });
            return;
        }

        genActions.startGeneration(formData);

        abortControllerRef.current?.abort();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            if (formData.generationType === GenerationType.ABTest) {
                genActions.setProgress('Generowanie wariantów A/B...');
                const [variantA, variantB] = await geminiService.generateABTestVariations(
                    formData,
                    activeBrandVoice?.settings || null,
                    user.id
                );

                const abTestResultContainer = {
                    id: uuidv4(),
                    type: GenerationType.ABTest,
                    platform: formData.platform,
                    postText: '',
                    variants: [variantA, variantB],
                    winnerVariantId: null,
                    hashtags: [],
                    imageUrl: null,
                    adHeadline: null,
                    callToAction: null,
                    metadata: {
                        tone: formData.tone,
                        audience: formData.audience,
                        prompt: formData.topic,
                        keywords: formData.keywords,
                    },
                    approvalStatus: 'draft' as const,
                    comments: [],
                    authorId: user.id,
                } as GenerationResult;

                await dataActions.addGenerationToHistory({ formData, result: abTestResultContainer });
                await dataActions.addGenerationStat({ ...formData, generationType: GenerationType.Idea });

                genActions.generationSuccess(abTestResultContainer);
                markOnboardingFirstPostDone();
                addToast('Test A/B wygenerowany pomyślnie!', NotificationType.Success);
                return;
            }

            if (formData.generationMode === GenerationMode.MultiVariant) {
                genActions.setProgress('Generowanie 3 wariantów posta (A/B/C)...');
                const variants = await generateMultiVariants(formData, activeBrandVoice?.settings || null, user.id);

                const multiVariantResult: GenerationResult = {
                    id: uuidv4(),
                    type: GenerationType.PostWithImage,
                    platform: formData.platform,
                    postText: 'Wygenerowano 3 warianty posta. Wybierz najlepszy!',
                    hashtags: [],
                    imageUrl: null,
                    adHeadline: null,
                    callToAction: null,
                    multiVariantPosts: variants,
                    metadata: {
                        tone: formData.tone,
                        audience: formData.audience,
                        keywords: formData.keywords,
                        prompt: formData.topic,
                        generationMode: GenerationMode.MultiVariant,
                    },
                    approvalStatus: 'draft',
                    comments: [],
                    authorId: user.id,
                };

                await dataActions.addGenerationToHistory({ formData, result: multiVariantResult });
                await dataActions.addGenerationStat(formData);

                genActions.generationSuccess(multiVariantResult);
                markOnboardingFirstPostDone();
                addToast('3 warianty posta wygenerowane! Wybierz najlepszy hook.', NotificationType.Success);
                await fulfillPendingCalendarSlot(multiVariantResult, formData);
                return;
            }

            if (formData.generationType === GenerationType.Omnichannel) {
                genActions.setProgress('Generowanie postów dla wielu platform (Omnichannel)...');
                const omnichannelPosts = await geminiService.generateOmnichannelPosts(
                    formData,
                    activeBrandVoice?.settings || null,
                    user.id
                );

                const omnichannelResult: GenerationResult = {
                    id: uuidv4(),
                    type: GenerationType.Omnichannel,
                    platform: formData.platform,
                    postText: `Wygenerowano ${omnichannelPosts.length} postów dla różnych kanałów.`,
                    hashtags: [],
                    omnichannelPosts,
                    adHeadline: null,
                    callToAction: null,
                    imageUrl: null,
                    metadata: {
                        tone: formData.tone,
                        audience: formData.audience,
                        keywords: formData.keywords,
                        prompt: formData.topic,
                    },
                    approvalStatus: 'draft',
                    comments: [],
                    authorId: user.id,
                };

                await dataActions.addGenerationToHistory({ formData, result: omnichannelResult });
                await dataActions.addGenerationStat(formData);

                genActions.generationSuccess(omnichannelResult);
                markOnboardingFirstPostDone();
                addToast('Omnichannel wygenerowany pomyślnie!', NotificationType.Success);
                await fulfillPendingCalendarSlot(omnichannelResult, formData);
                await runAutoPublishIfEnabled(omnichannelResult, formData);
                return;
            }

            if (formData.generationType === GenerationType.Video) {
                genActions.setProgress('Inicjalizacja generowania wideo...');
                const videoPrompt = formData.videoTranscript || formData.topic;

                let operation = formData.imageForVideo?.base64
                    ? await geminiService.generateVideoFromImage(
                        videoPrompt,
                        formData.imageForVideo,
                        formData.aspectRatio || '16:9',
                        user.id
                    )
                    : await geminiService.generateVideoFromText(
                        videoPrompt,
                        formData.aspectRatio || '16:9',
                        user.id
                    );

                genActions.setProgress('Oczekiwanie na ukończenie wideo (polowanie LRO)...');

                const LRO_TIMEOUT_MS = 10 * 60 * 1000;
                const INITIAL_DELAY_MS = 5000;
                const MAX_DELAY_MS = 60000;
                const MAX_RETRIES = 100;

                let currentDelay = INITIAL_DELAY_MS;
                let retries = 0;
                const startTime = Date.now();

                while (!operation.done && Date.now() - startTime < LRO_TIMEOUT_MS && retries < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, currentDelay));
                    operation = await geminiService.getVideoOperationStatus(operation, user.id);

                    if (operation.error) {
                        throw new Error(`Video generation failed during polling: ${operation.error.message || 'Unknown error'}`);
                    }

                    currentDelay = Math.min(currentDelay * 1.5, MAX_DELAY_MS);
                    retries++;
                    genActions.setProgress(
                        `Oczekiwanie na ukończenie wideo (próba ${retries}/${MAX_RETRIES}, opóźnienie: ${Math.floor(currentDelay / 1000)}s)...`
                    );
                }

                if (!operation.done) {
                    if (Date.now() - startTime >= LRO_TIMEOUT_MS) {
                        throw new Error('Video generation timed out after 10 minutes.');
                    }
                    throw new Error(`Video generation failed after ${MAX_RETRIES} retries.`);
                }

                const videoData = operation.response?.videos?.[0]?.video;
                let videoUrl: string | null = null;

                if (videoData?.videoBytes) {
                    const mimeType = videoData.mimeType || 'video/mp4';
                    videoUrl = `data:${mimeType};base64,${videoData.videoBytes}`;
                } else {
                    throw new Error('Video generation finished, but no video data was provided.');
                }

                genActions.setProgress('Generowanie opisu posta...');
                const details = await geminiService.generatePostDetails(
                    videoPrompt,
                    formData,
                    activeBrandVoice?.settings || null,
                    user.id
                );

                const videoResult: GenerationResult = {
                    id: uuidv4(),
                    type: GenerationType.Video,
                    platform: formData.platform,
                    postText: videoPrompt,
                    hashtags: details.hashtags || [],
                    imageUrl: null,
                    videoUrl,
                    videoTitle: details.videoTitle,
                    videoDescription: details.videoDescription,
                    adHeadline: null,
                    callToAction: null,
                    metadata: {
                        tone: formData.tone,
                        audience: formData.audience,
                        keywords: formData.keywords,
                        prompt: `Generowanie dla: ${formData.topic}`,
                    },
                    approvalStatus: 'draft',
                    comments: [],
                    authorId: user.id,
                };

                await dataActions.addGenerationToHistory({ formData, result: videoResult });
                await dataActions.addGenerationStat(formData);
                genActions.generationSuccess(videoResult);
                markOnboardingFirstPostDone();
                addToast('Wideo (Placeholder) wygenerowane pomyślnie!', NotificationType.Success);
                await fulfillPendingCalendarSlot(videoResult, formData);
                return;
            }

            const initialResult: GenerationResult = {
                id: uuidv4(),
                type: formData.generationType,
                platform: formData.platform,
                postText: '',
                hashtags: [],
                imageUrl: null,
                videoUrl: null,
                adHeadline: null,
                callToAction: null,
                metadata: {
                    tone: formData.tone,
                    audience: formData.audience,
                    keywords: formData.keywords,
                    prompt: `Generowanie dla: ${formData.topic}`,
                },
                approvalStatus: 'draft',
                comments: [],
                authorId: user.id,
            };
            genActions.setStreamResult(initialResult);

            let generationInsights = [...(learnedInsights || []), ...(formData.learnedInsights || [])];
            if (!generationInsights.some(i => i.category === 'context') && !formData.repurposeFrom) {
                const recentSamePlatform = useDataStore.getState().history
                    .filter(h => h.formData?.platform === formData.platform && h.result?.postText)
                    .sort((a, b) => b.timestamp - a.timestamp)[0];

                if (recentSamePlatform?.result?.postText) {
                    generationInsights.push({
                        id: 'recent-context',
                        type: 'observation',
                        category: 'context',
                        text: recentSamePlatform.result.postText.substring(0, 300),
                    });
                }
            }

            const fullTextStream = geminiService.generateSocialMediaContentStream(
                formData,
                activeBrandVoice?.settings || null,
                user.id,
                generationInsights,
                abortController.signal
            );

            let streamVisualVibe: string | undefined;
            for await (const chunk of fullTextStream) {
                if (chunk.startsWith('__VISUAL_VIBE__:')) {
                    streamVisualVibe = chunk.slice('__VISUAL_VIBE__:'.length);
                } else {
                    genActions.appendStreamChunk(chunk);
                }
            }

            const streamedText = useGenerationStore.getState().result?.postText || '';
            genActions.setProgress(t('progress.analyzing_content'));
            genActions.startAnalyses();

            let details: Partial<GenerationResult> = {};
            let sentiment = null;
            let seo = null;

            if (!isQuotaDepleted() && streamedText.trim().length > 0) {
                const analysisResults = await Promise.allSettled([
                    geminiService.generatePostDetails(
                        streamedText,
                        formData,
                        activeBrandVoice?.settings || null,
                        user.id,
                        streamVisualVibe
                    ),
                    geminiService.analyzeSentiment(streamedText, user.id),
                    geminiService.analyzeSEO(streamedText, user.id),
                ]);

                details = analysisResults[0].status === 'fulfilled' ? analysisResults[0].value : {};
                sentiment = analysisResults[1].status === 'fulfilled' ? analysisResults[1].value : null;
                seo = analysisResults[2].status === 'fulfilled' ? analysisResults[2].value : null;
            } else if (isQuotaDepleted()) {
                showWarning(
                    'Limit API Gemini wyczerpany',
                    'Post został wygenerowany bez analizy SEO, sentymentu i grafiki. Włącz billing w Google AI Studio lub spróbuj jutro.'
                );
            }

            if (formData.includeLogo && activeBrandVoice?.settings?.logoUrl && details.imageUrl) {
                genActions.setProgress('Nakładanie Logo Marki...');
                try {
                    details.imageUrl = await overlayLogoOnImage(details.imageUrl, activeBrandVoice.settings.logoUrl);
                } catch {
                    // Użyj oryginalnego obrazu przy błędzie brandingu
                }
            }

            genActions.setResultDetails(details);
            genActions.analysesSuccess({ sentiment, seo });

            genActions.setProgress(t('progress.finalizing'));
            const finalResult = { ...useGenerationStore.getState().result!, ...details };

            await dataActions.addGenerationToHistory({
                formData,
                result: finalResult,
                sentimentAnalysis: sentiment,
                seoAnalysis: seo,
            });
            await dataActions.addGenerationStat(formData);
            genActions.generationSuccess(finalResult);
            markOnboardingFirstPostDone();

            showSuccess('Treść wygenerowana pomyślnie!', 'Możesz ją teraz edytować lub zapisać');
            await fulfillPendingCalendarSlot(finalResult, formData);
            await runAutoPublishIfEnabled(finalResult, formData);
        } catch (error) {
            const errorPayload = handleApiError(error, 'errors.generation_failed');
            genActions.generationFailure(errorPayload);
        } finally {
            genActions.setProgress(null);
        }
    }, [
        user,
        addToast,
        t,
        genActions,
        dataActions,
        handleApiError,
        brandVoiceProfiles,
        activeBrandVoiceId,
        learnedInsights,
        canGenerate,
    ]);

    const handleRetry = useCallback(() => {
        const { lastFormData } = useGenerationStore.getState();
        if (lastFormData) handleGenerate(lastFormData);
    }, [handleGenerate]);

    const handleApplyAudio = useCallback((audioDescription: string) => {
        const { lastFormData } = useGenerationStore.getState();
        if (lastFormData) {
            handleGenerate({ ...lastFormData, audioDescription });
        }
    }, [handleGenerate]);

    const handleAbortGeneration = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        genActions.generationFailure({ message: t('errors.generation_cancelled'), type: 'unknown' });
        genActions.setProgress(null);
    }, [genActions, t]);

    return {
        handleGenerate,
        handleRetry,
        handleApplyAudio,
        handleAbortGeneration,
    };
};
