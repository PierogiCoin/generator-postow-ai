# OAuth social + launch checklist

## Redirect URI (produkcja)

Ustaw w panelach developerów **dokładnie**:

| Platforma | Redirect URI |
|-----------|--------------|
| LinkedIn | `https://generator-postow-ai.vercel.app/auth/linkedin/callback` |
| Facebook | `https://generator-postow-ai.vercel.app/auth/facebook/callback` |
| Twitter/X | `https://generator-postow-ai.vercel.app/auth/twitter/callback` |
| TikTok | `https://generator-postow-ai.vercel.app/auth/tiktok/callback` |

Backend callback (Railway): `https://generator-postow-api-production.up.railway.app/api/social/callback/{platform}`

## Railway — wymagane zmienne

```bash
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
FRONTEND_URL=https://generator-postow-ai.vercel.app
```

Sprawdzenie: `npm run prod:readiness`

## Stripe LIVE

1. Uruchom `npm run stripe:bootstrap` w trybie live (klucze `sk_live_`)
2. W Railway ustaw `STRIPE_*_PRICE_ID` z live produktów
3. Webhook: `https://generator-postow-api-production.up.railway.app/api/payments/webhook`
4. W Supabase SQL Editor: `server/DATABASE_FIX_STRIPE.sql`

## Sentry (opcjonalnie)

Ustaw `VITE_SENTRY_DSN` w Vercel. Obecnie `utils/errorReporting.ts` loguje błędy; po dodaniu `@sentry/react` podłącz init w `index.tsx`.
