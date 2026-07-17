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
        if (currentSelection.length > 1) { // Prevent deselecting the last one
          newSelection = currentSelection.filter(p => p !== platform);
        } else {
          return; // Do nothing
        }
      } else {
        newSelection = [...currentSelection, platform];
      }
      onChange(newSelection);
    }
  };

  if (mode === 'single') {
    return (
      <div className={`grid grid-cols-3 sm:grid-cols-6 gap-3.5 ${className || ''}`}>
        {platformsToShow.map(platform => {
          const config = platformConfig[platform];
          const Icon = config.icon;
          const isSelected = value === platform;
          return (
            <button
              key={platform}
              type="button"
              onClick={() => handleSelect(platform)}
              className={`group flex flex-col items-center justify-center p-4 text-center border rounded-2xl transition-all duration-300 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${isSelected
                  ? `bg-slate-900/60 dark:bg-white/5 border-cyan-500 shadow-xl shadow-cyan-500/10 scale-105 neon-glow-cyan`
                  : `border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 hover:border-cyan-500/35 hover:scale-105`
                }`}
              title={platform}
              aria-pressed={isSelected}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 group-hover:text-cyan-500'}`}>
                <Icon className="w-6 h-6" />
              </div>

              <span className={`text-[10px] uppercase font-black tracking-widest transition-colors ${isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-550 group-hover:text-cyan-500'}`}>{platform}</span>

              {isSelected && (
                <div className="absolute top-0 right-0 w-6 h-6 bg-cyan-500 text-white flex items-center justify-center rounded-bl-lg">
                  <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Multi-select mode
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 ${className || ''}`}>
      {platformsToShow.map(platform => {
        const config = platformConfig[platform];
        const Icon = config.icon;
        const isSelected = Array.isArray(value) && value.includes(platform);
        return (
          <button
            key={platform}
            type="button"
            onClick={() => handleSelect(platform)}
            className={`group flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all duration-300 text-left focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${isSelected ? 'bg-slate-900/60 dark:bg-white/5 border-cyan-500 shadow-xl shadow-cyan-500/5 neon-glow-cyan' : 'border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-950/20 hover:border-cyan-500/35 hover:scale-[1.01]'}`}
            aria-pressed={isSelected}
          >
            <div className={`w-6 h-6 flex items-center justify-center rounded-lg border transition-all duration-300 ${isSelected ? 'bg-cyan-500 border-cyan-500 shadow-md scale-110' : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5'}`}>
              {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white stroke-[3]" />}
            </div>

            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 group-hover:text-cyan-500'}`}>
              <Icon className="w-5 h-5" />
            </div>

            <span className={`text-[11px] uppercase font-black tracking-widest transition-colors ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-550 group-hover:text-cyan-500'}`}>{platform}</span>
          </button>
        );
      })}
    </div>
  );
};