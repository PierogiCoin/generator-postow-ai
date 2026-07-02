import { overlayLogoOnImage } from './imageBranding';
import type { BrandVoiceSettings } from '../types';

/** Nakłada logo marki na grafikę, jeśli skonfigurowane w Brand Voice. */
export async function applyBrandLogoToImage(
  imageUrl: string,
  settings?: BrandVoiceSettings | null,
  options?: {
    skip?: boolean;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    sizePercent?: number;
  }
): Promise<string> {
  const logo = settings?.logoUrl?.trim();
  if (!logo || options?.skip) return imageUrl;

  try {
    return await overlayLogoOnImage(
      imageUrl,
      logo,
      options?.position ?? settings.logoPosition ?? 'bottom-right',
      28,
      options?.sizePercent ?? settings.logoSizePercent ?? 13
    );
  } catch {
    return imageUrl;
  }
}

export function shouldApplyBrandLogo(includeLogo?: boolean): boolean {
  return includeLogo !== false;
}
