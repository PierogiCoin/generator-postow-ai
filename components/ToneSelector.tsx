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

const toneConfig: Record<Tone, { icon: React.ComponentType<{ className?: string }> }> = {
  [Tone.Professional]: { icon: BriefcaseIcon },
  [Tone.Casual]: { icon: SmileyIcon },
  [Tone.Witty]: { icon: LightbulbIcon },
  [Tone.Inspirational]: { icon: StarIcon },
  [Tone.Persuasive]: { icon: ThumbsUpIcon },
};

export const ToneSelector: React.FC<ToneSelectorProps> = ({ selectedTone, onSelect, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3" role="radiogroup" aria-label="Wybierz ton wypowiedzi">
      {Object.values(Tone).map(tone => {
        const config = toneConfig[tone];
        const Icon = config.icon;
        const isSelected = selectedTone === tone;
        const label = t(`enums.Tone.${tone}`);
        return (
          <button
            key={tone}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(tone)}
            disabled={disabled}
            className={`group flex flex-col items-center justify-center p-4 text-center border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)]/50 ${
              isSelected
                ? 'border-[var(--hero-accent)] bg-[var(--hero-accent-soft)] dark:bg-white/5'
                : 'border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-[#071018]/40 text-slate-500 dark:text-slate-400 hover:border-[var(--hero-accent)]/40'
            }`}
          >
            {isSelected && (
              <div
                className="absolute top-0 right-0 w-5 h-5 text-white flex items-center justify-center rounded-bl-md"
                style={{ backgroundColor: 'var(--hero-accent)' }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${
                isSelected
                  ? 'bg-[var(--hero-accent-soft)] text-[var(--hero-accent)]'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 group-hover:text-[var(--hero-accent)]'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>

            <span
              className={`text-[10px] uppercase font-semibold tracking-wider transition-colors ${
                isSelected
                  ? 'text-[var(--hero-accent)]'
                  : 'text-slate-500 dark:text-slate-500 group-hover:text-[var(--hero-accent)]'
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
