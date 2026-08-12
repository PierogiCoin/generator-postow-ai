'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from './useNotifications';
import { useGenerationStore } from '../stores/generationStore';
import { useUIStore } from '../stores/uiStore';
import { generateVideoStory } from '../services/videoStoryService';
import type { VideoStoryStyle, VideoStoryProvider } from '../components/VideoStoryModal';
import { NotificationType } from '../types';

/**
 * Real Video Story generate/apply handlers for GlobalModals / layout.
 */
export function useVideoStoryHandlers() {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [generatedVideo, setGeneratedVideo] = useState<
    { url: string; thumbnail: string; duration: number } | undefined
  >(undefined);

  const handleGenerateVideoStory = useCallback(
    async (
      style: VideoStoryStyle,
      provider: VideoStoryProvider = 'auto',
      audioConfig?: {
        trackId: string;
        trackUrl: string;
        volume: number;
        fadeIn: boolean;
        fadeOut: boolean;
      }
    ) => {
      const post = useUIStore.getState().videoStoryPost;
      if (!post) {
        addToast('Brak posta do wygenerowania wideo.', NotificationType.Error);
        return;
      }

      const store = useGenerationStore.getState();
      store.startVideoStoryGeneration();
      setGeneratedVideo(undefined);

      try {
        const result = await generateVideoStory(
          post,
          style,
          user?.id,
          provider,
          (progress) => {
            useGenerationStore.getState().setVideoStoryProgress(progress);
          },
          audioConfig
        );

        const url = result.videoUrl || result.url;
        setGeneratedVideo({
          url,
          thumbnail: result.thumbnail || '',
          duration: result.duration || 8,
        });
        useGenerationStore.getState().videoStorySuccess();
        addToast('Wideo gotowe — możesz je pobrać lub dołączyć do posta.', NotificationType.Success);
      } catch (err) {
        useGenerationStore.getState().videoStoryFailure();
        addToast(
          err instanceof Error ? err.message : 'Nie udało się wygenerować wideo',
          NotificationType.Error
        );
      }
    },
    [user?.id, addToast]
  );

  const handleApplyVideoToPost = useCallback(() => {
    if (!generatedVideo?.url) {
      addToast('Najpierw wygeneruj wideo.', NotificationType.Info);
      return;
    }
    useGenerationStore.getState().updateResultVideo(generatedVideo.url);
    useUIStore.getState().setVideoStoryModal(false, null);
    setGeneratedVideo(undefined);
    addToast('Wideo dołączone do posta.', NotificationType.Success);
  }, [generatedVideo, addToast]);

  return {
    generatedVideo,
    handleGenerateVideoStory,
    handleApplyVideoToPost,
  };
}
