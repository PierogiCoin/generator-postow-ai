/**
 * ReferralCard — komponent UI pokazujący kod polecający, link,
 * statystyki i listę poleconych osób.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { referralService, ReferralData } from '../services/referralService';
import { analytics, AnalyticsEvents } from '../services/analytics';
import { Gift, Copy, Check, Users, Coins, Share2 } from 'lucide-react';

export const ReferralCard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const result = await referralService.getReferralData();
    setData(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user || loading || !data) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    analytics.track(AnalyticsEvents.REFERRAL_LINK_SHARED, { code: data.referralCode });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Content Pro',
          text: 'Spróbuj AI Content Pro — twórz viralowe posty z AI! Otrzymasz 200 kredytów na start.',
          url: data.referralLink,
        });
        analytics.track(AnalyticsEvents.REFERRAL_LINK_SHARED, { method: 'native_share' });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1c2e] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--hero-accent)' }}
        >
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="font-display font-extrabold tracking-tight text-slate-900 dark:text-white text-sm">
            Poleć i zarabiaj
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Otrzymaj {data.rewards.referrer} kr za każdego poleconego
          </p>
        </div>
      </div>

      <div className="bg-[var(--hero-surface)] dark:bg-[#071018] border border-slate-200/80 dark:border-white/10 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={data.referralLink}
            className="flex-1 min-w-0 bg-transparent text-xs text-slate-600 dark:text-slate-300 outline-none truncate"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg bg-[var(--hero-accent-soft)] text-[var(--hero-accent)] hover:brightness-95 transition-colors touch-manipulation"
            aria-label="Kopiuj link"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="border border-slate-200 dark:border-white/10 rounded-lg p-2 text-center bg-[var(--hero-surface)]/60 dark:bg-[#071018]/60">
          <Users className="w-4 h-4 mx-auto mb-1 text-[var(--hero-accent)]" />
          <p className="text-lg font-extrabold text-slate-900 dark:text-white">{data.stats.totalReferrals}</p>
          <p className="text-[10px] text-slate-400">poleconych</p>
        </div>
        <div className="border border-slate-200 dark:border-white/10 rounded-lg p-2 text-center bg-[var(--hero-surface)]/60 dark:bg-[#071018]/60">
          <Check className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
          <p className="text-lg font-extrabold text-slate-900 dark:text-white">{data.stats.completedReferrals}</p>
          <p className="text-[10px] text-slate-400">ukończonych</p>
        </div>
        <div className="border border-slate-200 dark:border-white/10 rounded-lg p-2 text-center bg-[var(--hero-surface)]/60 dark:bg-[#071018]/60">
          <Coins className="w-4 h-4 mx-auto text-amber-500 mb-1" />
          <p className="text-lg font-extrabold text-slate-900 dark:text-white">{data.stats.totalEarned}</p>
          <p className="text-[10px] text-slate-400">kr zarobionych</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleShare}
        className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg hover:brightness-110 transition touch-manipulation"
        style={{ backgroundColor: 'var(--hero-accent)' }}
      >
        <Share2 className="w-4 h-4" />
        Udostępnij link
      </button>

      {data.referrals.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Ostatnie polecenia</p>
          {data.referrals.slice(0, 3).map((ref) => (
            <div key={ref.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {new Date(ref.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
              </span>
              <span className={`font-medium ${ref.reward_claimed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                {ref.reward_claimed ? `+${data.rewards.referrer} kr` : 'oczekuje'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
