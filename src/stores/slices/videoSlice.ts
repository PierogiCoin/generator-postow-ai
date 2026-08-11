import { StateCreator } from 'zustand';
import type { VideoStoryProgressStatus } from '../../services/videoStoryService';

export interface VideoSlice {
  isGeneratingVideoStory: boolean;
  videoStoryProgress: VideoStoryProgressStatus | null;
  startVideoStoryGeneration: () => void;
  setVideoStoryProgress: (progress: VideoStoryProgressStatus | null) => void;
  videoStorySuccess: () => void;
  videoStoryFailure: () => void;
}

export const createVideoSlice: StateCreator<VideoSlice, [], [], VideoSlice> = (set) => ({
  isGeneratingVideoStory: false,
  videoStoryProgress: null,

  startVideoStoryGeneration: () => set({
    isGeneratingVideoStory: true,
    videoStoryProgress: {
      stage: 'queued',
      stageLabel: 'Uruchamianie…',
      progress: 2,
      startedAt: Date.now(),
    },
  }),
  setVideoStoryProgress: (progress) => set({ videoStoryProgress: progress }),
  videoStorySuccess: () => set({ isGeneratingVideoStory: false, videoStoryProgress: null }),
  videoStoryFailure: () => set({ isGeneratingVideoStory: false, videoStoryProgress: null }),
});
