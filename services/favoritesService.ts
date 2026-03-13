import type { FavoritePost } from '../types';
import { getSupabase } from './supabaseClient';

export const fetchFavorites = async (): Promise<FavoritePost[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('favorites')
    .select('*');

  if (error) {
    console.error('Error fetching favorites:', error);
    throw new Error('Failed to fetch favorites');
  }

  return (data || []).map(f => ({
    id: f.id,
    userId: f.user_id,
    formData: f.form_data,
    result: f.result,
    timestamp: new Date(f.timestamp).getTime(),
    teamId: f.team_id
  }));
};

export const addFavorite = async (favorite: Omit<FavoritePost, 'id' | 'userId'>): Promise<FavoritePost> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be logged in to add a favorite.");

  const favoriteWithUser = {
    user_id: user.id,
    form_data: favorite.formData,
    result: favorite.result,
    team_id: favorite.teamId
  };

  const { data, error } = await supabase
    .from('favorites')
    .insert(favoriteWithUser)
    .select()
    .single();

  if (error) {
    console.error('Error adding favorite:', error);
    throw new Error('Failed to add favorite');
  }

  return {
    id: data.id,
    userId: data.user_id,
    formData: data.form_data,
    result: data.result,
    timestamp: new Date(data.timestamp).getTime(),
    teamId: data.team_id
  };
};

export const removeFavorite = async (favoriteId: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('id', favoriteId);

  if (error) {
    console.error('Error removing favorite:', error);
    throw new Error('Failed to remove favorite');
  }
};


export const clearFavorites = async (): Promise<void> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be logged in to clear favorites.");

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Error clearing favorites:', error);
    throw new Error('Failed to clear favorites');
  }
};