-- ===============================================
-- FIX: Add retry_count and next_retry_at columns to scheduled_posts
-- Run this in Supabase SQL Editor
-- ===============================================

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Index for efficient retry queries
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_retry
  ON scheduled_posts(status, next_retry_at)
  WHERE status = 'failed' AND retry_count < 3;
