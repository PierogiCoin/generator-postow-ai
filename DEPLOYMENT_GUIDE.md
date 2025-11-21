# 🚀 Deployment Guide - Production Ready

## ✅ Co zostało dodane w tym kroku:

### **1. Authentication System** ✅
- `services/authService.ts` - Complete auth with JWT
- Sign up, login, logout
- Password hashing (bcrypt)
- Token management
- Password reset flow
- Session management

### **2. Database Schema** ✅
- `DATABASE_SCHEMA.sql` - Complete production schema
- 15+ tables (users, sessions, social_connections, etc.)
- Indexes for performance
- Row Level Security (RLS)
- Triggers for auto-updates
- Views for analytics

### **3. Middleware** ✅
- `server/middleware/rateLimiter.ts` - Rate limiting
- `server/middleware/errorHandler.ts` - Error handling
- `server/middleware/auth.ts` - Auth middleware

---

## 📋 Pre-Deployment Checklist

### **Step 1: Environment Setup** (30 min)

#### **A. Supabase Setup**
```bash
# 1. Create account: https://supabase.com
# 2. Create new project
# 3. Copy credentials
```

**Get these values:**
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY

#### **B. Social Media Apps** (1-2 hours)

**LinkedIn:**
```
1. Go to: https://www.linkedin.com/developers/apps
2. Create App
3. Add redirect: https://yourapp.com/auth/linkedin/callback
4. Get: Client ID + Client Secret
```

**Twitter/X:**
```
1. Go to: https://developer.twitter.com
2. Create App (elevated access required)
3. Enable OAuth 1.0a
4. Get: API Key + API Secret
```

**Facebook:**
```
1. Go to: https://developers.facebook.com
2. Create App → Business
3. Add Facebook Login product
4. Get: App ID + App Secret
```

**Google (for Gemini & Veo):**
```
1. Go to: https://console.cloud.google.com
2. Enable Vertex AI API
3. Create service account
4. Download JSON key
```

#### **C. Environment Variables**

Create `.env` files:

**Frontend (.env):**
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_API_BASE_URL=https://api.yourapp.com
VITE_JWT_SECRET=generate-random-32-char-string
```

**Backend (server/.env):**
```env
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...

# JWT
JWT_SECRET=same-as-frontend-jwt-secret

# LinkedIn
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
LINKEDIN_REDIRECT_URI=https://yourapp.com/auth/linkedin/callback

# Twitter
TWITTER_APP_KEY=xxx
TWITTER_APP_SECRET=xxx
TWITTER_CALLBACK_URL=https://yourapp.com/auth/twitter/callback

# Facebook
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
FACEBOOK_REDIRECT_URI=https://yourapp.com/auth/facebook/callback

# Google AI
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_REGION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Gemini
GEMINI_API_KEY=xxx

# Server
PORT=3001
NODE_ENV=production
```

---

### **Step 2: Database Setup** (15 min)

```bash
# 1. Open Supabase SQL Editor
# 2. Copy all from DATABASE_SCHEMA.sql
# 3. Run it
# 4. Verify tables created
```

**Verify tables:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

Should see:
- users
- sessions
- social_connections
- published_posts
- scheduled_posts
- generation_history
- favorites
- brand_voices
- video_stories
- analytics
- usage_tracking
- rate_limits
- password_resets

---

### **Step 3: Install Dependencies** (5 min)

```bash
# Backend
cd server
npm install bcryptjs jsonwebtoken twitter-api-v2 axios @sentry/node

# Frontend
npm install @sentry/react
```

---

### **Step 4: Build & Test Locally** (30 min)

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev

# Terminal 3 - Test
curl http://localhost:3001/health
```

**Test Auth:**
```bash
# Sign up
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

---

### **Step 5: Deploy Backend** (Render.com)

#### **Option A: Render.com** (Recommended)

```bash
# 1. Create account: https://render.com
# 2. New → Web Service
# 3. Connect GitHub repo
# 4. Settings:
```

**Render Settings:**
```
Name: social-media-manager-api
Environment: Node
Build Command: cd server && npm install && npm run build
Start Command: cd server && npm start
```

**Environment Variables** (add all from server/.env)

#### **Option B: Railway.app**

```bash
# 1. Install CLI: npm i -g @railway/cli
# 2. Login: railway login
# 3. Init: railway init
# 4. Deploy: railway up
```

#### **Option C: Fly.io**

```bash
# 1. Install: curl -L https://fly.io/install.sh | sh
# 2. Login: fly auth login
# 3. Launch: fly launch
# 4. Deploy: fly deploy
```

---

### **Step 6: Deploy Frontend** (Vercel)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Production deploy
vercel --prod
```

**Or use Vercel Dashboard:**
```
1. Go to: https://vercel.com
2. Import GitHub repo
3. Framework: Vite
4. Add environment variables
5. Deploy
```

---

### **Step 7: Setup Monitoring** (15 min)

#### **Sentry (Error Tracking)**

```bash
# 1. Create account: https://sentry.io
# 2. Create project
# 3. Get DSN
```

**Add to code:**

**Backend (server/index.ts):**
```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

**Frontend (src/main.tsx):**
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0
});
```

---

### **Step 8: Setup Domain & SSL** (15 min)

#### **Backend:**
```bash
# On Render/Railway/Fly
1. Add custom domain
2. Add CNAME record: api.yourapp.com → xxx.onrender.com
3. SSL auto-provisioned
```

#### **Frontend:**
```bash
# On Vercel
1. Add custom domain
2. Add A/CNAME records
3. SSL auto-provisioned
```

---

### **Step 9: Security Hardening** (30 min)

#### **A. Secrets Management**

```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update all:
- JWT_SECRET
- Database passwords
- API keys
```

#### **B. CORS Configuration**

**server/index.ts:**
```typescript
app.use(cors({
  origin: [
    'https://yourapp.com',
    'https://www.yourapp.com'
  ],
  credentials: true
}));
```

#### **C. Rate Limiting**

Already implemented in middleware! ✅

#### **D. Helmet (Security Headers)**

```bash
npm install helmet
```

```typescript
import helmet from 'helmet';
app.use(helmet());
```

---

### **Step 10: Launch Checklist** ✅

#### **Pre-Launch:**
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Auth flow tested
- [ ] Social OAuth tested (LinkedIn, Twitter, Facebook)
- [ ] Rate limiting working
- [ ] Error monitoring active
- [ ] SSL certificates valid
- [ ] Backup strategy in place

#### **Post-Launch:**
- [ ] Monitor error rates (Sentry)
- [ ] Check API response times
- [ ] Monitor database performance
- [ ] Test from different devices
- [ ] Verify email notifications
- [ ] Check social publishing
- [ ] Monitor credit usage

---

## 🎯 Quick Deploy (For the Brave)

```bash
# One-liner deploy script
./deploy.sh
```

Create `deploy.sh`:
```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Build backend
cd server
npm run build

# Build frontend
cd ..
npm run build

# Deploy
vercel --prod
cd server && railway up

echo "✅ Deployment complete!"
```

---

## 📊 Monitoring Dashboard

### **What to Monitor:**

1. **API Health**
   - Response times
   - Error rates
   - Request volume

2. **Database**
   - Query performance
   - Connection pool
   - Storage usage

3. **Social Publishing**
   - OAuth success rate
   - Publish success rate
   - API rate limits

4. **User Activity**
   - Signups
   - Active users
   - Credit usage

### **Tools:**
- **Sentry**: Errors & performance
- **Supabase**: Database metrics
- **Vercel**: Frontend analytics
- **Render**: Backend logs

---

## 🚨 Rollback Plan

If something goes wrong:

```bash
# Vercel
vercel rollback

# Render
# Use Render dashboard → Rollback

# Database
# Restore from backup in Supabase dashboard
```

---

## 💰 Cost Estimation

### **Monthly Costs (MVP):**

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Free | $0 |
| Vercel | Hobby | $0 |
| Render | Free | $0 |
| **Total** | | **$0/month** |

### **Monthly Costs (Production):**

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Pro | $25 |
| Vercel | Pro | $20 |
| Render | Starter | $7 |
| Sentry | Team | $26 |
| **Total** | | **$78/month** |

### **With Users:**
- 1,000 users: ~$150/month
- 10,000 users: ~$500/month
- 100,000 users: ~$2,000/month

---

## 🎉 You're Ready!

### **Final Steps:**

1. ✅ Run through checklist above
2. ✅ Deploy to staging first
3. ✅ Test everything
4. ✅ Deploy to production
5. ✅ Monitor for 24 hours
6. ✅ Celebrate! 🎊

---

## 📞 Support

**Issues?**
- Check logs in Sentry
- Review Supabase logs
- Check Render/Vercel dashboards

**Questions?**
- See FEATURES.md
- See PRODUCTION_READINESS.md
- Open GitHub issue

---

## 🚀 LAUNCH READY!

**You now have:**
✅ Production auth system
✅ Complete database
✅ Rate limiting
✅ Error handling
✅ Monitoring
✅ Deployment instructions

**Time to launch: 2 hours of focused work!**

**Go make it happen! 🔥**
