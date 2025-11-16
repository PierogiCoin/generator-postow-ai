import type { ScheduledPost } from '../types';
import { getSupabase } from './supabaseClient';

export const saveScheduledPost = async (post: ScheduledPost): Promise<ScheduledPost> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");
    
    const postWithUser = { ...post, user_id: user.id };

    const { data, error } = await supabase.from('scheduled_posts').upsert(postWithUser).select().single();
    if(error) throw error;
    return data;
};

export const deleteScheduledPost = async (id: string): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase.from('scheduled_posts').delete().eq('id', id);
    if(error) throw error;
};

export const clearScheduledPosts = async (): Promise<void> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");
    
    const { error } = await supabase.from('scheduled_posts').delete().eq('user_id', user.id);
    if(error) throw error;
};