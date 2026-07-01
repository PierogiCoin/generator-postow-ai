import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/uiStore';
import { estimateGenerationCredits } from '../config/creditCosts';
import { NotificationType, FormData } from '../types';

interface UseUsageLimiterProps {
  credits: number;
  addToast: (message: string, type: NotificationType, duration?: number) => void;
}

export const useUsageLimiter = ({ credits, addToast }: UseUsageLimiterProps) => {
  const { t } = useTranslation();
  const uiActions = useUIStore.getState();

  const canGenerate = useCallback(
    (formData: FormData): boolean => {
      const cost = estimateGenerationCredits(formData);

      if (credits >= cost) {
        return true;
      }

      const message = t('errors.insufficient_credits', {
        cost,
        credits,
        defaultValue: `Potrzebujesz ${cost} kredytów (masz ${credits}). Ulepsz plan lub dokup pakiet.`,
      });

      addToast(message, NotificationType.Error);
      uiActions.setIsPricingModalOpen(true);
      return false;
    },
    [credits, addToast, t, uiActions]
  );

  return {
    canGenerate,
    estimateCost: estimateGenerationCredits,
  };
};
