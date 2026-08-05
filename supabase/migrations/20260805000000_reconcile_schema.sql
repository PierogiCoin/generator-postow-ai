-- ============================================================
-- RECONCILIATION MIGRATION
-- Generated: 2026-08-05
-- Purpose: Align repo migrations with the live production schema.
--   1. Drop the stale "user_profiles" table (incorrect name from 20260101000000).
--   2. Ensure the canonical "profiles" table has the full set of columns,
--      FKs, triggers and RLS policies used by the application.
-- ============================================================

-- ----------------------------------------------------------------------
-- 1. Cleanup legacy table
-- ----------------------------------------------------------------------
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ----------------------------------------------------------------------
-- 2. Reconcile the canonical `profiles` table
-- ----------------------------------------------------------------------
-- All statements are idempotent (safe to re-run on an already-correct DB).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS avatar TEXT,
  ADD COLUMN IF NOT EXISTS plan VARCHAR(255) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS usage JSONB DEFAULT '{"text":0,"image":0,"video":0,"campaign":0,"learnStyle":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_team_id UUID,
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS niche TEXT,
  ADD COLUMN IF NOT EXISTS primary_platform TEXT,
  ADD COLUMN IF NOT EXISTS brand_tone TEXT,
  ADD COLUMN IF NOT EXISTS brand_keywords TEXT;

-- Add the check constraint on `plan` values (drop first to be idempotent).
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free','creator','pro','business','agency','enterprise'));

-- Add unique constraint on stripe_customer_id (idempotent).
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_stripe_customer_id_key;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_stripe_customer_id_key
  UNIQUE (stripe_customer_id);

-- Add FK to teams now that teams exists (created in 20260102000000_fixes_and_addons.sql).
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_current_team_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_current_team_id_fkey
  FOREIGN KEY (current_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------
-- 3. RLS policies
-- ----------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------
-- 4. Trigger: auto-update `updated_at`
-- ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
