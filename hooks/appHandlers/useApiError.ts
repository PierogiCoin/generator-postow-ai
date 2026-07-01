import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { parseUserFacingError } from '../../utils/userFacingError';
import { NotificationType } from '../../types';
import type { AppError } from '../../types';
import type { ToastFn } from './types';

export const useApiError = (addToast: ToastFn) => {
    const { t } = useTranslation();
    const uiActions = useUIStore.getState();

    return useCallback((error: unknown, defaultMessageKey: string): AppError => {
        const parsed = parseUserFacingError(error, t, defaultMessageKey);

        if (parsed.code === 'api_key') {
            uiActions.setIsVeoKeyModalNeeded(true);
        }

        if (parsed.code === 'insufficient_credits') {
            uiActions.setIsPricingModalOpen(true);
        }

        const errorPayload: AppError = {
            message: parsed.title,
            details: parsed.message,
            type: parsed.code === 'quota' ? 'limit' : parsed.code === 'api_key' || parsed.code === 'safety' ? 'api' : 'unknown',
        };

        addToast(parsed.message, NotificationType.Error, 7000, {
            title: parsed.title,
            action: parsed.action,
        });
        return errorPayload;
    }, [t, addToast, uiActions]);
};
