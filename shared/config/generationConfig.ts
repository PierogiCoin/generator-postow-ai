/**
 * Centralized generation configuration.
 *
 * This is the single source of truth for magic numbers, thresholds,
 * and default model names used across content generation services.
 */

// Quality gate
export const QUALITY_GATE_THRESHOLD = 80;

// Logo / brand asset overlay defaults
export const BASE_LOGO_WIDTH = 80; // px — matches the Tailwind w-20 base used in CreativeCanvas
export const DEFAULT_LOGO_SIZE_PERCENT = 12;
export const DEFAULT_LOGO_PADDING_PERCENT = 4;
export const DEFAULT_LOGO_POSITION: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right';

// Server-side image overlay defaults (legacy Canvas pipeline)
export const DEFAULT_IMAGE_LOGO_PADDING = 28;
export const DEFAULT_IMAGE_LOGO_SIZE_PERCENT = 13;

// Default Gemini model names used in generation services.
// Keep these in one place so a model swap does not require a repo-wide search.
export const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
export const DEFAULT_FAST_MODEL = 'gemini-flash-latest';
export const DEFAULT_PRO_MODEL = 'gemini-pro-latest';
export const DEFAULT_LITE_MODEL = 'gemini-flash-lite-latest';
