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
