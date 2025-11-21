-- ============================================
-- SOCIAL MEDIA MANAGER - PRODUCTION DATABASE SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar TEXT,
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  credits INTEGER DEFAULT 100,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan ON users(plan);

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- PASSWORD RESETS TABLE
-- ============================================
CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_user ON password_resets(user_id);

-- ============================================
-- SOCIAL CONNECTIONS TABLE
-- ============================================
CREATE TABLE social_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'facebook', 'instagram')),
  account_id VARCHAR(255) NOT NULL,
  account_name VARCHAR(255),
  account_handle VARCHAR(255),
  profile_image_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_sync_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_social_connections_user ON social_connections(user_id);
CREATE INDEX idx_social_connections_platform ON social_connections(platform);
CREATE INDEX idx_social_connections_active ON social_connections(is_active);

-- ============================================
-- PUBLISHED POSTS TABLE
-- ============================================
CREATE TABLE published_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES social_connections(id) ON DELETE SET NULL,
  platform VARCHAR(50) NOT NULL,
  platform_post_id VARCHAR(255),
  content TEXT NOT NULL,
  media_urls TEXT[],
  hashtags TEXT[],
  published_at TIMESTAMP DEFAULT NOW(),
  url TEXT,
  status VARCHAR(50) DEFAULT 'published' CHECK (status IN ('publishing', 'published', 'failed', 'deleted')),
  analytics JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_published_posts_user ON published_posts(user_id);
CREATE INDEX idx_published_posts_platform ON published_posts(platform);
CREATE INDEX idx_published_posts_status ON published_posts(status);
CREATE INDEX idx_published_posts_published_at ON published_posts(published_at);

-- ============================================
-- SCHEDULED POSTS TABLE
-- ============================================
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES social_connections(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls TEXT[],
  hashtags TEXT[],
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  published_post_id UUID REFERENCES published_posts(id) ON DELETE SET NULL,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);

-- ============================================
-- GENERATION HISTORY TABLE
-- ============================================
CREATE TABLE generation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  hashtags TEXT[],
  media_urls TEXT[],
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_generation_history_user ON generation_history(user_id);
CREATE INDEX idx_generation_history_created_at ON generation_history(created_at);

-- ============================================
-- FAVORITES TABLE
-- ============================================
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES generation_history(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- ============================================
-- BRAND VOICES TABLE
-- ============================================
CREATE TABLE brand_voices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tone VARCHAR(50),
  style_attributes JSONB,
  example_posts TEXT[],
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_brand_voices_user ON brand_voices(user_id);
CREATE INDEX idx_brand_voices_active ON brand_voices(is_active);

-- ============================================
-- VIDEO STORIES TABLE
-- ============================================
CREATE TABLE video_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES generation_history(id) ON DELETE SET NULL,
  style VARCHAR(50) NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  music_track VARCHAR(255),
  status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_video_stories_user ON video_stories(user_id);
CREATE INDEX idx_video_stories_status ON video_stories(status);

-- ============================================
-- ANALYTICS TABLE
-- ============================================
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  published_post_id UUID REFERENCES published_posts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_user ON analytics(user_id);
CREATE INDEX idx_analytics_post ON analytics(published_post_id);
CREATE INDEX idx_analytics_synced_at ON analytics(synced_at);

-- ============================================
-- USAGE TRACKING TABLE
-- ============================================
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  credits_used INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_created_at ON usage_tracking(created_at);

-- ============================================
-- RATE LIMITS TABLE
-- ============================================
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  requests_count INTEGER DEFAULT 0,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_user ON rate_limits(user_id);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start, window_end);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_connections_updated_at BEFORE UPDATE ON social_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at BEFORE UPDATE ON scheduled_posts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_voices_updated_at BEFORE UPDATE ON brand_voices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  DELETE FROM password_resets WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_select_own ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY users_update_own ON users FOR UPDATE USING (id = auth.uid());

CREATE POLICY social_connections_all_own ON social_connections FOR ALL USING (user_id = auth.uid());
CREATE POLICY published_posts_all_own ON published_posts FOR ALL USING (user_id = auth.uid());
CREATE POLICY scheduled_posts_all_own ON scheduled_posts FOR ALL USING (user_id = auth.uid());
CREATE POLICY generation_history_all_own ON generation_history FOR ALL USING (user_id = auth.uid());
CREATE POLICY favorites_all_own ON favorites FOR ALL USING (user_id = auth.uid());
CREATE POLICY brand_voices_all_own ON brand_voices FOR ALL USING (user_id = auth.uid());
CREATE POLICY video_stories_all_own ON video_stories FOR ALL USING (user_id = auth.uid());
CREATE POLICY analytics_all_own ON analytics FOR ALL USING (user_id = auth.uid());
CREATE POLICY usage_tracking_all_own ON usage_tracking FOR ALL USING (user_id = auth.uid());

-- ============================================
-- INITIAL DATA
-- ============================================

-- Create admin user (change password in production!)
INSERT INTO users (email, password, name, plan, credits) VALUES
  ('admin@example.com', '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG1mQ7aCnL6', 'Admin User', 'enterprise', 10000);

-- ============================================
-- SCHEDULED JOBS (Setup in Supabase Dashboard)
-- ============================================

-- 1. Cleanup expired sessions (run every hour)
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions()');

-- 2. Process scheduled posts (run every minute)
-- SELECT cron.schedule('process-scheduled-posts', '* * * * *', 
--   'SELECT process_scheduled_posts()');

-- 3. Sync analytics (run every 6 hours)
-- SELECT cron.schedule('sync-analytics', '0 */6 * * *',
--   'SELECT sync_social_analytics()');

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

CREATE VIEW user_stats AS
SELECT 
  u.id as user_id,
  u.email,
  u.plan,
  u.credits,
  COUNT(DISTINCT gh.id) as total_generations,
  COUNT(DISTINCT pp.id) as total_published,
  COUNT(DISTINCT sp.id) as total_scheduled,
  COUNT(DISTINCT vs.id) as total_videos,
  SUM(COALESCE(ut.credits_used, 0)) as total_credits_used
FROM users u
LEFT JOIN generation_history gh ON u.id = gh.user_id
LEFT JOIN published_posts pp ON u.id = pp.user_id
LEFT JOIN scheduled_posts sp ON u.id = sp.user_id
LEFT JOIN video_stories vs ON u.id = vs.user_id
LEFT JOIN usage_tracking ut ON u.id = ut.user_id
GROUP BY u.id, u.email, u.plan, u.credits;

-- ============================================
-- DONE! 
-- ============================================
-- Next steps:
-- 1. Run this SQL in Supabase
-- 2. Update environment variables
-- 3. Test authentication flow
-- ============================================
