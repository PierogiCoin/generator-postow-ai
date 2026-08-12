'use client';

import React, { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '@/stores/uiStore';
import { redeemDealCode } from '@/services/paymentService';
import { DEAL_TIERS } from '@/config/dealTiers';

function RedeemForm() {
  const { user, refreshUserCredits } = useAuth();
  const { setAuthModal } = useUIStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = searchParams.get('code');
    if (fromQuery) setCode(fromQuery);
  }, [searchParams]);

  const handleRedeem = useCallback(async () => {
    setError(null);
    setSuccess(null);
    if (!user) {
      setAuthModal('signup');
      return;
    }
    if (code.trim().length < 4) {
      setError('Wpisz kod z AppSumo lub Lifetime Deal');
      return;
    }
    setLoading(true);
    try {
      const result = await redeemDealCode(code);
      await refreshUserCredits();
      const tierName = DEAL_TIERS[result.tier as 1 | 2 | 3]?.namePl ?? `Tier ${result.tier}`;
      setSuccess(`Aktywowano ${tierName} (${result.credits.toLocaleString('pl-PL')} kredytów).`);
      setTimeout(() => router.push('/generator'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zrealizować kodu');
    } finally {
      setLoading(false);
    }
  }, [user, code, setAuthModal, refreshUserCredits, router]);

  return (
    <div className="min-h-screen bg-[#07090c] text-white flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--hero-accent)' }}
        >
          Aktywacja kodu
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
          Aktywuj kod dealu
        </h1>
        <p className="mt-3 text-slate-400 text-sm leading-relaxed">
          Wklej kod z AppSumo lub kampanii Lifetime. Stack upgrade (wyższy tier) też tutaj.
        </p>

        <label htmlFor="deal-code" className="mt-8 block text-sm font-medium text-slate-300">
          Kod
        </label>
        <div className="mt-2 relative">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            id="deal-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="np. AS-XXXX-XXXX"
            className="w-full min-h-[48px] pl-11 pr-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--hero-accent)]"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <button
          type="button"
          onClick={handleRedeem}
          disabled={loading}
          className="mt-6 w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-lg text-white font-semibold hover:brightness-110 disabled:opacity-50"
          style={{ backgroundColor: 'var(--hero-accent)' }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {user ? 'Aktywuj kod' : 'Zaloguj się i aktywuj'}
        </button>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {success && <p className="mt-4 text-sm text-emerald-400">{success}</p>}

        <p className="mt-8 text-sm text-slate-500">
          Nie masz kodu?{' '}
          <Link href="/deal" className="text-[var(--hero-accent)] underline underline-offset-2">
            Kup własny Lifetime Deal
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RedeemPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090c] flex items-center justify-center text-white">
          Ładowanie…
        </div>
      }
    >
      <RedeemForm />
    </Suspense>
  );
}
