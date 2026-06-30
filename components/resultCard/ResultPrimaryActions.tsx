import React from 'react';
import { useTranslation } from 'react-i18next';
import type { GenerationResult, FormData } from '../../types';
import { useNotifications } from '../../hooks/useNotifications';
import { useAppHandlers } from '../../hooks/useAppHandlers';
import { useDataStore } from '../../stores/dataStore';
import { ModernButton } from '../ui/ModernButton';
import { ClipboardIcon } from '../icons/ClipboardIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { StarIcon } from '../icons/StarIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { FilmIcon } from '../icons/FilmIcon';
import { ResultMoreMenu } from './ResultMoreMenu';

export interface ResultPrimaryActionsProps {
  result: GenerationResult;
  formData: FormData;
  onCopy: () => void;
  isCopied: boolean;
  onOpenCreativeStudio: () => void;
}

export const ResultPrimaryActions: React.FC<ResultPrimaryActionsProps> = ({
  result,
  formData,
  onCopy,
  isCopied,
  onOpenCreativeStudio,
}) => {
  const { t } = useTranslation();
  const notificationSystem = useNotifications();
  const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);
  const { favorites } = useDataStore();
  const isFavorite = favorites.some((fav) => fav.result.id === result.id);

  return (
    <div className="flex flex-wrap items-center gap-2 pb-5 mb-5 border-b border-slate-200 dark:border-slate-800">
      <ModernButton
        onClick={onCopy}
        variant="secondary"
        size="sm"
        icon={isCopied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
      >
        {isCopied ? t('resultCard.actions.copied', 'Skopiowano!') : t('resultCard.actions.copy', 'Kopiuj')}
      </ModernButton>

      <ModernButton
        onClick={() => appHandlers.handleAddToFavorites(result, formData)}
        variant="secondary"
        size="sm"
        disabled={isFavorite}
        icon={<StarIcon className={`w-4 h-4 ${isFavorite ? 'text-yellow-500' : ''}`} />}
      >
        {isFavorite ? t('resultCard.actions.favorited', 'Ulubiony') : t('resultCard.actions.favorite', 'Ulubione')}
      </ModernButton>

      <ModernButton
        onClick={() => appHandlers.handleOpenScheduleModal(result, formData)}
        variant="secondary"
        size="sm"
        icon={<CalendarIcon className="w-4 h-4" />}
      >
        {t('resultCard.actions.schedule', 'Zaplanuj')}
      </ModernButton>

      <ModernButton
        onClick={() => appHandlers.handleOpenVideoStoryModal(result)}
        variant="gradient"
        size="sm"
        icon={<FilmIcon className="w-4 h-4" />}
      >
        {t('resultCard.actions.video', 'Wideo')}
      </ModernButton>

      <div className="ml-auto">
        <ResultMoreMenu
          result={result}
          formData={formData}
          onOpenCreativeStudio={onOpenCreativeStudio}
        />
      </div>
    </div>
  );
};
