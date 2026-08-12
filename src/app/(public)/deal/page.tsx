'use client';

import React, { Suspense, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Infinity, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '@/stores/uiStore';
import {
  redirectToLifetimeCheckout,
  setPendingLifetimeCheckout,
} from '@/services/paymentService';
import { OWN_LTD_PRICE_PLN, DEAL_TIERS } from '@/config/dealTiers';
import { getPlanByUserPlan } from '@/config/subscriptionPlans';
import { UserPlan } from '@/types';

const benefits = [
  'Jednorazowa opłata — bez miesięcznej subskrypcji',
  `${DEAL_TIERS[1].monthlyCredits.toLocaleString('pl-PL')} kredytów odnawianych co miesiąc`,
  'Analityka AI, strategista i kalendarz publikacji',
  'Możliwość stack upgrade (Tier 2 / 3) przez kody AppSumo',
];

function DealPageContent() {
  const { user } = useAuth();
  const { setAuthModal } = useUIStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled') === '1';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proPrice = getPlanByUserPlan(UserPlan.Pro).pricePln;

  const handleBuy = useCallback(async () => {
    setError(null);
    if (!user) {
      setPendingLifetimeCheckout();
      setAuthModal('signup');
      return;
    }
    if (user.plan === UserPlan.Lifetime) {
      router.push('/dashboard');
      return;
    }
    setLoading(true);
    try {
      await redirectToLifetimeCheckout(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się otworzyć płatności');
      setLoading(false);
    }
  }, [user, setAuthModal, router]);

  return (
    <div className="min-h-screen bg-[#07090c] text-white">
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 home-hero-wash opacity-90"
        />
        <div className="relative max-w-5xl mx-auto px-4 pt-20 pb-16 md:pt-28 md:pb-24">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'var(--hero-accent)' }}
          >
            Generator Postów AI
          </p>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-3xl leading-[1.05]">
            Lifetime Deal
          </h1>
          <p className="mt-5 text-lg text-slate-300 max-w-xl leading-relaxed">
            Jednorazowy dostęp do generatora postów AI — limity jak Pro, bez miesięcznej opłaty.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleBuy}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-7 rounded-lg text-base font-semibold text-white hover:brightness-110 disabled:opacity-50"
              style={{ backgroundColor: 'var(--hero-accent)' }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
              Kup LTD — {OWN_LTD_PRICE_PLN} zł
            </button>
            <Link
              href="/redeem"
              className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-lg text-base font-semibold border border-white/15 text-white hover:bg-white/5"
            >
              Mam kod AppSumo
            </Link>
          </div>

          {canceled && (
            <p className="mt-4 text-sm text-amber-300">Płatność anulowana — możesz spróbować ponownie.</p>
          )}
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-white/5">
        <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
          Co dostajesz
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 text-slate-200">
              <Check className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--hero-accent)' }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-white/5">
        <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
          LTD vs Pro miesięcznie
        </h2>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[var(--hero-accent)]/40 bg-[var(--hero-accent)]/10 p-6">
            <div className="flex items-center gap-2 text-[var(--hero-accent)] font-semibold text-sm uppercase tracking-wider">
              <Infinity className="w-4 h-4" />
              Lifetime
            </div>
            <p className="mt-3 text-3xl font-extrabold">{OWN_LTD_PRICE_PLN} zł</p>
            <p className="mt-1 text-sm text-slate-400">jednorazowo</p>
            <p className="mt-4 text-sm text-slate-300">
              Po ~{Math.ceil(OWN_LTD_PRICE_PLN / proPrice)} miesiącach Pro wychodzi taniej zostać przy LTD.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Pro</p>
            <p className="mt-3 text-3xl font-extrabold">{proPrice} zł</p>
            <p className="mt-1 text-sm text-slate-400">miesięcznie</p>
            <p className="mt-4 text-sm text-slate-300">
              Elastyczna subskrypcja z trialem 7 dni (wymaga karty). Idealna, gdy wolisz miesięczne rozliczenie.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-white/5">
        <h2 className="font-display text-2xl font-extrabold">FAQ</h2>
        <dl className="mt-8 space-y-6 text-sm md:text-base">
          <div>
            <dt className="font-semibold text-white">Czy to działa z AppSumo?</dt>
            <dd className="mt-1 text-slate-400">
              Tak — po zakupie na AppSumo wejdź na{' '}
              <Link href="/redeem" className="underline text-[var(--hero-accent)]">
                /redeem
              </Link>{' '}
              i wpisz kod. Stack (Tier 2/3) też przez redeem.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-white">Czy kredyty się odnawiają?</dt>
            <dd className="mt-1 text-slate-400">
              Tak — soft-cap miesięczny jak w Pro. Dokupisz pakiety kredytów, gdy skończą się w trakcie miesiąca.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-white">Potrzebuję konta przed zakupem?</dt>
            <dd className="mt-1 text-slate-400">
              Tak — CTA otworzy rejestrację, potem wrócisz do Stripe Checkout.
            </dd>
          </div>
        </dl>

        <div className="mt-12">
          <button
            type="button"
            onClick={handleBuy}
            disabled={loading}
            className="inline-flex items-center gap-2 min-h-[48px] px-7 rounded-lg font-semibold text-white hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: 'var(--hero-accent)' }}
          >
            Kup Lifetime — {OWN_LTD_PRICE_PLN} zł
          </button>
        </div>
      </section>
    </div>
  );
}

export default function DealPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090c] flex items-center justify-center text-white">
          Ładowanie…
        </div>
      }
    >
      <DealPageContent />
    </Suspense>
  );
}
