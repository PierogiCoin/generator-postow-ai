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
      <div className={`grid grid-cols-3 sm:grid-cols-6 gap-2 ${className || ''}`}>
        {platformsToShow.map(platform => {
          const config = platformConfig[platform];
          const Icon = config.icon;
          const isSelected = value === platform;
          return (
            <button
              key={platform}
              type="button"
              onClick={() => handleSelect(platform)}
              className={`flex flex-col items-center justify-center p-3 text-center border-2 rounded-lg transition-all duration-300 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-950 ${
                isSelected
                  ? `${config.selectedColor} ${config.selectedBgColor} scale-105 shadow-lg focus:ring-blue-500`
                  : `border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 ${config.hoverColor} hover:text-slate-800 dark:hover:text-slate-200 hover:scale-105 focus:ring-blue-400`
              }`}
              title={platform}
              aria-pressed={isSelected}
            >
              <Icon className={`w-6 h-6 mb-1 transition-colors ${isSelected ? config.iconColor : ''}`} />
              <span className={`text-xs font-semibold transition-colors ${isSelected ? config.selectedTextColor : ''}`}>{platform}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Multi-select mode
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ${className || ''}`}>
        {platformsToShow.map(platform => {
            const config = platformConfig[platform];
            const Icon = config.icon;
            const isSelected = Array.isArray(value) && value.includes(platform);
            return (
                <button
                    key={platform}
                    type="button"
                    onClick={() => handleSelect(platform)}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all text-left ${isSelected ? 'border-blue-500 bg-slate-100 dark:bg-slate-700/50' : 'border-slate-300 dark:border-slate-700'}`}
                    aria-pressed={isSelected}
                >
                    <div className={`w-5 h-5 flex items-center justify-center rounded border-2 transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-400 bg-white dark:bg-slate-800'}`}>
                        {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                    <Icon className={`w-5 h-5 transition-colors ${isSelected ? config.iconColor : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className={`text-sm font-semibold transition-colors ${isSelected ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{platform}</span>
                </button>
            );
        })}
    </div>
  );
};