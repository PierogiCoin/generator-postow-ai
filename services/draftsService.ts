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
  
  const { data: profile } = await supabase.from('profiles').select('current_team_id').single();

  const newDraft = {
    // 🛠️ POPRAWKA: Mapowanie pól z CamelCase (z TS) na snake_case (dla Postgres/Supabase)
    title: draft.title,
    content: draft.content,
    // Kluczowa poprawka, aby uniknąć błędu 'formData' column does not exist:
    form_data: (draft as any).formData, // Używamy 'form_data' dla bazy danych
    
    user_id: user.id,
    team_id: profile?.current_team_id || null
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
  return data;
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