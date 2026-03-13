import type { Draft } from '../types';
import { getSupabase } from './supabaseClient';

export const fetchDrafts = async (): Promise<Draft[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error("Error fetching drafts:", error);
    return [];
  }
  return data || [];
};

export const saveDraft = async (draft: any): Promise<Draft> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not logged in");

  // Note: team_id might be null or fetched from profile
  const newDraft = {
    user_id: user.id,
    form_data: draft.formData || draft,
    timestamp: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('drafts')
    .insert(newDraft)
    .select()
    .single();

  if (error) {
    console.error("Error saving draft:", error);
    throw new Error("Failed to save draft");
  }

  // Map back to Draft type (CamelCase)
  return {
    id: data.id,
    formData: data.form_data,
    timestamp: new Date(data.timestamp).getTime(),
    userId: data.user_id,
    teamId: data.team_id
  };
};

export const deleteDraft = async (draftId: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('drafts')
    .delete()
    .eq('id', draftId);

  if (error) {
    console.error("Error deleting draft:", error);
    throw new Error("Failed to delete draft");
  }
};