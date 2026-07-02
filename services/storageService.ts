import { getSupabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

type BrandAssetType = 'logos' | 'mascots';

/**
 * Upload logo / maskotki marki do Supabase Storage.
 */
export async function uploadBrandAsset(
  file: File,
  type: BrandAssetType,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const filePath = `${userId}/brand/${type}/${uuidv4()}.${ext}`;

  const { error } = await supabase.storage
    .from('generated_content')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/png',
    });

  if (error) {
    if (error.message.includes('Bucket not found')) {
      throw new Error("Bucket 'generated_content' nie istnieje w Supabase. Utwórz go jako publiczny.");
    }
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('generated_content')
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Upload wygenerowanej / edytowanej grafiki (data URL lub blob URL) do Supabase Storage.
 */
export async function uploadGeneratedImage(imageUrl: string, userId: string): Promise<string> {
  if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('blob:')) {
    return imageUrl;
  }

  const supabase = getSupabase();
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const ext = blob.type.includes('png') ? 'png' : 'jpg';
  const filePath = `${userId}/posts/${uuidv4()}.${ext}`;

  const { error } = await supabase.storage
    .from('generated_content')
    .upload(filePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type || 'image/jpeg',
    });

  if (error) {
    if (error.message.includes('Bucket not found')) {
      throw new Error("Bucket 'generated_content' nie istnieje w Supabase. Utwórz go jako publiczny.");
    }
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('generated_content')
    .getPublicUrl(filePath);

  return publicUrl;
}
