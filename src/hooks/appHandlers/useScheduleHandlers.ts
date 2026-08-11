import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useDataStore } from '../../stores/dataStore';
import { useAuth } from '../../contexts/AuthContext';
import { FormData, GenerationResult, ScheduledPost, Platform, GenerationType } from '../../types';
import { NotificationType } from '../../types';
import type { ToastFn, ConfirmFn } from './types';

export const useScheduleHandlers = (addToast: ToastFn, confirm?: ConfirmFn) => {
    const { user } = useAuth();
    const dataActions = useDataStore.getState();

    const handleConfirmSchedule = useCallback(async (
        scheduleTimestamp: number,
        selectedPlatforms: Platform[],
        selectedFormats: GenerationType[],
        requireApproval = false
    ) => {
        const itemToSchedule = useDataStore.getState().itemToSchedule;
        if (!itemToSchedule || !user) return;

        const newPosts: ScheduledPost[] = [];
        for (const platform of selectedPlatforms) {
            for (const format of selectedFormats) {
                const uniqueFormData = {
                    ...itemToSchedule.formData,
                    platform,
                    generationType: format,
                    campaignPlatforms: selectedPlatforms,
                };

                newPosts.push({
                    id: uuidv4(),
                    userId: user.id,
                    teamId: user.currentTeamId || null,
                    formData: uniqueFormData,
                    result: { ...itemToSchedule.result, platform, type: format },
                    scheduleTimestamp,
                    status: 'scheduled',
                    approvalStatus: requireApproval ? 'pending_approval' : 'draft',
                    comments: [],
                    createdAt: Date.now(),
                    scheduledPlatforms: selectedPlatforms,
                    scheduledFormats: selectedFormats,
                });
            }
        }

        for (const post of newPosts) {
            await dataActions.addOrUpdateScheduledPost(post);
        }

        addToast(
            requireApproval
                ? `Dodano ${newPosts.length} publikacji do kolejki akceptacji.`
                : `Zaplanowano ${newPosts.length} publikacji!`,
            NotificationType.Success
        );
        dataActions.setItemToSchedule(null);
    }, [user, addToast, dataActions]);

    const handleCloseScheduleModal = useCallback(
        () => dataActions.setItemToSchedule(null),
        [dataActions]
    );

    const handleEditScheduledPost = useCallback(
        (post: ScheduledPost) => dataActions.setItemToSchedule(post),
        [dataActions]
    );

    const deleteScheduledPost = useCallback((id: string) => {
        dataActions.deleteScheduledPost(id);
        addToast('Zaplanowany post został usunięty.', NotificationType.Info);
    }, [dataActions, addToast]);

    const clearScheduledPosts = useCallback(async () => {
        const message = 'Czy na pewno chcesz usunąć wszystkie zaplanowane posty?';
        const confirmed = confirm
            ? await confirm({ message, variant: 'danger', confirmLabel: 'Usuń wszystko', title: 'Usuń zaplanowane posty' })
            : window.confirm(message);
        if (!confirmed) return;
        dataActions.clearScheduledPosts();
        addToast('Wszystkie zaplanowane posty zostały usunięte.', NotificationType.Info);
    }, [dataActions, addToast, confirm]);

    const handleOpenScheduleModal = useCallback((result: GenerationResult, formData: FormData | null) => {
        if (result && formData) {
            dataActions.setItemToSchedule({
                formData: {
                    ...formData,
                    campaignPlatforms: [formData.platform],
                    selectedPlatforms: [formData.platform],
                    generationType: formData.generationType,
                },
                result,
            });
        }
    }, [dataActions]);

    return {
        handleConfirmSchedule,
        handleCloseScheduleModal,
        handleEditScheduledPost,
        deleteScheduledPost,
        clearScheduledPosts,
        handleOpenScheduleModal,
    };
};
