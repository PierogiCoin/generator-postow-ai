import React from 'react';
import { Check, ShieldCheck, XCircle } from 'lucide-react';

interface PricingSectionProps {
  onStartFree: () => void;
  onStartPro: () => void;
  onContactSales: () => void;
}

const plans = [
  {
    id: 'free',
    name: 'Darmowy',
    price: '0 zł',
    period: '',
    description: '10 kredytów, podstawowe branże, 1 platforma.',
    features: ['10 kredytów na start', 'Podstawowe branże', '1 platforma social media'],
    cta: 'Zacznij za darmo',
    badge: null,
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '99 zł',
    period: '/mc',
    description: '100 kredytów/mc, wszystkie branże, 5 platform, auto-publikacja.',
    features: [
      '100 kredytów miesięcznie',
      'Wszystkie branże',
      '5 platform social media',
      'Auto-publikacja',
    ],
    cta: 'Wypróbuj 7 dni za darmo',
    badge: 'Najpopularniejszy',
    highlighted: true,
    proof: 'Kuba z Wrocławia generuje 30 postów miesięcznie',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 'Indywidualnie',
    period: '',
    description: '500 kredytów, multi-konta, priority support.',
    features: ['500 kredytów miesięcznie', 'Multi-konta', 'Priorytetowe wsparcie'],
    cta: 'Skontaktuj się',
    badge: null,
    highlighted: false,
  },
];

export const PricingSection: React.FC<PricingSectionProps> = ({ onStartFree, onStartPro, onContactSales }) => {
  const handleCta = (id: string) => {
    if (id === 'free') onStartFree();
    else if (id === 'pro') onStartPro();
    else onContactSales();
  };

  return (
    <section id="cennik" className="scroll-mt-24 py-20 md:py-28 bg-[#050911] text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">
            Cennik
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Wybierz plan, który rośnie razem z Tobą
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col p-6 md:p-8 rounded-3xl border transition-all duration-300 ${
                plan.highlighted
                  ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.03] shadow-[0_0_30px_rgba(16,185,129,0.15)] scale-[1.02]'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-black text-[11px] font-bold uppercase tracking-wider shadow-lg">
                  {plan.badge}
                </span>
              )}

              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                {plan.period && <span className="text-sm text-slate-400">{plan.period}</span>}
              </div>
              <p className="mt-2 text-sm text-slate-400">{plan.description}</p>

              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.proof && (
                <div className="mt-4 p-3 rounded-xl bg-black/40 backdrop-blur border border-white/10 text-xs text-slate-200 flex items-center gap-2">
                  <span className="text-emerald-400">⚡</span>
                  <span>{plan.proof}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleCta(plan.id)}
                className={`mt-6 w-full px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                  plan.highlighted
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" /> Bez karty na start
          </span>
          <span className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-emerald-400" /> Anuluj w każdej chwili
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> SSL / Bezpieczne płatności Stripe
          </span>
        </div>
      </div>
    </section>
  );
};
