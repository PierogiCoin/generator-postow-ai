import { useCallback } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../contexts/AuthContext';
import { GenerationResult } from '../../types';
import { NotificationType } from '../../types';
import type { PublishFormat } from '../../types/socialPublishing';
import { resolveCtaUrl } from '../../utils/publishCaption';
import {
    approvalBlockMessage,
    isApprovalBlockingPublish,
} from '../../utils/publishApproval';
import type { ApiErrorHandler, NotificationFn, ToastFn } from './types';

interface PublishHandlerDeps {
    addToast: ToastFn;
    addNotification: NotificationFn;
    handleApiError: ApiErrorHandler;
}

function collectMediaUrls(result: GenerationResult): string[] {
    const urls: string[] = [];
    if (result.imageUrl) urls.push(result.imageUrl);
    if (Array.isArray(result.variants)) {
        for (const v of result.variants) {
            if (v?.imageUrl && !urls.includes(v.imageUrl)) urls.push(v.imageUrl);
        }
    }
    return urls;
}

function resolvePublishFormat(
    platform: string,
    result: GenerationResult,
    mediaUrls: string[],
    explicit?: PublishFormat
): PublishFormat {
    if (explicit) return explicit;
    const p = platform.toLowerCase();
    if ((p === 'tiktok' || p === 'youtube') && result.videoUrl) return 'reel';
    if (p === 'instagram' && result.videoUrl && !result.imageUrl) return 'reel';
    if (p === 'instagram' && mediaUrls.length > 1) return 'carousel';
    return 'feed';
}

export const usePublishHandlers = ({ addToast, addNotification, handleApiError }: PublishHandlerDeps) => {
    const { user } = useAuth();
    const uiActions = useUIStore.getState();

    const handlePublishNow = useCallback(async (
        result: GenerationResult,
        platform: string,
        connectionId?: string,
        options?: { publishFormat?: PublishFormat }
    ) => {
        if (!user) return;

        if (isApprovalBlockingPublish(result.approvalStatus)) {
            addToast(approvalBlockMessage(result.approvalStatus), NotificationType.Error);
            return;
        }

        try {
            uiActions.setIsPublishingModalOpen(true, platform);
            uiActions.setPublishingStatus('publishing');
            addToast('Przygotowywanie do publikacji...', NotificationType.Info);

            await new Promise(resolve => setTimeout(resolve, 400));

            const { socialConnectionsService } = await import('../../services/socialConnectionsService');
            const connections = await socialConnectionsService.getConnections(user.id);

            const targetPlatform = platform.toLowerCase();
            const connection = connectionId
                ? connections.find(c => c.id === connectionId && c.isActive)
                : connections.find(c => c.platform.toLowerCase() === targetPlatform && c.isActive);

            if (!connection) {
                uiActions.setIsSocialConnectionsModalOpen(true);
                uiActions.setIsPublishingModalOpen(false);
                uiActions.setPublishingStatus('idle');
                throw new Error(`Brak aktywnego połączenia dla ${platform}. Połącz konto w ustawieniach.`);
            }

            const { callApi } = await import('../../services/apiClient');
            const { brandVoiceProfiles, activeBrandVoiceId } = await import('../../stores/dataStore').then(m => m.useDataStore.getState());
            const brandVoice = brandVoiceProfiles.find(p => p.id === activeBrandVoiceId);
            const ctaUrl = resolveCtaUrl(result.ctaUrl, brandVoice?.settings?.websiteUrl);
            const mediaUrls = collectMediaUrls(result);
            const publishFormat = resolvePublishFormat(platform, result, mediaUrls, options?.publishFormat);

            const publishResult = await callApi('social/publish', {
                connectionId: connection.id,
                postText: result.postText,
                imageUrl: mediaUrls[0] || result.imageUrl,
                mediaUrls,
                videoUrl: result.videoUrl || undefined,
                publishFormat,
                hashtags: result.hashtags,
                callToAction: result.callToAction,
                ctaUrl,
            }, user.id);

            if (publishResult.success) {
                uiActions.setPublishingStatus('success');
                await new Promise(resolve => setTimeout(resolve, 2500));
                uiActions.setIsPublishingModalOpen(false);
                uiActions.setPublishingStatus('idle');
                addToast(`Post został pomyślnie opublikowany na ${platform}!`, NotificationType.Success);
                addNotification(
                    `Twój post jest już dostępny na ${platform}.`,
                    NotificationType.Success,
                    publishResult.url
                );
            }
        } catch (e) {
            uiActions.setIsPublishingModalOpen(false);
            uiActions.setPublishingStatus('idle');
            handleApiError(e, 'errors.unknownError');
        }
    }, [user, addToast, addNotification, handleApiError, uiActions]);

    return { handlePublishNow };
};
