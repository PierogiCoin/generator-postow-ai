-- ===============================================
-- FIX: Scheduler permissions for scheduled_posts
-- Run this in Supabase SQL Editor
-- ===============================================

-- 1. Add service_role bypass policy so the server-side scheduler
--    can read and update scheduled_posts for ANY user
DROP POLICY IF EXISTS "Service role can manage all scheduled_posts" ON scheduled_posts;
CREATE POLICY "Service role can manage all scheduled_posts" ON scheduled_posts
  FOR ALL USING (auth.role() = 'service_role');

-- 2. Also fix social_connections so the scheduler can read tokens
DROP POLICY IF EXISTS "Service role can read all social_connections" ON social_connections;
CREATE POLICY "Service role can read all social_connections" ON social_connections
  FOR SELECT USING (auth.role() = 'service_role');

-- 3. Fix social_posts for the sync service
DROP POLICY IF EXISTS "Service role can perform all on social posts" ON social_posts;
CREATE POLICY "Service role can perform all on social posts" ON social_posts
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Also allow service_role to update social_connections (for last_sync_at, is_active)
DROP POLICY IF EXISTS "Service role can update social_connections" ON social_connections;
CREATE POLICY "Service role can update social_connections" ON social_connections
  FOR UPDATE USING (auth.role() = 'service_role');

-- Done. After running this, re-enable the scheduler in server/index.ts
