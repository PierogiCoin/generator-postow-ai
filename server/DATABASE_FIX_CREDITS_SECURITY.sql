-- P0: bezpieczeństwo kredytów + idempotencja Stripe
-- Kolejność: po DATABASE_SCHEMA_SUPABASE.sql / profiles

-- 1) Atomowy debit — tylko service_role (backend)
CREATE OR REPLACE FUNCTION public.debit_credits(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_bal integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id
    AND credits >= p_amount
  RETURNING credits INTO new_bal;

  IF new_bal IS NULL THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  RETURN new_bal;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.debit_credits(uuid, integer) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.debit_credits(uuid, integer) TO service_role;

-- 2) Atomowy credit (pakiety / refund / initial allotment)
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_bal integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE profiles
  SET credits = COALESCE(credits, 0) + p_amount
  WHERE id = p_user_id
  RETURNING credits INTO new_bal;

  IF new_bal IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  RETURN new_bal;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, integer) TO service_role;

-- 3) Idempotencja webhooków Stripe
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON public.stripe_webhook_events (processed_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
