import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tone } from '../types';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { SmileyIcon } from './icons/SmileyIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { StarIcon } from './icons/StarIcon';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';

interface ToneSelectorProps {
  selectedTone: Tone;
  onSelect: (tone: Tone) => void;
  disabled?: boolean;
}

const toneConfig: Record<Tone, { icon: React.FC<any> }> = {
  [Tone.Professional]: { icon: BriefcaseIcon },
  [Tone.Casual]: { icon: SmileyIcon },
  [Tone.Witty]: { icon: LightbulbIcon },
  [Tone.Inspirational]: { icon: StarIcon },
  [Tone.Persuasive]: { icon: ThumbsUpIcon },
};

export const ToneSelector: React.FC<ToneSelectorProps> = ({ selectedTone, onSelect, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {Object.values(Tone).map(tone => {
        const config = toneConfig[tone];
        const Icon = config.icon;
        const isSelected = selectedTone === tone;
        const label = t(`enums.Tone.${tone}`);
        return (
          <button
            key={tone}
            type="button"
            onClick={() => onSelect(tone)}
            disabled={disabled}
            className={`group flex flex-col items-center justify-center p-4 text-center border-2 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden ${isSelected
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-lg shadow-blue-500/10'
                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-blue-400 dark:hover:border-blue-400/50 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none'
              }`}
          >
            {isSelected && <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500 text-white flex items-center justify-center rounded-bl-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>}

            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-500 dark:group-hover:bg-blue-900/30'}`}>
              <Icon className="w-6 h-6" />
            </div>

            <span className={`text-[10px] uppercase font-black tracking-widest transition-colors ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
              {label}
            </span>

            {isSelected && (
              <div className="absolute inset-0 border-2 border-blue-500 rounded-2xl animate-pulse opacity-20 pointer-events-none" />
            )}
          </button>
        );
      })}
    </div>
  );
};