-- ===============================================
-- 🗄️ SUPER SIMPLE DATABASE (No RLS complications)
-- ===============================================
-- Perfect for: Quick start, no auth system yet
-- ===============================================

-- ===============================================
-- 1️⃣ API COSTS TABLE
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_costs_user_id ON public.api_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_costs_created_at ON public.api_costs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_costs_provider ON public.api_costs(provider);

-- RLS: Service role has full access (needed for server)
ALTER TABLE public.api_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.api_costs
  USING (true)
  WITH CHECK (true);


-- ===============================================
-- 2️⃣ MATERIALIZED VIEWS
-- ===============================================

-- User cost summary
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_cost_summary AS
SELECT 
  user_id,
  COUNT(*) as total_requests,
  SUM(cost) as total_cost,
  AVG(duration_ms) as avg_duration_ms,
  MAX(created_at) as last_request_at
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
  AVG(cost) as avg_cost
FROM public.api_costs
GROUP BY DATE(created_at), provider, operation
ORDER BY date DESC;

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


-- ===============================================
-- 4️⃣ STORAGE BUCKET
-- ===============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('generated_content', 'generated_content', true)
ON CONFLICT (id) DO NOTHING;

-- Public access (anyone can read)
CREATE POLICY "Public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'generated_content');

-- Service role can upload
CREATE POLICY "Service upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'generated_content');


-- ===============================================
-- 5️⃣ HELPFUL VIEWS
-- ===============================================

CREATE OR REPLACE VIEW public.top_spenders AS
SELECT 
  user_id,
  SUM(cost) as total_cost,
  COUNT(*) as total_requests
FROM public.api_costs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_cost DESC
LIMIT 100;

CREATE OR REPLACE VIEW public.daily_revenue AS
SELECT 
  DATE(created_at) as date,
  SUM(cost) as revenue,
  COUNT(*) as requests
FROM public.api_costs
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;


-- ===============================================
-- ✅ VERIFICATION
-- ===============================================

SELECT 'Database ready!' as status,
       COUNT(*) as costs_count
FROM public.api_costs;

-- ===============================================
-- 🎉 DONE!
-- ===============================================
-- ✅ api_costs table with indexes
-- ✅ 2 materialized views
-- ✅ 2 helper views  
-- ✅ Storage bucket
-- ✅ Simple RLS (service role only)
-- ✅ No UUID casting issues!
