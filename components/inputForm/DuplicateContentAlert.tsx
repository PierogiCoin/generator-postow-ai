import React from 'react';
import { formatTimeAgo, type DuplicateCheckResult } from '../../services/contentDuplicateService';

interface DuplicateContentAlertProps {
  duplicateCheck: DuplicateCheckResult;
  onDismiss: () => void;
}

export const DuplicateContentAlert: React.FC<DuplicateContentAlertProps> = ({
  duplicateCheck,
  onDismiss,
}) => {
  if (!duplicateCheck.mostSimilar) return null;

  const { mostSimilar } = duplicateCheck;

  return (
    <div className="animate-fade-in flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl">
      <span className="text-amber-500 text-lg shrink-0">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
          Podobny post z historii ({Math.round(mostSimilar.similarity * 100)}% podobny)
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 truncate mt-0.5">
          „{mostSimilar.topic.slice(0, 80)}
          {mostSimilar.topic.length > 80 ? '…' : ''}”
          <span className="ml-1 opacity-70">· {formatTimeAgo(mostSimilar.timestamp)}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 text-xs shrink-0"
        aria-label="Zamknij alert"
      >
        ✕
      </button>
    </div>
  );
};
