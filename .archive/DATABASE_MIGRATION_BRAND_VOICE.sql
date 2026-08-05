-- ============================================
-- MIGRACJA: Dodaj kolumnę 'settings' do brand_voice_profiles
-- 
-- Uruchom ten skrypt w Supabase SQL Editor:
-- https://supabase.com/dashboard/project/<twoj-projekt>/sql/new
-- ============================================

-- 1. Dodaj kolumnę settings (JSONB) jeśli nie istnieje
ALTER TABLE brand_voice_profiles
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- 2. Dodaj kolumnę team_id jeśli nie istnieje
ALTER TABLE brand_voice_profiles
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Sprawdź wynik
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'brand_voice_profiles'
ORDER BY ordinal_position;
