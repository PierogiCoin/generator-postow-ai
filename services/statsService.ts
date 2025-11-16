import type { FormData, UsageStats, User } from '../types';
import { GenerationType } from '../types';
import { getSupabase } from './supabaseClient';

// Getting stats is now part of the initial data load in AuthContext

export const recordGeneration = async (formData: FormData): Promise<void> => {
    const supabase = getSupabase();
    let type: 'text' | 'image' | 'video' | 'campaign';

    switch(formData.generationType) {
        case GenerationType.PostWithImage:
            await supabase.rpc('increment_usage', { usage_type: 'text' });
            await supabase.rpc('increment_usage', { usage_type: 'image' });
            return;
        case GenerationType.Idea:
        case GenerationType.ABTest:
            type = 'text';
            break;
        case GenerationType.Video:
            type = 'video';
            break;
        case GenerationType.Campaign:
            type = 'campaign';
            break;
        default:
            return;
    }
    
    const { error } = await supabase.rpc('increment_usage', { usage_type: type });
    
    if (error) {
        console.error(`Error recording generation for type ${type}:`, error);
        throw new Error('Failed to record generation');
    }
};

export const recordLearnStyle = async (): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase.rpc('increment_usage', { usage_type: 'learnStyle' });
    if (error) {
        console.error('Error recording style learning:', error);
        throw new Error('Failed to record style learning');
    }
};

export const clearStats = async (): Promise<void> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in to clear stats.");

    const { error } = await supabase
        .from('profiles')
        .update({ usage: { text: 0, image: 0, video: 0, campaign: 0, learnStyle: 0 }})
        .eq('id', user.id);

    if (error) {
        console.error('Error clearing stats:', error);
        throw new Error('Failed to clear stats');
    }
};