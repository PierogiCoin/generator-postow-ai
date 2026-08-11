import { StateCreator } from 'zustand';
import type { SentimentAnalysisResult, SEOAnalysisResult, PerformancePrediction, GenerationResult } from '../../types';

// We need to define how it interacts with the main state if it reads 'result' from generationCore.
export interface AnalysisSlice {
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

  startAnalyses: () => void;
  analysesSuccess: (payload: { sentiment: SentimentAnalysisResult | null, seo: SEOAnalysisResult | null }) => void;
  analysesFailure: () => void;
  startHashtagSuggestions: () => void;
  hashtagSuggestionsSuccess: (hashtags: string[]) => void;
  addHashtag: (tag: string) => void;
  startAudioSuggestions: () => void;
  audioSuggestionsSuccess: (audio: string[]) => void;
  startPrediction: () => void;
  predictionSuccess: (prediction: PerformancePrediction | null) => void;
  predictionFailure: (error?: any) => void;
  startSentimentAnalysis: () => void;
  sentimentAnalysisSuccess: (analysis: SentimentAnalysisResult | null) => void;
  sentimentAnalysisFailure: () => void;
  startSEOAnalysis: () => void;
  seoAnalysisSuccess: (analysis: SEOAnalysisResult | null) => void;
  seoAnalysisFailure: () => void;
}

// Type constraint: the full state must have 'result' from core
type StoreStateWithResult = AnalysisSlice & { result: GenerationResult | null };

export const createAnalysisSlice: StateCreator<StoreStateWithResult, [], [], AnalysisSlice> = (set) => ({
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

  startAnalyses: () => set({ isAnalyzingSentiment: true, isAnalyzingSEO: true, sentimentAnalysis: null, seoAnalysis: null }),
  analysesSuccess: (payload) => set({ isAnalyzingSentiment: false, isAnalyzingSEO: false, sentimentAnalysis: payload.sentiment, seoAnalysis: payload.seo }),
  analysesFailure: () => set({ isAnalyzingSentiment: false, isAnalyzingSEO: false }),
  startHashtagSuggestions: () => set({ isSuggestingHashtags: true, suggestedHashtags: [] }),
  hashtagSuggestionsSuccess: (hashtags) => set({ isSuggestingHashtags: false, suggestedHashtags: hashtags }),
  addHashtag: (tag) => set(state => {
    if (!state.result || state.result.hashtags.includes(tag)) return {};
    return {
      result: { ...state.result, hashtags: [...state.result.hashtags, tag] },
      suggestedHashtags: state.suggestedHashtags.filter((h: string) => h !== tag)
    };
  }),
  startAudioSuggestions: () => set({ isSuggestingAudio: true, suggestedAudio: [] }),
  audioSuggestionsSuccess: (audio) => set({ isSuggestingAudio: false, suggestedAudio: audio }),
  startPrediction: () => set({ isPredictingPerformance: true, performancePrediction: null }),
  predictionSuccess: (prediction) => set({ isPredictingPerformance: false, performancePrediction: prediction }),
  predictionFailure: (error) => set({ isPredictingPerformance: false, performancePrediction: null }),
  startSentimentAnalysis: () => set({ isAnalyzingSentiment: true, sentimentAnalysis: null }),
  sentimentAnalysisSuccess: (analysis) => set({ isAnalyzingSentiment: false, sentimentAnalysis: analysis }),
  sentimentAnalysisFailure: () => set({ isAnalyzingSentiment: false }),
  startSEOAnalysis: () => set({ isAnalyzingSEO: true, seoAnalysis: null }),
  seoAnalysisSuccess: (analysis) => set({ isAnalyzingSEO: false, seoAnalysis: analysis }),
  seoAnalysisFailure: () => set({ isAnalyzingSEO: false }),
});
