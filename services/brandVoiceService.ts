import type { BrandVoiceProfile } from '../types';
import { getSupabase } from './supabaseClient';

export const getBrandVoiceProfiles = async (): Promise<BrandVoiceProfile[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('brand_voice_profiles')
    .select('*');

  if (error) {
    console.error('Error fetching brand voice profiles:', error);
    throw new Error('Failed to fetch brand voice profiles');
  }

  return (data || []).map(p => ({
    id: p.id,
    userId: p.user_id,
    name: p.name,
    settings: p.settings,
    teamId: p.team_id
  }));
};

export const saveOrUpdateBrandVoiceProfile = async (profile: BrandVoiceProfile): Promise<BrandVoiceProfile> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be logged in to save a profile.");

  // Build save payload – maps to both old columns and new 'settings' JSONB column
  // so we work with both old DB schema and new one
  const settings = profile.settings || {};
  const profileToSave: Record<string, any> = {
    id: profile.id,
    user_id: user.id,
    name: profile.name,
    // Legacy columns (old schema)
    description: (settings as any).description || profile.name,
    tone: (settings as any).tone || 'Professional',
    values: (settings as any).keywords || '',
    // Full settings blob (new schema – will be ignored if column doesn't exist)
    settings: settings,
    team_id: profile.teamId || null,
  };

  const { data, error } = await supabase
    .from('brand_voice_profiles')
    .upsert(profileToSave, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error saving brand voice profile:', error.message, error.details, error.hint);
    // Try without 'settings' column in case migration hasn't been run yet
    if (error.message?.includes('settings') || error.code === '42703') {
      const { settings: _s, ...payloadWithoutSettings } = profileToSave;
      const { data: data2, error: error2 } = await supabase
        .from('brand_voice_profiles')
        .upsert(payloadWithoutSettings, { onConflict: 'id' })
        .select()
        .single();
      if (error2) {
        console.error('Error saving brand voice profile (fallback):', error2);
        throw new Error(`Failed to save brand voice profile: ${error2.message}`);
      }
      return {
        id: data2.id,
        userId: data2.user_id,
        name: data2.name,
        settings: profile.settings,
        teamId: data2.team_id
      };
    }
    throw new Error(`Failed to save brand voice profile: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    settings: data.settings || profile.settings,
    teamId: data.team_id
  };
};


export const deleteBrandVoiceProfile = async (profileId: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('brand_voice_profiles')
    .delete()
    .eq('id', profileId);

  if (error) {
    console.error('Error deleting brand voice profile:', error);
    throw new Error('Failed to delete brand voice profile');
  }
};