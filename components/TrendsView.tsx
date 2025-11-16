import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, Trend, AppError } from '../types';
import { discoverTrends } from '../services/geminiService';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { PostIcon } from './icons/PostIcon';
import { QuoteIcon } from './icons/QuoteIcon';
import { HashIcon } from './icons/HashIcon';
import { useAuth } from '../contexts/AuthContext';

interface TrendsViewProps {
  // Props will come from context
}

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
        <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            {copied ? <span className="text-xs px-1 text-blue-500">Skopiowano!</span> : <ClipboardIcon className="w-4 h-4" />}
        </button>
    );
};


const TrendCard: React.FC<{ trend: Trend; onGenerate: () => void }> = ({ trend, onGenerate }) => (
  <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md p-6 animate-fade-in space-y-5">
    <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{trend.topic}</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">{trend.summary}</p>
    </div>

    <div>
        <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2"><HashIcon className="w-4 h-4"/>Wschodzące hashtagi</h4>
        <div className="flex flex-wrap gap-2">
            {trend.hashtags.map(tag => (
                <span key={tag} className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full">{`#${tag}`}</span>
            ))}
        </div>
    </div>
    
    <div>
        <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2"><LightbulbIcon className="w-4 h-4"/>Pytania od publiczności</h4>
        <ul className="space-y-2 text-sm">
            {trend.questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="text-blue-500 mt-1">&bull;</span>
                    <span>{q}</span>
                </li>
            ))}
        </ul>
    </div>
    
    <div>
        <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2"><QuoteIcon className="w-4 h-4"/>Kluczowe cytaty / Statystyki</h4>
        <div className="space-y-2 text-sm">
            {trend.quotes.map((q, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
                    <QuoteIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    <div className="flex-grow">
                        <p className="italic text-gray-700 dark:text-gray-300">"{q}"</p>
                    </div>
                    <CopyButton textToCopy={q} />
                </div>
            ))}
        </div>
    </div>

    <div className="pt-4 border-t border-gray-200 dark:border-gray-700/50">
        <button
            onClick={onGenerate}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2.5 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
            <PostIcon className="w-5 h-5" />
            Wygeneruj post na ten temat
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
      const prefillData = {
          topic: fullTopic,
      };
      navigate('/generator', { state: { prefillData } });
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
    } catch (e: any) {
      setError({
        message: e.message || 'Wystąpił nieznany błąd podczas wyszukiwania trendów.',
        type: e.name === 'ApiError' ? 'api' : 'unknown'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleDiscover();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center">
        <TrendingUpIcon className="w-16 h-16 mx-auto text-blue-500 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Centrum Trendów AI</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
            Odkryj gorące tematy w swojej branży i twórz treści, które rezonują z Twoją publicznością.
        </p>
      </div>

      <div className="p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
        <label htmlFor="niche-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Wprowadź swoją branżę, niszę lub główny temat
        </label>
        <div className="flex flex-col sm:flex-row gap-4">
            <input
                type="text"
                id="niche-input"
                value={niche}
                onChange={e => setNiche(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="np. zrównoważona moda, kawa speciality, marketing B2B"
                className="flex-grow w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <button
                onClick={handleDiscover}
                disabled={isLoading || !niche.trim()}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analizowanie...
                    </>
                ) : (
                    <>
                        <SparklesIcon className="w-5 h-5"/>
                        Odkryj trendy
                    </>
                )}
            </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error.message}</p>}
      </div>

      <div className="space-y-8">
        {!isLoading && trends.length === 0 && !error && (
            <div className="text-center py-10 px-4 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
                <p>Wyniki pojawią się tutaj.</p>
            </div>
        )}
        {trends.map(trend => (
            <TrendCard 
                key={trend.id} 
                trend={trend} 
                onGenerate={() => onGenerateFromTrend(trend.topic, trend.hashtags)} 
            />
        ))}
      </div>
    </div>
  );
};