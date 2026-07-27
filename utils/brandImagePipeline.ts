import { overlayLogoOnImage } from './imageBranding';
import type { BrandVoiceSettings } from '../types';
import {
  DEFAULT_LOGO_POSITION,
  DEFAULT_IMAGE_LOGO_PADDING,
  DEFAULT_IMAGE_LOGO_SIZE_PERCENT,
} from '../shared/config/generationConfig';

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
      options?.position ?? settings?.logoPosition ?? DEFAULT_LOGO_POSITION,
      DEFAULT_IMAGE_LOGO_PADDING,
      options?.sizePercent ?? settings?.logoSizePercent ?? DEFAULT_IMAGE_LOGO_SIZE_PERCENT
    );
  } catch {
    return imageUrl;
  }
}

export function shouldApplyBrandLogo(includeLogo?: boolean): boolean {
  return includeLogo !== false;
}
