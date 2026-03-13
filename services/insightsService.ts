import type { AIInsight } from '../types';
import { getSupabase } from './supabaseClient';

export const fetchLearnedInsights = async (userId: string): Promise<AIInsight[] | null> => {
    const supabase = getSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('learned_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: false });

    if (error) {
        console.error('Error fetching learned insights:', error);
        return null;
    }

    return (data || []).map(row => ({
        id: row.id.toString(),
        text: row.text,
        type: row.type || 'observation',
        category: row.category || 'performance_tip'
    }));
};

export const saveInsights = async (insights: AIInsight[]): Promise<void> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");

    // Delete existing to keep it fresh/updated or just upsert?
    // Let's replace because its easier for "Long term memory" structure
    await supabase.from('learned_insights').delete().eq('user_id', user.id);

    const records = insights.map(i => ({
        user_id: user.id,
        text: i.text,
        type: i.type,
        category: i.category || 'performance_tip'
    }));

    const { error } = await supabase.from('learned_insights').insert(records);

    if (error) {
        console.error('Error saving learned insights:', error);
        throw new Error(`Failed to save insights: ${error.message}`);
    }
};

export const clearInsights = async (): Promise<void> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('learned_insights')
        .delete()
        .eq('user_id', user.id);

    if (error) throw error;
};
