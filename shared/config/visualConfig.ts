/**
 * Shared visual generation and QA configuration.
 * Centralizes defaults for negative prompts, avoid lists, and image prompt policies.
 */

/**
 * Base negative prompt tokens used for any AI-generated social image.
 * - No garbled/broken text (AI text is usually illegible)
 * - No watermarks/logos rendered in the frame
 * - No anatomical or quality artifacts
 */
export const DEFAULT_IMAGE_NEGATIVE_PROMPT: string[] = [
  'garbled text',
  'broken letters',
  'watermarks',
  'logos',
  'blurry',
  'low quality',
  'distorted faces',
  'extra fingers',
  'mutilated hands',
  'deformed limbs',
  'oversaturated',
  'chromatic aberration',
];

/**
 * Words and phrases to avoid in image prompts for social media
 * to prevent common failure modes.
 */
export const GLOBAL_IMAGE_PROMPT_AVOID: string[] = [
  'rendered text',
  'fake UI',
  'busy background',
  'unreadable small print',
];
