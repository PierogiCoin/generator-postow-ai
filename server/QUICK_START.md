# ⚡ QUICK START - 10 Minutes to Production

## 🎯 Goal
Uruchomić pełną aplikację w 10 minut.

---

## 📋 Prerequisites (1 min check)

```bash
# Node.js installed?
node --version
# Should show: v18+ or v20+

# Git installed?
git --version

# Accounts ready?
# [ ] Supabase account (https://app.supabase.com)
# [ ] Railway account (https://railway.app) OR Render
# [ ] Google AI Studio (https://aistudio.google.com)
# [ ] OpenAI account (https://platform.openai.com)
```

---

## 🚀 Step-by-Step (10 minutes)

### **STEP 1: Setup Database** (3 min) 🗄️

```bash
1. Go to https://app.supabase.com
2. Create new project (or use existing)
3. Wait for project to initialize (~2 min)
4. Click "SQL Editor" in left menu
5. Click "New query"
6. Open: /server/DATABASE_SIMPLE.sql ⭐⭐⭐ (SUPER SIMPLE - USE THIS!)
   # OR: DATABASE_MINIMAL.sql (with cron jobs)
   # OR: DATABASE_COMPLETE_SCHEMA.sql (advanced)
7. Copy ALL text (Cmd/Ctrl + A, then Cmd/Ctrl + C)
8. Paste in Supabase SQL Editor
9. Click "RUN" (or Cmd/Ctrl + Enter)
10. Wait ~30 seconds
11. Should see: ✅ "Success. No rows returned"
```

**💡 Tip:** Use `DATABASE_SIMPLE.sql` - zero problems, just works! ⚡

**Verify:**
```sql
SELECT COUNT(*) FROM public.api_costs;
-- Should return: 0
```

---

### **STEP 2: Get API Keys** (2 min) 🔑

#### A. Supabase Keys
```bash
1. In Supabase: Settings → API
2. Copy "Project URL" → Save as VITE_SUPABASE_URL
3. Copy "service_role" key → Save as SUPABASE_SERVICE_KEY
```

#### B. Google AI Studio
```bash
1. Go to https://aistudio.google.com
2. Click "Get API Key"
3. Copy key → Save as GOOGLE_API_KEY
```

#### C. OpenAI (for images)
```bash
1. Go to https://platform.openai.com/api-keys
2. Create new key
3. Copy key → Save as OPENAI_API_KEY
```

#### D. Optional (for video)
```bash
# Luma AI
https://lumalabs.ai → Get API key

# Replicate
https://replicate.com → Get API token
```

---

### **STEP 3: Deploy to Railway** (5 min) 🚂

```bash
# A. Install Railway CLI
npm install -g railway

# B. Login
railway login
# Opens browser, authorize

# C. Initialize project
cd /Users/yola/so-main
railway init
# Choose: "Create new project"
# Name: "social-content-api" (or your choice)

# D. Link to repo (optional but recommended)
git init
git add .
git commit -m "Initial commit"
railway link

# E. Set environment variables
railway variables set GOOGLE_API_KEY=your_key_here
railway variables set OPENAI_API_KEY=your_key_here
railway variables set VITE_SUPABASE_URL=https://xxx.supabase.co
railway variables set SUPABASE_SERVICE_KEY=your_service_key_here
railway variables set PORT=3001
railway variables set NODE_ENV=production

# F. Deploy!
railway up
# Wait ~2 minutes

# G. Get your URL
railway domain
# Example: social-content-api.up.railway.app
```

**Verify:**
```bash
curl https://your-app.up.railway.app/health
# Should return: {"status":"ok",...}
```

---

### **Alternative: Deploy to Render** (5 min) 🎨

```bash
# A. Commit to GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main

# B. Go to https://render.com
# C. New → Web Service
# D. Connect your GitHub repo
# E. Settings:
#    - Name: social-content-api
#    - Environment: Node
#    - Build Command: cd server && npm install
#    - Start Command: cd server && node index.ts
#    - Instance Type: Free (or Starter $7)

# F. Add Environment Variables:
GOOGLE_API_KEY=...
OPENAI_API_KEY=...
VITE_SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
PORT=3001
NODE_ENV=production

# G. Click "Create Web Service"
# Wait ~3 minutes

# H. Your URL will be:
# https://your-app.onrender.com
```

**Verify:**
```bash
curl https://your-app.onrender.com/health
```

---

## ✅ Post-Deployment Checklist (2 min)

### **1. Test Health**
```bash
curl https://your-app-url/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-11-21T12:00:00.000Z",
  "uptime": 123.45,
  "environment": "production",
  "apis": {
    "gemini": true,
    "openai": true,
    "supabase": true,
    "costTracker": true
  }
}
```

### **2. Test Text Generation**
```bash
curl -X POST https://your-app-url/api/generate-content \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{"contents":"Say hello!"}'

# Should return generated text
```

### **3. Test Validation**
```bash
curl -X POST https://your-app-url/api/generate-images \
  -H "Content-Type: application/json" \
  -d '{}'

# Should return 400 with validation error
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "prompt",
      "message": "Invalid input: expected string, received undefined",
      "code": "invalid_type"
    }
  ]
}
```

### **4. Test Cost Tracking**
```bash
# After generating something, check costs:
curl https://your-app-url/api/costs/user/test-user

# Should return:
{
  "totalCost": 0.04,
  "requestCount": 1,
  "breakdown": [...]
}
```

### **5. Check Logs**
```bash
# Railway:
railway logs

# Render:
# Check in dashboard → Logs tab
```

---

## 🎉 Success!

**Your API is live!** 🚀

### **What's working:**
- ✅ Text generation (Gemini)
- ✅ Image generation (DALL-E)
- ✅ Rate limiting
- ✅ Cost tracking
- ✅ Health monitoring
- ✅ Error handling

### **Endpoints:**
```
GET  /health
POST /api/generate-content
POST /api/generate-images
POST /api/generate-video-story
GET  /api/costs/user/:userId
GET  /api/costs/daily
GET  /api/rate-limit-status
```

---

## 📊 Monitoring Setup (5 min - do later)

### **1. UptimeRobot (Free)**
```
1. Go to https://uptimerobot.com
2. Sign up (free)
3. Add Monitor:
   - Type: HTTP(s)
   - URL: https://your-app-url/health
   - Monitoring Interval: 5 minutes
4. Add Alert Contact (your email)
5. Done!
```

### **2. Check Daily Costs**
```bash
# Add to your calendar (daily reminder):
curl https://your-app-url/api/costs/daily?days=1
```

### **3. Set Budget Alert**
```bash
# Check if anyone exceeded budget:
curl https://your-app-url/api/costs/top-spenders?limit=5
```

---

## 💰 Expected Costs

### **Infrastructure:**
- Railway/Render: $7-15/month
- Supabase: $0 (free tier OK for start)
- **Total fixed:** $7-15/month

### **API Usage (variable):**
- Text (Gemini): ~$0.0001 per request
- Images (DALL-E): $0.04 per image
- Video (Luma): $0.40 per video
- Video (Replicate): $0.02 per video

### **Example (1000 users, moderate usage):**
- 10,000 text requests: $1
- 1,000 images: $40
- 100 videos (mix): $10-40
- **Total API:** $51-81
- **GRAND TOTAL:** ~$60-100/month

**Revenue needed:** ~$120/month (with 20% margin)

---

## 🚨 If Something Goes Wrong

### **Server not responding**
```bash
# Railway:
railway logs --tail 100

# Render:
# Check dashboard logs

# Common issues:
# 1. Missing env variables
# 2. Port mismatch
# 3. Database connection failed
```

### **Database errors**
```bash
# Check Supabase:
1. Go to Supabase dashboard
2. Database → Query → Try: SELECT * FROM api_costs LIMIT 1;
3. If error: Re-run DATABASE_COMPLETE_SCHEMA.sql
```

### **API errors**
```bash
# Check API keys:
1. Verify in Railway/Render dashboard
2. Test keys individually:
   - Google AI Studio: https://aistudio.google.com
   - OpenAI: https://platform.openai.com/playground
```

---

## 📞 Support Resources

- **Railway:** https://docs.railway.app
- **Render:** https://render.com/docs
- **Supabase:** https://supabase.com/docs
- **Winston Logs:** `/server/logs/error.log`

---

## 🎯 Next Steps

### **Week 1:**
- [ ] Monitor first 100 requests
- [ ] Check cost tracking works
- [ ] Test all endpoints
- [ ] Set up monitoring alerts
- [ ] Announce to first users

### **Week 2:**
- [ ] Collect feedback
- [ ] Optimize based on usage patterns
- [ ] Add features users request
- [ ] Review costs vs revenue

### **Month 1:**
- [ ] Scale up if needed
- [ ] Add caching (if performance issues)
- [ ] Implement queue for video (if slow)
- [ ] Add webhooks (if requested)

---

## ✨ Congratulations!

**You're live in production!** 🎊

Now go build something amazing! 💪

Questions? Check:
- `PRODUCTION_CHECKLIST.md` - Full checklist
- `LAUNCH_READY.md` - Detailed guide
- `DATABASE_SETUP_GUIDE.md` - Database details
- `COST_TRACKING_GUIDE.md` - Cost analytics
