import React, { useState, useCallback, useEffect } from 'react';
import { Platform } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { getSupabase } from '../services/supabaseClient';
import {
  markOnboardingDone,
  buildFirstPostTopic,
  type OnboardingData,
  isOnboardingDone,
} from '../utils/onboarding';
import { matchIndustryPack, getIndustryPackById } from '../utils/industryPacks';
import { setUserNiche } from '../utils/userNiche';
import {
  formatIndustriesLabel,
  getPendingIndustryIds,
  getUserIndustryIds,
  setUserIndustryIds,
} from '../utils/userIndustries';
import type { IndustryPackId } from '../utils/industryPacks';

export type { OnboardingData };
export { isOnboardingDone };

const PLATFORM_OPTIONS = [
  { value: Platform.Instagram, label: 'Instagram', emoji: '📸' },
  { value: Platform.TikTok, label: 'TikTok', emoji: '🎵' },
  { value: Platform.Facebook, label: 'Facebook', emoji: '👥' },
  { value: Platform.LinkedIn, label: 'LinkedIn', emoji: '💼' },
  { value: Platform.YouTube, label: 'YouTube', emoji: '▶️' },
  { value: Platform.X, label: 'X (Twitter)', emoji: '𝕏' },
];

const NICHE_SUGGESTIONS = [
  'Gastronomia / lokal', 'Kawiarnia', 'Restauracja', 'Food truck', 'Piekarnia',
  'Fryzjer / beauty', 'B2B SaaS', 'E-commerce / sklep online',
  'Fitness & zdrowie', 'Moda & lifestyle', 'Edukacja & kursy', 'Finanse osobiste',
];

const TONE_OPTIONS = [
  { value: 'casual', label: 'Casualowy', desc: 'Luźny, przyjazny, naturalny' },
  { value: 'professional', label: 'Profesjonalny', desc: 'Ekspercki, poważny, merytoryczny' },
  { value: 'inspirational', label: 'Inspirujący', desc: 'Motywujący, energetyczny, emocjonalny' },
  { value: 'humorous', label: 'Humorystyczny', desc: 'Zabawny, lekki, angażujący' },
];

function toneValueFromPackTone(tone: string): string {
  const t = tone.toLowerCase();
  if (t === 'professional' || t === 'formal') return 'professional';
  if (t === 'inspirational' || t === 'enthusiastic') return 'inspirational';
  if (t === 'persuasive') return 'casual';
  return 'casual';
}

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState('');
  const [industryIds, setIndustryIds] = useState<IndustryPackId[]>([]);
  const [platform, setPlatform] = useState<Platform>(Platform.Instagram);
  const [tone, setTone] = useState('casual');
  const [brandKeywords, setBrandKeywords] = useState('');
  const [firstPostTopic, setFirstPostTopic] = useState('');

  const steps = ['Twoja nisza', 'Platforma', 'Styl', 'Pierwszy post'];

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const pending = getPendingIndustryIds();
    const saved = getUserIndustryIds();
    const ids = pending.length > 0 ? pending : saved;
    if (ids.length === 0) return;
    setIndustryIds(ids);
    const label = formatIndustriesLabel(ids);
    if (label) setNiche(label);
    const primary = getIndustryPackById(ids[0]);
    if (primary) {
      setPlatform(primary.platform);
      setTone(toneValueFromPackTone(primary.tone));
    }
  }, []);

  useEffect(() => {
    if (step === 3 && niche.trim().length >= 2 && !firstPostTopic.trim()) {
      setFirstPostTopic(buildFirstPostTopic(niche, platform));
    }
  }, [step, niche, platform, firstPostTopic]);

  const handleComplete = useCallback(async () => {
    setSaving(true);
    const brandVoice = brandKeywords.trim()
      ? `Ton: ${tone}. Słowa kluczowe marki: ${brandKeywords}.`
      : `Ton: ${tone}.`;
    const topic = firstPostTopic.trim() || buildFirstPostTopic(niche, platform);
    let userId: string | null = null;
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const nicheToSave =
          industryIds.length > 0 ? formatIndustriesLabel(industryIds) || niche : niche;
        await supabase.from('profiles').update({
          niche: nicheToSave,
          primary_platform: platform,
          brand_tone: tone,
          brand_keywords: brandKeywords.trim() || null,
          onboarding_done: true,
        }).eq('id', user.id);
        if (industryIds.length > 0) {
          await setUserIndustryIds(industryIds, { userId, syncRemote: false });
        }
      }
    } catch {
      // save failed — continue anyway, data is in localStorage
    } finally {
      markOnboardingDone(userId ?? undefined);
      const suffix = userId ? `_${userId}` : '';
      if (industryIds.length > 0) {
        void setUserIndustryIds(industryIds, { userId, syncRemote: Boolean(userId) });
      } else {
        setUserNiche(niche, userId);
      }
      localStorage.setItem(`userPlatform${suffix}`, platform);
      localStorage.setItem(`userTone${suffix}`, tone);
      localStorage.setItem('userPlatform', platform);
      localStorage.setItem('userTone', tone);
      setSaving(false);
      onComplete({
        niche: industryIds.length > 0 ? formatIndustriesLabel(industryIds) || niche : niche,
        platform,
        tone,
        brandVoice,
        firstPostTopic: topic,
      });
    }
  }, [niche, industryIds, platform, tone, brandKeywords, firstPostTopic, onComplete]);

  const canProceed = [
    niche.trim().length >= 2,
    true,
    true,
    firstPostTopic.replace(/<[^>]*>?/gm, '').trim().length >= 10,
  ][step];

  const platformLabel = PLATFORM_OPTIONS.find((p) => p.value === platform)?.label ?? platform;
  const toneLabel = TONE_OPTIONS.find((t) => t.value === tone)?.label ?? tone;
  const matchedPack = matchIndustryPack(niche);

  return (
    <div className="fixed inset-0 home-hero-wash flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="absolute inset-0 home-grid-bg opacity-40 pointer-events-none" aria-hidden="true" />
      <div className="relative w-full max-w-lg my-8">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-lg mb-4"
            style={{ backgroundColor: 'var(--hero-accent)' }}
          >
            <SparklesIcon className="w-7 h-7 text-white" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--hero-accent)' }}>
            Setup
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-white tracking-tight">
            Witaj w AI Content Pro
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Skonfiguruj profil i wygeneruj pierwszy post</p>
        </div>

        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 overflow-x-auto pb-1">
          {steps.map((label, i) => (
            <React.Fragment key={`step-${i}`}>
              <div className="flex flex-col items-center gap-1 min-w-[56px]">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-all ${
                    i < step
                      ? 'bg-emerald-500 text-white'
                      : i === step
                        ? 'text-white ring-2 ring-[var(--hero-accent)]/50'
                        : 'bg-white/10 text-slate-400'
                  }`}
                  style={i === step ? { backgroundColor: 'var(--hero-accent)' } : undefined}
                >
                  {i < step ? <CheckCircleIcon className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-[10px] sm:text-xs text-center ${
                    i === step ? 'text-[var(--hero-accent)] font-semibold' : 'text-slate-500'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 w-6 sm:w-8 mb-4 transition-all shrink-0 ${
                    i < step ? 'bg-emerald-500' : 'bg-white/10'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="border border-white/10 bg-white/[0.04] p-6 sm:p-8 rounded-lg">

          {step === 0 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="font-display text-xl font-bold text-white mb-1 tracking-tight">
                  {industryIds.length > 0 ? 'Potwierdź branże' : 'Jaka jest Twoja nisza?'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {industryIds.length > 0
                    ? 'Wybrane na stronie startowej — możesz dopisać własną niszę lub zmienić listę później w panelu.'
                    : 'AI będzie generować treści dopasowane do Twojej branży. Możesz zaznaczyć kilka.'}
                </p>
              </div>
              {industryIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {industryIds.map((id) => {
                    const pack = getIndustryPackById(id);
                    if (!pack) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white border border-[var(--hero-accent)]/40"
                        style={{ backgroundColor: 'var(--hero-accent-soft)' }}
                      >
                        <span aria-hidden>{pack.icon}</span>
                        {pack.name}
                      </span>
                    );
                  })}
                </div>
              )}
              <input
                type="text"
                value={niche}
                onChange={e => {
                  setNiche(e.target.value);
                  setFirstPostTopic('');
                }}
                placeholder="np. gastronomia, fryzjer, SaaS..."
                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--hero-accent)]/50"
                autoFocus
              />
              <div>
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">Szybki wybór</p>
                <div className="flex flex-wrap gap-2">
                  {NICHE_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setNiche(s);
                        setFirstPostTopic('');
                        const pack = matchIndustryPack(s);
                        if (pack) {
                          setIndustryIds((prev) =>
                            prev.includes(pack.id) ? prev : [...prev, pack.id]
                          );
                          setPlatform(pack.platform);
                          setTone(toneValueFromPackTone(pack.tone));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        niche === s || industryIds.some((id) => getIndustryPackById(id)?.name === s)
                          ? 'text-white'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                      }`}
                      style={
                        niche === s || industryIds.some((id) => matchIndustryPack(s)?.id === id)
                          ? { backgroundColor: 'var(--hero-accent)' }
                          : undefined
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {matchedPack && (
                  <p className="mt-3 text-xs text-emerald-400/90">
                    Dopasowano pack: {matchedPack.name} — platforma i ton ustawią się automatycznie.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="font-display text-xl font-bold text-white mb-1 tracking-tight">Główna platforma</h2>
                <p className="text-slate-400 text-sm">Gdzie przede wszystkim publikujesz treści?</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PLATFORM_OPTIONS.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPlatform(value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                      platform === value
                        ? 'border-[var(--hero-accent)] bg-[var(--hero-accent-soft)] text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-sm font-semibold">{label}</span>
                    {platform === value && (
                      <CheckCircleIcon className="w-4 h-4" style={{ color: 'var(--hero-accent)' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="font-display text-xl font-bold text-white mb-1 tracking-tight">Styl komunikacji</h2>
                <p className="text-slate-400 text-sm">Jak chcesz brzmieć? AI dopasuje ton wszystkich treści.</p>
              </div>
              <div className="space-y-2">
                {TONE_OPTIONS.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTone(value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      tone === value
                        ? 'border-[var(--hero-accent)] bg-[var(--hero-accent-soft)]'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        tone === value ? 'border-[var(--hero-accent)]' : 'border-slate-500'
                      }`}
                      style={tone === value ? { backgroundColor: 'var(--hero-accent)' } : undefined}
                    />
                    <div>
                      <p className={`text-sm font-semibold ${tone === value ? 'text-white' : 'text-slate-300'}`}>{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1.5">
                  Słowa kluczowe marki (opcjonalne)
                </label>
                <input
                  type="text"
                  value={brandKeywords}
                  onChange={e => setBrandKeywords(e.target.value)}
                  placeholder="np. autentyczny, nowoczesny, pro-ekologiczny"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--hero-accent)]/50"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="font-display text-xl font-bold text-white mb-1 tracking-tight">Twój pierwszy post</h2>
                <p className="text-slate-400 text-sm">
                  Sprawdź temat — po zakończeniu przejdziesz do generatora z gotowym prefill.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2 text-sm">
                <p className="text-slate-300"><span className="text-slate-500">Nisza:</span> {niche}</p>
                <p className="text-slate-300"><span className="text-slate-500">Platforma:</span> {platformLabel}</p>
                <p className="text-slate-300"><span className="text-slate-500">Ton:</span> {toneLabel}</p>
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1.5">
                  Temat pierwszego posta
                </label>
                <textarea
                  value={firstPostTopic.replace(/<[^>]*>?/gm, '')}
                  onChange={(e) => setFirstPostTopic(`<p>${e.target.value}</p>`)}
                  rows={4}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--hero-accent)]/50 resize-none"
                  placeholder="Opisz, o czym ma być pierwszy post..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-8">
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-0 transition-colors"
            >
              ← Wróć
            </button>
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed}
                className="px-6 py-2.5 text-white font-semibold rounded-lg transition-all hover:brightness-110 disabled:opacity-40"
                style={{ backgroundColor: 'var(--hero-accent)' }}
              >
                Dalej →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={saving || !canProceed}
                className="px-6 py-2.5 text-white font-semibold rounded-lg transition-all hover:brightness-110 disabled:opacity-60"
                style={{ backgroundColor: 'var(--hero-accent)' }}
              >
                {saving ? 'Zapisuję...' : 'Wygeneruj pierwszy post'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
