-- ============================================================
-- Email System Tables — kolejka, logi, unsubscribe
-- ============================================================

-- Tabela: email_queue — zaplanowane emaile do wysłania
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  email_type TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  metadata JSONB,
  error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeksy dla wydajnego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_email_queue_status_sendat ON email_queue (status, send_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_user ON email_queue (user_id);

-- Tabela: email_log — historia wysłanych emaili
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  email_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_user_type ON email_log (user_id, email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log (created_at);

-- Tabela: email_unsubscribe — preferencje unsubscribe
CREATE TABLE IF NOT EXISTS email_unsubscribe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  email_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_type)
);

-- Tabela: trial_history — historia darmowych okresów próbnych
CREATE TABLE IF NOT EXISTS trial_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  trial_days INTEGER NOT NULL DEFAULT 7,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_history_user ON trial_history (user_id);

-- RLS
ALTER TABLE trial_history ENABLE ROW LEVEL SECURITY;
GRANT ALL ON trial_history TO service_role;

-- Tabela: credit_rollover_log — historia rollover kredytów
CREATE TABLE IF NOT EXISTS credit_rollover_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  rolled_over INTEGER NOT NULL,
  previous_balance INTEGER NOT NULL,
  new_balance INTEGER NOT NULL,
  plan TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_rollover_user ON credit_rollover_log (user_id, created_at DESC);

-- RLS
ALTER TABLE credit_rollover_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON credit_rollover_log TO service_role;

CREATE POLICY "Service role full access credit_rollover_log" ON credit_rollover_log
  FOR ALL USING (true) WITH CHECK (true);

-- Tabela: referrals — system poleceń
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL,
  referee_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals (referee_id);

-- RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
GRANT ALL ON referrals TO service_role;

CREATE POLICY "Service role full access referrals" ON referrals
  FOR ALL USING (true) WITH CHECK (true);

-- Użytkownicy mogą odczytywać własne polecenia (jako polecający)
CREATE POLICY "Users can read own referrals" ON referrals
  FOR SELECT USING (auth.uid()::text = referrer_id OR auth.uid()::text = referee_id);

-- Użytkownicy mogą odczytywać własną historię rollover
CREATE POLICY "Users can read own rollover" ON credit_rollover_log
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Service role full access email_queue" ON email_queue
  FOR ALL USING (true) WITH CHECK (true);

-- RLS dla email_log — service role only
CREATE POLICY "Service role full access email_log" ON email_log
  FOR ALL USING (true) WITH CHECK (true);

-- Użytkownicy mogą odczytywać własne preferencje unsubscribe
CREATE POLICY "Users can read own unsubscribe" ON email_unsubscribe
  FOR SELECT USING (auth.uid()::text = user_id);

-- Użytkownicy mogą zarządzać własnym unsubscribe
CREATE POLICY "Users can manage own unsubscribe" ON email_unsubscribe
  FOR ALL USING (auth.uid()::text = user_id);

-- ============================================================
-- ABANDONED CHECKOUTS — śledzenie niedokończonych płatności
-- ============================================================
CREATE TABLE IF NOT EXISTS abandoned_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'subscription',
  price_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | expired
  recovery_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_status ON abandoned_checkouts(status);
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_user ON abandoned_checkouts(user_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_created ON abandoned_checkouts(created_at);

-- RLS: service role only (cron endpoint używa service role)
CREATE POLICY "Service role full access abandoned_checkouts" ON abandoned_checkouts
  FOR ALL USING (true) WITH CHECK (true);
