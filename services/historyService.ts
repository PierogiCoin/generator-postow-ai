import type { NewCampaignPayload, CampaignHistoryItem, Comment } from '../types';
import { getSupabase } from './supabaseClient';

export const addHistoryItem = async (payload: NewCampaignPayload): Promise<CampaignHistoryItem> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");

    const newHistoryItem = {
        formData: payload.formData,
        result: payload.result,
        sentimentAnalysis: payload.sentimentAnalysis,
        seoAnalysis: payload.seoAnalysis,
        teamId: null, // Assuming personal for now
        authorId: user.id,
        authorName: user.email?.split('@')[0] || 'User',
        status: 'draft',
        comments: [],
        user_id: user.id
    };

    const { data, error } = await supabase.from('history').insert(newHistoryItem).select().single();
    if (error) throw error;
    return data;
};

export const updateHistoryItem = async (itemId: string, updates: Partial<CampaignHistoryItem>): Promise<CampaignHistoryItem> => {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('history').update(updates).eq('id', itemId).select().single();
    if(error) throw error;
    return data;
};

export const clearHistory = async (): Promise<void> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");
    
    const { error } = await supabase.from('history').delete().eq('user_id', user.id);
    if(error) throw error;
};

export const addComment = async (itemId: string, text: string): Promise<Comment | null> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");

    // Fetch current comments
    const { data: historyItem, error: fetchError } = await supabase.from('history').select('comments').eq('id', itemId).single();
    if(fetchError) throw fetchError;

    const newComment: Comment = {
        id: crypto.randomUUID(),
        authorId: user.id,
        authorName: user.email?.split('@')[0] || 'User',
        text,
        timestamp: Date.now(),
    };

    const updatedComments = [...(historyItem.comments || []), newComment];
    
    const { error: updateError } = await supabase.from('history').update({ comments: updatedComments }).eq('id', itemId);
    if(updateError) throw updateError;
    
    return newComment;
};