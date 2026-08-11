import React from 'react';
import type { AppError } from '../types';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { RefreshCwIcon } from './icons/RefreshCwIcon';
import { ArrowUturnLeftIcon } from './icons/ArrowUturnLeftIcon';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onRevert?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry, onRevert }) => {
  const isLimitError = error.type === 'limit';
  const canRetry = onRetry;
  const canRevert = onRevert;

  return (
    <div className="text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg border border-red-300 dark:border-red-700/50 flex flex-col items-center text-center animate-fade-in w-full">
      <AlertTriangleIcon className="w-10 h-10 mb-3 text-red-600 dark:text-red-400" />
      <h3 className="font-semibold text-lg text-red-700 dark:text-red-300">{error.message || 'Wystąpił błąd'}</h3>
      {error.details && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-500/80 bg-red-200/50 dark:bg-red-800/20 p-2 rounded-md max-w-full overflow-x-auto text-left">
          <strong>Szczegóły:</strong> {error.details}
        </p>
      )}
      <div className="mt-4 flex gap-3 flex-wrap justify-center">
         {canRevert && (
            <button
                onClick={onRevert}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
                <ArrowUturnLeftIcon className="w-4 h-4" />
                Przywróć
            </button>
        )}
        {canRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition"
          >
            <RefreshCwIcon className="w-4 h-4" />
            Spróbuj ponownie
          </button>
        )}
        {isLimitError && (
             <button
                onClick={onRetry} // W tym przypadku onRetry może np. otwierać modal z cenami
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
            >
                Ulepsz plan
            </button>
        )}
      </div>
    </div>
  );
};