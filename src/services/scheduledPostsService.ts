import type { ScheduledPost } from '../types';
import { getSupabase } from './supabaseClient';

export const fetchScheduledPosts = async (): Promise<ScheduledPost[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('scheduled_posts').select('*').order('scheduled_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(p => ({
        id: p.id,
        formData: p.form_data,
        result: p.result,
        scheduleTimestamp: new Date(p.scheduled_at).getTime(),
        createdAt: new Date(p.created_at).getTime(),
        userId: p.user_id,
        teamId: p.team_id,
        status: p.status,
        approvalStatus: p.approval_status,
        comments: p.comments || []
    }));
};

export const saveScheduledPost = async (post: ScheduledPost): Promise<ScheduledPost> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");

    const mappedPost = {
        id: post.id,
        user_id: user.id,
        form_data: post.formData,
        result: post.result,
        scheduled_at: new Date(post.scheduleTimestamp).toISOString(),
        created_at: new Date(post.createdAt || Date.now()).toISOString(),
        status: post.status,
        approval_status: post.approvalStatus,
        comments: post.comments,
        team_id: post.teamId
    };

    const { data, error } = await supabase.from('scheduled_posts').upsert(mappedPost).select().single();
    if (error) throw error;

    return {
        id: data.id,
        formData: data.form_data,
        result: data.result,
        scheduleTimestamp: new Date(data.scheduled_at).getTime(),
        createdAt: new Date(data.created_at).getTime(),
        userId: data.user_id,
        teamId: data.team_id,
        status: data.status,
        approvalStatus: data.approval_status,
        comments: data.comments || []
    };
};

export const deleteScheduledPost = async (id: string): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase.from('scheduled_posts').delete().eq('id', id);
    if (error) throw error;
};

export const clearScheduledPosts = async (): Promise<void> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");

    const { error } = await supabase.from('scheduled_posts').delete().eq('user_id', user.id);
    if (error) throw error;
};