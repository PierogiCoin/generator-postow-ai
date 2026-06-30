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
  return {
    id: p.id,
    platformPostId: p.id,
    content: p.content || p.title || '',
    publishedAt: p.publishedAt,
    url: p.url,
    platform,
    connectionId,
    mediaUrl: p.mediaUrl,
    metrics: {
      likes: p.likes || 0,
      comments: p.comments || 0,
      shares: p.shares || 0,
      views: p.views || 0,
      reach: p.reach || 0,
      impressions: p.impressions || 0,
    },
  };
}
