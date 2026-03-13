import { create } from 'zustand';
import type { GenerationResult, AppError, FormData, RepurposedContent, SentimentAnalysisResult, SEOAnalysisResult, PerformancePrediction } from '../types';

type GenerationState = {
  result: GenerationResult | null;
  isLoading: boolean;
  error: AppError | null;
  generationProgress: string | null;
  lastFormData: FormData | null;
  isAssistantLoading: boolean;
  isRegenerating: boolean;
  preAIActionText: string | null;
  isRepurposing: boolean;
  isRepurposeModalOpen: boolean;
  repurposedContent: RepurposedContent | null;
  repurposeError: AppError | null;
  sentimentAnalysis: SentimentAnalysisResult | null;
  isAnalyzingSentiment: boolean;
  seoAnalysis: SEOAnalysisResult | null;
  isAnalyzingSEO: boolean;
  suggestedHashtags: string[];
  isSuggestingHashtags: boolean;
  suggestedAudio: string[];
  isSuggestingAudio: boolean;
  performancePrediction: PerformancePrediction | null;
  isPredictingPerformance: boolean;
  isLiveAssistantActive: boolean;
  isAssistantSpeaking: boolean;
  assistantTranscript: { speaker: 'user' | 'model'; text: string }[];
  liveTranscript: { user: string; model: string };
  isGeneratingVideoStory: boolean;
  isOptimizingMultiPlatform: boolean;
  hookVariations: string[];
  isSuggestingHooks: boolean;

  // Actions
  startGeneration: (formData: FormData) => void;
  setStreamResult: (result: GenerationResult) => void;
  appendStreamChunk: (chunk: string) => void;
  setResultDetails: (details: Partial<GenerationResult>) => void;
  generationSuccess: (result: GenerationResult) => void;
  generationFailure: (error: AppError) => void;
  setProgress: (progress: string | null) => void;
  setResult: (result: GenerationResult | null) => void;
  startAnalyses: () => void;
  analysesSuccess: (payload: { sentiment: SentimentAnalysisResult | null, seo: SEOAnalysisResult | null }) => void;
  analysesFailure: () => void;
  startHashtagSuggestions: () => void;
  hashtagSuggestionsSuccess: (hashtags: string[]) => void;
  addHashtag: (tag: string) => void;
  startAudioSuggestions: () => void;
  audioSuggestionsSuccess: (audio: string[]) => void;
  startAIAction: (originalText: string) => void;
  startRegeneration: () => void;
  regenerationFailure: (error: AppError) => void;
  finishRegeneration: () => void;
  updateResultText: (newText: string) => void;
  aiActionFailure: (error: AppError) => void;
  finishAIAction: () => void;
  revertAIAction: () => void;
  startRepurpose: () => void;
  repurposeSuccess: (content: RepurposedContent) => void;
  repurposeFailure: (error: AppError) => void;
  setRepurposeModalOpen: (isOpen: boolean) => void;
  clearRepurposeContent: () => void;
  startPrediction: () => void;
  predictionSuccess: (prediction: PerformancePrediction | null) => void;
  predictionFailure: (error?: AppError) => void;
  toggleLiveAssistant: () => void;
  setIsAssistantSpeaking: (isSpeaking: boolean) => void;
  setAssistantTranscript: (transcript: { speaker: 'user' | 'model'; text: string }[]) => void;
  appendAssistantTranscript: (turn: { speaker: 'user' | 'model'; text: string }) => void;
  setLiveTranscript: (transcript: { user: string; model: string }) => void;
  startSentimentAnalysis: () => void;
  sentimentAnalysisSuccess: (analysis: SentimentAnalysisResult | null) => void;
  sentimentAnalysisFailure: () => void;
  startSEOAnalysis: () => void;
  seoAnalysisSuccess: (analysis: SEOAnalysisResult | null) => void;
  seoAnalysisFailure: () => void;
  startVideoStoryGeneration: () => void;
  videoStorySuccess: () => void;
  videoStoryFailure: () => void;
  startMultiPlatformOptimization: () => void;
  multiPlatformSuccess: () => void;
  multiPlatformFailure: () => void;
  startHookSuggestions: () => void;
  hookSuggestionsSuccess: (hooks: string[]) => void;
  applyHook: (newHook: string) => void;
};

const initialGenerationState = {
  result: null,
  isLoading: false,
  error: null,
  generationProgress: null,
  lastFormData: null,
  isAssistantLoading: false,
  isRegenerating: false,
  preAIActionText: null,
  isRepurposing: false,
  isRepurposeModalOpen: false,
  repurposedContent: null,
  repurposeError: null,
  sentimentAnalysis: null,
  isAnalyzingSentiment: false,
  seoAnalysis: null,
  isAnalyzingSEO: false,
  suggestedHashtags: [],
  isSuggestingHashtags: false,
  suggestedAudio: [],
  isSuggestingAudio: false,
  performancePrediction: null,
  isPredictingPerformance: false,
  isLiveAssistantActive: false,
  isAssistantSpeaking: false,
  assistantTranscript: [],
  liveTranscript: { user: '', model: '' },
  isGeneratingVideoStory: false,
  isOptimizingMultiPlatform: false,
  hookVariations: [],
  isSuggestingHooks: false,
};

export const useGenerationStore = create<GenerationState>((set, get) => ({
  ...initialGenerationState,

  startGeneration: (formData) => set({ ...initialGenerationState, isLoading: true, lastFormData: formData }),
  setStreamResult: (result) => set({ generationProgress: "Generowanie tekstu...", result }),
  appendStreamChunk: (chunk) => set(state => {
    if (!state.result) return {};
    const currentText = state.result.postText || '';
    return { result: { ...state.result, postText: currentText + chunk } };
  }),
  setResultDetails: (details) => set(state => {
    if (!state.result) return {};
    return { result: { ...state.result, ...details } };
  }),
  generationSuccess: (result) => set({ isLoading: false, result, generationProgress: null, error: null }),
  generationFailure: (error) => set({ isLoading: false, error, generationProgress: null }),
  setProgress: (progress) => set({ generationProgress: progress }),
  setResult: (result) => set({ result, preAIActionText: null }),
  startAnalyses: () => set({ isAnalyzingSentiment: true, isAnalyzingSEO: true, sentimentAnalysis: null, seoAnalysis: null }),
  analysesSuccess: (payload) => set({ isAnalyzingSentiment: false, isAnalyzingSEO: false, sentimentAnalysis: payload.sentiment, seoAnalysis: payload.seo }),
  analysesFailure: () => set({ isAnalyzingSentiment: false, isAnalyzingSEO: false }),
  startHashtagSuggestions: () => set({ isSuggestingHashtags: true, suggestedHashtags: [] }),
  hashtagSuggestionsSuccess: (hashtags) => set({ isSuggestingHashtags: false, suggestedHashtags: hashtags }),
  addHashtag: (tag) => set(state => {
    if (!state.result || state.result.hashtags.includes(tag)) return {};
    return {
      result: { ...state.result, hashtags: [...state.result.hashtags, tag] },
      suggestedHashtags: state.suggestedHashtags.filter(h => h !== tag)
    };
  }),
  startAudioSuggestions: () => set({ isSuggestingAudio: true, suggestedAudio: [] }),
  audioSuggestionsSuccess: (audio) => set({ isSuggestingAudio: false, suggestedAudio: audio }),
  startAIAction: (originalText) => set({ isAssistantLoading: true, error: null, preAIActionText: originalText }),
  startRegeneration: () => set({ isRegenerating: true, error: null }),
  regenerationFailure: (error) => set({ isRegenerating: false, error }),
  finishRegeneration: () => set({ isRegenerating: false }),
  updateResultText: (newText) => set(state => {
    if (!state.result) return {};
    return { result: { ...state.result, postText: newText } };
  }),
  aiActionFailure: (error) => set({ isAssistantLoading: false, error }),
  finishAIAction: () => set({ isAssistantLoading: false }),
  revertAIAction: () => set(state => {
    if (!state.result || !state.preAIActionText) return {};
    return { result: { ...state.result, postText: state.preAIActionText }, preAIActionText: null, error: null };
  }),
  startRepurpose: () => set({ isRepurposing: true, isRepurposeModalOpen: true, repurposedContent: null, repurposeError: null }),
  repurposeSuccess: (content) => set({ isRepurposing: false, repurposedContent: content }),
  repurposeFailure: (error) => set({ isRepurposing: false, repurposeError: error }),
  setRepurposeModalOpen: (isOpen) => set({ isRepurposeModalOpen: isOpen }),
  clearRepurposeContent: () => set({ repurposedContent: null, repurposeError: null }),
  startPrediction: () => set({ isPredictingPerformance: true, performancePrediction: null }),
  predictionSuccess: (prediction) => set({ isPredictingPerformance: false, performancePrediction: prediction }),
  predictionFailure: (error) => set({ isPredictingPerformance: false, performancePrediction: null }),
  toggleLiveAssistant: () => set(state => ({ isLiveAssistantActive: !state.isLiveAssistantActive, assistantTranscript: [], liveTranscript: { user: '', model: '' } })),
  setIsAssistantSpeaking: (isSpeaking) => set({ isAssistantSpeaking: isSpeaking }),
  setAssistantTranscript: (transcript) => set({ assistantTranscript: transcript }),
  appendAssistantTranscript: (turn) => set(state => ({ assistantTranscript: [...state.assistantTranscript, turn] })),
  setLiveTranscript: (transcript) => set({ liveTranscript: transcript }),
  startSentimentAnalysis: () => set({ isAnalyzingSentiment: true, sentimentAnalysis: null }),
  sentimentAnalysisSuccess: (analysis) => set({ isAnalyzingSentiment: false, sentimentAnalysis: analysis }),
  sentimentAnalysisFailure: () => set({ isAnalyzingSentiment: false }),
  startSEOAnalysis: () => set({ isAnalyzingSEO: true, seoAnalysis: null }),
  seoAnalysisSuccess: (analysis) => set({ isAnalyzingSEO: false, seoAnalysis: analysis }),
  seoAnalysisFailure: () => set({ isAnalyzingSEO: false }),
  startVideoStoryGeneration: () => set({ isGeneratingVideoStory: true }),
  videoStorySuccess: () => set({ isGeneratingVideoStory: false }),
  videoStoryFailure: () => set({ isGeneratingVideoStory: false }),
  startMultiPlatformOptimization: () => set({ isOptimizingMultiPlatform: true }),
  multiPlatformSuccess: () => set({ isOptimizingMultiPlatform: false }),
  multiPlatformFailure: () => set({ isOptimizingMultiPlatform: false }),
  startHookSuggestions: () => set({ isSuggestingHooks: true, hookVariations: [] }),
  hookSuggestionsSuccess: (hooks) => set({ isSuggestingHooks: false, hookVariations: hooks }),
  applyHook: (newHook) => set(state => {
    if (!state.result) return {};
    const text = state.result.postText;
    const sentenceEndMatch = text.match(/[.!?](\s|$)/);
    let newText = text;
    if (sentenceEndMatch) {
       const index = sentenceEndMatch.index! + 1;
       newText = newHook + text.substring(index);
    } else {
       newText = newHook + "\n\n" + text;
    }
    return { result: { ...state.result, postText: newText } };
  }),
}));
