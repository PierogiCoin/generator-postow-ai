import React from 'react';
import { Platform } from '../types';
import { platformConfig } from '../config/platformConfig';
import { CheckIcon } from './icons/CheckIcon';

interface PlatformSelectorProps {
  mode?: 'single' | 'multiple';
  value: Platform | Platform[];
  onChange: (newValue: Platform | Platform[]) => void;
  className?: string;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({ mode = 'single', value, onChange, className }) => {
  const platformsToShow = [
    Platform.Facebook,
    Platform.Instagram,
    Platform.TikTok,
    Platform.X,
    Platform.LinkedIn,
    Platform.YouTube,
  ];

  const handleSelect = (platform: Platform) => {
    if (mode === 'single') {
      onChange(platform);
    } else {
      const currentSelection = (value as Platform[]) || [];
      const isSelected = currentSelection.includes(platform);
      let newSelection;
      if (isSelected) {
        if (currentSelection.length > 1) {
          newSelection = currentSelection.filter(p => p !== platform);
        } else {
          return;
        }
      } else {
        newSelection = [...currentSelection, platform];
      }
      onChange(newSelection);
    }
  };

  if (mode === 'single') {
    return (
      <div className={`grid grid-cols-3 sm:grid-cols-6 gap-3 ${className || ''}`} role="radiogroup" aria-label="Wybierz platformę społecznościową">
        {platformsToShow.map(platform => {
          const config = platformConfig[platform];
          const Icon = config.icon;
          const isSelected = value === platform;
          return (
            <button
              key={platform}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(platform)}
              className={`group flex flex-col items-center justify-center p-3 sm:p-4 text-center border rounded-lg transition-colors relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)]/50 ${
                isSelected
                  ? 'border-[var(--hero-accent)] bg-[var(--hero-accent-soft)] dark:bg-white/5'
                  : 'border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#071018]/40 text-slate-500 dark:text-slate-400 hover:border-[var(--hero-accent)]/40'
              }`}
              title={platform}
            >
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
                {platform}
              </span>

              {isSelected && (
                <div
                  className="absolute top-0 right-0 w-5 h-5 text-white flex items-center justify-center rounded-bl-md"
                  style={{ backgroundColor: 'var(--hero-accent)' }}
                >
                  <CheckIcon className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${className || ''}`} role="group" aria-label="Wybierz platformy społecznościowe">
      {platformsToShow.map(platform => {
        const config = platformConfig[platform];
        const Icon = config.icon;
        const isSelected = Array.isArray(value) && value.includes(platform);
        return (
          <button
            key={platform}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            onClick={() => handleSelect(platform)}
            className={`group flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)]/50 ${
              isSelected
                ? 'border-[var(--hero-accent)] bg-[var(--hero-accent-soft)] dark:bg-white/5'
                : 'border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-[#071018]/40 hover:border-[var(--hero-accent)]/40'
            }`}
          >
            <div
              className={`w-5 h-5 flex items-center justify-center rounded-md border transition-colors ${
                isSelected
                  ? 'border-[var(--hero-accent)] text-white'
                  : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5'
              }`}
              style={isSelected ? { backgroundColor: 'var(--hero-accent)' } : undefined}
            >
              {isSelected && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
            </div>

            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-[var(--hero-accent-soft)] text-[var(--hero-accent)]'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 group-hover:text-[var(--hero-accent)]'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>

            <span
              className={`text-[11px] uppercase font-semibold tracking-wider transition-colors ${
                isSelected
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-500 group-hover:text-[var(--hero-accent)]'
              }`}
            >
              {platform}
            </span>
          </button>
        );
      })}
    </div>
  );
};
