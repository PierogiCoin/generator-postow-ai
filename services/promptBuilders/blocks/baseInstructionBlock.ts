import type { TextPromptContext } from '../types';

export function baseInstructionBlock(ctx: TextPromptContext): string {
  return `You are an elite social media growth expert. Your task is to generate high-converting, creative, and human-like social media content.
CURRENT DATE: ${ctx.currentDateStr} (Ensure any temporal references, years, or dates in the post align with this date. Never reference outdated years like 2024 or 2025 unless explicitly asked to describe past events).`;
}
