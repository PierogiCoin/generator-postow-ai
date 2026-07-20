/** Walidacja body i reguł platformy przed publikacją (bez side-effectów). */

export interface PublishBody {
  connectionId: string;
  postText: string;
  imageUrl?: string;
  scheduledPostId?: string;
  historyId?: string;
  hashtags?: string[];
  callToAction?: string | null;
  ctaUrl?: string | null;
}

/** Normalizacja platformy UI → klucz w social_connections / publisherach. */
export function normalizeSocialPlatform(raw: string | undefined | null): string {
  const p = (raw || 'facebook').toLowerCase().trim();
  if (p === 'x' || p === 'twitter/x') return 'twitter';
  if (p === 'ig') return 'instagram';
  if (p === 'fb') return 'facebook';
  if (p === 'li') return 'linkedin';
  return p;
}

/**
 * Blokuje publikację gdy treść czeka na akceptację lub została odrzucona.
 * `draft` / `approved` / brak statusu = dozwolone.
 */
export function assertPublishApprovalAllowed(
  approvalStatus: string | null | undefined
): void {
  const status = (approvalStatus || 'draft').toLowerCase();
  if (status === 'pending_approval') {
    throw new Error(
      'Post oczekuje na akceptację — nie można opublikować przed zatwierdzeniem.'
    );
  }
  if (status === 'rejected') {
    throw new Error('Post został odrzucony — nie można opublikować.');
  }
}

export function isApprovalBlockingPublish(
  approvalStatus: string | null | undefined
): boolean {
  const status = (approvalStatus || 'draft').toLowerCase();
  return status === 'pending_approval' || status === 'rejected';
}

export type PublishBodyResult =
  | { ok: true; data: PublishBody }
  | { ok: false; status: 400; error: string };

export function validatePublishBody(body: unknown): PublishBodyResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Missing connectionId or postText' };
  }
  const b = body as Record<string, unknown>;
  const connectionId = typeof b.connectionId === 'string' ? b.connectionId.trim() : '';
  const postText = typeof b.postText === 'string' ? b.postText.trim() : '';

  if (!connectionId || !postText) {
    return { ok: false, status: 400, error: 'Missing connectionId or postText' };
  }

  return {
    ok: true,
    data: {
      connectionId,
      postText,
      imageUrl: typeof b.imageUrl === 'string' ? b.imageUrl : undefined,
      scheduledPostId: typeof b.scheduledPostId === 'string' ? b.scheduledPostId : undefined,
      historyId: typeof b.historyId === 'string' ? b.historyId : undefined,
      hashtags: Array.isArray(b.hashtags)
        ? b.hashtags.filter((t): t is string => typeof t === 'string')
        : undefined,
      callToAction: typeof b.callToAction === 'string' ? b.callToAction : null,
      ctaUrl: typeof b.ctaUrl === 'string' ? b.ctaUrl : null,
    },
  };
}

/** Reguły platformowe przed wywołaniem publishera. */
export function assertPlatformPublishRules(
  platform: string,
  imageUrl?: string
): void {
  if (platform === 'instagram' && !imageUrl) {
    throw new Error('Instagram wymaga obrazka do publikacji posta.');
  }
}
