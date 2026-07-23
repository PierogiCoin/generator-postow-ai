import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCwIcon } from '../icons/RefreshCwIcon';
import { SmileyIcon } from '../icons/SmileyIcon';
import { TextShortenIcon } from '../icons/TextShortenIcon';
import { TextLengthenIcon } from '../icons/TextLengthenIcon';
import type { AIAssistantAction, Tone } from '../../types';
import { Tone as ToneEnum } from '../../types';
import { SummarizeIcon } from '../icons/SummarizeIcon';
import { ExpandKeywordsIcon } from '../icons/ExpandKeywordsIcon';
import { SuggestHashtagsIcon } from '../icons/SuggestHashtagsIcon';
import { SpinnerIcon } from '../icons/SpinnerIcon';
import { ToneIcon } from '../icons/ToneIcon';
import { CustomPromptForm } from './CustomPromptForm';

interface AIAssistantToolbarProps {
  onAction: (action: AIAssistantAction, customPrompt?: string, options?: { tone?: Tone }) => void;
  isLoading: boolean;
}

const ACTION_ORDER: AIAssistantAction[] = [
  'rewrite',
  'summarize',
  'shorten',
  'lengthen',
  'add-emoji',
  'expand_keywords',
  'suggest_hashtags',
];

const ICONS: Partial<Record<AIAssistantAction, React.FC<{ className?: string }>>> = {
  rewrite: RefreshCwIcon,
  summarize: SummarizeIcon,
  shorten: TextShortenIcon,
  lengthen: TextLengthenIcon,
  'add-emoji': SmileyIcon,
  expand_keywords: ExpandKeywordsIcon,
  suggest_hashtags: SuggestHashtagsIcon,
};

export const AIAssistantToolbar: React.FC<AIAssistantToolbarProps> = React.memo(({ onAction, isLoading }) => {
  const { t } = useTranslation();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const toneButtonRef = React.useRef<HTMLButtonElement>(null);
  const [isToneMenuOpen, setIsToneMenuOpen] = React.useState(false);
  const [tooltipBelow, setTooltipBelow] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipBelow(rect.top < 44);
  }, []);

  const actions = React.useMemo(
    () =>
      ACTION_ORDER.map((id) => ({
        id,
        label: t(`resultCard.aiAssistant.actions.${id}`),
        icon: ICONS[id]!,
      })),
    [t]
  );

  const [customPrompt, setCustomPrompt] = React.useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPrompt = customPrompt.trim();
    if (trimmedPrompt.length > 0 && trimmedPrompt.length <= 500 && !isLoading) {
      onAction('custom', trimmedPrompt);
      setCustomPrompt('');
    }
  };

  const handleToneSelect = (tone: Tone) => {
    onAction('change_tone', undefined, { tone });
    setIsToneMenuOpen(false);
  };

  React.useEffect(() => {
    if (!isToneMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!toneButtonRef.current?.contains(event.target as Node)) {
        setIsToneMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isToneMenuOpen]);

  return (
    <div ref={containerRef} className="flex flex-col gap-2 p-1.5 bg-slate-950/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 ring-1 ring-black/50 overflow-hidden min-w-[300px] animate-in fade-in zoom-in duration-200">
      <div className="flex items-center gap-1 border-b border-white/5 pb-1 mb-1">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onAction(action.id)}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none group relative"
              title={action.label}
              aria-label={action.label}
            >
              <Icon className="w-4 h-4" />
              <span className={`absolute left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl ${tooltipBelow ? 'top-full mt-1.5' : '-top-10'}`}>
                {action.label}
              </span>
            </button>
          );
        })}

        <div className="relative">
          <button
            ref={toneButtonRef}
            type="button"
            disabled={isLoading}
            onClick={() => setIsToneMenuOpen((open) => !open)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none group relative"
            title={t('resultCard.aiAssistant.actions.change_tone')}
            aria-label={t('resultCard.aiAssistant.actions.change_tone')}
            aria-haspopup="menu"
            aria-expanded={isToneMenuOpen}
          >
            <ToneIcon className="w-4 h-4" />
            <span className={`absolute left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl ${tooltipBelow ? 'top-full mt-1.5' : '-top-10'}`}>
              {t('resultCard.aiAssistant.actions.change_tone')}
            </span>
          </button>

          {isToneMenuOpen && (
            <div
              role="menu"
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[140px] bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-1 z-20"
            >
              {Object.values(ToneEnum).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  role="menuitem"
                  onClick={() => handleToneSelect(tone)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {t(`enums.Tone.${tone}`)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-grow" />
        {isLoading && (
          <div className="pr-2">
            <SpinnerIcon className="h-4 w-4 text-blue-500" />
          </div>
        )}
      </div>

      <CustomPromptForm
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
        onSubmit={handleCustomSubmit}
        isLoading={isLoading}
        placeholder={t('resultCard.aiAssistant.customPlaceholder')}
      />
    </div>
  );
});

AIAssistantToolbar.displayName = 'AIAssistantToolbar';