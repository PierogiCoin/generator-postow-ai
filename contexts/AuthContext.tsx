import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
  const [loading, setLoading] = useState(true);
  const { setState: setDataStoreState } = useDataStore;

  useEffect(() => {
    const supabase = getSupabase();
    const fetchAndSetUserData = async (sbUser: SupabaseUser) => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sbUser.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        let resolvedProfile = profileData;

        if (!resolvedProfile) {
          const defaultProfile = {
            id: sbUser.id,
            name: sbUser.email?.split('@')[0] || 'User',
            plan: UserPlan.Free,
            usage: { text: 0, image: 0, video: 0, campaign: 0, learnStyle: 0 },
            current_team_id: null,
          };

          const { data: insertedProfile, error: insertError } = await supabase
            .from('profiles')
            .insert(defaultProfile)
            .select()
            .single();

          if (insertError) throw insertError;
          resolvedProfile = insertedProfile;
        }

        const [
          { data: historyData, error: historyError },
          { data: favoritesData, error: favoritesError },
          { data: templatesData, error: templatesError },
          { data: draftsData, error: draftsError },
          { data: scheduledPostsData, error: scheduledPostsError },
          { data: brandVoiceProfilesData, error: brandVoiceProfilesError }
        ] = await Promise.all([
          supabase.from('history').select('*').order('timestamp', { ascending: false }),
          supabase.from('favorites').select('*').order('timestamp', { ascending: false }),
          supabase.from('templates').select('*'),
          supabase.from('drafts').select('*').order('timestamp', { ascending: false }),
          supabase.from('scheduled_posts').select('*').order('scheduled_at', { ascending: true }),
          supabase.from('brand_voice_profiles').select('*'),
        ]);

        if (historyError) throw historyError;
        if (favoritesError) throw favoritesError;
        if (templatesError) throw templatesError;
        if (draftsError) throw draftsError;
        if (scheduledPostsError) throw scheduledPostsError;
        if (brandVoiceProfilesError) throw brandVoiceProfilesError;

        const combinedUser: User = {
            id: sbUser.id,
            email: sbUser.email || '',
            name: resolvedProfile.name || sbUser.email?.split('@')[0] || 'User',
            plan: resolvedProfile.plan || UserPlan.Free,
            teams: mockTeams,
            currentTeamId: resolvedProfile.current_team_id || null
        };
        setUser(combinedUser);

    const usageAny = (resolvedProfile.usage || {}) as any;
  const totalGenerations: number = Object.values(usageAny as Record<string, any>).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    setDataStoreState({
      stats: { byPlatform: {}, byTone: {}, byContentType: {}, byModel: {}, byGenerationType: usageAny, totalGenerations },
      brandVoiceProfiles: brandVoiceProfilesData || [],
      favorites: favoritesData || [],
      templates: templatesData || [],
      history: historyData || [],
      drafts: draftsData || [],
      scheduledPosts: scheduledPostsData || [],
    });

      } catch (error) {
        console.error("Error fetching user data:", error);
        setUser(null); // Logout on data fetch error
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session?.user) {
        await fetchAndSetUserData(session.user);
      } else {
        setUser(null);
        // Clear data store on logout
        setDataStoreState({
          stats: null, brandVoiceProfiles: [], favorites: [], templates: [], history: [], drafts: [], scheduledPosts: []
        });
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setDataStoreState]);

  const login = async (email: string, pass: string): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const signup = async (email: string, pass: string): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signUp({ email, password: pass });
    if (error) throw error;
  };

  const logout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setUser(null);
  };
  
  const updateUserPlan = (newPlan: UserPlan) => {
      setUser(currentUser => {
          if (currentUser) {
              return { ...currentUser, plan: newPlan };
          }
          return null;
      });
  };

  const setCurrentTeamId = async (teamId: string | null) => {
    if(!user) return;
    setUser(currentUser => ({ ...currentUser!, currentTeamId: teamId }));
    const supabase = getSupabase();
    const { error } = await supabase.from('profiles').update({ current_team_id: teamId }).eq('id', user.id);
    if(error) console.error("Failed to update current team:", error);
  };
  
  const value = { user, userPlan: user?.plan || UserPlan.Free, login, signup, logout, updateUserPlan, setCurrentTeamId, authModal, setAuthModal, currentTeamId: user?.currentTeamId || null };

  // Render a loading indicator while session is being determined
  if (loading) {
    return null; // Or a proper loading screen component
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}