import { useCallback } from 'react';
import { useGenerationStore } from '../../stores/generationStore';
import { useAuth } from '../../contexts/AuthContext';
import { AIAssistantAction, FormData, GenerationResult } from '../../types';
import { NotificationType } from '../../types';
import * as geminiService from '../../services/geminiService';
import type { ApiErrorHandler, ToastFn } from './types';

interface EditorHandlerDeps {
    addToast: ToastFn;
    handleApiError: ApiErrorHandler;
}

export const useEditorHandlers = ({ addToast, handleApiError }: EditorHandlerDeps) => {
    const { user } = useAuth();
    const genActions = useGenerationStore.getState();

    const handleAIAssistantAction = useCallback(async (
        action: AIAssistantAction,
        selectedText: string,
        fullText: string,
        contextFormData: FormData | null,
        customPrompt?: string
    ) => {
        const { result } = useGenerationStore.getState();
        if (!result || !user) return;
        genActions.startAIAction(fullText);
        try {
            const { resultText } = await geminiService.performAIAction(
                action,
                selectedText,
                { fullText, formData: contextFormData, tone: contextFormData?.tone, customPrompt },
                user.id
            );

            const selectionActions: AIAssistantAction[] = [
                'rewrite', 'shorten', 'lengthen', 'add-emoji', 'change_tone', 'summarize', 'custom',
            ];

            let newFullText: string;
            if (selectionActions.includes(action) && selectedText && selectedText !== fullText) {
                const idx = fullText.indexOf(selectedText);
                newFullText = idx !== -1
                    ? fullText.slice(0, idx) + resultText + fullText.slice(idx + selectedText.length)
                    : resultText;
            } else {
                newFullText = resultText;
            }

            genActions.updateResultText(newFullText);
        } catch (e) {
            const errorPayload = handleApiError(e, 'errors.ai_action_failed');
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
        } catch (e) {
            const errorPayload = handleApiError(e, 'errors.regeneration_failed');
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
                const errorPayload = handleApiError(e, 'errors.repurpose_failed');
                genActions.repurposeFailure(errorPayload);
            });
    }, [user, genActions, handleApiError]);

    const handleCloseRepurposeModal = useCallback(() => {
        genActions.setRepurposeModalOpen(false);
        genActions.clearRepurposeContent();
    }, [genActions]);

    const handlePredictPerformance = useCallback(async () => {
        const { result, lastFormData } = useGenerationStore.getState();
        if (!result || !lastFormData || !user) return;
        genActions.startPrediction();
        try {
            const prediction = await geminiService.predictPerformance(result, lastFormData, user.id);
            genActions.predictionSuccess(prediction);
        } catch (e) {
            genActions.predictionFailure();
            handleApiError(e, 'Błąd prognozowania wydajności.');
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
                addToast('Analiza SEO zakończona pomyślnie!', NotificationType.Success);
            } else {
                addToast('Analiza SEO nie mogła zostać przeprowadzona.', NotificationType.Error);
            }
        } catch (e) {
            genActions.seoAnalysisFailure();
            handleApiError(e, 'errors.analysis_failed');
        }
    }, [user, genActions, addToast, handleApiError]);

    const handleSuggestHooks = useCallback(async () => {
        const { result } = useGenerationStore.getState();
        if (!result || !user) return;
        genActions.startHookSuggestions();
        try {
            const hooks = await geminiService.generateHookVariations(result.postText, user.id);
            genActions.hookSuggestionsSuccess(hooks);
            addToast('Wygenerowano warianty nagłówka!', NotificationType.Success);
        } catch (e) {
            handleApiError(e, 'errors.generation_failed');
        }
    }, [user, genActions, handleApiError, addToast]);

    const handleApplyHook = useCallback((newHook: string) => {
        genActions.applyHook(newHook);
        addToast('Nagłówek został podmieniony!', NotificationType.Success);
    }, [genActions, addToast]);

    const handleToggleLiveAssistant = useCallback(() => {
        genActions.toggleLiveAssistant();
    }, [genActions]);

    const handleAddHashtag = useCallback((tag: string) => {
        genActions.addHashtag(tag);
    }, [genActions]);

    return {
        handleAIAssistantAction,
        handleRegenerateWithFeedback,
        handleOpenRepurposeModal,
        handleCloseRepurposeModal,
        handlePredictPerformance,
        handleAnalyzeSEO,
        handleSuggestHooks,
        handleApplyHook,
        handleToggleLiveAssistant,
        handleAddHashtag,
        handleRevertAIAction: genActions.revertAIAction,
        handleSetResult: genActions.setResult,
    };
};
