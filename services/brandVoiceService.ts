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
  return data || [];
};

export const saveOrUpdateBrandVoiceProfile = async (profile: BrandVoiceProfile): Promise<BrandVoiceProfile> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be logged in to save a profile.");

  const profileWithUser = { ...profile, user_id: user.id };
  
  const { data, error } = await supabase
    .from('brand_voice_profiles')
    .upsert(profileWithUser)
    .select()
    .single();

  if (error) {
    console.error('Error saving brand voice profile:', error);
    throw new Error('Failed to save brand voice profile');
  }
  return data;
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