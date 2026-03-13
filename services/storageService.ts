import { getSupabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * Storage Service
 * Handles file uploads to Supabase Storage
 */

export const uploadBrandAsset = async (file: File, folder: 'logos' | 'mascots', userId: string): Promise<string> => {
    const supabase = getSupabase();

    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${userId}/${folder}/${fileName}`;

    const { data, error } = await supabase.storage
        .from('brand-assets')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        if (error.message.includes("Bucket not found")) {
            throw new Error("Błąd konfiguracji: Bucket 'brand-assets' nie istnieje w Twoim projekcie Supabase. Utwórz go w panelu Supabase i ustaw jako publiczny.");
        }
        throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('brand-assets')
        .getPublicUrl(filePath);

    return publicUrl;
};
