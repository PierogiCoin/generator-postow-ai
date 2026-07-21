import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  TrackedCompetitor,
  CompetitorAnalysis,
  fetchTrackedCompetitors,
  addTrackedCompetitor,
  removeTrackedCompetitor,
  analyzeCompetitor,
  updateCompetitorAnalysis,
  normalizeCompetitorHandle,
} from '../services/competitorService';
import {
  analyzeCompetitorBatch,
  type IntelligenceSource,
} from '../services/intelligenceService';
import { BatchCompetitorSummary, type BatchCompetitorResult } from './intelligence/BatchCompetitorSummary';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { showError, showSuccess, showWarning } from '../utils/errorHandler';
import { parseUserFacingError } from '../utils/userFacingError';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useNotifications } from '../hooks/useNotifications';
import { useDataStore } from '../stores/dataStore';
import { getUserNiche as getUserNicheShared } from '../utils/userNiche';
import { mapWithConcurrency } from '../utils/mapWithConcurrency';
import { UsersIcon } from './icons/UsersIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

const PLATFORMS = Object.values(Platform);
/** Limit API `/competitor-batch` — nie wysyłamy więcej w jednym requestcie. */
const BATCH_HANDLE_LIMIT = 8;
const DEEP_ANALYZE_CONCURRENCY = 2;

function mostCommon<T extends string>(values: T[], fallback: T): T {
  if (values.length === 0) return fallback;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function handlesMatch(a: string, b: string): boolean {
  return normalizeCompetitorHandle(a).toLowerCase() === normalizeCompetitorHandle(b).toLowerCase();
}

/** Lekka analiza karty z raportu grupowego — bez N osobnych wywołań deep. */
function analysisFromBatchSnippet(
  handle: string,
  batch: BatchCompetitorResult,
  sources?: IntelligenceSource[]
): CompetitorAnalysis {
  const per = batch.perCompetitor?.find((c) => handlesMatch(c.handle, handle));
  return {
    topHashtags: [],
    hashtagStrategy: '',
    hashtagPatterns: [],
    hashtagRecommendations: [],
    bestPostingTimes: batch.sharedPeakTimes || [],
    worstPostingTimes: [],
    timingGaps: batch.timingGaps || [],
    timingRecommendation: batch.recommendation || '',
    contentThemes: batch.contentGaps?.slice(0, 5) || [],
    strengths: [],
    weaknesses: per?.topWeakness ? [per.topWeakness] : [],
    opportunities: batch.opportunities || [],
    contentGaps: batch.contentGaps || [],
    summary: per?.summary || batch.recommendation || `Analiza grupowa @${normalizeCompetitorHandle(handle)}`,
    estimated: true,
    sources,
  };
}

const PLATFORM_COLORS: Record<Platform, string> = {
  [Platform.Instagram]: 'from-pink-500 to-purple-600',
  [Platform.TikTok]: 'from-slate-800 to-slate-600',
  [Platform.YouTube]: 'from-red-500 to-red-700',
  [Platform.Facebook]: 'from-blue-600 to-blue-800',
  [Platform.X]: 'from-slate-700 to-slate-900',
  [Platform.LinkedIn]: 'from-blue-500 to-blue-700',
};

const AnalysisBadge: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{label}</p>
    <p className="text-sm text-slate-800 dark:text-slate-200">{value}</p>
  </div>
);

const TagList: React.FC<{ tags: string[]; color?: string }> = ({ tags, color = 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' }) => (
  <div className="flex flex-wrap gap-1.5">
    {tags.map((tag, i) => (
      <span key={`tag-${tag}`} className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {tag}
      </span>
    ))}
  </div>
);

const BulletList: React.FC<{ items: string[]; icon?: string }> = ({ items, icon = '→' }) => (
  <ul className="space-y-1">
    {items.map((item, i) => (
      <li key={`item-${item.slice(0, 20)}`} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
        <span className="text-indigo-400 shrink-0">{icon}</span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const CompetitorCard: React.FC<{
  competitor: TrackedCompetitor;
  onAnalyze: (c: TrackedCompetitor) => void;
  onRemove: (id: string) => void;
  isAnalyzing: boolean;
}> = ({ competitor, onAnalyze, onRemove, isAnalyzing }) => {
  const [expanded, setExpanded] = useState(false);
  const gradient = PLATFORM_COLORS[competitor.platform] || 'from-slate-500 to-slate-700';
  const hasAnalysis = Boolean(competitor.analysis);
  const isEstimated = competitor.analysis?.estimated === true;
  const analyzeLabel = isAnalyzing
    ? 'Analizuję...'
    : hasAnalysis
      ? 'Odśwież'
      : 'Analizuj';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className={`bg-gradient-to-r ${gradient} p-4 flex items-center justify-between gap-3`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-bold text-lg truncate">@{competitor.handle}</p>
            {hasAnalysis && (
              <span
                className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                  isEstimated
                    ? 'bg-amber-400/90 text-amber-950'
                    : 'bg-emerald-400/90 text-emerald-950'
                }`}
                title={
                  isEstimated
                    ? 'Uproszczona analiza z raportu grupowego — uruchom pełną na karcie lub „Pełna analiza”'
                    : 'Pełna deep-analiza konta'
                }
              >
                {isEstimated ? 'Szacunkowa' : 'Pełna'}
              </span>
            )}
          </div>
          <p className="text-white/70 text-sm">{competitor.platform} · {competitor.niche}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onAnalyze(competitor)}
            disabled={isAnalyzing}
            aria-label={
              isAnalyzing
                ? 'Trwa analiza...'
                : hasAnalysis
                  ? `Odśwież analizę @${competitor.handle}`
                  : `Analizuj @${competitor.handle}`
            }
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <SparklesIcon className="w-4 h-4" />
            {analyzeLabel}
          </button>
          <button
            onClick={() => onRemove(competitor.id)}
            className="p-1.5 bg-white/10 hover:bg-red-500/40 text-white rounded-lg transition-colors"
            aria-label="Usuń konkurenta"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {competitor.analysis && (
        <div className="p-4 space-y-4">
          {isEstimated && (
            <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2">
              To skrót z raportu grupowego. Kliknij „Odśwież” albo „Pełna analiza”, żeby dostać hashtagi, godziny i mocne/słabe strony.
            </p>
          )}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3">
            <p className="text-sm text-indigo-800 dark:text-indigo-200">{competitor.analysis.summary}</p>
          </div>

          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Zwiń szczegóły' : 'Rozwiń szczegóły'}
          </button>

          {expanded && (
            <div className="space-y-5 pt-1">
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Hashtagi</h4>
                <TagList tags={competitor.analysis.topHashtags.slice(0, 10).map(h => `#${h}`)} />
                {competitor.analysis.hashtagStrategy && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{competitor.analysis.hashtagStrategy}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Najlepsze godziny postowania</h4>
                  <BulletList items={competitor.analysis.bestPostingTimes} icon="⏰" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Luki czasowe do wykorzystania</h4>
                  <BulletList items={competitor.analysis.timingGaps} icon="🎯" />
                </div>
              </div>

              {competitor.analysis.timingRecommendation && (
                <AnalysisBadge label="Twoja strategia czasowa" value={competitor.analysis.timingRecommendation} />
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tematy treści</h4>
                <TagList tags={competitor.analysis.contentThemes} color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">Ich mocne strony</h4>
                  <BulletList items={competitor.analysis.strengths} icon="✓" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-2">Ich słabości</h4>
                  <BulletList items={competitor.analysis.weaknesses} icon="✗" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Twoje szanse</h4>
                  <BulletList items={competitor.analysis.opportunities} icon="★" />
                </div>
              </div>

              {(competitor.analysis.contentGaps?.length ?? 0) > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Luki treści (nie poruszają)</h4>
                  <BulletList items={competitor.analysis.contentGaps!} icon="💡" />
                </div>
              )}

              {(competitor.analysis.recentNewsAngles?.length ?? 0) > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Aktualne newsy / kąty</h4>
                  <ul className="space-y-2">
                    {competitor.analysis.recentNewsAngles!.map((n) => (
                      <li key={n.title} className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium">{n.title}</span>
                        {n.angle && <span className="block text-xs text-slate-500 mt-0.5">{n.angle}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(competitor.analysis.sources?.length ?? 0) > 0 && (
                <p className="text-[10px] text-slate-400">
                  Źródła wyszukiwania: {competitor.analysis.sources!.slice(0, 3).map((s) => s.title).join(' · ')}
                </p>
              )}

              {competitor.analysis.hashtagRecommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Rekomendacje hashtagów dla Ciebie</h4>
                  <BulletList items={competitor.analysis.hashtagRecommendations} icon="→" />
                </div>
              )}
            </div>
          )}

          {competitor.lastAnalyzedAt && (
            <p className="text-xs text-slate-400 dark:text-slate-600">
              Ostatnia analiza: {new Date(competitor.lastAnalyzedAt).toLocaleString('pl-PL')}
            </p>
          )}
        </div>
      )}

      {!competitor.analysis && (
        <div className="p-4 text-center text-sm text-slate-400 dark:text-slate-600">
          Kliknij „Analizuj" aby wygenerować raport
        </div>
      )}
    </div>
  );
};

export const CompetitorTrackerPanel: React.FC = () => {
  const { user } = useAuth();
  const isMountedRef = useRef(true);
  const notificationSystem = useNotifications();
  const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);
  const { activeBrandVoiceId, isLearningStyle } = useDataStore();
  const { confirm, confirmDialogProps } = useConfirm();

  const [competitors, setCompetitors] = useState<TrackedCompetitor[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(() => new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  const [deepProgress, setDeepProgress] = useState<{ done: number; total: number } | null>(null);
  const [batchResult, setBatchResult] = useState<BatchCompetitorResult | null>(null);
  const [batchSources, setBatchSources] = useState<IntelligenceSource[]>([]);
  const [batchAnalyzedAt, setBatchAnalyzedAt] = useState<string | null>(null);

  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState<Platform>(Platform.Instagram);
  const [niche, setNiche] = useState('');
  const [showForm, setShowForm] = useState(false);

  const userId = user?.id;

  const loadCompetitors = useCallback(async () => {
    if (!userId) return;
    try {
      const list = await fetchTrackedCompetitors(userId);
      if (isMountedRef.current) setCompetitors(list);
    } catch {
      if (isMountedRef.current) setCompetitors([]);
    }
  }, [userId]);

  useEffect(() => {
    isMountedRef.current = true;
    loadCompetitors();
    return () => { isMountedRef.current = false; };
  }, [loadCompetitors]);

  useEffect(() => {
    if (!userId || niche.trim()) return;
    const storedNiche = getUserNicheShared(userId, '');
    if (storedNiche && storedNiche !== 'marketing') setNiche(storedNiche);
  }, [userId, niche]);

  const handleAdd = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedHandle = normalizeCompetitorHandle(handle);
    const trimmedNiche = niche.trim();

    if (!trimmedHandle || trimmedHandle.length < 2) {
      showWarning('Podaj poprawny handle (min. 2 znaki).');
      return;
    }
    if (!trimmedNiche) {
      showWarning('Podaj niszę konkurenta (np. fitness, moda).');
      return;
    }
    if (!userId) {
      showWarning('Zaloguj się, aby dodać konkurenta.');
      return;
    }

    setIsAdding(true);
    try {
      const newComp = await addTrackedCompetitor(trimmedHandle, platform, trimmedNiche, userId);
      if (isMountedRef.current) {
        await loadCompetitors();
        setHandle('');
        setShowForm(false);
        showSuccess(`Dodano @${newComp.handle}`, 'Kliknij „Analizuj”, aby wygenerować raport.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Nie udało się dodać konkurenta.';
      showWarning(message);
    } finally {
      if (isMountedRef.current) setIsAdding(false);
    }
  }, [handle, platform, niche, userId, loadCompetitors]);

  const handleRemove = useCallback(async (id: string) => {
    if (!userId) return;
    const target = competitors.find((c) => c.id === id);
    const label = target ? `@${target.handle}` : 'tego konkurenta';
    const ok = await confirm({
      title: 'Usuń konkurenta',
      message: `Na pewno usunąć ${label} ze śledzenia? Tej operacji nie można cofnąć.`,
      confirmLabel: 'Usuń',
      cancelLabel: 'Anuluj',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await removeTrackedCompetitor(id, userId);
      if (isMountedRef.current) await loadCompetitors();
    } catch (err: unknown) {
      showWarning(err instanceof Error ? err.message : 'Nie udało się usunąć konkurenta.');
    }
  }, [userId, competitors, confirm, loadCompetitors]);

  const handleAnalyze = useCallback(async (competitor: TrackedCompetitor) => {
    if (!userId) {
      showWarning('Zaloguj się, aby uruchomić analizę.');
      return;
    }
    const forceRefresh = Boolean(competitor.analysis);
    setAnalyzingIds((prev) => new Set(prev).add(competitor.id));
    try {
      const analysis = await analyzeCompetitor(
        competitor.handle,
        competitor.platform,
        competitor.niche,
        userId,
        { forceRefresh }
      );
      await updateCompetitorAnalysis(competitor.id, analysis, userId);
      if (isMountedRef.current) {
        await loadCompetitors();
        showSuccess(
          forceRefresh
            ? `Odświeżono pełną analizę @${competitor.handle}`
            : `Analiza @${competitor.handle} gotowa!`
        );
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const parsed = parseUserFacingError(err);
        showError(parsed.message, parsed.title);
      }
    } finally {
      if (isMountedRef.current) {
        setAnalyzingIds((prev) => {
          const next = new Set(prev);
          next.delete(competitor.id);
          return next;
        });
      }
    }
  }, [userId, loadCompetitors]);

  const handleBatchAnalyze = useCallback(async () => {
    if (!userId) {
      showWarning('Zaloguj się, aby uruchomić analizę.');
      return;
    }
    if (competitors.length === 0) {
      showWarning('Dodaj przynajmniej jednego konkurenta.');
      return;
    }

    const batchTargets = competitors.slice(0, BATCH_HANDLE_LIMIT);
    if (competitors.length > BATCH_HANDLE_LIMIT) {
      showWarning(
        `Raport grupowy obejmuje max ${BATCH_HANDLE_LIMIT} kont — użyto pierwszych ${BATCH_HANDLE_LIMIT}.`
      );
    }

    const platforms = batchTargets.map((c) => c.platform);
    const uniquePlatforms = new Set(platforms);
    const platformForBatch = mostCommon(platforms, Platform.Instagram);
    const nicheForBatch =
      niche.trim() || mostCommon(batchTargets.map((c) => c.niche.trim()).filter(Boolean), 'marketing');
    const handles = batchTargets.map((c) => c.handle);
    const forceRefresh = Boolean(batchResult);

    if (uniquePlatforms.size > 1) {
      showWarning(
        `Mieszane platformy — raport grupowy liczony dla dominanty: ${platformForBatch}. Pełną analizę per platforma: przycisk na karcie.`
      );
    }

    setIsBatchAnalyzing(true);
    try {
      const { batch, sources, analyzedAt } = await analyzeCompetitorBatch(
        handles,
        platformForBatch,
        nicheForBatch,
        userId,
        { forceRefresh }
      );
      const batchTyped = batch as BatchCompetitorResult;

      for (const comp of batchTargets) {
        const analysis = analysisFromBatchSnippet(comp.handle, batchTyped, sources);
        await updateCompetitorAnalysis(comp.id, analysis, userId);
      }

      if (isMountedRef.current) {
        setBatchResult(batchTyped);
        setBatchSources(sources || []);
        setBatchAnalyzedAt(analyzedAt || new Date().toISOString());
        await loadCompetitors();
        showSuccess(
          `Raport grupowy gotowy (${batchTargets.length} kont). Pełną analizę: „Pełna analiza” lub „Odśwież” na karcie.`
        );
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const parsed = parseUserFacingError(err);
        showError(parsed.message, parsed.title);
      }
    } finally {
      if (isMountedRef.current) setIsBatchAnalyzing(false);
    }
  }, [userId, competitors, niche, batchResult, loadCompetitors]);

  const handleDeepAnalyzeAll = useCallback(async () => {
    if (!userId) {
      showWarning('Zaloguj się, aby uruchomić analizę.');
      return;
    }
    if (competitors.length === 0) {
      showWarning('Dodaj przynajmniej jednego konkurenta.');
      return;
    }

    const ok = await confirm({
      title: 'Pełna analiza wszystkich',
      message: `Uruchomić deep-analizę dla ${competitors.length} kont (kolejka po ${DEEP_ANALYZE_CONCURRENCY})? Zużywa kredyty osobno dla każdego konta. Cache zostanie pominięty przy ponownej analizie.`,
      confirmLabel: 'Uruchom',
      cancelLabel: 'Anuluj',
    });
    if (!ok) return;

    setIsDeepAnalyzing(true);
    setDeepProgress({ done: 0, total: competitors.length });
    let successCount = 0;
    let failCount = 0;

    try {
      await mapWithConcurrency(competitors, DEEP_ANALYZE_CONCURRENCY, async (competitor) => {
        if (!isMountedRef.current) return;
        setAnalyzingIds((prev) => new Set(prev).add(competitor.id));
        try {
          const analysis = await analyzeCompetitor(
            competitor.handle,
            competitor.platform,
            competitor.niche,
            userId,
            { forceRefresh: Boolean(competitor.analysis) }
          );
          await updateCompetitorAnalysis(competitor.id, analysis, userId);
          successCount += 1;
        } catch {
          failCount += 1;
        } finally {
          if (isMountedRef.current) {
            setAnalyzingIds((prev) => {
              const next = new Set(prev);
              next.delete(competitor.id);
              return next;
            });
            setDeepProgress((prev) =>
              prev ? { ...prev, done: Math.min(prev.total, prev.done + 1) } : prev
            );
          }
        }
      });

      if (isMountedRef.current) {
        await loadCompetitors();
        if (failCount === 0) {
          showSuccess(`Pełna analiza gotowa: ${successCount}/${competitors.length}`);
        } else {
          showWarning(`Ukończono ${successCount}, błędy: ${failCount}. Sprawdź konta i spróbuj ponownie.`);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsDeepAnalyzing(false);
        setDeepProgress(null);
        setAnalyzingIds(new Set());
      }
    }
  }, [userId, competitors, confirm, loadCompetitors]);

  const analyzedCount = competitors.filter((c) => c.analysis).length;
  const estimatedCount = competitors.filter((c) => c.analysis?.estimated === true).length;
  const busy = isBatchAnalyzing || isDeepAnalyzing || analyzingIds.size > 0;

  const handleApplyToBrandVoice = useCallback(async () => {
    if (analyzedCount === 0) {
      showWarning('Najpierw przeanalizuj przynajmniej jednego konkurenta.');
      return;
    }
    await appHandlers.handleLearnFromCompetitors(activeBrandVoiceId, batchResult);
  }, [analyzedCount, appHandlers, activeBrandVoiceId, batchResult]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <ConfirmDialog {...confirmDialogProps} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--hero-accent)' }}
          >
            Intelligence
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Śledzenie Konkurencji
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Analizuj hashtagi, godziny i strategie treści
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          {analyzedCount > 0 && (
            <button
              type="button"
              onClick={() => void handleApplyToBrandVoice()}
              disabled={isLearningStyle || busy}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <IdentificationIcon className="w-4 h-4" />
              {isLearningStyle ? 'Aktualizuję Brand Voice…' : 'Zastosuj do Brand Voice'}
            </button>
          )}
          {competitors.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => void handleBatchAnalyze()}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                title="Jeden raport porównawczy grupy (lekkie karty)"
              >
                <UsersIcon className="w-4 h-4" />
                {isBatchAnalyzing
                  ? 'Raport grupowy…'
                  : batchResult
                    ? 'Odśwież raport grupowy'
                    : 'Raport grupowy'}
              </button>
              <button
                type="button"
                onClick={() => void handleDeepAnalyzeAll()}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                title="Pełna deep-analiza każdego konta (kolejka)"
              >
                <SparklesIcon className="w-4 h-4" />
                {isDeepAnalyzing && deepProgress
                  ? `Pełna analiza ${deepProgress.done}/${deepProgress.total}`
                  : estimatedCount > 0
                    ? `Pełna analiza (${estimatedCount} szac.)`
                    : 'Pełna analiza'}
              </button>
            </>
          )}
          <button
            onClick={() => setShowForm(v => !v)}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-800 dark:text-slate-100 text-sm font-semibold rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Dodaj konkurenta
          </button>
        </div>
      </div>

      {isDeepAnalyzing && deepProgress && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-indigo-900 dark:text-indigo-200 mb-2">
            <span>Pełna analiza w kolejce (max {DEEP_ANALYZE_CONCURRENCY} naraz)</span>
            <span className="font-semibold">
              {deepProgress.done}/{deepProgress.total}
            </span>
          </div>
          <div className="h-2 rounded-full bg-indigo-200/70 dark:bg-indigo-900 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${Math.round((deepProgress.done / Math.max(1, deepProgress.total)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {batchResult && (
        <div className="space-y-3">
          <BatchCompetitorSummary
            batch={batchResult}
            sources={batchSources}
            analyzedAt={batchAnalyzedAt || undefined}
          />
          <button
            type="button"
            onClick={() => void handleApplyToBrandVoice()}
            disabled={isLearningStyle}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <IdentificationIcon className="w-5 h-5" />
            Zastosuj raport grupowy + analizy do Brand Voice
          </button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm"
        >
          <h3 className="font-semibold text-slate-800 dark:text-white">Nowy konkurent</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              placeholder="@handle lub nazwa"
              autoFocus
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value as Platform)}
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PLATFORMS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="Nisza (np. fitness, moda)"
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors"
            >
              {isAdding ? 'Dodawanie...' : 'Dodaj'}
            </button>
          </div>
        </form>
      )}

      {/* Competitor list */}
      {competitors.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-600">
          <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Brak śledzonych konkurentów</p>
          <p className="text-sm mt-1">Dodaj pierwszego konkurenta, aby zacząć analizę</p>
        </div>
      ) : (
        <div className="space-y-4">
          {competitors.map(comp => (
            <CompetitorCard
              key={comp.id}
              competitor={comp}
              onAnalyze={handleAnalyze}
              onRemove={handleRemove}
              isAnalyzing={analyzingIds.has(comp.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
