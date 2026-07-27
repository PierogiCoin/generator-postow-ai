import {
  BASE_LOGO_WIDTH,
  DEFAULT_LOGO_SIZE_PERCENT,
  DEFAULT_LOGO_PADDING_PERCENT,
} from '../../../shared/config/generationConfig';

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  fontFamily: string;
  shadow: boolean;
  maxWidthPercent: number;
  textAlign: 'left' | 'center' | 'right';
}

export interface CanvasSnapshot {
  layers: TextLayer[];
  backgroundUrl: string;
  activeLayerId: string | null;
}

export type DragType = 'text' | 'logo' | 'mascot';

export const SNAP_THRESHOLD = 2.5;
export const FONT_STACK = 'Plus Jakarta Sans, system-ui, sans-serif';

export const POSITION_PRESETS: Array<{ id: string; label: string; x: number; y: number }> = [
  { id: 'top', label: 'Góra', x: 50, y: 14 },
  { id: 'center', label: 'Środek', x: 50, y: 50 },
  { id: 'bottom', label: 'Dół', x: 50, y: 86 },
  { id: 'lower-third', label: 'Lower ⅓', x: 50, y: 72 },
];

export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function applySnap(value: number): { value: number; snapped: boolean } {
  if (Math.abs(value - 50) <= SNAP_THRESHOLD) return { value: 50, snapped: true };
  return { value: clamp(value), snapped: false };
}

export type LogoPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

export { BASE_LOGO_WIDTH };

export interface LogoPlacementInput {
  position: LogoPosition;
  /** Logo width as a percentage of canvas width. */
  sizePercent: number;
  /** Safe padding from canvas edges as a percentage of canvas dimensions. */
  paddingPercent?: number;
  canvasWidth: number;
  canvasHeight: number;
  /** Natural aspect ratio of the logo image. Defaults to 1 (square). */
  aspectRatio?: number;
}

export interface LogoPlacement {
  x: number; // percent 0–100
  y: number; // percent 0–100
  scale: number;
}

export function computeLogoPlacement({
  position,
  sizePercent,
  paddingPercent = DEFAULT_LOGO_PADDING_PERCENT,
  canvasWidth,
  canvasHeight,
  aspectRatio = 1,
}: LogoPlacementInput): LogoPlacement {
  const targetWidth = (sizePercent / 100) * canvasWidth;
  const targetHeight = targetWidth / aspectRatio;

  const paddingX = (paddingPercent / 100) * canvasWidth;
  const paddingY = (paddingPercent / 100) * canvasHeight;

  const halfW = targetWidth / 2;
  const halfH = targetHeight / 2;

  let cx: number;
  let cy: number;

  switch (position) {
    case 'top-left':
      cx = paddingX + halfW;
      cy = paddingY + halfH;
      break;
    case 'top-right':
      cx = canvasWidth - paddingX - halfW;
      cy = paddingY + halfH;
      break;
    case 'bottom-left':
      cx = paddingX + halfW;
      cy = canvasHeight - paddingY - halfH;
      break;
    case 'bottom-right':
      cx = canvasWidth - paddingX - halfW;
      cy = canvasHeight - paddingY - halfH;
      break;
    case 'center':
    default:
      cx = canvasWidth / 2;
      cy = canvasHeight / 2;
      break;
  }

  return {
    x: clamp((cx / canvasWidth) * 100),
    y: clamp((cy / canvasHeight) * 100),
    scale: targetWidth / BASE_LOGO_WIDTH,
  };
}

export function buildDefaultTextLayer(text: string, id = '1'): TextLayer {
  return {
    id,
    text,
    x: 50,
    y: 72,
    fontSize: 36,
    color: '#ffffff',
    fontWeight: '800',
    fontFamily: FONT_STACK,
    shadow: true,
    maxWidthPercent: 80,
    textAlign: 'center',
  };
}
