import type { CustomTemplate } from '../types';
import { getSupabase } from './supabaseClient';

export const fetchTemplates = async (): Promise<CustomTemplate[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('templates')
    .select('*');

  if (error) throw new Error('Failed to fetch templates');

  return (data || []).map(t => ({
    id: t.id,
    name: t.name,
    formData: t.form_data,
    teamId: t.team_id
  }));
};

export const saveTemplate = async (template: CustomTemplate): Promise<CustomTemplate> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be logged in to save a template.");

  const templateToSave = {
    id: template.id,
    name: template.name,
    form_data: template.formData,
    team_id: template.teamId,
    user_id: user.id
  };

  const { data, error } = await supabase
    .from('templates')
    .upsert(templateToSave)
    .select()
    .single();

  if (error) throw new Error('Failed to save template');

  return {
    id: data.id,
    name: data.name,
    formData: data.form_data,
    teamId: data.team_id
  };
};

// updateTemplate is covered by saveTemplate's upsert logic
export const updateTemplate = saveTemplate;

export const deleteTemplate = async (templateId: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', templateId);

  if (error) throw new Error('Failed to delete template');
};