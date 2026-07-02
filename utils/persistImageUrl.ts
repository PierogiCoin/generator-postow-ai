import { uploadGeneratedImage } from '../services/storageService';

/** Zapisuje data/blob URL w chmurze; HTTPS zwraca bez zmian. */
export async function persistImageUrl(imageUrl: string | null | undefined, userId: string): Promise<string | null> {
  if (!imageUrl?.trim()) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  try {
    return await uploadGeneratedImage(imageUrl, userId);
  } catch {
    return imageUrl;
  }
}
