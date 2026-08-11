import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/uiStore';
import { History, RefreshCw, Wifi, Plus, Link as SocialLinkIcon } from 'lucide-react';
import { SocialHistoryModal } from './SocialHistoryModal';
import { socialConnectionsService } from '../services/socialConnectionsService';
import { loadAutoPublishPrefs } from '../utils/autoPublishPrefs';
import type { SocialConnection } from '../types/socialPublishing';

const PLATFORM_ICONS: Record<string, string> = {
    facebook: '👥', instagram: '📸', linkedin: '💼', twitter: '𝕏', tiktok: '🎵'
};
const PLATFORM_NAMES: Record<string, string> = {
    facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', twitter: 'X (Twitter)', tiktok: 'TikTok'
};

export const SocialStatusCard: React.FC = () => {
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
                    <h3 className="text-xl font-bold text-white tracking-tight">{t('dashboard.social.title', 'Połączone konta')}</h3>
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
                                  : t('dashboard.social.connectedOnly', 'KONTO POŁĄCZONE · AUTO-PUBLIKACJA: WYŁĄCZONA')}
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
