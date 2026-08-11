import { useCallback } from 'react';
import { useGenerationStore } from '../../stores/generationStore';

interface UsePredictProps {
    abortControllerRef: { current: AbortController | null };
    t: (key: string) => string;
}

export const usePredict = ({ abortControllerRef, t }: UsePredictProps) => {
    const handleAbortGeneration = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        const genActions = useGenerationStore.getState();
        genActions.generationFailure({ message: t('errors.generation_cancelled'), type: 'unknown' });
        genActions.setProgress(null);
    }, [abortControllerRef, t]);

    return { handleAbortGeneration };
};
