-- ===============================================
-- FIX: Add 'tiktok' to social_connections CHECK constraint
-- Run this in Supabase SQL Editor
-- ===============================================

-- Drop the old constraint and add a new one including tiktok
ALTER TABLE social_connections
  DROP CONSTRAINT IF EXISTS social_connections_platform_check;

ALTER TABLE social_connections
  ADD CONSTRAINT social_connections_platform_check
  CHECK (platform IN ('linkedin', 'twitter', 'facebook', 'instagram', 'tiktok'));
