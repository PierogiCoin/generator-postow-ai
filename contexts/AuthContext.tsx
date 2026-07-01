// contexts/AuthContext.tsx

import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo, useRef, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../services/supabaseClient';
import { User, UserPlan, Team } from '../types';
import { getPlanByUserPlan } from '../config/subscriptionPlans';
import { useDataStore } from '../stores/dataStore';
import { clearAllPersistedStores } from '../utils/storageUtils';

export interface AuthContextType {
  user: User | null;
  userPlan: UserPlan;
  authLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUserPlan: (newPlan: UserPlan) => void;
  adjustCredits: (delta: number) => void;
  refreshUserCredits: () => Promise<{ credits: number; plan: UserPlan } | null>;
  setCurrentTeamId: (teamId: string | null) => void;
  authModal: 'login' | 'signup' | null;
  setAuthModal: React.Dispatch<React.SetStateAction<'login' | 'signup' | null>>;
  currentTeamId: string | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);


// Helper for timeout – avoids generic syntax that is misinterpreted as JSX in .tsx
function withTimeout(promise: PromiseLike<any>, ms: number, label: string): Promise<any> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)
    )
  ]);
}

// Wakes up the Supabase project with a cheap anon REST ping.
// Free-tier projects pause after 7 days of inactivity; the first request after
// a pause can take 20-60 s. This ping ensures the project is awake before we
// try to check the auth session.
async function wakeUpSupabase(supabase: SupabaseClient): Promise<void> {
  try {
    await withTimeout(
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      5000,
      'wake_ping'
    );
  } catch {
    // Ignore – if the ping fails we still try auth
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
  const [loading, setLoading] = useState(true);
  const initialCheckDone = useRef(false);
  const syncInProgress = useRef<string | null>(null);

  const setDataStoreState = useDataStore(state => state.setState);

  const supabase = useMemo(() => {
    try {
      return getSupabase();
    } catch {
      return null;
    }
  }, []);

  const fetchAndSetUserData = async (sbUser: any) => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    if (syncInProgress.current === sbUser.id) {
      return;
    }
    syncInProgress.current = sbUser.id;

    try {
      // 1. Fetch Profile (Critical) – 20 s timeout, one silent retry
      let profileData: any = null;
      try {
        const profileQuery = supabase
          .from('profiles')
          .select('*')
          .eq('id', sbUser.id)
          .maybeSingle();

        let pd: any;
        try {
          pd = await withTimeout(profileQuery, 8000, 'profiles_fetch');
        } catch (timeoutErr: unknown) {
          if (timeoutErr instanceof Error && timeoutErr.message?.includes('Timeout')) {
            await new Promise(res => setTimeout(res, 500));
            pd = await withTimeout(
              supabase.from('profiles').select('*').eq('id', sbUser.id).maybeSingle(),
              8000,
              'profiles_fetch_retry'
            );
          } else {
            throw timeoutErr;
          }
        }

        if (pd?.error) {
          // profile fetch error — use defaults
        } else {
          profileData = pd?.data;
        }
      } catch {
        // profile unavailable — use defaults
      }

      const resolvedPlan = (profileData?.plan as UserPlan) || UserPlan.Free;
      const planDefaults = getPlanByUserPlan(resolvedPlan);

      const combinedUser: User = {
        id: sbUser.id,
        email: sbUser.email || '',
        name: profileData?.name || sbUser.email?.split('@')[0] || 'User',
        plan: resolvedPlan,
        credits:
          typeof profileData?.credits === 'number' ? profileData.credits : planDefaults.credits,
        teams: [],
        currentTeamId: profileData?.current_team_id || null
      };

      setUser(combinedUser);
      setLoading(false); // Show app ASAP

      // 2. Auto-create profile in background if missing
      if (!profileData) {
        const defaultProfile = {
          id: sbUser.id,
          name: combinedUser.name,
          plan: UserPlan.Free,
          credits: getPlanByUserPlan(UserPlan.Free).credits,
          usage: { text: 0, image: 0, video: 0, campaign: 0, learnStyle: 0 },
          current_team_id: null,
        };
        supabase.from('profiles').upsert(defaultProfile);
      }

      // 3. Fetch secondary data (non-critical) incrementally with 8 s timeouts
      const fetchTable = async (table: string, orderCol = 'timestamp', ascending = false) => {
        try {
          const result = await withTimeout(
            supabase.from(table).select('*').order(orderCol, { ascending }),
            8000,
            `${table}_fetch`
          ) as any;
          return result?.error ? [] : (result?.data || []);
        } catch {
          return [];
        }
      };

      fetchTable('history').then((data: any) => setDataStoreState({ history: data }));
      fetchTable('favorites').then((data: any) => setDataStoreState({ favorites: data }));
      fetchTable('templates', 'created_at', true).then((data: any) => setDataStoreState({ templates: data }));
      fetchTable('drafts').then((data: any) => setDataStoreState({ drafts: data }));
      fetchTable('scheduled_posts', 'scheduled_at', true).then((data: any) => setDataStoreState({ scheduledPosts: data }));
      fetchTable('brand_voice_profiles', 'name', true).then((data: any) => setDataStoreState({ brandVoiceProfiles: data }));

      // New persistent modules
      // Strategic Audits (get latest)
      fetchTable('strategic_audits', 'timestamp', false).then((data: any) => {
        if (data.length > 0) setDataStoreState({ strategicAuditReport: data[0].report });
      });

      // Calendar Plans (get latest)
      fetchTable('calendar_plans', 'timestamp', false).then((data: any) => {
        if (data.length > 0) setDataStoreState({ intelligentCalendarPlan: data[0].plan });
      });

      // Deep Memory (Learned Insights)
      fetchTable('learned_insights', 'id', false).then((data: any) => {
        if (data.length > 0) setDataStoreState({ learnedInsights: data.map((d: any) => ({ ...d, id: d.id.toString() })) });
      });

      const usage = (profileData?.usage || {}) as Record<string, number>;
      const totalCount = Object.values(usage).reduce(
        (acc: number, val: any) => acc + (Number(val) || 0),
        0
      ) as number;

      setDataStoreState({
        stats: {
          byPlatform: {},
          byTone: {},
          byContentType: {},
          byModel: {},
          byGenerationType: usage as any,
          totalGenerations: totalCount
        }
      });

    } catch {
      // sync failed — app still usable
      setLoading(false);
    } finally {
      syncInProgress.current = null;
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Awaryjnie odblokuj UI — np. po powrocie z OAuth Facebook
    const loadingGuard = setTimeout(() => setLoading(false), 8000);

    let isSubscribed = true;

    const checkInitialSession = async () => {
      if (initialCheckDone.current) return;
      initialCheckDone.current = true;

      try {
        const [, sessionResult] = await Promise.all([
          wakeUpSupabase(supabase),
          withTimeout(supabase.auth.getSession(), 10000, 'getSession'),
        ]);

        const { data, error } = sessionResult;
        if (error) throw error;

        const session = data?.session;
        if (session?.user && isSubscribed) {
          await fetchAndSetUserData(session.user);
        } else if (isSubscribed) {
          setUser(null);
          setLoading(false);
        }
      } catch {
        if (isSubscribed) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!isSubscribed) return;

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        await fetchAndSetUserData(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setDataStoreState({
          stats: null,
          brandVoiceProfiles: [],
          favorites: [],
          templates: [],
          history: [],
          drafts: [],
          scheduledPosts: []
        });
        setLoading(false);
      }
    });

    checkInitialSession();

    return () => {
      isSubscribed = false;
      clearTimeout(loadingGuard);
      subscription.unsubscribe();
    };
  }, [supabase, setDataStoreState]);

  const login = async (email: string, pass: string) => {
    if (!supabase) throw new Error('Database unavailable');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const signup = async (email: string, pass: string) => {
    if (!supabase) throw new Error('Database unavailable');
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { name: email.split('@')[0] } }
    });
    if (error) throw error;
  };

  const logout = async () => {
    setUser(null);
    // Clear persisted Zustand stores
    clearAllPersistedStores();
    try {
      if (supabase) await supabase.auth.signOut();
    } catch {
      // signOut failed — user is already logged out locally
    }
  };

  const updateUserPlan = (newPlan: UserPlan) => {
    if (user) {
      const planCredits = getPlanByUserPlan(newPlan).credits;
      setUser({ ...user, plan: newPlan, credits: user.credits ?? planCredits });
    }
  };

  const adjustCredits = (delta: number) => {
    setUser((curr) =>
      curr ? { ...curr, credits: Math.max(0, (curr.credits ?? 0) + delta) } : null
    );
  };

  const refreshUserCredits = useCallback(async (): Promise<{ credits: number; plan: UserPlan } | null> => {
    if (!user?.id || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits, plan')
        .eq('id', user.id)
        .maybeSingle();
      if (error || !data) return null;

      const plan = (data.plan as UserPlan) || user.plan;
      const credits =
        typeof data.credits === 'number' ? data.credits : getPlanByUserPlan(plan).credits;

      setUser((curr) =>
        curr ? { ...curr, plan, credits } : null
      );

      return { credits, plan };
    } catch {
      return null;
    }
  }, [user?.id, user?.plan, supabase]);

  const setCurrentTeamId = async (teamId: string | null) => {
    if (!user || !supabase) return;
    setUser(curr => curr ? ({ ...curr, currentTeamId: teamId }) : null);
    await supabase.from('profiles').update({ current_team_id: teamId }).eq('id', user.id);
  };

  const value: AuthContextType = {
    user,
    userPlan: user?.plan || UserPlan.Free,
    authLoading: loading,
    login,
    signup,
    logout,
    updateUserPlan,
    adjustCredits,
    refreshUserCredits,
    setCurrentTeamId,
    authModal,
    setAuthModal,
    currentTeamId: user?.currentTeamId || null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};