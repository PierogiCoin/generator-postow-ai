import React from 'react';
import { Check, ShieldCheck, XCircle } from 'lucide-react';
import { UserPlan } from '@/types';
import { getPlanByUserPlan, formatUsageLimit } from '@/config/subscriptionPlans';

interface PricingSectionProps {
  onStartFree: () => void;
  onStartPro: () => void;
  onContactSales: () => void;
}

const freePlan = getPlanByUserPlan(UserPlan.Free);
const proPlan = getPlanByUserPlan(UserPlan.Pro);
const agencyPlan = getPlanByUserPlan(UserPlan.Agency);

const plans = [
  {
    id: 'free',
    name: freePlan.namePl,
    price: '0 zł',
    period: '',
    description: freePlan.descriptionPl,
    features: [
      `${formatUsageLimit(freePlan.credits)} kredytów na start`,
      'Podstawowe branże',
      '1 platforma social media',
    ],
    cta: 'Zacznij za darmo',
    badge: null as string | null,
    highlighted: false,
  },
  {
    id: 'pro',
    name: proPlan.namePl,
    price: `${proPlan.pricePln} zł`,
    period: '/mc',
    description: proPlan.descriptionPl,
    features: [
      `${formatUsageLimit(proPlan.credits)} kredytów miesięcznie`,
      'Wszystkie branże',
      '5 platform social media',
      'Analityka i strategista AI',
    ],
    cta: 'Zobacz plany i zapłać',
    badge: 'Najpopularniejszy',
    highlighted: true,
  },
  {
    id: 'agency',
    name: agencyPlan.namePl,
    price: `${agencyPlan.pricePln} zł`,
    period: '/mc',
    description: agencyPlan.descriptionPl,
    features: [
      `${formatUsageLimit(agencyPlan.credits)} kredytów miesięcznie`,
      'Multi-konta i ∞ kampanii',
      'Priorytetowe wsparcie',
    ],
    cta: 'Skontaktuj się / Agency',
    badge: null,
    highlighted: false,
  },
];

export const PricingSection: React.FC<PricingSectionProps> = ({
  onStartFree,
  onStartPro,
  onContactSales,
}) => {
  const handleCta = (id: string) => {
    if (id === 'free') onStartFree();
    else if (id === 'pro') onStartPro();
    else onContactSales();
  };

  return (
    <section id="cennik" className="scroll-mt-24 py-20 md:py-28 bg-[#050911] text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--hero-accent)' }}
          >
            Cennik
          </p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-extrabold tracking-tight">
            Prosty start — skaluj gdy rośniesz
          </h2>
          <p className="mt-3 text-slate-400 text-sm md:text-base">
            Free bez karty. Płatne plany przez Stripe. Lifetime Deal na osobnej stronie{' '}
            <a href="/deal" className="underline decoration-[var(--hero-accent)] underline-offset-2 hover:text-white">
              /deal
            </a>
            .
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 md:p-8 ${
                plan.highlighted
                  ? 'border-[var(--hero-accent)] bg-[var(--hero-accent)]/10'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              {plan.badge && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white rounded-full"
                  style={{ backgroundColor: 'var(--hero-accent)' }}
                >
                  {plan.badge}
                </span>
              )}
              <h3 className="font-display text-xl font-extrabold">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                {plan.period && <span className="text-slate-400 text-sm">{plan.period}</span>}
              </div>
              <p className="mt-3 text-sm text-slate-400 min-h-[2.5rem]">{plan.description}</p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--hero-accent)' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleCta(plan.id)}
                className={`mt-8 w-full min-h-[44px] rounded-lg text-sm font-semibold transition ${
                  plan.highlighted
                    ? 'text-white hover:brightness-110'
                    : 'border border-white/15 text-white hover:bg-white/5'
                }`}
                style={plan.highlighted ? { backgroundColor: 'var(--hero-accent)' } : undefined}
              >
                {String(plan.cta)}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-slate-400">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Płatności Stripe · faktura VAT
          </span>
          <span className="inline-flex items-center gap-2">
            <XCircle className="w-4 h-4 text-slate-500" />
            Anuluj subskrypcję kiedy chcesz
          </span>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
