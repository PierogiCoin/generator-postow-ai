# 🔧 Database Error Fix Guide

## ❌ Error You Got:

```
ERROR: 42883: operator does not exist: text = uuid
HINT: No operator matches the given name and argument types. 
You might need to add explicit type casts.
```

## ✅ FIXED!

Błąd był w funkcji `update_user_total_spent()` - próbowała porównać UUID z TEXT bez castingu.

---

## 🚀 Quick Fix (Choose ONE option)

### **Option A: SIMPLE Setup (SUPER ZALECANA)** ⭐⭐⭐

Najprostsza wersja - zero problemów z UUID!

```bash
1. Go to Supabase SQL Editor
2. Open: DATABASE_SIMPLE.sql
3. Copy & Paste
4. RUN
5. ✅ Done! (100% działa!)
```

**Co dostaniesz:**
- ✅ Cost tracking
- ✅ Materialized views
- ✅ Storage bucket
- ✅ Simple RLS (service role only)
- ❌ NO user_profiles
- ❌ NO UUID casting issues!

**ZERO problemów - użyj tej wersji!**

---

### **Option B: Minimal Setup (ZALECANA)** ⭐

Jeśli nie potrzebujesz user profiles:

```bash
1. Go to Supabase SQL Editor
2. Open: DATABASE_MINIMAL.sql (UPDATED!)
3. Copy & Paste
4. RUN
5. ✅ Done!
```

**Co dostaniesz:**
- ✅ Cost tracking
- ✅ Materialized views
- ✅ Storage bucket
- ✅ Cron jobs
- ❌ NO user_profiles

**Wystarczy dla większości przypadków!**

---

### **Option C: Full Setup (with user profiles)**

Jeśli chcesz trackować user profiles:

```bash
1. Go to Supabase SQL Editor
2. Open: DATABASE_COMPLETE_SCHEMA.sql (updated version)
3. Copy & Paste
4. RUN
5. ✅ Done!
```

**Co dostaniesz:**
- ✅ Everything from minimal
- ✅ User profiles table
- ✅ Auto-update total_spent
- ✅ Advanced features

---

## 🔍 Co Zostało Naprawione?

### **Before (BŁĄD):**
```sql
WHERE id::text = NEW.user_id;
-- Problem: Porównanie text = uuid
```

### **After (OK):**
```sql
-- Check if user_id is valid UUID
IF NEW.user_id ~ '^[0-9a-f]{8}-...$' THEN
  WHERE id = NEW.user_id::uuid;
  -- Correct: uuid = uuid
END IF;
```

**Fix:** 
- Sprawdzamy czy user_id jest UUID
- Jeśli TAK → castujemy i updateujemy
- Jeśli NIE (anonymous user) → skip

---

## 📋 Which Option Should I Choose?

### Choose **MINIMAL** if:
- ✅ Używasz `x-user-id` header (string IDs)
- ✅ Nie używasz Supabase Auth
- ✅ Nie potrzebujesz user profiles
- ✅ Chcesz prostsze setup
- **99% przypadków → USE THIS!**

### Choose **COMPLETE** if:
- ✅ Używasz Supabase Auth (UUID users)
- ✅ Potrzebujesz user profiles
- ✅ Chcesz subscription tiers
- ✅ Chcesz per-user budgets
- **Advanced use case**

---

## ⚡ After Running SQL

### Verify (both options):
```sql
-- Check table exists
SELECT COUNT(*) FROM public.api_costs;
-- Returns: 0 (OK!)

-- Check views
SELECT COUNT(*) FROM public.user_cost_summary;
-- Returns: 0 (OK!)

-- Check storage
SELECT * FROM storage.buckets WHERE id = 'generated_content';
-- Returns: 1 row (OK!)
```

### Test Insert (both options):
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

-- Should succeed! ✅
```

### If using COMPLETE (with user_profiles):
```sql
-- Test with real UUID user
INSERT INTO public.user_profiles (
  id, email, full_name, subscription_tier
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  'Test User',
  'free'
);

-- Then insert cost with that UUID
-- total_spent will auto-update! ✨
```

---

## 🆘 Still Getting Errors?

### Error: "relation public.api_costs does not exist"
**Fix:**
```sql
-- Grant permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO service_role;

-- Then re-run SQL
```

### Error: "extension pg_cron does not exist"
**Fix:**
```sql
-- Enable in Supabase Dashboard:
Database → Extensions → Search "pg_cron" → Enable

-- OR disable cron jobs (optional feature):
-- Comment out lines starting with "SELECT cron.schedule"
```

### Error: "storage.buckets does not exist"
**Fix:**
```sql
-- Create bucket manually in Supabase Dashboard:
Storage → New Bucket → Name: "generated_content" → Public: YES

-- OR ignore (bucket is optional)
```

---

## 📊 Summary

| File | Use Case | Complexity | Issues? |
|------|----------|------------|---------|
| `DATABASE_SIMPLE.sql` ⭐⭐⭐ | Cost tracking only | Super Simple | **NONE!** |
| `DATABASE_MINIMAL.sql` ⭐ | Cost tracking + cron | Simple | Fixed |
| `DATABASE_COMPLETE_SCHEMA.sql` | Full features + auth | Advanced | Fixed |

**Recommendation:** Start with **SIMPLE** (zero problems!), upgrade later if needed.

---

## ✅ Next Steps

After successful SQL:

1. **Update .env:**
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
```

2. **Test locally:**
```bash
cd server
npm install
tsx watch index.ts
# Should see: "💰 Cost tracker initialized"
```

3. **Test API:**
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok",...}
```

4. **Deploy:**
```bash
# See QUICK_START.md
railway up
# OR
render deploy
```

---

## 🎉 Done!

Database is ready! Server will now automatically track all costs.

**Questions?** Check:
- `QUICK_START.md` - Full deployment
- `DATABASE_SETUP_GUIDE.md` - Database details
- `LAUNCH_READY.md` - Production guide
