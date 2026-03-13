import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/uiStore';
import { USAGE_LIMITS } from '../constants';
import { UserPlan, NotificationType, GenerationType, AppError, UsageStats } from '../types';

interface UseUsageLimiterProps {
    userPlan: UserPlan;
    stats: UsageStats | null;
    addToast: (message: string, type: NotificationType, duration?: number) => void;
}

export const useUsageLimiter = ({ userPlan, stats, addToast }: UseUsageLimiterProps) => {
    const { t } = useTranslation();
    const uiActions = useUIStore.getState(); // Actions są stabilne, więc można je pobrać raz

    const canGenerate = useCallback((generationType: GenerationType): boolean => {
        // Kontrola limitu dla generacji tekstowej (uproszczona)
        const isTextGen = generationType !== GenerationType.Video && generationType !== GenerationType.Campaign;

        if (isTextGen && stats && stats.totalGenerations >= USAGE_LIMITS[userPlan].text) {
            const errorPayload: AppError = { message: t('errors.limit_reached'), type: 'limit' };
            addToast(errorPayload.message, NotificationType.Error);
            uiActions.setIsPricingModalOpen(true);
            return false;
        }
        // Można dodać bardziej szczegółową logikę limitowania dla innych typów generacji
        // np. if (generationType === GenerationType.Video && stats && stats.videoGenerations >= USAGE_LIMITS[userPlan].video) { ... }

        return true;
    }, [userPlan, stats, addToast, t, uiActions]);

    return {
        canGenerate,
    };
};
