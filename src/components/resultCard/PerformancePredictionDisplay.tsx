'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { PerformancePrediction } from '../../types';
import { useGenerationStore } from '../../stores/generationStore';
import { TrendingUpIcon } from '../icons/TrendingUpIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BulbIcon } from '../icons/BulbIcon';
import { SkeletonCard } from '../ui/LoadingStates';

gsap.registerPlugin(useGSAP);

export const PerformancePredictionDisplay: React.FC<{
  result: PerformancePrediction | null;
  isLoading: boolean;
}> = ({ result, isLoading }) => {
  const { isPredictingPerformance } = useGenerationStore();
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!result) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          canAnimate: '(prefers-reduced-motion: no-preference)',
        },
        (context) => {
          if (context.conditions?.reduceMotion) {
            gsap.set('.perf-metric, .perf-tip, .perf-insight', { autoAlpha: 1, y: 0 });
            gsap.set('.perf-bar-fill', { width: (i, el) => `${(el as HTMLElement).dataset.value}%` });
            return;
          }

          gsap.set('.perf-bar-fill', { width: '0%' });

          const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

          tl.from('.perf-header', { autoAlpha: 0, y: 16, duration: 0.45 })
            .from('.perf-metric', { autoAlpha: 0, y: 20, duration: 0.5, stagger: 0.1 }, '-=0.2')
            .to(
              '.perf-bar-fill',
              {
                width: (i, el) => `${(el as HTMLElement).dataset.value}%`,
                duration: 0.9,
                stagger: 0.1,
                ease: 'power2.out',
              },
              '-=0.35'
            )
            .from('.perf-tip', { autoAlpha: 0, y: 12, duration: 0.4, stagger: 0.06 }, '-=0.4')
            .from('.perf-insight', { autoAlpha: 0, y: 12, duration: 0.4, stagger: 0.06 }, '<');
        }
      );

      return () => mm.revert();
    },
    {
      scope: rootRef,
      dependencies: [
        result
          ? `${result.reach.score}-${result.engagement.score}-${result.virality.score}`
          : 'none',
      ],
    }
  );

  if (isLoading || isPredictingPerformance) return <SkeletonCard />;
  if (!result) return null;

  const metrics = [
    { label: 'Zasięg (Reach)', value: result.reach.score, text: result.reach.label, color: 'from-blue-400 to-indigo-600' },
    {
      label: 'Zaangażowanie',
      value: result.engagement.score,
      text: result.engagement.label,
      color: 'from-pink-400 to-rose-600',
    },
    {
      label: 'Viralowość',
      value: result.virality.score,
      text: result.virality.label,
      color: 'from-amber-400 to-orange-600',
    },
  ];

  return (
    <div
      ref={rootRef}
      className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8 space-y-8"
    >
      <div className="perf-header flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <TrendingUpIcon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              Prognoza Wyników AI
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">
              Analiza prawdopodobieństwa sukcesu
            </p>
          </div>
        </div>
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest">
          Alpha v0.1
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {metrics.map((m) => (
          <div key={`metric-${m.label}`} className="perf-metric relative group">
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{m.label}</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{m.value}%</span>
            </div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
              <div
                className={`perf-bar-fill h-full rounded-full bg-gradient-to-r ${m.color} shadow-lg`}
                data-value={m.value}
                style={{ width: '0%' }}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${m.color}`} />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{m.text}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="space-y-4">
          <h5 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
            <SparklesIcon className="w-4 h-4 text-amber-500" />
            Wskazówki Optymalizacyjne
          </h5>
          <div className="space-y-3">
            {result.tips.map((tip, idx) => (
              <div
                key={idx}
                className="perf-tip flex gap-4 p-4 bg-white/50 dark:bg-slate-800/30 rounded-2xl border border-white/10"
              >
                <span
                  className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase self-start ${
                    tip.impact === 'High' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {tip.impact}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h5 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
            <BulbIcon className="w-4 h-4 text-blue-500" />
            Głębokie Insights
          </h5>
          <div className="space-y-3">
            {result.insights.map((ins, idx) => (
              <div
                key={idx}
                className="perf-insight p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/30 dark:border-blue-800/20"
              >
                <p className="text-xs text-blue-800 dark:text-blue-300 font-medium flex gap-3">
                  <span className="text-blue-500">•</span>
                  {ins.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
