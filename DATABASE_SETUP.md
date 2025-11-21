# 🗄️ Setup Bazy Danych - Instrukcja Krok po Kroku

## 📋 Przegląd

Aplikacja wymaga bazy danych **Supabase** (PostgreSQL). Masz 2 schematy do wgrania:
1. **DATABASE_SCHEMA.sql** - Główna baza danych (14KB, ~370 linii)
2. **DATABASE_SCHEMA_PAYMENTS.sql** - System płatności (10KB, opcjonalny)

---

## 🚀 Quick Start (5 minut)

### Krok 1: Stwórz projekt Supabase

1. Wejdź na https://supabase.com
2. Zaloguj się lub stwórz konto (bezpłatne)
3. Kliknij **"New Project"**
4. Wypełnij dane:
   - **Name**: `social-media-manager` (lub dowolna nazwa)
   - **Database Password**: Zapisz hasło! (będzie potrzebne)
   - **Region**: Wybierz najbliższy region (np. Central EU)
5. Kliknij **"Create New Project"**
6. Poczekaj ~2 minuty na setup

### Krok 2: Wgraj schemat bazy danych

1. W Supabase dashboard, kliknij **SQL Editor** (lewa sidebar)
2. Kliknij **"New query"**
3. Skopiuj **CAŁY** plik `DATABASE_SCHEMA.sql`
4. Wklej do edytora SQL
5. Kliknij **"Run"** (lub Ctrl/Cmd + Enter)
6. Poczekaj na sukces ✅

### Krok 3: (Opcjonalne) Wgraj system płatności

Jeśli chcesz obsługę płatności (Stripe):
1. Kliknij **"New query"** ponownie
2. Skopiuj **CAŁY** plik `DATABASE_SCHEMA_PAYMENTS.sql`
3. Wklej i kliknij **"Run"**

### Krok 4: Pobierz credentials

1. W Supabase dashboard, kliknij **Settings** → **API**
2. Skopiuj:
   - **Project URL** (np. `https://xxxxx.supabase.co`)
   - **anon public key** (długi string)

### Krok 5: Skonfiguruj aplikację

1. Stwórz plik `.env.local` w głównym folderze:
```bash
touch .env.local
```

2. Otwórz `.env.local` i dodaj:
```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

3. Zastąp wartości własnymi credentials

### Krok 6: Restart aplikacji

```bash
# Zatrzymaj serwer (Ctrl+C)
# Uruchom ponownie
npm run dev
```

**✅ Gotowe! Aplikacja działa z bazą danych!**

---

## 📊 Co zawiera DATABASE_SCHEMA.sql?

### Tabele główne:

#### 1. **users** - Użytkownicy
- id, email, password, name, avatar
- plan (free/pro/enterprise)
- credits (limity)

#### 2. **sessions** - Sesje użytkowników
- token, expires_at
- Automatyczne czyszczenie expired sessions

#### 3. **social_connections** - Połączenia z social media
- LinkedIn, Twitter, Facebook, Instagram
- access_token, refresh_token
- Metadata połączenia

#### 4. **scheduled_posts** - Zaplanowane posty
- content, media_urls, hashtags
- scheduled_at, status
- Automatyczne publikowanie

#### 5. **published_posts** - Opublikowane posty
- platform_post_id, url
- analytics (likes, shares, etc)
- status tracking

#### 6. **generation_history** - Historia generowanych postów
- content, platform, metadata
- Do analizy i uczenia AI

#### 7. **favorites** - Ulubione posty
- Zapisane posty użytkownika

#### 8. **brand_voice_profiles** - Profile Brand Voice
- tone, style, values
- Do generowania spójnych treści

#### 9. **templates** - Szablony postów
- Zapisane szablony do wielokrotnego użycia

#### 10. **analytics_data** - Analityka
- impressions, clicks, engagement
- Per platform tracking

#### 11. **teams** - Teams/Współpraca
- name, owner_id
- Team management

#### 12. **team_members** - Członkowie zespołu
- role (owner/admin/member)
- permissions

#### 13. **api_usage** - Tracking API
- endpoint, status, response_time
- Rate limiting

#### 14. **notifications** - Powiadomienia
- type, message, read status

---

## 💳 Co zawiera DATABASE_SCHEMA_PAYMENTS.sql?

### Tabele płatności (opcjonalne):

#### 1. **subscriptions** - Subskrypcje
- Stripe subscription tracking
- plan, status, current_period

#### 2. **payments** - Historia płatności
- amount, currency, status
- stripe_payment_intent_id

#### 3. **invoices** - Faktury
- invoice_number, due_date
- paid_at, stripe_invoice_id

#### 4. **payment_methods** - Metody płatności
- card info (last4, brand)
- is_default flag

#### 5. **subscription_items** - Items subskrypcji
- quantity, stripe_price_id

#### 6. **usage_records** - Usage tracking
- Dla planów usage-based

#### 7. **coupons** - Kupony rabatowe
- code, discount type
- valid_from, valid_until

#### 8. **coupon_redemptions** - Wykorzystane kupony
- tracking użycia

---

## 🔧 Troubleshooting

### Problem: "Extension uuid-ossp already exists"
**Rozwiązanie**: To normalne! Kontynuuj dalej.

### Problem: "Permission denied"
**Rozwiązanie**: Upewnij się że jesteś zalogowany jako owner projektu w Supabase.

### Problem: "Table already exists"
**Rozwiązanie**: 
```sql
-- Usuń wszystkie tabele (UWAGA: to usunie dane!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Potem wgraj schemat ponownie
```

### Problem: "Connection error"
**Rozwiązanie**: Sprawdź czy:
1. Supabase URL jest poprawny
2. Anon key jest poprawny
3. Projekt Supabase jest aktywny
4. Firewall nie blokuje połączenia

### Problem: "Cannot find module .env.local"
**Rozwiązanie**: Upewnij się że plik `.env.local` jest w głównym folderze projektu (nie w components/).

---

## 🔐 Bezpieczeństwo

### Row Level Security (RLS)

Schemat zawiera już RLS policies:
- ✅ Użytkownicy widzą tylko swoje dane
- ✅ Team members widzą dane swojego teamu
- ✅ Admin ma pełny dostęp do swojego teamu

### Best Practices:

1. **Nigdy** nie commituj `.env.local` do git
2. Użyj różnych credentials dla dev/production
3. Regularnie rotuj API keys
4. Monitoruj usage w Supabase dashboard

---

## 📝 Przykładowe dane testowe (opcjonalne)

Możesz wgrać przykładowe dane do testowania:

```sql
-- Przykładowy użytkownik (hasło: test123)
INSERT INTO users (email, password, name, plan, credits)
VALUES (
  'test@example.com',
  '$2a$10$example_hashed_password', -- to musi być zahashowane!
  'Test User',
  'pro',
  1000
);

-- Przykładowy scheduled post
INSERT INTO scheduled_posts (user_id, content, scheduled_at, status)
VALUES (
  (SELECT id FROM users WHERE email = 'test@example.com'),
  'Testowy post! #test #ai',
  NOW() + INTERVAL '1 hour',
  'scheduled'
);
```

**UWAGA**: Hasło musi być zahashowane używając bcrypt! Nie wpisuj plain text hasła.

---

## 🔄 Migracje

Jeśli aktualizujesz schemat:

### Metoda 1: Dodaj nowe kolumny
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field TEXT;
```

### Metoda 2: Użyj migracji Supabase
1. W dashboard: **Database** → **Migrations**
2. Stwórz nową migrację
3. Dodaj SQL changes
4. Apply migration

---

## 📊 Monitoring

### Sprawdź czy wszystko działa:

```sql
-- Liczba tabel
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
-- Powinno być ~14 bez payments, ~22 z payments

-- Lista wszystkich tabel
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Sprawdź RLS policies
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public';
```

---

## 🆘 Pomoc

### Gdzie szukać?
1. **Supabase Docs**: https://supabase.com/docs
2. **SQL Editor**: W Supabase dashboard - możesz testować queries
3. **Logs**: Database → Logs - zobacz błędy
4. **API Logs**: API → Logs - zobacz requesty

### Najczęstsze pytania:

**Q: Jak zmienić plan użytkownika?**
```sql
UPDATE users SET plan = 'pro' WHERE email = 'user@example.com';
```

**Q: Jak dodać credits?**
```sql
UPDATE users SET credits = credits + 100 WHERE email = 'user@example.com';
```

**Q: Jak zobaczyć scheduled posts?**
```sql
SELECT * FROM scheduled_posts 
WHERE status = 'scheduled' 
ORDER BY scheduled_at;
```

**Q: Jak usunąć użytkownika?**
```sql
-- CASCADE automatycznie usunie wszystkie powiązane dane
DELETE FROM users WHERE email = 'user@example.com';
```

---

## ✅ Checklist Setup

- [ ] Stworzony projekt Supabase
- [ ] Wgrano DATABASE_SCHEMA.sql
- [ ] (Opcjonalnie) Wgrano DATABASE_SCHEMA_PAYMENTS.sql
- [ ] Pobrano credentials (URL + Anon Key)
- [ ] Stworzono .env.local
- [ ] Dodano credentials do .env.local
- [ ] Zrestartowano aplikację
- [ ] Testowo zarejestrowano użytkownika
- [ ] Sprawdzono czy dane są zapisywane

---

## 🎉 Gotowe!

Twoja baza danych jest gotowa! Aplikacja teraz może:
- ✅ Rejestrować użytkowników
- ✅ Zarządzać sesjami
- ✅ Generować posty
- ✅ Planować publikacje
- ✅ Śledzić analitykę
- ✅ Zarządzać teamami
- ✅ (Opcjonalnie) Obsługiwać płatności

**Next steps**: Testuj aplikację i zobacz jak dane są zapisywane w Supabase!

---

**Files:**
- `DATABASE_SCHEMA.sql` - Główny schemat (14KB)
- `DATABASE_SCHEMA_PAYMENTS.sql` - Płatności (10KB, opcjonalny)

**Dashboard**: https://supabase.com/dashboard
**Docs**: https://supabase.com/docs
