import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useDataStore } from '../../stores/dataStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../contexts/AuthContext';
import { BrandVoiceProfile } from '../../types';
import { NotificationType } from '../../types';
import * as geminiService from '../../services/geminiService';
import type { ApiErrorHandler, ToastFn } from './types';

interface BrandVoiceHandlerDeps {
    addToast: ToastFn;
    t: (key: string) => string;
    handleApiError: ApiErrorHandler;
}

export const useBrandVoiceHandlers = ({ addToast, t, handleApiError }: BrandVoiceHandlerDeps) => {
    const { user } = useAuth();
    const dataActions = useDataStore.getState();
    const uiActions = useUIStore.getState();

    const handleSaveBrandVoiceProfile = useCallback((profile: BrandVoiceProfile) => {
        if (!user) return;
        dataActions.saveBrandVoiceProfile({
            ...profile,
            userId: user.id,
            teamId: user.currentTeamId || null,
        });
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
                name: learnedProfile.profilesName || learnedProfile.brandName || t('brandVoice.learned_style_name'),
                settings: {
                    brandName: learnedProfile.brandName || '',
                    description: learnedProfile.description || '',
                    keywords: learnedProfile.keywords || '',
                    avoid: learnedProfile.avoid || '',
                    examplesToFollow: learnedProfile.examplesToFollow || [],
                    examplesToAvoid: learnedProfile.examplesToAvoid || [],
                },
                teamId: user.currentTeamId || null,
            };
            await dataActions.saveBrandVoiceProfile(newProfile);
            dataActions.setActiveBrandVoiceId(newProfile.id);
            addToast('Nowy Profil Firmy został utworzony na podstawie historii!', NotificationType.Success);
            uiActions.setIsBrandVoiceManagerOpen(true);
        } catch (error) {
            handleApiError(error, 'errors.generation_failed');
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
                id: uuidv4(),
                userId: user.id,
                name: t('brandVoice.learned_style_name'),
                settings: brandVoiceSettings,
                teamId: user.currentTeamId || null,
            };
            await dataActions.saveBrandVoiceProfile(newProfile);
            dataActions.setActiveBrandVoiceId(newProfile.id);
            addToast('Nowy Głos Marki został utworzony!', NotificationType.Success);
            uiActions.setIsBrandVoiceManagerOpen(true);
        } catch (error) {
            handleApiError(error, 'errors.generation_failed');
        } finally {
            dataActions.setIsLearningStyle(false);
        }
    }, [user, t, addToast, dataActions, uiActions, handleApiError]);

    return {
        handleSaveBrandVoiceProfile,
        handleDeleteBrandVoiceProfile,
        handleLearnFromHistory,
        handleLearnFromFavorites,
    };
};
