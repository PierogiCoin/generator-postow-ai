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
  onAction: (action: AIAssistantAction) => void;
  isLoading: boolean;
}

const actions = [
  { id: 'rewrite', label: 'Przeredaguj', icon: RefreshCwIcon },
  { id: 'summarize', label: 'Podsumuj', icon: SummarizeIcon },
  { id: 'shorten', label: 'Skróć', icon: TextShortenIcon },
  { id: 'lengthen', label: 'Wydłuż', icon: TextLengthenIcon },
  { id: 'expand_keywords', label: 'Rozwiń słowa kluczowe', icon: ExpandKeywordsIcon },
  { id: 'suggest_hashtags', label: 'Zaproponuj hashtagi', icon: SuggestHashtagsIcon },
  { id: 'add-emoji', label: 'Dodaj emoji', icon: SmileyIcon },
] as const;


export const AIAssistantToolbar: React.FC<AIAssistantToolbarProps> = ({ onAction, isLoading }) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-900/80 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50">
      {isLoading ? (
        <div className="flex items-center justify-center px-4 py-2 text-white w-40">
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : (
        actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors active:bg-white/20"
              title={action.label}
              aria-label={action.label}
            >
              <Icon className="w-5 h-5" />
            </button>
          )
        })
      )}
    </div>
  );
};