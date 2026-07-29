# Rate Limiting Guide

## Overview

Backend uses `express-rate-limit` with **four tiers**. Identity comes from **JWT** (`req.user.id`) after auth, otherwise IP. Client headers (`x-user-id`, `x-user-tier`) are **never trusted**.

Config: [`server/middleware/rateLimiter.ts`](middleware/rateLimiter.ts)

## Tiers

| Limiter | Window | Max | Endpoints |
|---------|--------|-----|-----------|
| `generalLimiter` | 15 min | 100 | All routes (app-wide) |
| `textLimiter` | 5 min | 50 | Text generation |
| `streamLimiter` | 5 min | 20 | SSE `/api/generate-content-stream` |
| `expensiveLimiter` | 1 hour | 20 | Images + video story |

Premium / plan access is enforced by **`creditGate` + credits in DB**, not by skipping rate limits.

## Middleware order (important)

Generation routes use `rateLimitedCreditGate(limiter, action)`:

1. `requireSupabaseAuth` — sets `req.user`
2. `assertNoSpoofedUserId`
3. **rate limiter** — key = `user:<id>` (not shared NAT IP bucket)
4. credit check + debit-on-success

Do **not** put the limiter before auth on paid/AI routes.

## Response headers

```http
RateLimit-Limit: 50
RateLimit-Remaining: 49
RateLimit-Reset: 300
```

`GET /api/rate-limit-status` (auth required) returns static policy description.

## Multi-instance note

Store is **in-memory** (default). On multiple Railway replicas each instance has its own counters — limits are softer under horizontal scale.

Future: Redis store (`RATE_LIMIT_REDIS_URL`) when multi-instance is required. Until then prefer a single replica for the API or accept approximate limits.

## Adjusting limits

Edit [`server/middleware/rateLimiter.ts`](middleware/rateLimiter.ts) — not `index.ts`.

## 429 body

```json
{ "message": "Too many text generation requests. Please slow down." }
```
