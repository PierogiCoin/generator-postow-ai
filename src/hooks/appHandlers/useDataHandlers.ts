import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useDataStore } from '../../stores/dataStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../contexts/AuthContext';
import {
    Draft,
    FavoritePost,
    FormData,
    GenerationResult,
    CustomTemplate,
    Platform,
    GenerationType,
} from '../../types';
import { NotificationType } from '../../types';
import * as geminiService from '../../services/geminiService';
import { socialConnectionsService } from '../../services/socialConnectionsService';
import {
    buildBrandContextForAudit,
} from '../../utils/strategyHelpers';
import {
    analyzeContentInventory,
    buildContentInventory,
} from '../../services/contentInventoryService';
import type { ApiErrorHandler, ToastFn } from './types';

interface DataHandlerDeps {
    addToast: ToastFn;
    handleApiError: ApiErrorHandler;
}

export const useDataHandlers = ({ addToast, handleApiError }: DataHandlerDeps) => {
    const { user } = useAuth();
    const dataActions = useDataStore.getState();
    const uiActions = useUIStore.getState();

    const handleSaveDraft = useCallback((formData: FormData) => {
        if (!user) return;
        const newDraft: Draft = {
            id: uuidv4(),
            userId: user.id,
            teamId: user.currentTeamId || null,
            formData,
            timestamp: Date.now(),
        };
        dataActions.addDraft(newDraft);
        addToast('Szkic zapisany.', NotificationType.Info);
    }, [addToast, user, dataActions]);

    const handleClearStats = useCallback(() => {
        if (user) dataActions.clearStats();
    }, [user, dataActions]);

    const handleAddToFavorites = useCallback(async (result: GenerationResult, formData: FormData) => {
        if (!user) return;
        const newFavorite: FavoritePost = {
            id: uuidv4(),
            userId: user.id,
            formData,
            result,
            timestamp: Date.now(),
            teamId: user.currentTeamId || null,
        };
        try {
            await dataActions.addFavorite(newFavorite);
            addToast('Dodano do ulubionych!', NotificationType.Success);
        } catch (e) {
            handleApiError(e, 'errors.userFacing.favoritesTitle');
        }
    }, [user, dataActions, addToast, handleApiError]);

    const handleSaveTemplate = useCallback((template: CustomTemplate) => {
        if (!user) return;
        dataActions.saveTemplate(template);
    }, [user, dataActions]);

    const handleDeleteTemplate = useCallback((id: string) => {
        if (!user) return;
        dataActions.deleteTemplate(id);
    }, [user, dataActions]);

    const handleGenerateCalendarPlan = useCallback(async (goal: string, duration: number, startDate: Date) => {
        if (!user) return;
        dataActions.clearIntelligentCalendarPlan();
        try {
            const plan = await geminiService.generateIntelligentCalendarPlan(goal, duration, startDate, user.id);
            dataActions.setIntelligentCalendarPlan(plan);
        } catch (e) {
            handleApiError(e, 'Błąd podczas planowania kalendarza.');
            throw e;
        }
    }, [dataActions, user, handleApiError]);

    const handleRunStrategicAudit = useCallback(async (
        goal: string,
        audience: string,
        competitors: string[],
        brandProfileId?: string,
        preferences?: { frequency: string; formats: GenerationType[] },
        _platforms?: Platform[]
    ) => {
        if (!user) return;
        dataActions.startStrategicAudit();
        try {
            const {
                history,
                brandVoiceProfiles,
                learnedInsights,
                favorites,
                scheduledPosts,
                intelligentCalendarPlan,
            } = useDataStore.getState();
            const selectedProfile = brandVoiceProfiles.find(p => p.id === brandProfileId);
            const brandContext = buildBrandContextForAudit(selectedProfile, learnedInsights);

            let publishedPosts: Awaited<ReturnType<typeof socialConnectionsService.getAggregateHistory>> = [];
            try {
                publishedPosts = await socialConnectionsService.getAggregateHistory(user.id);
            } catch {
                // opcjonalne — bez połączonych kont
            }

            const inventoryItems = buildContentInventory({
                history,
                favorites,
                scheduledPosts,
                calendarPlan: intelligentCalendarPlan,
                publishedPosts,
                targetPlatforms: _platforms,
            });
            const contentInventory = analyzeContentInventory(inventoryItems, _platforms);

            const report = await geminiService.generateStrategicAudit(
                goal,
                audience,
                competitors,
                contentInventory,
                user,
                brandContext,
                preferences,
                _platforms
            );
            dataActions.setStrategicAuditReport(report);
            addToast('Audyt strategiczny gotowy — plan treści w raporcie.', NotificationType.Success);
        } catch (e) {
            const errorPayload = handleApiError(e, 'errors.generation_failed');
            dataActions.setAuditError(errorPayload);
        }
    }, [dataActions, addToast, user, handleApiError]);

    const handleOpenVideoStoryModal = useCallback((result: GenerationResult) => {
        uiActions.setVideoStoryModal(true, result);
    }, [uiActions]);

    const handleCloseVideoStoryModal = useCallback(() => {
        uiActions.setVideoStoryModal(false, null);
    }, [uiActions]);

    return {
        handleSaveDraft,
        handleClearStats,
        handleAddToFavorites,
        handleSaveTemplate,
        handleDeleteTemplate,
        handleGenerateCalendarPlan,
        handleRunStrategicAudit,
        handleOpenVideoStoryModal,
        handleCloseVideoStoryModal,
    };
};
