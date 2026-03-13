# 🔒 Rate Limiting Guide

## Overview

The server implements four-tier rate limiting to prevent abuse, control costs, and ensure fair usage across all users.

## Rate Limit Tiers

### 1. General API Limiter (All Endpoints)
- **Window**: 15 minutes
- **Max requests**: 100
- **Applies to**: All endpoints (unless overridden)
- **Message**: "Too many requests from this IP, please try again later."

### 2. Text Generation Limiter
- **Window**: 5 minutes
- **Max requests**: 50
- **Applies to**:
  - `/api/generate-content`
  - `/api/generate`
  - `/api/optimize-multi-platform`
  - `/api/generate-ab-variants`
- **Message**: "Too many text generation requests. Please slow down."

### 3. Streaming Limiter (SSE)
- **Window**: 5 minutes
- **Max requests**: 20
- **Applies to**: `/api/generate-content-stream`
- **Message**: "Too many streaming requests. Please slow down."

### 4. Expensive Operations Limiter
- **Window**: 1 hour
- **Max requests**: 20
- **Applies to**:
  - `/api/generate-images` (DALL-E)
  - `/api/generate-video-story` (Luma/Replicate)
- **Message**: "Generation limit reached. Please wait before creating more content."
- **⭐ Premium bypass**: Users with `x-user-tier: premium` or `enterprise` header skip this limit

## Rate Limit Headers & Identity

- Key generation uses the `x-user-id` header when present; otherwise falls back to IP. Set `x-user-id` on the client so users behind the same proxy don't share one bucket.

Every API response includes rate limit information in headers:

```http
RateLimit-Limit: 50
RateLimit-Remaining: 49
RateLimit-Reset: 300
RateLimit-Policy: 50;w=300
```

| Header | Description |
|--------|-------------|
| `RateLimit-Limit` | Maximum requests allowed in the window |
| `RateLimit-Remaining` | Number of requests remaining |
| `RateLimit-Reset` | Seconds until the window resets |
| `RateLimit-Policy` | Policy summary (limit;window) |

## Checking Rate Limit Status

### Endpoint
```
GET /api/rate-limit-status
```

### Response
```json
{
  "userId": "192.168.1.100",
  "limits": {
    "general": {
      "window": "15 minutes",
      "max": 100,
      "description": "All API endpoints"
    },
    "text": {
      "window": "5 minutes",
      "max": 50,
      "description": "Text generation endpoints"
    },
    "expensive": {
      "window": "1 hour",
      "max": 20,
      "description": "Image and video generation"
    }
  },
  "note": "Rate limit headers are included in each API response"
}
```

## Example Usage

### 1. Normal Request (Within Limits)
```bash
curl -X POST http://localhost:3001/api/generate-content \
  -H "Content-Type: application/json" \
  -d '{"contents":"Hello"}' \
  -i
```

**Response Headers:**
```
HTTP/1.1 200 OK
RateLimit-Limit: 50
RateLimit-Remaining: 49
RateLimit-Reset: 300
```

### 2. Rate Limited Request
```bash
# After 50 requests in 5 minutes...
curl -X POST http://localhost:3001/api/generate-content \
  -H "Content-Type: application/json" \
  -d '{"contents":"Hello"}'
```

**Response:**
```json
{
  "message": "Too many text generation requests. Please slow down."
}
```

**Status Code:** `429 Too Many Requests`

### 3. Premium User (Bypasses Expensive Limiter)
```bash
curl -X POST http://localhost:3001/api/generate-images \
  -H "Content-Type: application/json" \
  -H "x-user-tier: premium" \
  -d '{"prompt":"A beautiful sunset"}'
```

**Result:** No rate limit on expensive operations!

## Frontend Integration

### React/TypeScript Example

```typescript
async function generateContent(prompt: string) {
  try {
    const response = await fetch('/api/generate-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId // Optional: track by user instead of IP
      },
      body: JSON.stringify({ contents: prompt })
    });

    // Check rate limit headers
    const remaining = response.headers.get('RateLimit-Remaining');
    const reset = response.headers.get('RateLimit-Reset');

    if (remaining) {
      console.log(`${remaining} requests remaining`);
      if (parseInt(remaining) < 5) {
        showWarning(`Only ${remaining} requests left. Resets in ${reset}s`);
      }
    }

    if (response.status === 429) {
      const data = await response.json();
      throw new Error(data.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Rate limit exceeded:', error);
    throw error;
  }
}
```

### Display Rate Limit Status

```typescript
function RateLimitIndicator() {
  const [status, setStatus] = useState({ remaining: 0, limit: 0 });

  // Update after each API call
  useEffect(() => {
    // Extract from response headers
    // Show progress bar or warning
  }, []);

  return (
    <div>
      <p>Requests remaining: {status.remaining}/{status.limit}</p>
      <ProgressBar value={status.remaining} max={status.limit} />
    </div>
  );
}
```

## Configuration

### Adjust Limits

Edit `/server/index.ts`:

```typescript
// More lenient for development
const textLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100, // Increased from 50
  message: 'Too many requests'
});

// Stricter for production
const expensiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10, // Decreased from 20
  message: 'Daily limit reached'
});
```

### Per-User Limits (Recommended)

Currently uses IP-based limiting. For better control, implement user-based limits:

```typescript
import { rateLimit } from 'express-rate-limit';

const userLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: async (req) => {
    const user = await getUserFromToken(req);
    return user.tier === 'premium' ? 1000 : 100;
  },
  keyGenerator: (req) => {
    return req.header('x-user-id') || req.ip;
  }
});
```

## Cost Impact

### Before Rate Limiting:
- **Vulnerability**: Users could spam expensive operations
- **Cost risk**: Unlimited DALL-E/video generation = $$$$$
- **Example**: 1000 DALL-E images = $40

### After Rate Limiting:
- **Protection**: Max 20 expensive operations/hour per IP
- **Max cost**: ~$8/hour per IP (20 images @ $0.04 or 20 videos @ $0.40)
- **Monthly**: ~$5,760/IP worst case (realistically much lower)

### Recommended Limits by User Tier:

| Tier | Text/5min | Images/hour | Videos/hour | Monthly Cost Est. |
|------|-----------|-------------|-------------|-------------------|
| Free | 20 | 5 | 2 | ~$10 |
| Basic | 50 | 10 | 5 | ~$25 |
| Premium | 100 | 50 | 20 | ~$100 |
| Enterprise | Unlimited | 200 | 100 | ~$500 |

## Monitoring

### Check Rate Limit Hits

```bash
# Count 429 responses
grep "429" server.log | wc -l

# Find most rate-limited IPs
grep "429" server.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
```

### Prometheus Metrics (Future)

```typescript
import prometheus from 'prom-client';

const rateLimitCounter = new prometheus.Counter({
  name: 'rate_limit_hits_total',
  help: 'Number of rate limit hits',
  labelNames: ['endpoint', 'tier']
});

// Increment on rate limit
if (response.status === 429) {
  rateLimitCounter.inc({ endpoint: req.path, tier: 'text' });
}
```

## Troubleshooting

### "Too many requests" but I'm not spamming
**Cause**: Shared IP (NAT, corporate network, VPN)  
**Solution**: Implement user-based limiting with `x-user-id` header

### Rate limit not working
**Check**:
1. Is `express-rate-limit` installed? `npm list express-rate-limit`
2. Is limiter applied to endpoint? Check middleware order
3. Are headers visible? `curl -i http://...`

### Premium users still rate limited
**Check**: `x-user-tier` header is set correctly:
```bash
curl -H "x-user-tier: premium" http://...
```

### IPv6 warnings in logs
**Status**: Known issue, safe to ignore  
**Reason**: Custom key generator validation  
**Impact**: None - rate limiting still works correctly

## Best Practices

### ✅ DO:
- Monitor rate limit headers in your frontend
- Warn users when approaching limits
- Cache responses when possible to reduce API calls
- Implement exponential backoff on 429 errors
- Use user-based limits in production

### ❌ DON'T:
- Ignore rate limit headers
- Retry immediately on 429
- Use same IP for multiple users (implement user auth)
- Set limits too low (frustrates users)
- Set limits too high (costs spiral)

## Security Considerations

### DDoS Protection
Rate limiting provides basic DDoS protection but consider:
- Cloudflare or AWS WAF for advanced protection
- IP whitelisting for trusted services
- Fail2ban for repeated limit violations

### Bypass Prevention
- Don't trust client-provided headers alone
- Validate `x-user-id` with authentication
- Monitor for unusual patterns
- Log rate limit violations

## Future Enhancements

- [ ] Redis-backed rate limiting for distributed systems
- [ ] Dynamic limits based on server load
- [ ] Per-user database-backed limits
- [ ] Rate limit dashboard/analytics
- [ ] Automatic limit adjustment based on user behavior
- [ ] Cost-based limiting (spend $X/hour max)

## Summary

✅ **Implemented**: Three-tier rate limiting (general, text, expensive)  
✅ **Headers**: Rate limit info in every response  
✅ **Premium bypass**: Expensive limits skipped for premium users  
✅ **IP-based**: Currently uses IP, ready for user-based upgrade  
✅ **Tested**: Working correctly with proper 429 responses  

**Result**: Protected against abuse, controlled costs, improved UX with header feedback.
