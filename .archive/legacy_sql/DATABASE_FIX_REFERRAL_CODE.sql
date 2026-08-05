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
