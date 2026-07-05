import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X, Heart, MessageCircle, Share2, Eye, TrendingUp,
    Loader2, ExternalLink, Image as ImageIcon, RefreshCw, BarChart2, Sparkles, ChevronDown, ChevronUp, Calendar
} from 'lucide-react';
import { generatePostMortem } from '../services/postMortemService';
import type { PostMortemReport } from '../services/postMortemService';
import {
    buildCalendarItemFromPostMortem,
    mergePostMortemIntoPlan,
} from '../services/postMortemCalendarService';
import { getApiBaseUrl, getApiAuthHeaders } from '../services/apiClient';
import { useDataStore } from '../stores/dataStore';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType } from '../types';
import type { SocialConnection } from '../types/socialPublishing';

interface PostMetric {
    id: string;
    content: string;
    url: string;
    publishedAt: Date;
    mediaUrl?: string;
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    reach?: number;
    impressions?: number;
}

interface SocialPostsHistoryProps {
    connection: SocialConnection | null;
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

const PLATFORM_COLORS: Record<string, string> = {
    facebook: 'from-blue-500 to-blue-600',
    instagram: 'from-purple-500 to-pink-500',
    linkedin: 'from-blue-600 to-blue-700',
    twitter: 'from-slate-700 to-black',
    tiktok: 'from-black to-slate-800',
};

const PLATFORM_ICONS: Record<string, string> = {
    facebook: '👥', instagram: '📸', linkedin: '💼', twitter: '𝕏', tiktok: '🎵'
};

function formatNumber(n?: number): string {
    if (n === undefined || n === null) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}

function timeAgo(date: Date): string {
    const d = new Date(date);
    const diffMs = Date.now() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Dzisiaj';
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tyg. temu`;
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const SocialPostsHistory: React.FC<SocialPostsHistoryProps> = ({
    connection, isOpen, onClose, userId
}) => {
    const navigate = useNavigate();
    const { intelligentCalendarPlan, setIntelligentCalendarPlan } = useDataStore();
    const { addToast } = useNotifications();
    const [posts, setPosts] = useState<PostMetric[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mortemLoadingId, setMortemLoadingId] = useState<string | null>(null);
    const [mortems, setMortems] = useState<Record<string, PostMortemReport>>({});
    const [expandedMortem, setExpandedMortem] = useState<string | null>(null);

    const fetchPosts = useCallback(async (signal?: AbortSignal) => {
        if (!connection || !userId) return;
        setLoading(true);
        setError(null);
        try {
            const headers = await getApiAuthHeaders(userId);
            const res = await fetch(`${getApiBaseUrl()}/api/social/history/${connection.id}`, {
                headers,
                credentials: 'include',
                signal,
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Błąd pobierania postów');
            }
            const data = await res.json();
            setPosts(data.posts || []);
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') return;
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [connection, userId]);

    useEffect(() => {
        if (!isOpen || !connection) return;
        const controller = new AbortController();
        fetchPosts(controller.signal);
        return () => controller.abort();
    }, [isOpen, connection, fetchPosts]);

    const handlePostMortem = useCallback(async (post: PostMetric) => {
        if (!userId || mortemLoadingId) return;
        if (mortems[post.id]) {
            setExpandedMortem(prev => prev === post.id ? null : post.id);
            return;
        }
        setMortemLoadingId(post.id);
        setExpandedMortem(post.id);
        try {
            const report = await generatePostMortem(
                post.content,
                connection?.platform || 'unknown',
                new Date(post.publishedAt).toISOString(),
                { likes: post.likes, comments: post.comments, shares: post.shares, views: post.views, reach: post.reach },
                userId,
                post.id
            );
            setMortems(prev => ({ ...prev, [post.id]: report }));
        } catch (e: any) {
            setExpandedMortem(null);
        } finally {
            setMortemLoadingId(null);
        }
    }, [userId, connection, mortems, mortemLoadingId]);

    const handleAddMortemToCalendar = useCallback(async (post: PostMetric, report: PostMortemReport) => {
        if (!connection) return;
        const item = buildCalendarItemFromPostMortem(report, {
            content: post.content,
            publishedAt: new Date(post.publishedAt),
        }, connection.platform);
        if (!item) {
            addToast('Nieobsługiwana platforma dla kalendarza', NotificationType.Error);
            return;
        }
        const merged = mergePostMortemIntoPlan(intelligentCalendarPlan, item);
        if (merged.length === (intelligentCalendarPlan?.length || 0)) {
            addToast('Ten slot jest już w kalendarzu', NotificationType.Info);
            return;
        }
        await setIntelligentCalendarPlan(merged);
        addToast('Dodano follow-up do kalendarza', NotificationType.Success);
        onClose();
        navigate('/calendar');
    }, [connection, intelligentCalendarPlan, setIntelligentCalendarPlan, addToast, onClose, navigate]);

    if (!isOpen || !connection) return null;

    const gradientClass = PLATFORM_COLORS[connection.platform] || 'from-slate-500 to-slate-700';
    const platformIcon = PLATFORM_ICONS[connection.platform] || '🌐';

    // Aggregate stats
    const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.comments || 0), 0);
    const totalShares = posts.reduce((s, p) => s + (p.shares || 0), 0);
    const totalReach = posts.reduce((s, p) => s + (p.reach || 0), 0);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className={`bg-gradient-to-r ${gradientClass} p-6 text-white`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{platformIcon}</span>
                            <div>
                                <h2 className="text-xl font-bold">Historia postów</h2>
                                <p className="text-white/80 text-sm">{connection.accountName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchPosts()}
                                disabled={loading}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                                aria-label="Odśwież"
                                title="Odśwież"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    {posts.length > 0 && (
                        <div className="grid grid-cols-4 gap-3 mt-4">
                            {[
                                { icon: Heart, label: 'Polubienia', value: formatNumber(totalLikes) },
                                { icon: MessageCircle, label: 'Komentarze', value: formatNumber(totalComments) },
                                { icon: Share2, label: 'Udostępnienia', value: formatNumber(totalShares) },
                                { icon: Eye, label: 'Zasięg', value: formatNumber(totalReach) },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                                    <Icon className="w-4 h-4 mx-auto mb-1 text-white/70" />
                                    <div className="text-lg font-bold">{value}</div>
                                    <div className="text-xs text-white/70">{label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Loader2 className="w-10 h-10 animate-spin mb-3 text-blue-500" />
                            <p className="font-medium">Pobieranie postów i danych...</p>
                            <p className="text-sm">To może chwilę potrwać</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-3">
                                <X className="w-8 h-8 text-red-500" />
                            </div>
                            <p className="font-medium text-slate-700 dark:text-slate-300">Błąd pobierania</p>
                            <p className="text-sm text-center mt-1 max-w-xs">{error}</p>
                            <button
                                onClick={() => fetchPosts()}
                                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition"
                            >
                                Spróbuj ponownie
                            </button>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <BarChart2 className="w-12 h-12 mb-3 opacity-30" />
                            <p className="font-medium">Brak postów do wyświetlenia</p>
                            <p className="text-sm">Opublikuj pierwszy post przez aplikację!</p>
                        </div>
                    ) : (
                        posts.map((post) => (
                            <div
                                key={post.id}
                                className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition"
                            >
                                <div className="flex gap-3 p-4">
                                    {/* Thumbnail */}
                                    {post.mediaUrl ? (
                                        <img
                                            src={post.mediaUrl}
                                            alt="Post media thumbnail"
                                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-slate-200"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                            <ImageIcon className="w-8 h-8 text-slate-400" />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed">
                                                {post.content || <span className="italic text-slate-400">Brak opisu</span>}
                                            </p>
                                            <a
                                                href={post.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition flex-shrink-0"
                                                title="Otwórz posta"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>

                                        <p className="text-xs text-slate-400 mt-1">
                                            {timeAgo(post.publishedAt)}
                                        </p>

                                        {/* Metrics Row */}
                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                            {post.likes !== undefined && (
                                                <span className="flex items-center gap-1 text-xs font-medium text-rose-500">
                                                    <Heart className="w-3.5 h-3.5" />
                                                    {formatNumber(post.likes)}
                                                </span>
                                            )}
                                            {post.comments !== undefined && (
                                                <span className="flex items-center gap-1 text-xs font-medium text-blue-500">
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    {formatNumber(post.comments)}
                                                </span>
                                            )}
                                            {(post.shares !== undefined && post.shares > 0) && (
                                                <span className="flex items-center gap-1 text-xs font-medium text-green-500">
                                                    <Share2 className="w-3.5 h-3.5" />
                                                    {formatNumber(post.shares)}
                                                </span>
                                            )}
                                            {(post.views !== undefined && post.views > 0) && (
                                                <span className="flex items-center gap-1 text-xs font-medium text-purple-500">
                                                    <Eye className="w-3.5 h-3.5" />
                                                    {formatNumber(post.views)} wyśw.
                                                </span>
                                            )}
                                            {(post.reach !== undefined && post.reach > 0) && (
                                                <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                                                    <TrendingUp className="w-3.5 h-3.5" />
                                                    {formatNumber(post.reach)} zasięg
                                                </span>
                                            )}
                                        </div>

                                        {/* Post-mortem button */}
                                        <div className="mt-2">
                                            <button
                                                onClick={() => handlePostMortem(post)}
                                                disabled={mortemLoadingId === post.id}
                                                className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-50"
                                            >
                                                {mortemLoadingId === post.id
                                                    ? <><Loader2 className="w-3 h-3 animate-spin" />Analizuję...</>
                                                    : mortems[post.id]
                                                        ? expandedMortem === post.id
                                                            ? <><ChevronUp className="w-3 h-3" />Ukryj analizę</>
                                                            : <><ChevronDown className="w-3 h-3" />Pokaż analizę</>
                                                        : <><Sparkles className="w-3 h-3" />AI Post-mortem</>}
                                            </button>

                                            {expandedMortem === post.id && mortems[post.id] && (() => {
                                                const m = mortems[post.id];
                                                const verdictColor = m.verdict === 'hit' ? 'text-green-500' : m.verdict === 'miss' ? 'text-red-500' : 'text-amber-500';
                                                const verdictLabel = m.verdict === 'hit' ? 'Trafiony' : m.verdict === 'miss' ? 'Pudło' : 'Przeciętny';
                                                return (
                                                    <div className="mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-bold text-sm ${verdictColor}`}>{verdictLabel}</span>
                                                            <span className="text-slate-400">·</span>
                                                            <span className="font-bold">{m.overallScore}/10</span>
                                                        </div>
                                                        {m.keyLesson && <p className="text-slate-600 dark:text-slate-300 italic">"{m.keyLesson}"</p>}
                                                        {m.whatWorked.length > 0 && (
                                                            <div>
                                                                <p className="font-bold text-green-600 dark:text-green-400 mb-1">Co zadziałało</p>
                                                                {m.whatWorked.map((w, i) => <p key={`worked-${i}`} className="text-slate-600 dark:text-slate-400">✓ {w}</p>)}
                                                            </div>
                                                        )}
                                                        {m.whatFailed.length > 0 && (
                                                            <div>
                                                                <p className="font-bold text-red-500 mb-1">Co nie zadziałało</p>
                                                                {m.whatFailed.map((w, i) => <p key={`failed-${i}`} className="text-slate-600 dark:text-slate-400">✗ {w}</p>)}
                                                            </div>
                                                        )}
                                                        {m.nextTimeRecommendation && (
                                                            <p className="text-indigo-600 dark:text-indigo-400 font-medium">→ {m.nextTimeRecommendation}</p>
                                                        )}
                                                        {m.suggestedImprovedHook && (
                                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                                                <p className="font-bold text-indigo-700 dark:text-indigo-300 mb-0.5">Lepszy hook:</p>
                                                                <p className="text-indigo-600 dark:text-indigo-400">"{m.suggestedImprovedHook}"</p>
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleAddMortemToCalendar(post, m)}
                                                            className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
                                                        >
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            Dodaj follow-up do kalendarza
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-sm text-slate-500">
                        {posts.length > 0 ? `${posts.length} postów` : ''}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:shadow-lg transition"
                    >
                        Zamknij
                    </button>
                </div>
            </div>
        </div>
    );
};
