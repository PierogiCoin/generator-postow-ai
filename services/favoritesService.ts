import type { FavoritePost, GenerationResult } from '../types';
import { getSupabase } from './supabaseClient';

function rowToFavoritePost(f: Record<string, unknown>): FavoritePost {
  const formData = f.form_data as FavoritePost['formData'] | null;
  const storedResult = f.result as GenerationResult | null;

  const result: GenerationResult =
    storedResult ??
    ({
      id: String(f.id),
      type: formData?.generationType ?? 'post',
      platform: (f.platform as GenerationResult['platform']) ?? formData?.platform ?? 'Instagram',
      postText: String(f.post_text ?? ''),
      hashtags: (f.hashtags as string[]) ?? [],
      adHeadline: null,
      callToAction: null,
      imageUrl: null,
      metadata: {
        tone: formData?.tone ?? 'professional',
        audience: formData?.audience ?? '',
        prompt: formData?.topic ?? '',
      },
    } as GenerationResult);

  return {
    id: String(f.id),
    userId: String(f.user_id),
    formData: formData ?? ({} as FavoritePost['formData']),
    result,
    timestamp: new Date(String(f.timestamp ?? f.created_at)).getTime(),
    teamId: (f.team_id as string | null) ?? null,
  };
}

export const fetchFavorites = async (): Promise<FavoritePost[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('favorites').select('*').order('timestamp', { ascending: false });

  if (error) throw new Error('Failed to fetch favorites');

  return (data || []).map((f) => rowToFavoritePost(f as Record<string, unknown>));
};

export const addFavorite = async (favorite: Omit<FavoritePost, 'id' | 'userId'>): Promise<FavoritePost> => {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be logged in to add a favorite.');

  const favoriteRow = {
    user_id: user.id,
    form_data: favorite.formData,
    result: favorite.result,
    post_text: favorite.result.postText,
    platform: favorite.result.platform,
    hashtags: favorite.result.hashtags ?? [],
    team_id: favorite.teamId ?? null,
  };

  const { data, error } = await supabase.from('favorites').insert(favoriteRow).select().single();

  if (error) {
    const msg = error.message || '';
    if (msg.includes('duplicate') || msg.includes('unique')) {
      throw new Error('Ten post jest już w ulubionych.');
    }
    throw new Error(msg || 'Nie udało się dodać do ulubionych.');
  }

  return rowToFavoritePost(data as Record<string, unknown>);
};

export const removeFavorite = async (favoriteId: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.from('favorites').delete().eq('id', favoriteId);

  if (error) throw new Error('Failed to remove favorite');
};

export const clearFavorites = async (): Promise<void> => {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be logged in to clear favorites.');

  const { error } = await supabase.from('favorites').delete().eq('user_id', user.id);

  if (error) throw new Error('Failed to clear favorites');
};
