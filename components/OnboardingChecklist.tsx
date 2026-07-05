/**
 * OnboardingChecklist — progress checklist dla nowych użytkowników.
 * Śledzi kluczowe kroki onboarding i pokazuje progress bar.
 * Kroki: uzupełnij profil, wygeneruj pierwszy post, podłącz social media.
 *
 * Dane znikają po ukończeniu wszystkich kroków lub po 30 dniach.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../services/supabaseClient';
import { analytics, AnalyticsEvents } from '../services/analytics';
import { CheckCircle2, Circle, User, FileText, Share2, X, Trophy } from 'lucide-react';

const STORAGE_KEY = 'onboarding-checklist-dismissed';
const STEPS = [
  { id: 'profile', label: 'Uzupełnij profil', icon: User, description: 'Dodaj markę i branżę' },
  { id: 'first_post', label: 'Wygeneruj pierwszy post', icon: FileText, description: 'Stwórz treść AI' },
  { id: 'social', label: 'Podłącz social media', icon: Share2, description: 'Połącz platformy' },
] as const;

type StepId = typeof STEPS[number]['id'];

export const OnboardingChecklist: React.FC = () => {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<Set<StepId>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(STORAGE_KEY)) {
      setDismissed(true);
      return;
    }

    (async () => {
      const supabase = getSupabase();
      const steps = new Set<StepId>();

      // Sprawdź profil — czy ma uzupełnione niche/primary_platform
      const { data: profile } = await supabase
        .from('profiles')
        .select('niche, primary_platform, onboarding_done')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.niche && profile?.primary_platform) {
        steps.add('profile');
      }

      // Sprawdź czy wygenerował pierwszy post
      const { count: postCount } = await supabase
        .from('history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (postCount && postCount > 0) {
        steps.add('first_post');
      }

      // Sprawdź czy podłączył social media
      const { count: connCount } = await supabase
        .from('social_connections')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (connCount && connCount > 0) {
        steps.add('social');
      }

      setCompleted(steps);
      setLoading(false);

      // Track onboarding progress
      analytics.track(AnalyticsEvents.ONBOARDING_STEP, {
        completed: Array.from(steps).join(','),
        total: STEPS.length,
        progress: steps.size / STEPS.length,
      });
    })();
  }, [user]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  }, []);

  if (!user || dismissed || loading) return null;
  if (completed.size === STEPS.length) return null;

  const progress = Math.round((completed.size / STEPS.length) * 100);

  return (
    <div className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        aria-label="Zamknij"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Rozpocznij swoją przygodę
        </h3>
        <span className="ml-auto text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {STEPS.map((step) => {
          const isDone = completed.has(step.id);
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                isDone
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-slate-50 dark:bg-slate-800/50'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
              )}
              <Icon className={`w-4 h-4 ${isDone ? 'text-green-500' : 'text-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isDone ? 'text-green-700 dark:text-green-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-slate-400">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {progress === 100 && (
        <p className="mt-3 text-center text-sm text-green-600 dark:text-green-400 font-medium">
          🎉 Wszystko gotowe! Powodzenia!
        </p>
      )}
    </div>
  );
};
