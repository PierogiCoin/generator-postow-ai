# OAuth social + launch checklist

## Redirect URI (produkcja)

Ustaw w panelach developerów **dokładnie** (zamień domeny na swoje):

| Platforma | Redirect URI (frontend) |
|-----------|-------------------------|
| LinkedIn | `https://TWOJA-APP.vercel.app/auth/linkedin/callback` |
| Facebook | `https://TWOJA-APP.vercel.app/auth/facebook/callback` |
| Twitter/X | `https://TWOJA-APP.vercel.app/auth/twitter/callback` |
| TikTok | `https://TWOJA-APP.vercel.app/auth/tiktok/callback` |

Backend callback (Railway): `{PUBLIC_BACKEND_URL}/api/social/callback/{platform}`

## Railway — wymagane zmienne

```bash
PUBLIC_BACKEND_URL=https://twoj-backend.up.railway.app
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
TWITTER_APP_KEY=
TWITTER_APP_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
FRONTEND_URL=https://TWOJA-APP.vercel.app
OAUTH_STATE_SECRET=          # losowy sekret HMAC
```

Pełna lista: `server/.env.example`. Sprawdzenie: `npm run prod:readiness`.

## Stripe LIVE

1. `npm run stripe:bootstrap:live` (klucze `sk_live_`)
2. W Railway ustaw `STRIPE_*_PRICE_ID` z live produktów
3. Webhook: `{PUBLIC_BACKEND_URL}/api/payments/webhook`
4. W Supabase SQL Editor: migracje Stripe z katalogu `server/` / `DATABASE_SCHEMA_PAYMENTS.sql`

## Sentry / PostHog (opcjonalnie)

- Vercel: `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`
