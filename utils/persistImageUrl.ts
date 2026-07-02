import { uploadGeneratedImage } from '../services/storageService';

/**
 * Zapisuje data/blob URL w chmurze; HTTPS zwraca bez zmian.
 * Przy błędzie uploadu zwraca lokalny URL i wywołuje `onError`, by UI mogło ostrzec użytkownika,
 * że grafika nie została utrwalona (będzie dostępna tylko w tej sesji).
 */
export async function persistImageUrl(
  imageUrl: string | null | undefined,
  userId: string,
  onError?: (error: unknown) => void
): Promise<string | null> {
  if (!imageUrl?.trim()) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  try {
    return await uploadGeneratedImage(imageUrl, userId);
  } catch (error) {
    console.error('persistImageUrl: upload do Supabase nie powiódł się', error);
    onError?.(error);
    return imageUrl;
  }
}
