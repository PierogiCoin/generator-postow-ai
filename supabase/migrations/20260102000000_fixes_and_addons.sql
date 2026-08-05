-- Atomowy debit kredytów (race-safe przy równoległych requestach)
CREATE OR REPLACE FUNCTION public.debit_credits(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_bal integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id
    AND credits >= p_amount
  RETURNING credits INTO new_bal;

  IF new_bal IS NULL THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  RETURN new_bal;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debit_credits(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_credits(uuid, integer) TO authenticated;
-- Launch migrations: calendar plans, strategic audits, tracked competitors, plan CHECK
-- Run in Supabase SQL Editor (safe to re-run)

-- ── 1. Rozszerz dozwolone plany subskrypcji ─────────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'creator', 'pro', 'business', 'agency', 'enterprise'));

-- ── 2. Plany kalendarza (intelligent calendar) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.calendar_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_plans_user_ts
  ON public.calendar_plans(user_id, timestamp DESC);

ALTER TABLE public.calendar_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own calendar_plans" ON public.calendar_plans;
CREATE POLICY "Users manage own calendar_plans"
  ON public.calendar_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Audyty strategiczne ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.strategic_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategic_audits_user_ts
  ON public.strategic_audits(user_id, timestamp DESC);

ALTER TABLE public.strategic_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own strategic_audits" ON public.strategic_audits;
CREATE POLICY "Users manage own strategic_audits"
  ON public.strategic_audits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 4. Śledzeni konkurenci (zamiast localStorage) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.tracked_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  platform TEXT NOT NULL,
  niche TEXT NOT NULL DEFAULT '',
  analysis JSONB,
  last_analyzed_at TIMESTAMPTZ,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tracked_competitors_user_platform_handle UNIQUE (user_id, platform, handle)
);

CREATE INDEX IF NOT EXISTS idx_tracked_competitors_user
  ON public.tracked_competitors(user_id, added_at DESC);

ALTER TABLE public.tracked_competitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own tracked_competitors" ON public.tracked_competitors;
CREATE POLICY "Users manage own tracked_competitors"
  ON public.tracked_competitors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- Referral: O(1) lookup zamiast skanu całej tabeli profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code
  ON profiles (referral_code)
  WHERE referral_code IS NOT NULL;

-- Wypełnij istniejące profile (format GPA-XXXXXXXX z pierwszych 8 hex UUID)
UPDATE profiles
SET referral_code = 'GPA-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;
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
-- RLS hardening: brakujące polityki + zaostrzenie api_costs INSERT
-- Safe to re-run

-- ── subscriptions: użytkownik widzi tylko swoją subskrypcję ─────────────────
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ── credit_transactions: tylko odczyt własnych ───────────────────────────────
DROP POLICY IF EXISTS credit_transactions_select_own ON public.credit_transactions;
CREATE POLICY credit_transactions_select_own ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ── notifications: pełny dostęp do własnych ──────────────────────────────────
DROP POLICY IF EXISTS notifications_all_own ON public.notifications;
CREATE POLICY notifications_all_own ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── api_costs: użytkownik widzi tylko swoje koszty ─────────────────────────
DROP POLICY IF EXISTS api_costs_select_own ON public.api_costs;
CREATE POLICY api_costs_select_own ON public.api_costs
  FOR SELECT USING (auth.uid()::text = user_id OR user_id = auth.uid()::text);

-- Zaostrzenie INSERT — tylko service_role (linter: permissive WITH CHECK true)
DROP POLICY IF EXISTS api_costs_insert_service ON public.api_costs;
CREATE POLICY api_costs_insert_service ON public.api_costs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ── history: użytkownik może dodawać własne wpisy ────────────────────────────
DROP POLICY IF EXISTS "Users can insert own history" ON public.history;
CREATE POLICY "Users can insert own history" ON public.history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── social_posts: użytkownik może aktualizować własne (np. ai_analysis) ─────
DROP POLICY IF EXISTS "Users can update own social posts" ON public.social_posts;
CREATE POLICY "Users can update own social posts" ON public.social_posts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
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
-- Stripe billing columns on profiles (run in Supabase SQL Editor)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);

-- Subscriptions audit table (optional — webhook upsert)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);
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
-- ===============================================
-- 💰 PRICING & SUBSCRIPTION ADDON
-- ===============================================
-- Run this AFTER DATABASE_COMPLETE_SCHEMA.sql or DATABASE_SIMPLE.sql
-- Adds subscription tiers, credits, and usage tracking
-- ===============================================

-- ===============================================
-- 1️⃣ ADD SUBSCRIPTION FIELDS TO USER_PROFILES
-- ===============================================

-- If using DATABASE_COMPLETE_SCHEMA.sql (has user_profiles):
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS 
  stripe_customer_id TEXT UNIQUE;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS 
  stripe_subscription_id TEXT UNIQUE;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS 
  credit_balance INTEGER DEFAULT 100;

-- Subscription tier is already in user_profiles, but ensure values
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_tier_check;

ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_subscription_tier_check 
  CHECK (subscription_tier IN ('free', 'pro', 'business', 'enterprise'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS 
  subscription_status TEXT DEFAULT 'active' 
  CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS 
  subscription_period_end TIMESTAMPTZ;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS 
  subscription_cancel_at_period_end BOOLEAN DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer 
  ON user_profiles(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status 
  ON user_profiles(subscription_status);


-- ===============================================
-- 2️⃣ CREDIT USAGE TRACKING
-- ===============================================

CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Can be UUID or TEXT
  action TEXT NOT NULL,
  credits_used INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id 
  ON credit_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_usage_created_at 
  ON credit_usage(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_usage_action 
  ON credit_usage(action);

-- RLS
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access credits" ON credit_usage
  USING (true)
  WITH CHECK (true);


-- ===============================================
-- 3️⃣ SUBSCRIPTION HISTORY
-- ===============================================

CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  old_tier TEXT,
  new_tier TEXT NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_user 
  ON subscription_history(user_id);


-- ===============================================
-- 4️⃣ CREDIT PURCHASES (One-time packs)
-- ===============================================

CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount_paid DECIMAL(10, 2) NOT NULL,
  credits_purchased INTEGER NOT NULL,
  credits_bonus INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_user 
  ON credit_purchases(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_status 
  ON credit_purchases(status);


-- ===============================================
-- 5️⃣ USAGE LIMITS TRACKING
-- ===============================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  posts_created INTEGER DEFAULT 0,
  images_created INTEGER DEFAULT 0,
  videos_created INTEGER DEFAULT 0,
  total_credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index for fast lookups
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period 
  ON usage_tracking(user_id, period_start, period_end);


-- ===============================================
-- 6️⃣ INVOICES TABLE (For record keeping)
-- ===============================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  stripe_invoice_id TEXT UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_pdf TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user 
  ON invoices(user_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status 
  ON invoices(status);


-- ===============================================
-- 7️⃣ TIER LIMITS CONFIGURATION
-- ===============================================

CREATE TABLE IF NOT EXISTS tier_limits (
  tier TEXT PRIMARY KEY CHECK (tier IN ('free', 'pro', 'business', 'enterprise')),
  monthly_credits INTEGER NOT NULL,
  max_posts INTEGER NOT NULL,
  max_images INTEGER NOT NULL,
  max_videos INTEGER NOT NULL,
  features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default limits
INSERT INTO tier_limits (tier, monthly_credits, max_posts, max_images, max_videos, features) VALUES
('free', 100, 10, 5, 0, '{"platforms": "all", "analytics": "basic", "support": "community"}'::jsonb),
('pro', 1000, 100, 50, 10, '{"platforms": "all", "analytics": "advanced", "support": "email", "rollover": 500}'::jsonb),
('business', 5000, 500, 200, 50, '{"platforms": "all", "analytics": "premium", "support": "priority", "rollover": 2000, "team_size": 3}'::jsonb),
('enterprise', 20000, -1, -1, -1, '{"platforms": "all", "analytics": "custom", "support": "dedicated", "rollover": -1, "team_size": -1, "sla": true}'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
  monthly_credits = EXCLUDED.monthly_credits,
  max_posts = EXCLUDED.max_posts,
  max_images = EXCLUDED.max_images,
  max_videos = EXCLUDED.max_videos,
  features = EXCLUDED.features,
  updated_at = NOW();


-- ===============================================
-- 8️⃣ CREDIT COSTS CONFIGURATION
-- ===============================================

CREATE TABLE IF NOT EXISTS credit_costs (
  action TEXT PRIMARY KEY,
  credits INTEGER NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default costs
INSERT INTO credit_costs (action, credits, description, category) VALUES
('generatePost', 10, 'Generate text post', 'content'),
('generateHashtags', 5, 'Generate hashtags', 'content'),
('optimizeForPlatform', 5, 'Optimize for platform', 'content'),
('generateImage', 50, 'Generate image (DALL-E)', 'image'),
('generateCarousel', 100, 'Generate carousel (multiple images)', 'image'),
('generateVideoBasic', 100, 'Generate video (Replicate)', 'video'),
('generateVideoPremium', 200, 'Generate video (Luma AI)', 'video'),
('generateVideoVertical', 200, 'Generate vertical video (9:16)', 'video'),
('aiVoiceOver', 150, 'Add AI voice-over', 'audio'),
('backgroundMusic', 50, 'Add background music', 'audio'),
('customBranding', 30, 'Add custom branding', 'branding'),
('batchOptimize', 40, 'Batch optimize (10 platforms)', 'bulk'),
('schedulePosts', 10, 'Schedule posts', 'automation'),
('detailedAnalytics', 20, 'Detailed analytics report', 'analytics'),
('competitorAnalysis', 50, 'Competitor analysis', 'analytics')
ON CONFLICT (action) DO UPDATE SET
  credits = EXCLUDED.credits,
  description = EXCLUDED.description,
  updated_at = NOW();


-- ===============================================
-- 9️⃣ FUNCTIONS
-- ===============================================

-- Function to check if user has enough credits
CREATE OR REPLACE FUNCTION check_user_credits(
  p_user_id TEXT,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_cost INTEGER;
  v_balance INTEGER;
BEGIN
  -- Get cost for action
  SELECT credits INTO v_cost
  FROM credit_costs
  WHERE action = p_action;
  
  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'Unknown action: %', p_action;
  END IF;
  
  -- Get user balance (from user_profiles or default)
  SELECT COALESCE(credit_balance, 0) INTO v_balance
  FROM user_profiles
  WHERE id::text = p_user_id OR email = p_user_id;
  
  -- If user not found, assume 0 balance
  IF v_balance IS NULL THEN
    v_balance := 0;
  END IF;
  
  RETURN v_balance >= v_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id TEXT,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER AS $$
DECLARE
  v_cost INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get cost
  SELECT credits INTO v_cost
  FROM credit_costs
  WHERE action = p_action;
  
  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'Unknown action: %', p_action;
  END IF;
  
  -- Deduct from user balance
  UPDATE user_profiles
  SET credit_balance = credit_balance - v_cost
  WHERE id::text = p_user_id OR email = p_user_id
  RETURNING credit_balance INTO v_new_balance;
  
  -- Log usage
  INSERT INTO credit_usage (user_id, action, credits_used, credits_remaining, metadata)
  VALUES (p_user_id, p_action, v_cost, COALESCE(v_new_balance, 0), p_metadata);
  
  RETURN COALESCE(v_new_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to refill monthly credits
CREATE OR REPLACE FUNCTION refill_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles up
  SET credit_balance = tl.monthly_credits,
      updated_at = NOW()
  FROM tier_limits tl
  WHERE up.subscription_tier = tl.tier
    AND (up.subscription_period_end IS NULL 
         OR up.subscription_period_end > NOW())
    AND up.subscription_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===============================================
-- 🔟 MATERIALIZED VIEWS
-- ===============================================

-- User usage summary
CREATE MATERIALIZED VIEW IF NOT EXISTS user_usage_summary AS
SELECT 
  user_id,
  COUNT(*) as total_actions,
  SUM(credits_used) as total_credits_used,
  COUNT(DISTINCT action) as unique_actions,
  MAX(created_at) as last_activity,
  DATE(MAX(created_at)) as last_active_date
FROM credit_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_usage_summary_user 
  ON user_usage_summary(user_id);


-- Top actions by usage
CREATE MATERIALIZED VIEW IF NOT EXISTS top_actions AS
SELECT 
  action,
  COUNT(*) as usage_count,
  SUM(credits_used) as total_credits,
  AVG(credits_used) as avg_credits
FROM credit_usage
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY usage_count DESC;


-- ===============================================
-- 1️⃣1️⃣ CRON JOBS (Optional - requires pg_cron)
-- ===============================================

-- Refill credits on 1st of month (if pg_cron enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'refill-monthly-credits',
      '0 0 1 * *',  -- 1st of each month at midnight
      $$SELECT refill_monthly_credits()$$
    );
  END IF;
END $$;

-- Refresh usage views daily
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'refresh-usage-views',
      '0 1 * * *',  -- 1 AM daily
      $$
      REFRESH MATERIALIZED VIEW CONCURRENTLY user_usage_summary;
      REFRESH MATERIALIZED VIEW CONCURRENTLY top_actions;
      $$
    );
  END IF;
END $$;


-- ===============================================
-- ✅ VERIFICATION
-- ===============================================

-- Check all tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN (
    'credit_usage',
    'subscription_history',
    'credit_purchases',
    'usage_tracking',
    'invoices',
    'tier_limits',
    'credit_costs'
  );

-- Check configuration
SELECT * FROM tier_limits ORDER BY monthly_credits;
SELECT * FROM credit_costs ORDER BY category, credits;

-- Test functions
SELECT check_user_credits('test-user', 'generatePost');
-- Should return: true or false

-- ===============================================
-- 🎉 DONE!
-- ===============================================

-- You now have:
-- ✅ Subscription tiers with limits
-- ✅ Credit system (100-20,000 per tier)
-- ✅ Usage tracking
-- ✅ Credit purchases (packs)
-- ✅ Invoice records
-- ✅ Helper functions
-- ✅ Materialized views
-- ✅ Auto-refill (monthly)

-- Next steps:
-- 1. Integrate with Stripe
-- 2. Add credit checking middleware
-- 3. Implement upgrade flow
-- 4. Add usage monitoring UI

-- See: PRICING_STRATEGY.md for full details!
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
-- ============================================================
-- Email System Tables — kolejka, logi, unsubscribe
-- ============================================================

-- Tabela: email_queue — zaplanowane emaile do wysłania
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  email_type TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  metadata JSONB,
  error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeksy dla wydajnego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_email_queue_status_sendat ON email_queue (status, send_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_user ON email_queue (user_id);

-- Tabela: email_log — historia wysłanych emaili
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  email_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_user_type ON email_log (user_id, email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log (created_at);

-- Tabela: email_unsubscribe — preferencje unsubscribe
CREATE TABLE IF NOT EXISTS email_unsubscribe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  email_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_type)
);

-- Tabela: trial_history — historia darmowych okresów próbnych
CREATE TABLE IF NOT EXISTS trial_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  trial_days INTEGER NOT NULL DEFAULT 7,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_history_user ON trial_history (user_id);

-- RLS
ALTER TABLE trial_history ENABLE ROW LEVEL SECURITY;
GRANT ALL ON trial_history TO service_role;

-- Tabela: credit_rollover_log — historia rollover kredytów
CREATE TABLE IF NOT EXISTS credit_rollover_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  rolled_over INTEGER NOT NULL,
  previous_balance INTEGER NOT NULL,
  new_balance INTEGER NOT NULL,
  plan TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_rollover_user ON credit_rollover_log (user_id, created_at DESC);

-- RLS
ALTER TABLE credit_rollover_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON credit_rollover_log TO service_role;

CREATE POLICY "Service role full access credit_rollover_log" ON credit_rollover_log
  FOR ALL USING (true) WITH CHECK (true);

-- Tabela: referrals — system poleceń
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL,
  referee_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals (referee_id);

-- RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
GRANT ALL ON referrals TO service_role;

CREATE POLICY "Service role full access referrals" ON referrals
  FOR ALL USING (true) WITH CHECK (true);

-- Użytkownicy mogą odczytywać własne polecenia (jako polecający)
CREATE POLICY "Users can read own referrals" ON referrals
  FOR SELECT USING (auth.uid()::text = referrer_id OR auth.uid()::text = referee_id);

-- Użytkownicy mogą odczytywać własną historię rollover
CREATE POLICY "Users can read own rollover" ON credit_rollover_log
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Service role full access email_queue" ON email_queue
  FOR ALL USING (true) WITH CHECK (true);

-- RLS dla email_log — service role only
CREATE POLICY "Service role full access email_log" ON email_log
  FOR ALL USING (true) WITH CHECK (true);

-- Użytkownicy mogą odczytywać własne preferencje unsubscribe
CREATE POLICY "Users can read own unsubscribe" ON email_unsubscribe
  FOR SELECT USING (auth.uid()::text = user_id);

-- Użytkownicy mogą zarządzać własnym unsubscribe
CREATE POLICY "Users can manage own unsubscribe" ON email_unsubscribe
  FOR ALL USING (auth.uid()::text = user_id);

-- ============================================================
-- ABANDONED CHECKOUTS — śledzenie niedokończonych płatności
-- ============================================================
CREATE TABLE IF NOT EXISTS abandoned_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'subscription',
  price_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | expired
  recovery_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_status ON abandoned_checkouts(status);
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_user ON abandoned_checkouts(user_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_created ON abandoned_checkouts(created_at);

-- RLS: service role only (cron endpoint używa service role)
CREATE POLICY "Service role full access abandoned_checkouts" ON abandoned_checkouts
  FOR ALL USING (true) WITH CHECK (true);
-- ===============================================
-- 📊 SOCIAL POSTS & ANALYTICS TABLE
-- ===============================================
-- Run this in Supabase SQL Editor to enable persistent tracking
-- and AI analysis of posts from external platforms.

CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.social_connections(id) ON DELETE CASCADE,
  platform_post_id TEXT NOT NULL,
  content TEXT,
  published_at TIMESTAMPTZ,
  url TEXT,
  media_url TEXT,
  platform TEXT NOT NULL,
  metrics JSONB DEFAULT '{
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "views": 0,
    "reach": 0,
    "impressions": 0
  }'::jsonb,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, platform_post_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON public.social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_published_at ON public.social_posts(published_at DESC);

-- Enable Row Level Security
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own social posts" ON public.social_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own social posts" ON public.social_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Service role policies (for server-side sync)
CREATE POLICY "Service role can perform all on social posts" ON public.social_posts
  FOR ALL USING (auth.role() = 'service_role');

-- Comment for table
COMMENT ON TABLE public.social_posts IS 'Stores historical and published posts from connected social media accounts for analysis.';
