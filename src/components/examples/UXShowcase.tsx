import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  SkeletonText,
  SkeletonCard,
  Spinner,
  ProgressBar,
  PulsatingDots,
  LoadingOverlay,
  ButtonLoading,
} from '../ui/LoadingStates';
import {
  showError,
  showSuccess,
  showInfo,
  showWarning,
  toastPromise,
} from '../../utils/errorHandler';
import { useDarkMode } from '../../hooks/useDarkMode';

/**
 * UX Showcase - demonstracja nowych features
 */
export const UXShowcase: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { isDark, toggle } = useDarkMode();

  const simulateAPICall = async () => {
    setIsLoading(true);
    const interval = setInterval(() => {
      setProgress(prev => prev >= 100 ? 100 : prev + 10);
    }, 300);
    await new Promise(resolve => setTimeout(resolve, 3000));
    clearInterval(interval);
    setIsLoading(false);
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text">🎨 UX/UI Showcase</h1>

      {/* Toasts */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg space-y-3">
        <h2 className="text-xl font-semibold">Toast Notifications</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => showSuccess('Success!')} className="px-4 py-2 bg-green-600 text-white rounded-lg">Success</button>
          <button onClick={() => showError('Error 500')} className="px-4 py-2 bg-red-600 text-white rounded-lg">Error</button>
          <button onClick={() => showInfo('Info')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Info</button>
        </div>
      </div>

      {/* Loading */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h2 className="text-xl font-semibold">Loading States</h2>
        <div className="flex gap-4"><Spinner size="sm" /><Spinner size="md" /><Spinner size="lg" /></div>
        <ProgressBar progress={progress} label="Progress" />
        <button onClick={simulateAPICall} disabled={isLoading} className="px-6 py-3 bg-purple-600 text-white rounded-xl">
          {isLoading ? <ButtonLoading /> : 'Test Loading'}
        </button>
      </div>

      {/* Dark Mode */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
        <button onClick={toggle} className="px-6 py-3 bg-purple-600 text-white rounded-xl">
          {isDark ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </div>
  );
};
