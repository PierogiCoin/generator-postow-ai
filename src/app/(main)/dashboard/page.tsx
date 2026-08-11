"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppHandlers } from '@/hooks/useAppHandlers';
import { recordActivity, getStreakData } from '@/services/streakService';
import { getUserNiche } from '@/utils/userNiche';
import { matchIndustryPack } from '@/utils/industryPacks';
import { NotificationType, Platform } from '@/types';
import { platformConfig } from '@/config/platformConfig';

// Icons & Lucide
import { CalendarDays, Send, Clock, ArrowRight } from 'lucide-react';
import { PostIcon } from '@/components/icons/PostIcon';

// New Extracted Components
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { IndustryPacks } from '@/components/dashboard/IndustryPacks';
import { StrategyAssistant } from '@/components/dashboard/StrategyAssistant';

// Reused Existing Components
import { QuickCommandBar } from '@/components/QuickCommandBar';
import { StatsGrid } from '@/components/StatsGrid';
import { LazySection } from '@/components/ui/LazySection';
import { WeeklySummary } from '@/components/WeeklySummary';
import { ApprovalQueuePanel } from '@/components/ApprovalQueuePanel';
import { EngagementInboxPanel } from '@/components/EngagementInboxPanel';
import { RssToPostPanel } from '@/components/RssToPostPanel';
import { ProductToPostPanel } from '@/components/ProductToPostPanel';
import { BrandMemoryQuickCard } from '@/components/BrandMemoryQuickCard';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { LivePulse } from '@/components/LivePulse';
import { SocialStatusCard } from '@/components/SocialStatusCard';
import { ReferralCard } from '@/components/ReferralCard';
import { TrialBanner } from '@/components/TrialBanner';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const { history, scheduledPosts, brandVoiceProfiles, activeBrandVoiceId } = useDataStore();
  const { setIsCommandPaletteOpen } = useUIStore();
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

    if (socialSuccess === 'true') {
      notificationSystem.addToast(
        platform
          ? `Połączono konto ${platform}!`
          : 'Konto social zostało połączone!',
        NotificationType.Success
      );
      router.replace('/dashboard'); // Clear params
    } else if (socialError) {
      notificationSystem.addToast(
        decodeURIComponent(socialError),
        NotificationType.Error
      );
      router.replace('/dashboard');
    }
  }, [searchParams, router, notificationSystem]);

  if (!user) return null;

  const bvNiche = brandVoiceProfiles.find((p) => p.id === activeBrandVoiceId)?.settings?.niche?.trim();
  const niche = bvNiche || getUserNiche(user.id);
  const nichePack = matchIndustryPack(niche);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      <TrialBanner />
      
      <DashboardHero user={user} streak={streak} nichePack={nichePack} />

      <QuickCommandBar />

      <IndustryPacks niche={niche} userId={user.id} />
      
      <StatsGrid />

      <LazySection minHeight="h-96">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
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
          
          <div className="lg:col-span-1 space-y-8">
            <OnboardingChecklist />
            <LivePulse />
            <SocialStatusCard />
            <ReferralCard />

            {/* Nadchodzące posty — bento glassmorphism */}
            <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
              <h3 className="font-bold text-lg text-white mb-6 tracking-tight flex items-center gap-3">
                <span className="w-9 h-9 rounded-2xl flex items-center justify-center border border-white/10 bg-emerald-500/10 text-emerald-400">
                  <CalendarDays className="w-4 h-4" />
                </span>
                {t('dashboard.upcomingPosts', 'Nadchodzące posty')}
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
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set('inspirationId', item.id);
                          router.push(`/generator?${params.toString()}`);
                        }}
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
}
