"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '../icons/SparklesIcon';
import { TrendingUpIcon } from '../icons/TrendingUpIcon';
import { RocketLaunchIcon } from '../icons/RocketLaunchIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { Send } from 'lucide-react';
import { User } from '@/types';
import type { IndustryPack } from '@/utils/industryPacks';

interface DashboardHeroProps {
  user: User;
  streak: { currentStreak: number; longestStreak: number };
  nichePack: IndustryPack | null | undefined;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({ user, streak, nichePack }) => {
  const router = useRouter();
  const { t } = useTranslation();

  const quickPlaceholder = nichePack?.topicIdeas[0]
    ?? 'Np. 3 wskazówki na zwiększenie sprzedaży w restauracji...';

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  };

  const navigateToGenerator = (topic: string) => {
    const params = new URLSearchParams();
    if (topic) params.set('topic', topic);
    if (nichePack) params.set('niche', nichePack.id);
    router.push(`/generator?${params.toString()}`);
  };

  return (
    <header
      onMouseMove={handleMouseMove}
      className="relative py-10 md:py-14 px-6 md:px-12 rounded-3xl border border-white/10 bg-gradient-to-br from-[#071018]/90 via-[#0b1728]/90 to-[#0e2137]/90 text-white shadow-2xl overflow-hidden backdrop-blur-xl group"
      style={{ '--spot-x': '50%', '--spot-y': '40%' } as React.CSSProperties}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
        style={{
          background:
            'radial-gradient(600px circle at var(--spot-x) var(--spot-y), rgba(16, 185, 129, 0.15), transparent 80%)',
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 home-grid-bg opacity-20 pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 space-y-6 max-w-4xl mx-auto text-center md:text-left">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {t('dashboard.systemOnline', 'System Online')}
            </span>
            {streak.currentStreak > 0 && (
              <span
                className="px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-extrabold flex items-center gap-1 shadow-sm backdrop-blur-md"
                title={t('dashboard.longestStreak', { count: streak.longestStreak })}
              >
                🔥 {t('dashboard.streakDays', { count: streak.currentStreak })}
              </span>
            )}
          </div>
        </div>

        <div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Witaj ponownie,{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 animate-gradient">
              {user.name.split(' ')[0]}
            </span>
            !
          </h1>
          <p className="text-base text-slate-300 mt-3 max-w-2xl leading-relaxed">
            {nichePack
              ? `Szybka ścieżka dla ${nichePack.name}: wpisz temat i generuj.`
              : 'Wpisz temat poniżej i pozwól AI wykonać pracę.'}
          </p>
        </div>

        <div className="p-3 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center gap-2 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
          <div className="flex-1 flex items-center gap-3 px-4 w-full min-w-0">
            <SparklesIcon className="w-5.5 h-5.5 text-emerald-400 shrink-0 animate-pulse" />
            <input
              type="text"
              placeholder={quickPlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  navigateToGenerator(e.currentTarget.value.trim());
                }
              }}
              className="w-full min-w-0 bg-transparent text-white placeholder-slate-400 text-sm md:text-base font-medium focus:outline-none py-2.5"
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling?.querySelector('input');
              const val = input?.value?.trim() || quickPlaceholder;
              navigateToGenerator(val);
            }}
            className="relative group/btn overflow-hidden w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 shrink-0 flex items-center justify-center gap-2"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
            <Send className="w-4 h-4" />
            <span>Generuj Post</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
          <button
            type="button"
            onClick={() => router.push('/calendar')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all active:scale-95 hover:scale-105 shadow-sm"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
            Kalendarz
          </button>
          <button
            type="button"
            onClick={() => router.push('/analytics')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all active:scale-95 hover:scale-105 shadow-sm"
          >
            <TrendingUpIcon className="w-3.5 h-3.5 text-emerald-400" />
            Analityka
          </button>
          <button
            type="button"
            onClick={() => router.push('/trends')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all active:scale-95 hover:scale-105 shadow-sm"
          >
            <RocketLaunchIcon className="w-3.5 h-3.5 text-pink-400" />
            Trendy
          </button>
          <button
            type="button"
            onClick={() => router.push('/strategist')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all active:scale-95 hover:scale-105 shadow-sm"
          >
            <SparklesIcon className="w-3.5 h-3.5 text-purple-400" />
            Strateg AI
          </button>
        </div>
      </div>
    </header>
  );
};
