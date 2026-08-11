"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { matchIndustryPack, getAllIndustryPacks, getGastroSubNiches, applySubNicheToPack, type IndustryPack } from '@/utils/industryPacks';
import { persistIndustryNiche } from '@/utils/nicheContext';
import { setUserNiche } from '@/utils/userNiche';
import { getUserIndustryIds, toggleUserIndustry, addUserIndustry, formatIndustriesLabel } from '@/utils/userIndustries';
import type { IndustrySubNicheDef, IndustryPackId } from '@/shared/industryPacks';
import { Utensils, Scissors, Rocket, ShoppingCart, Dumbbell, Shirt, BookOpen, Wallet, Plus, ArrowRight } from 'lucide-react';

const PACK_LUCIDE_ICONS: Record<string, React.ElementType> = {
  'pl-lokal': Utensils,
  'pl-uroda': Scissors,
  'pl-it': Rocket,
  'pl-ecommerce': ShoppingCart,
  'pl-fitness': Dumbbell,
  'pl-fashion': Shirt,
  'pl-edukacja': BookOpen,
  'pl-finanse': Wallet,
};

const UserIndustriesManager: React.FC<{ userId: string; onChange: () => void }> = ({ userId, onChange }) => {
  const packs = getAllIndustryPacks();
  const [selected, setSelected] = useState<IndustryPackId[]>(() => getUserIndustryIds(userId));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(getUserIndustryIds(userId));
  }, [userId]);

  const handleToggle = async (id: IndustryPackId) => {
    setBusy(true);
    try {
      const next = await toggleUserIndustry(id, { userId, syncRemote: true });
      setSelected(next);
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const label = formatIndustriesLabel(selected);

  return (
    <div className="space-y-2.5" aria-label="Twoje branże">
      <p className="text-xs text-slate-400">
        {label
          ? <>Aktywne branże: <span className="font-semibold text-emerald-400">{label}</span>. Kliknij, żeby zmienić.</>
          : 'Zaznacz branże — treści i pomysły dopasują się do Twojego konta.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {packs.map((pack) => {
          const active = selected.includes(pack.id);
          const LucideIcon = PACK_LUCIDE_ICONS[pack.id];
          return (
            <button
              key={pack.id}
              type="button"
              disabled={busy}
              onClick={() => void handleToggle(pack.id)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 disabled:opacity-50 ${
                active
                  ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                  : 'border-white/10 text-slate-400 bg-white/5 hover:border-emerald-500/30 hover:text-emerald-400'
              }`}
            >
              {LucideIcon
                ? <LucideIcon className="w-3 h-3" aria-hidden />
                : <span aria-hidden className="text-xs">{pack.icon}</span>
              }
              {pack.name}
              {active
                ? <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-black">✓</span>
                : <Plus className="w-3 h-3 opacity-50" aria-hidden />
              }
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const IndustryPacks: React.FC<{ niche: string; userId?: string | null }> = ({ niche, userId }) => {
  const router = useRouter();
  const [nicheTick, setNicheTick] = useState(0);

  const matched = matchIndustryPack(niche);
  const packs = matched ? [matched, ...getAllIndustryPacks().filter((p) => p.id !== matched.id)] : getAllIndustryPacks();
  const primary = packs[0];
  
  const [activeSub, setActiveSub] = useState<IndustrySubNicheDef | null>(null);
  const gastroSubs = primary.id === 'pl-lokal' || matched?.id === 'pl-lokal' ? getGastroSubNiches() : [];

  useEffect(() => {
    if (matched?.subNicheId) {
      const sub = getGastroSubNiches().find((s) => s.id === matched.subNicheId) ?? null;
      setActiveSub(sub);
    } else {
      setActiveSub(null);
    }
  }, [matched?.subNicheId, matched?.id]);

  const activePack: IndustryPack =
    activeSub && (matched?.id === 'pl-lokal' || primary.id === 'pl-lokal')
      ? applySubNicheToPack(matched?.id === 'pl-lokal' ? matched : primary, activeSub)
      : matched ?? primary;

  const topicIdeas = activePack.topicIdeas.slice(0, 8);

  const openPack = (pack: IndustryPack, topic?: string) => {
    const audience = persistIndustryNiche(pack, userId, niche);
    if (userId) {
      void addUserIndustry(pack.id, { userId, syncRemote: true });
    }
    const params = new URLSearchParams();
    if (topic) params.set('topic', topic);
    params.set('niche', pack.id);
    params.set('audience', audience);
    router.push(`/generator?${params.toString()}`);
  };

  return (
    <section className="space-y-4" aria-label="Dla Twojej branży">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Dla Twojej branży
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {matched
              ? <>Gotowe formaty i pomysły dla: <span className="font-semibold" style={{ color: 'var(--hero-accent)' }}>{matched.subNicheLabel ? `${matched.name} · ${matched.subNicheLabel}` : matched.name}</span></>
              : 'Wybierz starter pack branżowy — temat, platforma i ton wypełnią się same.'}
          </p>
        </div>
      </div>

      {userId && <UserIndustriesManager userId={userId} onChange={() => setNicheTick(n => n + 1)} />}

      {/* Bento Grid — kafelki branżowe z glassmorphism */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {packs.slice(0, 8).map((pack) => {
          const isPrimary = matched?.id === pack.id;
          const LucideIcon = PACK_LUCIDE_ICONS[pack.id];
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => openPack(pack)}
              className={`text-left p-5 rounded-3xl border transition-all duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] group ${
                isPrimary
                  ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.04] backdrop-blur-xl ring-1 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl hover:scale-[1.02] hover:border-emerald-500/30'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                {LucideIcon
                  ? <LucideIcon className="w-5 h-5" aria-hidden />
                  : <span aria-hidden className="text-lg">{pack.icon}</span>
                }
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">{pack.name}</h3>
              <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                {pack.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                Generuj posty <ArrowRight className="w-3 h-3" aria-hidden />
              </span>
            </button>
          );
        })}
      </div>

      {gastroSubs.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2">
            Typ lokalu
          </p>
          <div className="flex flex-wrap gap-2">
            {gastroSubs.map((sub) => {
              const selected = activeSub?.id === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    const next = selected ? null : sub;
                    setActiveSub(next);
                    if (next) {
                      const pack = applySubNicheToPack(
                        matched?.id === 'pl-lokal' ? matched! : primary,
                        next
                      );
                      persistIndustryNiche(pack, userId, niche);
                    } else if (matched) {
                      setUserNiche(matched.name, userId);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 ${
                    selected
                      ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                      : 'border-white/10 text-slate-400 bg-white/5 hover:border-emerald-500/30 hover:text-emerald-400'
                  }`}
                >
                  <span aria-hidden className="text-xs">{sub.icon}</span>
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Szybkie pomysły — klikalne pill buttons */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-3">
          Szybkie pomysły{activeSub ? ` · ${activeSub.label}` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          {topicIdeas.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => openPack(activePack, idea)}
              className="px-3.5 py-1.5 text-xs font-medium rounded-full border border-white/10 bg-white/5 text-slate-300 hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all duration-200"
            >
              {idea.length > 56 ? `${idea.slice(0, 54)}…` : idea}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
