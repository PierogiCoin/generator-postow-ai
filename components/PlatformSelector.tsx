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
      <div className={`grid grid-cols-3 sm:grid-cols-6 gap-3 ${className || ''}`}>
        {platformsToShow.map(platform => {
          const config = platformConfig[platform];
          const Icon = config.icon;
          const isSelected = value === platform;
          return (
            <button
              key={platform}
              type="button"
              onClick={() => handleSelect(platform)}
              className={`group flex flex-col items-center justify-center p-4 text-center border-2 rounded-2xl transition-all duration-300 relative overflow-hidden ${isSelected
                  ? `${config.selectedBgColor} ${config.selectedColor} border-blue-500 shadow-lg shadow-blue-500/20 scale-105`
                  : `border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-400/50 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:scale-105`
                }`}
              title={platform}
              aria-pressed={isSelected}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'}`}>
                <Icon className={`w-6 h-6 transition-colors ${isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-600 group-hover:text-blue-500'}`} />
              </div>

              <span className={`text-[10px] uppercase font-black tracking-widest transition-colors ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>{platform}</span>

              {isSelected && (
                <div className="absolute top-0 right-0 w-8 h-8 bg-white/20 text-white flex items-center justify-center rounded-bl-xl">
                  <CheckIcon className="w-4 h-4 stroke-[3]" />
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
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${className || ''}`}>
      {platformsToShow.map(platform => {
        const config = platformConfig[platform];
        const Icon = config.icon;
        const isSelected = Array.isArray(value) && value.includes(platform);
        return (
          <button
            key={platform}
            type="button"
            onClick={() => handleSelect(platform)}
            className={`group flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 text-left ${isSelected ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-lg shadow-blue-500/5' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-blue-400 dark:hover:border-blue-400/50 hover:shadow-xl dark:hover:shadow-none hover:shadow-slate-200/50'}`}
            aria-pressed={isSelected}
          >
            <div className={`w-6 h-6 flex items-center justify-center rounded-lg border-2 transition-all duration-300 ${isSelected ? 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/30 scale-110' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
              {isSelected && <CheckIcon className="w-4 h-4 text-white stroke-[3]" />}
            </div>

            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 group-hover:text-blue-500'}`}>
              <Icon className="w-5 h-5" />
            </div>

            <span className={`text-[11px] uppercase font-black tracking-widest transition-colors ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-500 group-hover:text-blue-500'}`}>{platform}</span>
          </button>
        );
      })}
    </div>
  );
};