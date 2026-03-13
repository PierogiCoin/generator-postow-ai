// contexts/AuthContext.tsx

import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../services/supabaseClient';
import { User, UserPlan, Team } from '../types';
import { useDataStore } from '../stores/dataStore';

export interface AuthContextType {
  user: User | null;
  userPlan: UserPlan;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUserPlan: (newPlan: UserPlan) => void;
  setCurrentTeamId: (teamId: string | null) => void;
  authModal: 'login' | 'signup' | null;
  setAuthModal: React.Dispatch<React.SetStateAction<'login' | 'signup' | null>>;
  currentTeamId: string | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const mockTeams: Team[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Agencja Kreatywna',
    members: [
      { id: 'test-user-123', name: 'Ty', email: 'test@example.com', role: 'manager' },
      { id: 'member-1', name: 'Jan Kowalski', email: 'jan@example.com', role: 'member' }
    ]
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'E-commerce Glow',
    members: [
      { id: 'test-user-123', name: 'Ty', email: 'test@example.com', role: 'member' },
      { id: 'manager-2', name: 'Anna Nowak', email: 'anna@example.com', role: 'manager' }
    ]
  }
];

// Helper for timeout – avoids generic syntax that is misinterpreted as JSX in .tsx
function withTimeout(promise: Promise<any>, ms: number, label: string): Promise<any> {
  return Promise.race([
    promise,
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
      Promise.resolve(supabase.from('profiles').select('id', { count: 'exact', head: true })),
      10000,
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
    } catch (e) {
      console.warn('Supabase not ready yet...');
      return null;
    }
  }, []);

  const fetchAndSetUserData = async (sbUser: any) => {
    if (!supabase) return;
    if (syncInProgress.current === sbUser.id) return;
    syncInProgress.current = sbUser.id;

    console.log(`[Auth] Syncing profile for user: ${sbUser.id}`);
    try {
      // 1. Fetch Profile (Critical) – 20 s timeout, one silent retry
      let profileData: any = null;
      try {
        const profileQuery = () =>
          supabase.from('profiles').select('*').eq('id', sbUser.id).maybeSingle();

        let pd: any;
        try {
          pd = await withTimeout(Promise.resolve(profileQuery()), 20000, 'profiles_fetch');
        } catch (timeoutErr: any) {
          if (timeoutErr?.message?.includes('Timeout')) {
            console.warn('[Auth] Profile fetch timed out, retrying...');
            await new Promise(res => setTimeout(res, 1500));
            pd = await withTimeout(Promise.resolve(profileQuery()), 15000, 'profiles_fetch_retry');
          } else {
            throw timeoutErr;
          }
        }

        if (pd?.error) {
          console.error('[Auth] Profiles table error:', pd.error.message);
        } else {
          profileData = pd?.data;
        }
      } catch (err) {
        console.warn('[Auth] Could not fetch profile, using defaults:', (err as Error).message);
      }

      const combinedUser: User = {
        id: sbUser.id,
        email: sbUser.email || '',
        name: profileData?.name || sbUser.email?.split('@')[0] || 'User',
        plan: (profileData?.plan as UserPlan) || UserPlan.Free,
        teams: mockTeams,
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
          usage: { text: 0, image: 0, video: 0, campaign: 0, learnStyle: 0 },
          current_team_id: null,
        };
        supabase.from('profiles').upsert(defaultProfile).then(({ error }: any) => {
          if (!error) console.log('[Auth] Profile auto-created in background');
        });
      }

      // 3. Fetch secondary data (non-critical) incrementally with 8 s timeouts
      const fetchTable = async (table: string, orderCol = 'timestamp', ascending = false) => {
        try {
          const result = await withTimeout(
            Promise.resolve(supabase.from(table).select('*').order(orderCol, { ascending })),
            8000,
            `${table}_fetch`
          ) as any;
          return result?.error ? [] : (result?.data || []);
        } catch (e) {
          console.warn(`[Auth] Skip sync for ${table}:`, (e as Error).message);
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

      console.log('[Auth] Background synchronization started.');
    } catch (error) {
      console.error('[Auth] Sync error:', error);
      setLoading(false);
    } finally {
      syncInProgress.current = null;
    }
  };

  useEffect(() => {
    if (!supabase) return;
    let isSubscribed = true;

    const checkInitialSession = async () => {
      if (initialCheckDone.current) return;
      initialCheckDone.current = true;

      console.log('[Auth] Checking initial session...');

      // Wake up the Supabase project (handles free-tier pausing)
      await wakeUpSupabase(supabase);

      // Try getSession with a 15 s timeout; retry once on timeout
      const tryGetSession = () => withTimeout(supabase.auth.getSession(), 15000, 'getSession');

      try {
        let result: any;
        try {
          result = await tryGetSession();
        } catch (firstErr: any) {
          if (firstErr?.message?.includes('Timeout')) {
            console.warn('[Auth] Session check timed out, retrying in 2 s...');
            await new Promise(res => setTimeout(res, 2000));
            result = await withTimeout(supabase.auth.getSession(), 20000, 'getSession_retry');
          } else {
            throw firstErr;
          }
        }

        const { data, error } = result;
        if (error) throw error;

        const session = data?.session;
        console.log('[Auth] Session:', session ? `User ${session.user.id}` : 'None');

        if (session?.user && isSubscribed) {
          await fetchAndSetUserData(session.user);
        } else if (isSubscribed) {
          setUser(null);
          setLoading(false);
        }
      } catch (e) {
        console.error('[Auth] Session check failed after retries:', e);
        if (isSubscribed) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!isSubscribed) return;
      console.log(`[Auth] Event: ${event}`, session?.user?.id);

      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
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
    try {
      if (supabase) await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut failed locally', e);
    }
  };

  const updateUserPlan = (newPlan: UserPlan) => {
    if (user) setUser({ ...user, plan: newPlan });
  };

  const setCurrentTeamId = async (teamId: string | null) => {
    if (!user || !supabase) return;
    setUser(curr => curr ? ({ ...curr, currentTeamId: teamId }) : null);
    await supabase.from('profiles').update({ current_team_id: teamId }).eq('id', user.id);
  };

  const value: AuthContextType = {
    user,
    userPlan: user?.plan || UserPlan.Free,
    login,
    signup,
    logout,
    updateUserPlan,
    setCurrentTeamId,
    authModal,
    setAuthModal,
    currentTeamId: user?.currentTeamId || null
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium animate-pulse">Łączenie z bazą danych...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};