import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Platform } from '../../types';
import {
  scorePostContent,
  buildAutoFixPrompt,
  AUTO_PUBLISH_MIN_SCORE,
  type ContentScore,
} from '../../services/contentScoringService';
import { ModernButton } from '../ui/ModernButton';

interface QualityGatePanelProps {
  postText: string;
  platform: Platform;
  userId?: string;
  hashtags?: string[];
  audience?: string;
  isBusy?: boolean;
  onAutoFix: (feedbackPrompt: string) => Promise<void>;
}

const BADGE_STYLES: Record<ContentScore['badge'], string> = {
  green: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  yellow: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
  red: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
};

const MIN_CHARS = 60;

export const QualityGatePanel: React.FC<QualityGatePanelProps> = ({
  postText,
  platform,
  userId,
  hashtags = [],
  audience,
  isBusy,
  onAutoFix,
}) => {
  const { t } = useTranslation();
  const [score, setScore] = useState<ContentScore | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const lastScoredRef = useRef<string>('');

  const runScore = useCallback(async () => {
    if (!userId || postText.trim().length < MIN_CHARS || isBusy) return;

    const key = `${postText.length}:${postText.slice(0, 120)}`;
    if (lastScoredRef.current === key && score) return;

    setIsScoring(true);
    setError(null);
    try {
      const result = await scorePostContent(postText, platform, userId, {
        hasHashtags: hashtags.length > 0 || postText.includes('#'),
        hasEmojis: /[\u{1F300}-\u{1FAFF}]/u.test(postText),
        targetAudience: audience,
      });
      setScore(result);
      lastScoredRef.current = key;
      if (result.badge === 'red') setExpanded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('resultCard.qualityGate.error', 'Błąd oceny'));
      setScore(null);
    } finally {
      setIsScoring(false);
    }
  }, [userId, postText, platform, hashtags, audience, isBusy, score, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void runScore();
    }, 1200);
    return () => clearTimeout(timer);
  }, [postText, platform, userId, isBusy]);

  useEffect(() => {
    if (isBusy) {
      lastScoredRef.current = '';
    }
  }, [isBusy]);

  const handleAutoFix = async () => {
    if (!score) return;
    setIsFixing(true);
    try {
      await onAutoFix(buildAutoFixPrompt(score));
      lastScoredRef.current = '';
      setScore(null);
    } finally {
      setIsFixing(false);
    }
  };

  if (postText.trim().length < MIN_CHARS) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {t('resultCard.qualityGate.title', 'Brama jakości')}
          </span>
          {isScoring && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
        </div>

        {score && !isScoring && (
          <span
            className={`text-xs font-black px-2.5 py-1 rounded-full border ${BADGE_STYLES[score.badge]}`}
          >
            {score.overall}/100
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {score && (
        <>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {score.badge === 'green'
              ? t('resultCard.qualityGate.ready', 'Post gotowy do publikacji.')
              : score.badge === 'yellow'
                ? t('resultCard.qualityGate.improve', 'Kilka poprawek zwiększy zasięg.')
                : t('resultCard.qualityGate.weak', 'Warto poprawić przed publikacją.')}
          </p>

          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="font-black text-slate-400 uppercase">Engagement</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{score.engagement.score}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="font-black text-slate-400 uppercase">SEO</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{score.seo.score}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="font-black text-slate-400 uppercase">Platforma</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{score.platformFit.score}</p>
            </div>
          </div>

          {(score.suggestions.length > 0 || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {t('resultCard.qualityGate.suggestions', 'Sugestie')}
            </button>
          )}

          {expanded && score.suggestions.length > 0 && (
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
              {score.suggestions.slice(0, 5).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}

          {score.overall < AUTO_PUBLISH_MIN_SCORE && (
            <ModernButton
              type="button"
              variant="secondary"
              size="sm"
              fullWidth
              disabled={isFixing || isBusy || isScoring}
              onClick={() => void handleAutoFix()}
              icon={
                isFixing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )
              }
            >
              {isFixing
                ? t('resultCard.qualityGate.fixing', 'Poprawianie…')
                : t('resultCard.qualityGate.autoFix', 'Popraw automatycznie')}
            </ModernButton>
          )}
        </>
      )}
    </div>
  );
};
