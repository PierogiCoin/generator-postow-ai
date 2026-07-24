/**
 * Lejek sprzedażowy na landingu: wybór 1+ branż → przypisanie do konta / signup.
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
  onSkipToHowItWorks: () => void;
}

export const IndustryFunnelHero: React.FC<IndustryFunnelHeroProps> = ({
  reducedMotion,
  isLoggedIn,
  userId,
  onContinue,
  onSkipToHowItWorks,
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
  const [stepHint, setStepHint] = useState<'pick' | 'ready'>('pick');

  const toggle = (id: IndustryPackId) => {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setStepHint(next.length > 0 ? 'ready' : 'pick');
      return next;
    });
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
    <section className="relative w-full home-hero-wash text-white overflow-hidden">
      <div className="absolute inset-0 home-grid-bg opacity-60 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[min(90vw,720px)] h-[420px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--hero-accent) 35%, transparent), transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #050d16, transparent)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-28 md:pt-32 pb-16 md:pb-20 text-center">
        <p
          className={`font-display text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '0ms' }}
        >
          {t('home.hero.brand')}
        </p>
        <div
          className={`mx-auto mt-5 h-px w-24 ${reducedMotion ? 'bg-[var(--hero-accent)]' : 'animate-home-line bg-[var(--hero-accent)]'}`}
          aria-hidden="true"
        />

        <ol
          className={`mt-8 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '80ms' }}
          aria-label={t('home.funnel.steps_aria')}
        >
          <li className="px-3 py-1 rounded-md border border-[var(--hero-accent)]/50 text-[var(--hero-accent)] bg-[var(--hero-accent-soft)]">
            {t('home.funnel.step1')}
          </li>
          <li className="text-slate-600" aria-hidden>
            →
          </li>
          <li className="px-3 py-1 rounded-md border border-white/10">{t('home.funnel.step2')}</li>
          <li className="text-slate-600" aria-hidden>
            →
          </li>
          <li className="px-3 py-1 rounded-md border border-white/10">{t('home.funnel.step3')}</li>
        </ol>

        <h1
          className={`mt-6 text-xl sm:text-2xl md:text-3xl font-medium text-slate-200 tracking-tight leading-snug max-w-2xl mx-auto ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '120ms' }}
        >
          {t('home.funnel.title')}
        </h1>
        <p
          className={`mt-4 max-w-xl mx-auto text-base md:text-lg text-slate-400 leading-relaxed ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '200ms' }}
        >
          {t('home.funnel.subtitle')}
        </p>

        <div
          className={`mt-10 ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '280ms' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 mb-4">
            {t('home.funnel.pick_label')}
          </p>
          <div
            className="flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto"
            role="group"
            aria-label={t('home.funnel.pick_label')}
          >
            {packs.map((pack) => {
              const active = selected.includes(pack.id);
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => toggle(pack.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-all duration-200 ${
                    active
                      ? 'border-[var(--hero-accent)] text-white bg-[var(--hero-accent)]/20 shadow-[0_0_0_1px_var(--hero-accent)]'
                      : 'border-white/15 text-slate-300 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]'
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">
                    {pack.icon}
                  </span>
                  <span>{pack.name}</span>
                  {active && (
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80" aria-hidden>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">{t('home.funnel.multi_hint')}</p>
        </div>

        <div
          className={`mt-9 flex flex-col items-center gap-3 ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '360ms' }}
        >
          {canContinue && (
            <p className="text-sm text-slate-300 flex items-center gap-2">
              <SparklesIcon className="w-4 h-4" style={{ color: 'var(--hero-accent)' }} />
              <span>
                {t('home.funnel.selected_prefix')}{' '}
                <span className="font-semibold text-white">{selectedLabel}</span>
                {selected.length > 1 ? ` (${selected.length})` : ''}
              </span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            <ModernButton
              variant="primary"
              size="lg"
              onClick={() => void handleContinue()}
              disabled={!canContinue || saving}
              className={`${primaryCtaClass} disabled:opacity-40 disabled:hover:brightness-100`}
            >
              {saving
                ? t('home.funnel.saving')
                : t(isLoggedIn ? 'home.funnel.cta_logged_in' : 'home.funnel.cta')}
            </ModernButton>
            <ModernButton
              variant="outline"
              size="lg"
              onClick={onSkipToHowItWorks}
              className="rounded-lg px-8 py-3.5 border-white/20 text-slate-200 bg-transparent hover:bg-white/5 hover:border-white/35 transition-colors duration-300"
            >
              {t('home.funnel.secondary_cta')}
            </ModernButton>
          </div>

          <p className="text-xs text-slate-500 max-w-md leading-relaxed">
            {stepHint === 'ready'
              ? t(isLoggedIn ? 'home.funnel.proof_logged_in' : 'home.funnel.proof')
              : t('home.funnel.proof_idle')}
          </p>
          <p className="text-[11px] text-slate-600">{t('home.funnel.later_hint')}</p>
        </div>
      </div>
    </section>
  );
};
