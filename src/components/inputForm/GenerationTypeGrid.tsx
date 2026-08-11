import React from 'react';
import { SparklesIcon } from '../icons/SparklesIcon';
import { GenerationType, Platform } from '../../types';

export type GenerationTypeConfig = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

interface GenerationTypeGridProps {
  types: GenerationType[];
  configs: Partial<Record<GenerationType, GenerationTypeConfig>>;
  selected: GenerationType;
  platform: Platform;
  onSelect: (type: GenerationType) => void;
}

/** Kompaktowa siatka typów — bez scale/glow, czytelny aktywny stan. */
export const GenerationTypeGrid: React.FC<GenerationTypeGridProps> = ({
  types,
  configs,
  selected,
  platform,
  onSelect,
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 isolate" role="listbox" aria-label="Typ generacji">
    {types.map((type) => {
      const config = configs[type];
      if (!config) return null;
      const isSelected = selected === type;
      const isDisabled = platform === Platform.YouTube && type !== GenerationType.Video;
      const Icon = config.icon;
      return (
        <button
          key={type}
          type="button"
          role="option"
          aria-selected={isSelected}
          onClick={() => onSelect(type)}
          disabled={isDisabled}
          title={config.description}
          className={`relative flex items-start gap-2.5 px-3 py-2.5 text-left rounded-xl border transition-colors min-h-[52px] overflow-hidden ${
            isSelected
              ? 'border-[var(--hero-accent)]/50 bg-[var(--hero-accent-soft)] text-[var(--hero-accent)] z-[1]'
              : 'border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-950/40 text-slate-600 dark:text-slate-300 hover:border-[var(--hero-accent)]/40'
          } ${isDisabled ? 'opacity-35 cursor-not-allowed grayscale' : ''}`}
        >
          <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isSelected ? 'text-[var(--hero-accent)]' : 'text-slate-400'}`} />
          <span className="text-[11px] font-bold uppercase tracking-tight leading-snug min-w-0 flex-1 line-clamp-2">
            {config.label}
          </span>
          {isSelected && (
            <SparklesIcon className="w-3.5 h-3.5 text-[var(--hero-accent)]/80 shrink-0 mt-0.5" aria-hidden />
          )}
        </button>
      );
    })}
  </div>
);
