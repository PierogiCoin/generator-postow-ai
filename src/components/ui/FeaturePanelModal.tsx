import React, { Suspense } from 'react';
import { Spinner } from './LoadingStates';

interface FeaturePanelModalProps {
  open: boolean;
  onClose: () => void;
  sectionName: string;
  maxWidthClass?: string;
  padded?: boolean;
  children: React.ReactNode;
}

export const FeaturePanelModal: React.FC<FeaturePanelModalProps> = ({
  open,
  onClose,
  sectionName,
  maxWidthClass = 'max-w-4xl',
  padded = true,
  children,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={sectionName}
    >
      <div className={`relative w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl`}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-slate-800/80 rounded-full shadow-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <Suspense
          fallback={
            <div className={`flex items-center justify-center ${padded ? 'p-12' : 'p-24'}`}>
              <Spinner />
            </div>
          }
        >
          {padded ? <div className="p-6">{children}</div> : children}
        </Suspense>
      </div>
    </div>
  );
};
