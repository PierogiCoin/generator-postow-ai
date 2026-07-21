export function computeEngagementSummary(p: {
  metrics?: Record<string, unknown>;
}) {
  const impressions = Number(p.metrics?.impressions || p.metrics?.views || 0);
  const likes = Number(p.metrics?.likes || 0);
  const comments = Number(p.metrics?.comments || 0);
  const shares = Number(p.metrics?.shares || 0);
  const interactions = likes + comments + shares;
  const er = impressions > 0 ? interactions / impressions : 0;
  return { impressions, likes, comments, shares, interactions, engagementRate: er };
}

function optionalMetric(value: number | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function mapSocialPost(
  p: {
    id: string;
    content?: string;
    title?: string;
    publishedAt: string;
    url?: string;
    mediaUrl?: string;
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    reach?: number;
    impressions?: number;
  },
  platform: string,
  connectionId: string
) {
  // Nie wstawiaj zer dla brakujących pól — LI/TT bez insights nie mają wyglądać na „live”.
  const metrics = {
    likes: optionalMetric(p.likes),
    comments: optionalMetric(p.comments),
    shares: optionalMetric(p.shares),
    views: optionalMetric(p.views),
    reach: optionalMetric(p.reach),
    impressions: optionalMetric(p.impressions),
  };

  return {
    id: p.id,
    platformPostId: p.id,
    content: p.content || p.title || '',
    publishedAt: p.publishedAt,
    url: p.url,
    platform,
    connectionId,
    mediaUrl: p.mediaUrl,
    metrics,
  };
}
