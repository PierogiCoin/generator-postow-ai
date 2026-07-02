import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useDataStore } from '../../stores/dataStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../contexts/AuthContext';
import { BrandVoiceProfile } from '../../types';
import { NotificationType } from '../../types';
import * as geminiService from '../../services/geminiService';
import { learnedPayloadToSettings, mergeLearnedIntoProfile } from '../../utils/brandVoiceLearn';
import {
  buildLearnedFromCompetitors,
  mergeCompetitorIntelIntoProfile,
} from '../../utils/competitorBrandVoice';
import { fetchTrackedCompetitors } from '../../services/competitorService';
import type { BatchCompetitorResult } from '../../components/intelligence/BatchCompetitorSummary';
import type { ApiErrorHandler, ToastFn } from './types';

interface BrandVoiceHandlerDeps {
    addToast: ToastFn;
    t: (key: string) => string;
    handleApiError: ApiErrorHandler;
}

function buildProfileFromLearned(
    learned: Record<string, unknown>,
    userId: string,
    teamId: string | null,
    fallbackName: string
): BrandVoiceProfile {
    const settings = learnedPayloadToSettings(learned);
    return {
        id: uuidv4(),
        userId,
        name: String(learned.profileName || learned.profilesName || fallbackName),
        settings: {
            ...settings,
            extractedFromUrl: Boolean(learned.extractedFromUrl),
            logoUrl: learned.logoUrl ? String(learned.logoUrl) : settings.logoUrl,
        },
        teamId,
    };
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

    const handleLearnFromHistory = useCallback(async (mergeIntoProfileId?: string | null) => {
        if (!user) return;
        dataActions.setIsLearningStyle(true);
        try {
            const learnedProfile = await geminiService.learnBrandVoiceFromHistory(user.id);

            if (learnedProfile.error) {
                addToast(learnedProfile.message || learnedProfile.error, NotificationType.Error);
                return;
            }

            const { brandVoiceProfiles } = useDataStore.getState();
            const existing = mergeIntoProfileId
                ? brandVoiceProfiles.find((p) => p.id === mergeIntoProfileId)
                : null;

            if (existing) {
                const merged = mergeLearnedIntoProfile(
                    existing,
                    learnedProfile,
                    existing.name
                );
                await dataActions.saveBrandVoiceProfile(merged);
                dataActions.setActiveBrandVoiceId(merged.id);
                addToast('Aktywny profil został uzupełniony na podstawie historii!', NotificationType.Success);
            } else {
                const newProfile = buildProfileFromLearned(
                    learnedProfile,
                    user.id,
                    user.currentTeamId || null,
                    t('brandVoice.learned_style_name')
                );
                await dataActions.saveBrandVoiceProfile(newProfile);
                dataActions.setActiveBrandVoiceId(newProfile.id);
                addToast('Nowy profil marki został utworzony na podstawie historii!', NotificationType.Success);
            }
            uiActions.setIsBrandVoiceManagerOpen(true);
        } catch (error) {
            handleApiError(error, 'errors.generation_failed');
        } finally {
            dataActions.setIsLearningStyle(false);
        }
    }, [user, t, addToast, dataActions, uiActions, handleApiError]);

    const handleLearnFromFavorites = useCallback(async (mergeIntoProfileId?: string | null) => {
        const { favorites } = useDataStore.getState();
        if (!user || favorites.length < 3) return;
        dataActions.setIsLearningStyle(true);
        try {
            const learned = await geminiService.learnStyleFromFavorites(favorites, user.id);
            const { brandVoiceProfiles } = useDataStore.getState();
            const existing = mergeIntoProfileId
                ? brandVoiceProfiles.find((p) => p.id === mergeIntoProfileId)
                : null;

            if (existing) {
                const merged = mergeLearnedIntoProfile(existing, learned, existing.name);
                await dataActions.saveBrandVoiceProfile(merged);
                dataActions.setActiveBrandVoiceId(merged.id);
                addToast('Aktywny profil uzupełniony na podstawie ulubionych!', NotificationType.Success);
            } else {
                const newProfile = buildProfileFromLearned(
                    learned,
                    user.id,
                    user.currentTeamId || null,
                    t('brandVoice.learned_style_name')
                );
                await dataActions.saveBrandVoiceProfile(newProfile);
                dataActions.setActiveBrandVoiceId(newProfile.id);
                addToast('Nowy głos marki został utworzony!', NotificationType.Success);
            }
            uiActions.setIsBrandVoiceManagerOpen(true);
        } catch (error) {
            handleApiError(error, 'errors.generation_failed');
        } finally {
            dataActions.setIsLearningStyle(false);
        }
    }, [user, t, addToast, dataActions, uiActions, handleApiError]);

    const handleExtractFromUrl = useCallback(async (url: string, mergeIntoProfileId?: string | null) => {
        if (!user || !url.trim()) return;
        dataActions.setIsLearningStyle(true);
        try {
            const learned = await geminiService.extractBrandVoiceFromUrl(url.trim(), user.id);
            if (learned?.error) {
                addToast(String(learned.error), NotificationType.Error);
                return;
            }

            const { brandVoiceProfiles } = useDataStore.getState();
            const existing = mergeIntoProfileId
                ? brandVoiceProfiles.find((p) => p.id === mergeIntoProfileId)
                : null;

            if (existing) {
                const merged = mergeLearnedIntoProfile(existing, learned, existing.name);
                await dataActions.saveBrandVoiceProfile(merged);
                dataActions.setActiveBrandVoiceId(merged.id);
                addToast('Profil uzupełniony danymi ze strony!', NotificationType.Success);
            } else {
                const newProfile = buildProfileFromLearned(
                    learned,
                    user.id,
                    user.currentTeamId || null,
                    `Profil ze strony`
                );
                await dataActions.saveBrandVoiceProfile(newProfile);
                dataActions.setActiveBrandVoiceId(newProfile.id);
                addToast('Utworzono profil marki ze strony WWW!', NotificationType.Success);
            }
            uiActions.setIsBrandVoiceManagerOpen(true);
        } catch (error) {
            handleApiError(error, 'errors.generation_failed');
        } finally {
            dataActions.setIsLearningStyle(false);
        }
    }, [user, addToast, dataActions, uiActions, handleApiError]);

    const handleLearnFromCompetitors = useCallback(async (
        mergeIntoProfileId?: string | null,
        batchResult?: BatchCompetitorResult | null
    ) => {
        if (!user) return;

        dataActions.setIsLearningStyle(true);
        try {
            const competitors = await fetchTrackedCompetitors(user.id);
            const analyzed = competitors.filter((c) => c.analysis);
            if (analyzed.length === 0) {
                addToast(
                    'Brak przeanalizowanych konkurentów. Najpierw uruchom analizę w zakładce Konkurencja.',
                    NotificationType.Warning
                );
                return;
            }

            const { learned, intel } = buildLearnedFromCompetitors(analyzed, batchResult ?? null);
            const { brandVoiceProfiles, activeBrandVoiceId } = useDataStore.getState();
            const targetId = mergeIntoProfileId ?? activeBrandVoiceId;
            const existing = targetId
                ? brandVoiceProfiles.find((p) => p.id === targetId)
                : null;

            if (existing) {
                const merged = mergeCompetitorIntelIntoProfile(existing, learned, intel);
                await dataActions.saveBrandVoiceProfile(merged);
                dataActions.setActiveBrandVoiceId(merged.id);
                addToast(
                    `Profil „${merged.name}” uzupełniony o ${analyzed.length} analiz konkurencji!`,
                    NotificationType.Success
                );
            } else {
                const base = buildProfileFromLearned(
                    learned,
                    user.id,
                    user.currentTeamId || null,
                    'Profil z analizy konkurencji'
                );
                const withIntel = mergeCompetitorIntelIntoProfile(base, learned, intel);
                await dataActions.saveBrandVoiceProfile(withIntel);
                dataActions.setActiveBrandVoiceId(withIntel.id);
                addToast('Utworzono profil Brand Voice na podstawie konkurencji!', NotificationType.Success);
            }
            uiActions.setIsBrandVoiceManagerOpen(true);
        } catch (error) {
            handleApiError(error, 'errors.generation_failed');
        } finally {
            dataActions.setIsLearningStyle(false);
        }
    }, [user, addToast, dataActions, uiActions, handleApiError]);

    return {
        handleSaveBrandVoiceProfile,
        handleDeleteBrandVoiceProfile,
        handleLearnFromHistory,
        handleLearnFromFavorites,
        handleExtractFromUrl,
        handleLearnFromCompetitors,
    };
};
