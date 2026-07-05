/**
 * CreditBank — pokazuje niewykorzystane kredyty, które przejdą na kolejny miesiąc.
 * Loss aversion tactic: użytkownik widzi że ma "zaoszczędzone" kredyty,
 * co zmniejsza chęć anulowania subskrypcji.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPlanByUserPlan } from '../config/subscriptionPlans';
import { UserPlan } from '../types';
import { PiggyBank, TrendingUp, Info } from 'lucide-react';

interface RolloverEntry {
  id: string;
  rolled_over: number;
  previous_balance: number;
  new_balance: number;
  plan: string;
  created_at: string;
}

export const CreditBank: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<RolloverEntry[]>([]);
  const [totalRolled, setTotalRolled] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const planConfig = getPlanByUserPlan((user?.plan as UserPlan) || UserPlan.Free);
  const currentCredits = user?.credits ?? planConfig.credits;
  const rolloverCap = Math.floor(planConfig.credits * 0.5);
  const potentialRollover = Math.min(currentCredits, rolloverCap);

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      try {
        const supabase = (await import('../services/supabaseClient')).getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const { getApiBaseUrl } = await import('../services/apiClient');
        const res = await fetch(`${getApiBaseUrl()}/api/payments/rollover-history`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setHistory(data.history || []);
        setTotalRolled(data.totalRolledOver || 0);
      } catch {
        // silent
      }
    };
    fetchHistory();
  }, [user]);

  if ((user?.plan as UserPlan) === UserPlan.Free) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
            <PiggyBank className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Bank Kredytów</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Niewykorzystane kredyty przechodzą na kolejny miesiąc
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label="Informacje"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {showInfo && (
        <div className="mt-3 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Kredyty niewykorzystane w danym miesiącu automatycznie przechodzą na kolejny (max 50% limitu planu).
          To nasz sposób powiedzenia "dziękujemy" za lojalność — nie tracisz tego, za co zapłaciłeś.
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Potencjalny rollover</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {potentialRollover.toLocaleString('pl-PL')}
          </p>
          <p className="text-[10px] text-slate-400">z max {rolloverCap.toLocaleString('pl-PL')}</p>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Łącznie przeniesione</p>
          <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
            {totalRolled.toLocaleString('pl-PL')}
          </p>
          <p className="text-[10px] text-slate-400">w historii konta</p>
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Ostatnie przeniesienia
          </p>
          {history.slice(0, 3).map((entry) => (
            <div key={entry.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {new Date(entry.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
              </span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                +{entry.rolled_over.toLocaleString('pl-PL')} kr.
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
