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
import { History, RefreshCw, Wifi, Plus, Send, Zap } from 'lucide-react';
import { LivePulse } from './LivePulse';

// Components
import { QuickCommandBar } from './QuickCommandBar';
import { platformConfig } from '../config/platformConfig';
import { WeeklySummary } from './WeeklySummary';
import { SocialHistoryModal } from './SocialHistoryModal';
import { useNotifications } from '../hooks/useNotifications';
import { useAppHandlers } from '../hooks/useAppHandlers';

// Services & Types
import { getStrategicContentIdeas } from '../services/geminiService';
import type { StrategicIdea, Platform as PlatformType } from '../types';
import { Platform } from '../types';
import type { SocialConnection } from '../types/socialPublishing';
import { socialConnectionsService } from '../services/socialConnectionsService';
import { useUIStore } from '../stores/uiStore';

// Zustand stores
import { useDataStore } from '../stores/dataStore';

const StatCard: React.FC<{ icon: React.FC<any>, label: string, value: number | string, color: string, trend?: string, gradient: string }> = ({ icon: Icon, label, value, color, trend, gradient }) => (
    <div className={`p-8 rounded-[3rem] border border-white/20 dark:border-slate-800/50 flex flex-col gap-6 shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.02] hover:-translate-y-1 ${gradient}`}>
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${color} shadow-lg shadow-black/20 relative z-10`}>
            <Icon className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
        </div>

        <div className="relative z-10">
            <p className="text-6xl font-black text-white tracking-tighter drop-shadow-sm">{value}</p>
            <div className="flex items-center justify-between mt-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">{label}</p>
                {trend && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-white bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                        <Zap className="w-3 h-3 fill-current" />
                        {trend}
                    </span>
                )}
            </div>
        </div>
    </div>
);

const StrategyAssistant: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [ideas, setIdeas] = useState<StrategicIdea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [retryTrigger, setRetryTrigger] = useState(0);
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
    }, [niche, user, retryTrigger]);

    const onGenerateFromIdea = (topic: string) => {
        navigate('/generator', { state: { prefillData: { topic } } });
    };

    const IdeaTypeIcon: React.FC<{ type: StrategicIdea['type'] }> = ({ type }) => {
        switch (type) {
            case 'Trending': return <TrendingUpIcon className="w-5 h-5 text-green-500" />;
            case 'Content Gap': return <LightbulbIcon className="w-5 h-5 text-yellow-500" />;
            case 'Evergreen': return <SparklesIcon className="w-5 h-5 text-blue-500" />;
            default: return <SparklesIcon className="w-5 h-5 text-gray-500" />;
        }
    }

    return (
        <div className="p-8 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Asystent Strategiczny</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Wskazówki dla marki: <span className="text-blue-500">{niche}</span></p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center animate-bounce">
                    <SparklesIcon className="w-6 h-6 text-blue-500" />
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl animate-pulse">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                                <div className="space-y-2 flex-grow">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="p-8 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-[2rem] text-center">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => setRetryTrigger(prev => prev + 1)}
                        className="px-6 py-2.5 bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-500/20 inline-flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Spróbuj ponownie
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {ideas.map((idea, index) => (
                        <div key={index} className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] hover:border-blue-500 transition-all group">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110">
                                        <IdeaTypeIcon type={idea.type} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{idea.type}</span>
                                        </div>
                                        <h4 className="text-lg font-black text-slate-800 dark:text-white leading-tight uppercase tracking-tight">{idea.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed italic">"{idea.strategy}"</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onGenerateFromIdea(idea.title)}
                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-500/20"
                                >
                                    Stwórz
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const PLATFORM_ICONS: Record<string, string> = {
    facebook: '👥', instagram: '📸', linkedin: '💼', twitter: '𝕏', tiktok: '🎵'
};
const PLATFORM_NAMES: Record<string, string> = {
    facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', twitter: 'X (Twitter)', tiktok: 'TikTok'
};

const SocialMediaSection: React.FC = () => {
    const { user } = useAuth();
    const { setIsSocialConnectionsModalOpen } = useUIStore();
    const [connections, setConnections] = useState<SocialConnection[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<SocialConnection | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await socialConnectionsService.getConnections(user.id);
            setConnections(data);
        } catch (e) {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [user]);

    const openHistory = (conn: SocialConnection) => {
        setSelectedConnection(conn);
        setIsHistoryOpen(true);
    };

    return (
        <div className="glass p-8 rounded-[2.5rem] border border-white/10 dark:border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Wifi className="w-24 h-24 text-blue-500" />
            </div>

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Social Intelligence</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Publish: Active</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-blue-500 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsSocialConnectionsModalOpen(true)}
                        className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {connections.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-950/40 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 relative z-10">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/5">
                        <Wifi className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Brak połączeń</h4>
                    <p className="text-xs text-slate-500 max-w-[200px] mx-auto mb-6">Połącz konta, aby AI mogło publikować posty automatycznie.</p>
                    <button
                        onClick={() => setIsSocialConnectionsModalOpen(true)}
                        className="px-6 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition shadow-xl shadow-blue-500/20"
                    >
                        Konfiguruj Teraz
                    </button>
                </div>
            ) : (
                <div className="space-y-3 relative z-10">
                    {connections.map((conn) => (
                        <div
                            key={conn.id}
                            className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 hover:border-blue-400 transition-all shadow-sm hover:shadow-lg"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl shadow-sm relative overflow-hidden group-hover:scale-110 transition-transform">
                                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                                    <span className="relative z-10">{PLATFORM_ICONS[conn.platform]}</span>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{conn.accountName}</div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{PLATFORM_NAMES[conn.platform]}</div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => openHistory(conn)}
                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                                title="Historia"
                            >
                                <History className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {user && (
                <SocialHistoryModal
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    connection={selectedConnection}
                    userId={user.id}
                />
            )}
        </div>
    );
};


export const DashboardView: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const { history, scheduledPosts, stats, drafts } = useDataStore();
    const { setIsCommandPaletteOpen } = useUIStore();
    const notificationSystem = useNotifications();
    const handlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);

    if (!user) return null;

    const oneWeekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const scheduledThisWeek = scheduledPosts.filter(p => p.scheduleTimestamp <= oneWeekFromNow).length;

    return (
        <div className="space-y-12 animate-fade-in pb-12">
            <header className="relative py-20 px-12 bg-slate-900 dark:bg-black rounded-[4rem] overflow-hidden group border border-white/5 shadow-3xl">
                <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-l from-blue-600/30 via-indigo-600/10 to-transparent pointer-events-none" />
                <div className="absolute -right-40 -top-40 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute left-1/4 bottom-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[80px]" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                                System Online
                            </div>
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl">
                                <SparklesIcon className="w-4 h-4" />
                                AI v2.0
                            </div>
                        </div>
                        <h1 className="text-6xl lg:text-8xl font-black text-white tracking-tighter leading-none">
                            Witaj, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{user.name.split(' ')[0]}</span>.
                        </h1>
                        <p className="text-xl text-slate-300 max-w-2xl font-medium leading-relaxed opacity-90">
                            Twoja inteligencja społecznościowa czeka. Algorytmy przeanalizowały {stats?.totalGenerations || 0} postów i są gotowe na nowe wyzwania.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <button
                                onClick={() => navigate('/generator')}
                                className="px-8 py-4 bg-white text-slate-950 font-black uppercase tracking-widest rounded-[1.5rem] hover:bg-blue-50 transition-all shadow-xl shadow-white/5 flex items-center gap-3 active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                Nowy Projekt
                            </button>
                            <button
                                onClick={() => setIsCommandPaletteOpen(true)}
                                className="px-8 py-4 bg-white/10 border border-white/20 text-white font-black uppercase tracking-widest rounded-[1.5rem] hover:bg-white/20 transition-all backdrop-blur-xl flex items-center gap-3"
                            >
                                <Zap className="w-5 h-5" />
                                Quick Actions
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <QuickCommandBar />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <StatCard
                    icon={RocketLaunchIcon}
                    label="AI Generations"
                    value={stats?.totalGenerations || 0}
                    color="bg-blue-600"
                    trend="+12% today"
                    gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
                />
                <StatCard
                    icon={CalendarIcon}
                    label="Scheduled Postings"
                    value={scheduledThisWeek}
                    color="bg-purple-600"
                    trend="Automated"
                    gradient="bg-gradient-to-br from-purple-600 to-indigo-800"
                />
                <StatCard
                    icon={ClipboardDocumentListIcon}
                    label="Active Drafts"
                    value={drafts.length}
                    color="bg-emerald-600"
                    trend="Ready to Ship"
                    gradient="bg-gradient-to-br from-emerald-600 to-teal-800"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <WeeklySummary />
                    <StrategyAssistant />
                </div>
                <div className="lg:col-span-1 space-y-8">
                    <LivePulse />
                    <SocialMediaSection />

                    <div className="glass p-8 rounded-[2.5rem] border border-white/10 dark:border-slate-800 shadow-xl overflow-hidden relative group">
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-purple-500/10 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000" />

                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 uppercase tracking-tighter flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                                <CalendarIcon className="w-6 h-6 text-purple-500" />
                            </div>
                            Nadchodzące Posty
                        </h3>

                        {scheduledPosts.filter(p => p.status === 'scheduled').length > 0 ? (
                            <div className="space-y-4">
                                {scheduledPosts
                                    .filter(p => p.status === 'scheduled')
                                    .slice(0, 4)
                                    .map(post => {
                                        const config = platformConfig[post.formData?.platform || Platform.Facebook];
                                        return (
                                            <div key={post.id} className="group relative flex items-center gap-5 p-5 bg-white/50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-purple-400 transition-all shadow-sm hover:shadow-xl">
                                                <div className={`w-14 h-14 rounded-2xl ${config?.selectedBgColor || 'bg-slate-100'} flex items-center justify-center shrink-0 shadow-lg shadow-black/5 relative overflow-hidden`}>
                                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    {config && <config.icon className={`w-7 h-7 ${config.iconColor} relative z-10 group-hover:scale-110 transition-transform`} />}
                                                </div>
                                                <div className="min-w-0 flex-grow">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight" title={post.formData?.topic}>
                                                        {post.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-md">Automated</span>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 tabular-nums">
                                                            {new Date(post.scheduleTimestamp).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handlers.handlePublishNow(post.result, post.formData?.platform || 'Facebook')}
                                                    className="opacity-0 group-hover:opacity-100 w-10 h-10 flex items-center justify-center bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/30 transition-all hover:bg-purple-500 hover:scale-110 active:scale-90"
                                                    title="Publikuj teraz"
                                                >
                                                    <Send className="w-5 h-5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <ClockIcon className="w-8 h-8 text-slate-200" />
                                </div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Kolejka jest pusta</p>
                                <p className="text-[10px] text-slate-300 mt-2 uppercase">Zaplanuj swój pierwszy post</p>
                            </div>
                        )}
                    </div>

                    <div className="glass p-8 rounded-[2.5rem] border border-white/10 dark:border-slate-800 shadow-xl overflow-hidden relative group">
                        <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-blue-500/10 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000" />

                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 uppercase tracking-tighter flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                <ClockIcon className="w-6 h-6 text-blue-500" />
                            </div>
                            Ostatnie Dzieła
                        </h3>

                        {history.length > 0 ? (
                            <div className="space-y-4">
                                {history.slice(0, 4).map(item => {
                                    const platform = item.formData?.platform || Platform.Facebook;
                                    const config = platformConfig[platform];
                                    const Icon = config?.icon || PostIcon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => navigate('/generator', { state: { inspirationItem: item } })}
                                            className="w-full flex items-center gap-5 p-5 bg-white/50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-blue-400 transition-all text-left shadow-sm hover:shadow-xl group"
                                        >
                                            <div className={`w-14 h-14 rounded-2xl ${config?.selectedBgColor || 'bg-slate-100'} flex items-center justify-center shrink-0 shadow-lg shadow-black/5 relative overflow-hidden group-hover:rotate-6 transition-transform`}>
                                                <Icon className={`w-7 h-7 ${config?.iconColor || ''} relative z-10`} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight" title={item.formData?.topic}>
                                                    {item.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                                                </p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5 tabular-nums">
                                                    {new Date(item.timestamp).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Twoja historia jest pusta</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
