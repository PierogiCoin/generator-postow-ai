# 📍 Gdzie wpisać "Root Directory: server" w Railway

## 🎯 METODA 1: Podczas tworzenia service (ZALECANE)

### Krok po kroku:

1. **Otwórz Railway Dashboard**
   ```
   https://railway.app/dashboard
   ```

2. **Znajdź projekt "socnew-production"**

3. **Kliknij przycisk "+ New"** (w prawym górnym rogu projektu)

4. **Wybierz opcję:**
   - "Empty Service" LUB
   - "GitHub Repo"

5. **Wypełnij formularz "Configure Service":**

   ```
   Repository:        PierogiCoin/socnew
   Service Name:      backend-api
   Root Directory:    server          ← WAŻNE!
   Branch:            main
   Watch Paths:       server/**       (opcjonalne)
   ```

6. **Kliknij "Add Service"**

7. **Dodaj zmienne środowiskowe** (Variables tab)

8. **Railway automatycznie zbuduje i wdroży backend**

---

## 🎯 METODA 2: Zmień w istniejącym service

### Jeśli już utworzyłeś service:

1. **Kliknij na service** (np. "backend-api")

2. **Idź do zakładki "Settings"**

3. **Przewiń w dół** i szukaj jednej z sekcji:
   - "Source"
   - "Build & Deploy"
   - "Service Settings"
   - "Repository"

4. **Znajdź pole:**
   - "Root Directory" LUB
   - "Source Directory" LUB
   - "Working Directory"

5. **Wpisz:** `server`

6. **Kliknij "Save" lub "Update"**

7. **Redeploy:**
   - Settings → Deploy → "Trigger Deploy"

---

## ⚠️ Jeśli nie widzisz pola "Root Directory"

### Rozwiązanie A: Railway CLI

Zainstaluj Railway CLI i użyj komendy:

```bash
# Zainstaluj CLI
npm i -g @railway/cli

# Zaloguj się
railway login

# Link do projektu
railway link

# Deploy z konkretnym katalogiem
railway up --service backend-api
```

Następnie w Railway Dashboard ustaw zmienne środowiskowe.

---

### Rozwiązanie B: Użyj railway.json (już masz!)

Railway powinien automatycznie wykryć plik `server/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Jeśli Railway go ignoruje, spróbuj Rozwiązania C.

---

### Rozwiązanie C: Stwórz osobne repo dla backendu (NAJPROSTSZE!)

1. **Stwórz nowe repo na GitHub:** `socnew-backend`

2. **Skopiuj zawartość folderu server/**

3. **Wgraj do nowego repo:**
   ```bash
   # W folderze server/
   git init
   git add .
   git commit -m "Initial backend commit"
   git remote add origin https://github.com/PierogiCoin/socnew-backend.git
   git push -u origin main
   ```

4. **W Railway:**
   - "+ New" → "GitHub Repo"
   - Wybierz: "socnew-backend"
   - **NIE TRZEBA** ustawiać Root Directory (cały repo to backend)
   - Dodaj zmienne
   - Deploy

5. **Zalety tego rozwiązania:**
   - ✅ Brak problemów z Root Directory
   - ✅ Łatwiejsze zarządzanie
   - ✅ Niezależne deploymenty frontend/backend
   - ✅ Łatwiejsze CI/CD

---

## 🔍 Jak sprawdzić czy jest poprawnie ustawione:

### Sprawdź w Settings:

1. Kliknij na service
2. Settings → przewiń w dół
3. Sprawdź czy widzisz:

```
Repository:     PierogiCoin/socnew
Branch:         main
Root Directory: server          ← To pole powinno być widoczne
```

### Sprawdź logi deploymentu:

**✅ POPRAWNE:**
```
Building service backend-api
Root directory: server
Running: npm install
Running: npm start
[info]: 🚀 Server started successfully
[server] Server running on port 3001
```

**❌ BŁĘDNE (frontend zamiast backendu):**
```
Building service backend-api
Running: pnpm install
Running: pnpm run build
Starting Caddy...
admin endpoint disabled
```

---

## 🎯 Rekomendacja

**Najprostsze rozwiązanie:**
Stwórz osobne repo dla backendu (Rozwiązanie C).

Railway czasami ma problemy z monorepo i Root Directory.
Osobne repo = zero problemów!

---

## 📞 Potrzebujesz pomocy?

Jeśli nadal masz problemy:
1. Sprawdź czy Railway pokazuje opcję "Root Directory"
2. Spróbuj Railway CLI
3. Rozważ osobne repo dla backendu
4. Sprawdź Railway Discord/Forum - inni mieli podobny problem

