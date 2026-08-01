/**
 * Lejek konwersji: wybór branż → zapis → signup / dashboard.
 * Używany jako krok „dopasuj do siebie” po problemie i rozwiązaniu.
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ModernButton } from './ui';
import { setUserNiche } from '../utils/userNiche';
import { SparklesIcon } from './icons/SparklesIcon';
import { getAllIndustryPacks, type IndustryPackId } from '../utils/industryPacks';
import {
  formatIndustriesLabel,
  getPendingIndustryIds,
  getUserIndustryIds,
  setPendingCustomIndustry,
  setPendingIndustryIds,
  setUserIndustryIds,
} from '../utils/userIndustries';

const primaryCtaClass =
  'rounded-lg px-8 py-3.5 !bg-[var(--hero-accent)] ![background-image:none] hover:brightness-110 text-white font-semibold shadow-none focus:!ring-[var(--hero-accent)]';

export interface IndustryFunnelHeroProps {
  reducedMotion: boolean;
  isLoggedIn: boolean;
  userId?: string | null;
  onContinue: (selectedIds: IndustryPackId[], customIndustry: string) => void;
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
    return pending;
  });
  const [customIndustry, setCustomIndustry] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (id: IndustryPackId) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleContinue = async () => {
    if (selected.length === 0 && !customIndustry.trim()) return;
    setSaving(true);
    try {
      if (isLoggedIn && userId) {
        await setUserIndustryIds(selected, { userId, syncRemote: true });
        if (customIndustry.trim()) setUserNiche(customIndustry.trim(), userId);
      } else {
        setPendingIndustryIds(selected);
        setPendingCustomIndustry(customIndustry);
        await setUserIndustryIds(selected, { syncRemote: false });
      }
      onContinue(selected, customIndustry.trim());
    } finally {
      setSaving(false);
    }
  };

  const selectedPacks = useMemo(
    () => packs.filter((p) => selected.includes(p.id)),
    [packs, selected]
  );
  const selectedLabel = formatIndustriesLabel(selected);
  const canContinue = selected.length > 0 || Boolean(customIndustry.trim());

  return (
    <section id="branze" className="relative scroll-mt-24 py-20 md:py-28 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-4">
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>{t('home.journey.gate_kicker')}</span>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto">
          {t('home.journey.gate_title')}
        </h2>
        <p className="mt-4 text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {t('home.journey.gate_subtitle')}
        </p>

        {/* Step indicator */}
        <div className="mt-8 flex items-center justify-center gap-3 text-xs font-medium text-slate-400">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--hero-accent)] text-white text-xs font-bold">1</span>
          <span className="text-white font-semibold">{t('home.funnel.pick_label')}</span>
          <span className="text-slate-600">→</span>
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-slate-400 text-xs font-bold">2</span>
          <span>{t('home.funnel.step2')}</span>
        </div>

        {/* Industry Card Selector Grid */}
        <div
          className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 text-left"
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
                className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between group ${
                  reducedMotion ? '' : 'hover:-translate-y-1'
                } ${
                  active
                    ? 'border-[var(--hero-accent)] bg-emerald-950/40 text-white shadow-lg shadow-emerald-500/10 ring-1 ring-[var(--hero-accent)]'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 text-slate-300'
                }`}
                style={reducedMotion ? undefined : { animationDelay: `${50 + i * 30}ms` }}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="text-2xl" aria-hidden="true">
                    {pack.icon}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                      active
                        ? 'bg-[var(--hero-accent)] text-slate-950'
                        : 'border border-white/20 text-transparent group-hover:border-white/40'
                    }`}
                  >
                    ✓
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">{pack.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {pack.nicheKeywords.slice(0, 2).join(', ')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Industry Input Block */}
        <div className="mt-5 max-w-xl mx-auto">
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-base">✍️</span>
            <input
              type="text"
              placeholder={t('home.funnel.custom_placeholder')}
              value={customIndustry}
              onChange={(e) => setCustomIndustry(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-white/[0.04] text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[var(--hero-accent)] focus:ring-1 focus:ring-[var(--hero-accent)] transition-all"
            />
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">{t('home.funnel.multi_hint')}</p>

        {/* Live Preview of Selected Industries */}
        {canContinue && (
          <div className="mt-8 p-5 rounded-2xl bg-white/[0.03] border border-white/10 max-w-2xl mx-auto text-left animate-home-rise">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <SparklesIcon className="w-4 h-4" />
                {t('home.funnel.title')}
              </span>
              <span className="text-xs text-slate-400">{t('home.funnel.selected_count', { count: selected.length + (customIndustry.trim() ? 1 : 0) })}</span>
            </div>
            <p className="text-sm text-slate-200">
              <span className="text-slate-400">{t('home.funnel.selected_prefix')}</span>{' '}
              <span className="font-semibold text-white">
                {selectedLabel}
                {customIndustry.trim() ? `${selectedLabel ? ', ' : ''}${customIndustry.trim()}` : ''}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedPacks.slice(0, 4).map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300">
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </span>
              ))}
              {customIndustry.trim() && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300">
                  <span>✍️</span>
                  <span>{customIndustry.trim()}</span>
                </span>
              )}
              {selectedPacks.length > 4 && (
                <span className="px-2.5 py-1 rounded-md bg-white/5 text-xs text-slate-400">
                  {t('home.funnel.more_count', { count: selectedPacks.length - 4 })}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-9 flex flex-col items-center gap-3">
          <ModernButton
            variant="primary"
            size="lg"
            onClick={() => void handleContinue()}
            disabled={!canContinue || saving}
            className={`${primaryCtaClass} w-full sm:w-auto text-base px-10 py-4 shadow-xl shadow-emerald-500/20 disabled:opacity-40 disabled:hover:brightness-100 transition-all`}
          >
            {saving
              ? t('home.funnel.saving')
              : t(isLoggedIn ? 'home.journey.gate_cta_logged_in' : 'home.journey.gate_cta')}
          </ModernButton>

          <p className="text-xs text-slate-500 max-w-md leading-relaxed mt-1">
            {t(isLoggedIn ? 'home.funnel.proof_logged_in' : 'home.journey.gate_proof')}
          </p>
        </div>
      </div>
    </section>
  );
};
