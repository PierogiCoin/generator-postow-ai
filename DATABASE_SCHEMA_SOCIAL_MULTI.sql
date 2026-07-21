-- ============================================
-- Multi-account social connections + new platforms
-- Run in Supabase SQL Editor
-- ============================================

-- Allow multiple accounts per platform (user_id + platform + account_id)
ALTER TABLE public.social_connections
  DROP CONSTRAINT IF EXISTS social_connections_user_id_platform_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_connections_user_platform_account_key'
  ) THEN
    ALTER TABLE public.social_connections
      ADD CONSTRAINT social_connections_user_platform_account_key
      UNIQUE (user_id, platform, account_id);
  END IF;
END $$;

-- Expand platform CHECK to include tiktok, youtube, threads
ALTER TABLE public.social_connections DROP CONSTRAINT IF EXISTS social_connections_platform_check;
ALTER TABLE public.social_connections
  ADD CONSTRAINT social_connections_platform_check
  CHECK (platform IN (
    'linkedin', 'twitter', 'facebook', 'instagram', 'tiktok', 'youtube', 'threads'
  ));

-- Optional: store preferred connection on scheduled posts
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.social_connections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_social_connections_user_platform
  ON public.social_connections(user_id, platform)
  WHERE is_active = true;
