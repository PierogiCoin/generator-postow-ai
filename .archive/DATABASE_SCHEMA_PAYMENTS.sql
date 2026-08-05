-- ============================================
-- PAYMENTS & SUBSCRIPTIONS - DATABASE SCHEMA
-- ============================================
-- Add this to your existing DATABASE_SCHEMA.sql
-- ============================================

-- ============================================
-- ADD PAYMENT COLUMNS TO USERS TABLE
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_id);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL CHECK (plan IN ('free', 'pro', 'business', 'enterprise')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete')),
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- CREDIT TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('credit', 'debit', 'refund', 'adjustment')),
  reason VARCHAR(255) NOT NULL,
  balance_after INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at);

-- ============================================
-- INVOICES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================
-- PAYMENT METHODS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  card_brand VARCHAR(50),
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(user_id, is_default);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- PLAN LIMITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS plan_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  posts_used INTEGER DEFAULT 0,
  images_used INTEGER DEFAULT 0,
  videos_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_plan_limits_user ON plan_limits(user_id);
CREATE INDEX idx_plan_limits_period ON plan_limits(period_start, period_end);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Check if user has enough credits
CREATE OR REPLACE FUNCTION check_user_credits(p_user_id UUID, p_required_credits INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  SELECT credits INTO v_credits FROM users WHERE id = p_user_id;
  RETURN v_credits >= p_required_credits;
END;
$$ LANGUAGE plpgsql;

-- Get user's current plan limits
CREATE OR REPLACE FUNCTION get_user_plan_limits(p_user_id UUID)
RETURNS TABLE (
  posts_remaining INTEGER,
  images_remaining INTEGER,
  videos_remaining INTEGER,
  platforms_allowed INTEGER
) AS $$
DECLARE
  v_plan VARCHAR(50);
  v_limits RECORD;
BEGIN
  SELECT plan INTO v_plan FROM users WHERE id = p_user_id;
  
  -- Get current period limits
  SELECT * INTO v_limits FROM plan_limits 
  WHERE user_id = p_user_id 
    AND period_end > NOW()
  ORDER BY period_start DESC 
  LIMIT 1;
  
  -- Return based on plan (simplified example)
  IF v_plan = 'free' THEN
    RETURN QUERY SELECT 
      10 - COALESCE(v_limits.posts_used, 0),
      5 - COALESCE(v_limits.images_used, 0),
      0 - COALESCE(v_limits.videos_used, 0),
      1;
  ELSIF v_plan = 'pro' THEN
    RETURN QUERY SELECT 
      100 - COALESCE(v_limits.posts_used, 0),
      50 - COALESCE(v_limits.images_used, 0),
      10 - COALESCE(v_limits.videos_used, 0),
      5;
  ELSIF v_plan = 'business' THEN
    RETURN QUERY SELECT 
      500 - COALESCE(v_limits.posts_used, 0),
      200 - COALESCE(v_limits.images_used, 0),
      50 - COALESCE(v_limits.videos_used, 0),
      10;
  ELSE -- enterprise
    RETURN QUERY SELECT 
      999999, -- unlimited
      999999,
      999999,
      999999;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Reset monthly limits
CREATE OR REPLACE FUNCTION reset_monthly_plan_limits()
RETURNS void AS $$
BEGIN
  -- Archive old limits
  UPDATE plan_limits SET period_end = NOW() 
  WHERE period_end > NOW();
  
  -- Create new period for all active subscriptions
  INSERT INTO plan_limits (user_id, plan, period_start, period_end)
  SELECT 
    id,
    plan,
    NOW(),
    NOW() + INTERVAL '1 month'
  FROM users 
  WHERE plan != 'free' 
    AND subscription_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_limits_updated_at 
  BEFORE UPDATE ON plan_limits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_all_own ON subscriptions FOR ALL USING (user_id = auth.uid());
CREATE POLICY credit_transactions_all_own ON credit_transactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY invoices_all_own ON invoices FOR ALL USING (user_id = auth.uid());
CREATE POLICY payment_methods_all_own ON payment_methods FOR ALL USING (user_id = auth.uid());
CREATE POLICY notifications_all_own ON notifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY plan_limits_all_own ON plan_limits FOR ALL USING (user_id = auth.uid());

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW user_billing_summary AS
SELECT 
  u.id,
  u.email,
  u.plan,
  u.credits,
  u.subscription_status,
  s.current_period_end,
  s.cancel_at_period_end,
  COUNT(DISTINCT ct.id) FILTER (WHERE ct.created_at > NOW() - INTERVAL '30 days') as transactions_last_30_days,
  SUM(ct.amount) FILTER (WHERE ct.type = 'debit' AND ct.created_at > NOW() - INTERVAL '30 days') as credits_spent_last_30_days,
  pl.posts_used,
  pl.images_used,
  pl.videos_used
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN credit_transactions ct ON u.id = ct.user_id
LEFT JOIN plan_limits pl ON u.id = pl.user_id AND pl.period_end > NOW()
GROUP BY u.id, u.email, u.plan, u.credits, u.subscription_status, s.current_period_end, 
         s.cancel_at_period_end, pl.posts_used, pl.images_used, pl.videos_used;

-- ============================================
-- SCHEDULED JOBS (Setup in Supabase Dashboard)
-- ============================================

-- Reset monthly limits (run on 1st of each month)
-- SELECT cron.schedule('reset-monthly-limits', '0 0 1 * *', 'SELECT reset_monthly_plan_limits()');

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Update admin user with subscription
UPDATE users SET 
  plan = 'enterprise',
  credits = 20000,
  subscription_status = 'active'
WHERE email = 'admin@example.com';

-- ============================================
-- DONE!
-- ============================================
