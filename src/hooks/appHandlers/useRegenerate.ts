import { useCallback } from 'react';
import { useGenerationStore } from '../../stores/generationStore';
import type { FormData } from '../../types';

interface UseRegenerateProps {
    handleGenerate: (formData: FormData) => Promise<void>;
}

export const useRegenerate = ({ handleGenerate }: UseRegenerateProps) => {
    const handleRetry = useCallback(() => {
        const { lastFormData } = useGenerationStore.getState();
        if (lastFormData) handleGenerate(lastFormData);
    }, [handleGenerate]);

    return { handleRetry };
};
