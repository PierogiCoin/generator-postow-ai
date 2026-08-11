import { useGenerate } from './useGenerate';
import { useRegenerate } from './useRegenerate';
import { useRepurpose } from './useRepurpose';
import { usePredict } from './usePredict';
import type { GenerationHandlerDeps } from './useGenerate';

export type { GenerationHandlerDeps };

export const useGenerationHandlers = ({ addToast, t, handleApiError }: GenerationHandlerDeps) => {
    const { handleGenerate, abortControllerRef } = useGenerate({ addToast, t, handleApiError });
    const { handleRetry } = useRegenerate({ handleGenerate });
    const { handleApplyAudio } = useRepurpose({ handleGenerate });
    const { handleAbortGeneration } = usePredict({ abortControllerRef, t });

    return {
        handleGenerate,
        handleRetry,
        handleApplyAudio,
        handleAbortGeneration,
    };
};
