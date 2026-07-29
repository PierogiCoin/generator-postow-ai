export const validatePostContent = (content: string, platform: string): { valid: boolean; error?: string } => {
  const limits: Record<string, number> = {
    twitter: 280,
    linkedin: 3000,
    facebook: 63206,
    instagram: 2200,
    tiktok: 2200,
    youtube: 5000,
    threads: 500,
  };

  const limit = limits[platform.toLowerCase()];

  if (!limit) {
    return { valid: false, error: 'Unsupported platform' };
  }

  if (content.length > limit) {
    return { valid: false, error: `Content exceeds ${platform} character limit of ${limit}` };
  }

  return { valid: true };
};

export const formatHashtags = (hashtags: string[]): string => {
  return hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
};
