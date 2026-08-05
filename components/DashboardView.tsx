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
import {
    History, RefreshCw, Wifi, Plus, Send, Zap,
    ArrowRight, Utensils, Scissors, Rocket, ShoppingCart, Dumbbell, Shirt, BookOpen, Wallet,
    TrendingUp, CalendarDays, Clock, FilePlus, CalendarPlus, PenLine, Link as SocialLinkIcon
} from 'lucide-react';
import { LivePulse } from './LivePulse';
import { recordActivity, getStreakData } from '../services/streakService';

// Components
import { QuickCommandBar } from './QuickCommandBar';
import { platformConfig } from '../config/platformConfig';
import { WeeklySummary } from './WeeklySummary';
import { SocialHistoryModal } from './SocialHistoryModal';
import { ModernCard } from './ui/ModernCard';
import { LazySection } from '../src/components/ui/LazySection';
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
import {
  formatIndustriesLabel,
  getUserIndustryIds,
  toggleUserIndustry,
  addUserIndustry,
} from '../utils/userIndustries';
import type { IndustryPackId } from '../utils/industryPacks';
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
    emptyIcon: React.ComponentType<{ className?: string }>,
    label: string,
    value: number | string,
    trend?: string,
    emptyLabel: string,
    emptyCtaLabel: string,
    onEmptyCta: () => void,
}> = ({ icon: Icon, emptyIcon: EmptyIcon, label, value, trend, emptyLabel, emptyCtaLabel, onEmptyCta }) => {
    const isEmpty = value === 0;
    return (
        <div className={`flex flex-col justify-between p-6 rounded-3xl border backdrop-blur-xl shadow-xl transition-all duration-300 group ${
            isEmpty
                ? 'border-white/5 bg-white/[0.03] hover:border-white/10'
                : 'border-white/10 bg-white/5 hover:border-emerald-500/30'
        }`}>
            <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform duration-300 shadow-inner ${
                    isEmpty
                        ? 'border-white/5 bg-white/[0.03] text-emerald-400/50'
                        : 'border-white/10 bg-white/5 text-emerald-400 group-hover:scale-110'
                }`}>
                    {isEmpty ? <EmptyIcon className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                {!isEmpty && trend && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {trend}
                    </span>
                )}
            </div>
            {isEmpty ? (
                <div className="mt-6">
                    <p className="text-sm font-semibold text-slate-400">{emptyLabel}</p>
                    <button
                        type="button"
                        onClick={onEmptyCta}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                        {emptyCtaLabel} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                <div className="mt-6">
                    <p className="font-display text-4xl font-black text-white tracking-tight">{value}</p>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mt-2">{label}</p>
                </div>
            )}
        </div>
    );
};

// Map pack IDs to Lucide icons
const PACK_LUCIDE_ICONS: Record<string, React.ElementType> = {
    'pl-lokal': Utensils,
    'pl-uroda': Scissors,
    'pl-it': Rocket,
    'pl-ecommerce': ShoppingCart,
    'pl-fitness': Dumbbell,
    'pl-fashion': Shirt,
    'pl-edukacja': BookOpen,
    'pl-finanse': Wallet,
};

const UserIndustriesManager: React.FC<{ userId: string; onChange: () => void }> = ({ userId, onChange }) => {
    const packs = getAllIndustryPacks();
    const [selected, setSelected] = useState<IndustryPackId[]>(() => getUserIndustryIds(userId));
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setSelected(getUserIndustryIds(userId));
    }, [userId]);

    const handleToggle = async (id: IndustryPackId) => {
        setBusy(true);
        try {
            const next = await toggleUserIndustry(id, { userId, syncRemote: true });
            setSelected(next);
            onChange();
        } finally {
            setBusy(false);
        }
    };

    const label = formatIndustriesLabel(selected);

    return (
        <section className="space-y-3" aria-label="Twoje branże">
            <div>
                <h2 className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">
                    Twoje branże
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                    {label
                        ? <>Aktywne: <span className="font-semibold text-emerald-400">{label}</span>. Kliknij, żeby zmienić.</>
                        : 'Zaznacz branże — treści i pomysły dopasują się do Twojego konta.'}
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                {packs.map((pack) => {
                    const active = selected.includes(pack.id);
                    const LucideIcon = PACK_LUCIDE_ICONS[pack.id];
                    return (
                        <button
                            key={pack.id}
                            type="button"
                            disabled={busy}
                            onClick={() => void handleToggle(pack.id)}
                            aria-pressed={active}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 disabled:opacity-50 ${
                                active
                                    ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                                    : 'border-white/10 text-slate-400 bg-white/5 hover:border-emerald-500/30 hover:text-emerald-400'
                            }`}
                        >
                            {LucideIcon
                                ? <LucideIcon className="w-3 h-3" aria-hidden />
                                : <span aria-hidden className="text-xs">{pack.icon}</span>
                            }
                            {pack.name}
                            {active
                                ? <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-black">✓</span>
                                : <Plus className="w-3 h-3 opacity-50" aria-hidden />
                            }
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

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
        if (userId) {
            void addUserIndustry(pack.id, { userId, syncRemote: true });
        }
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

            {/* Bento Grid — kafelki branżowe z glassmorphism */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {packs.slice(0, 8).map((pack) => {
                    const isPrimary = matched?.id === pack.id;
                    const LucideIcon = PACK_LUCIDE_ICONS[pack.id];
                    return (
                        <button
                            key={pack.id}
                            type="button"
                            onClick={() => openPack(pack)}
                            className={`text-left p-5 rounded-3xl border transition-all duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] group ${
                                isPrimary
                                    ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.04] backdrop-blur-xl ring-1 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                    : 'border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl hover:scale-[1.02] hover:border-emerald-500/30'
                            }`}
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                {LucideIcon
                                    ? <LucideIcon className="w-5 h-5" aria-hidden />
                                    : <span aria-hidden className="text-lg">{pack.icon}</span>
                                }
                            </div>
                            <h3 className="text-sm font-bold text-white tracking-tight">{pack.name}</h3>
                            <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                                {pack.description}
                            </p>
                            <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                                Generuj posty <ArrowRight className="w-3 h-3" aria-hidden />
                            </span>
                        </button>
                    );
                })}
            </div>

            {gastroSubs.length > 0 && (
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2">
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
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 ${
                                        selected
                                            ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                                            : 'border-white/10 text-slate-400 bg-white/5 hover:border-emerald-500/30 hover:text-emerald-400'
                                    }`}
                                >
                                    <span aria-hidden className="text-xs">{sub.icon}</span>
                                    {sub.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Szybkie pomysły — klikalne pill buttons */}
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-3">
                    Szybkie pomysły{activeSub ? ` · ${activeSub.label}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                    {topicIdeas.map((idea) => (
                        <button
                            key={idea}
                            type="button"
                            onClick={() => openPack(activePack, idea)}
                            className="px-3.5 py-1.5 text-xs font-medium rounded-full border border-white/10 bg-white/5 text-slate-300 hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all duration-200"
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
        <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-xl text-white tracking-tight">Asystent Strategiczny</h3>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.14em] mt-1">
                        Wskazówki dla marki: <span className="text-emerald-400">{niche}</span>
                    </p>
                </div>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 bg-emerald-500/10 text-emerald-400">
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
                    <h3 className="text-xl font-bold text-white tracking-tight">Social Intelligence</h3>
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
                <div className="text-center py-10 bg-white/[0.03] rounded-3xl border border-dashed border-white/10 relative z-10">
                    <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Wifi className="w-7 h-7 text-emerald-400/60" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-2">Nie masz jeszcze połączonych kont</h4>
                    <p className="text-[12px] text-slate-400 max-w-[220px] mx-auto mb-5 leading-relaxed">
                        Połącz Instagram, Facebook lub LinkedIn, aby AI mogło analizować i publikować posty automatycznie.
                    </p>
                    <button
                        onClick={() => setIsSocialConnectionsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/10 hover:text-emerald-300 transition-all"
                    >
                        <SocialLinkIcon className="w-3.5 h-3.5" />
                        Połącz konto
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
    const [nicheTick, setNicheTick] = useState(0);

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
    void nicheTick; // re-read niche after industry toggle
    const niche = bvNiche || getUserNiche(user.id);
    const nichePack = matchIndustryPack(niche);
    const quickPlaceholder = nichePack?.topicIdeas[0]
        ?? 'Np. 3 wskazówki na zwiększenie sprzedaży w restauracji...';

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    return (
        <div className="space-y-8 animate-fade-in pb-16">
            <TrialBanner />
            {/* Bento Grid AI Content Pro Hero Header z efektem Spotlight */}
            <header
                onMouseMove={handleMouseMove}
                className="relative py-12 md:py-16 px-6 md:px-12 rounded-3xl border border-white/10 bg-gradient-to-br from-[#071018]/90 via-[#0b1728]/90 to-[#0e2137]/90 text-white shadow-2xl overflow-hidden backdrop-blur-xl group"
            >
                {/* Spotlight background effect */}
                <div
                    className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                    style={{
                        background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(16, 185, 129, 0.15), transparent 80%)`,
                    }}
                    aria-hidden="true"
                />
                <div className="absolute inset-0 home-grid-bg opacity-20 pointer-events-none" aria-hidden="true" />

                <div className="relative z-10 space-y-8 max-w-4xl mx-auto text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm backdrop-blur-md">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                {t('dashboard.systemOnline')}
                            </span>
                            {streak.currentStreak > 0 && (
                                <span className="px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-extrabold flex items-center gap-1 shadow-sm backdrop-blur-md" title={t('dashboard.longestStreak', { count: streak.longestStreak })}>
                                    🔥 {t('dashboard.streakDays', { count: streak.currentStreak })}
                                </span>
                            )}
                        </div>
                    </div>

                    <div>
                        <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight leading-tight">
                            Witaj ponownie,{' '}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 animate-gradient">
                                {user.name.split(' ')[0]}
                            </span>!
                        </h1>
                        <p className="text-base text-slate-300 mt-3 max-w-2xl leading-relaxed">
                            {nichePack
                                ? `Szybka ścieżka dla ${nichePack.name}: wybierz pomysł poniżej albo wpisz własny temat.`
                                : 'O czym ma być Twój dzisiejszy viralowy post? Wpisz temat poniżej i pozwól AI wykonać pracę.'}
                        </p>
                    </div>

                    {/* Central Quick Prompt Input Bar */}
                    <div className="p-3 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center gap-2 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                        <div className="flex-1 flex items-center gap-3 px-4 w-full">
                            <SparklesIcon className="w-5.5 h-5.5 text-emerald-400 shrink-0 animate-pulse" />
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
                                className="w-full bg-transparent text-white placeholder-slate-400 text-sm md:text-base font-medium focus:outline-none py-2.5"
                            />
                        </div>
                        {/* Button z efektem Shimmer Glow */}
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
                            className="relative group/btn overflow-hidden w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 shrink-0 flex items-center justify-center gap-2"
                        >
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                            <Send className="w-4 h-4" />
                            <span>Generuj Post</span>
                        </button>
                    </div>

                    {/* Quick Action Navigation Chips */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => navigate('/generator')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all active:scale-95 hover:scale-105 shadow-sm"
                        >
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            Nowy Post
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/calendar')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all active:scale-95 hover:scale-105 shadow-sm"
                        >
                            <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
                            Kalendarz
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/analytics')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all active:scale-95 hover:scale-105 shadow-sm"
                        >
                            <TrendingUpIcon className="w-3.5 h-3.5 text-emerald-400" />
                            Analityka
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/trends')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all active:scale-95 hover:scale-105 shadow-sm"
                        >
                            <RocketLaunchIcon className="w-3.5 h-3.5 text-pink-400" />
                            Trendy
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/strategist')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all active:scale-95 hover:scale-105 shadow-sm"
                        >
                            <SparklesIcon className="w-3.5 h-3.5 text-purple-400" />
                            Strateg AI
                        </button>
                    </div>
                </div>
            </header>

            <QuickCommandBar />

            <UserIndustriesManager userId={user.id} onChange={() => setNicheTick((n) => n + 1)} />
            <IndustryPackSection niche={niche} userId={user.id} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                <StatCard
                    icon={RocketLaunchIcon}
                    emptyIcon={FilePlus}
                    label="Wygenerowane treści"
                    value={stats?.totalGenerations || 0}
                    trend={t('dashboard.stats.generationsTrend')}
                    emptyLabel="Jeszcze nie wygenerowałeś żadnej treści"
                    emptyCtaLabel="Stwórz pierwszy post"
                    onEmptyCta={() => navigate('/generator')}
                />
                <StatCard
                    icon={CalendarIcon}
                    emptyIcon={CalendarPlus}
                    label="Zaplanowane posty"
                    value={scheduledThisWeek}
                    trend={t('dashboard.stats.scheduledTrend')}
                    emptyLabel="Brak zaplanowanych postów w tym tygodniu"
                    emptyCtaLabel="Zaplanuj post"
                    onEmptyCta={() => navigate('/calendar')}
                />
                <StatCard
                    icon={ClipboardDocumentListIcon}
                    emptyIcon={PenLine}
                    label="Aktywne wersje robocze"
                    value={drafts.length}
                    trend={t('dashboard.stats.draftsTrend')}
                    emptyLabel="Nie masz jeszcze żadnych wersji roboczych"
                    emptyCtaLabel="Generuj post"
                    onEmptyCta={() => navigate('/generator')}
                />
            </div>

            <LazySection minHeight="h-96">
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

                      {/* Nadchodzące posty — bento glassmorphism */}
                      <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
                          <h3 className="font-bold text-lg text-white mb-6 tracking-tight flex items-center gap-3">
                              <span className="w-9 h-9 rounded-2xl flex items-center justify-center border border-white/10 bg-emerald-500/10 text-emerald-400">
                                  <CalendarDays className="w-4 h-4" />
                              </span>
                              {t('dashboard.upcomingPosts')}
                          </h3>

                          {scheduledPosts.filter(p => p.status === 'scheduled').length > 0 ? (
                              <div className="space-y-2">
                                  {scheduledPosts
                                      .filter(p => p.status === 'scheduled')
                                      .slice(0, 4)
                                      .map(post => {
                                          const config = platformConfig[post.formData?.platform || Platform.Facebook];
                                          return (
                                              <div key={post.id} className="group relative flex items-center gap-3 p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:border-emerald-500/30 transition-all duration-200">
                                                  <div className={`w-10 h-10 rounded-xl ${config?.selectedBgColor || 'bg-white/10'} flex items-center justify-center shrink-0 border border-white/10`}>
                                                      {config && <config.icon className={`w-5 h-5 ${config.iconColor}`} />}
                                                  </div>
                                                  <div className="min-w-0 flex-grow">
                                                      <p className="text-sm font-semibold text-white truncate" title={post.formData?.topic}>
                                                          {post.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                                                      </p>
                                                      <div className="flex items-center gap-2 mt-0.5">
                                                          <CalendarDays className="w-3 h-3 text-emerald-400" />
                                                          <p className="text-[10px] font-medium text-slate-400 tabular-nums">
                                                              {new Date(post.scheduleTimestamp).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                          </p>
                                                      </div>
                                                  </div>
                                                  <button
                                                      onClick={() => handlers.handlePublishNow(post.result, post.formData?.platform || 'Facebook')}
                                                      className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center text-white bg-emerald-500 rounded-xl transition-all hover:bg-emerald-400 shrink-0"
                                                      title="Publikuj teraz"
                                                  >
                                                      <Send className="w-3.5 h-3.5" />
                                                  </button>
                                              </div>
                                          );
                                      })}
                              </div>
                          ) : (
                              <div className="text-center py-10 rounded-2xl border border-dashed border-white/10">
                                  <CalendarDays className="w-6 h-6 text-slate-600 mx-auto mb-3" />
                                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kolejka jest pusta</p>
                                  <p className="text-[11px] text-slate-500 mt-1">Zaplanuj swój pierwszy post</p>
                              </div>
                          )}
                      </div>

                      {/* Ostatnie dzieła — bento glassmorphism */}
                      <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
                          <h3 className="font-bold text-lg text-white mb-6 tracking-tight flex items-center gap-3">
                              <span className="w-9 h-9 rounded-2xl flex items-center justify-center border border-white/10 bg-emerald-500/10 text-emerald-400">
                                  <Clock className="w-4 h-4" />
                              </span>
                              Ostatnie Dzieła
                          </h3>

                          {history.length > 0 ? (
                              <div className="space-y-2">
                                  {history.slice(0, 4).map(item => {
                                      const platform = item.formData?.platform || Platform.Facebook;
                                      const config = platformConfig[platform];
                                      const Icon = config?.icon || PostIcon;
                                      return (
                                          <button
                                              key={item.id}
                                              onClick={() => navigate('/generator', { state: { inspirationItem: item } })}
                                              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:border-emerald-500/30 transition-all duration-200 text-left group"
                                          >
                                              <div className={`w-10 h-10 rounded-xl ${config?.selectedBgColor || 'bg-white/10'} flex items-center justify-center shrink-0 border border-white/10`}>
                                                  <Icon className={`w-5 h-5 ${config?.iconColor || 'text-slate-400'}`} />
                                              </div>
                                              <div className="min-w-0">
                                                  <p className="text-sm font-semibold text-white truncate" title={item.formData?.topic}>
                                                      {item.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                                                  </p>
                                                  <p className="text-[10px] font-medium text-slate-400 mt-0.5 tabular-nums">
                                                      {new Date(item.timestamp).toLocaleDateString('pl-PL')}
                                                  </p>
                                              </div>
                                              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 ml-auto shrink-0 transition-colors" />
                                          </button>
                                      );
                                  })}
                              </div>
                          ) : (
                              <div className="text-center py-8">
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Twoja historia jest pusta</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
            </LazySection>
        </div>
    );
};
