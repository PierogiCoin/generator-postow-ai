# Generator Postów AI

Aplikacja do generowania treści social media (React + Vite + Express + Supabase).

## Stack

| Warstwa | Technologia | Hosting |
|---------|-------------|---------|
| Frontend | React 18, Vite, Tailwind | **Vercel** |
| Backend | Express (Node 22), Zod, Stripe | **Railway** |
| Auth / DB | Supabase Auth + Postgres | Supabase |

## Lokalnie

**Wymagania:** Node.js 22+, npm

```bash
npm install
npm run server:install
cp .env.example .env.local          # frontend
cp server/.env.example server/.env  # backend
```

Uzupełnij:
- frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- backend: `GOOGLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- opcjonalnie dla obrazów FLUX: `TOGETHER_API_KEY`
- production / OAuth: `OAUTH_STATE_SECRET`, `PUBLIC_BACKEND_URL`, `ALLOWED_ORIGINS`

```bash
# frontend + backend naraz
npm run dev:full

# albo osobno:
npm run server:install   # tylko po zmianach w server/package.json lub świeżym clone
npm run start:server   # :3001
npm run dev            # :3000 → proxy /api → :3001
```

## Deploy

1. **Railway** — root `Dockerfile` + `railway.toml` (backend). Zmienne z `server/.env.example`.
2. **Vercel** — build Vite (`dist`) + serverless proxy `api/*`.
   - **Wymagane:** `BACKEND_URL` = publiczny URL Railway
   - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - Opcjonalnie (wideo / długie joby): `VITE_LONG_RUNNING_API_BASE_URL` = ten sam URL co backend

Szczegóły env: [`.env.example`](.env.example), [`server/.env.example`](server/.env.example).

## Przydatne komendy

```bash
npm run typecheck
npm test
npm run smoke
npm run prod:readiness
```

## Dokumentacja operacyjna

- [`docs/OAUTH_AND_LAUNCH.md`](docs/OAUTH_AND_LAUNCH.md) — OAuth social + launch
- [`DATABASE_SETUP.md`](DATABASE_SETUP.md) — schemat / migracje
- [`SOCIAL_PUBLISHING_SETUP.md`](SOCIAL_PUBLISHING_SETUP.md) — publikacja
- [`PAYMENT_SETUP_GUIDE.md`](PAYMENT_SETUP_GUIDE.md) — Stripe
- [`SECURITY_GUIDE.md`](SECURITY_GUIDE.md) — bezpieczeństwo
