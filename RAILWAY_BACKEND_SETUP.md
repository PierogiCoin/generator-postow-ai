# 🚀 RAILWAY BACKEND DEPLOYMENT - INSTRUKCJA

## ✅ Przygotowanie zakończone:
- ✅ Railway config files (railway.json, railway.toml) utworzone
- ✅ CORS dla Railway dodany w server/index.ts
- ✅ Kod wgrany na GitHub

---

## 📋 KROK 1: Dodaj Backend Service na Railway

### W Railway Dashboard:

1. **Otwórz projekt:**
   - Idź do: https://railway.app/dashboard
   - Znajdź: "socnew-production"

2. **Dodaj nowy serwis:**
   - Kliknij: "+ New"
   - Wybierz: "GitHub Repo"
   - Wybierz: "PierogiCoin/socnew" (to samo repo!)

3. **Skonfiguruj serwis:**
   - **Name:** `backend-api`
   - **Root Directory:** `server`
   - **Start Command:** `npm start`
   - Kliknij "Deploy"

---

## 📋 KROK 2: Dodaj zmienne środowiskowe

W serwisie `backend-api` → **Variables** → dodaj:

```bash
GOOGLE_API_KEY=AIzaSyALQDBI-rOm7u8I-kzCK3twzEUYh6XlJaM
VITE_SUPABASE_URL=https://xlaccaozpxkmjweovyzm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsYWNjYW96cHhrbWp3ZW92eXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MjU3NjYsImV4cCI6MjA3OTMwMTc2Nn0.vI44sZQlE-q3A5YB3NJNQsb69bkOh4E2mfpyUiZeq5g
NODE_ENV=production
PORT=3001
```

**Opcjonalne (jeśli masz):**
```bash
OPENAI_API_KEY=twój_klucz
LUMA_API_KEY=twój_klucz
REPLICATE_API_TOKEN=twój_token
```

**Kliknij:** "Add" dla każdej zmiennej

---

## 📋 KROK 3: Poczekaj na deployment

1. Railway automatycznie zacznie build (~2-3 minuty)
2. Sprawdź status: **Deployments** tab
3. Poczekaj na status: **Success** (zielony)

---

## 📋 KROK 4: Skopiuj URL backendu

1. W serwisie `backend-api` → **Settings** → **Networking**
2. Znajdź: **Public Networking** → **Generate Domain**
3. Skopiuj URL (np. `backend-api-production.up.railway.app`)

---

## 📋 KROK 5: Skonfiguruj Frontend

### W serwisie FRONTEND (socnew-production):

1. Idź do: **Variables**
2. Dodaj nową zmienną:
   ```bash
   VITE_API_BASE_URL=https://backend-api-production.up.railway.app
   ```
   (Użyj URL z Kroku 4)

3. **Redeploy frontend:**
   - Settings → Deploy → "Trigger Deploy"

---

## 📋 KROK 6: Testuj

### Sprawdź backend:
```bash
curl https://backend-api-production.up.railway.app/health
```

**Powinno zwrócić:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "production",
  "apis": {...}
}
```

### Sprawdź frontend:
1. Otwórz: https://socnew-production.up.railway.app
2. DevTools → Network
3. Sprawdź czy requesty idą do: `backend-api-production.up.railway.app`

---

## ✅ FINALNIE BĘDZIESZ MIEĆ:

```
Railway Project: socnew-production
│
├── Service 1: frontend (socnew-production.up.railway.app)
│   └── Zmienna: VITE_API_BASE_URL → backend URL
│
└── Service 2: backend-api (backend-api-production.up.railway.app)
    └── Zmienne: GOOGLE_API_KEY, SUPABASE_URL, etc.
```

---

## 🔧 TROUBLESHOOTING

### Backend nie startuje:
- Sprawdź logi: Deployments → View Logs
- Sprawdź zmienne: Variables (czy wszystkie są ustawione)
- Sprawdź Root Directory: Settings → "server"

### CORS errors:
- server/index.ts już ma wsparcie dla Railway (*.up.railway.app)
- Sprawdź czy frontend używa poprawnego URL backendu

### 404 na /api/health:
- Railway automatycznie usuwa /api prefix
- Użyj: /health (bez /api)

---

## 🎯 REKOMENDACJA:

**Po wdrożeniu backendu na Railway:**
1. ✅ Lokalny backend nie jest potrzebny
2. ✅ Frontend i backend działają w chmurze
3. ✅ Możesz zamknąć lokalne procesy
4. ✅ Aplikacja działa 24/7

