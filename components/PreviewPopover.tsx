import React from 'react';
import type { GenerationResult, FormData } from '../types';
import { PostPreview } from './PostPreview';

interface PreviewPopoverProps {
  result: GenerationResult;
  formData: FormData;
  position: { top: number; left: number };
}

export const PreviewPopover: React.FC<PreviewPopoverProps> = ({ result, formData, position }) => {
  return (
    <div
      className="fixed z-[100] p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl animate-fade-in"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        animationDuration: '150ms'
      }}
    >
      <div style={{ width: '320px', transform: 'scale(0.8)', transformOrigin: 'top left' }}>
        <PostPreview
          result={result}
          formData={formData}
          onUpdateResult={() => {}}
          onAIAssistantAction={() => {}}
          isAssistantLoading={false}
        />
      </div>
    </div>
  );
};
