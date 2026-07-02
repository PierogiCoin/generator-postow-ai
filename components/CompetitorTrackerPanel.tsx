import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  TrackedCompetitor,
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
import { showError, showSuccess, showWarning } from '../utils/errorHandler';
import { parseUserFacingError } from '../utils/userFacingError';
import { UsersIcon } from './icons/UsersIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

const PLATFORMS = Object.values(Platform);

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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className={`bg-gradient-to-r ${gradient} p-4 flex items-center justify-between`}>
        <div>
          <p className="text-white font-bold text-lg">@{competitor.handle}</p>
          <p className="text-white/70 text-sm">{competitor.platform} · {competitor.niche}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAnalyze(competitor)}
            disabled={isAnalyzing}
            aria-label={isAnalyzing ? 'Trwa analiza...' : `Analizuj @${competitor.handle}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <SparklesIcon className="w-4 h-4" />
            {isAnalyzing ? 'Analizuję...' : 'Analizuj'}
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

  const [competitors, setCompetitors] = useState<TrackedCompetitor[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
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
    const storedNiche =
      localStorage.getItem(`userNiche_${userId}`) ||
      localStorage.getItem('userNiche') ||
      '';
    if (storedNiche) setNiche(storedNiche);
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
    try {
      await removeTrackedCompetitor(id, userId);
      if (isMountedRef.current) await loadCompetitors();
    } catch (err: unknown) {
      showWarning(err instanceof Error ? err.message : 'Nie udało się usunąć konkurenta.');
    }
  }, [userId, loadCompetitors]);

  const handleAnalyze = useCallback(async (competitor: TrackedCompetitor) => {
    if (!userId) {
      showWarning('Zaloguj się, aby uruchomić analizę.');
      return;
    }
    setAnalyzingId(competitor.id);
    try {
      const analysis = await analyzeCompetitor(
        competitor.handle,
        competitor.platform,
        competitor.niche,
        userId
      );
      await updateCompetitorAnalysis(competitor.id, analysis, userId);
      if (isMountedRef.current) {
        await loadCompetitors();
        showSuccess(`Analiza @${competitor.handle} gotowa!`);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const parsed = parseUserFacingError(err);
        showError(parsed.message, parsed.title);
      }
    } finally {
      if (isMountedRef.current) setAnalyzingId(null);
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

    const nicheForBatch = niche.trim() || competitors[0]?.niche || 'marketing';
    const platformForBatch = competitors[0]?.platform || Platform.Instagram;
    const handles = competitors.map((c) => c.handle);

    setIsBatchAnalyzing(true);
    try {
      const [{ batch, sources, analyzedAt }, ...individualResults] = await Promise.all([
        analyzeCompetitorBatch(handles, platformForBatch, nicheForBatch, userId),
        ...competitors.map((c) =>
          analyzeCompetitor(c.handle, c.platform, c.niche, userId).then((analysis) => ({
            id: c.id,
            analysis,
          }))
        ),
      ]);

      for (const result of individualResults) {
        if (result && 'id' in result && result.analysis) {
          await updateCompetitorAnalysis(result.id, result.analysis, userId);
        }
      }

      if (isMountedRef.current) {
        setBatchResult(batch as BatchCompetitorResult);
        setBatchSources(sources || []);
        setBatchAnalyzedAt(analyzedAt || new Date().toISOString());
        await loadCompetitors();
        showSuccess(`Przeanalizowano ${competitors.length} konkurentów + raport grupowy.`);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const parsed = parseUserFacingError(err);
        showError(parsed.message, parsed.title);
      }
    } finally {
      if (isMountedRef.current) setIsBatchAnalyzing(false);
    }
  }, [userId, competitors, niche, loadCompetitors]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <UsersIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Śledzenie Konkurencji</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Analizuj hashtagi, godziny i strategie treści</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {competitors.length > 0 && (
            <button
              type="button"
              onClick={handleBatchAnalyze}
              disabled={isBatchAnalyzing || analyzingId !== null}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <SparklesIcon className="w-4 h-4" />
              {isBatchAnalyzing ? 'Analizuję wszystkich…' : 'Analizuj wszystkich'}
            </button>
          )}
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Dodaj konkurenta
          </button>
        </div>
      </div>

      {batchResult && (
        <BatchCompetitorSummary
          batch={batchResult}
          sources={batchSources}
          analyzedAt={batchAnalyzedAt || undefined}
        />
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
              isAnalyzing={analyzingId === comp.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
