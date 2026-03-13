import type { NewCampaignPayload, CampaignHistoryItem, Comment } from '../types';
import { getSupabase } from './supabaseClient';

export const fetchHistory = async (): Promise<CampaignHistoryItem[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('history').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []).map(item => ({
        id: item.id,
        formData: item.form_data,
        result: item.result,
        sentimentAnalysis: item.sentiment_analysis,
        seoAnalysis: item.seo_analysis,
        timestamp: new Date(item.timestamp).getTime(),
        teamId: item.team_id,
        authorId: item.author_id,
        authorName: item.author_name,
        status: item.status,
        comments: item.comments || [],
        dueDate: item.due_date ? new Date(item.due_date).getTime() : null
    }));
};

export const addHistoryItem = async (payload: NewCampaignPayload): Promise<CampaignHistoryItem> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");

    const newHistoryItem = {
        form_data: payload.formData,
        result: payload.result,
        sentiment_analysis: payload.sentimentAnalysis,
        seo_analysis: payload.seoAnalysis,
        user_id: user.id,
        author_id: user.id,
        author_name: user.email?.split('@')[0] || 'User',
        status: 'draft',
        comments: []
    };

    const { data, error } = await supabase.from('history').insert(newHistoryItem).select().single();
    if (error) throw error;

    // Map back to CampaignHistoryItem (CamelCase)
    return {
        id: data.id,
        formData: data.form_data,
        result: data.result,
        sentimentAnalysis: data.sentiment_analysis,
        seoAnalysis: data.seo_analysis,
        timestamp: new Date(data.timestamp).getTime(),
        teamId: data.team_id,
        authorId: data.author_id,
        authorName: data.author_name,
        status: data.status,
        comments: data.comments || [],
        dueDate: data.due_date ? new Date(data.due_date).getTime() : null
    };
};

export const updateHistoryItem = async (itemId: string, updates: Partial<CampaignHistoryItem>): Promise<CampaignHistoryItem> => {
    const supabase = getSupabase();

    // Map updates to snake_case if necessary
    const mappedUpdates: any = {};
    if (updates.status) mappedUpdates.status = updates.status;
    if (updates.comments) mappedUpdates.comments = updates.comments;
    if (updates.dueDate !== undefined) mappedUpdates.due_date = updates.dueDate ? new Date(updates.dueDate).toISOString() : null;

    const { data, error } = await supabase.from('history').update(mappedUpdates).eq('id', itemId).select().single();
    if (error) throw error;

    return {
        id: data.id,
        formData: data.form_data,
        result: data.result,
        sentimentAnalysis: data.sentiment_analysis,
        seoAnalysis: data.seo_analysis,
        timestamp: new Date(data.timestamp).getTime(),
        teamId: data.team_id,
        authorId: data.author_id,
        authorName: data.author_name,
        status: data.status,
        comments: data.comments || [],
        dueDate: data.due_date ? new Date(data.due_date).getTime() : null
    };
};

export const clearHistory = async (): Promise<void> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");

    const { error } = await supabase.from('history').delete().eq('user_id', user.id);
    if (error) throw error;
};

export const addComment = async (itemId: string, text: string): Promise<Comment | null> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");

    // Fetch current comments
    const { data: historyItem, error: fetchError } = await supabase.from('history').select('comments').eq('id', itemId).single();
    if (fetchError) throw fetchError;

    const newComment: Comment = {
        id: crypto.randomUUID(),
        authorId: user.id,
        authorName: user.email?.split('@')[0] || 'User',
        text,
        timestamp: Date.now(),
    };

    const updatedComments = [...(historyItem.comments || []), newComment];

    const { error: updateError } = await supabase.from('history').update({ comments: updatedComments }).eq('id', itemId);
    if (updateError) throw updateError;

    return newComment;
};
