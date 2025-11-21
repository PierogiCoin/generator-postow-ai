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
