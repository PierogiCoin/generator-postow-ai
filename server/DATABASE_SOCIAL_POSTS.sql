-- ===============================================
-- 📊 SOCIAL POSTS & ANALYTICS TABLE
-- ===============================================
-- Run this in Supabase SQL Editor to enable persistent tracking
-- and AI analysis of posts from external platforms.

CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.social_connections(id) ON DELETE CASCADE,
  platform_post_id TEXT NOT NULL,
  content TEXT,
  published_at TIMESTAMPTZ,
  url TEXT,
  media_url TEXT,
  platform TEXT NOT NULL,
  metrics JSONB DEFAULT '{
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "views": 0,
    "reach": 0,
    "impressions": 0
  }'::jsonb,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, platform_post_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON public.social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_published_at ON public.social_posts(published_at DESC);

-- Enable Row Level Security
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own social posts" ON public.social_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own social posts" ON public.social_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Service role policies (for server-side sync)
CREATE POLICY "Service role can perform all on social posts" ON public.social_posts
  FOR ALL USING (auth.role() = 'service_role');

-- Comment for table
COMMENT ON TABLE public.social_posts IS 'Stores historical and published posts from connected social media accounts for analysis.';
