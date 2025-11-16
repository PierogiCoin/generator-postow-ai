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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
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
            className={`flex flex-col items-center justify-center p-3 text-center border-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSelected
                ? 'border-blue-500 bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-white'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-slate-400 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400'
            }`}
            title={label}
          >
            <Icon className={`w-6 h-6 mb-1 transition-colors ${isSelected ? 'text-blue-500 dark:text-blue-400' : ''}`} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
};