# 🚀 Production Launch Checklist

## ⚡ CRITICAL (Must Complete Before Launch)

### 1. Environment Variables
- [ ] `.env` file created in `/server/`
- [ ] `GOOGLE_API_KEY` set (Gemini)
- [ ] `OPENAI_API_KEY` set (DALL-E)
- [ ] `VITE_SUPABASE_URL` set
- [ ] `SUPABASE_SERVICE_KEY` set
- [ ] `LUMAAI_API_KEY` set (optional, for video)
- [ ] `REPLICATE_API_TOKEN` set (optional, for video)
- [ ] `PORT=3001` or custom

### 2. Database Setup
- [ ] Supabase project created
- [ ] Run `DATABASE_COST_TRACKING.sql` in Supabase SQL Editor
- [ ] Verify tables created: `SELECT * FROM api_costs LIMIT 1;`
- [ ] Test connection from server

### 3. HTTPS/SSL
- [ ] Use reverse proxy (nginx, Caddy) with SSL certificate
- [ ] OR deploy to platform with built-in SSL (Vercel, Railway, Render)
- [ ] **NEVER expose port 3001 directly to internet without HTTPS**

### 4. CORS Configuration
```typescript
// In index.ts, replace with your production domains:
const allowedOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  'https://app.yourdomain.com'
];
```

### 5. Health Check Endpoint
Already added? Check: `curl http://localhost:3001/health`
If not, add:
```typescript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});
```

### 6. Error Handling
- [ ] Test 404 routes return JSON (not HTML)
- [ ] Test validation errors return proper JSON
- [ ] Test rate limit returns 429 with clear message

---

## 🟡 HIGH PRIORITY (First Week)

### 7. Monitoring Setup
- [ ] Sign up for UptimeRobot (free tier)
- [ ] Add health check monitor
- [ ] Set up email alerts

### 8. Backup Strategy
- [ ] Enable Supabase daily backups
- [ ] Set up log rotation (logs can fill disk!)
- [ ] Download cost data weekly for accounting

### 9. Cost Limits
- [ ] Set OpenAI billing limit ($50/month?)
- [ ] Set budget alerts in costTracking system
- [ ] Monitor daily via `/api/costs/daily`

### 10. Documentation
- [ ] README with setup instructions
- [ ] API documentation (endpoints, auth)
- [ ] Emergency runbook (what to do if server crashes)

---

## 🟢 NICE TO HAVE (First Month)

### 11. Performance
- [ ] Add Redis caching for repeated requests
- [ ] CDN for generated images/videos
- [ ] Database query optimization

### 12. Security
- [ ] Rate limit per user (not just IP)
- [ ] API key rotation schedule
- [ ] Security headers (helmet.js)
- [ ] DDoS protection (Cloudflare)

### 13. Observability
- [ ] Set up Sentry for error tracking
- [ ] Datadog/CloudWatch for metrics
- [ ] Cost anomaly detection alerts

### 14. Scalability
- [ ] Horizontal scaling plan
- [ ] Queue system for video generation (BullMQ)
- [ ] Webhook system for async jobs

### 15. Testing
- [ ] Integration tests for API endpoints
- [ ] Load testing (can handle 100 concurrent users?)
- [ ] Failover testing (what if Supabase is down?)

---

## 🧪 Pre-Launch Testing

### Manual Tests (5 minutes)

```bash
# 1. Health Check
curl http://localhost:3001/health

# 2. Text Generation
curl -X POST http://localhost:3001/api/generate-content \
  -H "Content-Type: application/json" \
  -d '{"contents":"Hello world"}'

# 3. Validation Test
curl -X POST http://localhost:3001/api/generate-images \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return 400 with validation error

# 4. Rate Limit Test
for i in {1..60}; do 
  curl -s http://localhost:3001/api/generate-content \
    -H "Content-Type: application/json" \
    -d '{"contents":"test"}' > /dev/null
done
# Should eventually get 429

# 5. Cost Tracking
curl http://localhost:3001/api/costs/user/test-user

# 6. Logs
tail -20 server/logs/combined.log
# Should show recent activity
```

---

## 🚨 Emergency Procedures

### If Server Crashes
1. Check logs: `tail -100 server/logs/error.log`
2. Check disk space: `df -h`
3. Restart: `pm2 restart server` or `npm run start`
4. Check health: `curl http://localhost:3001/health`

### If Costs Spike
1. Check: `curl http://localhost:3001/api/costs/daily?days=1`
2. Identify user: `curl http://localhost:3001/api/costs/top-spenders?limit=5`
3. Temporarily block: Add to rate limit blacklist
4. Investigate logs for abuse

### If Database is Full
1. Archive old costs: `DELETE FROM api_costs WHERE created_at < NOW() - INTERVAL '90 days'`
2. Vacuum: `VACUUM FULL api_costs;`
3. Increase Supabase plan

### If API Keys Compromised
1. Immediately rotate all keys in `.env`
2. Restart server
3. Check recent costs for abuse
4. Review logs for suspicious activity

---

## 📊 Launch Day Monitoring

### Hour 1-4 (High Alert)
- Check logs every 30 minutes
- Monitor error rate
- Watch cost dashboard
- Test all features manually

### Day 1-7 (Active Monitoring)
- Check daily cost summary
- Review top 10 users
- Monitor error logs
- Check disk space
- Verify backups

### Week 2-4 (Steady State)
- Weekly cost review
- Weekly top spenders check
- Monthly backup verification
- Quarterly security audit

---

## 🎯 Success Metrics

### Technical
- [ ] 99.9% uptime in first month
- [ ] < 2% error rate
- [ ] Average response time < 2s
- [ ] Zero security incidents

### Business
- [ ] Costs stay under budget ($X/month)
- [ ] X active users in first month
- [ ] Y API calls processed
- [ ] Z revenue generated (if paid)

---

## 🔧 Deployment Options

### Option 1: VPS (DigitalOcean, Linode)
**Pros:** Full control, cheaper
**Cons:** Manual setup, need devops skills
**Cost:** $10-20/month + API costs

### Option 2: Platform (Railway, Render)
**Pros:** Auto SSL, easy deploy, monitoring included
**Cons:** Slightly more expensive
**Cost:** $15-30/month + API costs

### Option 3: Serverless (Vercel, AWS Lambda)
**Pros:** Scales automatically, pay per use
**Cons:** Cold starts, harder to debug
**Cost:** $0-50/month (depends on traffic) + API costs

**Recommendation:** Start with **Railway** or **Render** (easiest for production)

---

## ✅ Final Go/No-Go

Check ALL before launching:

- [ ] HTTPS enabled (**CRITICAL**)
- [ ] All API keys set in `.env`
- [ ] Database tables created
- [ ] Health check works
- [ ] Manual tests pass
- [ ] Logs directory writable
- [ ] CORS configured for production domains
- [ ] Rate limits tested
- [ ] Cost tracking works
- [ ] Backup strategy in place
- [ ] Emergency contacts ready
- [ ] Monitoring alerts configured

**If ALL checked → 🚀 LAUNCH!**

**If ANY unchecked → ⚠️ DO NOT LAUNCH YET**
