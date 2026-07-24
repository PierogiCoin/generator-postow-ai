import React, { useState } from 'react';
import { BrandMemoryIngestPanel } from './BrandMemoryIngestPanel';
import { useAuth } from '../contexts/AuthContext';
import { useDataStore } from '../stores/dataStore';
import { useUIStore } from '../stores/uiStore';
import { SparklesIcon } from './icons/SparklesIcon';

/**
 * Widoczny hub Brand Memory na Dashboardzie — menu / o firmie bez wchodzenia w BV.
 */
export const BrandMemoryQuickCard: React.FC = () => {
  const { user } = useAuth();
  const { brandVoiceProfiles, activeBrandVoiceId } = useDataStore();
  const { setIsBrandVoiceManagerOpen } = useUIStore();
  const [expanded, setExpanded] = useState(false);

  const active = brandVoiceProfiles.find((p) => p.id === activeBrandVoiceId);
  const brandName = active?.settings.brandName || active?.name || '';
  const websiteUrl = active?.settings.websiteUrl || '';

  return (
    <section
      className="p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70 space-y-4"
      aria-label="Pamięć marki"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Pamięć marki
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Wklej menu, opis lokalu albo FAQ — AI użyje tego przy kolejnych postach.
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 shrink-0"
          style={{ color: 'var(--hero-accent)' }}
        >
          <SparklesIcon className="w-5 h-5" />
        </div>
      </div>

      {!expanded ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg text-white hover:brightness-110 transition"
            style={{ backgroundColor: 'var(--hero-accent)' }}
          >
            Dodaj menu / opis
          </button>
          <button
            type="button"
            onClick={() => setIsBrandVoiceManagerOpen(true)}
            className="px-4 py-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[var(--hero-accent)]/40 transition"
          >
            Otwórz Brand Voice
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <BrandMemoryIngestPanel
            userId={user?.id}
            defaultTitle={brandName}
            websiteUrl={websiteUrl}
          />
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Zwiń
          </button>
        </div>
      )}
    </section>
  );
};
