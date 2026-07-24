/**
 * Lejek konwersji: wybór branż → zapis → signup / dashboard.
 * Używany jako krok „dopasuj do siebie” po problemie i rozwiązaniu.
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ModernButton } from './ui';
import { SparklesIcon } from './icons/SparklesIcon';
import { getAllIndustryPacks, type IndustryPackId } from '../utils/industryPacks';
import {
  formatIndustriesLabel,
  getPendingIndustryIds,
  getUserIndustryIds,
  setPendingIndustryIds,
  setUserIndustryIds,
} from '../utils/userIndustries';

const primaryCtaClass =
  'rounded-lg px-8 py-3.5 !bg-[var(--hero-accent)] ![background-image:none] hover:brightness-110 text-white font-semibold shadow-none focus:!ring-[var(--hero-accent)]';

export interface IndustryFunnelHeroProps {
  reducedMotion: boolean;
  isLoggedIn: boolean;
  userId?: string | null;
  onContinue: (selectedIds: IndustryPackId[]) => void;
}

export const IndustryFunnelHero: React.FC<IndustryFunnelHeroProps> = ({
  reducedMotion,
  isLoggedIn,
  userId,
  onContinue,
}) => {
  const { t } = useTranslation();
  const packs = useMemo(() => getAllIndustryPacks(), []);

  const [selected, setSelected] = useState<IndustryPackId[]>(() => {
    if (userId) {
      const saved = getUserIndustryIds(userId);
      if (saved.length > 0) return saved;
    }
    const pending = getPendingIndustryIds();
    if (pending.length > 0) return pending;
    return getUserIndustryIds();
  });
  const [saving, setSaving] = useState(false);

  const toggle = (id: IndustryPackId) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleContinue = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      if (isLoggedIn && userId) {
        await setUserIndustryIds(selected, { userId, syncRemote: true });
      } else {
        setPendingIndustryIds(selected);
        await setUserIndustryIds(selected, { syncRemote: false });
      }
      onContinue(selected);
    } finally {
      setSaving(false);
    }
  };

  const selectedLabel = formatIndustriesLabel(selected);
  const canContinue = selected.length > 0;

  return (
    <section id="branze" className="relative scroll-mt-24 py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--hero-accent)] ${reducedMotion ? '' : 'animate-home-rise'}`}
        >
          {t('home.journey.gate_kicker')}
        </p>
        <h2 className="mt-3 font-display text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1]">
          {t('home.journey.gate_title')}
        </h2>
        <p className="mt-4 text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {t('home.journey.gate_subtitle')}
        </p>

        <div
          className="mt-10 flex flex-wrap justify-center gap-2.5"
          role="group"
          aria-label={t('home.journey.gate_title')}
        >
          {packs.map((pack, i) => {
            const active = selected.includes(pack.id);
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => toggle(pack.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-all duration-200 ${
                  reducedMotion ? '' : 'animate-home-rise'
                } ${
                  active
                    ? 'border-[var(--hero-accent)] text-[var(--hero-accent)] bg-[var(--hero-accent-soft)]'
                    : 'border-slate-300/80 dark:border-white/15 text-slate-700 dark:text-slate-300 bg-white/40 dark:bg-white/[0.03] hover:border-[var(--hero-accent)]/50'
                }`}
                style={reducedMotion ? undefined : { animationDelay: `${80 + i * 40}ms` }}
              >
                <span aria-hidden className="text-base leading-none">
                  {pack.icon}
                </span>
                <span>{pack.name}</span>
                {active && (
                  <span className="text-[10px] font-bold uppercase tracking-wider" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-slate-500">{t('home.funnel.multi_hint')}</p>

        {canContinue && (
          <p className="mt-6 text-sm text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2">
            <SparklesIcon className="w-4 h-4 text-[var(--hero-accent)]" />
            <span>
              {t('home.funnel.selected_prefix')}{' '}
              <span className="font-semibold">{selectedLabel}</span>
            </span>
          </p>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          <ModernButton
            variant="primary"
            size="lg"
            onClick={() => void handleContinue()}
            disabled={!canContinue || saving}
            className={`${primaryCtaClass} disabled:opacity-40 disabled:hover:brightness-100`}
          >
            {saving
              ? t('home.funnel.saving')
              : t(isLoggedIn ? 'home.journey.gate_cta_logged_in' : 'home.journey.gate_cta')}
          </ModernButton>
          <p className="text-xs text-slate-500 max-w-md leading-relaxed">
            {t(isLoggedIn ? 'home.funnel.proof_logged_in' : 'home.journey.gate_proof')}
          </p>
        </div>
      </div>
    </section>
  );
};
