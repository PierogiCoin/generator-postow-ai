"use client";

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/stores/dataStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppHandlers } from '@/hooks/useAppHandlers';
import { recordActivity, getStreakData } from '@/services/streakService';
import { getUserNiche } from '@/utils/userNiche';
import { matchIndustryPack } from '@/utils/industryPacks';
import { NotificationType, Platform, UserPlan } from '@/types';
import { platformConfig } from '@/config/platformConfig';

import { CalendarDays, Send, Clock, ArrowRight } from 'lucide-react';
import { PostIcon } from '@/components/icons/PostIcon';

import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { StatsGrid } from '@/components/StatsGrid';
import { TrialBanner } from '@/components/TrialBanner';
import { DealActivationBanner } from '@/components/DealActivationBanner';

const IslandFallback = ({ className = 'h-48' }: { className?: string }) => (
  <div className={`w-full rounded-2xl bg-white/5 border border-white/10 animate-pulse ${className}`} aria-hidden />
);

/** Below-fold islands — code-split so first paint stays light */
const WeeklySummary = dynamic(
  () => import('@/components/WeeklySummary').then((m) => m.WeeklySummary),
  { loading: () => <IslandFallback className="h-56" /> }
);
const ApprovalQueuePanel = dynamic(
  () => import('@/components/ApprovalQueuePanel').then((m) => m.ApprovalQueuePanel),
  { loading: () => <IslandFallback className="h-40" /> }
);
const EngagementInboxPanel = dynamic(
  () => import('@/components/EngagementInboxPanel').then((m) => m.EngagementInboxPanel),
  { loading: () => <IslandFallback className="h-40" /> }
);
const RssToPostPanel = dynamic(
  () => import('@/components/RssToPostPanel').then((m) => m.RssToPostPanel),
  { loading: () => <IslandFallback className="h-36" /> }
);
const ProductToPostPanel = dynamic(
  () => import('@/components/ProductToPostPanel').then((m) => m.ProductToPostPanel),
  { loading: () => <IslandFallback className="h-36" /> }
);
const BrandMemoryQuickCard = dynamic(
  () => import('@/components/BrandMemoryQuickCard').then((m) => m.BrandMemoryQuickCard),
  { loading: () => <IslandFallback className="h-32" /> }
);
const StrategyAssistant = dynamic(
  () => import('@/components/dashboard/StrategyAssistant').then((m) => m.StrategyAssistant),
  { loading: () => <IslandFallback className="h-48" /> }
);
const OnboardingChecklist = dynamic(
  () => import('@/components/OnboardingChecklist').then((m) => m.OnboardingChecklist),
  { loading: () => <IslandFallback className="h-40" /> }
);
const LivePulse = dynamic(
  () => import('@/components/LivePulse').then((m) => m.LivePulse),
  { loading: () => <IslandFallback className="h-32" /> }
);
const SocialStatusCard = dynamic(
  () => import('@/components/SocialStatusCard').then((m) => m.SocialStatusCard),
  { loading: () => <IslandFallback className="h-36" /> }
);
const ReferralCard = dynamic(
  () => import('@/components/ReferralCard').then((m) => m.ReferralCard),
  { loading: () => <IslandFallback className="h-28" /> }
);
const IndustryPacks = dynamic(
  () => import('@/components/dashboard/IndustryPacks').then((m) => m.IndustryPacks),
  { loading: () => <IslandFallback className="h-64" /> }
);
const QuickCommandBar = dynamic(
  () => import('@/components/QuickCommandBar').then((m) => m.QuickCommandBar),
  { loading: () => <IslandFallback className="h-20" /> }
);

function DashboardClientInner() {
  const { user, refreshUserCredits } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const { history, scheduledPosts, brandVoiceProfiles, activeBrandVoiceId } = useDataStore();
  const notificationSystem = useNotifications();
  const handlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);

  const [streak, setStreak] = useState(() => getStreakData());

  useEffect(() => {
    if (user) {
      const updated = recordActivity();
      setStreak(updated);
    }
  }, [user]);

  useEffect(() => {
    const socialSuccess = searchParams?.get('socialSuccess');
    const socialError = searchParams?.get('socialError');
    const platform = searchParams?.get('platform');
    const checkout = searchParams?.get('checkout');

    if (checkout === 'lifetime' || checkout === 'success' || checkout === 'trial') {
      notificationSystem.addToast(
        checkout === 'lifetime'
          ? 'Lifetime Deal aktywowany! Czas na pierwszy post.'
          : checkout === 'trial'
            ? 'Trial Pro aktywowany.'
            : 'Płatność zakończona sukcesem.',
        NotificationType.Success
      );
      void refreshUserCredits();
      router.replace('/dashboard');
      return;
    }

    if (socialSuccess === 'true') {
      notificationSystem.addToast(
        platform
          ? `Połączono konto ${platform}!`
          : 'Konto social zostało połączone!',
        NotificationType.Success
      );
      router.replace('/dashboard');
    } else if (socialError) {
      notificationSystem.addToast(
        decodeURIComponent(socialError),
        NotificationType.Error
      );
      router.replace('/dashboard');
    }
  }, [searchParams, router, notificationSystem, refreshUserCredits]);

  if (!user) return null;

  const bvNiche = brandVoiceProfiles.find((p) => p.id === activeBrandVoiceId)?.settings?.niche?.trim();
  const niche = bvNiche || getUserNiche(user.id);
  const nichePack = matchIndustryPack(niche);
  const upcoming = scheduledPosts.filter((p) => p.status === 'scheduled').slice(0, 4);

  return (
    <div className="page-shell">
      <DealActivationBanner />
      {user.plan !== UserPlan.Lifetime && <TrialBanner />}

      <DashboardHero user={user} streak={streak} nichePack={nichePack} />
      <StatsGrid />

      <div className="page-work-grid">
        <div className="space-y-8 content-auto min-w-0">
          <WeeklySummary />

          <div className="space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 px-1">
              Wymaga Twojej uwagi
            </h2>
            <ApprovalQueuePanel />
            <EngagementInboxPanel />
          </div>

          <div className="space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 px-1">
              Automatyzacje
            </h2>
            <RssToPostPanel />
            <ProductToPostPanel />
            <BrandMemoryQuickCard />
          </div>

          <StrategyAssistant />
        </div>

        <aside className="space-y-6 content-auto-sm cq-inline min-w-0">
          <OnboardingChecklist />
          <LivePulse />
          <SocialStatusCard />
          <ReferralCard />

          <div className="dashboard-rail-panel rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
            <h3 className="font-bold text-lg text-white mb-5 tracking-tight flex items-center gap-3">
              <span className="w-9 h-9 rounded-2xl flex items-center justify-center border border-white/10 bg-emerald-500/10 text-emerald-400 shrink-0">
                <CalendarDays className="w-4 h-4" />
              </span>
              {t('dashboard.upcomingPosts', 'Nadchodzące posty')}
            </h3>

            {upcoming.length > 0 ? (
              <div className="space-y-2">
                {upcoming.map((post) => {
                  const config = platformConfig[post.formData?.platform || Platform.Facebook];
                  return (
                    <div
                      key={post.id}
                      className="group relative flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-white/5 hover:border-emerald-500/30 transition-all duration-200 min-w-0"
                    >
                      <div className={`w-10 h-10 rounded-xl ${config?.selectedBgColor || 'bg-white/10'} flex items-center justify-center shrink-0 border border-white/10`}>
                        {config && <config.icon className={`w-5 h-5 ${config.iconColor}`} />}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <p className="text-sm font-semibold text-white truncate" title={post.formData?.topic}>
                          {post.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                        </p>
                        <div className="rail-meta flex items-center gap-2 mt-0.5">
                          <CalendarDays className="w-3 h-3 text-emerald-400" />
                          <p className="text-[10px] font-medium text-slate-400 tabular-nums">
                            {new Date(post.scheduleTimestamp).toLocaleString('pl-PL', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
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
              <div className="text-center py-8 rounded-2xl border border-dashed border-white/10">
                <CalendarDays className="w-6 h-6 text-slate-600 mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kolejka jest pusta</p>
                <p className="rail-meta text-[11px] text-slate-500 mt-1">Zaplanuj swój pierwszy post</p>
              </div>
            )}
          </div>

          <div className="dashboard-rail-panel rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
            <h3 className="font-bold text-lg text-white mb-5 tracking-tight flex items-center gap-3">
              <span className="w-9 h-9 rounded-2xl flex items-center justify-center border border-white/10 bg-emerald-500/10 text-emerald-400 shrink-0">
                <Clock className="w-4 h-4" />
              </span>
              Ostatnie Dzieła
            </h3>

            {history.length > 0 ? (
              <div className="space-y-2">
                {history.slice(0, 4).map((item) => {
                  const platform = item.formData?.platform || Platform.Facebook;
                  const config = platformConfig[platform];
                  const Icon = config?.icon || PostIcon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        const params = new URLSearchParams();
                        params.set('inspirationId', item.id);
                        router.push(`/generator?${params.toString()}`);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-white/5 hover:border-emerald-500/30 transition-all duration-200 text-left group min-w-0"
                    >
                      <div className={`w-10 h-10 rounded-xl ${config?.selectedBgColor || 'bg-white/10'} flex items-center justify-center shrink-0 border border-white/10`}>
                        <Icon className={`w-5 h-5 ${config?.iconColor || 'text-slate-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate" title={item.formData?.topic}>
                          {item.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}
                        </p>
                        <p className="rail-meta text-[10px] font-medium text-slate-400 mt-0.5 tabular-nums">
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
        </aside>
      </div>

      <section className="space-y-8 content-auto pt-2" aria-label="Eksploracja i komendy">
        <IndustryPacks niche={niche} userId={user.id} />
        <QuickCommandBar />
      </section>
    </div>
  );
}

export function DashboardClient() {
  return (
    <Suspense fallback={<div className="page-shell"><IslandFallback className="h-72" /><IslandFallback className="h-40" /></div>}>
      <DashboardClientInner />
    </Suspense>
  );
}
