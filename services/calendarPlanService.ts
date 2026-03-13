import type { IntelligentCalendarPlanItem } from '../types';
import { getSupabase } from './supabaseClient';

export const fetchLatestCalendarPlan = async (userId: string): Promise<IntelligentCalendarPlanItem[] | null> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('calendar_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        console.error('Error fetching calendar plan:', error);
        return null;
    }

    return data.plan;
};

export const saveCalendarPlan = async (plan: IntelligentCalendarPlanItem[]): Promise<void> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");

    const { error } = await supabase
        .from('calendar_plans')
        .insert({
            user_id: user.id,
            plan: plan,
            timestamp: new Date().toISOString()
        });

    if (error) {
        console.error('Error saving calendar plan:', error);
        throw new Error(`Failed to save calendar plan: ${error.message}`);
    }
};

export const clearCalendarPlans = async (): Promise<void> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('calendar_plans')
        .delete()
        .eq('user_id', user.id);

    if (error) {
        console.error('Error clearing calendar plans:', error);
        throw new Error(`Failed to clear calendar plans: ${error.message}`);
    }
};
