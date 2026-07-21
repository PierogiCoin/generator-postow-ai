-- ============================================
-- Evergreen / content recycling queue
-- Run in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.evergreen_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID,
  source_history_id TEXT,
  source_content TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL DEFAULT 'facebook',
  connection_id UUID REFERENCES public.social_connections(id) ON DELETE SET NULL,
  recycle_after_days INTEGER NOT NULL DEFAULT 30
    CHECK (recycle_after_days >= 7 AND recycle_after_days <= 365),
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_published_at TIMESTAMP WITH TIME ZONE,
  times_recycled INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  form_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evergreen_next_run
  ON public.evergreen_queue(next_run_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_evergreen_user
  ON public.evergreen_queue(user_id);

ALTER TABLE public.evergreen_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own evergreen" ON public.evergreen_queue;
CREATE POLICY "Users manage own evergreen" ON public.evergreen_queue
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
