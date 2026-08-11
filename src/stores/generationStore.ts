import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { createGenerationCoreSlice, GenerationCoreSlice } from './slices/generationCoreSlice';
import { createAnalysisSlice, AnalysisSlice } from './slices/analysisSlice';
import { createAssistantSlice, AssistantSlice } from './slices/assistantSlice';
import { createVideoSlice, VideoSlice } from './slices/videoSlice';
import { createCalendarSlice, CalendarSlice } from './slices/calendarSlice';

export type GenerationState = GenerationCoreSlice & AnalysisSlice & AssistantSlice & VideoSlice & CalendarSlice;

export const useGenerationStore = create<GenerationState>()(
  persist(
    (...a) => ({
      ...createGenerationCoreSlice(...a),
      ...createAnalysisSlice(...a),
      ...createAssistantSlice(...a),
      ...createVideoSlice(...a),
      ...createCalendarSlice(...a),
    }),
    {
      name: 'generation-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lastFormData: state.lastFormData,
        result: state.result,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false;
          state.error = null;
          state.generationProgress = null;
          state.isAssistantLoading = false;
          state.isRegenerating = false;
          state.isRepurposing = false;
          state.isPredictingPerformance = false;
          state.isAnalyzingSentiment = false;
          state.isAnalyzingSEO = false;
          state.isSuggestingHashtags = false;
          state.isSuggestingAudio = false;
          state.isSuggestingHooks = false;
          state.isRegeneratingImage = false;
          state.isGeneratingVideoStory = false;
          state.videoStoryProgress = null;
          state.isOptimizingMultiPlatform = false;
          state.isLiveAssistantActive = false;
          state.isAssistantSpeaking = false;
        }
      },
    }
  )
);
