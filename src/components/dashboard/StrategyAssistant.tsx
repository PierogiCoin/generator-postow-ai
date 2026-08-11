"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Sparkles, TrendingUp, Lightbulb } from 'lucide-react';
import { getStrategicContentIdeas } from '@/services/geminiService';
import { getUserNiche } from '@/utils/userNiche';
import { matchIndustryPack, industryPackToFormPrefill } from '@/utils/industryPacks';
import { persistIndustryNiche } from '@/utils/nicheContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/stores/dataStore';
import type { StrategicIdea } from '@/types';

export const StrategyAssistant: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [ideas, setIdeas] = useState<StrategicIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  
  const { brandVoiceProfiles, activeBrandVoiceId } = useDataStore();
  const activeBv = brandVoiceProfiles.find((p) => p.id === activeBrandVoiceId);
  const niche =
    activeBv?.settings?.niche?.trim() ||
    getUserNiche(user?.id);

  useEffect(() => {
    const fetchIdeas = async () => {
      if (!user) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await getStrategicContentIdeas(niche, undefined, user.id);
        setIdeas(result);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Nie udało się pobrać strategicznych pomysłów.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchIdeas();
  }, [niche, user, retryTrigger]);

  const onGenerateFromIdea = (topic: string) => {
    const pack = matchIndustryPack(niche);
    const params = new URLSearchParams();
    if (topic) params.set('topic', topic);
    
    if (pack) {
      const audience = persistIndustryNiche(pack, user?.id, niche);
      params.set('niche', pack.id);
      params.set('audience', audience);
    } else {
      params.set('audience', niche);
    }
    
    router.push(`/generator?${params.toString()}`);
  };

  const IdeaTypeIcon: React.FC<{ type: StrategicIdea['type'] }> = ({ type }) => {
    switch (type) {
      case 'Trending': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      case 'Content Gap': return <Lightbulb className="w-5 h-5 text-amber-500" />;
      case 'Evergreen': return <Sparkles className="w-5 h-5 text-cyan-500" />;
      default: return <Sparkles className="w-5 h-5 text-slate-500" />;
    }
  }

  return (
    <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-xl text-white tracking-tight">Asystent Strategiczny</h3>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.14em] mt-1">
            Wskazówki dla marki: <span className="text-emerald-400">{niche}</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 bg-emerald-500/10 text-emerald-400">
          <Sparkles className="w-5 h-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="p-4 rounded-2xl border border-white/10 bg-white/5 animate-pulse">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex-shrink-0" />
                <div className="space-y-2 flex-grow min-w-0">
                  <div className="h-3 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
          <p className="text-sm font-semibold text-red-400 mb-4">{error}</p>
          <button
            onClick={() => setRetryTrigger(prev => prev + 1)}
            className="px-5 py-2.5 text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:brightness-110 transition inline-flex items-center gap-2"
            style={{ backgroundColor: 'var(--hero-accent)' }}
          >
            <RefreshCw className="w-4 h-4" />
            Spróbuj ponownie
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea, index) => (
            <div key={`idea-${index}`} className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-emerald-500/30 transition-colors group">
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3 min-w-0">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/10">
                    <IdeaTypeIcon type={idea.type} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--hero-accent)' }}>{idea.type}</span>
                    <h4 className="text-sm font-bold text-white leading-tight mt-0.5">{idea.title}</h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">"{idea.strategy}"</p>
                  </div>
                </div>
                <button
                  onClick={() => onGenerateFromIdea(idea.title)}
                  className="shrink-0 px-3 py-2 border text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors"
                  style={{
                    color: 'var(--hero-accent)',
                    borderColor: 'color-mix(in srgb, var(--hero-accent) 35%, transparent)',
                    backgroundColor: 'var(--hero-accent-soft)',
                  }}
                >
                  Stwórz
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
