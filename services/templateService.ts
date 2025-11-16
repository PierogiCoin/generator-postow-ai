import type { CustomTemplate } from '../types';
import { getSupabase } from './supabaseClient';

export const fetchTemplates = async (): Promise<CustomTemplate[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('templates')
    .select('*');

  if (error) {
    console.error('Error fetching templates:', error);
    throw new Error('Failed to fetch templates');
  }
  return data || [];
};

export const saveTemplate = async (template: CustomTemplate): Promise<CustomTemplate> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be logged in to save a template.");

  const templateWithUser = { ...template, user_id: user.id };

  const { data, error } = await supabase
    .from('templates')
    .upsert(templateWithUser)
    .select()
    .single();

  if (error) {
    console.error('Error saving template:', error);
    throw new Error('Failed to save template');
  }
  return data;
};

// updateTemplate is covered by saveTemplate's upsert logic
export const updateTemplate = saveTemplate;

export const deleteTemplate = async (templateId: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', templateId);
    
  if (error) {
    console.error('Error deleting template:', error);
    throw new Error('Failed to delete template');
  }
};