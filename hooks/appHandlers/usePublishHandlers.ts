import { useCallback } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../contexts/AuthContext';
import { GenerationResult } from '../../types';
import { NotificationType } from '../../types';
import { formatPublishCaption, resolveCtaUrl } from '../../utils/publishCaption';
import type { ApiErrorHandler, NotificationFn, ToastFn } from './types';

interface PublishHandlerDeps {
    addToast: ToastFn;
    addNotification: NotificationFn;
    handleApiError: ApiErrorHandler;
}

export const usePublishHandlers = ({ addToast, addNotification, handleApiError }: PublishHandlerDeps) => {
    const { user } = useAuth();
    const uiActions = useUIStore.getState();

    const handlePublishNow = useCallback(async (result: GenerationResult, platform: string) => {
        if (!user) return;

        try {
            uiActions.setIsPublishingModalOpen(true, platform);
            addToast('Przygotowywanie do publikacji...', NotificationType.Info);

            await new Promise(resolve => setTimeout(resolve, 800));

            const { socialConnectionsService } = await import('../../services/socialConnectionsService');
            const connections = await socialConnectionsService.getConnections(user.id);

            const targetPlatform = platform.toLowerCase();
            const connection = connections.find(c => c.platform.toLowerCase() === targetPlatform && c.isActive);

            if (!connection) {
                uiActions.setIsSocialConnectionsModalOpen(true);
                uiActions.setIsPublishingModalOpen(false);
                throw new Error(`Brak aktywnego połączenia dla ${platform}. Połącz konto w ustawieniach.`);
            }

            const { callApi } = await import('../../services/apiClient');
            const { brandVoiceProfiles, activeBrandVoiceId } = await import('../../stores/dataStore').then(m => m.useDataStore.getState());
            const brandVoice = brandVoiceProfiles.find(p => p.id === activeBrandVoiceId);
            const ctaUrl = resolveCtaUrl(result.ctaUrl, brandVoice?.settings?.websiteUrl);

            const publishResult = await callApi('social/publish', {
                connectionId: connection.id,
                postText: result.postText,
                imageUrl: result.imageUrl,
                hashtags: result.hashtags,
                callToAction: result.callToAction,
                ctaUrl,
            }, user.id);

            if (publishResult.success) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                uiActions.setIsPublishingModalOpen(false);
                addToast(`Post został pomyślnie opublikowany na ${platform}!`, NotificationType.Success);
                addNotification(
                    `Twój post jest już dostępny na ${platform}.`,
                    NotificationType.Success,
                    publishResult.url
                );
            }
        } catch (e) {
            uiActions.setIsPublishingModalOpen(false);
            handleApiError(e, 'errors.unknownError');
        }
    }, [user, addToast, addNotification, handleApiError, uiActions]);

    return { handlePublishNow };
};
