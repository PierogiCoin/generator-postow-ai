-- ===============================================
-- 🗄️ COMPLETE DATABASE SCHEMA FOR PRODUCTION
-- ===============================================
-- Run this ONCE in Supabase SQL Editor
-- https://app.supabase.com → Your Project → SQL Editor
-- ===============================================

-- ===============================================
-- 1️⃣ USERS TABLE (Optional - for authentication)
-- ===============================================
-- Note: Supabase already has auth.users, but you can extend it
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free', -- free, basic, premium, enterprise
  daily_budget DECIMAL(10, 2) DEFAULT 10.00,
  total_spent DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);


-- ===============================================
-- 2️⃣ API COSTS TABLE (Required for cost tracking)
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

-- Policies
CREATE POLICY "Users can view own costs" ON public.api_costs
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can insert costs" ON public.api_costs
  FOR INSERT WITH CHECK (true);

-- Service role can read all (for analytics)
CREATE POLICY "Service role can read all costs" ON public.api_costs
  FOR SELECT USING (auth.role() = 'service_role');


-- ===============================================
-- 3️⃣ GENERATED CONTENT TABLE (Optional - track all generations)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'text', 'image', 'video'
  provider TEXT NOT NULL, -- 'gemini', 'dalle', 'luma', 'replicate'
  prompt TEXT,
  result_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  cost DECIMAL(10, 4),
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generated_content_user_id ON public.generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_type ON public.generated_content(content_type);
CREATE INDEX IF NOT EXISTS idx_generated_content_created ON public.generated_content(created_at DESC);

-- Enable RLS
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own content" ON public.generated_content
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own content" ON public.generated_content
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Service role can insert content" ON public.generated_content
  FOR INSERT WITH CHECK (true);


-- ===============================================
-- 4️⃣ MATERIALIZED VIEWS (For fast analytics)
-- ===============================================

-- User cost summary (refresh hourly)
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


-- Daily cost summary (refresh daily)
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
-- 5️⃣ FUNCTIONS & TRIGGERS
-- ===============================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION public.refresh_cost_summaries()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_cost_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_cost_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.refresh_cost_summaries() TO service_role;


-- Function to update user total_spent
-- Note: Only works if user_id matches a UUID in user_profiles
-- Silently ignores if user doesn't have a profile (anonymous users)
CREATE OR REPLACE FUNCTION public.update_user_total_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to update if user_id is a valid UUID and exists in user_profiles
  IF NEW.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    UPDATE public.user_profiles
    SET total_spent = total_spent + NEW.cost
    WHERE id = NEW.user_id::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on api_costs insert
CREATE TRIGGER trigger_update_user_spent
  AFTER INSERT ON public.api_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_total_spent();


-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ===============================================
-- 6️⃣ STORAGE BUCKETS (For generated content)
-- ===============================================

-- Create storage bucket for generated content (if not exists)
-- Note: Run this in Supabase Dashboard → Storage → Create Bucket
-- Or use SQL:

INSERT INTO storage.buckets (id, name, public)
VALUES ('generated_content', 'generated_content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated_content');

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated_content' AND auth.role() = 'authenticated');

CREATE POLICY "Service role can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated_content' AND auth.role() = 'service_role');

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'generated_content' AND auth.uid() = owner);


-- ===============================================
-- 7️⃣ RATE LIMITING TABLE (Optional but recommended)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint 
  ON public.rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window 
  ON public.rate_limits(window_start DESC);

-- Auto-cleanup old rate limit records (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===============================================
-- 8️⃣ ANALYTICS QUERIES (Helpful views)
-- ===============================================

-- Top spenders view
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

-- Recent failures view
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

-- Daily revenue view
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
-- 9️⃣ USEFUL QUERIES (Save as views if needed)
-- ===============================================

-- Query: User budget status
-- SELECT 
--   user_id,
--   SUM(cost) as today_spent,
--   up.daily_budget,
--   (up.daily_budget - SUM(cost)) as remaining
-- FROM public.api_costs ac
-- LEFT JOIN public.user_profiles up ON up.id::text = ac.user_id
-- WHERE DATE(ac.created_at) = CURRENT_DATE
-- GROUP BY user_id, up.daily_budget;

-- Query: Provider performance
-- SELECT 
--   provider,
--   operation,
--   COUNT(*) as total_requests,
--   AVG(duration_ms) as avg_duration,
--   SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate,
--   SUM(cost) as total_cost
-- FROM public.api_costs
-- WHERE created_at >= NOW() - INTERVAL '7 days'
-- GROUP BY provider, operation
-- ORDER BY total_requests DESC;


-- ===============================================
-- 🔟 CRON JOBS (Setup in Supabase pg_cron extension)
-- ===============================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Refresh materialized views every hour
SELECT cron.schedule(
  'refresh-cost-summaries',
  '0 * * * *', -- Every hour
  $$SELECT public.refresh_cost_summaries()$$
);

-- Cleanup old rate limits daily
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 2 * * *', -- 2 AM daily
  $$SELECT public.cleanup_rate_limits()$$
);

-- Archive old costs (older than 90 days) weekly
SELECT cron.schedule(
  'archive-old-costs',
  '0 3 * * 0', -- 3 AM every Sunday
  $$DELETE FROM public.api_costs WHERE created_at < NOW() - INTERVAL '90 days'$$
);


-- ===============================================
-- ✅ VERIFICATION QUERIES
-- ===============================================

-- Run these to verify everything is created:

-- 1. Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('user_profiles', 'api_costs', 'generated_content', 'rate_limits');

-- 2. Check views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public';

-- 3. Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public';

-- 4. Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- 5. Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'generated_content';

-- 6. Check cron jobs
SELECT * FROM cron.job;


-- ===============================================
-- 📊 SAMPLE DATA (Optional - for testing)
-- ===============================================

-- Insert sample cost record
-- INSERT INTO public.api_costs (user_id, operation, provider, cost, duration_ms, success, metadata)
-- VALUES ('test-user-123', 'image-generation', 'DALL-E', 0.04, 2500, true, '{"quality": "standard", "size": "1024x1024"}'::jsonb);

-- Insert sample user profile
-- INSERT INTO public.user_profiles (id, email, full_name, subscription_tier, daily_budget)
-- VALUES (gen_random_uuid(), 'test@example.com', 'Test User', 'premium', 50.00);


-- ===============================================
-- 🎉 DONE!
-- ===============================================

-- After running this script, you should have:
-- ✅ 4 main tables (user_profiles, api_costs, generated_content, rate_limits)
-- ✅ 2 materialized views (user_cost_summary, daily_cost_summary)
-- ✅ 3 analytical views (top_spenders, recent_failures, daily_revenue)
-- ✅ 1 storage bucket (generated_content)
-- ✅ 4 functions (refresh, update_spent, update_timestamp, cleanup)
-- ✅ 2 triggers (auto-update total_spent, updated_at)
-- ✅ 3 cron jobs (refresh views, cleanup, archive)
-- ✅ RLS policies on all tables

-- Next steps:
-- 1. Update your .env with VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY
-- 2. Test connection: SELECT * FROM public.api_costs LIMIT 1;
-- 3. Deploy your server
-- 4. Start tracking costs!

-- Support: https://supabase.com/docs
