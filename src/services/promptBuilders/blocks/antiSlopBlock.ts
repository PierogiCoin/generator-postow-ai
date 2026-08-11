import { buildAntiSlopBlock } from '../../../prompts/plAntiSlop';
import type { TextPromptContext } from '../types';

export function antiSlopBlock(ctx: TextPromptContext): string {
  return buildAntiSlopBlock();
}
