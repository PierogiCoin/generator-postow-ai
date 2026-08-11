import { useCallback } from 'react';
import { useGenerationStore } from '../../stores/generationStore';
import type { FormData } from '../../types';

interface UseRepurposeProps {
    handleGenerate: (formData: FormData) => Promise<void>;
}

export const useRepurpose = ({ handleGenerate }: UseRepurposeProps) => {
    const handleApplyAudio = useCallback((audioDescription: string) => {
        const { lastFormData } = useGenerationStore.getState();
        if (lastFormData) {
            handleGenerate({ ...lastFormData, audioDescription });
        }
    }, [handleGenerate]);

    return { handleApplyAudio };
};
