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
          title: 'Generator Postów AI',
          text: 'Spróbuj Generator Postów AI — twórz viralowe posty z AI! Otrzymasz 200 kredytów na start.',
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
    <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">Poleć i zarabiaj</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Otrzymaj {data.rewards.referrer} kr za każdego poleconego
          </p>
        </div>
      </div>

      {/* Link do udostępniania */}
      <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={data.referralLink}
            className="flex-1 bg-transparent text-xs text-slate-600 dark:text-slate-300 outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-colors"
            aria-label="Kopiuj link"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-2 text-center">
          <Users className="w-4 h-4 mx-auto text-violet-500 mb-1" />
          <p className="text-lg font-bold text-slate-900 dark:text-white">{data.stats.totalReferrals}</p>
          <p className="text-[10px] text-slate-400">poleconych</p>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-2 text-center">
          <Check className="w-4 h-4 mx-auto text-green-500 mb-1" />
          <p className="text-lg font-bold text-slate-900 dark:text-white">{data.stats.completedReferrals}</p>
          <p className="text-[10px] text-slate-400">ukończonych</p>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-2 text-center">
          <Coins className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
          <p className="text-lg font-bold text-slate-900 dark:text-white">{data.stats.totalEarned}</p>
          <p className="text-[10px] text-slate-400">kr zarobionych</p>
        </div>
      </div>

      {/* Przycisk udostępnij */}
      <button
        onClick={handleShare}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
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
              <span className={`font-medium ${ref.reward_claimed ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                {ref.reward_claimed ? `+${data.rewards.referrer} kr` : 'oczekuje'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
