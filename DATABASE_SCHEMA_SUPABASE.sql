-- ============================================
-- SOCIAL MEDIA MANAGER - SUPABASE AUTH COMPATIBLE SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar TEXT,
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  credits INTEGER DEFAULT 100,
  usage JSONB DEFAULT '{"text": 0, "image": 0, "video": 0, "campaign": 0, "learnStyle": 0}'::jsonb,
  current_team_id UUID,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);

-- ============================================
-- SOCIAL CONNECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS social_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'facebook', 'instagram')),
  account_id VARCHAR(255) NOT NULL,
  account_name VARCHAR(255),
  account_handle VARCHAR(255),
  profile_image_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_connections_user ON social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_platform ON social_connections(platform);
CREATE INDEX IF NOT EXISTS idx_social_connections_active ON social_connections(is_active);

-- ============================================
-- PUBLISHED POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS published_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES social_connections(id) ON DELETE SET NULL,
  platform VARCHAR(50) NOT NULL,
  platform_post_id VARCHAR(255),
  content TEXT NOT NULL,
  media_urls TEXT[],
  hashtags TEXT[],
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  url TEXT,
  status VARCHAR(50) DEFAULT 'published' CHECK (status IN ('publishing', 'published', 'failed', 'deleted')),
  analytics JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_published_posts_user ON published_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_published_posts_platform ON published_posts(platform);
CREATE INDEX IF NOT EXISTS idx_published_posts_status ON published_posts(status);
CREATE INDEX IF NOT EXISTS idx_published_posts_published_at ON published_posts(published_at);

-- ============================================
-- SCHEDULED POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES social_connections(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  platform TEXT,
  media_urls TEXT[],
  hashtags TEXT[],
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  published_post_id UUID REFERENCES published_posts(id) ON DELETE SET NULL,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);

-- ============================================
-- HISTORY TABLE (generation history)
-- ============================================
CREATE TABLE IF NOT EXISTS history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  hashtags TEXT[],
  media_urls TEXT[],
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp);

-- ============================================
-- FAVORITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_text TEXT NOT NULL,
  platform TEXT,
  hashtags TEXT[],
  notes TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- ============================================
-- TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  platform TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);

-- ============================================
-- DRAFTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  platform TEXT,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drafts_user ON drafts(user_id);

-- ============================================
-- BRAND VOICE PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS brand_voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tone VARCHAR(50),
  values TEXT,
  style_attributes JSONB,
  example_posts TEXT[],
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_voice_profiles_user ON brand_voice_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_voice_profiles_active ON brand_voice_profiles(is_active);

-- ============================================
-- VIDEO STORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS video_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES history(id) ON DELETE SET NULL,
  style VARCHAR(50) NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  music_track VARCHAR(255),
  status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_stories_user ON video_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_video_stories_status ON video_stories(status);

-- ============================================
-- ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  published_post_id UUID REFERENCES published_posts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_post ON analytics(published_post_id);
CREATE INDEX IF NOT EXISTS idx_analytics_synced_at ON analytics(synced_at);

-- ============================================
-- USAGE TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  credits_used INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created_at ON usage_tracking(created_at);

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
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_connections_updated_at ON social_connections;
CREATE TRIGGER update_social_connections_updated_at BEFORE UPDATE ON social_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_posts_updated_at ON scheduled_posts;
CREATE TRIGGER update_scheduled_posts_updated_at BEFORE UPDATE ON scheduled_posts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_voice_profiles_updated_at ON brand_voice_profiles;
CREATE TRIGGER update_brand_voice_profiles_updated_at BEFORE UPDATE ON brand_voice_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can manage own social_connections" ON social_connections;
DROP POLICY IF EXISTS "Users can manage own published_posts" ON published_posts;
DROP POLICY IF EXISTS "Users can manage own scheduled_posts" ON scheduled_posts;
DROP POLICY IF EXISTS "Users can read own history" ON history;
DROP POLICY IF EXISTS "Users can insert own history" ON history;
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can manage own templates" ON templates;
DROP POLICY IF EXISTS "Users can manage own drafts" ON drafts;
DROP POLICY IF EXISTS "Users can manage own brand_voice_profiles" ON brand_voice_profiles;
DROP POLICY IF EXISTS "Users can manage own video_stories" ON video_stories;
DROP POLICY IF EXISTS "Users can manage own analytics" ON analytics;
DROP POLICY IF EXISTS "Users can manage own usage_tracking" ON usage_tracking;

-- Create policies
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own social_connections" ON social_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own published_posts" ON published_posts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own scheduled_posts" ON scheduled_posts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read own history" ON history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own favorites" ON favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own templates" ON templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own drafts" ON drafts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own brand_voice_profiles" ON brand_voice_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own video_stories" ON video_stories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own analytics" ON analytics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own usage_tracking" ON usage_tracking FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, plan, credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'free',
    100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

CREATE OR REPLACE VIEW user_stats AS
SELECT 
  p.id as user_id,
  u.email,
  p.plan,
  p.credits,
  COUNT(DISTINCT h.id) as total_generations,
  COUNT(DISTINCT pp.id) as total_published,
  COUNT(DISTINCT sp.id) as total_scheduled,
  COUNT(DISTINCT vs.id) as total_videos,
  SUM(COALESCE(ut.credits_used, 0)) as total_credits_used
FROM profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN history h ON p.id = h.user_id
LEFT JOIN published_posts pp ON p.id = pp.user_id
LEFT JOIN scheduled_posts sp ON p.id = sp.user_id
LEFT JOIN video_stories vs ON p.id = vs.user_id
LEFT JOIN usage_tracking ut ON p.id = ut.user_id
GROUP BY p.id, u.email, p.plan, p.credits;

-- ============================================
-- DONE! 
-- ============================================
