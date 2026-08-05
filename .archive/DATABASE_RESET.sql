-- ============================================
-- KROK 1: USUŃ WSZYSTKIE STARE TABELE
-- ============================================
-- Wykonaj to NAJPIERW w Supabase SQL Editor

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP VIEW IF EXISTS user_stats;

DROP TABLE IF EXISTS usage_tracking CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS video_stories CASCADE;
DROP TABLE IF EXISTS brand_voice_profiles CASCADE;
DROP TABLE IF EXISTS drafts CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS history CASCADE;
DROP TABLE IF EXISTS scheduled_posts CASCADE;
DROP TABLE IF EXISTS published_posts CASCADE;
DROP TABLE IF EXISTS social_connections CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Usuń wszystkich użytkowników (opcjonalne - tylko jeśli chcesz całkowicie wyczyścić)
-- UWAGA: To usunie wszystkie konta!
-- DELETE FROM auth.users;

-- ============================================
-- GOTOWE! Teraz wgraj DATABASE_SCHEMA_SUPABASE.sql
-- ============================================
