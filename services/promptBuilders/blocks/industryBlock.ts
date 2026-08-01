import type { TextPromptContext } from '../types';

export function industryBlock(ctx: TextPromptContext): string | null {
  const pack = ctx.nicheCtx.pack;
  if (!pack) return null;

  const lines: string[] = [];
  lines.push(`\nINDUSTRY CONTEXT: ${pack.name}${pack.subNicheLabel ? ` / ${pack.subNicheLabel}` : ''}.`);
  lines.push(`Tone: ${pack.tone}.`);

  if (pack.systemInstruction) {
    lines.push(pack.systemInstruction);
  } else {
    lines.push(
      `Write specifically for this Polish industry. Avoid generic marketing phrases without concrete examples. Use real scenarios relevant to ${pack.name}.`
    );
  }

  if (pack.topicHint) {
    lines.push(`Typical context: ${pack.topicHint}`);
  }

  const sampleIdeas = pack.topicIdeas?.slice(0, 3);
  if (sampleIdeas?.length) {
    lines.push(`Example angles: ${sampleIdeas.join(' | ')}`);
  }

  return lines.join('\n');
}
