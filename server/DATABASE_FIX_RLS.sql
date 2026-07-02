-- RLS hardening: brakujące polityki + zaostrzenie api_costs INSERT
-- Safe to re-run

-- ── subscriptions: użytkownik widzi tylko swoją subskrypcję ─────────────────
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ── credit_transactions: tylko odczyt własnych ───────────────────────────────
DROP POLICY IF EXISTS credit_transactions_select_own ON public.credit_transactions;
CREATE POLICY credit_transactions_select_own ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ── notifications: pełny dostęp do własnych ──────────────────────────────────
DROP POLICY IF EXISTS notifications_all_own ON public.notifications;
CREATE POLICY notifications_all_own ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── api_costs: użytkownik widzi tylko swoje koszty ─────────────────────────
DROP POLICY IF EXISTS api_costs_select_own ON public.api_costs;
CREATE POLICY api_costs_select_own ON public.api_costs
  FOR SELECT USING (auth.uid()::text = user_id OR user_id = auth.uid()::text);

-- Zaostrzenie INSERT — tylko service_role (linter: permissive WITH CHECK true)
DROP POLICY IF EXISTS api_costs_insert_service ON public.api_costs;
CREATE POLICY api_costs_insert_service ON public.api_costs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ── history: użytkownik może dodawać własne wpisy ────────────────────────────
DROP POLICY IF EXISTS "Users can insert own history" ON public.history;
CREATE POLICY "Users can insert own history" ON public.history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── social_posts: użytkownik może aktualizować własne (np. ai_analysis) ─────
DROP POLICY IF EXISTS "Users can update own social posts" ON public.social_posts;
CREATE POLICY "Users can update own social posts" ON public.social_posts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
