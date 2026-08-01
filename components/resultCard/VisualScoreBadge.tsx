import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, ShieldCheck, RefreshCwIcon } from 'lucide-react';
import type { GenerationResult } from '../../types';

interface VisualScoreBadgeProps {
  visualScore: NonNullable<GenerationResult['visualScore']>;
  onRegenerateByCategory?: (category: string, instruction: string) => void;
  isRegenerating?: boolean;
}

const BADGE_STYLES: Record<string, string> = {
  green: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  yellow: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
  red: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
};

const SCORE_KEYS = [
  'thumbStop',
  'brandFit',
  'textLegibility',
  'platformFit',
  'contentMatch',
  'subjectAccuracy',
  'offerMatch',
  'audienceMatch',
] as const;

type ScoreKey = (typeof SCORE_KEYS)[number];

const FIX_INSTRUCTIONS: Record<ScoreKey, string> = {
  thumbStop:
    'Increase visual contrast, use bolder colors and a more striking composition to maximize thumb-stop impact.',
  brandFit:
    'Align the visual style more closely with brand colors, tone, and aesthetic guidelines.',
  textLegibility:
    'Improve text legibility — use larger, clearer fonts with better contrast against the background.',
  platformFit:
    "Adjust composition and aspect ratio to better fit the platform's visual conventions and requirements.",
  contentMatch:
    'Ensure the image directly reflects the post content — show the correct subject, scene, and context.',
  subjectAccuracy:
    'Fix the main subject — show the correct product, person, or object as specified in the content intent.',
  offerMatch:
    'Make sure the image clearly conveys the offer, promotion, or value proposition from the post.',
  audienceMatch:
    'Adjust the visual tone and style to better resonate with the target audience.',
};

const LOW_SCORE_THRESHOLD = 70;

export const VisualScoreBadge: React.FC<VisualScoreBadgeProps> = ({
  visualScore,
  onRegenerateByCategory,
  isRegenerating,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!visualScore || visualScore.overall === 0) return null;

  const statusKey =
    visualScore.badge === 'green'
      ? 'resultCard.visualQa.statusGreen'
      : visualScore.badge === 'yellow'
        ? 'resultCard.visualQa.statusYellow'
        : 'resultCard.visualQa.statusRed';

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--hero-accent)] shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {t('resultCard.visualQa.title')}
          </span>
        </div>
        <span
          className={`text-xs font-black px-2.5 py-1 rounded-full border ${BADGE_STYLES[visualScore.badge] || BADGE_STYLES.red}`}
        >
          {visualScore.overall}/100
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400">{t(statusKey)}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
        {SCORE_KEYS.map((key) => {
          const value = visualScore[key];
          if (value === undefined) return null;
          const isLow = value < LOW_SCORE_THRESHOLD;
          return (
            <div
              key={key}
              className={`p-2 rounded-xl ${
                isLow
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40'
                  : 'bg-slate-50 dark:bg-slate-800/50'
              }`}
            >
              <p className="font-black text-slate-400 uppercase">
                {t(`resultCard.visualQa.dims.${key}`)}
              </p>
              <p
                className={`text-sm font-bold ${
                  isLow ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'
                }`}
              >
                {value}
              </p>
              {isLow && onRegenerateByCategory && (
                <button
                  type="button"
                  disabled={isRegenerating}
                  onClick={() => onRegenerateByCategory(key, FIX_INSTRUCTIONS[key])}
                  className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-40 transition-colors"
                >
                  <RefreshCwIcon className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                  {t('resultCard.visualQa.fix')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {visualScore.feedback.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {t('resultCard.visualQa.feedback')}
          </button>
          {expanded && (
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
              {visualScore.feedback.slice(0, 5).map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};
