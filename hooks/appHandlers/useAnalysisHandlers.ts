import { useState, useCallback } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../contexts/AuthContext';
import { CampaignHistoryItem } from '../../types';
import * as geminiService from '../../services/geminiService';
import type { ApiErrorHandler } from './types';

export const useAnalysisHandlers = (handleApiError: ApiErrorHandler) => {
    const { user } = useAuth();
    const uiActions = useUIStore.getState();

    const [itemToAnalyze, setItemToAnalyze] = useState<CampaignHistoryItem | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [isPerformingAnalysis, setIsPerformingAnalysis] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

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
            const analysisResultText = await geminiService.performComplexQuery(
                `Analyze the following post based on this request: "${prompt}".\n\nPost:\n"""\n${item.result.postText}\n"""`,
                user.id
            );
            setAnalysisResult(analysisResultText);
        } catch (e) {
            const errorPayload = handleApiError(e, 'errors.analysis_failed');
            setAnalysisError(errorPayload.details || errorPayload.message);
        } finally {
            setIsPerformingAnalysis(false);
        }
    }, [user, handleApiError]);

    return {
        handleOpenAnalysisModal,
        handleCloseAnalysisModal,
        handleRunHistoryAnalysis,
        itemToAnalyze,
        analysisResult,
        isPerformingAnalysis,
        analysisError,
    };
};
