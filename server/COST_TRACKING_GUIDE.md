# 💰 Cost Tracking System Guide

## Overview

The cost tracking system monitors API usage costs per user in real-time. Every API call (DALL-E, Luma, Replicate, Gemini) is logged to a PostgreSQL database for:

- ✅ **Per-user billing** - Track costs by user
- ✅ **Budget enforcement** - Prevent overspending
- ✅ **Usage analytics** - Identify trends and optimize
- ✅ **Cost forecasting** - Predict monthly expenses
- ✅ **Fraud detection** - Spot unusual patterns

## Database Setup

### 1. Run SQL Schema

Execute `DATABASE_COST_TRACKING.sql` in your Supabase SQL editor:

```bash
# Via Supabase Dashboard
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to SQL Editor
4. Copy contents of DATABASE_COST_TRACKING.sql
5. Execute
```

### 2. Verify Tables

```sql
-- Check if table exists
SELECT * FROM api_costs LIMIT 1;

-- Check materialized views
SELECT * FROM user_cost_summary LIMIT 5;
SELECT * FROM daily_cost_summary LIMIT 10;
```

## Cost Estimates

Configured in `costTracking.ts`:

| Operation | Provider | Cost | Duration |
|-----------|----------|------|----------|
| **Text Generation** | Gemini | $0.0001/1k tokens | ~1-3s |
| **Image (Standard)** | DALL-E | $0.04/image | ~10-30s |
| **Image (HD)** | DALL-E | $0.08/image | ~15-40s |
| **Video (Premium)** | Luma | $0.40/video | ~60-180s |
| **Video (Budget)** | Replicate | $0.02/video | ~30-90s |

## API Endpoints

### 1. Get User Costs

```
GET /api/costs/user/:userId?days=30
```

**Response:**
```json
{
  "totalCost": 5.42,
  "requestCount": 87,
  "breakdown": [
    {
      "provider": "DALL-E",
      "operation": "image-generation",
      "cost": 2.40,
      "count": 60
    },
    {
      "provider": "Luma",
      "operation": "video-generation",
      "cost": 2.80,
      "count": 7
    },
    {
      "provider": "Replicate",
      "operation": "video-generation",
      "cost": 0.22,
      "count": 11
    }
  ]
}
```

**Usage:**
```bash
curl http://localhost:3001/api/costs/user/user-123?days=30
```

### 2. Get Daily Costs

```
GET /api/costs/daily?days=7
```

**Response:**
```json
[
  {
    "date": "2025-11-21",
    "provider": "DALL-E",
    "operation": "image-generation",
    "cost": 1.20,
    "count": 30
  },
  {
    "date": "2025-11-21",
    "provider": "Luma",
    "operation": "video-generation",
    "cost": 2.00,
    "count": 5
  }
]
```

**Usage:**
```bash
curl http://localhost:3001/api/costs/daily?days=7
```

### 3. Get Top Spenders

```
GET /api/costs/top-spenders?limit=10&days=30
```

**Response:**
```json
[
  {
    "userId": "user-123",
    "totalCost": 45.60,
    "requestCount": 520
  },
  {
    "userId": "user-456",
    "totalCost": 32.10,
    "requestCount": 380
  }
]
```

**Usage:**
```bash
curl http://localhost:3001/api/costs/top-spenders?limit=10&days=30
```

### 4. Check Budget

```
GET /api/costs/check-budget/:userId?budget=10.0
```

**Response:**
```json
{
  "exceeded": false,
  "spent": 3.42,
  "remaining": 6.58
}
```

**Usage:**
```bash
curl http://localhost:3001/api/costs/check-budget/user-123?budget=10.0
```

## Automatic Tracking

Costs are tracked automatically for all API operations:

### Image Generation (DALL-E)
```typescript
// Automatic tracking after successful generation
if (costTracker) {
  await costTracker.trackCost({
    userId: 'user-123',
    operation: 'image-generation',
    provider: 'DALL-E',
    cost: 0.04,  // or 0.08 for HD
    durationMs: 2500,
    success: true,
    metadata: { size: '1024x1024', quality: 'standard' }
  });
}
```

### Video Generation (Luma/Replicate)
```typescript
// Automatic tracking after video completion
if (costTracker) {
  await costTracker.trackCost({
    userId: 'user-123',
    operation: 'video-generation',
    provider: 'Luma',  // or 'Replicate'
    cost: 0.40,         // or 0.02 for Replicate
    durationMs: 120000,
    success: true,
    metadata: { aspectRatio: '9:16' }
  });
}
```

## Budget Enforcement

### Pre-request Check

```typescript
// Before expensive operation
if (costTracker) {
  const budgetCheck = await costTracker.checkBudget(userId, 10.0);
  
  if (budgetCheck.exceeded) {
    return res.status(402).json({
      message: 'Daily budget exceeded',
      spent: budgetCheck.spent,
      limit: 10.0
    });
  }
}

// Proceed with operation
await generateImage(...);
```

### Middleware Example

```typescript
// Budget enforcement middleware
const budgetMiddleware = async (req, res, next) => {
  const userId = req.header('x-user-id');
  const dailyBudget = 10.0; // $10/day
  
  if (!userId || !costTracker) {
    return next();
  }
  
  const budget = await costTracker.checkBudget(userId, dailyBudget);
  
  if (budget.exceeded) {
    return res.status(402).json({
      message: 'Daily budget exceeded',
      spent: budget.spent,
      remaining: 0
    });
  }
  
  next();
};

// Apply to expensive endpoints
app.post('/api/generate-images', budgetMiddleware, ...);
```

## Analytics Queries

### Total Revenue
```sql
SELECT SUM(cost) as total_revenue
FROM api_costs
WHERE created_at >= NOW() - INTERVAL '30 days';
```

### Revenue by Provider
```sql
SELECT 
  provider,
  SUM(cost) as revenue,
  COUNT(*) as requests,
  AVG(cost) as avg_cost
FROM api_costs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY provider
ORDER BY revenue DESC;
```

### User Churn Risk (High Spenders)
```sql
SELECT 
  user_id,
  SUM(cost) as total_spent,
  MAX(created_at) as last_seen
FROM api_costs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
HAVING SUM(cost) > 50
ORDER BY total_spent DESC;
```

### Daily Trends
```sql
SELECT 
  DATE(created_at) as date,
  SUM(cost) as daily_revenue,
  COUNT(DISTINCT user_id) as active_users
FROM api_costs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Failed Requests (Wasted Money)
```sql
SELECT 
  provider,
  operation,
  COUNT(*) as failed_count,
  SUM(cost) as wasted_cost
FROM api_costs
WHERE success = false
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY provider, operation
ORDER BY wasted_cost DESC;
```

## Cost Optimization

### Identify Expensive Users
```typescript
const topSpenders = await costTracker.getTopSpenders(10, 30);

topSpenders.forEach(user => {
  if (user.totalCost > 100) {
    console.log(`🚨 User ${user.userId} spent $${user.totalCost} in 30 days`);
    // Consider offering enterprise plan
  }
});
```

### Cost Alerts
```typescript
// Daily cost check
async function checkDailyCosts() {
  const costs = await costTracker.getDailyCosts(1);
  const total = costs.reduce((sum, c) => sum + c.cost, 0);
  
  if (total > 500) {
    logger.warn('Daily costs exceeded $500', { total });
    // Send alert to admin
  }
}

// Run every hour
setInterval(checkDailyCosts, 3600000);
```

### Provider Comparison
```typescript
const costs = await costTracker.getDailyCosts(30);

const providerStats = costs.reduce((acc, item) => {
  if (!acc[item.provider]) {
    acc[item.provider] = { cost: 0, count: 0 };
  }
  acc[item.provider].cost += item.cost;
  acc[item.provider].count += item.count;
  return acc;
}, {});

// Switch to cheaper provider if possible
if (providerStats['Luma'].cost / providerStats['Luma'].count > 0.30) {
  console.log('Consider switching more traffic to Replicate');
}
```

## Reporting

### Monthly Cost Report

```typescript
async function generateMonthlyReport(userId: string) {
  const costs = await costTracker.getUserCosts(userId, 30);
  
  return {
    userId,
    period: 'Last 30 days',
    totalCost: `$${costs.totalCost.toFixed(2)}`,
    totalRequests: costs.requestCount,
    avgCostPerRequest: `$${(costs.totalCost / costs.requestCount).toFixed(4)}`,
    breakdown: costs.breakdown.map(item => ({
      service: `${item.provider} - ${item.operation}`,
      cost: `$${item.cost.toFixed(2)}`,
      requests: item.count,
      percentage: `${((item.cost / costs.totalCost) * 100).toFixed(1)}%`
    }))
  };
}
```

### Export to CSV

```typescript
async function exportCostsCSV(startDate: Date, endDate: Date) {
  const { data } = await supabase
    .from('api_costs')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());
  
  const csv = [
    'Date,User,Provider,Operation,Cost,Duration,Success',
    ...data.map(row => 
      `${row.created_at},${row.user_id},${row.provider},${row.operation},${row.cost},${row.duration_ms},${row.success}`
    )
  ].join('\n');
  
  return csv;
}
```

## Performance

### Materialized View Refresh

```sql
-- Refresh cost summaries (run hourly via cron)
SELECT refresh_cost_summaries();

-- Check view freshness
SELECT 
  schemaname,
  matviewname,
  last_refresh
FROM pg_matviews
WHERE matviewname LIKE '%cost%';
```

### Index Optimization

```sql
-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE tablename = 'api_costs'
ORDER BY idx_scan DESC;
```

## Security

### RLS (Row Level Security)

Already configured in SQL schema:
- Users can only see their own costs
- Service role can insert costs
- No public updates or deletes

### Cost Data Privacy

```typescript
// Hash user IDs in reports
import crypto from 'crypto';

function hashUserId(userId: string): string {
  return crypto.createHash('sha256')
    .update(userId)
    .digest('hex')
    .substring(0, 8);
}

// Use in public dashboards
const publicReport = {
  userId: hashUserId(actualUserId),
  totalCost: costs.totalCost
};
```

## Monitoring

### Cost Anomalies

```typescript
async function detectAnomalies() {
  const costs = await costTracker.getDailyCosts(30);
  const avg = costs.reduce((sum, c) => sum + c.cost, 0) / costs.length;
  
  const today = costs.filter(c => c.date === new Date().toISOString().split('T')[0]);
  const todayTotal = today.reduce((sum, c) => sum + c.cost, 0);
  
  if (todayTotal > avg * 2) {
    logger.warn('Cost anomaly detected', {
      todayTotal,
      average: avg,
      increase: `${((todayTotal / avg - 1) * 100).toFixed(0)}%`
    });
  }
}
```

## Best Practices

### ✅ DO:
- Track all API operations
- Set per-user budgets
- Monitor daily totals
- Alert on anomalies
- Refresh materialized views regularly
- Use RLS for data privacy
- Export for accounting

### ❌ DON'T:
- Skip cost tracking to save DB writes
- Ignore failed requests (still cost API calls)
- Store sensitive PII in metadata
- Allow unlimited spending per user
- Forget to index frequently queried columns

## Future Enhancements

- [ ] Real-time cost dashboards (WebSocket)
- [ ] Predictive cost modeling (ML)
- [ ] Automatic provider switching based on cost
- [ ] Per-feature cost breakdown
- [ ] Integration with billing systems (Stripe)
- [ ] Cost optimization recommendations
- [ ] Budget alerts via email/SMS

## Summary

✅ **Implemented**: PostgreSQL cost tracking  
✅ **Features**: Per-user, per-provider, per-operation tracking  
✅ **Analytics**: Daily summaries, top spenders, budget checks  
✅ **Security**: RLS enabled, privacy-focused  
✅ **Performance**: Indexed queries, materialized views  
✅ **API**: RESTful endpoints for all cost queries  

**Result**: Complete visibility into API costs with budget enforcement and analytics.
