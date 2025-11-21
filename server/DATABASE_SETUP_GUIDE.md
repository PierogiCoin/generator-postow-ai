# 🗄️ Database Setup Guide - Complete

## 📋 Overview

Ten plik zawiera **KOMPLETNĄ bazę danych** potrzebną do uruchomienia aplikacji.

**Co zawiera:**
- ✅ User profiles (opcjonalne)
- ✅ API cost tracking (wymagane)
- ✅ Generated content tracking (opcjonalne)
- ✅ Rate limiting (opcjonalne)
- ✅ Materialized views (analytics)
- ✅ Storage bucket (dla obrazów/video)
- ✅ Cron jobs (auto-maintenance)

---

## ⚡ Quick Setup (5 minut)

### 1. **Otwórz Supabase SQL Editor**
```
1. Idź na https://app.supabase.com
2. Wybierz swój projekt (lub stwórz nowy)
3. Kliknij "SQL Editor" w lewym menu
4. Kliknij "New query"
```

### 2. **Skopiuj i uruchom SQL**
```
1. Otwórz plik: DATABASE_COMPLETE_SCHEMA.sql
2. Zaznacz cały tekst (Cmd/Ctrl + A)
3. Skopiuj (Cmd/Ctrl + C)
4. Wklej do Supabase SQL Editor
5. Kliknij "RUN" (lub Cmd/Ctrl + Enter)
```

### 3. **Poczekaj na wykonanie** (~30 sekund)
```
✅ Zobaczysz: "Success. No rows returned"
```

### 4. **Weryfikacja**
```sql
-- Sprawdź czy tabele zostały utworzone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Powinieneś zobaczyć:
-- user_profiles
-- api_costs
-- generated_content
-- rate_limits
```

---

## 🔍 Co Zostało Utworzone?

### **Tabele (4):**

#### 1. `user_profiles` (Opcjonalne)
Rozszerza Supabase auth.users
```sql
- id (UUID, primary key)
- email
- full_name
- subscription_tier (free, basic, premium, enterprise)
- daily_budget (default: $10)
- total_spent
- created_at, updated_at
```

#### 2. `api_costs` (WYMAGANE) ⭐
Śledzi wszystkie koszty API
```sql
- id (UUID, primary key)
- user_id (TEXT, indexed)
- operation (e.g., 'image-generation')
- provider (e.g., 'DALL-E', 'Luma')
- cost (DECIMAL, precise to $0.0001)
- duration_ms (performance tracking)
- success (BOOLEAN)
- metadata (JSONB, flexible data)
- created_at (TIMESTAMPTZ, indexed)
```

**Indexes:**
- `idx_api_costs_user_id` - szybkie zapytania per user
- `idx_api_costs_created_at` - zapytania czasowe
- `idx_api_costs_provider` - grupowanie po providerze
- `idx_api_costs_operation` - grupowanie po operacji

#### 3. `generated_content` (Opcjonalne)
Historia wszystkich wygenerowanych treści
```sql
- id (UUID)
- user_id
- content_type ('text', 'image', 'video')
- provider
- prompt
- result_url
- metadata (JSONB)
- cost
- status ('pending', 'completed', 'failed')
- created_at
```

#### 4. `rate_limits` (Opcjonalne)
Do zaawansowanego rate limiting
```sql
- id (UUID)
- user_id
- endpoint
- request_count
- window_start
- created_at
```

---

### **Materialized Views (2):**

#### 1. `user_cost_summary`
Szybkie agregaty per user (refresh co godzinę)
```sql
SELECT * FROM public.user_cost_summary 
WHERE user_id = 'user-123';

-- Zwraca:
-- total_requests, total_cost, successful_cost, 
-- failed_cost, avg_duration_ms, last_request_at
```

#### 2. `daily_cost_summary`
Dzienne trendy (refresh codziennie)
```sql
SELECT * FROM public.daily_cost_summary
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- Zwraca:
-- date, provider, operation, request_count,
-- total_cost, avg_cost, successful_count
```

---

### **Views (3):**

#### 1. `top_spenders`
Top 100 użytkowników z ostatnich 30 dni
```sql
SELECT * FROM public.top_spenders LIMIT 10;
```

#### 2. `recent_failures`
Ostatnie 100 błędów (7 dni)
```sql
SELECT * FROM public.recent_failures;
```

#### 3. `daily_revenue`
Dzienny przychód (90 dni)
```sql
SELECT * FROM public.daily_revenue;
```

---

### **Functions (4):**

#### 1. `refresh_cost_summaries()`
Odświeża materialized views
```sql
SELECT public.refresh_cost_summaries();
```

#### 2. `update_user_total_spent()`
Auto-update user.total_spent po każdym koście (trigger)

#### 3. `update_updated_at_column()`
Auto-update updated_at timestamp (trigger)

#### 4. `cleanup_rate_limits()`
Usuwa stare rekordy rate limiting

---

### **Storage Bucket (1):**

#### `generated_content`
Bucket dla wygenerowanych obrazów/video

**Ustawienia:**
- Public: YES (publiczny dostęp do plików)
- Max file size: Default (50MB)

**Policies:**
- Public read
- Authenticated users can upload
- Service role can upload
- Users can delete own files

---

### **Cron Jobs (3):**

#### 1. Refresh Views (co godzinę)
```sql
-- 0 * * * * (every hour)
SELECT public.refresh_cost_summaries();
```

#### 2. Cleanup Rate Limits (codziennie 2 AM)
```sql
-- 0 2 * * * (2 AM daily)
SELECT public.cleanup_rate_limits();
```

#### 3. Archive Old Costs (co niedzielę 3 AM)
```sql
-- 0 3 * * 0 (3 AM Sunday)
DELETE FROM public.api_costs 
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## 🧪 Testing

### Test 1: Insert Cost Record
```sql
INSERT INTO public.api_costs (
  user_id, operation, provider, cost, duration_ms, success
) VALUES (
  'test-user-123', 
  'image-generation', 
  'DALL-E', 
  0.04, 
  2500, 
  true
);

-- Verify
SELECT * FROM public.api_costs 
WHERE user_id = 'test-user-123';
```

### Test 2: Check Materialized View
```sql
-- Force refresh
SELECT public.refresh_cost_summaries();

-- Query
SELECT * FROM public.user_cost_summary
WHERE user_id = 'test-user-123';
```

### Test 3: Check Top Spenders
```sql
SELECT * FROM public.top_spenders LIMIT 5;
```

### Test 4: Storage Bucket
```sql
SELECT * FROM storage.buckets 
WHERE id = 'generated_content';

-- Should return 1 row
```

---

## 🔧 Maintenance

### Daily Tasks (Automated by Cron)
✅ Refresh materialized views  
✅ Cleanup old rate limits  
✅ Archive old cost records

### Weekly Tasks (Manual)
```sql
-- Check database size
SELECT 
  pg_size_pretty(pg_database_size('postgres')) as db_size;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum tables
VACUUM ANALYZE public.api_costs;
VACUUM ANALYZE public.generated_content;
```

### Monthly Tasks
```sql
-- Export cost data for accounting
COPY (
  SELECT * FROM public.api_costs 
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND created_at < DATE_TRUNC('month', CURRENT_DATE)
) TO '/tmp/costs_monthly.csv' WITH CSV HEADER;

-- Check for anomalies
SELECT 
  DATE(created_at) as date,
  SUM(cost) as daily_cost
FROM public.api_costs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY daily_cost DESC
LIMIT 10;
```

---

## ⚠️ Troubleshooting

### Problem: "permission denied for schema public"
**Solution:**
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
```

### Problem: "extension pg_cron does not exist"
**Solution:**
```sql
-- Enable in Supabase Dashboard:
-- Database → Extensions → Search "pg_cron" → Enable
```

### Problem: Storage bucket not created
**Solution:**
```sql
-- Manual creation
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated_content', 'generated_content', true)
ON CONFLICT DO NOTHING;
```

### Problem: Materialized views not refreshing
**Solution:**
```sql
-- Manual refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_cost_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_cost_summary;

-- Check cron jobs
SELECT * FROM cron.job;

-- Enable cron job if disabled
SELECT cron.unschedule('refresh-cost-summaries');
SELECT cron.schedule(
  'refresh-cost-summaries',
  '0 * * * *',
  $$SELECT public.refresh_cost_summaries()$$
);
```

---

## 🔐 Security

### RLS (Row Level Security)
Wszystkie tabele mają RLS włączony:
- Users widzą tylko swoje dane
- Service role ma pełny dostęp
- Public ma tylko read na storage

### Best Practices
```sql
-- NIE używaj public role w aplikacji
-- Używaj service_role key tylko w serverze
-- W .env:
SUPABASE_SERVICE_KEY=eyJ... (service_role key)
# NIE:
SUPABASE_ANON_KEY=eyJ... (tylko dla clienta)
```

---

## 📊 Useful Queries

### Total costs today
```sql
SELECT SUM(cost) as today_total
FROM public.api_costs
WHERE DATE(created_at) = CURRENT_DATE;
```

### Top 10 expensive users this month
```sql
SELECT 
  user_id,
  SUM(cost) as total,
  COUNT(*) as requests
FROM public.api_costs
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY user_id
ORDER BY total DESC
LIMIT 10;
```

### Provider comparison (last 7 days)
```sql
SELECT 
  provider,
  COUNT(*) as requests,
  SUM(cost) as total_cost,
  AVG(duration_ms) as avg_duration,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate
FROM public.api_costs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY provider
ORDER BY total_cost DESC;
```

### Failed requests with details
```sql
SELECT 
  user_id,
  provider,
  operation,
  cost,
  metadata,
  created_at
FROM public.api_costs
WHERE success = false
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## ✅ Checklist

Przed uruchomieniem aplikacji:

- [ ] SQL schema wykonany w Supabase
- [ ] Tabele utworzone (4)
- [ ] Materialized views utworzone (2)
- [ ] Storage bucket utworzony (1)
- [ ] Cron jobs zaplanowane (3)
- [ ] Test insert do api_costs działa
- [ ] RLS policies aktywne
- [ ] SUPABASE_SERVICE_KEY w .env
- [ ] VITE_SUPABASE_URL w .env

---

## 🎉 Done!

Twoja baza jest gotowa! Możesz teraz:

1. **Uruchomić serwer** (automatycznie zacznie śledzić koszty)
2. **Sprawdzić koszty** via API endpoints
3. **Monitorować** via Supabase Dashboard

**Next:** Zobacz `LAUNCH_READY.md` dla deployment guide!
