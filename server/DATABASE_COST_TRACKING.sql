-- ===============================================
-- 💰 COST TRACKING SCHEMA
-- ===============================================

-- Cost tracking table
CREATE TABLE IF NOT EXISTS api_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  provider TEXT NOT NULL,
  cost DECIMAL(10, 4) NOT NULL,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_api_costs_user_id ON api_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_costs_created_at ON api_costs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_costs_provider ON api_costs(provider);
CREATE INDEX IF NOT EXISTS idx_api_costs_operation ON api_costs(operation);

-- User cost summary (materialized view for fast lookups)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_cost_summary AS
SELECT 
  user_id,
  COUNT(*) as total_requests,
  SUM(cost) as total_cost,
  SUM(CASE WHEN success = true THEN cost ELSE 0 END) as successful_cost,
  SUM(CASE WHEN success = false THEN cost ELSE 0 END) as failed_cost,
  AVG(duration_ms) as avg_duration_ms,
  MAX(created_at) as last_request_at,
  MIN(created_at) as first_request_at
FROM api_costs
GROUP BY user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_cost_summary_user_id ON user_cost_summary(user_id);

-- Daily cost summary
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_cost_summary AS
SELECT 
  DATE(created_at) as date,
  provider,
  operation,
  COUNT(*) as request_count,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost,
  AVG(duration_ms) as avg_duration_ms
FROM api_costs
GROUP BY DATE(created_at), provider, operation
ORDER BY date DESC, total_cost DESC;

CREATE INDEX IF NOT EXISTS idx_daily_cost_summary_date ON daily_cost_summary(date DESC);

-- Function to refresh materialized views (call periodically)
CREATE OR REPLACE FUNCTION refresh_cost_summaries()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_cost_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_cost_summary;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-refresh summaries (optional, can be heavy)
-- Alternatively, use a cron job to call refresh_cost_summaries() every hour

-- RLS (Row Level Security) Policies
ALTER TABLE api_costs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own costs
CREATE POLICY "Users can view own costs" ON api_costs
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Service role can insert costs
CREATE POLICY "Service role can insert costs" ON api_costs
  FOR INSERT
  WITH CHECK (true);

-- ===============================================
-- 📊 USEFUL QUERIES
-- ===============================================

-- Total costs by user (last 30 days)
-- SELECT 
--   user_id,
--   SUM(cost) as total_cost,
--   COUNT(*) as requests
-- FROM api_costs
-- WHERE created_at >= NOW() - INTERVAL '30 days'
-- GROUP BY user_id
-- ORDER BY total_cost DESC
-- LIMIT 10;

-- Costs by provider (today)
-- SELECT 
--   provider,
--   operation,
--   COUNT(*) as count,
--   SUM(cost) as total_cost
-- FROM api_costs
-- WHERE DATE(created_at) = CURRENT_DATE
-- GROUP BY provider, operation
-- ORDER BY total_cost DESC;

-- User spending trends (last 7 days)
-- SELECT 
--   DATE(created_at) as date,
--   user_id,
--   SUM(cost) as daily_cost
-- FROM api_costs
-- WHERE created_at >= NOW() - INTERVAL '7 days'
-- GROUP BY DATE(created_at), user_id
-- ORDER BY date DESC, daily_cost DESC;

-- Most expensive operations
-- SELECT 
--   operation,
--   provider,
--   AVG(cost) as avg_cost,
--   MAX(cost) as max_cost,
--   COUNT(*) as frequency
-- FROM api_costs
-- GROUP BY operation, provider
-- ORDER BY avg_cost DESC;

-- Failed requests (wasted costs)
-- SELECT 
--   user_id,
--   operation,
--   provider,
--   cost,
--   created_at
-- FROM api_costs
-- WHERE success = false
-- ORDER BY created_at DESC
-- LIMIT 50;
