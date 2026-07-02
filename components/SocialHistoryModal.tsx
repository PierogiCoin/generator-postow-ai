import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X, ExternalLink, Calendar, Loader2, MessageSquare, Heart, Share2,
    BarChart3, AlertCircle, Eye, TrendingUp, RefreshCw, Image as ImageIcon
} from 'lucide-react';
import { getApiBaseUrl, getApiAuthHeaders } from '../services/apiClient';
import type { SocialConnection } from '../types/socialPublishing';

interface PostWithMetrics {
    id: string;
    content: string;
    url: string;
    publishedAt: Date | string;
    mediaUrl?: string;
    mediaUrls?: string[];
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    reach?: number;
    impressions?: number;
    // legacy compat
    metrics?: {
        likes?: number;
        comments?: number;
        shares?: number;
        views?: number;
        reach?: number;
    };
}

interface SocialHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    connection: SocialConnection | null;
    userId: string;
}

const PLATFORM_GRADIENT: Record<string, string> = {
    facebook: 'from-blue-500 to-blue-700',
    instagram: 'from-purple-500 via-pink-500 to-orange-400',
    linkedin: 'from-blue-600 to-blue-800',
    twitter: 'from-slate-700 to-black',
    tiktok: 'from-fuchsia-600 to-black',
};

const PLATFORM_ICONS: Record<string, string> = {
    facebook: '👥', instagram: '📸', linkedin: '💼', twitter: '𝕏', tiktok: '🎵'
};

function fmt(n?: number): string {
    if (n === undefined || n === null) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}

function timeAgo(date: Date | string): string {
    const d = new Date(date);
    const diffMs = Date.now() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Dzisiaj';
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const SocialHistoryModal: React.FC<SocialHistoryModalProps> = ({
    isOpen,
    onClose,
    connection,
    userId
}) => {
    const { t } = useTranslation();
    const [posts, setPosts] = useState<PostWithMetrics[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadHistory = useCallback(async (signal: AbortSignal) => {
        if (!connection || !userId) return;
        setIsLoading(true);
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
                throw new Error(errData.error || 'Błąd pobierania historii');
            }
            const data = await res.json();
            setPosts(data.posts || []);
        } catch (err: unknown) {
            if ((err as Error).name === 'AbortError') return;
            setError((err as Error).message || 'Nieznany błąd');
        } finally {
            setIsLoading(false);
        }
    }, [connection, userId]);

    useEffect(() => {
        if (!isOpen || !connection || !userId) return;
        const controller = new AbortController();
        loadHistory(controller.signal);
        return () => controller.abort();
    }, [isOpen, loadHistory]);

    if (!isOpen || !connection) return null;

    const gradient = PLATFORM_GRADIENT[connection.platform] || 'from-slate-500 to-slate-700';
    const icon = PLATFORM_ICONS[connection.platform] || '🌐';

    // Agregaty statystyk
    const totalLikes = posts.reduce((s, p) => s + (p.likes ?? p.metrics?.likes ?? 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.comments ?? p.metrics?.comments ?? 0), 0);
    const totalShares = posts.reduce((s, p) => s + (p.shares ?? p.metrics?.shares ?? 0), 0);
    const totalReach = posts.reduce((s, p) => s + (p.reach ?? p.metrics?.reach ?? 0), 0);
    const totalViews = posts.reduce((s, p) => s + (p.views ?? p.metrics?.views ?? 0), 0);

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">

                {/* Gradient Header */}
                <div className={`bg-gradient-to-r ${gradient} p-6 text-white flex-shrink-0`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
                                {icon}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Historia postów</h2>
                                <p className="text-white/80 text-sm">{connection.accountName} · {connection.platform}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => loadHistory(new AbortController().signal)}
                                disabled={isLoading}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                                title="Odśwież"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                                aria-label="Zamknij"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Summary stats */}
                    {posts.length > 0 && !isLoading && (
                        <div className="grid grid-cols-5 gap-2 mt-5">
                            {[
                                { icon: Heart, label: 'Polubień', value: fmt(totalLikes) },
                                { icon: MessageSquare, label: 'Komentarzy', value: fmt(totalComments) },
                                { icon: Share2, label: 'Udostępnień', value: fmt(totalShares) },
                                { icon: Eye, label: 'Wyświetleń', value: fmt(totalViews) },
                                { icon: TrendingUp, label: 'Zasięg', value: fmt(totalReach) },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                                    <Icon className="w-4 h-4 mx-auto mb-1 text-white/70" />
                                    <div className="text-base font-bold leading-tight">{value}</div>
                                    <div className="text-xs text-white/65 mt-0.5">{label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Posts list */}
                <div className="flex-grow overflow-y-auto p-5 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                            <p className="font-medium text-slate-600 dark:text-slate-300">Pobieranie postów i statystyk...</p>
                            <p className="text-sm text-slate-400 mt-1">To może chwilę potrwać</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-2">Coś poszło nie tak</h3>
                            <p className="text-red-700 dark:text-red-300 text-sm mb-5">{error}</p>
                            <button
                                onClick={() => loadHistory(new AbortController().signal)}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                            >
                                Spróbuj ponownie
                            </button>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-5">
                                <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg mb-1">Brak postów</h3>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto">
                                Nie znaleźliśmy żadnych postów z tego konta. Opublikuj coś i wróć tu!
                            </p>
                        </div>
                    ) : (
                        posts.map((post) => {
                            const likes = post.likes ?? post.metrics?.likes;
                            const comments = post.comments ?? post.metrics?.comments;
                            const shares = post.shares ?? post.metrics?.shares;
                            const views = post.views ?? post.metrics?.views;
                            const reach = post.reach ?? post.metrics?.reach;
                            const thumbnail = post.mediaUrl || post.mediaUrls?.[0];

                            return (
                                <div
                                    key={post.id}
                                    className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
                                >
                                    <div className="flex gap-4 p-5">
                                        {/* Thumbnail */}
                                        {thumbnail ? (
                                            <img
                                                src={thumbnail}
                                                alt="Post thumbnail"
                                                className="w-24 h-24 rounded-xl object-cover flex-shrink-0 bg-slate-200"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                <ImageIcon className="w-8 h-8 text-slate-400" />
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {timeAgo(post.publishedAt)}
                                                </div>
                                                <a
                                                    href={post.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-500 transition flex-shrink-0"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </div>

                                            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed">
                                                {post.content || <em className="text-slate-400">Brak opisu</em>}
                                            </p>

                                            {/* Metrics */}
                                            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                                                {likes !== undefined && (
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-500">
                                                        <Heart className="w-3.5 h-3.5" />
                                                        {fmt(likes)} <span className="font-normal text-slate-400">polubiło</span>
                                                    </span>
                                                )}
                                                {comments !== undefined && (
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-500">
                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                        {fmt(comments)} <span className="font-normal text-slate-400">koment.</span>
                                                    </span>
                                                )}
                                                {shares !== undefined && shares > 0 && (
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-500">
                                                        <Share2 className="w-3.5 h-3.5" />
                                                        {fmt(shares)} <span className="font-normal text-slate-400">udostępnień</span>
                                                    </span>
                                                )}
                                                {views !== undefined && views > 0 && (
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-500">
                                                        <Eye className="w-3.5 h-3.5" />
                                                        {fmt(views)} <span className="font-normal text-slate-400">wyśw.</span>
                                                    </span>
                                                )}
                                                {reach !== undefined && reach > 0 && (
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                                                        <TrendingUp className="w-3.5 h-3.5" />
                                                        {fmt(reach)} <span className="font-normal text-slate-400">zasięg</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 dark:border-slate-700 p-5 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 flex-shrink-0">
                    <span className="text-sm text-slate-400">
                        {posts.length > 0 && !isLoading ? `${posts.length} postów` : ''}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:shadow-lg transition font-semibold text-sm"
                    >
                        Zamknij
                    </button>
                </div>
            </div>
        </div>
    );
};

// Default export for lazy loading
export default SocialHistoryModal;
