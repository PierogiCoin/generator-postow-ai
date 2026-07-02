-- Pełny pakiet Enterprise dla wszystkich kont (28 000 kredytów / mies.)
-- Uruchom w Supabase SQL Editor lub przez migrację MCP.

UPDATE public.profiles
SET
  plan = 'enterprise',
  credits = 28000,
  subscription_status = 'active',
  subscription_current_period_end = NOW() + INTERVAL '1 year',
  usage = COALESCE(usage, '{}'::jsonb)
    || '{"text": 0, "image": 0, "video": 0, "campaign": 0, "learnStyle": 0}'::jsonb,
  updated_at = NOW();

UPDATE public.users
SET
  plan = 'enterprise',
  credits = 28000,
  subscription_status = 'active',
  subscription_current_period_end = NOW() + INTERVAL '1 year',
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, plan, credits, subscription_status, subscription_current_period_end)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'enterprise',
    28000,
    'active',
    NOW() + INTERVAL '1 year'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.users (id, email, name, plan, credits, subscription_status, subscription_current_period_end)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'enterprise',
    28000,
    'active',
    NOW() + INTERVAL '1 year'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
