import React from 'react';
import { RefreshCwIcon } from '../icons/RefreshCwIcon';
import { SmileyIcon } from '../icons/SmileyIcon';
import { TextShortenIcon } from '../icons/TextShortenIcon';
import { TextLengthenIcon } from '../icons/TextLengthenIcon';
import type { AIAssistantAction } from '../../types';
import { SummarizeIcon } from '../icons/SummarizeIcon';
import { ExpandKeywordsIcon } from '../icons/ExpandKeywordsIcon';
import { SuggestHashtagsIcon } from '../icons/SuggestHashtagsIcon';
import { SpinnerIcon } from '../icons/SpinnerIcon';
import { CustomPromptForm } from './CustomPromptForm';

interface AIAssistantToolbarProps {
  onAction: (action: AIAssistantAction, customPrompt?: string) => void;
  isLoading: boolean;
}

const actions: { id: AIAssistantAction; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'rewrite', label: 'Przeredaguj', icon: RefreshCwIcon },
  { id: 'summarize', label: 'Podsumuj', icon: SummarizeIcon },
  { id: 'shorten', label: 'Skróć', icon: TextShortenIcon },
  { id: 'lengthen', label: 'Wydłuż', icon: TextLengthenIcon },
  { id: 'add-emoji', label: 'Dodaj emoji', icon: SmileyIcon },
  { id: 'expand_keywords', label: 'Rozwiń słowa kluczowe', icon: ExpandKeywordsIcon },
  { id: 'suggest_hashtags', label: 'Sugeruj hashtagi', icon: SuggestHashtagsIcon },
];


export const AIAssistantToolbar: React.FC<AIAssistantToolbarProps> = ({ onAction, isLoading }) => {
  const [customPrompt, setCustomPrompt] = React.useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPrompt = customPrompt.trim();
    if (trimmedPrompt.length > 0 && trimmedPrompt.length <= 500 && !isLoading) {
      onAction('custom', trimmedPrompt);
      setCustomPrompt('');
    }
  };

  return (
    <div className="flex flex-col gap-2 p-1.5 bg-slate-950/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 ring-1 ring-black/50 overflow-hidden min-w-[300px] animate-in fade-in zoom-in duration-200">
      <div className="flex items-center gap-1 border-b border-white/5 pb-1 mb-1">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none group relative"
              title={action.label}
              aria-label={action.label}
            >
              <Icon className="w-4 h-4" />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                {action.label}
              </span>
            </button>
          )
        })}
        <div className="flex-grow" />
        {isLoading && (
          <div className="pr-2">
            <SpinnerIcon className="h-4 w-4 text-blue-500" />
          </div>
        )}
      </div>

      <CustomPromptForm
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
        onSubmit={handleCustomSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};