import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { recordActivity, getStreakData } from '../services/streakService';

// Components
import { QuickCommandBar } from './QuickCommandBar';
import { platformConfig } from '../config/platformConfig';
import { WeeklySummary } from './WeeklySummary';
import { SocialHistoryModal } from './SocialHistoryModal';
import { useNotifications } from '../hooks/useNotifications';
import { useAppHandlers } from '../hooks/useAppHandlers';

// Services & Types
import { getStrategicContentIdeas } from '../services/geminiService';
import { getUserNiche } from '../utils/userNiche';
import type { StrategicIdea, Platform as PlatformType } from '../types';
import { Platform, NotificationType } from '../types';
import type { SocialConnection } from '../types/socialPublishing';
import { socialConnectionsService } from '../services/socialConnectionsService';
import { useUIStore } from '../stores/uiStore';
import { OnboardingChecklist } from './OnboardingChecklist';
import { TrialBanner } from './TrialBanner';
import { ReferralCard } from './ReferralCard';
import { ApprovalQueuePanel } from './ApprovalQueuePanel';
import { EngagementInboxPanel } from './EngagementInboxPanel';
import { RssToPostPanel } from './RssToPostPanel';
import { loadAutoPublishPrefs } from '../utils/autoPublishPrefs';

// Zustand stores
import { useDataStore } from '../stores/dataStore';

const StatCard: React.FC<{
    icon: React.ComponentType<{ className?: string }>,
    label: string,
    value: number | string,
    color: string,
    trend?: string,
    glowClass: string,
    iconColor: string
}> = ({ icon: Icon, label, value, color, trend, glowClass, iconColor }) => (
    <div className={`p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border-slate-200/50 dark:border-white/5 flex flex-col gap-4 lg:gap-6 shadow-2xl relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${glowClass}`}>
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-black/5 relative z-10 border border-slate-200/20 dark:border-white/10`}>
            <Icon className={`w-7 h-7 ${iconColor} group-hover:scale-110 transition-transform`} />
        </div>

        <div className="relative z-10">
            <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
            <div className="flex items-center justify-between mt-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
                {trend && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 px-3 py-1 rounded-full">
                        <Zap className="w-3 h-3 fill-current text-amber-500" />
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
    const niche = getUserNiche(user?.id);

    useEffect(() => {
        const fetchIdeas = async () => {
            if (!user) return;
            setIsLoading(true);
            setError(null);
            try {
                const result = await getStrategicContentIdeas(niche, undefined, user.id);
                setIdeas(result);
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Nie udało się pobrać strategicznych pomysłów.");
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
            case 'Trending': return <TrendingUpIcon className="w-5 h-5 text-emerald-500" />;
            case 'Content Gap': return <LightbulbIcon className="w-5 h-5 text-amber-500" />;
            case 'Evergreen': return <SparklesIcon className="w-5 h-5 text-cyan-500" />;
            default: return <SparklesIcon className="w-5 h-5 text-slate-500" />;
        }
    }

    return (
        <div className="glass-premium p-6 lg:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-cyan-500/10 rounded-full blur-[60px]" />
            
            <div className="flex items-center justify-between mb-6 lg:mb-8 relative z-10">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Asystent Strategiczny</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Wskazówki dla marki: <span className="text-cyan-500">{niche}</span></p>
                </div>
                <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                    <SparklesIcon className="w-6 h-6 text-cyan-500" />
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4 relative z-10">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={`skeleton-${i}`} className="p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 rounded-3xl animate-pulse">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl flex-shrink-0" />
                                <div className="space-y-2 flex-grow min-w-0">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="p-8 bg-red-500/5 border border-red-500/20 rounded-3xl text-center relative z-10">
                    <p className="text-sm font-bold text-red-500 dark:text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => setRetryTrigger(prev => prev + 1)}
                        className="px-6 py-2.5 bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-red-600 transition shadow-lg inline-flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Spróbuj ponownie
                    </button>
                </div>
            ) : (
                <div className="space-y-4 relative z-10">
                    {ideas.map((idea, index) => (
                        <div key={`idea-${index}`} className="p-5 bg-white/40 dark:bg-slate-950/20 border border-slate-200/50 dark:border-white/5 rounded-3xl hover:border-cyan-500/50 transition-all group shadow-sm hover:shadow-md">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-white/5 transition-transform group-hover:scale-115">
                                        <IdeaTypeIcon type={idea.type} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-500">{idea.type}</span>
                                        </div>
                                        <h4 className="text-base font-bold text-slate-800 dark:text-white leading-tight">{idea.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed italic">"{idea.strategy}"</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onGenerateFromIdea(idea.title)}
                                    className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-cyan-500 hover:text-white transition duration-300"
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
    const { t } = useTranslation();
    const { user } = useAuth();
    const { setIsSocialConnectionsModalOpen } = useUIStore();
    const [connections, setConnections] = useState<SocialConnection[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<SocialConnection | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [autoPublishOn, setAutoPublishOn] = useState(false);

    const load = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await socialConnectionsService.getConnections(user.id);
            setConnections(data);
            setAutoPublishOn(Boolean(loadAutoPublishPrefs().autoPublishToConnected));
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
        <div className="glass-premium p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                <Wifi className="w-24 h-24 text-cyan-500" />
            </div>

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('dashboard.social.title', 'Social Intelligence')}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          connections.length > 0 && autoPublishOn
                            ? 'bg-emerald-500 animate-pulse'
                            : connections.length > 0
                              ? 'bg-cyan-500'
                              : 'bg-slate-400'
                        }`} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {connections.length === 0
                                ? t('dashboard.social.noConnections', 'Brak połączonych kont')
                                : autoPublishOn
                                  ? t('dashboard.social.autoPublishActive', 'Auto-publikacja: włączona')
                                  : t('dashboard.social.connectedOnly', 'Konta połączone · auto-publikacja wyłączona')}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-cyan-500 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsSocialConnectionsModalOpen(true)}
                        className="w-8 h-8 flex items-center justify-center bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition shadow-md"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {connections.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-950/20 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/5 relative z-10">
                    <div className="w-16 h-16 bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow">
                        <Wifi className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-1">Brak połączeń</h4>
                    <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto mb-4">Połącz konta, aby AI mogło publikować posty automatycznie.</p>
                    <button
                        onClick={() => setIsSocialConnectionsModalOpen(true)}
                        className="px-5 py-2 bg-cyan-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-cyan-600 transition shadow-md"
                    >
                        Konfiguruj Teraz
                    </button>
                </div>
            ) : (
                <div className="space-y-3 relative z-10">
                    {connections.map((conn) => (
                        <div
                            key={conn.id}
                            className="group flex items-center justify-between p-4 bg-white/40 dark:bg-slate-950/20 rounded-2xl border border-slate-200/50 dark:border-white/5 hover:border-cyan-500/50 transition-all shadow-sm"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-200/50 dark:border-white/5 group-hover:scale-110 transition-transform">
                                    <span>{PLATFORM_ICONS[conn.platform]}</span>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight">{conn.accountName}</div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                        <div className="text-[9px] font-bold text-cyan-500 uppercase tracking-widest">{PLATFORM_NAMES[conn.platform]}</div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => openHistory(conn)}
                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition"
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
    const [searchParams, setSearchParams] = useSearchParams();

    const { history, scheduledPosts, stats, drafts } = useDataStore();
    const { setIsCommandPaletteOpen } = useUIStore();
    const notificationSystem = useNotifications();
    const handlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);

    const [streak, setStreak] = React.useState(() => getStreakData());

    useEffect(() => {
        if (user) {
            const updated = recordActivity();
            setStreak(updated);
        }
    }, [user]);

    useEffect(() => {
        const socialSuccess = searchParams.get('socialSuccess');
        const socialError = searchParams.get('socialError');
        const platform = searchParams.get('platform');

        if (socialSuccess === 'true') {
            notificationSystem.addToast(
                platform
                    ? `Połączono konto ${platform}!`
                    : 'Konto social zostało połączone!',
                NotificationType.Success
            );
            searchParams.delete('socialSuccess');
            searchParams.delete('platform');
            setSearchParams(searchParams, { replace: true });
        } else if (socialError) {
            notificationSystem.addToast(
                decodeURIComponent(socialError),
                NotificationType.Error
            );
            searchParams.delete('socialError');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams, notificationSystem]);

    if (!user) return null;

    const oneWeekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const scheduledThisWeek = scheduledPosts.filter(p => p.scheduleTimestamp <= oneWeekFromNow).length;

    return (
        <div className="space-y-8 animate-fade-in pb-16">
            <TrialBanner />
            <header className="relative py-16 px-8 md:px-12 glass-premium rounded-[3rem] overflow-hidden border border-slate-200/50 dark:border-white/10 shadow-2xl">
                <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-l from-cyan-500/10 via-fuchsia-500/5 to-transparent pointer-events-none" />
                <div className="absolute -right-40 -top-40 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
                <div className="absolute left-1/4 bottom-0 w-80 h-80 bg-fuchsia-500/5 rounded-full blur-[90px]" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 rounded-full text-slate-700 dark:text-white text-[9px] font-bold uppercase tracking-wider backdrop-blur-xl">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                                {t('dashboard.systemOnline')}
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-[9px] font-bold uppercase tracking-wider backdrop-blur-xl">
                                <SparklesIcon className="w-3.5 h-3.5" />
                                AI v2.0
                            </div>
                            {streak.currentStreak > 0 && (
                                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/10 border border-amber-400/20 rounded-full text-amber-600 dark:text-amber-300 text-[9px] font-bold uppercase tracking-wider backdrop-blur-xl" title={t('dashboard.longestStreak', { count: streak.longestStreak })}>
                                    🔥 {t('dashboard.streakDays', { count: streak.currentStreak })}
                                </div>
                            )}
                        </div>
                        <h1 className="text-4xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-none font-sans">
                            {t('dashboard.welcome')}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 font-extrabold">{user.name.split(' ')[0]}</span>.
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                            {t('dashboard.subtitle', { count: stats?.totalGenerations || 0 })}
                        </p>
                        <div className="flex flex-wrap gap-4 pt-2">
                            <button
                                onClick={() => navigate('/generator')}
                                className="px-6 py-3.5 bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white font-bold uppercase tracking-widest text-xs rounded-2xl hover:opacity-90 transition-all shadow-lg active:scale-95 flex items-center gap-2.5"
                            >
                                <Plus className="w-4 h-4" />
                                {t('dashboard.newProject')}
                            </button>
                            <button
                                onClick={() => setIsCommandPaletteOpen(true)}
                                className="px-6 py-3.5 bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-slate-700 dark:text-white font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all backdrop-blur flex items-center gap-2.5"
                            >
                                <Zap className="w-4 h-4 text-amber-400" />
                                {t('dashboard.quickActions')}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <QuickCommandBar />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    icon={RocketLaunchIcon}
                    label={t('dashboard.stats.generations')}
                    value={stats?.totalGenerations || 0}
                    color="bg-cyan-500/10 border border-cyan-500/20"
                    trend={t('dashboard.stats.generationsTrend')}
                    glowClass="neon-glow-cyan"
                    iconColor="text-cyan-500"
                />
                <StatCard
                    icon={CalendarIcon}
                    label={t('dashboard.stats.scheduled')}
                    value={scheduledThisWeek}
                    color="bg-fuchsia-500/10 border border-fuchsia-500/20"
                    trend={t('dashboard.stats.scheduledTrend')}
                    glowClass="neon-glow-pink"
                    iconColor="text-fuchsia-500"
                />
                <StatCard
                    icon={ClipboardDocumentListIcon}
                    label={t('dashboard.stats.drafts')}
                    value={drafts.length}
                    color="bg-lime-500/10 border border-lime-500/20"
                    trend={t('dashboard.stats.draftsTrend')}
                    glowClass="neon-glow-lime"
                    iconColor="text-lime-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <WeeklySummary />
                    <ApprovalQueuePanel />
                    <EngagementInboxPanel />
                    <RssToPostPanel />
                    <StrategyAssistant />
                </div>
                <div className="lg:col-span-1 space-y-8">
                    <OnboardingChecklist />
                    <LivePulse />
                    <SocialMediaSection />
                    <ReferralCard />

                    <div className="glass-premium p-8 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative group">
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-fuchsia-500/10 rounded-full blur-[60px]" />

                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-8 uppercase tracking-tighter flex items-center gap-3">
                            <div className="w-10 h-10 bg-fuchsia-500/10 rounded-xl flex items-center justify-center border border-fuchsia-500/25">
                                <CalendarIcon className="w-5 h-5 text-fuchsia-500" />
                            </div>
                            {t('dashboard.upcomingPosts')}
                        </h3>

                        {scheduledPosts.filter(p => p.status === 'scheduled').length > 0 ? (
                            <div className="space-y-4">
                                {scheduledPosts
                                    .filter(p => p.status === 'scheduled')
                                    .slice(0, 4)
                                    .map(post => {
                                        const config = platformConfig[post.formData?.platform || Platform.Facebook];
                                        return (
                                            <div key={post.id} className="group relative flex items-center gap-5 p-5 bg-white/40 dark:bg-slate-950/20 rounded-2xl border border-slate-200/50 dark:border-white/5 hover:border-fuchsia-500/50 transition-all shadow-sm">
                                                <div className={`w-12 h-12 rounded-2xl ${config?.selectedBgColor || 'bg-slate-100'} flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-white/5 shadow-inner relative overflow-hidden`}>
                                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    {config && <config.icon className={`w-6 h-6 ${config.iconColor} relative z-10 group-hover:scale-110 transition-transform`} />}
                                                </div>
                                                <div className="min-w-0 flex-grow">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight" title={post.formData?.topic}>
                                                        {post.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                                                    </p>
                                                    <div className="flex items-center gap-2.5 mt-1.5">
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-fuchsia-500 bg-fuchsia-500/10 px-2 py-0.5 rounded-md">Automated</span>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 tabular-nums">
                                                            {new Date(post.scheduleTimestamp).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handlers.handlePublishNow(post.result, post.formData?.platform || 'Facebook')}
                                                    className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 w-9 h-9 flex items-center justify-center bg-fuchsia-600 text-white rounded-xl shadow-lg transition-all hover:bg-fuchsia-500"
                                                    title="Publikuj teraz"
                                                >
                                                    <Send className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-950/20 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-white/5">
                                <div className="w-14 h-14 bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow">
                                    <ClockIcon className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kolejka jest pusta</p>
                                <p className="text-[9px] text-slate-300 mt-1 uppercase">Zaplanuj swój pierwszy post</p>
                            </div>
                        )}
                    </div>

                    <div className="glass-premium p-8 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative group">
                        <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-cyan-500/10 rounded-full blur-[60px]" />

                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-8 uppercase tracking-tighter flex items-center gap-3">
                            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/25">
                                <ClockIcon className="w-5 h-5 text-cyan-500" />
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
                                            className="w-full flex items-center gap-5 p-5 bg-white/40 dark:bg-slate-950/20 rounded-2xl border border-slate-200/50 dark:border-white/5 hover:border-cyan-500/50 transition-all text-left shadow-sm hover:shadow-xl group"
                                        >
                                            <div className={`w-12 h-12 rounded-2xl ${config?.selectedBgColor || 'bg-slate-100'} flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-white/5 shadow-inner group-hover:rotate-3 transition-transform`}>
                                                <Icon className={`w-6 h-6 ${config?.iconColor || ''} relative z-10`} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight" title={item.formData?.topic}>
                                                    {item.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                                                </p>
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1.5 tabular-nums">
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
