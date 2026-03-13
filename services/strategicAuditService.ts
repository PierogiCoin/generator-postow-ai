import type { StrategicAuditReport } from '../types';
import { getSupabase } from './supabaseClient';

export const fetchLatestAudit = async (userId: string): Promise<StrategicAuditReport | null> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('strategic_audits')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        console.error('Error fetching audit:', error);
        return null;
    }

    return data.report;
};

export const saveStrategicAudit = async (report: StrategicAuditReport): Promise<void> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in.");

    const { error } = await supabase
        .from('strategic_audits')
        .insert({
            user_id: user.id,
            report: report,
            timestamp: new Date().toISOString()
        });

    if (error) {
        console.error('Error saving strategic audit:', error);
        throw new Error(`Failed to save audit: ${error.message}`);
    }
};
