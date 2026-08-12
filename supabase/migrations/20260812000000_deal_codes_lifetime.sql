-- Lifetime Deal / AppSumo: deal codes + profile fields
-- 2026-08-12

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'creator', 'pro', 'business', 'agency', 'enterprise', 'lifetime'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deal_source TEXT CHECK (deal_source IS NULL OR deal_source IN ('appsumo', 'own')),
  ADD COLUMN IF NOT EXISTS deal_tier SMALLINT CHECK (deal_tier IS NULL OR deal_tier IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS deal_redeemed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.deal_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  code_normalized TEXT NOT NULL,
  tier SMALLINT NOT NULL CHECK (tier IN (1, 2, 3)),
  source TEXT NOT NULL CHECK (source IN ('appsumo', 'own')),
  max_redemptions INT NOT NULL DEFAULT 1,
  redemption_count INT NOT NULL DEFAULT 0,
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT deal_codes_code_normalized_unique UNIQUE (code_normalized)
);

CREATE INDEX IF NOT EXISTS idx_deal_codes_source ON public.deal_codes(source);
CREATE INDEX IF NOT EXISTS idx_deal_codes_redeemed_by ON public.deal_codes(redeemed_by);

ALTER TABLE public.deal_codes ENABLE ROW LEVEL SECURITY;

-- No public SELECT — redeem only via service role API
DROP POLICY IF EXISTS "Service role full access deal_codes" ON public.deal_codes;

-- Optional audit log of redemptions (multiple redemptions per code when max > 1)
CREATE TABLE IF NOT EXISTS public.deal_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_code_id UUID NOT NULL REFERENCES public.deal_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier SMALLINT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deal_code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_redemptions_user ON public.deal_redemptions(user_id);

ALTER TABLE public.deal_redemptions ENABLE ROW LEVEL SECURITY;
