import React from 'react';
import { SendIcon } from '../icons/SendIcon';

interface CustomPromptFormProps {
  customPrompt: string;
  setCustomPrompt: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  placeholder?: string;
}

export const CustomPromptForm: React.FC<CustomPromptFormProps> = ({
  customPrompt,
  setCustomPrompt,
  onSubmit,
  isLoading,
  placeholder,
}) => {
  return (
    <div className="flex items-center gap-2 px-1 pb-1">
      <div className="relative flex-grow">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          placeholder={placeholder ?? 'Zapytaj AI... (np. uczyń to dowcipnym)'}
          disabled={isLoading}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading || !customPrompt.trim()}
        className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:bg-slate-800"
        aria-label="Wyślij zapytanie"
      >
        <SendIcon className="w-4 h-4" />
      </button>
    </div>
  );
};
