import { StateCreator } from 'zustand';

export interface AssistantSlice {
  isLiveAssistantActive: boolean;
  isAssistantSpeaking: boolean;
  assistantTranscript: { speaker: 'user' | 'model'; text: string }[];
  liveTranscript: { user: string; model: string };
  toggleLiveAssistant: () => void;
  setIsAssistantSpeaking: (isSpeaking: boolean) => void;
  setAssistantTranscript: (transcript: { speaker: 'user' | 'model'; text: string }[]) => void;
  appendAssistantTranscript: (turn: { speaker: 'user' | 'model'; text: string }) => void;
  setLiveTranscript: (transcript: { user: string; model: string }) => void;
  resetAssistant: () => void;
}

export const createAssistantSlice: StateCreator<AssistantSlice, [], [], AssistantSlice> = (set) => ({
  isLiveAssistantActive: false,
  isAssistantSpeaking: false,
  assistantTranscript: [],
  liveTranscript: { user: '', model: '' },

  toggleLiveAssistant: () => set(state => ({ isLiveAssistantActive: !state.isLiveAssistantActive, assistantTranscript: [], liveTranscript: { user: '', model: '' } })),
  setIsAssistantSpeaking: (isSpeaking) => set({ isAssistantSpeaking: isSpeaking }),
  setAssistantTranscript: (transcript) => set({ assistantTranscript: transcript }),
  appendAssistantTranscript: (turn) => set(state => ({ assistantTranscript: [...state.assistantTranscript, turn] })),
  setLiveTranscript: (transcript) => set({ liveTranscript: transcript }),
  resetAssistant: () => set({ 
    isLiveAssistantActive: false, 
    isAssistantSpeaking: false, 
    assistantTranscript: [],
    liveTranscript: { user: '', model: '' }
  }),
});
