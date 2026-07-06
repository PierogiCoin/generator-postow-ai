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
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
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
            className={`group flex flex-col items-center justify-center p-4 text-center border rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden ${isSelected
                ? 'border-cyan-500 bg-slate-900/60 dark:bg-white/5 shadow-xl shadow-cyan-500/10 scale-105 neon-glow-cyan'
                : 'border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 hover:border-cyan-500/35 hover:scale-105'
              }`}
          >
            {isSelected && <div className="absolute top-0 right-0 w-6 h-6 bg-cyan-500 text-white flex items-center justify-center rounded-bl-lg"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>}

            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 group-hover:text-cyan-500'}`}>
              <Icon className="w-6 h-6" />
            </div>

            <span className={`text-[10px] uppercase font-black tracking-widest transition-colors ${isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-505 dark:text-slate-500 group-hover:text-cyan-500'}`}>
              {label}
            </span>

            {isSelected && (
              <div className="absolute inset-0 border border-cyan-500/30 rounded-2xl animate-pulse pointer-events-none" />
            )}
          </button>
        );
      })}
    </div>
  );
};