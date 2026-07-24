import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trend, AppError } from '../types';
import { discoverTrends } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { PostIcon } from './icons/PostIcon';
import { QuoteIcon } from './icons/QuoteIcon';
import { HashIcon } from './icons/HashIcon';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from './ui/PageHeader';

interface TrendsViewProps {}

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-slate-400 hover:text-[var(--hero-accent)] hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-colors"
    >
      {copied ? (
        <span className="text-xs px-1" style={{ color: 'var(--hero-accent)' }}>
          Skopiowano!
        </span>
      ) : (
        <ClipboardIcon className="w-4 h-4" />
      )}
    </button>
  );
};

const TrendCard: React.FC<{ trend: Trend; onGenerate: () => void }> = ({ trend, onGenerate }) => (
  <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-[#0a1220]/80 backdrop-blur-xl p-6 sm:p-7 space-y-6 shadow-xl shadow-slate-900/5 hover:-translate-y-1 hover:shadow-2xl hover:border-sky-500/30 transition-all duration-300 animate-fade-in group">
    <div>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-sky-500 transition-colors">{trend.topic}</h3>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
          🔥 Wirusowy Trend
        </span>
      </div>
      <p className="mt-2.5 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{trend.summary}</p>
    </div>

    <div>
      <h4 className="font-bold text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 flex items-center gap-2 mb-2.5">
        <HashIcon className="w-3.5 h-3.5 text-sky-400" />
        Wschodzące hashtagi
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {trend.hashtags?.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-sky-400/50 transition cursor-default"
          >
            {`#${tag}`}
          </span>
        )) || <span className="text-sm text-slate-500">Brak dostępnych hashtagów</span>}
      </div>
    </div>

    <div>
      <h4 className="font-bold text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 flex items-center gap-2 mb-2.5">
        <LightbulbIcon className="w-3.5 h-3.5 text-amber-400" />
        Pytania od publiczności
      </h4>
      <ul className="space-y-2 text-sm">
        {trend.questions?.map((q) => (
          <li key={`question-${q.slice(0, 20)}`} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-white/[0.02] p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5">
            <span className="mt-0.5 text-sky-400 font-bold shrink-0">?</span>
            <span className="font-medium text-xs leading-relaxed">{q}</span>
          </li>
        )) || <li className="text-sm text-slate-500">Brak dostępnych pytań</li>}
      </ul>
    </div>

    <div>
      <h4 className="font-bold text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 flex items-center gap-2 mb-2.5">
        <QuoteIcon className="w-3.5 h-3.5 text-purple-400" />
        Kluczowe cytaty / Statystyki
      </h4>
      <div className="space-y-2 text-sm">
        {trend.quotes?.map((q) => (
          <div
            key={`quote-${q.slice(0, 20)}`}
            className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.03]"
          >
            <QuoteIcon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="flex-grow">
              <p className="italic text-xs font-medium text-slate-700 dark:text-slate-300">"{q}"</p>
            </div>
            <CopyButton textToCopy={q} />
          </div>
        )) || <div className="text-sm text-slate-500">Brak dostępnych cytatów</div>}
      </div>
    </div>

    <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-3">
      <button
        onClick={onGenerate}
        className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-5 rounded-xl bg-[var(--hero-accent)] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-sky-500/20 text-sm"
      >
        <PostIcon className="w-4 h-4" />
        Stwórz Post z tego Trendu
      </button>
    </div>
  </div>
);

export const TrendsView: React.FC<TrendsViewProps> = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [niche, setNiche] = useState('');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const onGenerateFromTrend = (topic: string, hashtags: string[]) => {
    const hashtagsText = hashtags.join(' ');
    const fullTopic = `${topic}\n\nSugerowane hashtagi: ${hashtagsText}`;
    navigate('/generator', { state: { prefillData: { topic: fullTopic } } });
  };

  const handleDiscover = async () => {
    if (!niche.trim() || !user) return;
    setIsLoading(true);
    setError(null);
    setTrends([]);
    try {
      if (!user) throw new Error('Musisz być zalogowany, aby wyszukiwać trendy.');
      const result = await discoverTrends(niche, user.id);
      setTrends(result);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Wystąpił nieznany błąd podczas wyszukiwania trendów.';
      const errorType = e instanceof Error && e.name === 'ApiError' ? 'api' : 'unknown';
      setError({ message: errorMessage, type: errorType });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleDiscover();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Research"
        title="Centrum Trendów AI"
        subtitle="Odkryj gorące tematy w swojej branży i twórz treści, które rezonują z publicznością."
      />

      <div className="p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70">
        <label htmlFor="niche-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Wprowadź swoją branżę, niszę lub główny temat
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            id="niche-input"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="np. zrównoważona moda, kawa speciality, marketing B2B"
            className="flex-grow w-full bg-white dark:bg-[#071018] border border-slate-300 dark:border-white/15 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--hero-accent)]/40 focus:border-[var(--hero-accent)] transition"
          />
          <button
            onClick={handleDiscover}
            disabled={isLoading || !niche.trim()}
            className="flex items-center justify-center gap-2 text-white font-semibold py-3 px-6 rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: 'var(--hero-accent)' }}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Analizowanie...
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                Odkryj trendy
              </>
            )}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error.message}</p>}
      </div>

      <div className="space-y-6">
        {!isLoading && trends.length === 0 && !error && (
          <div className="text-center py-12 px-4 text-slate-500 border border-dashed border-slate-200 dark:border-white/10">
            <p className="text-sm">Wyniki pojawią się tutaj.</p>
          </div>
        )}
        {trends.map((trend, index) => (
          <TrendCard
            key={trend.id || `trend-${index}-${trend.topic?.slice(0, 20) || 'unknown'}`}
            trend={trend}
            onGenerate={() => onGenerateFromTrend(trend.topic, trend.hashtags)}
          />
        ))}
      </div>
    </div>
  );
};
