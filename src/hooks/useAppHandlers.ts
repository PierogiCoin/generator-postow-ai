import { useTranslation } from 'react-i18next';
import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { NotificationType } from '../types';
import { useApiError } from './appHandlers/useApiError';
import { useGenerationHandlers } from './appHandlers/useGenerationHandlers';
import { useScheduleHandlers } from './appHandlers/useScheduleHandlers';
import { useBrandVoiceHandlers } from './appHandlers/useBrandVoiceHandlers';
import { useEditorHandlers } from './appHandlers/useEditorHandlers';
import { useAnalysisHandlers } from './appHandlers/useAnalysisHandlers';
import { useDataHandlers } from './appHandlers/useDataHandlers';
import { usePublishHandlers } from './appHandlers/usePublishHandlers';
import type { NotificationFn, ToastFn, ConfirmFn } from './appHandlers/types';

export const useAppHandlers = (
    addToast: ToastFn,
    addNotification: NotificationFn,
    confirm?: ConfirmFn
) => {
    const { t } = useTranslation();
    const handleApiError = useApiError(addToast);

    const genActions = useGenerationStore.getState();
    const dataActions = useDataStore.getState();

    const generation = useGenerationHandlers({ addToast, t, handleApiError });
    const schedule = useScheduleHandlers(addToast, confirm);
    const brandVoice = useBrandVoiceHandlers({ addToast, t, handleApiError });
    const editor = useEditorHandlers({ addToast, handleApiError });
    const analysis = useAnalysisHandlers(handleApiError);
    const data = useDataHandlers({ addToast, handleApiError });
    const publish = usePublishHandlers({ addToast, addNotification, handleApiError });

    return {
        ...generation,
        ...schedule,
        ...brandVoice,
        ...editor,
        ...analysis,
        ...data,
        ...publish,
        handleRemoveDraft: dataActions.removeDraft,
        handleClearHistory: dataActions.clearHistory,
        handleRemoveFavorite: dataActions.removeFavorite,
        handleClearFavorites: dataActions.clearFavorites,
        handleSetActiveBrandVoice: dataActions.setActiveBrandVoiceId,
    };
};

// Re-export for consumers that import NotificationType alongside handlers
export type { ToastFn, NotificationFn } from './appHandlers/types';
