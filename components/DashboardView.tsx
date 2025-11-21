import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

// Icons
import { PostIcon } from './icons/PostIcon';
import { ClockIcon } from './icons/ClockIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { LinkIcon } from './icons/LinkIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { RocketLaunchIcon } from './icons/RocketLaunchIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { CalendarIcon } from './icons/CalendarIcon';

// Components
import { QuickCommandBar } from './QuickCommandBar';
import { platformConfig } from '../config/platformConfig';
import { WeeklySummary } from './WeeklySummary';

// Services & Types
import { getStrategicContentIdeas } from '../services/geminiService';
import type { StrategicIdea } from '../types';

// Zustand stores
import { useDataStore } from '../stores/dataStore';

const StatCard: React.FC<{ icon: React.FC<any>, label: string, value: number | string, color: string }> = ({ icon: Icon, label, value, color }) => (
    <div className="glass p-6 rounded-2xl flex items-center gap-4 card-hover animate-scale-in">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
        </div>
        <div>
            <p className="text-4xl font-bold gradient-text">{value}</p>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1">{label}</p>
        </div>
    </div>
);

const StrategyAssistant: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [ideas, setIdeas] = useState<StrategicIdea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const niche = localStorage.getItem('userNiche') || 'zrównoważona moda';

    useEffect(() => {
        const fetchIdeas = async () => {
            if (!user) return;
            setIsLoading(true);
            setError(null);
                try {
                const result = await getStrategicContentIdeas(niche, undefined, user.id);
                setIdeas(result);
            } catch (e: any) {
                setError(e.message || "Nie udało się pobrać strategicznych pomysłów.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchIdeas();
    }, [niche, user]);

    const onGenerateFromIdea = (topic: string) => {
        navigate('/generator', { state: { prefillData: { topic } } });
    };
    
    const IdeaTypeIcon: React.FC<{type: StrategicIdea['type']}> = ({type}) => {
        switch(type) {
            case 'Trending': return <TrendingUpIcon className="w-5 h-5 text-green-500" />;
            case 'Content Gap': return <LightbulbIcon className="w-5 h-5 text-yellow-500" />;
            case 'Evergreen': return <SparklesIcon className="w-5 h-5 text-blue-500" />;
            default: return <SparklesIcon className="w-5 h-5 text-gray-500" />;
        }
    }

    return (
        <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
             <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Inteligentny Asystent Strategiczny</h3>
             {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 mb-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mt-1"></div>
                </div>
             ))}
             {error && <p className="text-sm text-red-500">{error}</p>}
             {!isLoading && !error && ideas.length > 0 && (
                <div className="space-y-4">
                    {ideas.map((idea, index) => (
                        <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                           <div className="flex justify-between items-start gap-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <IdeaTypeIcon type={idea.type} />
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{idea.type}</span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800 dark:text-white">{idea.title}</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">"{idea.strategy}"</p>
                                </div>
                                <button onClick={() => onGenerateFromIdea(idea.title)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition">
                                    <PostIcon className="w-4 h-4" />
                                    Stwórz
                                </button>
                           </div>
                           {idea.sources && idea.sources.length > 0 && (
                               <details className="mt-3">
                                   <summary className="text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer">Pokaż źródła</summary>
                                   <div className="mt-2 space-y-1 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                                       {idea.sources.map((source, i) => (
                                           <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                               <LinkIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                               <span className="truncate" title={source.title}>{source.title}</span>
                                           </a>
                                       ))}
                                   </div>
                               </details>
                           )}
                        </div>
                    ))}
                </div>
             )}
        </div>
    );
};


export const DashboardView: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation();
    
    const { history, scheduledPosts, stats, drafts } = useDataStore();

    if (!user) return null;

    const oneWeekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const scheduledThisWeek = scheduledPosts.filter(p => p.scheduleTimestamp <= oneWeekFromNow).length;

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Witaj, {user.name}!</h1>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Oto Twoje centrum dowodzenia. Co dzisiaj tworzymy?</p>
            </div>

            <QuickCommandBar />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon={RocketLaunchIcon} label="Wygenerowanych treści" value={stats?.totalGenerations || 0} color="bg-blue-500" />
                <StatCard icon={CalendarIcon} label="Zaplanowane w tym tyg." value={scheduledThisWeek} color="bg-purple-500" />
                <StatCard icon={ClipboardDocumentListIcon} label="Zapisanych szkiców" value={drafts.length} color="bg-green-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <WeeklySummary />
                    <StrategyAssistant />
                </div>
                <div className="lg:col-span-1 space-y-8">
                    <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Następne w kolejce</h3>
                         {scheduledPosts.length > 0 ? (
                            <div className="space-y-3">
                                {scheduledPosts.slice(0, 3).map(post => {
                                    const config = platformConfig[post.formData.platform];
                                    return (
                                        <div key={post.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                            <config.icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0`} />
                                            <div>
                                                <p className="text-sm font-medium text-slate-800 dark:text-white truncate" title={post.formData.topic.replace(/<[^>]*>?/gm, '')}>{post.formData.topic.replace(/<[^>]*>?/gm, '')}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(post.scheduleTimestamp).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Brak zaplanowanych postów.</p>
                        )}
                    </div>

                    <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Ostatnia aktywność</h3>
                        {history.length > 0 ? (
                            <div className="space-y-3">
                                {history.slice(0, 3).map(item => {
                                    const config = platformConfig[item.formData.platform];
                                    const Icon = config?.icon || PostIcon;
                                    return (
                                        <button key={item.id} onClick={() => navigate('/generator', { state: { inspirationItem: item } })} className="w-full p-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                                            <div className={`w-10 h-10 rounded-md ${config?.selectedBgColor || ''} flex items-center justify-center shrink-0`}>
                                                <Icon className={`w-5 h-5 ${config?.iconColor || ''}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate" title={item.formData.topic.replace(/<[^>]*>?/gm, '')}>{item.formData.topic.replace(/<[^>]*>?/gm, '')}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Brak historii. Wygeneruj swój pierwszy post!</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
