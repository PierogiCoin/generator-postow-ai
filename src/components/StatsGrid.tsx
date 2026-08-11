import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDataStore } from '../stores/dataStore';
import { ArrowRight, FilePlus, CalendarPlus, PenLine } from 'lucide-react';
import { RocketLaunchIcon } from './icons/RocketLaunchIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';

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

export const StatsGrid: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { stats, scheduledPosts, drafts } = useDataStore();

    const oneWeekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const scheduledThisWeek = scheduledPosts.filter(p => p.scheduleTimestamp <= oneWeekFromNow).length;

    return (
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
    );
};
