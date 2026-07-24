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
import {
  matchIndustryPack,
  getAllIndustryPacks,
  industryPackToFormPrefill,
  getGastroSubNiches,
  applySubNicheToPack,
  type IndustryPack,
} from '../utils/industryPacks';
import { persistIndustryNiche } from '../utils/nicheContext';
import type { IndustrySubNicheDef } from '../shared/industryPacks';
import { setUserNiche } from '../utils/userNiche';
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
import { ProductToPostPanel } from './ProductToPostPanel';
import { BrandMemoryQuickCard } from './BrandMemoryQuickCard';
import { loadAutoPublishPrefs } from '../utils/autoPublishPrefs';

// Zustand stores
import { useDataStore } from '../stores/dataStore';

const StatCard: React.FC<{
    icon: React.ComponentType<{ className?: string }>,
    label: string,
    value: number | string,
    trend?: string,
}> = ({ icon: Icon, label, value, trend }) => (
    <div className="p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70 flex flex-col gap-5">
        <div
            className="w-11 h-11 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
            style={{ color: 'var(--hero-accent)' }}
        >
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <p className="font-display text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</p>
            <div className="flex items-center justify-between mt-2 gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
                {trend ? (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{trend}</span>
                ) : null}
            </div>
        </div>
    </div>
);

const IndustryPackSection: React.FC<{ niche: string; userId?: string | null }> = ({ niche, userId }) => {
    const navigate = useNavigate();
    const matched = matchIndustryPack(niche);
    const packs = matched ? [matched, ...getAllIndustryPacks().filter((p) => p.id !== matched.id)] : getAllIndustryPacks();
    const primary = packs[0];
    const [activeSub, setActiveSub] = useState<IndustrySubNicheDef | null>(null);
    const gastroSubs = primary.id === 'pl-lokal' || matched?.id === 'pl-lokal' ? getGastroSubNiches() : [];

    useEffect(() => {
        if (matched?.subNicheId) {
            const sub = getGastroSubNiches().find((s) => s.id === matched.subNicheId) ?? null;
            setActiveSub(sub);
        } else {
            setActiveSub(null);
        }
    }, [matched?.subNicheId, matched?.id]);

    const activePack: IndustryPack =
        activeSub && (matched?.id === 'pl-lokal' || primary.id === 'pl-lokal')
            ? applySubNicheToPack(matched?.id === 'pl-lokal' ? matched : primary, activeSub)
            : matched ?? primary;

    const topicIdeas = activePack.topicIdeas.slice(0, 8);

    const openPack = (pack: IndustryPack, topic?: string) => {
        const audience = persistIndustryNiche(pack, userId, niche);
        navigate('/generator', {
            state: {
                prefillData: industryPackToFormPrefill(pack, topic, audience),
            },
        });
    };

    return (
        <section className="space-y-4" aria-label="Dla Twojej branży">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Dla Twojej branży
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {matched
                            ? <>Gotowe formaty i pomysły dla: <span className="font-semibold" style={{ color: 'var(--hero-accent)' }}>{matched.subNicheLabel ? `${matched.name} · ${matched.subNicheLabel}` : matched.name}</span></>
                            : 'Wybierz starter pack branżowy — temat, platforma i ton wypełnią się same.'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {packs.slice(0, 8).map((pack) => {
                    const isPrimary = matched?.id === pack.id;
                    return (
                        <button
                            key={pack.id}
                            type="button"
                            onClick={() => openPack(pack)}
                            className={`text-left p-4 border transition-colors rounded-xl ${
                                isPrimary
                                    ? 'border-[var(--hero-accent)]/50 bg-[var(--hero-accent-soft)]'
                                    : 'border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70 hover:border-[var(--hero-accent)]/40'
                            }`}
                        >
                            <span className="text-2xl" aria-hidden>{pack.icon}</span>
                            <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{pack.name}</h3>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                                {pack.description}
                            </p>
                            <span className="mt-3 inline-block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hero-accent)' }}>
                                Użyj packa →
                            </span>
                        </button>
                    );
                })}
            </div>

            {gastroSubs.length > 0 && (
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                        Typ lokalu
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {gastroSubs.map((sub) => {
                            const selected = activeSub?.id === sub.id;
                            return (
                                <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => {
                                        const next = selected ? null : sub;
                                        setActiveSub(next);
                                        if (next) {
                                            const pack = applySubNicheToPack(
                                                matched?.id === 'pl-lokal' ? matched! : primary,
                                                next
                                            );
                                            persistIndustryNiche(pack, userId, niche);
                                        } else if (matched) {
                                            setUserNiche(matched.name, userId);
                                        }
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                                        selected
                                            ? 'border-[var(--hero-accent)] text-[var(--hero-accent)] bg-[var(--hero-accent-soft)]'
                                            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[var(--hero-accent)]/40'
                                    }`}
                                >
                                    <span aria-hidden>{sub.icon}</span>
                                    {sub.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                    Szybkie pomysły{activeSub ? ` · ${activeSub.label}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                    {topicIdeas.map((idea) => (
                        <button
                            key={idea}
                            type="button"
                            onClick={() => openPack(activePack, idea)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:border-[var(--hero-accent)]/45 hover:text-[var(--hero-accent)] transition-colors"
                        >
                            {idea.length > 56 ? `${idea.slice(0, 54)}…` : idea}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
};

const StrategyAssistant: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [ideas, setIdeas] = useState<StrategicIdea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [retryTrigger, setRetryTrigger] = useState(0);
    const { brandVoiceProfiles, activeBrandVoiceId } = useDataStore();
    const activeBv = brandVoiceProfiles.find((p) => p.id === activeBrandVoiceId);
    const niche =
        activeBv?.settings?.niche?.trim() ||
        getUserNiche(user?.id);

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
        const pack = matchIndustryPack(niche);
        if (pack) {
            const audience = persistIndustryNiche(pack, user?.id, niche);
            navigate('/generator', {
                state: { prefillData: industryPackToFormPrefill(pack, topic, audience) },
            });
            return;
        }
        navigate('/generator', { state: { prefillData: { topic, audience: niche } } });
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
        <div className="p-6 md:p-8 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Asystent Strategiczny</h3>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.14em] mt-1">
                        Wskazówki dla marki: <span style={{ color: 'var(--hero-accent)' }}>{niche}</span>
                    </p>
                </div>
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
                    style={{ color: 'var(--hero-accent)' }}
                >
                    <SparklesIcon className="w-5 h-5" />
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={`skeleton-${i}`} className="p-4 border border-slate-200/60 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.03] animate-pulse">
                            <div className="flex gap-4 items-center">
                                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg flex-shrink-0" />
                                <div className="space-y-2 flex-grow min-w-0">
                                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="p-6 border border-red-500/20 bg-red-500/5 text-center">
                    <p className="text-sm font-semibold text-red-500 dark:text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => setRetryTrigger(prev => prev + 1)}
                        className="px-5 py-2.5 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:brightness-110 transition inline-flex items-center gap-2"
                        style={{ backgroundColor: 'var(--hero-accent)' }}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Spróbuj ponownie
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {ideas.map((idea, index) => (
                        <div key={`idea-${index}`} className="p-4 border border-slate-200/70 dark:border-white/10 hover:border-[var(--hero-accent)]/40 transition-colors group">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex gap-3 min-w-0">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-lg flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-white/5">
                                        <IdeaTypeIcon type={idea.type} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--hero-accent)' }}>{idea.type}</span>
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5">{idea.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">"{idea.strategy}"</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onGenerateFromIdea(idea.title)}
                                    className="shrink-0 px-3 py-2 border text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
                                    style={{
                                        color: 'var(--hero-accent)',
                                        borderColor: 'color-mix(in srgb, var(--hero-accent) 35%, transparent)',
                                        backgroundColor: 'var(--hero-accent-soft)',
                                    }}
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

    const { history, scheduledPosts, stats, drafts, brandVoiceProfiles, activeBrandVoiceId } = useDataStore();
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
    const bvNiche = brandVoiceProfiles.find((p) => p.id === activeBrandVoiceId)?.settings?.niche?.trim();
    const niche = bvNiche || getUserNiche(user.id);
    const nichePack = matchIndustryPack(niche);
    const quickPlaceholder = nichePack?.topicIdeas[0]
        ?? 'Np. 3 wskazówki na zwiększenie sprzedaży w restauracji...';

    return (
        <div className="space-y-8 animate-fade-in pb-16">
            <TrialBanner />
            <TrialBanner />
            {/* Redesigned Hero Header with Central AI Generator Entry */}
            <header className="relative py-10 md:py-14 px-6 md:px-12 rounded-[2rem] border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-[#071018] via-[#0a1628] to-[#0d1f33] text-white shadow-2xl overflow-hidden">
                <div className="absolute inset-0 home-grid-bg opacity-30 pointer-events-none" aria-hidden="true" />
                <div
                    className="absolute inset-0 pointer-events-none opacity-60"
                    style={{
                        background:
                            'radial-gradient(ellipse 80% 80% at 85% 20%, rgba(29, 155, 240, 0.22), transparent 60%)',
                    }}
                    aria-hidden="true"
                />

                <div className="relative z-10 space-y-8 max-w-4xl mx-auto text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                {t('dashboard.systemOnline')}
                            </span>
                            {streak.currentStreak > 0 && (
                                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20" title={t('dashboard.longestStreak', { count: streak.longestStreak })}>
                                    {t('dashboard.streakDays', { count: streak.currentStreak })}
                                </span>
                            )}
                        </div>
                    </div>

                    <div>
                        <h1 className="font-display text-3xl md:text-5xl font-black tracking-tight leading-tight">
                            Witaj ponownie,{' '}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400">
                                {user.name.split(' ')[0]}
                            </span>!
                        </h1>
                        <p className="text-base text-slate-300 mt-2 max-w-2xl leading-relaxed">
                            {nichePack
                                ? `Szybka ścieżka dla ${nichePack.name}: wybierz pomysł poniżej albo wpisz własny temat.`
                                : 'O czym ma być Twój dzisiejszy viralowy post? Wpisz temat poniżej i pozwól AI wykonać pracę.'}
                        </p>
                    </div>

                    {/* Central Quick Prompt Input Bar */}
                    <div className="p-2.5 rounded-2xl bg-white/10 dark:bg-slate-900/80 border border-white/20 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center gap-2">
                        <div className="flex-1 flex items-center gap-3 px-4 w-full">
                            <SparklesIcon className="w-5 h-5 text-sky-400 shrink-0" />
                            <input
                                type="text"
                                placeholder={quickPlaceholder}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                        const topic = e.currentTarget.value.trim();
                                        navigate('/generator', {
                                            state: {
                                                prefillData: nichePack
                                                    ? industryPackToFormPrefill(nichePack, topic)
                                                    : { topic },
                                            },
                                        });
                                    }
                                }}
                                className="w-full bg-transparent text-white placeholder-slate-400 text-sm font-medium focus:outline-none py-2.5"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={(e) => {
                                const input = e.currentTarget.previousElementSibling?.querySelector('input');
                                const val = input?.value?.trim();
                                navigate('/generator', {
                                    state: {
                                        prefillData: nichePack
                                            ? industryPackToFormPrefill(nichePack, val || nichePack.topicIdeas[0])
                                            : { topic: val || '' },
                                    },
                                });
                            }}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-white bg-[var(--hero-accent)] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-sky-500/25 shrink-0 flex items-center justify-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            Generuj Post
                        </button>
                    </div>
                </div>
            </header>

            <QuickCommandBar />

            <IndustryPackSection niche={niche} userId={user.id} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                <StatCard
                    icon={RocketLaunchIcon}
                    label={t('dashboard.stats.generations')}
                    value={stats?.totalGenerations || 0}
                    trend={t('dashboard.stats.generationsTrend')}
                />
                <StatCard
                    icon={CalendarIcon}
                    label={t('dashboard.stats.scheduled')}
                    value={scheduledThisWeek}
                    trend={t('dashboard.stats.scheduledTrend')}
                />
                <StatCard
                    icon={ClipboardDocumentListIcon}
                    label={t('dashboard.stats.drafts')}
                    value={drafts.length}
                    trend={t('dashboard.stats.draftsTrend')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <WeeklySummary />
                    <ApprovalQueuePanel />
                    <EngagementInboxPanel />
                    <RssToPostPanel />
                    <ProductToPostPanel />
                    <BrandMemoryQuickCard />
                    <StrategyAssistant />
                </div>
                <div className="lg:col-span-1 space-y-8">
                    <OnboardingChecklist />
                    <LivePulse />
                    <SocialMediaSection />
                    <ReferralCard />

                    <div className="p-6 md:p-8 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70">
                        <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-3">
                            <span
                                className="w-9 h-9 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
                                style={{ color: 'var(--hero-accent)' }}
                            >
                                <CalendarIcon className="w-4 h-4" />
                            </span>
                            {t('dashboard.upcomingPosts')}
                        </h3>

                        {scheduledPosts.filter(p => p.status === 'scheduled').length > 0 ? (
                            <div className="space-y-3">
                                {scheduledPosts
                                    .filter(p => p.status === 'scheduled')
                                    .slice(0, 4)
                                    .map(post => {
                                        const config = platformConfig[post.formData?.platform || Platform.Facebook];
                                        return (
                                            <div key={post.id} className="group relative flex items-center gap-4 p-4 border border-slate-200/70 dark:border-white/10 hover:border-[var(--hero-accent)]/40 transition-colors">
                                                <div className={`w-10 h-10 rounded-lg ${config?.selectedBgColor || 'bg-slate-100'} flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-white/5`}>
                                                    {config && <config.icon className={`w-5 h-5 ${config.iconColor}`} />}
                                                </div>
                                                <div className="min-w-0 flex-grow">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={post.formData?.topic}>
                                                        {post.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                                                    </p>
                                                    <div className="flex items-center gap-2.5 mt-1">
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--hero-accent)' }}>Automated</span>
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 tabular-nums">
                                                            {new Date(post.scheduleTimestamp).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handlers.handlePublishNow(post.result, post.formData?.platform || 'Facebook')}
                                                    className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 w-9 h-9 flex items-center justify-center text-white rounded-lg transition-all hover:brightness-110"
                                                    style={{ backgroundColor: 'var(--hero-accent)' }}
                                                    title="Publikuj teraz"
                                                >
                                                    <Send className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-white/10">
                                <ClockIcon className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kolejka jest pusta</p>
                                <p className="text-[11px] text-slate-400 mt-1">Zaplanuj swój pierwszy post</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 md:p-8 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70">
                        <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-3">
                            <span
                                className="w-9 h-9 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
                                style={{ color: 'var(--hero-accent)' }}
                            >
                                <ClockIcon className="w-4 h-4" />
                            </span>
                            Ostatnie Dzieła
                        </h3>

                        {history.length > 0 ? (
                            <div className="space-y-3">
                                {history.slice(0, 4).map(item => {
                                    const platform = item.formData?.platform || Platform.Facebook;
                                    const config = platformConfig[platform];
                                    const Icon = config?.icon || PostIcon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => navigate('/generator', { state: { inspirationItem: item } })}
                                            className="w-full flex items-center gap-4 p-4 border border-slate-200/70 dark:border-white/10 hover:border-[var(--hero-accent)]/40 transition-colors text-left group"
                                        >
                                            <div className={`w-10 h-10 rounded-lg ${config?.selectedBgColor || 'bg-slate-100'} flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-white/5`}>
                                                <Icon className={`w-5 h-5 ${config?.iconColor || ''}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={item.formData?.topic}>
                                                    {item.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                                                </p>
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-1 tabular-nums">
                                                    {new Date(item.timestamp).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Twoja historia jest pusta</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
