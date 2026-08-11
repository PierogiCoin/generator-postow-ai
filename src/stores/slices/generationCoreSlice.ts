import { StateCreator } from 'zustand';
import type { GenerationResult, AppError, FormData, RepurposedContent } from '../../types';

export interface GenerationCoreSlice {
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
  isOptimizingMultiPlatform: boolean;
  hookVariations: string[];
  isSuggestingHooks: boolean;
  isRegeneratingImage: boolean;

  startGeneration: (formData: FormData) => void;
  setStreamResult: (result: GenerationResult) => void;
  appendStreamChunk: (chunk: string) => void;
  setResultDetails: (details: Partial<GenerationResult>) => void;
  generationSuccess: (result: GenerationResult) => void;
  generationFailure: (error: AppError) => void;
  setProgress: (progress: string | null) => void;
  setResult: (result: GenerationResult | null) => void;
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
  startMultiPlatformOptimization: () => void;
  multiPlatformSuccess: () => void;
  multiPlatformFailure: () => void;
  startHookSuggestions: () => void;
  hookSuggestionsSuccess: (hooks: string[]) => void;
  applyHook: (newHook: string) => void;
  startImageRegeneration: () => void;
  finishImageRegeneration: () => void;
  updateResultImage: (
    imageUrl: string,
    opts?: {
      visualScore?: GenerationResult['visualScore'] | null;
      pushHistory?: boolean;
    }
  ) => void;
  restoreResultImage: (url: string) => void;
  updateResultVideo: (videoUrl: string) => void;
  clearResult: () => void;
}

export const createGenerationCoreSlice: StateCreator<GenerationCoreSlice, [], [], GenerationCoreSlice> = (set) => ({
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
  isOptimizingMultiPlatform: false,
  hookVariations: [],
  isSuggestingHooks: false,
  isRegeneratingImage: false,

  startGeneration: (formData) => set({ isLoading: true, lastFormData: formData, result: null, error: null, generationProgress: null }),
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
  startMultiPlatformOptimization: () => set({ isOptimizingMultiPlatform: true }),
  multiPlatformSuccess: () => set({ isOptimizingMultiPlatform: false }),
  multiPlatformFailure: () => set({ isOptimizingMultiPlatform: false }),
  startHookSuggestions: () => set({ isSuggestingHooks: true, hookVariations: [] }),
  hookSuggestionsSuccess: (hooks) => set({ isSuggestingHooks: false, hookVariations: hooks }),
  applyHook: (newHook) => set(state => {
    if (!state.result) return {};
    const text = state.result.postText;
    const paragraphs = text.split(/\n\n+/);
    const first = paragraphs[0] ?? '';
    const sentenceEnd = first.search(/[.!?](\s|$)/);
    if (sentenceEnd >= 0) {
      paragraphs[0] = newHook.trim() + first.slice(sentenceEnd + 1);
    } else {
      paragraphs[0] = newHook.trim();
    }
    return { result: { ...state.result, postText: paragraphs.join('\n\n') } };
  }),
  startImageRegeneration: () => set({ isRegeneratingImage: true }),
  finishImageRegeneration: () => set({ isRegeneratingImage: false }),
  updateResultImage: (imageUrl, opts) => set(state => {
    if (!state.result) return {};
    const pushHistory = opts?.pushHistory !== false;
    const prevUrl = state.result.imageUrl;
    const nextHistory =
      pushHistory && prevUrl && prevUrl !== imageUrl
        ? [prevUrl, ...(state.result.imageHistory || []).filter((u: string) => u !== prevUrl && u !== imageUrl)].slice(0, 10)
        : state.result.imageHistory;
    const nextScore =
      opts && 'visualScore' in opts
        ? (opts.visualScore ?? undefined)
        : state.result.visualScore;
    return {
      result: {
        ...state.result,
        imageHistory: nextHistory,
        imageUrl,
        imageGenerationFailed: false,
        imageGenerationError: undefined,
        visualScore: nextScore,
      },
    };
  }),
  restoreResultImage: (url) => set(state => {
    if (!state.result || !url || state.result.imageUrl === url) return {};
    const current = state.result.imageUrl;
    const rest = (state.result.imageHistory || []).filter((u: string) => u !== url && u !== current);
    const nextHistory = current ? [current, ...rest].slice(0, 10) : rest.slice(0, 10);
    return {
      result: {
        ...state.result,
        imageUrl: url,
        imageHistory: nextHistory,
        imageGenerationFailed: false,
        imageGenerationError: undefined,
      },
    };
  }),
  updateResultVideo: (videoUrl) => set(state =>
    state.result ? { result: { ...state.result, videoUrl } } : {}
  ),
  clearResult: () => set({ 
    result: null, 
    error: null, 
    isLoading: false,
    hookVariations: [],
  }),
});
