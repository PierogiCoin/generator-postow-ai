-- ===============================================
-- 🗄️ MINIMAL DATABASE SCHEMA (Required Only)
-- ===============================================
-- Use this if you DON'T need user profiles or advanced features
-- Just cost tracking + storage
-- ===============================================

-- ===============================================
-- 1️⃣ API COSTS TABLE (REQUIRED)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.api_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  provider TEXT NOT NULL,
  cost DECIMAL(10, 4) NOT NULL,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_api_costs_user_id ON public.api_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_costs_created_at ON public.api_costs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_costs_provider ON public.api_costs(provider);
CREATE INDEX IF NOT EXISTS idx_api_costs_operation ON public.api_costs(operation);
CREATE INDEX IF NOT EXISTS idx_api_costs_success ON public.api_costs(success);

-- Enable RLS
ALTER TABLE public.api_costs ENABLE ROW LEVEL SECURITY;

-- Policies (service role can read all, others denied by default)
CREATE POLICY "Service role can read all" ON public.api_costs
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert costs" ON public.api_costs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can read all costs" ON public.api_costs
  FOR SELECT USING (auth.role() = 'service_role');


-- ===============================================
-- 2️⃣ MATERIALIZED VIEWS (For fast analytics)
-- ===============================================

-- User cost summary
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_cost_summary AS
SELECT 
  user_id,
  COUNT(*) as total_requests,
  SUM(cost) as total_cost,
  SUM(CASE WHEN success = true THEN cost ELSE 0 END) as successful_cost,
  SUM(CASE WHEN success = false THEN cost ELSE 0 END) as failed_cost,
  AVG(duration_ms) as avg_duration_ms,
  MAX(created_at) as last_request_at,
  MIN(created_at) as first_request_at
FROM public.api_costs
GROUP BY user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_cost_summary_user_id 
  ON public.user_cost_summary(user_id);


-- Daily cost summary
CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_cost_summary AS
SELECT 
  DATE(created_at) as date,
  provider,
  operation,
  COUNT(*) as request_count,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost,
  AVG(duration_ms) as avg_duration_ms,
  SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_count,
  SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_count
FROM public.api_costs
GROUP BY DATE(created_at), provider, operation
ORDER BY date DESC, total_cost DESC;

CREATE INDEX IF NOT EXISTS idx_daily_cost_summary_date 
  ON public.daily_cost_summary(date DESC);


-- ===============================================
-- 3️⃣ REFRESH FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION public.refresh_cost_summaries()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_cost_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_cost_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_cost_summaries() TO service_role;


-- ===============================================
-- 4️⃣ STORAGE BUCKET
-- ===============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('generated_content', 'generated_content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated_content');

CREATE POLICY "Service role can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated_content' AND auth.role() = 'service_role');


-- ===============================================
-- 5️⃣ HELPFUL VIEWS
-- ===============================================

-- Top spenders
CREATE OR REPLACE VIEW public.top_spenders AS
SELECT 
  user_id,
  SUM(cost) as total_cost,
  COUNT(*) as total_requests,
  AVG(cost) as avg_cost_per_request,
  MAX(created_at) as last_request
FROM public.api_costs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_cost DESC
LIMIT 100;

-- Recent failures
CREATE OR REPLACE VIEW public.recent_failures AS
SELECT 
  user_id,
  operation,
  provider,
  cost,
  metadata,
  created_at
FROM public.api_costs
WHERE success = false
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;

-- Daily revenue
CREATE OR REPLACE VIEW public.daily_revenue AS
SELECT 
  DATE(created_at) as date,
  SUM(cost) as revenue,
  COUNT(*) as requests,
  COUNT(DISTINCT user_id) as active_users
FROM public.api_costs
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;


-- ===============================================
-- 6️⃣ CRON JOBS (Optional - requires pg_cron extension)
-- ===============================================

-- Enable extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Refresh views every hour
SELECT cron.schedule(
  'refresh-cost-summaries',
  '0 * * * *',
  $$SELECT public.refresh_cost_summaries()$$
);

-- Archive old costs weekly (keep 90 days)
SELECT cron.schedule(
  'archive-old-costs',
  '0 3 * * 0',
  $$DELETE FROM public.api_costs WHERE created_at < NOW() - INTERVAL '90 days'$$
);


-- ===============================================
-- ✅ VERIFICATION
-- ===============================================

-- Check table exists
SELECT COUNT(*) FROM public.api_costs;

-- Check views exist
SELECT COUNT(*) FROM public.user_cost_summary;
SELECT COUNT(*) FROM public.daily_cost_summary;

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'generated_content';

-- ===============================================
-- 🎉 DONE!
-- ===============================================

-- You now have:
-- ✅ api_costs table
-- ✅ 2 materialized views
-- ✅ 3 helper views
-- ✅ Storage bucket
-- ✅ Refresh function
-- ✅ 2 cron jobs

-- Next: Update .env and deploy!
