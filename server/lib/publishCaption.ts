/**
 * Składa treść posta pod publikację — tekst, hashtagi, CTA i link (np. Facebook).
 * Kopia logiki z utils/publishCaption.ts (używana po stronie API).
 */
export function formatPublishCaption(input: {
  postText: string;
  hashtags?: string[];
  callToAction?: string | null;
  ctaUrl?: string | null;
}): string {
  let text = input.postText.trim();
  const tags = (input.hashtags || []).filter((t) => t?.trim());
  if (tags.length > 0) {
    const tagLine = tags.join(' ');
    if (!text.includes(tags[0])) {
      text += `\n\n${tagLine}`;
    }
  }

  const cta = input.callToAction?.trim();
  if (cta && cta.length > 3 && !text.toLowerCase().includes(cta.toLowerCase().slice(0, Math.min(24, cta.length)))) {
    text += `\n\n${cta}`;
  }

  const url = normalizeCtaUrl(input.ctaUrl);
  if (url && !text.includes(url)) {
    text += `\n\n🔗 ${url}`;
  }

  return text;
}

export function normalizeCtaUrl(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}
