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
