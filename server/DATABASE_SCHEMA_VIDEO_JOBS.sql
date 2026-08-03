-- Async video story jobs (survives Railway restart / multi-instance)
CREATE TABLE IF NOT EXISTS public.video_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'queued',
  stage_label TEXT NOT NULL DEFAULT '',
  progress INTEGER NOT NULL DEFAULT 0,
  active_provider TEXT,
  poll_attempt INTEGER,
  poll_max INTEGER,
  estimated_seconds INTEGER,
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_user_updated
  ON public.video_jobs (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_jobs_updated
  ON public.video_jobs (updated_at);

ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

-- Backend uses service_role; no authenticated client access needed
DROP POLICY IF EXISTS video_jobs_deny_all ON public.video_jobs;
CREATE POLICY video_jobs_deny_all ON public.video_jobs
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);
