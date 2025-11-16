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
  return data || [];
};

export const addFavorite = async (favorite: Omit<FavoritePost, 'id' | 'userId'>): Promise<FavoritePost> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be logged in to add a favorite.");
  
  const favoriteWithUser = { ...favorite, user_id: user.id };

  const { data, error } = await supabase
    .from('favorites')
    .insert(favoriteWithUser)
    .select()
    .single();

  if (error) {
    console.error('Error adding favorite:', error);
    throw new Error('Failed to add favorite');
  }
  return data;
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