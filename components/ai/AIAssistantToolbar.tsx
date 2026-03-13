import React from 'react';
import { RefreshCwIcon } from '../icons/RefreshCwIcon';
import { SmileyIcon } from '../icons/SmileyIcon';
import { TextShortenIcon } from '../icons/TextShortenIcon';
import { TextLengthenIcon } from '../icons/TextLengthenIcon';
import type { AIAssistantAction } from '../../types';
import { SummarizeIcon } from '../icons/SummarizeIcon';
import { ExpandKeywordsIcon } from '../icons/ExpandKeywordsIcon';
import { SuggestHashtagsIcon } from '../icons/SuggestHashtagsIcon';

interface AIAssistantToolbarProps {
  onAction: (action: AIAssistantAction, customPrompt?: string) => void;
  isLoading: boolean;
}

const actions = [
  { id: 'rewrite', label: 'Przeredaguj', icon: RefreshCwIcon },
  { id: 'summarize', label: 'Podsumuj', icon: SummarizeIcon },
  { id: 'shorten', label: 'Skróć', icon: TextShortenIcon },
  { id: 'lengthen', label: 'Wydłuż', icon: TextLengthenIcon },
  { id: 'add-emoji', label: 'Dodaj emoji', icon: SmileyIcon },
] as const;


export const AIAssistantToolbar: React.FC<AIAssistantToolbarProps> = ({ onAction, isLoading }) => {
  const [customPrompt, setCustomPrompt] = React.useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim() && !isLoading) {
      // We'll treat custom prompt as a special action or pass it via a specific ID
      // For now, let's assume 'rewrite' can handle it if we pass the prompt, 
      // but better to have a dedicated handler or cast.
      (onAction as any)('custom', customPrompt);
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
            <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-1 pb-1">
        <div className="relative flex-grow">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCustomSubmit(e as any);
              }
            }}
            placeholder="Zapytaj AI... (np. uczyń to dowcipnym)"
            disabled={isLoading}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleCustomSubmit}
          disabled={isLoading || !customPrompt.trim()}
          className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:bg-slate-800"
        >
          <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};