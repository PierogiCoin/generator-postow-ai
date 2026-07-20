-- Atomowy debit kredytów (race-safe przy równoległych requestach)
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

GRANT EXECUTE ON FUNCTION public.debit_credits(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_credits(uuid, integer) TO authenticated;
