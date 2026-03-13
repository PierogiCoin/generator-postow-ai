import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
// 🟢 DODANO: Import uuidv4
import { v4 as uuidv4 } from 'uuid';

// Zustand stores - importujemy tylko hooki do pobierania akcji
import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { useUIStore } from '../stores/uiStore';

// Services
import * as geminiService from '../services/geminiService';

// Types and utils
import { useAuth } from '../contexts/AuthContext';
import { USAGE_LIMITS } from '../constants';
import { FormData, AppError, GenerationResult, ScheduledPost, FavoritePost, BrandVoiceProfile, CampaignHistoryItem, NewCampaignPayload, CustomTemplate, AIAssistantAction, Draft, Platform, GenerationType } from '../types'; // Import Platform and GenerationType
import { NotificationType } from '../types';

// UX/UI improvements
import { showSuccess, showError, showWarning, showInfo } from '../utils/errorHandler';
import { useUsageLimiter } from '../hooks/useUsageLimiter';
import { overlayLogoOnImage } from '../utils/imageBranding';

export const useAppHandlers = (addToast: (message: string, type: NotificationType, duration?: number) => void, addNotification: (message: string, type: NotificationType, link?: string) => void) => {
    const { t } = useTranslation();
    const { user, userPlan } = useAuth();

    // Pobieranie akcji ze stanu Zustand (akcje są stabilne, więc można je pobrać raz)
    const genActions = useGenerationStore.getState();
    const dataActions = useDataStore.getState();
    const uiActions = useUIStore.getState();

    // POBIERANIE DYNAMICZNEGO STANU Z ZUSTAND (do użycia jako zależności useCallback)
    const stats = useDataStore(state => state.stats);
    const brandVoiceProfiles = useDataStore(state => state.brandVoiceProfiles);
    const activeBrandVoiceId = useDataStore(state => state.activeBrandVoiceId);
    const learnedInsights = useDataStore(state => state.learnedInsights);

    const { canGenerate } = useUsageLimiter({ userPlan, stats, addToast });

    // Analysis Modal state
    const [itemToAnalyze, setItemToAnalyze] = useState<CampaignHistoryItem | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [isPerformingAnalysis, setIsPerformingAnalysis] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    // Zmemoizowana funkcja do obsługi błędów API
    const handleApiError = useCallback((error: any, defaultMessageKey: string): AppError => {
        let errorPayload: AppError;
        const errorMessage = error.message || t("errors.unknownError");

        if (errorMessage.includes("[SAFETY]")) {
            errorPayload = { message: t("errors.safetyBlock.title"), details: t("errors.safetyBlock.details"), type: "api" };
        } else if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("API_KEY_SELECTION_REQUIRED")) {
            // Ujednolicona obsługa nieprawidłowego/wymaganego klucza API, w tym błędu Veo
            errorPayload = { message: t("errors.apiKeyInvalid.title"), details: t("errors.apiKeyInvalid.details"), type: "api" };
            uiActions.setIsVeoKeyModalNeeded(true); // Wymuś otwarcie modala do wprowadzenia klucza
        } else if (errorMessage.toLowerCase().includes("rate limit")) {
            errorPayload = { message: t("errors.rateLimit.title"), details: t("errors.rateLimit.details"), type: "limit" };
        } else {
            errorPayload = { message: t(defaultMessageKey), details: errorMessage, type: "unknown" };
        }

        // Use new toast system with better UX
        showError(error, errorPayload.message);
        addToast(errorPayload.message, NotificationType.Error);
        return errorPayload;
    }, [t, addToast, uiActions]);

    const handleGenerate = useCallback(async (formData: FormData) => {
        if (!user) {
            addToast(t("errors.api_not_available"), NotificationType.Error);
            return;
        }

        const activeBrandVoice = brandVoiceProfiles.find(p => p.id === activeBrandVoiceId);

        if (!canGenerate(formData.generationType)) {
            genActions.generationFailure({ message: t("errors.limit_reached"), type: "limit" }); // Redundant error payload creation as `canGenerate` already handles toast/modal
            return;
        }

        genActions.startGeneration(formData);

        try {
            // --- A/B Test Generation ---
            if (formData.generationType === GenerationType.ABTest) {
                genActions.setProgress("Generowanie wariantów A/B...");
                const [variantA, variantB] = await geminiService.generateABTestVariations(formData, activeBrandVoice?.settings || null, user.id);
                // ... (reszta logiki A/B Test pozostaje bez zmian) ...

                const abTestResultContainer: any = {
                    id: uuidv4(),
                    type: GenerationType.ABTest, platform: formData.platform, postText: "", variants: [variantA, variantB], winnerVariantId: null, hashtags: [], imageUrl: null, adHeadline: null, callToAction: null, metadata: { tone: formData.tone, audience: formData.audience, prompt: formData.topic, keywords: formData.keywords }, approvalStatus: "draft", comments: [], authorId: user.id
                };

                const newHistoryPayload: NewCampaignPayload = { formData, result: abTestResultContainer };
                await dataActions.addGenerationToHistory(newHistoryPayload);
                await dataActions.addGenerationStat({ ...formData, generationType: GenerationType.Idea });

                genActions.generationSuccess(abTestResultContainer);
                addToast("Test A/B wygenerowany pomyślnie!", NotificationType.Success);
                return;
            }

            // --- Omnichannel Generation (Parallel for multiple platforms) ---
            if (formData.generationType === GenerationType.Omnichannel) {
                genActions.setProgress("Generowanie postów dla wielu platform (Omnichannel)...");
                const omnichannelPosts = await geminiService.generateOmnichannelPosts(formData, activeBrandVoice?.settings || null, user.id);

                const omnichannelResult: GenerationResult = {
                    id: uuidv4(),
                    type: GenerationType.Omnichannel, platform: formData.platform, postText: `Wygenerowano ${omnichannelPosts.length} postów dla różnych kanałów.`, hashtags: [], omnichannelPosts, adHeadline: null, callToAction: null, imageUrl: null, metadata: { tone: formData.tone, audience: formData.audience, keywords: formData.keywords, prompt: formData.topic }, approvalStatus: "draft", comments: [], authorId: user.id
                };

                const newHistoryPayload: NewCampaignPayload = { formData, result: omnichannelResult };
                await dataActions.addGenerationToHistory(newHistoryPayload);
                await dataActions.addGenerationStat(formData);

                genActions.generationSuccess(omnichannelResult);
                addToast("Omnichannel wygenerowany pomyślnie!", NotificationType.Success);
                return;
            }

            // --- Video Generation (Veo/LRO Placeholder) ---
            if (formData.generationType === GenerationType.Video) {
                genActions.setProgress("Inicjalizacja generowania wideo...");
                let operation: any;
                const videoPrompt = formData.videoTranscript || formData.topic;

                if (formData.imageForVideo?.base64) {
                    operation = await geminiService.generateVideoFromImage(videoPrompt, formData.imageForVideo, formData.aspectRatio || "16:9", user.id);
                } else {
                    operation = await geminiService.generateVideoFromText(videoPrompt, formData.aspectRatio || "16:9", user.id);
                }

                genActions.setProgress("Oczekiwanie na ukończenie wideo (polowanie LRO)...");

                // LRO Polling z timeoutem i backoffem
                const LRO_TIMEOUT_MS = 10 * 60 * 1000; // 10 minut
                const INITIAL_DELAY_MS = 5000; // 5 sekund
                const MAX_DELAY_MS = 60000; // 60 sekund
                const MAX_RETRIES = 100; // Maksymalna liczba prób

                let currentDelay = INITIAL_DELAY_MS;
                let retries = 0;
                const startTime = Date.now();

                while (!operation.done && (Date.now() - startTime < LRO_TIMEOUT_MS) && retries < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, currentDelay));
                    operation = await geminiService.getVideoOperationStatus(operation, user.id);

                    if (operation.error) throw new Error(`Video generation failed during polling: ${operation.error.message || "Unknown error"}`);

                    currentDelay = Math.min(currentDelay * 1.5, MAX_DELAY_MS); // Prosty exponential backoff
                    retries++;
                    genActions.setProgress(`Oczekiwanie na ukończenie wideo (próba ${retries}/${MAX_RETRIES}, opóźnienie: ${Math.floor(currentDelay / 1000)}s)...`);
                }

                if (!operation.done) {
                    if (Date.now() - startTime >= LRO_TIMEOUT_MS) {
                        throw new Error("Video generation timed out after 10 minutes.");
                    } else if (retries >= MAX_RETRIES) {
                        throw new Error(`Video generation failed after ${MAX_RETRIES} retries.`);
                    }
                }

                const videoData = operation.response?.videos?.[0]?.video;

                let videoUrl: string | null = null;
                // Zakładamy, że placeholder zwraca Base64, które możemy przekształcić w Data URL
                if (videoData?.videoBytes) {
                    const mimeType = videoData.mimeType || "video/mp4";
                    videoUrl = `data:${mimeType};base64,${videoData.videoBytes}`;
                } else {
                    throw new Error("Video generation finished, but no video data was provided.");
                }

                genActions.setProgress("Generowanie opisu posta...");
                const details = await geminiService.generatePostDetails(videoPrompt, formData, activeBrandVoice?.settings || null, user.id);

                const videoResult: GenerationResult = {
                    // ✅ POPRAWKA: Użycie uuidv4()
                    id: uuidv4(),
                    type: GenerationType.Video, platform: formData.platform, postText: videoPrompt, hashtags: details.hashtags || [], imageUrl: null, videoUrl: videoUrl, videoTitle: details.videoTitle, videoDescription: details.videoDescription, adHeadline: null, callToAction: null, metadata: { tone: formData.tone, audience: formData.audience, keywords: formData.keywords, prompt: `Generowanie dla: ${formData.topic}` }, approvalStatus: "draft", comments: [], authorId: user.id
                };

                const newHistoryPayload: NewCampaignPayload = { formData, result: videoResult };
                await dataActions.addGenerationToHistory(newHistoryPayload);

                await dataActions.addGenerationStat(formData);
                genActions.generationSuccess(videoResult);
                addToast("Wideo (Placeholder) wygenerowane pomyślnie!", NotificationType.Success);
                return;
            }


            // --- Standard Content Generation (Streaming) ---

            const initialResult: GenerationResult = {
                // ✅ POPRAWKA: Użycie uuidv4()
                id: uuidv4(),
                type: formData.generationType, platform: formData.platform, postText: "", hashtags: [], imageUrl: null, videoUrl: null, adHeadline: null, callToAction: null, metadata: { tone: formData.tone, audience: formData.audience, keywords: formData.keywords, prompt: `Generowanie dla: ${formData.topic}` }, approvalStatus: "draft", comments: [], authorId: user.id
            };
            genActions.setStreamResult(initialResult);

            // --- Context Continuity Logic ---
            let generationInsights = [...(learnedInsights || []), ...(formData.learnedInsights || [])];
            if (!generationInsights.some(i => i.category === 'context') && !formData.repurposeFrom) {
                const recentSamePlatform = useDataStore.getState().history
                    .filter(h => h.formData.platform === formData.platform && h.result.postText)
                    .sort((a, b) => b.timestamp - a.timestamp)[0];

                if (recentSamePlatform) {
                    generationInsights.push({
                        id: 'recent-context',
                        type: 'observation',
                        category: 'context',
                        text: recentSamePlatform.result.postText.substring(0, 300)
                    });
                }
            }

            // Streaming
            const fullTextStream = geminiService.generateSocialMediaContentStream(formData, activeBrandVoice?.settings || null, user.id, generationInsights);

            for await (const chunk of fullTextStream) {
                genActions.appendStreamChunk(chunk);
            }

            // POBRANIE NAJNOWSZEGO STANU PO STREAMINGU
            const streamedText = useGenerationStore.getState().result?.postText || "";
            // Zrównoleglenie: Generowanie detali (hashtagi) oraz analizy w tym samym czasie
            genActions.setProgress(t("progress.analyzing_content"));
            genActions.startAnalyses();

            const [details, sentiment, seo] = await Promise.all([
                geminiService.generatePostDetails(streamedText, formData, activeBrandVoice?.settings || null, user.id),
                geminiService.analyzeSentiment(streamedText, user.id),
                geminiService.analyzeSEO(streamedText, user.id)
            ]);

            // --- Real-time Branding Overlay Logic ---
            if (formData.includeLogo && activeBrandVoice?.settings?.logoUrl && details.imageUrl) {
                genActions.setProgress("Nakładanie Logo Marki...");
                try {
                    const brandedImageUrl = await overlayLogoOnImage(details.imageUrl, activeBrandVoice.settings.logoUrl);
                    details.imageUrl = brandedImageUrl;
                } catch (brandingError) {
                    console.error("Branding overlay failed:", brandingError);
                    // Silently fail and use original image if branding fails
                }
            }

            genActions.setResultDetails(details);
            genActions.analysesSuccess({ sentiment, seo });

            genActions.setProgress(t("progress.finalizing"));
            // POBRANIE FINALNEGO STANU
            const finalResult = { ...useGenerationStore.getState().result!, ...details };

            const newHistoryPayload: NewCampaignPayload = { formData, result: finalResult, sentimentAnalysis: sentiment, seoAnalysis: seo };
            await dataActions.addGenerationToHistory(newHistoryPayload);

            await dataActions.addGenerationStat(formData);
            genActions.generationSuccess(finalResult);

            // Show success toast with new UX
            showSuccess("Treść wygenerowana pomyślnie!", "Możesz ją teraz edytować lub zapisać");
            addToast("Treść wygenerowana pomyślnie!", NotificationType.Success);

        } catch (error: any) {
            // Użycie zmemoizowanej funkcji obsługi błędów
            const errorPayload = handleApiError(error, "errors.generation_failed");
            genActions.generationFailure(errorPayload);
        } finally {
            genActions.setProgress(null);
        }
    }, [user, userPlan, t, addToast, genActions, dataActions, handleApiError, uiActions, stats, brandVoiceProfiles, activeBrandVoiceId, learnedInsights, canGenerate]);


    // --- Reszta handlerów z użyciem useCallback i handleApiError ---

    const handleGenerateCalendarPlan = useCallback(async (goal: string, duration: number, startDate: Date) => {
        if (!user) return;
        dataActions.clearIntelligentCalendarPlan();
        try {
            const plan = await geminiService.generateIntelligentCalendarPlan(goal, duration, startDate, user.id);
            dataActions.setIntelligentCalendarPlan(plan);
        } catch (e: any) {
            handleApiError(e, "Błąd podczas planowania kalendarza.");
            throw e;
        }
    }, [dataActions, user, handleApiError]);

    const handleSaveDraft = useCallback((formData: FormData) => {
        if (!user) return;
        const newDraft: Draft = {
            // ✅ POPRAWKA: Użycie uuidv4()
            id: uuidv4(),
            userId: user.id,
            teamId: user.currentTeamId || null,
            formData,
            timestamp: Date.now(),
        };
        dataActions.addDraft(newDraft);
        addToast("Szkic zapisany.", NotificationType.Info);
    }, [addToast, user, dataActions]);

    const handleRetry = useCallback(() => {
        const { lastFormData } = useGenerationStore.getState();
        if (lastFormData) handleGenerate(lastFormData);
    }, [handleGenerate]);

    const handleConfirmSchedule = useCallback(async (scheduleTimestamp: number, selectedPlatforms: Platform[], selectedFormats: GenerationType[]) => {
        const itemToSchedule = useDataStore.getState().itemToSchedule;
        if (!itemToSchedule || !user) return;

        // Create multiple posts if multiple platforms/formats are selected
        const newPosts: ScheduledPost[] = [];
        for (const platform of selectedPlatforms) {
            for (const format of selectedFormats) {
                // Create a unique form data for each scheduled item to prevent accidental overwrites
                const uniqueFormData = { 
                    ...itemToSchedule.formData, 
                    platform: platform, 
                    generationType: format,
                    campaignPlatforms: selectedPlatforms, // Store multi-platform info
                 };

                const newPost: ScheduledPost = {
                    id: uuidv4(), // Always generate new ID for each distinct scheduled item
                    userId: user.id,
                    teamId: user.currentTeamId || null,
                    formData: uniqueFormData,
                    result: { ...itemToSchedule.result, platform: platform, type: format }, // Adjust result to match scheduled item
                    scheduleTimestamp,
                    status: "scheduled",
                    approvalStatus: "draft",
                    comments: [],
                    createdAt: Date.now(),
                    scheduledPlatforms: selectedPlatforms,
                    animatedFormats: selectedFormats,
                };
                newPosts.push(newPost);
            }
        }

        for (const post of newPosts) {
            await dataActions.addOrUpdateScheduledPost(post);
        }

        addToast(`Zaplanowano ${newPosts.length} publikacji!`, NotificationType.Success);
        dataActions.setItemToSchedule(null);
    }, [user, addToast, dataActions]);

    const handleCloseScheduleModal = useCallback(() => dataActions.setItemToSchedule(null), [dataActions]);

    const handleEditScheduledPost = useCallback((post: ScheduledPost) => dataActions.setItemToSchedule(post), [dataActions]);

    const deleteScheduledPost = useCallback((id: string) => {
        dataActions.deleteScheduledPost(id);
        addToast("Zaplanowany post został usunięty.", NotificationType.Info);
    }, [dataActions, addToast]);

    const clearScheduledPosts = useCallback(() => {
        dataActions.clearScheduledPosts();
        addToast("Wszystkie zaplanowane posty zostały usunięte.", NotificationType.Info);
    }, [dataActions, addToast]);

    // Brand Voice Handlers
    const handleSaveBrandVoiceProfile = useCallback((profile: BrandVoiceProfile) => {
        if (!user) return;
        dataActions.saveBrandVoiceProfile({ ...profile, userId: user.id, teamId: user.currentTeamId || null });
    }, [user, dataActions]);

    const handleDeleteBrandVoiceProfile = useCallback((id: string) => {
        if (!user) return;
        dataActions.deleteBrandVoiceProfile(id);
    }, [user, dataActions]);

    const handleLearnFromHistory = useCallback(async () => {
        if (!user) return;
        dataActions.setIsLearningStyle(true);
        try {
            const learnedProfile = await geminiService.learnBrandVoiceFromHistory(user.id);

            if (learnedProfile.error) {
                addToast(learnedProfile.message || learnedProfile.error, NotificationType.Error);
                return;
            }

            const newProfile: BrandVoiceProfile = {
                id: uuidv4(),
                userId: user.id,
                name: learnedProfile.profilesName || learnedProfile.brandName || t("brandVoice.learned_style_name"),
                settings: {
                    brandName: learnedProfile.brandName || "",
                    description: learnedProfile.description || "",
                    keywords: learnedProfile.keywords || "",
                    avoid: learnedProfile.avoid || "",
                    examplesToFollow: learnedProfile.examplesToFollow || [],
                    examplesToAvoid: learnedProfile.examplesToAvoid || []
                },
                teamId: user.currentTeamId || null
            };
            await dataActions.saveBrandVoiceProfile(newProfile);
            dataActions.setActiveBrandVoiceId(newProfile.id);
            addToast("Nowy Profil Firmy został utworzony na podstawie historii!", NotificationType.Success);
            uiActions.setIsBrandVoiceManagerOpen(true);
        } catch (error) {
            handleApiError(error, "errors.generation_failed");
        } finally {
            dataActions.setIsLearningStyle(false);
        }
    }, [user, t, addToast, dataActions, uiActions, handleApiError]);

    const handleLearnFromFavorites = useCallback(async () => {
        const { favorites } = useDataStore.getState();
        if (!user || favorites.length < 3) return;
        dataActions.setIsLearningStyle(true);
        try {
            const brandVoiceSettings = await geminiService.learnStyleFromFavorites(favorites, user.id);
            const newProfile: BrandVoiceProfile = {
                // ✅ POPRAWKA: Użycie uuidv4()
                id: uuidv4(),
                userId: user.id, name: t("brandVoice.learned_style_name"), settings: brandVoiceSettings, teamId: user.currentTeamId || null
            };
            await dataActions.saveBrandVoiceProfile(newProfile);
            dataActions.setActiveBrandVoiceId(newProfile.id);
            addToast("Nowy Głos Marki został utworzony!", NotificationType.Success);
            uiActions.setIsBrandVoiceManagerOpen(true);
        } catch (error) {
            handleApiError(error, "errors.generation_failed");
        } finally {
            dataActions.setIsLearningStyle(false);
        }
    }, [user, t, addToast, dataActions, uiActions, handleApiError]);

    // Other handlers
    const handleClearStats = useCallback(() => {
        if (user) dataActions.clearStats();
    }, [user, dataActions]);

    const handleAddToFavorites = useCallback((result: GenerationResult, formData: FormData) => {
        if (!user) return;
        // ✅ POPRAWKA: Użycie uuidv4()
        const newFavorite: FavoritePost = { id: uuidv4(), userId: user.id, formData, result, timestamp: Date.now(), teamId: user.currentTeamId || null };
        dataActions.addFavorite(newFavorite);
        addToast("Dodano do ulubionych!", NotificationType.Success);
    }, [user, dataActions, addToast]);

    const handleAIAssistantAction = useCallback(async (action: AIAssistantAction, selectedText: string, fullText: string, contextFormData: FormData | null, customPrompt?: string) => {
        const { result } = useGenerationStore.getState();
        if (!result || !user) return;
        genActions.startAIAction(fullText);
        try {
            const { resultText } = await geminiService.performAIAction(action, selectedText, { fullText, formData: contextFormData, tone: contextFormData?.tone, customPrompt }, user.id);

            let newFullText: string;
            const selectionActions: AIAssistantAction[] = ["rewrite", "shorten", "lengthen", "add-emoji", "change_tone", "summarize", "custom"];

            if (selectionActions.includes(action)) {
                newFullText = fullText.replace(selectedText, resultText);
            } else {
                newFullText = resultText;
            }

            genActions.updateResultText(newFullText);
        } catch (e: any) {
            const errorPayload = handleApiError(e, "errors.ai_action_failed");
            genActions.aiActionFailure(errorPayload);
        } finally {
            genActions.finishAIAction();
        }
    }, [user, genActions, handleApiError]);

    const handleRegenerateWithFeedback = useCallback(async (prompt: string) => {
        const { result } = useGenerationStore.getState();
        if (!result || !user) return;
        genActions.startRegeneration();
        try {
            const newText = await geminiService.regenerateWithFeedback(result.postText, prompt, user.id);
            genActions.updateResultText(newText);
        } catch (e: any) {
            const errorPayload = handleApiError(e, "errors.regeneration_failed");
            genActions.regenerationFailure(errorPayload);
        } finally {
            genActions.finishRegeneration();
        }
    }, [user, genActions, handleApiError]);

    const handleOpenRepurposeModal = useCallback((resultToRepurpose?: GenerationResult) => {
        const result = resultToRepurpose || useGenerationStore.getState().result;
        if (!result || !user) return;
        genActions.startRepurpose();
        geminiService.repurposeContent(result.postText, result.platform, user.id)
            .then(content => genActions.repurposeSuccess({ [result.platform]: content }))
            .catch(e => {
                const errorPayload = handleApiError(e, "errors.repurpose_failed");
                genActions.repurposeFailure(errorPayload);
            });
    }, [user, genActions, handleApiError]);

    const handlePredictPerformance = useCallback(async () => {
        const { result, lastFormData } = useGenerationStore.getState();
        if (!result || !lastFormData || !user) return;
        genActions.startPrediction();
        try {
            const prediction = await geminiService.predictPerformance(result, lastFormData, user.id);
            genActions.predictionSuccess(prediction);
        } catch (e) {
            genActions.predictionFailure();
            handleApiError(e, "Błąd prognozowania wydajności.");
        }
    }, [user, genActions, handleApiError]);

    const handleAnalyzeSEO = useCallback(async () => {
        const { result } = useGenerationStore.getState();
        if (!result || !user) return;
        genActions.startSEOAnalysis();
        try {
            const analysis = await geminiService.analyzeSEO(result.postText, user.id);
            genActions.seoAnalysisSuccess(analysis);
            if (analysis) {
                addToast("Analiza SEO zakończona pomyślnie!", NotificationType.Success);
            } else {
                addToast("Analiza SEO nie mogła zostać przeprowadzona.", NotificationType.Error);
            }
        } catch (e: any) {
            genActions.seoAnalysisFailure();
            handleApiError(e, "errors.analysis_failed");
        }
    }, [user, genActions, addToast, handleApiError]);

    // Analysis Modal handlers
    const handleOpenAnalysisModal = useCallback((item: CampaignHistoryItem) => {
        setItemToAnalyze(item);
        uiActions.setIsAnalysisModalOpen(true);
    }, [uiActions]);

    const handleCloseAnalysisModal = useCallback(() => {
        uiActions.setIsAnalysisModalOpen(false);
        setItemToAnalyze(null);
        setAnalysisResult(null);
        setAnalysisError(null);
    }, [uiActions]);

    const handleRunHistoryAnalysis = useCallback(async (prompt: string, item: CampaignHistoryItem) => {
        if (!item || !user) return;
        setIsPerformingAnalysis(true);
        setAnalysisResult(null);
        setAnalysisError(null);
        try {
            let analysisResultText = await geminiService.performComplexQuery(`Analyze the following post based on this request: "${prompt}".\n\nPost:\n"""\n${item.result.postText}\n"""`, user.id);
            setAnalysisResult(analysisResultText);
        } catch (e: any) {
            const errorPayload = handleApiError(e, "errors.analysis_failed");
            setAnalysisError(errorPayload.details || errorPayload.message);
        } finally {
            setIsPerformingAnalysis(false);
        }
    }, [user, handleApiError]);

    const handleToggleLiveAssistant = useCallback(() => {
        genActions.toggleLiveAssistant();
    }, [genActions]);

    const handleAddHashtag = useCallback((tag: string) => {
        genActions.addHashtag(tag);
    }, [genActions]);

    const handleSuggestHooks = useCallback(async () => {
        const { result } = useGenerationStore.getState();
        if (!result || !user) return;
        genActions.startHookSuggestions();
        try {
            const hooks = await geminiService.generateHookVariations(result.postText, user.id);
            genActions.hookSuggestionsSuccess(hooks);
            addToast("Wygenerowano warianty nagłówka!", NotificationType.Success);
        } catch (e: any) {
            handleApiError(e, "errors.generation_failed");
        }
    }, [user, genActions, handleApiError, addToast]);

    const handleApplyHook = useCallback((newHook: string) => {
        genActions.applyHook(newHook);
        addToast("Nagłówek został podmieniony!", NotificationType.Success);
    }, [genActions, addToast]);

    const handleApplyAudio = useCallback((audioDescription: string) => {
        const { lastFormData } = useGenerationStore.getState();
        if (lastFormData) {
            handleGenerate({ ...lastFormData, audioDescription });
        }
    }, [handleGenerate]);

    const handleOpenScheduleModal = useCallback((result: GenerationResult, formData: FormData | null) => {
        if (result && formData) {
            dataActions.setItemToSchedule({ 
                formData: { ...formData, campaignPlatforms: [formData.platform], selectedPlatforms: [formData.platform], generationType: formData.generationType }, 
                result 
            });
        }
    }, [dataActions]);

    const handleRunStrategicAudit = useCallback(async (
        goal: string,
        audience: string,
        competitors: string[],
        brandProfileId?: string,
        preferences?: { frequency: string, formats: GenerationType[] },
        platforms?: Platform[] // NEW
    ) => {
        if (!user) return;
        dataActions.startStrategicAudit();
        try {
            const { history, brandVoiceProfiles } = useDataStore.getState();
            const selectedProfile = brandVoiceProfiles.find(p => p.id === brandProfileId);
            const historySummary = history.slice(0, 10).map(h => (h.formData?.topic || "").replace(/<[^>]*>?/gm, "")).filter(Boolean).join("; ");
            const report = await geminiService.generateStrategicAudit(
                goal,
                audience,
                competitors,
                historySummary,
                user,
                selectedProfile?.settings,
                preferences,
                platforms // Pass platforms to service
            );
            dataActions.setStrategicAuditReport(report);
            addToast("Audyt strategiczny został pomyślnie wygenerowany!", NotificationType.Success);
        } catch (e: any) {
            const errorPayload = handleApiError(e, "errors.generation_failed");
            dataActions.setAuditError(errorPayload);
        }
    }, [dataActions, addToast, user, handleApiError]);

    const handleSaveTemplate = useCallback((template: CustomTemplate) => {
        if (!user) return;
        dataActions.saveTemplate(template);
    }, [user, dataActions]);

    const handleDeleteTemplate = useCallback((id: string) => {
        if (!user) return;
        dataActions.deleteTemplate(id);
    }, [user, dataActions]);


    const handleOpenVideoStoryModal = useCallback((result: GenerationResult) => {
        uiActions.setVideoStoryModal(true, result);
    }, [uiActions]);

    const handleCloseVideoStoryModal = useCallback(() => {
        uiActions.setVideoStoryModal(false, null);
    }, [uiActions]);

    const handlePublishNow = useCallback(async (result: GenerationResult, platform: string) => {
        if (!user) return;

        try {
            uiActions.setIsPublishingModalOpen(true, platform);
            addToast("Przygotowywanie do publikacji...", NotificationType.Info);

            // Give the UI a moment to show the modal and start the progress
            await new Promise(resolve => setTimeout(resolve, 800));

            // 1. Pobierz aktywne połączenia
            const { socialConnectionsService } = await import("../services/socialConnectionsService");
            const connections = await socialConnectionsService.getConnections(user.id);

            // 2. Znajdź połączenie dla wybrane platformy
            const targetPlatform = platform.toLowerCase();
            const connection = connections.find(c => c.platform.toLowerCase() === targetPlatform && c.isActive);

            if (!connection) {
                uiActions.setIsSocialConnectionsModalOpen(true);
                uiActions.setIsPublishingModalOpen(false);
                throw new Error(`Brak aktywnego połączenia dla ${platform}. Połącz konto w ustawieniach.`);
            }

            // 3. Wywołaj API publikujące
            const { callApi } = await import("../services/apiClient");
            const publishResult = await callApi("social/publish", {
                connectionId: connection.id,
                postText: result.postText,
                imageUrl: result.imageUrl
            }, user.id);

            if (publishResult.success) {
                // Wait for the modal animation to reach final phase
                await new Promise(resolve => setTimeout(resolve, 5000));
                uiActions.setIsPublishingModalOpen(false);
                addToast(`Post został pomyślnie opublikowany na ${platform}!`, NotificationType.Success);
                addNotification(`Twój post jest już dostępny na ${platform}.`, NotificationType.Success, publishResult.url);
            }
        } catch (e: any) {
            uiActions.setIsPublishingModalOpen(false);
            handleApiError(e, "errors.unknownError");
        }
    }, [user, addToast, addNotification, handleApiError, uiActions]);

    return {
        handleGenerate,
        handleGenerateCalendarPlan,
        handleRetry,
        handleSaveDraft,
        handleConfirmSchedule,
        handleCloseScheduleModal,
        handleRemoveDraft: dataActions.removeDraft,
        handleClearHistory: dataActions.clearHistory,
        handleRemoveFavorite: dataActions.removeFavorite,
        handleClearFavorites: dataActions.clearFavorites,
        handleEditScheduledPost,
        deleteScheduledPost,
        clearScheduledPosts,
        handleSaveBrandVoiceProfile,
        handleDeleteBrandVoiceProfile,
        handleSetActiveBrandVoice: dataActions.setActiveBrandVoiceId,
        handleLearnFromFavorites,
        handleLearnFromHistory,
        handleClearStats,
        handleSetResult: genActions.setResult,
        handleAddToFavorites,
        handlePublishNow,
        handleAIAssistantAction,
        handleRegenerateWithFeedback,
        handleOpenRepurposeModal,
        handleCloseRepurposeModal: () => {
            genActions.setRepurposeModalOpen(false);
            genActions.clearRepurposeContent();
        },
        handlePredictPerformance,
        handleAnalyzeSEO,
        handleOpenAnalysisModal,
        handleCloseAnalysisModal,
        handleRunHistoryAnalysis,
        itemToAnalyze,
        analysisResult,
        isPerformingAnalysis,
        analysisError,
        handleSaveTemplate,
        handleDeleteTemplate,
        handleRevertAIAction: genActions.revertAIAction,
        handleToggleLiveAssistant,
        handleAddHashtag,
        handleApplyAudio,
        handleOpenScheduleModal,
        handleRunStrategicAudit,
        handleOpenVideoStoryModal,
        handleCloseVideoStoryModal,
        handleSuggestHooks,
        handleApplyHook,
    };
};
